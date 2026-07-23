import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { AttendancePunch } from "@/src/types";
import { supabase, syncPunchToSupabase } from "@/src/lib/supabase";

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
    if (!db.attendance) db.attendance = [];

    const getLocalDateString = (d: Date = new Date()) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = getLocalDateString(new Date());

    // Check if punch for today exists for this employee
    let existingIndex = db.attendance.findIndex(
      a => a.employeeId === employeeId && a.date === todayStr
    );

    // If not found in memory, query Supabase for today's punch for this employee
    if (existingIndex < 0 && supabase) {
      try {
        const { data } = await supabase
          .from("attendance")
          .select("*")
          .eq("employee_id", employeeId)
          .eq("date", todayStr);
        if (data && data.length > 0) {
          const row = data[0];

          // Fetch related breaks from attendance_breaks
          let fetchedBreaks: any[] = [];
          try {
            const { data: breakData } = await supabase
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
      if (existingIndex >= 0) {
        // If punch already exists for today, update or return existing active punch
        const existing = db.attendance[existingIndex];
        punch = {
          ...existing,
          clockIn: body.clockIn || existing.clockIn || new Date().toISOString(),
          status: body.status || existing.status || "Present",
          workFromHome: body.workFromHome ?? existing.workFromHome ?? false
        };
        delete (punch as any).type;
        db.attendance[existingIndex] = punch;
      } else {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        
        let lateTime = "09:30";
        if (supabase) {
          try {
            const { data } = await supabase.from("timing_settings").select("late_threshold").eq("id", "default").maybeSingle();
            if (data && data.late_threshold) {
              lateTime = data.late_threshold;
            }
          } catch (e) {}
        } else if (db.timingSettings) {
          lateTime = db.timingSettings.lateThreshold || "09:30";
        }
        
        const [lateHours, lateMinutes] = lateTime.split(":").map(Number);
        const isLate = hours > lateHours || (hours === lateHours && minutes > lateMinutes);

        punch = {
          id: body.id || `pun-${Date.now()}`,
          employeeId,
          date: body.date || todayStr,
          clockIn: body.clockIn || now.toISOString(),
          clockOut: body.clockOut || null,
          breaks: body.breaks || [],
          status: body.status || (isLate ? "Late" : "Present"),
          workFromHome: body.workFromHome || false
        };

        db.attendance.push(punch);
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
      if (existingIndex >= 0) {
        punch = db.attendance[existingIndex];
        if (!punch.breaks) punch.breaks = [];
        punch.breaks.push({
          start: new Date().toISOString(),
          end: null
        });
        db.attendance[existingIndex] = punch;
      } else {
        punch = {
          id: body.id || `pun-${Date.now()}`,
          employeeId,
          date: todayStr,
          clockIn: new Date().toISOString(),
          clockOut: null,
          breaks: [{ start: new Date().toISOString(), end: null }],
          status: "Present",
          workFromHome: false
        };
        db.attendance.push(punch);
      }
    } else if (type === "breakend") {
      if (existingIndex >= 0) {
        punch = db.attendance[existingIndex];
        if (punch.breaks && punch.breaks.length > 0) {
          const lastBreak = punch.breaks[punch.breaks.length - 1];
          if (!lastBreak.end) {
            lastBreak.end = new Date().toISOString();
          }
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
        const bEnd = b.end ? new Date(b.end) : bStart;
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
