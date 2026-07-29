import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { syncMeetingToSupabase } from "@/src/lib/supabase";
import { Meeting } from "@/src/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || "";
    const db = loadDatabase();

    let meetingsList = db.meetings || [];
    if (companyId) {
      meetingsList = meetingsList.filter(m => m.companyId === companyId);
    }

    return NextResponse.json(meetingsList);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to load meetings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = loadDatabase();

    const newMeeting: Meeting = {
      id: body.id || `meet-${Date.now()}`,
      companyId: body.companyId || "a1b2c3d4-0001-0001-0001-000000000001",
      title: body.title || "Scheduled Meeting",
      description: body.description || "",
      reason: body.reason || "General",
      type: body.type || "Online",
      organizerId: body.organizerId || "",
      participantIds: body.participantIds || [],
      department: body.department || undefined,
      priority: body.priority || "Medium",
      date: body.date || new Date().toISOString().split("T")[0],
      startTime: body.startTime || "10:00",
      endTime: body.endTime || "11:00",
      duration: body.duration || undefined,
      timezone: body.timezone || "IST (UTC+5:30)",
      location: body.location || undefined,
      link: body.link || undefined,
      createdAt: body.createdAt || new Date().toISOString()
    };

    if (!db.meetings) db.meetings = [];
    db.meetings = [newMeeting, ...db.meetings.filter(m => m.id !== newMeeting.id)];
    saveDatabase(db);

    await syncMeetingToSupabase(newMeeting);

    return NextResponse.json({ success: true, meeting: newMeeting });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to schedule meeting" }, { status: 500 });
  }
}
