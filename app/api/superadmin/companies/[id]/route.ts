import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

// PUT /api/superadmin/companies/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name, subscriptionModel, isActive } = await request.json();
    const { id } = params;

    const db = getAdminClient();
    if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

    const updatePayload: Record<string, any> = {};
    if (name !== undefined) updatePayload.name = name;
    if (subscriptionModel !== undefined) updatePayload.subscription_model = subscriptionModel;
    if (isActive !== undefined) updatePayload.is_active = isActive;

    const { data, error } = await db
      .from("companies")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update company error:", error.message);
      return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
    }

    return NextResponse.json({ success: true, company: data });
  } catch (err) {
    console.error("Company PUT error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
