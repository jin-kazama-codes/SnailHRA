import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

// GET /api/superadmin/companies/[id]/users
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const companyId = params.id;

    const db = getAdminClient();
    if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

    const { data, error } = await db
      .from("employees")
      .select("id, full_name, email, phone, role, status, department, branch, joining_date")
      .eq("company_id", companyId)
      .order("role", { ascending: true });

    if (error) {
      console.error("Fetch company users error:", error.message);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    const users = (data || []).map((u: any) => ({
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: u.status,
      department: u.department,
      branch: u.branch,
      joiningDate: u.joining_date,
    }));

    return NextResponse.json({ success: true, users });
  } catch (err) {
    console.error("Company users GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
