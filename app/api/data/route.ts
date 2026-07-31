import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";

function capitalizeName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .map(word => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId") || "";
  const db = loadDatabase();

  // Prefer admin client (bypasses RLS) for server-side reads; fall back to anon client
  const dbClient = supabaseAdmin || supabase;

  if (dbClient) {
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
        deptsRes, branchesRes, leaveTypesRes, customLeavesRes, breaksRes, empDocsRes,
        payslipsRes, designationsRes, expenseCategoriesRes, meetingsRes, corporateAllowancesFaqRes,
        seatLayoutsRes, roomsRes, roomBookingsRes, customAmenitiesRes
      ] = await Promise.race([
        Promise.all([
          // Transactional tables: Filter strictly by companyId if provided
          companyId
            ? safeQuery(dbClient.from("leaves").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("leaves").select("*")),
          companyId
            ? safeQuery(dbClient.from("attendance").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("attendance").select("*")),
          companyId
            ? safeQuery(dbClient.from("employees").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("employees").select("*")),
          
          // Shared/Configuration tables: Filter by companyId OR companyId is NULL
          companyId
            ? safeQuery(dbClient.from("holidays").select("*").or(`company_id.eq.${companyId},company_id.is.null`))
            : safeQuery(dbClient.from("holidays").select("*")),
          
          companyId
            ? safeQuery(dbClient.from("expenses").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("expenses").select("*")),
          companyId
            ? safeQuery(dbClient.from("inventory").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("inventory").select("*")),
          companyId
            ? safeQuery(dbClient.from("inventory_requests").select("*").eq("company_id", companyId).order("created_at", { ascending: false }))
            : safeQuery(dbClient.from("inventory_requests").select("*").order("created_at", { ascending: false })),
          
          companyId
            ? safeQuery(dbClient.from("policies").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("policies").select("*")),
          
          companyId
            ? safeQuery(dbClient.from("fines").select("*").eq("company_id", companyId).order("created_at", { ascending: false }))
            : safeQuery(dbClient.from("fines").select("*").order("created_at", { ascending: false })),
          
          companyId
            ? safeQuery(dbClient.from("custom_departments").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("custom_departments").select("*")),
          companyId
            ? safeQuery(dbClient.from("custom_branches").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("custom_branches").select("*")),
          
          companyId
            ? safeQuery(dbClient.from("custom_leave_types").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("custom_leave_types").select("*")),
          companyId
            ? safeQuery(dbClient.from("custom_leaves").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("custom_leaves").select("*")),
          
          companyId
            ? safeQuery(dbClient.from("attendance_breaks").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("attendance_breaks").select("*")),
          companyId
            ? safeQuery(dbClient.from("employee_documents").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("employee_documents").select("*")),
          companyId
            ? safeQuery(dbClient.from("payslips").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("payslips").select("*")),
          
          companyId
            ? safeQuery(dbClient.from("designations").select("*").or(`company_id.eq.${companyId},company_id.is.null`))
            : safeQuery(dbClient.from("designations").select("*")),
          companyId
            ? safeQuery(dbClient.from("expense_categories").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("expense_categories").select("*")),
          companyId
            ? safeQuery(dbClient.from("meetings").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("meetings").select("*")),
          companyId
            ? safeQuery(dbClient.from("corporate_allowances_faq").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("corporate_allowances_faq").select("*")),
          companyId
            ? safeQuery(dbClient.from("seat_layouts").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("seat_layouts").select("*")),
          companyId
            ? safeQuery(dbClient.from("rooms").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("rooms").select("*")),
          companyId
            ? safeQuery(dbClient.from("room_bookings").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("room_bookings").select("*")),
          companyId
            ? safeQuery(dbClient.from("custom_amenities").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("custom_amenities").select("*"))
        ]),
        queryTimeout(4500)
      ]);

      if (designationsRes && designationsRes.data && designationsRes.data.length > 0) {
        const sbDesignations = designationsRes.data.map((row: any) => ({
          id: row.id,
          title: capitalizeName(row.title),
          department: capitalizeName(row.department),
          companyId: row.company_id || row.companyId || null
        }));
        const desMap = new Map();
        (db.designations || []).forEach((d: any) => { if (d.id) desMap.set(d.id, d); });
        sbDesignations.forEach((d: any) => { desMap.set(d.id, d); });
        db.designations = Array.from(desMap.values());
      }

      if (expenseCategoriesRes && expenseCategoriesRes.data && expenseCategoriesRes.data.length > 0) {
        const sbCategories = expenseCategoriesRes.data.map((row: any) => ({
          id: row.id,
          name: capitalizeName(row.name),
          companyId: row.company_id || row.companyId || null,
          description: row.description || ""
        }));
        const catMap = new Map();
        (db.expenseCategories || []).forEach((c: any) => { if (c.id) catMap.set(c.id, c); });
        sbCategories.forEach((c: any) => { catMap.set(c.id, c); });
        db.expenseCategories = Array.from(catMap.values());
      }

      if (corporateAllowancesFaqRes && corporateAllowancesFaqRes.data && corporateAllowancesFaqRes.data.length > 0) {
        const sbFaqs = corporateAllowancesFaqRes.data.map((row: any) => ({
          id: row.id,
          title: row.title || "",
          description: row.description || "",
          companyId: row.company_id || row.companyId || null,
          createdAt: row.created_at || row.createdAt || new Date().toISOString()
        }));
        const faqMap = new Map();
        (db.corporateAllowancesFaqs || []).forEach((f: any) => { if (f.id) faqMap.set(f.id, f); });
        sbFaqs.forEach((f: any) => { faqMap.set(f.id, f); });
        db.corporateAllowancesFaqs = Array.from(faqMap.values());
      }

      if (payslipsRes && payslipsRes.data && payslipsRes.data.length > 0) {
        const sbPayslips = payslipsRes.data.map((row: any) => ({
          id: row.id,
          employeeId: row.employee_id || row.employeeId || "",
          month: row.month || "",
          basic: Number(row.basic) || 0,
          hra: Number(row.hra) || 0,
          allowances: Number(row.allowances) || 0,
          finesDeducted: Number(row.fines_deducted ?? row.finesDeducted ?? 0),
          pfDeduction: Number(row.pf_deduction ?? row.pfDeduction ?? 0),
          taxDeduction: Number(row.tax_deduction ?? row.taxDeduction ?? 0),
          netPay: Number(row.net_pay ?? row.netPay ?? 0),
          status: row.status || "Generated",
          generatedAt: row.generated_at || row.generatedAt || new Date().toISOString(),
          sentToEmail: row.sent_to_email || row.sentToEmail || ""
        }));
        const slipMap = new Map();
        sbPayslips.forEach((p: any) => { if (p.id) slipMap.set(p.id, p); });
        db.payslips = Array.from(slipMap.values());
      }

      if (finesRes.data && finesRes.data.length > 0) {
        const sbFines = finesRes.data.map((row: any) => ({
          id: row.id,
          employeeId: row.employee_id || row.employeeId || "",
          employeeName: capitalizeName(row.employee_name || row.employeeName || ""),
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

      if (policiesRes.data) {
        db.policies = policiesRes.data.map((row: any) => ({
          id: row.id,
          title: row.title || "",
          category: row.category || "Conduct & Ethics",
          content: row.content || "",
          lastUpdated: row.last_updated || row.lastUpdated || new Date().toISOString().split("T")[0],
          companyId: row.company_id || row.companyId || undefined
        }));
      }

      if (inventoryRequestsRes.data && inventoryRequestsRes.data.length > 0) {
        const sbRequests = inventoryRequestsRes.data.map((row: any) => ({
          id: row.id,
          employeeId: row.employee_id || row.employeeId || "",
          employeeName: capitalizeName(row.employee_name || row.employeeName || ""),
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

      if (inventoryRes.data) {
        db.inventory = inventoryRes.data.map((row: any) => ({
          id: row.id,
          name: row.name || "",
          serialNumber: row.serial_number || row.serialNumber || "",
          category: row.category || "Laptop",
          status: row.status || "Available",
          assignedToEmployeeId: row.assigned_to_employee_id || row.assignedToEmployeeId || null,
          assignedDate: row.assigned_date || row.assignedDate || null,
          branch: undefined,
          companyId: row.company_id || row.companyId || undefined
        }));
      }

      if (expensesRes.data && expensesRes.data.length > 0) {
        const sbExpenses = expensesRes.data.map((row: any) => ({
          id: row.id,
          employeeId: row.employee_id || row.employeeId || "",
          employeeName: capitalizeName(row.employee_name || row.employeeName || ""),
          companyId: row.company_id || row.companyId || null,
          category: row.category || "Others",
          amount: Number(row.amount) || 0,
          date: row.date || "",
          description: row.description || "",
          status: row.status || "Pending"
        }));
        const expMap = new Map();
        (db.expenses || []).forEach((e: any) => { if (e.id) expMap.set(e.id, e); });
        sbExpenses.forEach((e: any) => { if (e.id) expMap.set(e.id, e); });
        db.expenses = Array.from(expMap.values());
      }

      if (holidaysRes.data && holidaysRes.data.length > 0) {
        db.holidays = holidaysRes.data.map((row: any) => ({
          id: row.id,
          name: capitalizeName(row.name),
          date: row.date,
          type: row.type || "National"
        })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }

      if (leavesRes.data && leavesRes.data.length > 0) {
        const sbLeaves = leavesRes.data.map((row: any) => ({
          id: row.id,
          employeeId: row.employee_id || row.employeeId || "",
          employeeName: capitalizeName(row.employee_name || row.employeeName || ""),
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
        const sbAttendance = attendanceRes.data.map((row: any) => {
          const relatedBreaks = (breaksRes && breaksRes.data)
            ? breaksRes.data
                .filter((b: any) => b.attendance_id === row.id)
                .map((b: any) => ({
                  start: b.break_start,
                  end: b.break_end
                }))
            : [];
          return {
            id: row.id,
            employeeId: row.employee_id || row.employeeId || "",
            date: row.date,
            clockIn: row.clock_in || row.clockIn,
            clockOut: row.clock_out || row.clockOut,
            breaks: relatedBreaks,
            status: row.status || "Present",
            workFromHome: row.work_from_home ?? row.workFromHome ?? false,
            notes: row.notes || ""
          };
        });
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
          const sbEmployees = employeesRes.data.map((row: any) => {
          const bankDetailsFromRow = typeof row.bank_details === "string" ? JSON.parse(row.bank_details) : row.bank_details;
          const salaryFromRow = typeof row.salary === "string" ? JSON.parse(row.salary) : row.salary;
          const emergencyFromRow = typeof row.emergency_contact === "string" ? JSON.parse(row.emergency_contact) : row.emergency_contact;
          const fallbackEmp = (db.employees || []).find((e: any) => e.id === row.id);

          let docList: any[] = typeof row.documents === "string" ? JSON.parse(row.documents) : (row.documents || fallbackEmp?.documents || []);
          if (empDocsRes?.data && empDocsRes.data.length > 0) {
            const relDocs = empDocsRes.data
              .filter((d: any) => (d.employee_id || d.employeeId) === row.id)
              .map((d: any) => ({
                id: d.id,
                name: d.name,
                category: d.category || "ID Proof",
                uploadedAt: d.uploaded_at || d.uploadedAt || new Date().toISOString().split('T')[0],
                size: d.size || "1.5 MB",
                fileUrl: d.file_url || d.fileUrl || ""
              }));
            const docMap = new Map();
            docList.forEach(d => docMap.set(d.id, d));
            relDocs.forEach(d => docMap.set(d.id, d));
            docList = Array.from(docMap.values());
          }

          return {
            id: row.id,
            companyId: row.company_id || row.companyId || fallbackEmp?.companyId || "",
            fullName: capitalizeName(row.full_name || row.fullName || fallbackEmp?.fullName || ""),
            email: row.email || fallbackEmp?.email || "",
            phone: row.phone || fallbackEmp?.phone || "",
            role: row.role || fallbackEmp?.role || "employee",
            designationId: row.designation_id || row.designationId || fallbackEmp?.designationId || "des-4",
            department: row.department || fallbackEmp?.department || "Loans",
            branch: row.branch || row.branch_name || fallbackEmp?.branch || "Mumbai Branch",
            joiningDate: row.joining_date || row.joiningDate || fallbackEmp?.joiningDate || "2024-03-15",
            status: row.status || fallbackEmp?.status || "Active",
            salary: {
              basic: Number(row.salary_basic ?? salaryFromRow?.basic ?? fallbackEmp?.salary?.basic ?? 45000),
              hra: Number(row.salary_hra ?? salaryFromRow?.hra ?? fallbackEmp?.salary?.hra ?? 18000),
              allowances: Number(row.salary_allowances ?? salaryFromRow?.allowances ?? fallbackEmp?.salary?.allowances ?? 10000),
              pfDeduction: Number(row.salary_pf_deduction ?? salaryFromRow?.pfDeduction ?? fallbackEmp?.salary?.pfDeduction ?? 3200),
              tdsDeduction: Number(row.salary_tds_deduction ?? salaryFromRow?.tdsDeduction ?? fallbackEmp?.salary?.tdsDeduction ?? 0)
            },
            bankDetails: {
              accountNumber: String(row.bank_account_number ?? bankDetailsFromRow?.accountNumber ?? fallbackEmp?.bankDetails?.accountNumber ?? ""),
              bankName: String(row.bank_name ?? bankDetailsFromRow?.bankName ?? fallbackEmp?.bankDetails?.bankName ?? "State Bank of India"),
              ifsc: String(row.bank_ifsc ?? bankDetailsFromRow?.ifsc ?? fallbackEmp?.bankDetails?.ifsc ?? "")
            },
            address: row.address || fallbackEmp?.address || "",
            emergencyContact: {
              name: row.emergency_contact_name || emergencyFromRow?.name || fallbackEmp?.emergencyContact?.name || "",
              relation: row.emergency_contact_relation || emergencyFromRow?.relation || fallbackEmp?.emergencyContact?.relation || "",
              phone: row.emergency_contact_phone || emergencyFromRow?.phone || fallbackEmp?.emergencyContact?.phone || ""
            },
            documents: docList,
            onboardingTasks: typeof row.onboarding_tasks === "string" ? JSON.parse(row.onboarding_tasks) : (row.onboardingTasks || fallbackEmp?.onboardingTasks || []),
            avatarUrl: row.avatar_url || row.avatarUrl || fallbackEmp?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop",
            bio: row.bio || fallbackEmp?.bio || "",
            password: row.password || fallbackEmp?.password || "",
            dateOfBirth: row.date_of_birth || fallbackEmp?.dateOfBirth || undefined
          };
        });
        const empMap = new Map();
        sbEmployees.forEach((e: any) => { if (e.id) empMap.set(e.id, e); });
        db.employees = Array.from(empMap.values()).sort((a: any, b: any) => {
          const numA = parseInt((a.id || "").replace(/\D/g, ""), 10) || 0;
          const numB = parseInt((b.id || "").replace(/\D/g, ""), 10) || 0;
          return numA - numB;
        });

        // Filter all employee-linked data to only company's employees
        const companyEmpIds = new Set(db.employees.map((e: any) => e.id));
        db.leaves = (db.leaves || []).filter((l: any) => companyEmpIds.has(l.employeeId));
        db.attendance = (db.attendance || []).filter((a: any) => companyEmpIds.has(a.employeeId));
        db.expenses = (db.expenses || []).filter((e: any) => companyEmpIds.has(e.employeeId));
        db.fines = (db.fines || []).filter((f: any) => companyEmpIds.has(f.employeeId));
        db.payslips = (db.payslips || []).filter((p: any) => companyEmpIds.has(p.employeeId));
        db.inventoryRequests = (db.inventoryRequests || []).filter((ir: any) => companyEmpIds.has(ir.employeeId));
        if (companyId) {
          db.inventory = (db.inventory || []).filter((i: any) => i.companyId === companyId || (i as any).company_id === companyId);
          db.policies = (db.policies || []).filter((p: any) => p.companyId === companyId || (p as any).company_id === companyId);
        } else {
          db.inventory = (db.inventory || []).filter((i: any) => !i.assignedToEmployeeId || companyEmpIds.has(i.assignedToEmployeeId));
        }
      }

      if (meetingsRes && meetingsRes.data && meetingsRes.data.length > 0) {
        db.meetings = meetingsRes.data.map((row: any) => ({
          id: row.id,
          companyId: row.company_id || row.companyId || null,
          title: row.title || "",
          description: row.description || "",
          reason: row.reason || "",
          type: row.type || "Online",
          organizerId: row.organizer_id || row.organizerId || "",
          participantIds: Array.isArray(row.participant_ids) 
            ? row.participant_ids 
            : typeof row.participant_ids === 'string' 
              ? JSON.parse(row.participant_ids) 
              : [],
          department: row.department || undefined,
          priority: row.priority || undefined,
          date: row.date || "",
          startTime: row.start_time || row.startTime || "",
          endTime: row.end_time || row.endTime || "",
          duration: row.duration || undefined,
          timezone: row.timezone || undefined,
          location: row.location || undefined,
          link: row.link || undefined,
          createdAt: row.created_at || row.createdAt || new Date().toISOString()
        }));
        if (db.employees && db.employees.length > 0) {
          const companyEmpIds = new Set(db.employees.map((e: any) => e.id));
          db.meetings = (db.meetings || []).filter((m: any) => 
            companyEmpIds.has(m.organizerId) || 
            m.participantIds.some((pId: string) => companyEmpIds.has(pId))
          );
        }
      } else {
        db.meetings = [];
      }

      if (seatLayoutsRes && seatLayoutsRes.data) {
        db.seatLayouts = seatLayoutsRes.data.map((row: any) => ({
          id: row.id,
          companyId: row.company_id || row.companyId || null,
          name: row.name || "",
          sections: typeof row.sections === "string" ? JSON.parse(row.sections) : (row.sections || []),
          seats: typeof row.seats === "string" ? JSON.parse(row.seats) : (row.seats || []),
          updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
          updatedBy: row.updated_by || row.updatedBy || null
        }));
      }

      if (roomsRes && roomsRes.data) {
        db.rooms = roomsRes.data.map((row: any) => ({
          id: row.id,
          companyId: row.company_id || row.companyId || null,
          name: row.name || "",
          capacity: Number(row.capacity) || 6,
          amenities: typeof row.amenities === "string" ? JSON.parse(row.amenities) : (row.amenities || []),
          floor: row.floor || undefined,
          branch: row.branch || undefined,
          isActive: row.is_active ?? row.isActive ?? true,
          createdAt: row.created_at || row.createdAt || new Date().toISOString()
        }));
      }

      if (roomBookingsRes && roomBookingsRes.data) {
        db.roomBookings = roomBookingsRes.data.map((row: any) => ({
          id: row.id,
          companyId: row.company_id || row.companyId || null,
          roomId: row.room_id || row.roomId || "",
          roomName: row.room_name || row.roomName || "",
          requestedBy: row.requested_by || row.requestedBy || "",
          requestedByName: row.requested_by_name || row.requestedByName || "",
          title: row.title || "",
          date: row.date || "",
          startTime: row.start_time || row.startTime || "",
          endTime: row.end_time || row.endTime || "",
          purpose: row.purpose || "",
          attendees: typeof row.attendees === "string" ? JSON.parse(row.attendees) : (row.attendees || []),
          status: row.status || "Pending",
          approvedBy: row.approved_by || row.approvedBy || undefined,
          approvedAt: row.approved_at || row.approvedAt || undefined,
          createdAt: row.created_at || row.createdAt || new Date().toISOString()
        }));
      }

      if (deptsRes.data) {
        db.customDepartments = deptsRes.data.map((d: any) => capitalizeName(d.name)).filter(Boolean);
      }

      if (branchesRes.data) {
        db.customBranches = branchesRes.data.map((b: any) => capitalizeName(b.name)).filter(Boolean);
      }

      const rawLeaveTypes = leaveTypesRes.data || customLeavesRes.data || [];
      db.customLeaveTypes = rawLeaveTypes.map((l: any) => capitalizeName(l.name)).filter(Boolean);

      if (customAmenitiesRes && customAmenitiesRes.data && customAmenitiesRes.data.length > 0) {
        db.customAmenities = customAmenitiesRes.data.map((a: any) => {
          return a.icon ? `${capitalizeName(a.name)}|${a.icon}` : capitalizeName(a.name);
        }).filter(Boolean);
      }

      // Load local tenant specific timing setting if available
      if (companyId && db.companyTimingSettings?.[companyId]) {
        db.timingSettings = db.companyTimingSettings[companyId];
      }

      try {
        let settingsData = null;
        if (companyId) {
          const { data } = await dbClient.from("timing_settings").select("*").eq("company_id", companyId).maybeSingle();
          if (data) settingsData = data;
        }
        if (!settingsData) {
          const { data } = await dbClient.from("timing_settings").select("*").eq("id", "default").maybeSingle();
          if (data) settingsData = data;
        }
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

  const MGM_COMPANY_ID = "a1b2c3d4-0001-0001-0001-000000000001";
  if (companyId) {
    db.designations = (db.designations || []).filter((d: any) => {
      const dCompId = d.companyId || d.company_id || MGM_COMPANY_ID;
      return dCompId === companyId;
    });
    db.corporateAllowancesFaqs = (db.corporateAllowancesFaqs || []).filter((f: any) => {
      const fCompId = f.companyId || f.company_id || MGM_COMPANY_ID;
      return fCompId === companyId;
    });
  }

  return NextResponse.json(db);
}

