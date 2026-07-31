import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { supabase } from "@/src/lib/supabase";
import { SeatLayout } from "@/src/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || "";
    const db = loadDatabase();
    let layouts = db.seatLayouts || [];
    if (companyId) {
      layouts = layouts.filter((l) => l.companyId === companyId);
    }
    return NextResponse.json(layouts);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to load seat layouts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = loadDatabase();

    const layout: SeatLayout = {
      id: body.id || `layout-${Date.now()}`,
      companyId: body.companyId || "",
      name: body.name || "Office Layout",
      sections: body.sections || [],
      seats: body.seats || [],
      updatedAt: new Date().toISOString(),
      updatedBy: body.updatedBy || undefined,
    };

    if (!db.seatLayouts) db.seatLayouts = [];
    db.seatLayouts = [layout, ...db.seatLayouts.filter((l) => l.id !== layout.id)];
    saveDatabase(db);

    // Optional Supabase sync
    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        await dbClient.from("seat_layouts").upsert({
          id: layout.id,
          company_id: layout.companyId,
          name: layout.name,
          sections: JSON.stringify(layout.sections),
          seats: JSON.stringify(layout.seats),
          updated_at: layout.updatedAt,
          updated_by: layout.updatedBy || null,
        }, { onConflict: "id" });
      } catch (e) {
        console.warn("Supabase seat_layouts upsert warning:", e);
      }
    }

    return NextResponse.json({ success: true, layout });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to save seat layout" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Id is required." }, { status: 400 });

    const db = loadDatabase();
    db.seatLayouts = (db.seatLayouts || []).filter((l) => l.id !== id);
    saveDatabase(db);

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        await dbClient.from("seat_layouts").delete().eq("id", id);
      } catch (e) {
        console.warn("Supabase seat_layouts delete warning:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete seat layout" }, { status: 500 });
  }
}
