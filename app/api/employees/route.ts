import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { Employee } from "@/src/types";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = loadDatabase();

    let nextNum = 1001;
    let maxNum = 1000;
    if (db.employees && db.employees.length > 0) {
      db.employees.forEach((e: any) => {
        if (e.id && e.id.startsWith("EMP-")) {
          const num = parseInt(e.id.replace("EMP-", ""), 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
    }
    nextNum = maxNum + 1;

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        const { data: lastEmp } = await dbClient
          .from("employees")
          .select("id")
          .like("id", "EMP-%")
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastEmp?.id) {
          const match = lastEmp.id.match(/EMP-(\d+)/);
          if (match) {
            const lastNum = parseInt(match[1], 10);
            if (lastNum >= nextNum) {
              nextNum = lastNum + 1;
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch highest ID from Supabase:", err);
      }
    }

    const empId = body.id || `EMP-${nextNum}`;

    const rawPassword = body.password || "Nawaz123#";
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(rawPassword, salt);

    const resolvedCompanyId = body.companyId || body.company_id || "a1b2c3d4-0001-0001-0001-000000000001";
    let resolvedCompanyName = "Company";

    // Resolve company name dynamically for onboarding task details
    if (dbClient && resolvedCompanyId) {
      try {
        const { data: compData } = await dbClient
          .from("companies")
          .select("name")
          .eq("id", resolvedCompanyId)
          .maybeSingle();
        if (compData && compData.name) {
          resolvedCompanyName = compData.name;
        }
      } catch (err) {
        console.warn("Failed to fetch company name for onboard task:", err);
      }
    }

    const newEmp: Employee = {
      id: empId,
      companyId: resolvedCompanyId,
      fullName: body.fullName || "New Agent",
      email: body.email || "",
      phone: body.phone || "+91 99999 88888",
      role: body.role || "employee",
      designationId: body.designationId || "des-4",
      department: body.department || "Loans",
      joiningDate: body.joiningDate || new Date().toISOString().split("T")[0],
      dateOfBirth: body.dateOfBirth || undefined,
      status: body.status || "Active",
      salary: body.salary || {
        basic: Number(body.salaryBasic) || 40000,
        hra: Number(body.salaryHra) || 16000,
        allowances: Number(body.salaryAllowances) || 8000,
        pfDeduction: Number(body.salaryPf) || 3600,
        tdsDeduction: Number(body.salaryTds) || 0
      },
      bankDetails: body.bankDetails || {
        accountNumber: body.bankAccount || "",
        bankName: body.bankName || "State Bank of India",
        ifsc: body.bankIfsc || ""
      },
      address: body.address || "",
      emergencyContact: body.emergencyContact || {
        name: body.emergencyName || "Guardian",
        relation: body.emergencyRelation || "Spouse",
        phone: body.emergencyPhone || "+91 99999 88888"
      },
      documents: body.documents || [],
      onboardingTasks: body.onboardingTasks || [
        { id: `tsk-auto-${empId}-1`, taskName: "Verify KYC and Identity proof", completed: false, dueDate: body.joiningDate || "2026-07-25" },
        { id: `tsk-auto-${empId}-2`, taskName: "Collect Bank Account proof & PAN card", completed: false, dueDate: body.joiningDate || "2026-07-27" },
        { id: `tsk-auto-${empId}-3`, taskName: `Allocate ${resolvedCompanyName} Credentials & Assets`, completed: false, dueDate: body.joiningDate || "2026-07-28" }
      ],
      avatarUrl: body.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop",
      bio: body.bio || "",
      branch: body.branch || "Mumbai Branch",
      password: hashedPassword
    };

    db.employees.push(newEmp);
    saveDatabase(db);

    if (supabase) {
      try {
        await supabase.from("employees").upsert({
          id: newEmp.id,
          company_id: newEmp.companyId,
          full_name: newEmp.fullName,
          email: newEmp.email,
          phone: newEmp.phone,
          role: newEmp.role,
          designation_id: newEmp.designationId,
          department: newEmp.department,
          branch: newEmp.branch,
          joining_date: newEmp.joiningDate,
          date_of_birth: newEmp.dateOfBirth || null,
          status: newEmp.status,
          address: newEmp.address,
          emergency_contact_name: newEmp.emergencyContact?.name,
          emergency_contact_relation: newEmp.emergencyContact?.relation,
          emergency_contact_phone: newEmp.emergencyContact?.phone,
          avatar_url: newEmp.avatarUrl,
          bio: newEmp.bio,
          salary_basic: newEmp.salary?.basic,
          salary_hra: newEmp.salary?.hra,
          salary_allowances: newEmp.salary?.allowances,
          salary_pf_deduction: newEmp.salary?.pfDeduction,
          salary_tds_deduction: newEmp.salary?.tdsDeduction,
          bank_account_number: newEmp.bankDetails?.accountNumber,
          bank_name: newEmp.bankDetails?.bankName,
          bank_ifsc: newEmp.bankDetails?.ifsc,
          password: newEmp.password
        });
      } catch (sbErr) {
        console.warn("Supabase sync warning:", sbErr);
      }
    }

    return NextResponse.json({ success: true, employee: newEmp });
  } catch (error) {
    console.error("Failed to onboard employee:", error);
    return NextResponse.json({ error: "Failed to add employee" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const updatedEmp: Employee = await request.json();
    const db = loadDatabase();
    if (!db.employees) db.employees = [];
    const index = db.employees.findIndex(e => e.id === updatedEmp.id);
    if (index >= 0) {
      db.employees[index] = updatedEmp;
    } else {
      db.employees.push(updatedEmp);
    }
    saveDatabase(db);

    if (supabase) {
      try {
        await supabase.from("employees").upsert({
          id: updatedEmp.id,
          company_id: updatedEmp.companyId,
          full_name: updatedEmp.fullName,
          email: updatedEmp.email,
          phone: updatedEmp.phone,
          role: updatedEmp.role,
          designation_id: updatedEmp.designationId,
          department: updatedEmp.department,
          branch: updatedEmp.branch,
          joining_date: updatedEmp.joiningDate,
          date_of_birth: updatedEmp.dateOfBirth || null,
          status: updatedEmp.status,
          address: updatedEmp.address,
          emergency_contact_name: updatedEmp.emergencyContact?.name,
          emergency_contact_relation: updatedEmp.emergencyContact?.relation,
          emergency_contact_phone: updatedEmp.emergencyContact?.phone,
          avatar_url: updatedEmp.avatarUrl,
          bio: updatedEmp.bio,
          salary_basic: updatedEmp.salary?.basic,
          salary_hra: updatedEmp.salary?.hra,
          salary_allowances: updatedEmp.salary?.allowances,
          salary_pf_deduction: updatedEmp.salary?.pfDeduction,
          bank_account_number: updatedEmp.bankDetails?.accountNumber,
          bank_name: updatedEmp.bankDetails?.bankName,
          bank_ifsc: updatedEmp.bankDetails?.ifsc,
          password: updatedEmp.password
        });
      } catch (sbErr) {
        console.warn("Supabase PUT sync warning:", sbErr);
      }
    }

    return NextResponse.json({ success: true, employee: updatedEmp });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const db = loadDatabase();
    db.employees = db.employees.filter(e => e.id !== id);
    saveDatabase(db);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
  }
}

