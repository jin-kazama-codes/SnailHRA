import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { AttendancePunch, Fine } from "@/src/types";
import { supabase, syncPunchToSupabase, syncFineToSupabase, getCompanyIdForEmployee } from "@/src/lib/supabase";

import os from "os";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

// Helper: extract and normalize client IP from request headers
function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfIp = request.headers.get("cf-connecting-ip");
  const vercelIp = request.headers.get("x-vercel-forwarded-for");

  let raw = cfIp || vercelIp || (forwarded ? forwarded.split(",")[0].trim() : (realIp || ""));
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
 * e.g. isIpInCidr("223.233.66.140", "223.233.66.0/24") => true
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  try {
    const [network, prefixStr] = cidr.split("/");
    const prefix = parseInt(prefixStr, 10);
    if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;

    const ipToInt = (addr: string): number => {
      return addr.split(".").reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
    };

    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (ipToInt(ip) & mask) === (ipToInt(network) & mask);
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

    // CIDR range match (e.g. 223.233.66.0/24)
    if (normalized.includes("/")) {
      if (isIpInCidr(clientIp, normalized)) return true;
      // Also check all local machine IPs for localhost scenario
      if (clientIp === "127.0.0.1") {
        const machineIps = getLocalMachineIps();
        if (machineIps.some(mIp => isIpInCidr(mIp, normalized))) return true;
      }
    } else {
      // 1. Exact match
      if (normalized === clientIp) return true;

      // 2. Localhost: check machine IPs against exact allowed entry
      if (clientIp === "127.0.0.1" && getLocalMachineIps().includes(normalized)) return true;
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

    // ─── WiFi Restriction Check ───────────────────────────────────────────────
    let enabled = db.wifiRestrictionSettings?.enabled ?? false;
    let allowedIpsList: string[] = db.wifiRestrictionSettings?.allowedIps && db.wifiRestrictionSettings.allowedIps.length > 0
      ? db.wifiRestrictionSettings.allowedIps
      : (db.wifiRestrictionSettings?.allowedIp ? db.wifiRestrictionSettings.allowedIp.split(",").map(s => s.trim()).filter(Boolean) : []);

    // Always query dynamic WiFi restriction settings directly from Supabase DB first
    if (dbClient) {
      try {
        let wifiData = null;
        if (companyId) {
          const { data } = await dbClient.from("wifi_restriction_settings").select("*").eq("company_id", companyId).maybeSingle();
          if (data) wifiData = data;
        }
        if (!wifiData) {
          const { data } = await dbClient.from("wifi_restriction_settings").select("*").eq("id", "default").maybeSingle();
          if (data) wifiData = data;
        }
        if (wifiData) {
          enabled = wifiData.enabled ?? false;
          const rawStr = wifiData.allowed_ip || "";
          allowedIpsList = rawStr.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
      } catch (e) {
        console.warn("Error reading wifi_restriction_settings from Supabase:", e);
      }
    }

    if (enabled && allowedIpsList.length > 0) {
      const clientIp = getClientIp(request);
      const isAllowed = isIpMatched(clientIp, allowedIpsList);

      if (!isAllowed) {
        return NextResponse.json(
          {
            error: `WiFi Restriction: You must be connected to authorized office WiFi network. (Your current IP: ${clientIp})`,
            wifiRestricted: true,
            allowedIps: allowedIpsList,
            yourIp: clientIp
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
      const hours = clockInObj.getHours();
      const minutes = clockInObj.getMinutes();

      const companyId = await getCompanyIdForEmployee(employeeId);
      let lateTime = "09:30";
      if (supabase) {
        try {
          let settingsData = null;
          if (companyId) {
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
        const compSettings = (db as any).companyTimingSettings?.[companyId || ""];
        lateTime = compSettings?.lateThreshold || db.timingSettings?.lateThreshold || "09:30";
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
            let lateInfr = (db.infractionTypes || []).find(
              (t: any) => (t.name || "").toLowerCase().includes("late") || (t.name || "").toLowerCase().includes("tardiness")
            );
            if (!lateInfr && db.infractionTypes && db.infractionTypes.length > 0) {
              lateInfr = db.infractionTypes[0];
            }

            const reason = lateInfr?.name || "Late Coming";
            const amount = Number(lateInfr?.defaultAmount) > 0 ? Number(lateInfr.defaultAmount) : 500;

            const emp = (db.employees || []).find((e: any) => e.id === employeeId);
            const empName = emp ? emp.fullName : `Employee ${employeeId}`;

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
