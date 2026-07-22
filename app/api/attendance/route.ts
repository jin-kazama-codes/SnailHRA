import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { AttendancePunch } from "@/src/types";
import { supabase } from "@/src/lib/supabase";

export async function GET() {
  try {
    const db = loadDatabase();
    return NextResponse.json(db.attendance || []);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const punch: AttendancePunch = await request.json();
    const db = loadDatabase();
    if (!db.attendance) db.attendance = [];
    
    // Check if punch for today exists to update clockOut vs push new punch
    const existingIndex = db.attendance.findIndex(
      a => a.employeeId === punch.employeeId && a.date === punch.date
    );

    if (existingIndex >= 0) {
      db.attendance[existingIndex] = { ...db.attendance[existingIndex], ...punch };
    } else {
      db.attendance.push(punch);
    }

    saveDatabase(db);



    return NextResponse.json({ success: true, punch });
  } catch (error) {
    return NextResponse.json({ error: "Failed to record attendance" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const db = loadDatabase();
    db.attendance = [];
    saveDatabase(db);

    if (supabase) {
      try {
        await supabase.from("attendance").delete().neq("id", "0");
      } catch (e) {
        console.warn("Supabase sync warning:", e);
      }
    }

    return NextResponse.json({ success: true, message: "Cleared all attendance records." });
  } catch (error) {
    return NextResponse.json({ error: "Failed to clear attendance" }, { status: 500 });
  }
}
