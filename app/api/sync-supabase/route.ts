import { NextResponse } from "next/server";
import { loadDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";

export async function POST() {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase client is not configured" }, { status: 400 });
  }

  try {
    const db = loadDatabase();
    
    // Create employeeId -> companyId lookup map
    const employeeCompanyMap = new Map<string, string>();
    const MGM_COMPANY_ID = "a1b2c3d4-0001-0001-0001-000000000001";
    if (db.employees && db.employees.length > 0) {
      db.employees.forEach((emp: any) => {
        if (emp.id) {
          employeeCompanyMap.set(emp.id, emp.companyId || emp.company_id || MGM_COMPANY_ID);
        }
      });
    }

    // 1. Sync custom lists first (departments, branches, leave types)
    if (db.customDepartments && db.customDepartments.length > 0) {
      for (const name of db.customDepartments) {
        if (!name) continue;
        const { data: existing } = await supabase.from("custom_departments").select("id").ilike("name", name);
        if (!existing || existing.length === 0) {
          await supabase.from("custom_departments").insert([{ name, company_id: MGM_COMPANY_ID }]);
        }
      }
    }

    if (db.customBranches && db.customBranches.length > 0) {
      for (const name of db.customBranches) {
        if (!name) continue;
        const { data: existing } = await supabase.from("custom_branches").select("id").ilike("name", name);
        if (!existing || existing.length === 0) {
          await supabase.from("custom_branches").insert([{ name, company_id: MGM_COMPANY_ID }]);
        }
      }
    }

    if (db.customLeaveTypes && db.customLeaveTypes.length > 0) {
      for (const name of db.customLeaveTypes) {
        if (!name) continue;
        const { data: existing } = await supabase.from("custom_leave_types").select("id").ilike("name", name);
        if (!existing || existing.length === 0) {
          await supabase.from("custom_leave_types").insert([{ name, company_id: MGM_COMPANY_ID }]);
        }
      }
    }

    // 2. Sync designations
    if (db.designations && db.designations.length > 0) {
      const designationRecords = db.designations.map(d => ({
        id: d.id,
        title: d.title,
        department: d.department,
        company_id: (d as any).companyId || (d as any).company_id || MGM_COMPANY_ID
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
        company_id: emp.companyId || (emp as any).company_id || MGM_COMPANY_ID,
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
        salary_tds_deduction: emp.salary?.tdsDeduction,
        bank_account_number: emp.bankDetails?.accountNumber,
        bank_name: emp.bankDetails?.bankName,
        bank_ifsc: emp.bankDetails?.ifsc,
        password: emp.password || null,
        date_of_birth: emp.dateOfBirth || null
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
        company_id: employeeCompanyMap.get(l.employeeId) || MGM_COMPANY_ID,
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

    // 5. Sync attendance and breaks
    if (db.attendance && db.attendance.length > 0) {
      const attendanceRecords = db.attendance.map(a => {
        const compId = employeeCompanyMap.get(a.employeeId) || MGM_COMPANY_ID;
        return {
          id: a.id,
          employee_id: a.employeeId,
          company_id: compId,
          date: a.date,
          clock_in: a.clockIn || null,
          clock_out: a.clockOut || null,
          status: a.status || "Present",
          total_break_duration: a.totalBreakDuration || "00h 00m"
        };
      });
      let { error } = await supabase.from("attendance").upsert(attendanceRecords, { onConflict: "id" });
      if (error) {
        console.warn("Sync: bulk upsert with total_break_duration failed. Attempting fallback bulk upsert without it...", error.message);
        const fallbackRecords = db.attendance.map(a => ({
          id: a.id,
          employee_id: a.employeeId,
          company_id: employeeCompanyMap.get(a.employeeId) || MGM_COMPANY_ID,
          date: a.date,
          clock_in: a.clockIn || null,
          clock_out: a.clockOut || null,
          status: a.status || "Present"
        }));
        const { error: fallbackErr } = await supabase.from("attendance").upsert(fallbackRecords, { onConflict: "id" });
        if (fallbackErr) {
          console.warn("Sync: attendance bulk fallback upsert warning:", fallbackErr.message);
        }
      }

      // Collect breaks to sync
      const breakRecords: any[] = [];
      const attendanceIdsToClear: string[] = [];
      db.attendance.forEach(a => {
        if (a.id) {
          attendanceIdsToClear.push(a.id);
          const compId = employeeCompanyMap.get(a.employeeId) || MGM_COMPANY_ID;
          if (a.breaks && a.breaks.length > 0) {
            a.breaks.forEach(b => {
              breakRecords.push({
                attendance_id: a.id,
                break_start: b.start,
                break_end: b.end || null,
                company_id: compId
              });
            });
          }
        }
      });

      if (attendanceIdsToClear.length > 0) {
        // Clear existing breaks first
        await supabase.from("attendance_breaks").delete().in("attendance_id", attendanceIdsToClear);
      }

      if (breakRecords.length > 0) {
        const { error: breakErr } = await supabase.from("attendance_breaks").insert(breakRecords);
        if (breakErr) {
          console.warn("Sync: attendance_breaks bulk insert warning:", breakErr.message);
        }
      }
    }

    // 5b. Sync expense categories
    if (db.expenseCategories && db.expenseCategories.length > 0) {
      const categoryRecords = db.expenseCategories.map(c => ({
        id: c.id,
        name: c.name,
        company_id: c.companyId || MGM_COMPANY_ID,
        description: c.description || ""
      }));
      const { error } = await supabase.from("expense_categories").upsert(categoryRecords, { onConflict: "id" });
      if (error) {
        console.warn("Sync: expense_categories upsert warning:", error.message);
      }
    }

    // 6. Sync expenses
    if (db.expenses && db.expenses.length > 0) {
      const expenseRecords = db.expenses.map(e => ({
        id: e.id,
        employee_id: e.employeeId,
        company_id: employeeCompanyMap.get(e.employeeId) || MGM_COMPANY_ID,
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
        assigned_date: i.assignedDate || null,
        company_id: (i as any).companyId || (i as any).company_id || (i.assignedToEmployeeId ? employeeCompanyMap.get(i.assignedToEmployeeId) : null) || MGM_COMPANY_ID
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
        company_id: employeeCompanyMap.get(r.employeeId) || MGM_COMPANY_ID,
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
        company_id: employeeCompanyMap.get(f.employeeId) || MGM_COMPANY_ID,
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
