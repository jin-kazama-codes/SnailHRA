import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { supabase } from "@/src/lib/supabase";
import { RoomBooking } from "@/src/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || "";
    const db = loadDatabase();
    let bookings = db.roomBookings || [];
    if (companyId) {
      bookings = bookings.filter((b) => b.companyId === companyId);
    }
    return NextResponse.json(bookings);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to load room bookings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = loadDatabase();

    const companyId = body.companyId || body.company_id || "";
    const booking: RoomBooking = {
      id: body.id || `booking-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      companyId: companyId,
      roomId: body.roomId || "",
      roomName: body.roomName || "",
      requestedBy: body.requestedBy || "",
      requestedByName: body.requestedByName || "",
      title: body.title || "Room Booking",
      date: body.date || new Date().toISOString().split("T")[0],
      startTime: body.startTime || "09:00",
      endTime: body.endTime || "10:00",
      purpose: body.purpose || "",
      attendees: body.attendees || [],
      status: "Pending",
      createdAt: new Date().toISOString(),
    };

    if (!db.roomBookings) db.roomBookings = [];

    // Check for overlapping bookings for the same room on the same date
    const hasOverlap = db.roomBookings.some((b) =>
      b.roomId === booking.roomId &&
      b.date === booking.date &&
      (b.status === "Approved" || b.status === "Pending") &&
      booking.startTime < b.endTime &&
      booking.endTime > b.startTime
    );

    if (hasOverlap) {
      return NextResponse.json(
        { error: "This room is already booked or requested for the selected time slot." },
        { status: 400 }
      );
    }

    db.roomBookings = [booking, ...db.roomBookings.filter((b) => b.id !== booking.id)];
    saveDatabase(db);

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        await dbClient.from("room_bookings").upsert({
          id: booking.id,
          company_id: booking.companyId,
          room_id: booking.roomId,
          room_name: booking.roomName,
          requested_by: booking.requestedBy,
          requested_by_name: booking.requestedByName,
          title: booking.title,
          date: booking.date,
          start_time: booking.startTime,
          end_time: booking.endTime,
          purpose: booking.purpose,
          attendees: JSON.stringify(booking.attendees),
          status: booking.status,
          created_at: booking.createdAt,
        }, { onConflict: "id" });
      } catch (e) {
        console.warn("Supabase room_bookings upsert warning:", e);
      }
    }

    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create room booking" }, { status: 500 });
  }
}
