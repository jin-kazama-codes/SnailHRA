import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

// POST /api/superadmin/companies/[id]/admin
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      prefix,
      fullName,
      gender,
      email, phone = "", password,
      role = "admin",
      department = "Management",
      designation,
      joiningDate,
      dateOfBirth,
      branch = "Head Office",
      salaryBasic = 0, salaryHra = 0, salaryAllowances = 0,
      salaryPf = 0, salaryTds = 0,
      bankAccount = "", bankName = "", bankIfsc = "",
      address = "",
      emergencyName = "", emergencyRelation = "", emergencyPhone = "",
      bio = "",
      avatarUrl,
    } = body;

    const companyId = params.id;

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "Full name, email, and password are required" },
        { status: 400 }
      );
    }

    const db = getAdminClient();
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    // Verify company exists
    const { data: company, error: companyErr } = await db
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .single();

    if (companyErr || !company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Check email uniqueness
    const { data: existing } = await db
      .from("employees")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "An employee with this email already exists" },
        { status: 409 }
      );
    }

    // Generate a TEXT primary key (EMP-XXXX) compatible with the employees table
    const { data: lastEmp } = await db
      .from("employees")
      .select("id")
      .like("id", "EMP-%")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    let newId = "EMP-1001";
    if (lastEmp?.id) {
      const match = lastEmp.id.match(/EMP-(\d+)/);
      if (match) {
        const lastNum = parseInt(match[1], 10);
        newId = `EMP-${String(lastNum + 1).padStart(4, "0")}`;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await db.from("employees").insert({
      id: newId,
      prefix: prefix || null,
      full_name: fullName,
      gender: gender || null,
      email,
      phone,
      role,
      company_id: companyId,
      password: hashedPassword,
      status: "Active",
      department,
      branch,
      employment_type: body.employmentType || body.employment_type || null,
      joining_date: joiningDate || new Date().toISOString().split("T")[0],
      date_of_birth: dateOfBirth || null,
      designation_id: null,
      bio: bio || null,
      address: address || null,
      avatar_url: avatarUrl || null,
      // Salary
      salary_basic: Number(salaryBasic) || 0,
      salary_hra: Number(salaryHra) || 0,
      salary_telephone: Number(body.salaryTelephone) || 0,
      salary_fuel: Number(body.salaryFuel) || 0,
      salary_professional_dev: Number(body.salaryProfDev) || 0,
      salary_lta: Number(body.salaryLta) || 0,
      salary_allowances: Number(salaryAllowances) || 0,
      salary_pf_deduction: Number(salaryPf) || 0,
      salary_tds_deduction: Number(salaryTds) || 0,
      // Bank
      bank_account_number: bankAccount || null,
      bank_name: bankName || null,
      bank_ifsc: bankIfsc || null,
      // Emergency
      emergency_contact_name: emergencyName || null,
      emergency_contact_relation: emergencyRelation || null,
      emergency_contact_phone: emergencyPhone || null,
      // Compliance
      pan: body.customFields?.pan || body.pan || null,
      uan: body.customFields?.uan || body.uan || null,
      custom_fields: body.customFields || { pan: body.pan || "", uan: body.uan || "" },
    }).select().single();

    if (error) {
      console.error("Create user DB error:", error.message, error.details, error.hint);
      return NextResponse.json(
        { error: `Failed to create user: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} user created for ${company.name}`,
      employee: { id: data.id, email: data.email, fullName: data.full_name, role: data.role },
    });
  } catch (err: any) {
    console.error("Create user route error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
