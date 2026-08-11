import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { InfractionType } from "@/src/types";

// Always prefer the admin client (bypasses RLS) for server-side writes
const dbClient = supabaseAdmin || supabase;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId") || "";
  const db = loadDatabase();

  if (dbClient) {
    try {
      const query = companyId
        ? dbClient.from("infraction_types").select("*").eq("company_id", companyId)
        : dbClient.from("infraction_types").select("*");

      const { data, error } = await query;
      if (data && data.length > 0 && !error) {
        return NextResponse.json(
          data.map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description || "",
            defaultAmount: Number(row.default_amount ?? row.defaultAmount ?? 0),
            companyId: row.company_id || row.companyId || null,
          }))
        );
      }
    } catch (e) {
      console.warn("Supabase fetch infraction_types error:", e);
    }
  }

  let types = db.infractionTypes || [];
  if (companyId) {
    types = types.filter((t) => !t.companyId || t.companyId === companyId);
  }
  return NextResponse.json(types);
}

export async function POST(request: Request) {
  try {
    const { id, name, description, defaultAmount, companyId } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const db = loadDatabase();
    const newType: InfractionType = {
      id: id || "infr-" + Date.now(),
      name: name.trim(),
      description: description || "",
      defaultAmount: Number(defaultAmount) || 0,
      companyId: companyId || "",
    };

    if (!db.infractionTypes) db.infractionTypes = [];
    db.infractionTypes = [newType, ...db.infractionTypes.filter((t) => t.id !== newType.id)];
    saveDatabase(db);

    if (dbClient) {
      try {
        const { error } = await dbClient.from("infraction_types").upsert(
          {
            id: newType.id,
            name: newType.name,
            description: newType.description,
            default_amount: newType.defaultAmount ?? 0,
            company_id: newType.companyId || null,
          },
          { onConflict: "id" }
        );
        if (error) {
          console.warn("Supabase infraction_types upsert error:", error.message, error.details);
        }
      } catch (e) {
        console.warn("Supabase infraction_types upsert exception:", e);
      }
    }

    return NextResponse.json({ success: true, infractionType: newType });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create infraction type" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, description, defaultAmount, companyId } = await request.json();
    if (!id || !name) {
      return NextResponse.json({ error: "Id and Name are required." }, { status: 400 });
    }

    const db = loadDatabase();
    if (!db.infractionTypes) db.infractionTypes = [];

    const updated: InfractionType = {
      id,
      name: name.trim(),
      description: description || "",
      defaultAmount: Number(defaultAmount) || 0,
      companyId: companyId || "",
    };

    db.infractionTypes = db.infractionTypes.map(t => t.id === id ? updated : t);
    saveDatabase(db);

    if (dbClient) {
      try {
        const { error } = await dbClient.from("infraction_types").update({
          name: updated.name,
          description: updated.description,
          default_amount: updated.defaultAmount,
          company_id: updated.companyId || null,
        }).eq("id", id);
        if (error) console.warn("Supabase infraction_types update error:", error.message);
      } catch (e) {
        console.warn("Supabase infraction_types update exception:", e);
      }
    }

    return NextResponse.json({ success: true, infractionType: updated });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update infraction type" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Id is required." }, { status: 400 });
    }

    const db = loadDatabase();
    if (!db.infractionTypes) db.infractionTypes = [];
    db.infractionTypes = db.infractionTypes.filter((t) => t.id !== id);
    saveDatabase(db);

    if (dbClient) {
      try {
        const { error } = await dbClient.from("infraction_types").delete().eq("id", id);
        if (error) {
          console.warn("Supabase infraction_types delete error:", error.message);
        }
      } catch (e) {
        console.warn("Supabase infraction_types delete exception:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete infraction type" }, { status: 500 });
  }
}



