import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const leaveId = resolvedParams.id;
    const body = await request.json();
    const db = loadDatabase();

    if (!db.leaves) db.leaves = [];
    const index = db.leaves.findIndex(l => l.id === leaveId);
    if (index >= 0) {
      db.leaves[index] = { ...db.leaves[index], ...body };
    }

    saveDatabase(db);



    return NextResponse.json({ success: true, leave: db.leaves[index] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update leave" }, { status: 500 });
  }
}
