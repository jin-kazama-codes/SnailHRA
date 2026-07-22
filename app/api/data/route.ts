import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";

export async function GET() {
  const db = loadDatabase();

  if (supabase) {
    try {
      const safeQuery = async (query: any) => {
        try {
          const res = await query;
          if (res.error) {
            console.warn("Supabase query error:", res.error.message, res.error.details);
            return { data: [], error: res.error };
          }
          return res;
        } catch (e) {
          console.warn("Supabase query exception:", e);
          return { data: [], error: e };
        }
      };

      const queryTimeout = (ms: number) => 
        new Promise<any[]>((_, reject) => 
          setTimeout(() => reject(new Error("Supabase query execution timed out")), ms)
        );

      const [
        leavesRes, attendanceRes, employeesRes, holidaysRes, expensesRes, 
        inventoryRes, inventoryRequestsRes, policiesRes, finesRes, 
        deptsRes, branchesRes, leaveTypesRes, customLeavesRes
      ] = await Promise.race([
        Promise.all([
          safeQuery(supabase.from("leaves").select("*")),
          safeQuery(supabase.from("attendance").select("*")),
          safeQuery(supabase.from("employees").select("*")),
          safeQuery(supabase.from("holidays").select("*")),
          safeQuery(supabase.from("expenses").select("*")),
          safeQuery(supabase.from("inventory").select("*")),
          safeQuery(supabase.from("inventory_requests").select("*").order("created_at", { ascending: false })),
          safeQuery(supabase.from("policies").select("*")),
          safeQuery(supabase.from("fines").select("*").order("created_at", { ascending: false })),
          safeQuery(supabase.from("custom_departments").select("*")),
          safeQuery(supabase.from("custom_branches").select("*")),
          safeQuery(supabase.from("custom_leave_types").select("*")),
          safeQuery(supabase.from("custom_leaves").select("*"))
        ]),
        queryTimeout(4500)
      ]);

      if (finesRes.data && finesRes.data.length > 0) {
        const sbFines = finesRes.data.map((row: any) => ({
          id: row.id,
          employeeId: row.employee_id || row.employeeId || "",
          employeeName: row.employee_name || row.employeeName || "",
          reason: row.reason || "Late Coming",
          amount: Number(row.amount) || 0,
          date: row.date || "",
          status: row.status || "Pending"
        }));
        const fineMap = new Map();
        (db.fines || []).forEach((f: any) => { if (f.id) fineMap.set(f.id, f); });
        sbFines.forEach((f: any) => { fineMap.set(f.id, f); });
        db.fines = Array.from(fineMap.values());
      }

      if (policiesRes.data && policiesRes.data.length > 0) {
        const sbPolicies = policiesRes.data.map((row: any) => ({
          id: row.id,
          title: row.title || "",
          category: row.category || "Conduct & Ethics",
          content: row.content || "",
          lastUpdated: row.last_updated || row.lastUpdated || new Date().toISOString().split("T")[0]
        }));
        const polMap = new Map();
        (db.policies || []).forEach((p: any) => { if (p.id) polMap.set(p.id, p); });
        sbPolicies.forEach((p: any) => { polMap.set(p.id, p); });
        db.policies = Array.from(polMap.values());
      }

      if (inventoryRequestsRes.data && inventoryRequestsRes.data.length > 0) {
        const sbRequests = inventoryRequestsRes.data.map((row: any) => ({
          id: row.id,
          employeeId: row.employee_id || row.employeeId || "",
          employeeName: row.employee_name || row.employeeName || "",
          itemName: row.item_name || row.itemName || "",
          category: row.category || "Laptop",
          requestDate: row.request_date || row.requestDate || "",
          reason: row.reason || "",
          status: row.status || "Pending"
        }));
        const reqMap = new Map();
        (db.inventoryRequests || []).forEach((r: any) => { if (r.id) reqMap.set(r.id, r); });
        sbRequests.forEach((r: any) => { reqMap.set(r.id, r); });
        db.inventoryRequests = Array.from(reqMap.values());
      }

      if (inventoryRes.data && inventoryRes.data.length > 0) {
        db.inventory = inventoryRes.data.map((row: any) => ({
          id: row.id,
          name: row.name || "",
          serialNumber: row.serial_number || row.serialNumber || "",
          category: row.category || "Laptop",
          status: row.status || "Available",
          assignedToEmployeeId: row.assigned_to_employee_id || row.assignedToEmployeeId || null,
          assignedDate: row.assigned_date || row.assignedDate || null,
          branch: undefined
        }));
      }

      if (expensesRes.data && expensesRes.data.length > 0) {
        const sbExpenses = expensesRes.data.map((row: any) => ({
          id: row.id,
          employeeId: row.employee_id || row.employeeId || "",
          employeeName: row.employee_name || row.employeeName || "",
          category: row.category || "Others",
          amount: Number(row.amount) || 0,
          date: row.date || "",
          description: row.description || "",
          status: row.status || "Pending"
        }));
        const expMap = new Map();
        sbExpenses.forEach((e: any) => { if (e.id) expMap.set(e.id, e); });
        (db.expenses || []).forEach((e: any) => { if (e.id) expMap.set(e.id, e); });
        db.expenses = Array.from(expMap.values());
      }

      if (holidaysRes.data && holidaysRes.data.length > 0) {
        db.holidays = holidaysRes.data.map((row: any) => ({
          id: row.id,
          name: row.name,
          date: row.date,
          type: row.type || "National"
        })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }

      if (leavesRes.data && leavesRes.data.length > 0) {
        const sbLeaves = leavesRes.data.map((row: any) => ({
          id: row.id,
          employeeId: row.employee_id || row.employeeId || "",
          employeeName: row.employee_name || row.employeeName || "",
          leaveType: row.leave_type || row.leaveType || "Casual Leave",
          startDate: row.start_date || row.startDate || "",
          endDate: row.end_date || row.endDate || "",
          reason: row.reason || "",
          status: row.status || "Pending",
          appliedDate: row.applied_date || row.appliedDate || ""
        }));
        const leaveMap = new Map();
        (db.leaves || []).forEach((l: any) => { if (l.id) leaveMap.set(l.id, l); });
        sbLeaves.forEach((l: any) => { leaveMap.set(l.id, l); });
        db.leaves = Array.from(leaveMap.values());
      }

      if (attendanceRes.data && attendanceRes.data.length > 0) {
        const sbAttendance = attendanceRes.data.map((row: any) => ({
          id: row.id,
          employeeId: row.employee_id || row.employeeId || "",
          date: row.date,
          clockIn: row.clock_in || row.clockIn,
          clockOut: row.clock_out || row.clockOut,
          breaks: typeof row.breaks === "string" ? JSON.parse(row.breaks) : (row.breaks || []),
          status: row.status || "Present",
          workFromHome: row.work_from_home ?? row.workFromHome ?? false,
          notes: row.notes || ""
        }));
        const attMap = new Map<string, any>();
        (db.attendance || []).forEach((a: any) => {
          if (a.id) attMap.set(a.id, a);
        });

        sbAttendance.forEach((sb: any) => {
          if (!sb.id) return;
          const local = attMap.get(sb.id);
          if (!local) {
            attMap.set(sb.id, sb);
          } else {
            attMap.set(sb.id, {
              ...sb,
              ...local,
              clockIn: local.clockIn || sb.clockIn,
              clockOut: local.clockOut || sb.clockOut,
              breaks: (local.breaks && local.breaks.length > 0) ? local.breaks : sb.breaks,
              workFromHome: local.workFromHome ?? sb.workFromHome
            });
          }
        });

        db.attendance = Array.from(attMap.values());
      }

      if (employeesRes.data && employeesRes.data.length > 0) {
        const sbEmployees = employeesRes.data.map((row: any) => ({
          id: row.id,
          fullName: row.full_name || row.fullName || "",
          email: row.email || "",
          phone: row.phone || "",
          role: row.role || "employee",
          designationId: row.designation_id || row.designationId || "des-4",
          department: row.department || "Loans",
          branch: row.branch || "Mumbai Branch",
          joiningDate: row.joining_date || row.joiningDate || "2024-03-15",
          status: row.status || "Active",
          salary: typeof row.salary === "string" ? JSON.parse(row.salary) : (row.salary || { basic: 45000, hra: 18000, allowances: 10000, pfDeduction: 3200 }),
          bankDetails: typeof row.bank_details === "string" ? JSON.parse(row.bank_details) : (row.bankDetails || { accountNumber: "", bankName: "SBI", ifsc: "" }),
                  address: row.address || "",
          emergencyContact: typeof row.emergency_contact === "string" ? JSON.parse(row.emergency_contact) : (row.emergencyContact || { name: "", relation: "", phone: "" }),
          documents: typeof row.documents === "string" ? JSON.parse(row.documents) : (row.documents || []),
          onboardingTasks: typeof row.onboarding_tasks === "string" ? JSON.parse(row.onboarding_tasks) : (row.onboardingTasks || []),
          password: row.password || ""
        }));
        const empMap = new Map();
        (db.employees || []).forEach((e: any) => { if (e.id) empMap.set(e.id, e); });
        sbEmployees.forEach((e: any) => { empMap.set(e.id, e); });
        db.employees = Array.from(empMap.values());
      }

      if (deptsRes.data && deptsRes.data.length > 0) {
        const deptNames = deptsRes.data.map((d: any) => d.name).filter(Boolean);
        db.customDepartments = Array.from(new Set([...(db.customDepartments || []), ...deptNames]));
      }

      if (branchesRes.data && branchesRes.data.length > 0) {
        const branchNames = branchesRes.data.map((b: any) => b.name).filter(Boolean);
        db.customBranches = Array.from(new Set([...(db.customBranches || []), ...branchNames]));
      }

      const rawLeaveTypes = (leaveTypesRes.data && leaveTypesRes.data.length > 0) 
        ? leaveTypesRes.data 
        : (customLeavesRes.data || []);
      if (rawLeaveTypes && rawLeaveTypes.length > 0) {
        const leaveNames = rawLeaveTypes.map((l: any) => l.name).filter(Boolean);
        db.customLeaveTypes = Array.from(new Set([...(db.customLeaveTypes || []), ...leaveNames]));
      }

      try {
        const { data: settingsData } = await supabase.from("timing_settings").select("*").eq("id", "default").maybeSingle();
        if (settingsData) {
          db.timingSettings = {
            clockInTime: settingsData.clock_in_time || "09:00",
            clockOutTime: settingsData.clock_out_time || "18:00",
            lateThreshold: settingsData.late_threshold || "09:30",
            breakStartTime: settingsData.break_start_time || "13:00",
            breakEndTime: settingsData.break_end_time || "14:00"
          };
        }
      } catch (err) {
        console.warn("Supabase timing_settings hydration error:", err);
      }
    } catch (err) {
      console.warn("Supabase hydration error in GET /api/data:", err);
    }
  }

  return NextResponse.json(db);
}

