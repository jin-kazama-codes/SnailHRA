import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { syncMeetingToSupabase, deleteMeetingFromSupabase } from "@/src/lib/supabase";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const meetingId = resolvedParams.id;
    const body = await request.json();
    const db = loadDatabase();

    if (!db.meetings) db.meetings = [];
    const index = db.meetings.findIndex(m => m.id === meetingId);

    if (index >= 0) {
      // Update existing meeting
      db.meetings[index] = { ...db.meetings[index], ...body };
      saveDatabase(db);
      await syncMeetingToSupabase(db.meetings[index]);
      return NextResponse.json({ success: true, meeting: db.meetings[index] });
    } else {
      // Meeting not in DB (created before persistence was active) — upsert it
      const upserted = { id: meetingId, ...body };
      db.meetings = [upserted, ...db.meetings];
      saveDatabase(db);
      await syncMeetingToSupabase(upserted);
      return NextResponse.json({ success: true, meeting: upserted });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update meeting" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const meetingId = resolvedParams.id;
    const db = loadDatabase();

    if (!db.meetings) db.meetings = [];
    const filtered = db.meetings.filter(m => m.id !== meetingId);
    
    if (filtered.length !== db.meetings.length) {
      db.meetings = filtered;
      saveDatabase(db);
      await deleteMeetingFromSupabase(meetingId);
      return NextResponse.json({ success: true, message: "Meeting deleted successfully" });
    } else {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete meeting" }, { status: 500 });
  }
}
