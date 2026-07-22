import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { Policy } from "@/src/types";

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

    if (supabase) {
      try {
        await supabase.from("policies").upsert({
          id: policy.id,
          title: policy.title,
          category: policy.category,
          content: policy.content,
          last_updated: policy.lastUpdated
        });
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

    if (supabase) {
      try {
        await supabase.from("policies").delete().eq("id", id);
      } catch (sbErr) {
        console.warn("Failed to delete policy from Supabase:", sbErr);
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete policy" }, { status: 500 });
  }
}

