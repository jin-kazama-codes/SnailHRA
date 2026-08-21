import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import bcrypt from "bcryptjs";
import { toBranchId } from "@/src/lib/branchUtils";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const empId = resolvedParams.id;
    const body = await request.json();
    const db = loadDatabase();
    const dbClient = supabaseAdmin || supabase;

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
      const existingCustom = db.employees[index].customFields || {};
      const mergedCustom = body.customFields ? { ...existingCustom, ...body.customFields } : existingCustom;
      db.employees[index] = {
        ...db.employees[index],
        ...body,
        salary: mergedSalary,
        customFields: mergedCustom,
        pan: body.pan || mergedCustom.pan || db.employees[index].pan,
        uan: body.uan || mergedCustom.uan || db.employees[index].uan,
      };
      emp = db.employees[index];
    } else {
      emp = { ...body, id: empId };
      db.employees.push(emp);
    }

    saveDatabase(db);

    if (dbClient) {
      try {
        const panVal = body.pan || emp.customFields?.pan || (emp as any).pan || null;
        const uanVal = body.uan || emp.customFields?.uan || (emp as any).uan || null;
        const customFieldsObj = emp.customFields || { pan: panVal || "", uan: uanVal || "" };

        const updateData: any = {
          pan: panVal,
          uan: uanVal,
          custom_fields: customFieldsObj,
        };

        if (emp.fullName) updateData.full_name = emp.fullName;
        if (emp.email) updateData.email = emp.email;
        if (emp.phone) updateData.phone = emp.phone;
        if (emp.role) updateData.role = emp.role;
        if (emp.designationId) updateData.designation_id = emp.designationId;
        if (emp.department) updateData.department = emp.department;
        if (emp.branch) updateData.branch = toBranchId(emp.branch);
        if (emp.employmentType) updateData.employment_type = emp.employmentType;
        if (emp.joiningDate) updateData.joining_date = emp.joiningDate;
        if (emp.dateOfBirth) updateData.date_of_birth = emp.dateOfBirth;
        if (emp.companyId) updateData.company_id = emp.companyId;
        if (emp.status) updateData.status = emp.status;
        if (emp.address !== undefined) updateData.address = emp.address;
        if (emp.emergencyContact?.name) updateData.emergency_contact_name = emp.emergencyContact.name;
        if (emp.emergencyContact?.relation) updateData.emergency_contact_relation = emp.emergencyContact.relation;
        if (emp.emergencyContact?.phone) updateData.emergency_contact_phone = emp.emergencyContact.phone;
        if (emp.avatarUrl) updateData.avatar_url = emp.avatarUrl;
        if (emp.bio !== undefined) updateData.bio = emp.bio;
        if (emp.salary?.basic !== undefined) updateData.salary_basic = emp.salary.basic;
        if (emp.salary?.hra !== undefined) updateData.salary_hra = emp.salary.hra;
        if (emp.salary?.telephone !== undefined) updateData.salary_telephone = emp.salary.telephone;
        if (emp.salary?.fuel !== undefined) updateData.salary_fuel = emp.salary.fuel;
        if (emp.salary?.professionalDev !== undefined) updateData.salary_professional_dev = emp.salary.professionalDev;
        if (emp.salary?.lta !== undefined) updateData.salary_lta = emp.salary.lta;
        if (emp.salary?.allowances !== undefined) updateData.salary_allowances = emp.salary.allowances;
        if (emp.salary?.pfDeduction !== undefined) updateData.salary_pf_deduction = emp.salary.pfDeduction;
        if (emp.salary?.pfMode !== undefined) updateData.salary_pf_mode = emp.salary.pfMode;
        if (emp.salary?.tdsDeduction !== undefined) updateData.salary_tds_deduction = emp.salary.tdsDeduction;
        if (emp.salary?.tdsOptIn !== undefined) updateData.salary_tds_opt_in = emp.salary.tdsOptIn;
        if (emp.salary?.tdsMode !== undefined) updateData.salary_tds_mode = emp.salary.tdsMode;
        if (emp.salary?.esiOptIn !== undefined) updateData.salary_esi_opt_in = emp.salary.esiOptIn;
        if (emp.salary?.esiDeduction !== undefined) updateData.salary_esi_deduction = emp.salary.esiDeduction;
        if (emp.bankDetails?.accountNumber !== undefined) updateData.bank_account_number = emp.bankDetails.accountNumber;
        if (emp.bankDetails?.bankName !== undefined) updateData.bank_name = emp.bankDetails.bankName;
        if (emp.bankDetails?.ifsc !== undefined) updateData.bank_ifsc = emp.bankDetails.ifsc;
        if (emp.password) updateData.password = emp.password;
        if (emp.salary) updateData.salary = emp.salary;

        const { error: updateErr } = await dbClient.from("employees").update(updateData).eq("id", empId);
        if (updateErr) {
          console.warn("Supabase employee update warning:", updateErr.message);
        }
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
