import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { supabase } from "@/src/lib/supabase";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, approvedBy, approvedAt } = body;

    if (!["Approved", "Rejected", "Cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const db = loadDatabase();
    if (!db.roomBookings) db.roomBookings = [];

    const bookingIndex = db.roomBookings.findIndex((b) => b.id === id);
    if (bookingIndex === -1) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    db.roomBookings[bookingIndex] = {
      ...db.roomBookings[bookingIndex],
      status,
      approvedBy: approvedBy || undefined,
      approvedAt: approvedAt || (status !== "Cancelled" ? new Date().toISOString() : undefined),
    };

    const updatedBooking = db.roomBookings[bookingIndex];
    saveDatabase(db);

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        await dbClient.from("room_bookings").update({
          status: updatedBooking.status,
          approved_by: updatedBooking.approvedBy || null,
          approved_at: updatedBooking.approvedAt || null,
        }).eq("id", id);
      } catch (e) {
        console.warn("Supabase room_bookings update warning:", e);
      }
    }

    return NextResponse.json({ success: true, booking: updatedBooking });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update room booking" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const db = loadDatabase();
    db.roomBookings = (db.roomBookings || []).filter((b) => b.id !== id);
    saveDatabase(db);

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        await dbClient.from("room_bookings").delete().eq("id", id);
      } catch (e) {
        console.warn("Supabase room_bookings delete warning:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete room booking" }, { status: 500 });
  }
}
