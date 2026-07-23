import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const empId = resolvedParams.id;
    const body = await request.json();
    const db = loadDatabase();

    if (!db.employees) db.employees = [];
    const index = db.employees.findIndex(e => e.id === empId);
    let emp: any;
    if (index >= 0) {
      db.employees[index] = { ...db.employees[index], ...body };
      emp = db.employees[index];
    } else {
      emp = { ...body, id: empId };
      db.employees.push(emp);
    }

    saveDatabase(db);

    if (supabase) {
      try {
        await supabase.from("employees").upsert({
          id: emp.id,
          full_name: emp.fullName,
          email: emp.email,
          phone: emp.phone,
          role: emp.role,
          designation_id: emp.designationId,
          department: emp.department,
          branch: emp.branch,
          joining_date: emp.joiningDate,
          status: emp.status,
          address: emp.address,
          emergency_contact_name: emp.emergencyContact?.name,
          emergency_contact_relation: emp.emergencyContact?.relation,
          emergency_contact_phone: emp.emergencyContact?.phone,
          avatar_url: emp.avatarUrl,
          bio: emp.bio,
          salary_basic: emp.salary?.basic,
          salary_hra: emp.salary?.hra,
          salary_allowances: emp.salary?.allowances,
          salary_pf_deduction: emp.salary?.pfDeduction,
          bank_account_number: emp.bankDetails?.accountNumber,
          bank_name: emp.bankDetails?.bankName,
          bank_ifsc: emp.bankDetails?.ifsc,
          password: emp.password || null
        });
      } catch (sbErr) {
        console.warn("Supabase sync warning in employee update:", sbErr);
      }
    }

    return NextResponse.json({ success: true, employee: emp });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update employee" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const empId = resolvedParams.id;
    const db = loadDatabase();

    if (!db.employees) db.employees = [];
    db.employees = db.employees.filter(e => e.id !== empId);

    saveDatabase(db);



    return NextResponse.json({ success: true, id: empId });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete employee" }, { status: 500 });
  }
}
