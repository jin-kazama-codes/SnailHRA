import { NextResponse } from "next/server";
import { loadDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";

export async function POST() {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase client is not configured" }, { status: 400 });
  }

  try {
    const db = loadDatabase();

    // 1. Sync custom lists first (departments, branches, leave types)
    if (db.customDepartments && db.customDepartments.length > 0) {
      for (const name of db.customDepartments) {
        if (!name) continue;
        const { data: existing } = await supabase.from("custom_departments").select("id").ilike("name", name);
        if (!existing || existing.length === 0) {
          await supabase.from("custom_departments").insert([{ name }]);
        }
      }
    }

    if (db.customBranches && db.customBranches.length > 0) {
      for (const name of db.customBranches) {
        if (!name) continue;
        const { data: existing } = await supabase.from("custom_branches").select("id").ilike("name", name);
        if (!existing || existing.length === 0) {
          await supabase.from("custom_branches").insert([{ name }]);
        }
      }
    }

    if (db.customLeaveTypes && db.customLeaveTypes.length > 0) {
      for (const name of db.customLeaveTypes) {
        if (!name) continue;
        const { data: existing } = await supabase.from("custom_leave_types").select("id").ilike("name", name);
        if (!existing || existing.length === 0) {
          await supabase.from("custom_leave_types").insert([{ name }]);
        }
      }
    }

    // 2. Sync designations
    if (db.designations && db.designations.length > 0) {
      const designationRecords = db.designations.map(d => ({
        id: d.id,
        title: d.title,
        department: d.department
      }));
      const { error } = await supabase.from("designations").upsert(designationRecords, { onConflict: "id" });
      if (error) {
        console.warn("Sync: designations upsert warning:", error.message);
      }
    }

    // 3. Sync employees
    if (db.employees && db.employees.length > 0) {
      const employeeRecords = db.employees.map(emp => ({
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
      }));
      const { error } = await supabase.from("employees").upsert(employeeRecords, { onConflict: "id" });
      if (error) {
        console.warn("Sync: employees upsert warning:", error.message);
      }
    }

    // 4. Sync leaves
    if (db.leaves && db.leaves.length > 0) {
      const leaveRecords = db.leaves.map(l => ({
        id: l.id,
        employee_id: l.employeeId,
        employee_name: l.employeeName,
        leave_type: l.leaveType,
        start_date: l.startDate,
        end_date: l.endDate,
        reason: l.reason,
        status: l.status,
        applied_date: l.appliedDate
      }));
      const { error } = await supabase.from("leaves").upsert(leaveRecords, { onConflict: "id" });
      if (error) {
        console.warn("Sync: leaves upsert warning:", error.message);
      }
    }

    // 5. Sync attendance
    if (db.attendance && db.attendance.length > 0) {
      const attendanceRecords = db.attendance.map(a => ({
        id: a.id,
        employee_id: a.employeeId,
        date: a.date,
        clock_in: a.clockIn || null,
        clock_out: a.clockOut || null,
        status: a.status || "Present"
      }));
      const { error } = await supabase.from("attendance").upsert(attendanceRecords, { onConflict: "id" });
      if (error) {
        console.warn("Sync: attendance upsert warning:", error.message);
      }
    }

    // 6. Sync expenses
    if (db.expenses && db.expenses.length > 0) {
      const expenseRecords = db.expenses.map(e => ({
        id: e.id,
        employee_id: e.employeeId,
        employee_name: e.employeeName,
        category: e.category,
        amount: Number(e.amount) || 0,
        date: e.date,
        description: e.description,
        status: e.status
      }));
      const { error } = await supabase.from("expenses").upsert(expenseRecords, { onConflict: "id" });
      if (error) {
        console.warn("Sync: expenses upsert warning:", error.message);
      }
    }

    // 7. Sync inventory items
    if (db.inventory && db.inventory.length > 0) {
      const inventoryRecords = db.inventory.map(i => ({
        id: i.id,
        name: i.name,
        serial_number: i.serialNumber || "",
        category: i.category,
        status: i.status,
        assigned_to_employee_id: i.assignedToEmployeeId || null,
        assigned_date: i.assignedDate || null
      }));
      const { error } = await supabase.from("inventory").upsert(inventoryRecords, { onConflict: "id" });
      if (error) {
        console.warn("Sync: inventory upsert warning:", error.message);
      }
    }

    // 8. Sync inventory requests
    if (db.inventoryRequests && db.inventoryRequests.length > 0) {
      const reqRecords = db.inventoryRequests.map(r => ({
        id: r.id,
        employee_id: r.employeeId,
        employee_name: r.employeeName,
        item_name: r.itemName,
        category: r.category,
        request_date: r.requestDate,
        reason: r.reason,
        status: r.status
      }));
      const { error } = await supabase.from("inventory_requests").upsert(reqRecords, { onConflict: "id" });
      if (error) {
        console.warn("Sync: inventory_requests upsert warning:", error.message);
      }
    }

    // 9. Sync fines
    if (db.fines && db.fines.length > 0) {
      const fineRecords = db.fines.map(f => ({
        id: f.id,
        employee_id: f.employeeId,
        employee_name: f.employeeName,
        reason: f.reason,
        amount: Number(f.amount) || 0,
        date: f.date,
        status: f.status
      }));
      const { error } = await supabase.from("fines").upsert(fineRecords, { onConflict: "id" });
      if (error) {
        console.warn("Sync: fines upsert warning:", error.message);
      }
    }

    return NextResponse.json({ success: true, message: "Successfully synced all local dataset elements directly to Supabase cloud instance." });
  } catch (error: any) {
    console.error("Database sync exception:", error);
    return NextResponse.json({ error: error.message || "An exception occurred during Supabase sync execution." }, { status: 500 });
  }
}
