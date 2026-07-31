import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { supabase } from "@/src/lib/supabase";
import { Room } from "@/src/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || "";
    const db = loadDatabase();
    let rooms = db.rooms || [];
    if (companyId) {
      rooms = rooms.filter((r) => r.companyId === companyId);
    }
    return NextResponse.json(rooms);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to load rooms" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = loadDatabase();

    const room: Room = {
      id: body.id || `room-${Date.now()}`,
      companyId: body.companyId || "",
      name: body.name || "Meeting Room",
      capacity: body.capacity || 6,
      amenities: body.amenities || [],
      floor: body.floor || undefined,
      branch: body.branch || undefined,
      isActive: body.isActive !== undefined ? body.isActive : true,
      createdAt: body.createdAt || new Date().toISOString(),
    };

    if (!db.rooms) db.rooms = [];
    db.rooms = [room, ...db.rooms.filter((r) => r.id !== room.id)];
    saveDatabase(db);

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        await dbClient.from("rooms").upsert({
          id: room.id,
          company_id: room.companyId,
          name: room.name,
          capacity: room.capacity,
          amenities: JSON.stringify(room.amenities),
          floor: room.floor || null,
          branch: room.branch || null,
          is_active: room.isActive,
          created_at: room.createdAt,
        }, { onConflict: "id" });
      } catch (e) {
        console.warn("Supabase rooms upsert warning:", e);
      }
    }

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to save room" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Id is required." }, { status: 400 });

    const db = loadDatabase();
    db.rooms = (db.rooms || []).filter((r) => r.id !== id);
    saveDatabase(db);

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        await dbClient.from("rooms").delete().eq("id", id);
      } catch (e) {
        console.warn("Supabase rooms delete warning:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete room" }, { status: 500 });
  }
}
