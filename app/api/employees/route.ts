import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { Employee } from "@/src/types";
import { supabase } from "@/src/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = loadDatabase();

    const nextNum = 1000 + db.employees.length + 1;
    const empId = body.id || `EMP-${nextNum}`;

    const rawPassword = body.password || "Nawaz123#";
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(rawPassword, salt);

    const newEmp: Employee = {
      id: empId,
      fullName: body.fullName || "New Agent",
      email: body.email || "",
      phone: body.phone || "+91 99999 88888",
      role: body.role || "employee",
      designationId: body.designationId || "des-4",
      department: body.department || "Loans",
      joiningDate: body.joiningDate || new Date().toISOString().split("T")[0],
      status: body.status || "Active",
      salary: body.salary || {
        basic: Number(body.salaryBasic) || 40000,
        hra: Number(body.salaryHra) || 16000,
        allowances: Number(body.salaryAllowances) || 8000,
        pfDeduction: Number(body.salaryPf) || 3600
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
        { id: `tsk-auto-${empId}-3`, taskName: "Allocate SnailHR Credentials & Assets", completed: false, dueDate: body.joiningDate || "2026-07-28" }
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
          full_name: newEmp.fullName,
          email: newEmp.email,
          phone: newEmp.phone,
          role: newEmp.role,
          designation_id: newEmp.designationId,
          department: newEmp.department,
          branch: newEmp.branch,
          joining_date: newEmp.joiningDate,
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
    db.employees = db.employees.map(e => e.id === updatedEmp.id ? updatedEmp : e);
    saveDatabase(db);
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

