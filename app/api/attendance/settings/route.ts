import { NextResponse } from "next/server";
import { loadDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";

export async function POST(request: Request) {
  try {
    const settings = await request.json();
    const db = loadDatabase();
    
    const timingSettings = {
      clockInTime: settings.clockInTime || "09:00",
      clockOutTime: settings.clockOutTime || "18:00",
      lateThreshold: settings.lateThreshold || "09:30",
      breakStartTime: settings.breakStartTime || "13:00",
      breakEndTime: settings.breakEndTime || "14:00"
    };

    db.timingSettings = timingSettings;
    
    if (supabase) {
      try {
        const { error } = await supabase.from("timing_settings").upsert({
          id: "default",
          clock_in_time: timingSettings.clockInTime,
          clock_out_time: timingSettings.clockOutTime,
          late_threshold: timingSettings.lateThreshold,
          break_start_time: timingSettings.breakStartTime,
          break_end_time: timingSettings.breakEndTime,
          changed_by: settings.changedBy || "System"
        }, { onConflict: "id" });
        if (error) {
          console.error("Supabase timing_settings upsert error:", error);
          throw new Error(error.message);
        }
      } catch (err) {
        console.warn("Supabase settings sync warning:", err);
        throw err;
      }
    }
    
    return NextResponse.json({ success: true, timingSettings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save timing settings" }, { status: 500 });
  }
}
