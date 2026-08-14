import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import bcrypt from "bcryptjs";

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

    if (body.password) {
      const isAlreadyHashed = typeof body.password === "string" && /^\$2[aby]\$/.test(body.password);
      if (!isAlreadyHashed) {
        const salt = bcrypt.genSaltSync(10);
        body.password = bcrypt.hashSync(body.password, salt);
      }
    }

    let emp: any;
    if (index >= 0) {
      const existingSalary = db.employees[index].salary || {};
      const mergedSalary = body.salary ? { ...existingSalary, ...body.salary } : existingSalary;
      db.employees[index] = {
        ...db.employees[index],
        ...body,
        salary: mergedSalary
      };
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
          employment_type: emp.employmentType || emp.employment_type || null,
          joining_date: emp.joiningDate,
          date_of_birth: emp.dateOfBirth || null,
          company_id: emp.companyId || emp.company_id || null,
          status: emp.status,
          address: emp.address,
          emergency_contact_name: emp.emergencyContact?.name,
          emergency_contact_relation: emp.emergencyContact?.relation,
          emergency_contact_phone: emp.emergencyContact?.phone,
          avatar_url: emp.avatarUrl,
          bio: emp.bio,
          salary_basic: emp.salary?.basic,
          salary_hra: emp.salary?.hra,
          salary_telephone: emp.salary?.telephone || 0,
          salary_fuel: emp.salary?.fuel || 0,
          salary_professional_dev: emp.salary?.professionalDev || 0,
          salary_lta: emp.salary?.lta || 0,
          salary_allowances: emp.salary?.allowances,
          salary_pf_deduction: emp.salary?.pfDeduction,
          salary_tds_deduction: emp.salary?.tdsDeduction,
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
