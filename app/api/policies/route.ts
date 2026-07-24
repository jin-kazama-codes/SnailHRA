import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { Policy } from "@/src/types";

export async function GET() {
  try {
    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      const { data, error } = await dbClient.from("policies").select("*").order("last_updated", { ascending: false });
      if (!error && data && data.length > 0) {
        const policies: Policy[] = data.map((row: any) => ({
          id: row.id,
          title: row.title || "",
          category: row.category || "Conduct & Ethics",
          content: row.content || "",
          lastUpdated: row.last_updated || row.lastUpdated || new Date().toISOString().split("T")[0]
        }));
        return NextResponse.json({ policies });
      } else if (error) {
        console.warn("GET /api/policies Supabase error:", error.message);
      }
    }
    // Fallback to local db
    const db = loadDatabase();
    return NextResponse.json({ policies: db.policies || [] });
  } catch (error) {
    console.error("GET /api/policies error:", error);
    return NextResponse.json({ error: "Failed to fetch policies" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const policy: Policy = await request.json();
    if (!policy.id) {
      policy.id = `pol-${Date.now()}`;
    }
    if (!policy.lastUpdated) {
      policy.lastUpdated = new Date().toISOString().split("T")[0];
    }
    const db = loadDatabase();
    const existingIndex = db.policies.findIndex(p => p.id === policy.id);
    if (existingIndex >= 0) {
      db.policies[existingIndex] = policy;
    } else {
      db.policies.unshift(policy);
    }
    saveDatabase(db);

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        const { error: sbErr } = await dbClient.from("policies").upsert({
          id: policy.id,
          title: policy.title,
          category: policy.category,
          content: policy.content,
          last_updated: policy.lastUpdated
        });
        if (sbErr) {
          console.warn("Failed to sync policy to Supabase:", sbErr.message);
        }
      } catch (sbErr) {
        console.warn("Failed to sync policy to Supabase:", sbErr);
      }
    }

    return NextResponse.json({ success: true, policy });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create policy" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const db = loadDatabase();
    db.policies = db.policies.filter(p => p.id !== id);
    saveDatabase(db);

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        const { error: sbErr } = await dbClient.from("policies").delete().eq("id", id);
        if (sbErr) {
          console.warn("Failed to delete policy from Supabase:", sbErr.message);
        }
      } catch (sbErr) {
        console.warn("Failed to delete policy from Supabase:", sbErr);
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete policy" }, { status: 500 });
  }
}

