import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase, syncPunchToSupabase, deletePunchFromSupabase } from "@/src/lib/supabase";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const punchId = resolvedParams.id;
    const body = await request.json();
    const db = loadDatabase();

    if (!db.attendance) db.attendance = [];
    const index = db.attendance.findIndex(a => a.id === punchId);
    if (index === -1) {
      return NextResponse.json({ error: "Punch record not found" }, { status: 404 });
    }

    db.attendance[index] = {
      ...db.attendance[index],
      ...body
    };

    saveDatabase(db);

    if (supabase) {
      try {
        await syncPunchToSupabase(db.attendance[index]);
      } catch (e) {
        console.warn("Supabase sync warning:", e);
      }
    }

    return NextResponse.json({ success: true, punch: db.attendance[index] });
  } catch (error: any) {
    console.error("Error updating punch:", error);
    return NextResponse.json({ error: error?.message || "Failed to update punch record" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const punchId = resolvedParams.id;
    const db = loadDatabase();

    if (!db.attendance) db.attendance = [];
    db.attendance = db.attendance.filter(a => a.id !== punchId);

    saveDatabase(db);

    if (supabase) {
      try {
        await deletePunchFromSupabase(punchId);
      } catch (e) {
        console.warn("Supabase sync warning:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting punch:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete punch record" }, { status: 500 });
  }
}
