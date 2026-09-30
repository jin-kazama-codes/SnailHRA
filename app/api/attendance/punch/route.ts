import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { AttendancePunch, Fine } from "@/src/types";
import { supabase, syncPunchToSupabase, syncFineToSupabase, getCompanyIdForEmployee } from "@/src/lib/supabase";

import os from "os";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { toBranchName, toBranchId } from "@/src/lib/branchUtils";

// Helper: extract and normalize client IP from request headers
function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfIp = request.headers.get("cf-connecting-ip");
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  const clientIpHeader = request.headers.get("x-client-ip");
  const trueClientIp = request.headers.get("true-client-ip");

  let raw = cfIp || vercelIp || trueClientIp || clientIpHeader || (forwarded ? forwarded.split(",")[0].trim() : (realIp || ""));
  if (!raw) {
    raw = "127.0.0.1";
  }
  return normalizeIp(raw);
}

function normalizeIp(ip: string): string {
  if (!ip) return "";
  let clean = ip.trim();
  if (clean.startsWith("::ffff:")) {
    clean = clean.replace("::ffff:", "");
  }
  if (clean === "::1" || clean === "localhost") {
    clean = "127.0.0.1";
  }
  return clean;
}

function isPrivateIp(ip: string): boolean {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const parts = ip.split(".");
    if (parts.length >= 2) {
      const second = parseInt(parts[1], 10);
      if (second >= 16 && second <= 31) return true;
    }
  }
  return false;
}

function getLocalMachineIps(): string[] {
  const ips: string[] = ["127.0.0.1"];
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === "IPv4" && !net.internal && net.address) {
          ips.push(net.address);
        }
      }
    }
  } catch (e) {
    // Ignore OS network errors
  }
  return ips;
}

/**
 * Checks whether a given IPv4 address falls within a CIDR subnet.
 * e.g. isIpInCidr("223.233.72.151", "223.233.72.0/24") => true
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  try {
    if (!ip || !cidr) return false;
    const ipClean = ip.trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ipClean)) return false;

    const [network, prefixStr] = cidr.split("/");
    const netClean = (network || "").trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(netClean)) return false;

    const prefix = parseInt(prefixStr, 10);
    if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;

    const ipToInt = (addr: string): number => {
      return addr.split(".").reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
    };

    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (ipToInt(ipClean) & mask) === (ipToInt(netClean) & mask);
  } catch {
    return false;
  }
}

function isIpMatched(rawClientIp: string, allowedIpsList: string[]): boolean {
  const clientIp = normalizeIp(rawClientIp);
  if (!clientIp) return false;

  for (const entry of allowedIpsList) {
    const normalized = normalizeIp(entry);
    if (!normalized) continue;

    // CIDR range match (e.g. 223.233.72.0/24)
    if (normalized.includes("/")) {
      if (isIpInCidr(clientIp, normalized)) return true;
      // If client is on 127.0.0.1, check local machine IPs ONLY if the allowed entry is also private
      if (clientIp === "127.0.0.1" && isPrivateIp(normalized.split("/")[0])) {
        const machineIps = getLocalMachineIps();
        if (machineIps.some(mIp => isIpInCidr(mIp, normalized))) return true;
      }
    } else {
      // 1. Exact match
      if (normalized === clientIp) return true;

      // 2. Localhost: check machine IPs ONLY if the allowed entry is also private
      if (clientIp === "127.0.0.1" && isPrivateIp(normalized) && getLocalMachineIps().includes(normalized)) return true;
    }
  }

  return false;
}

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const { employeeId, type } = body;

    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    const db = loadDatabase();
    const companyId = await getCompanyIdForEmployee(employeeId);
    const dbClient = supabaseAdmin || supabase;

    // ─── 1. Determine Employee & Employee Branch ──────────────────────────────
    let emp = (db.employees || []).find((e: any) => String(e.id || "").toLowerCase() === String(employeeId || "").toLowerCase());
    if (!emp && dbClient) {
      try {
        const { data: sbEmp } = await dbClient
          .from("employees")
          .select("*")
          .ilike("id", employeeId)
          .maybeSingle();
        if (sbEmp) {
          emp = {
            ...sbEmp,
            fullName: sbEmp.full_name || sbEmp.fullName,
            branch: sbEmp.branch
          };
        }
      } catch (err) {
        console.warn("Error fetching employee in punch route:", err);
      }
    }

    const empBranch = emp?.branch ? toBranchName(emp.branch) : "";
    const empBranchId = emp?.branch ? toBranchId(emp.branch) : "";

    // ─── 2. Resolve WiFi Restriction Settings (Branch-Specific Priority) ───────
    let enabled = false;
    let allowedIpsList: string[] = [];
    let restrictionBranchName = empBranch || "";

    // A. Query Supabase for Branch-Specific settings first
    if (dbClient && (empBranch || empBranchId)) {
      try {
        const bName = toBranchName(empBranch);
        const bId = toBranchId(empBranch);
        let bQuery = dbClient
          .from("wifi_restriction_settings")
          .select("*")
          .not("branch", "is", null);
        if (companyId) {
          bQuery = bQuery.eq("company_id", companyId);
        }
        bQuery = bQuery.or(`branch.eq.${bName},branch.eq.${bId},branch.eq.${empBranch},branch.ilike.${bName}`);
        const { data: bData } = await bQuery.maybeSingle();
        if (bData) {
          enabled = bData.enabled ?? false;
          const rawStr = bData.allowed_ip || "";
          allowedIpsList = rawStr.split(",").map((s: string) => s.trim()).filter(Boolean);
          restrictionBranchName = bName;
        }
      } catch (e) {
        console.warn("Error reading branch wifi_restriction_settings from Supabase in punch:", e);
      }
    }

    // B. Check in-memory db.branchWifiSettings if not resolved from Supabase
    if (!allowedIpsList.length && (empBranch || empBranchId) && db.branchWifiSettings) {
      const bSetting = db.branchWifiSettings[empBranch]
        || db.branchWifiSettings[toBranchName(empBranch)]
        || db.branchWifiSettings[toBranchId(empBranch)]
        || (emp?.branch ? db.branchWifiSettings[emp.branch] : null);
      if (bSetting) {
        enabled = bSetting.enabled ?? false;
        allowedIpsList = (bSetting.allowedIps && bSetting.allowedIps.length > 0)
          ? bSetting.allowedIps
          : (bSetting.allowedIp ? bSetting.allowedIp.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
        restrictionBranchName = empBranch;
      }
    }

    // C. Fallback to Company-Level / Global settings if no branch settings exist
    if (!allowedIpsList.length) {
      if (dbClient) {
        try {
          let globalData = null;
          if (companyId) {
            const { data: cData } = await dbClient
              .from("wifi_restriction_settings")
              .select("*")
              .eq("company_id", companyId)
              .is("branch", null)
              .maybeSingle();
            if (cData) globalData = cData;
          }
          if (!globalData) {
            const { data: defData } = await dbClient
              .from("wifi_restriction_settings")
              .select("*")
              .eq("id", "default")
              .maybeSingle();
            if (defData) globalData = defData;
          }
          if (globalData) {
            enabled = globalData.enabled ?? false;
            const rawStr = globalData.allowed_ip || "";
            allowedIpsList = rawStr.split(",").map((s: string) => s.trim()).filter(Boolean);
            restrictionBranchName = "Office";
          }
        } catch (e) {
          console.warn("Error reading global wifi_restriction_settings in punch:", e);
        }
      }

      if (!allowedIpsList.length && db.wifiRestrictionSettings) {
        enabled = db.wifiRestrictionSettings.enabled ?? false;
        allowedIpsList = (db.wifiRestrictionSettings.allowedIps && db.wifiRestrictionSettings.allowedIps.length > 0)
          ? db.wifiRestrictionSettings.allowedIps
          : (db.wifiRestrictionSettings?.allowedIp ? db.wifiRestrictionSettings.allowedIp.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
        restrictionBranchName = "Office";
      }
    }

    // ─── 3. Enforce WiFi Restriction If Enabled ───────────────────────────────
    if (enabled && allowedIpsList.length > 0) {
      const serverDetectedIp = getClientIp(request);
      const clientReportedIp = normalizeIp(body.clientIp || "");

      const serverIsPublic = serverDetectedIp && !isPrivateIp(serverDetectedIp);
      const clientIsPublic = clientReportedIp && !isPrivateIp(clientReportedIp);

      let isAllowed = false;
      let evaluatedIp = serverDetectedIp;

      if (serverIsPublic) {
        isAllowed = isIpMatched(serverDetectedIp, allowedIpsList);
        evaluatedIp = serverDetectedIp;
        // If client also reported public IP and it is not matched, reject
        if (isAllowed && clientIsPublic && !isIpMatched(clientReportedIp, allowedIpsList)) {
          isAllowed = false;
          evaluatedIp = clientReportedIp;
        }
      } else if (clientIsPublic) {
        isAllowed = isIpMatched(clientReportedIp, allowedIpsList);
        evaluatedIp = clientReportedIp;
      } else {
        // Both are private/localhost
        isAllowed = isIpMatched(serverDetectedIp, allowedIpsList);
        evaluatedIp = serverDetectedIp;
      }

      if (!isAllowed) {
        const branchNotice = restrictionBranchName ? ` (${restrictionBranchName})` : "";
        return NextResponse.json(
          {
            error: `📶 WiFi Attendance Restriction${branchNotice}: You must be connected to authorized office WiFi to punch attendance. (Detected IP: ${evaluatedIp || "Unrecognized"})`,
            wifiRestricted: true,
            allowedIps: allowedIpsList,
            yourIp: evaluatedIp,
            branch: restrictionBranchName
          },
          { status: 403 }
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (!db.attendance) db.attendance = [];

    const getLocalDateString = (d: Date = new Date()) => {
      try {
        return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      } catch {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    };

    const todayStr = body.date || getLocalDateString(new Date());

    // Check if punch for today exists for this employee
    let existingIndex = db.attendance.findIndex(
      a => a.employeeId === employeeId && a.date === todayStr
    );

    // If not found in memory, query Supabase for today's punch for this employee
    if (existingIndex < 0 && dbClient) {
      try {
        const { data } = await dbClient
          .from("attendance")
          .select("*")
          .eq("employee_id", employeeId)
          .eq("date", todayStr);
        if (data && data.length > 0) {
          const row = data[0];

          // Fetch related breaks from attendance_breaks
          let fetchedBreaks: any[] = [];
          try {
            const { data: breakData } = await dbClient
              .from("attendance_breaks")
              .select("*")
              .eq("attendance_id", row.id);
            if (breakData && breakData.length > 0) {
              fetchedBreaks = breakData.map((b: any) => ({
                start: b.break_start,
                end: b.break_end
              }));
            }
          } catch (bErr) {
            console.warn("Error fetching breaks for punch from Supabase:", bErr);
          }

          const fetchedPunch: AttendancePunch = {
            id: row.id,
            employeeId: row.employee_id || row.employeeId,
            date: row.date,
            clockIn: row.clock_in || row.clockIn,
            clockOut: row.clock_out || row.clockOut,
            breaks: fetchedBreaks,
            status: row.status || "Present",
            workFromHome: row.work_from_home ?? false
          };
          db.attendance.push(fetchedPunch);
          existingIndex = db.attendance.length - 1;
        }
      } catch (err) {}
    }

    let punch: AttendancePunch;

    if (type === "clockin" || (!type && body.clockIn)) {
      const now = new Date();
      const clockInTimeStr = body.clockIn || now.toISOString();
      const clockInObj = new Date(clockInTimeStr);
      let hours = clockInObj.getHours();
      let minutes = clockInObj.getMinutes();
      try {
        const istStr = clockInObj.toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour12: false, hour: "2-digit", minute: "2-digit" });
        const [h, m] = istStr.split(":").map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          hours = h;
          minutes = m;
        }
      } catch (e) {}

      const companyId = await getCompanyIdForEmployee(employeeId);
      const emp = (db.employees || []).find(e => e.id === employeeId);
      const empBranch = emp?.branch || "";
      let lateTime = "09:30";

      if (supabase) {
        try {
          let settingsData = null;
          if (empBranch && companyId) {
            const { data } = await supabase.from("timing_settings").select("late_threshold").eq("company_id", companyId).eq("branch", empBranch).maybeSingle();
            if (data) settingsData = data;
          }
          if (!settingsData && empBranch) {
            const { data } = await supabase.from("timing_settings").select("late_threshold").eq("branch", empBranch).maybeSingle();
            if (data) settingsData = data;
          }
          if (!settingsData && companyId) {
            const { data } = await supabase.from("timing_settings").select("late_threshold").eq("company_id", companyId).maybeSingle();
            if (data) settingsData = data;
          }
          if (!settingsData) {
            const { data } = await supabase.from("timing_settings").select("late_threshold").eq("id", "default").maybeSingle();
            if (data) settingsData = data;
          }
          if (settingsData && settingsData.late_threshold) {
            lateTime = settingsData.late_threshold;
          }
        } catch (e) {}
      } else {
        const branchSettings = empBranch && db.branchTimingSettings?.[empBranch];
        const compSettings = (db as any).companyTimingSettings?.[companyId || ""];
        lateTime = branchSettings?.lateThreshold || compSettings?.lateThreshold || db.timingSettings?.lateThreshold || "09:30";
      }

      const [lateHours, lateMinutes] = lateTime.split(":").map(Number);
      const isLate = hours > lateHours || (hours === lateHours && minutes > lateMinutes);

      if (existingIndex >= 0) {
        // If punch already exists for today, update or return existing active punch
        const existing = db.attendance[existingIndex];
        punch = {
          ...existing,
          clockIn: body.clockIn || existing.clockIn || now.toISOString(),
          status: body.status || existing.status || (isLate ? "Late" : "Present"),
          workFromHome: body.workFromHome ?? existing.workFromHome ?? false
        };
        delete (punch as any).type;
        db.attendance[existingIndex] = punch;
      } else {
        punch = {
          id: body.id || `pun-${Date.now()}`,
          employeeId,
          date: body.date || todayStr,
          clockIn: clockInTimeStr,
          clockOut: body.clockOut || null,
          breaks: body.breaks || [],
          status: body.status || (isLate ? "Late" : "Present"),
          workFromHome: body.workFromHome || false
        };

        db.attendance.push(punch);
      }

      // Auto-issue fine if employee clock in is late (past Late Buffer time)
      if (isLate || punch.status === "Late") {
        const punchDate = punch.date || todayStr;
        if (!db.fines) db.fines = [];

        // Check if fine already logged for this employee and date for Late Coming
        const alreadyFined = db.fines.some(
          (f: any) => f.employeeId === employeeId && f.date === punchDate && (
            (f.reason || "").toLowerCase().includes("late") || (f.reason || "").toLowerCase().includes("tardiness")
          )
        );

        if (!alreadyFined) {
          let sbAlreadyFined = false;
          if (supabase) {
            try {
              const { data: sbFines } = await supabase
                .from("fines")
                .select("id, reason")
                .eq("employee_id", employeeId)
                .eq("date", punchDate);
              if (sbFines && sbFines.some((f: any) => (f.reason || "").toLowerCase().includes("late"))) {
                sbAlreadyFined = true;
              }
            } catch (e) {}
          }

          if (!sbAlreadyFined) {
            let lateInfr = (db.infractionTypes || []).find((t: any) => {
              const name = (t.name || "").toLowerCase();
              return name.includes("late") || name.includes("tardiness") || name.includes("comming") || name.includes("coming");
            });
            if (!lateInfr && db.infractionTypes && db.infractionTypes.length > 0) {
              lateInfr = db.infractionTypes[0];
            }

            const reason = lateInfr?.name || "Late Coming";
            const rawAmt = lateInfr ? (lateInfr.defaultAmount ?? (lateInfr as any).default_amount ?? (lateInfr as any).amount) : undefined;
            const parsedAmt = Number(rawAmt);
            const amount = (!isNaN(parsedAmt) && parsedAmt > 0) ? parsedAmt : 700;

            const emp = (db.employees || []).find((e: any) => (e.id || "").toLowerCase() === (employeeId || "").toLowerCase());
            const empName = emp ? (emp.fullName || (emp as any).full_name || `Employee ${employeeId}`) : `Employee ${employeeId}`;

            const autoFine: Fine = {
              id: `fin-auto-${Date.now()}`,
              employeeId,
              employeeName: empName,
              reason,
              amount,
              date: punchDate,
              status: "Pending"
            };

            db.fines.unshift(autoFine);

            if (supabase) {
              try {
                await syncFineToSupabase(autoFine);
              } catch (e) {
                console.warn("Auto-fine Supabase sync warning:", e);
              }
            }
          }
        }
      }
    } else if (type === "clockout") {
      const now = new Date();
      if (existingIndex >= 0) {
        punch = db.attendance[existingIndex];
        punch.clockOut = now.toISOString();

        // Close any active break
        if (punch.breaks && punch.breaks.length > 0) {
          const lastBreak = punch.breaks[punch.breaks.length - 1];
          if (!lastBreak.end) {
            lastBreak.end = now.toISOString();
          }
        }
        db.attendance[existingIndex] = punch;
      } else {
        // Fallback: Create completed punch record for today
        punch = {
          id: body.id || `pun-${Date.now()}`,
          employeeId,
          date: todayStr,
          clockIn: `${todayStr}T09:00:00.000Z`,
          clockOut: now.toISOString(),
          breaks: [],
          status: "Present",
          workFromHome: false
        };
        db.attendance.push(punch);
      }
    } else if (type === "breakstart") {
      const nowStr = new Date().toISOString();
      if (existingIndex >= 0) {
        punch = db.attendance[existingIndex];
        if (!punch.breaks) punch.breaks = [];
        // First close any unclosed break before starting a new break
        punch.breaks.forEach((b: any) => {
          if (!b.end) b.end = nowStr;
        });
        punch.breaks.push({
          start: nowStr,
          end: null
        });
        db.attendance[existingIndex] = punch;
      } else {
        punch = {
          id: body.id || `pun-${Date.now()}`,
          employeeId,
          date: todayStr,
          clockIn: nowStr,
          clockOut: null,
          breaks: [{ start: nowStr, end: null }],
          status: "Present",
          workFromHome: false
        };
        db.attendance.push(punch);
      }
    } else if (type === "breakend") {
      if (existingIndex >= 0) {
        punch = db.attendance[existingIndex];
        if (punch.breaks && punch.breaks.length > 0) {
          const nowStr = new Date().toISOString();
          punch.breaks.forEach((b: any) => {
            if (!b.end) {
              b.end = nowStr;
            }
          });
        }
        db.attendance[existingIndex] = punch;
      } else {
        punch = {
          id: body.id || `pun-${Date.now()}`,
          employeeId,
          date: todayStr,
          clockIn: new Date().toISOString(),
          clockOut: null,
          breaks: [],
          status: "Present",
          workFromHome: false
        };
        db.attendance.push(punch);
      }
    } else {
      return NextResponse.json({ error: `Invalid punch type: ${type}` }, { status: 400 });
    }

    // Compute total break duration in hours and minutes before saving
    if (punch) {
      let breakMs = 0;
      (punch.breaks || []).forEach((b: any) => {
        const bStart = new Date(b.start);
        const bEnd = b.end ? new Date(b.end) : (punch.clockOut ? bStart : new Date());
        breakMs += (bEnd.getTime() - bStart.getTime());
      });
      const mins = Math.round(breakMs / 60000);
      const hrs = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      punch.totalBreakDuration = `${hrs.toString().padStart(2, "0")}h ${remainingMins.toString().padStart(2, "0")}m`;
      
      if (existingIndex >= 0) {
        db.attendance[existingIndex] = punch;
      } else {
        const lastIdx = db.attendance.findIndex(a => a.id === punch.id);
        if (lastIdx >= 0) {
          db.attendance[lastIdx] = punch;
        }
      }
    }

    saveDatabase(db);

    if (supabase) {
      try {
        await syncPunchToSupabase(punch);
      } catch (e) {
        console.warn("Supabase sync warning:", e);
      }
    }

    return NextResponse.json(punch);
  } catch (error: any) {
    console.error("Error processing attendance punch:", error);
    return NextResponse.json({ error: error?.message || "Failed to process punch" }, { status: 500 });
  }
}
