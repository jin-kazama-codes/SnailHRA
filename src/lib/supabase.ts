import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { loadDatabase } from "./db";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

if (!supabase) {
  console.warn("Supabase client is not configured. Falling back to local filesystem storage.");
} else {
  console.log("Supabase client successfully initialized dynamically from environment.");
}

export async function syncPunchToSupabase(punch: any) {
  if (!supabase) return;
  try {
    await ensureEmployeeSynced(punch.employeeId);
    const record = {
      id: punch.id,
      employee_id: punch.employeeId,
      date: punch.date,
      clock_in: punch.clockIn || null,
      clock_out: punch.clockOut || null,
      status: punch.status || "Present",
      total_break_duration: punch.totalBreakDuration || "00h 00m"
    };
    let { error } = await supabase.from("attendance").upsert(record, { onConflict: "id" });
    if (error) {
      console.warn("Supabase upsert with total_break_duration failed. Attempting fallback upsert without it...", error.message);
      const fallbackRecord = {
        id: punch.id,
        employee_id: punch.employeeId,
        date: punch.date,
        clock_in: punch.clockIn || null,
        clock_out: punch.clockOut || null,
        status: punch.status || "Present"
      };
      const { error: fallbackErr } = await supabase.from("attendance").upsert(fallbackRecord, { onConflict: "id" });
      if (fallbackErr) {
        console.warn("Supabase attendance fallback upsert error:", fallbackErr.message, fallbackErr.details);
        return;
      }
    }

    // Sync breaks to attendance_breaks
    if (punch.breaks && punch.breaks.length > 0) {
      const breakRecords = punch.breaks.map((b: any) => ({
        attendance_id: punch.id,
        break_start: b.start,
        break_end: b.end || null
      }));
      // First delete existing breaks for this punch to avoid duplicates
      await supabase.from("attendance_breaks").delete().eq("attendance_id", punch.id);
      // Then insert the new ones
      const { error: breakErr } = await supabase.from("attendance_breaks").insert(breakRecords);
      if (breakErr) {
        console.warn("Supabase attendance_breaks insert error:", breakErr.message, breakErr.details);
      }
    } else {
      // If there are no breaks, delete any existing ones
      await supabase.from("attendance_breaks").delete().eq("attendance_id", punch.id);
    }
  } catch (e) {
    console.warn("Supabase attendance sync warning:", e);
  }
}

export async function deletePunchFromSupabase(punchId: string) {
  if (!supabase) return;
  try {
    await supabase.from("attendance").delete().eq("id", punchId);
  } catch (e) {
    console.warn("Supabase attendance delete warning:", e);
  }
}

export async function syncHolidayToSupabase(holiday: any) {
  if (!supabase) return;
  try {
    const record = {
      id: holiday.id,
      name: holiday.name,
      date: holiday.date,
      type: holiday.type || "National"
    };
    const { error } = await supabase.from("holidays").upsert(record, { onConflict: "id" });
    if (error) {
      console.warn("Supabase holidays table upsert error:", error.message);
    }
  } catch (e) {
    console.warn("Supabase holiday sync warning:", e);
  }
}

export async function deleteHolidayFromSupabase(holidayId: string) {
  if (!supabase) return;
  try {
    await supabase.from("holidays").delete().eq("id", holidayId);
  } catch (e) {
    console.warn("Supabase holiday delete warning:", e);
  }
}

export async function syncExpenseToSupabase(expense: any) {
  if (!supabase) return;
  try {
    await ensureEmployeeSynced(expense.employeeId);
    const record = {
      id: expense.id,
      employee_id: expense.employeeId,
      employee_name: expense.employeeName || null,
      category: expense.category || "Others",
      amount: Number(expense.amount) || 0,
      date: expense.date,
      description: expense.description || "",
      status: expense.status || "Pending"
    };
    const { error } = await supabase.from("expenses").upsert(record, { onConflict: "id" });
    if (error) {
      console.warn("Supabase expenses table upsert error:", error.message, error.details);
    }
  } catch (e) {
    console.warn("Supabase expense sync warning:", e);
  }
}

export async function syncInventoryToSupabase(item: any) {
  if (!supabase) return;
  try {
    const record = {
      id: item.id,
      name: item.name,
      serial_number: item.serialNumber || item.serial_number || "",
      category: item.category || "Laptop",
      status: item.status || "Available",
      assigned_to_employee_id: item.assignedToEmployeeId || item.assigned_to_employee_id || null,
      assigned_date: item.assignedDate || item.assigned_date || null
    };
    const { error } = await supabase.from("inventory").upsert(record, { onConflict: "id" });
    if (error) {
      console.warn("Supabase inventory table upsert error:", error.message, error.details);
    } else {
      console.log("Successfully synced inventory item to Supabase 'inventory' table:", item.id);
    }
  } catch (e) {
    console.warn("Supabase inventory sync warning:", e);
  }
}

export async function deleteInventoryFromSupabase(itemId: string) {
  if (!supabase) return;
  try {
    await supabase.from("inventory").delete().eq("id", itemId);
  } catch (e) {
    console.warn("Supabase inventory delete warning:", e);
  }
}

export async function syncInventoryRequestToSupabase(req: any) {
  if (!supabase) return;
  try {
    await ensureEmployeeSynced(req.employeeId);
    const record = {
      id: req.id,
      employee_id: req.employeeId,
      employee_name: req.employeeName || null,
      item_name: req.itemName || req.item_name || "",
      category: req.category || "Laptop",
      request_date: req.requestDate || req.request_date || new Date().toISOString().split("T")[0],
      reason: req.reason || "",
      status: req.status || "Pending"
    };
    const { error } = await supabase.from("inventory_requests").upsert(record, { onConflict: "id" });
    if (error) {
      console.warn("Supabase inventory_requests table upsert error:", error.message, error.details);
    } else {
      console.log("Successfully synced asset requisition request to Supabase 'inventory_requests' table:", req.id);
    }
  } catch (e) {
    console.warn("Supabase inventory_requests sync warning:", e);
  }
}

export async function deleteInventoryRequestFromSupabase(reqId: string) {
  if (!supabase) return;
  try {
    await supabase.from("inventory_requests").delete().eq("id", reqId);
  } catch (e) {
    console.warn("Supabase inventory_requests delete warning:", e);
  }
}

export async function syncFineToSupabase(fine: any) {
  if (!supabase) return;
  try {
    const employeeId = fine.employeeId || fine.employee_id;
    if (employeeId) {
      await ensureEmployeeSynced(employeeId);
    }
    const record = {
      id: fine.id,
      employee_id: employeeId,
      employee_name: fine.employeeName || fine.employee_name || null,
      reason: fine.reason || "",
      amount: Number(fine.amount) || 0,
      date: fine.date || new Date().toISOString().split("T")[0],
      status: fine.status || "Pending"
    };
    const { error } = await supabase.from("fines").upsert(record, { onConflict: "id" });
    if (error) {
      console.warn("Supabase fines table upsert error:", error.message, error.details);
    } else {
      console.log("Successfully synced fine to Supabase 'fines' table:", fine.id);
    }
  } catch (e) {
    console.warn("Supabase fine sync warning:", e);
  }
}

export async function updateFineStatusInSupabase(fineId: string, status: string) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from("fines").update({ status }).eq("id", fineId);
    if (error) {
      console.warn("Supabase fines status update error:", error.message);
    } else {
      console.log(`Successfully updated fine ${fineId} status to '${status}' in Supabase 'fines' table.`);
    }
  } catch (e) {
    console.warn("Supabase fine status update warning:", e);
  }
}

export async function deleteFineFromSupabase(fineId: string) {
  if (!supabase) return;
  try {
    await supabase.from("fines").delete().eq("id", fineId);
  } catch (e) {
    console.warn("Supabase fine delete warning:", e);
  }
}

// -------------------------------------------------------------
// Dynamic Configuration Sync Functions (Departments, Branches, Leave Types)
// -------------------------------------------------------------

export async function syncDepartmentToSupabase(name: string) {
  if (!supabase) return;
  try {
    const { data: existing } = await supabase.from("custom_departments").select("id").ilike("name", name);
    if (existing && existing.length > 0) {
      console.log(`Department "${name}" already exists in Supabase 'custom_departments'.`);
      return;
    }
    const { error } = await supabase.from("custom_departments").insert([{ name }]);
    if (error) {
      console.warn("Supabase custom_departments insert warning:", error.message);
    } else {
      console.log(`Successfully synced department "${name}" to Supabase 'custom_departments' table.`);
    }
  } catch (e) {
    console.warn("Supabase custom_departments sync error:", e);
  }
}

export async function deleteDepartmentFromSupabase(name: string) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from("custom_departments").delete().ilike("name", name);
    if (error) {
      console.warn("Supabase custom_departments delete warning:", error.message);
    } else {
      console.log(`Successfully deleted department "${name}" from Supabase 'custom_departments' table.`);
    }
  } catch (e) {
    console.warn("Supabase custom_departments delete error:", e);
  }
}

export async function syncBranchToSupabase(name: string) {
  if (!supabase) return;
  try {
    const { data: existing } = await supabase.from("custom_branches").select("id").ilike("name", name);
    if (existing && existing.length > 0) {
      console.log(`Branch "${name}" already exists in Supabase 'custom_branches'.`);
      return;
    }
    const { error } = await supabase.from("custom_branches").insert([{ name }]);
    if (error) {
      console.warn("Supabase custom_branches insert warning:", error.message);
    } else {
      console.log(`Successfully synced branch "${name}" to Supabase 'custom_branches' table.`);
    }
  } catch (e) {
    console.warn("Supabase custom_branches sync error:", e);
  }
}

export async function deleteBranchFromSupabase(name: string) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from("custom_branches").delete().ilike("name", name);
    if (error) {
      console.warn("Supabase custom_branches delete warning:", error.message);
    } else {
      console.log(`Successfully deleted branch "${name}" from Supabase 'custom_branches' table.`);
    }
  } catch (e) {
    console.warn("Supabase custom_branches delete error:", e);
  }
}

export async function syncLeaveTypeToSupabase(name: string) {
  if (!supabase) return;
  try {
    const { data: existing } = await supabase.from("custom_leave_types").select("id").ilike("name", name);
    if (existing && existing.length > 0) {
      console.log(`Leave type "${name}" already exists in Supabase 'custom_leave_types'.`);
      return;
    }
    const { error } = await supabase.from("custom_leave_types").insert([{ name }]);
    if (error) {
      console.warn("Supabase custom_leave_types insert warning:", error.message);
      // Fallback attempt to custom_leaves
      const { data: existingLeaves } = await supabase.from("custom_leaves").select("id").ilike("name", name);
      if (!existingLeaves || existingLeaves.length === 0) {
        await supabase.from("custom_leaves").insert([{ name }]);
      }
    } else {
      console.log(`Successfully synced leave type "${name}" to Supabase 'custom_leave_types' table.`);
    }
  } catch (e) {
    console.warn("Supabase custom_leave_types sync error:", e);
  }
}

export async function deleteLeaveTypeFromSupabase(name: string) {
  if (!supabase) return;
  try {
    await supabase.from("custom_leave_types").delete().eq("name", name);
    await supabase.from("custom_leaves").delete().eq("name", name);
    console.log(`Successfully deleted leave type "${name}" from Supabase 'custom_leave_types' / 'custom_leaves' table.`);
  } catch (e) {
    console.warn("Supabase custom_leave_types delete error:", e);
  }
}

export async function ensureEmployeeSynced(employeeId: string) {
  if (!supabase) return;
  try {
    // Check if employee exists in Supabase
    const { data, error } = await supabase.from("employees").select("id").eq("id", employeeId).maybeSingle();
    if (!error && data) {
      return; // Already exists
    }

    // Employee not in Supabase, load from local DB and sync
    const db = loadDatabase();
    const emp = db.employees?.find((e: any) => e.id === employeeId);
    if (emp) {
      const record = {
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
      };
      const { error: insertErr } = await supabase.from("employees").upsert(record, { onConflict: "id" });
      if (insertErr) {
        console.warn(`Failed to pre-sync fallback employee ${emp.id}:`, insertErr.message);
      } else {
        console.log(`Successfully pre-synced employee ${emp.id} (${emp.fullName}) to Supabase.`);
      }
    }
  } catch (err) {
    console.warn("ensureEmployeeSynced warning:", err);
  }
}



