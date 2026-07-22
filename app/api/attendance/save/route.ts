import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { AttendancePunch } from "@/src/types";
import { supabase, syncPunchToSupabase } from "@/src/lib/supabase";

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
      let defaultClockIn = "09:00";
      let defaultClockOut = "18:00";
      if (supabase) {
        try {
          const { data } = await supabase.from("timing_settings").select("clock_in_time, clock_out_time").eq("id", "default").maybeSingle();
          if (data) {
            defaultClockIn = data.clock_in_time || "09:00";
            defaultClockOut = data.clock_out_time || "18:00";
          }
        } catch (e) {}
      } else if (db.timingSettings) {
        defaultClockIn = db.timingSettings.clockInTime || "09:00";
        defaultClockOut = db.timingSettings.clockOutTime || "18:00";
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
