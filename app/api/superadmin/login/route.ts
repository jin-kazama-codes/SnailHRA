import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// Use the service role key so RLS on super_admins table doesn't block the query
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    // Fetch super admin by email (service role bypasses RLS)
    const { data, error } = await adminClient
      .from("super_admins")
      .select("*")
      .ilike("email", email)
      .maybeSingle();

    if (error) {
      console.error("Supabase superadmin fetch error:", error.message);
      return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Verify password using bcrypt (with plain-text fallback)
    const isMatch = bcrypt.compareSync(password, data.password) || data.password === password;
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      superAdmin: {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
      },
      token: `sa_${data.id}`,
    });
  } catch (err) {
    console.error("Super admin login error:", err);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
