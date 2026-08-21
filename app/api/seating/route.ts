import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { supabase } from "@/src/lib/supabase";
import { SeatLayout } from "@/src/types";
import { toBranchName, encodeBranchPrefix } from "@/src/lib/branchUtils";

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

    const companyId = body.companyId || body.company_id || "";
    const layout: SeatLayout = {
      id: body.id || `layout-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      companyId: companyId,
      name: body.name || "Office Layout",
      branch: body.branch ? toBranchName(body.branch) : undefined,
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
      const bName = layout.branch && layout.branch !== "All Branches" ? toBranchName(layout.branch) : null;
      let synced = false;
      if (bName) {
        try {
          const { error: sbErr } = await dbClient.from("seat_layouts").upsert({
            id: layout.id,
            company_id: layout.companyId,
            name: layout.name,
            branch: bName,
            sections: JSON.stringify(layout.sections),
            seats: JSON.stringify(layout.seats),
            updated_at: layout.updatedAt,
            updated_by: layout.updatedBy || null,
          }, { onConflict: "id" });
          if (!sbErr) synced = true;
        } catch {}
      }

      if (!synced) {
        try {
          const encodedName = bName ? encodeBranchPrefix(layout.name, bName) : layout.name;
          await dbClient.from("seat_layouts").upsert({
            id: layout.id,
            company_id: layout.companyId,
            name: encodedName,
            sections: JSON.stringify(layout.sections),
            seats: JSON.stringify(layout.seats),
            updated_at: layout.updatedAt,
            updated_by: layout.updatedBy || null,
          }, { onConflict: "id" });
        } catch (e) {
          console.warn("Supabase seat_layouts upsert warning:", e);
        }
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
