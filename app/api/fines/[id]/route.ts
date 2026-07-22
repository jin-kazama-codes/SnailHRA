import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { updateFineStatusInSupabase } from "@/src/lib/supabase";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const fineId = resolvedParams.id;
    const body = await request.json();
    const db = loadDatabase();

    if (!db.fines) db.fines = [];
    const index = db.fines.findIndex(f => f.id === fineId);
    if (index >= 0) {
      db.fines[index] = { ...db.fines[index], ...body };
    }

    saveDatabase(db);

    if (body.status) {
      await updateFineStatusInSupabase(fineId, body.status);
    }

    return NextResponse.json({ success: true, fine: db.fines[index] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update fine" }, { status: 500 });
  }
}

