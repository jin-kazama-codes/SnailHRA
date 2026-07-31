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
    const { name, slug, subscriptionModel, isActive, logoUrl } = await request.json();
    const { id } = params;

    const db = getAdminClient();
    if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

    const updatePayload: Record<string, any> = {};
    if (name !== undefined) updatePayload.name = name;
    if (slug !== undefined) updatePayload.slug = slug;
    if (subscriptionModel !== undefined) {
      const model = Number(subscriptionModel);
      if (![1, 2, 3, 4].includes(model)) {
        return NextResponse.json({ error: "subscriptionModel must be 1, 2, 3, or 4" }, { status: 400 });
      }
      updatePayload.subscription_model = model;
    }
    if (isActive !== undefined) updatePayload.is_active = isActive;
    // Allow clearing logo by passing null explicitly, or setting a new URL
    if (logoUrl !== undefined) updatePayload.logo_url = logoUrl || null;

    const { data, error } = await db
      .from("companies")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "A company with this slug already exists" }, { status: 409 });
      }
      console.error("Update company error:", error.message);
      return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
    }

    // Map snake_case DB columns → camelCase expected by the frontend Company type
    const company = {
      id: data.id,
      name: data.name,
      slug: data.slug,
      subscriptionModel: data.subscription_model ?? 1,
      isActive: data.is_active ?? true,
      logoUrl: data.logo_url ?? null,
      totalEmployees: data.total_employees ?? 0,
      totalAdmins: data.total_admins ?? 0,
      createdAt: data.created_at,
    };
    return NextResponse.json({ success: true, company });
  } catch (err) {
    console.error("Company PUT error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
