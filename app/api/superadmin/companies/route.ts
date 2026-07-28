import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

// GET /api/superadmin/companies
export async function GET() {
  try {
    const db = getAdminClient();
    if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

    const { data, error } = await db
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch companies error:", error.message);
      return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
    }

    return NextResponse.json({ success: true, companies: data || [] });
  } catch (err) {
    console.error("Companies GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/superadmin/companies
export async function POST(request: Request) {
  try {
    const { name, slug, subscriptionModel } = await request.json();

    if (!name || !slug) {
      return NextResponse.json({ error: "Company name and slug are required" }, { status: 400 });
    }

    const db = getAdminClient();
    if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

    const { data, error } = await db
      .from("companies")
      .insert({ name, slug, subscription_model: subscriptionModel || 1, is_active: true })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "A company with this slug already exists" }, { status: 409 });
      }
      console.error("Create company error:", error.message);
      return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
    }

    return NextResponse.json({ success: true, company: data });
  } catch (err) {
    console.error("Companies POST error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
