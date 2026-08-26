import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { AttendancePunch } from "@/src/types";
import { supabase, syncPunchToSupabase, getCompanyIdForEmployee } from "@/src/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rows } = body as { rows: any[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "rows must be a non-empty array" }, { status: 400 });
    }

    const db = loadDatabase();
    if (!db.attendance) db.attendance = [];

    const imported: AttendancePunch[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const { employeeId, date, status, clockIn, clockOut, workFromHome, notes } = rows[i];

      if (!employeeId || !date) {
        errors.push({ row: i + 1, message: "Missing employeeId or date" });
        continue;
      }

      try {
        // Find existing punch (by date + employee)
        const existingIndex = db.attendance.findIndex(
          (a) => a.employeeId === employeeId && a.date === date
        );

        let punch: AttendancePunch;

        if (existingIndex !== -1) {
          db.attendance[existingIndex] = {
            ...db.attendance[existingIndex],
            status: status || db.attendance[existingIndex].status,
            clockIn: clockIn || db.attendance[existingIndex].clockIn,
            clockOut: clockOut !== undefined ? clockOut : db.attendance[existingIndex].clockOut,
            breaks: db.attendance[existingIndex].breaks || [],
            workFromHome: workFromHome !== undefined ? workFromHome : db.attendance[existingIndex].workFromHome,
            notes: notes !== undefined ? notes : db.attendance[existingIndex].notes,
          };
          punch = db.attendance[existingIndex];
        } else {
          // Fetch default timing settings
          let defaultClockIn = "09:00";
          let defaultClockOut = "18:00";

          if (supabase) {
            try {
              const companyId = await getCompanyIdForEmployee(employeeId);
              let settingsData = null;
              if (companyId) {
                const { data } = await supabase
                  .from("timing_settings")
                  .select("clock_in_time, clock_out_time")
                  .eq("company_id", companyId)
                  .maybeSingle();
                if (data) settingsData = data;
              }
              if (!settingsData) {
                const { data } = await supabase
                  .from("timing_settings")
                  .select("clock_in_time, clock_out_time")
                  .eq("id", "default")
                  .maybeSingle();
                if (data) settingsData = data;
              }
              if (settingsData) {
                defaultClockIn = settingsData.clock_in_time || "09:00";
                defaultClockOut = settingsData.clock_out_time || "18:00";
              }
            } catch (_e) {}
          } else {
            const compSettings = (db as any).timingSettings;
            defaultClockIn = compSettings?.clockInTime || "09:00";
            defaultClockOut = compSettings?.clockOutTime || "18:00";
          }

          punch = {
            id: `pun-bulk-${Date.now()}-${i}`,
            employeeId,
            date,
            status: status || "Present",
            clockIn: clockIn || `${date}T${defaultClockIn}:00.000Z`,
            clockOut: clockOut !== undefined ? clockOut : `${date}T${defaultClockOut}:00.000Z`,
            breaks: [],
            workFromHome: workFromHome || false,
            notes: notes || "",
          };
          db.attendance.push(punch);
        }

        // Compute total break duration (0 for bulk imports)
        punch.totalBreakDuration = "00h 00m";
        if (existingIndex !== -1) {
          db.attendance[existingIndex] = punch;
        } else {
          const idx = db.attendance.findIndex((a) => a.id === punch.id);
          if (idx >= 0) db.attendance[idx] = punch;
        }

        imported.push(punch);
      } catch (rowErr: any) {
        errors.push({ row: i + 1, message: rowErr?.message || "Unknown error" });
      }
    }

    saveDatabase(db);

    // Sync to Supabase in background (best-effort)
    if (supabase) {
      for (const punch of imported) {
        try {
          await syncPunchToSupabase(punch);
        } catch (_e) {}
      }
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      errors,
      records: imported,
    });
  } catch (error: any) {
    console.error("Bulk import error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to bulk import attendance" },
      { status: 500 }
    );
  }
}
