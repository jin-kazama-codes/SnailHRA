import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { AttendancePunch } from "@/src/types";
import { supabase, syncPunchToSupabase, getCompanyIdForEmployee } from "@/src/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, employeeId, date, status, clockIn, clockOut, breaks, workFromHome, notes } = body;

    if (!employeeId || !date) {
      return NextResponse.json({ error: "Employee ID and date are required" }, { status: 400 });
    }

    const db = loadDatabase();
    if (!db.attendance) db.attendance = [];

    let existingIndex = -1;
    if (id) {
      existingIndex = db.attendance.findIndex(a => a.id === id);
    }
    if (existingIndex === -1) {
      existingIndex = db.attendance.findIndex(a => a.employeeId === employeeId && a.date === date);
    }

    let punch: AttendancePunch;

    if (existingIndex !== -1) {
      db.attendance[existingIndex] = {
        ...db.attendance[existingIndex],
        status: status || db.attendance[existingIndex].status,
        clockIn: clockIn || db.attendance[existingIndex].clockIn,
        clockOut: clockOut !== undefined ? clockOut : db.attendance[existingIndex].clockOut,
        breaks: breaks || db.attendance[existingIndex].breaks || [],
        workFromHome: workFromHome !== undefined ? workFromHome : db.attendance[existingIndex].workFromHome,
        notes: notes !== undefined ? notes : db.attendance[existingIndex].notes
      };
      punch = db.attendance[existingIndex];
    } else {
      const companyId = await getCompanyIdForEmployee(employeeId);
      let defaultClockIn = "09:00";
      let defaultClockOut = "18:00";
      if (supabase) {
        try {
          let settingsData = null;
          if (companyId) {
            const { data } = await supabase.from("timing_settings").select("clock_in_time, clock_out_time").eq("company_id", companyId).maybeSingle();
            if (data) settingsData = data;
          }
          if (!settingsData) {
            const { data } = await supabase.from("timing_settings").select("clock_in_time, clock_out_time").eq("id", "default").maybeSingle();
            if (data) settingsData = data;
          }
          if (settingsData) {
            defaultClockIn = settingsData.clock_in_time || "09:00";
            defaultClockOut = settingsData.clock_out_time || "18:00";
          }
        } catch (e) {}
      } else {
        const compSettings = (db as any).companyTimingSettings?.[companyId || ""];
        defaultClockIn = compSettings?.clockInTime || db.timingSettings?.clockInTime || "09:00";
        defaultClockOut = compSettings?.clockOutTime || db.timingSettings?.clockOutTime || "18:00";
      }
      punch = {
        id: id || `pun-${Date.now()}`,
        employeeId,
        date,
        status: status || "Present",
        clockIn: clockIn || `${date}T${defaultClockIn}:00.000Z`,
        clockOut: clockOut !== undefined ? clockOut : `${date}T${defaultClockOut}:00.000Z`,
        breaks: breaks || [],
        workFromHome: workFromHome || false,
        notes: notes || ""
      };
      db.attendance.push(punch);
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
      
      if (existingIndex !== -1) {
        db.attendance[existingIndex] = punch;
      } else {
        const idx = db.attendance.findIndex(a => a.id === punch.id);
        if (idx >= 0) {
          db.attendance[idx] = punch;
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
    console.error("Error saving attendance punch:", error);
    return NextResponse.json({ error: error?.message || "Failed to save attendance record" }, { status: 500 });
  }
}
