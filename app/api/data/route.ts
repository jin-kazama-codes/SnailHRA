import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase, initialOnboardingChecklistTemplates, initialExitChecklistTemplates } from "@/src/lib/db";
import { supabase, syncFineToSupabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { toBranchId, toBranchName, encodeBranchPrefix, extractBranchPrefix } from "@/src/lib/branchUtils";

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
        seatLayoutsRes, roomsRes, roomBookingsRes, customAmenitiesRes, infractionTypesRes,
        grievancesRes, performanceRes, checklistTemplatesRes, timingSettingsRes
      ] = await Promise.race([
        Promise.all([
          // Transactional tables: Filter strictly by companyId if provided
          companyId
            ? safeQuery(dbClient.from("leaves").select("*").or(`company_id.eq.${companyId},company_id.is.null`))
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
            ? safeQuery(dbClient.from("attendance_breaks").select("*").or(`company_id.eq.${companyId},company_id.is.null`))
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
            : safeQuery(dbClient.from("custom_amenities").select("*")),
          companyId
            ? safeQuery(dbClient.from("infraction_types").select("*").eq("company_id", companyId))
            : safeQuery(dbClient.from("infraction_types").select("*")),
          companyId
            ? safeQuery(dbClient.from("grievance_tickets").select("*").eq("company_id", companyId).order("created_at", { ascending: false }))
            : safeQuery(dbClient.from("grievance_tickets").select("*").order("created_at", { ascending: false })),
          companyId
            ? safeQuery(dbClient.from("performance_records").select("*").eq("company_id", companyId).order("created_at", { ascending: false }))
            : safeQuery(dbClient.from("performance_records").select("*").order("created_at", { ascending: false })),
          companyId
            ? safeQuery(dbClient.from("checklist_templates").select("*").or(`company_id.eq.${companyId},company_id.is.null`))
            : safeQuery(dbClient.from("checklist_templates").select("*")),
          safeQuery(dbClient.from("timing_settings").select("*"))
        ]),
        queryTimeout(4500)
      ]);

      if (checklistTemplatesRes && checklistTemplatesRes.data && Array.isArray(checklistTemplatesRes.data) && !checklistTemplatesRes.error) {
        if (checklistTemplatesRes.data.length === 0) {
          const defaults = [...initialOnboardingChecklistTemplates, ...initialExitChecklistTemplates];
          try {
            await dbClient.from("checklist_templates").upsert(
              defaults.map(t => ({
                id: t.id,
                title: t.title,
                description: t.description || "",
                category: t.category || "General",
                required: t.required ?? true,
                type: t.type,
                company_id: companyId || null
              })),
              { onConflict: "id" }
            );
          } catch (seedErr) {
            console.warn("Failed to seed initial checklist templates to Supabase:", seedErr);
          }
          db.onboardingChecklistTemplates = initialOnboardingChecklistTemplates;
          db.exitChecklistTemplates = initialExitChecklistTemplates;
        } else {
          db.onboardingChecklistTemplates = checklistTemplatesRes.data
            .filter((row: any) => row.type === "onboarding")
            .map((row: any) => ({
              id: row.id,
              title: row.title || "",
              description: row.description || "",
              category: row.category || "ID Proof",
              required: row.required ?? true,
              type: "onboarding" as const,
              companyId: row.company_id || row.companyId || null
            }));

          db.exitChecklistTemplates = checklistTemplatesRes.data
            .filter((row: any) => row.type === "exit")
            .map((row: any) => ({
              id: row.id,
              title: row.title || "",
              description: row.description || "",
              category: row.category || "Contract",
              required: row.required ?? true,
              type: "exit" as const,
              companyId: row.company_id || row.companyId || null
            }));
        }
      }

      if (designationsRes && designationsRes.data && designationsRes.data.length > 0) {
        const sbDesignations = designationsRes.data.map((row: any) => ({
          id: row.id,
          title: capitalizeName(row.title),
          department: capitalizeName(row.department),
          companyId: row.company_id || row.companyId || null,
          branch: row.branch || undefined
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
          branch: row.branch || undefined,
          description: row.description || ""
        }));
        const catMap = new Map();
        (db.expenseCategories || []).forEach((c: any) => { if (c.id) catMap.set(c.id, c); });
        sbCategories.forEach((c: any) => { catMap.set(c.id, c); });
        db.expenseCategories = Array.from(catMap.values());
      }

      if (corporateAllowancesFaqRes && !corporateAllowancesFaqRes.error && Array.isArray(corporateAllowancesFaqRes.data)) {
        db.corporateAllowancesFaqs = corporateAllowancesFaqRes.data.map((row: any) => ({
          id: row.id,
          title: row.title || "",
          description: row.description || "",
          companyId: row.company_id || row.companyId || null,
          branch: row.branch || undefined,
          createdAt: row.created_at || row.createdAt || new Date().toISOString()
        }));
      }

      if (payslipsRes && payslipsRes.data && payslipsRes.data.length > 0) {
        const sbPayslips = payslipsRes.data.map((row: any) => {
          let parsedDocs: any[] = [];
          if (row.documents) {
            if (Array.isArray(row.documents)) {
              parsedDocs = row.documents;
            } else if (typeof row.documents === "string") {
              try { parsedDocs = JSON.parse(row.documents); } catch (e) { parsedDocs = []; }
            }
          }
          if (parsedDocs.length === 0 && row.document_name && (row.document_name.startsWith("DOCS_JSON:") || row.document_name.startsWith("["))) {
            try {
              const rawJson = row.document_name.startsWith("DOCS_JSON:") ? row.document_name.slice(10) : row.document_name;
              parsedDocs = JSON.parse(rawJson);
            } catch (e) {
              parsedDocs = [];
            }
          }
          if (parsedDocs.length === 0 && (row.document_url || row.documentUrl)) {
            parsedDocs = [{
              id: "doc-1",
              name: row.document_name || row.documentName || "Payroll Document",
              url: row.document_url || row.documentUrl,
              uploadedAt: row.document_uploaded_at || row.documentUploadedAt || new Date().toISOString(),
              uploadedBy: row.document_uploaded_by || row.documentUploadedBy || "Admin"
            }];
          }

          const cleanDocName = (row.document_name && row.document_name.startsWith("DOCS_JSON:"))
            ? (parsedDocs[0]?.name || "Payroll Document")
            : (row.document_name || row.documentName || (parsedDocs[0]?.name || undefined));

          return {
            id: row.id,
            employeeId: row.employee_id || row.employeeId || "",
            month: row.month || "",
            basic: Number(row.basic) || 0,
            hra: Number(row.hra) || 0,
            telephone: Number(row.telephone ?? 0),
            fuel: Number(row.fuel ?? 0),
            professionalDev: Number(row.professional_dev ?? row.professionalDev ?? 0),
            lta: Number(row.lta ?? 0),
            allowances: Number(row.allowances) || 0,
            finesDeducted: Number(row.fines_deducted ?? row.finesDeducted ?? 0),
            pfDeduction: Number(row.pf_deduction ?? row.pfDeduction ?? 0),
            taxDeduction: Number(row.tax_deduction ?? row.taxDeduction ?? 0),
            esiDeduction: Number(row.esi_deduction ?? row.esiDeduction ?? 0),
            netPay: Number(row.net_pay ?? row.netPay ?? 0),
            status: row.status || "Generated",
            generatedAt: row.generated_at || row.generatedAt || new Date().toISOString(),
            sentToEmail: row.sent_to_email || row.sentToEmail || "",
            documentUrl: (parsedDocs[0]?.url) || row.document_url || row.documentUrl || undefined,
            documentName: cleanDocName,
            documentUploadedAt: row.document_uploaded_at || row.documentUploadedAt || undefined,
            documentUploadedBy: row.document_uploaded_by || row.documentUploadedBy || undefined,
            documents: parsedDocs
          };
        });
        const slipMap = new Map();
        (db.payslips || []).forEach((p: any) => { if (p && p.id) slipMap.set(p.id, p); });
        sbPayslips.forEach((p: any) => {
          if (p && p.id) {
            const existing = slipMap.get(p.id) || {};
            slipMap.set(p.id, {
              ...existing,
              ...p,
              documentUrl: p.documentUrl || existing.documentUrl,
              documentName: p.documentName || existing.documentName,
              documentUploadedAt: p.documentUploadedAt || existing.documentUploadedAt,
              documentUploadedBy: p.documentUploadedBy || existing.documentUploadedBy,
              documents: (p.documents && p.documents.length > 0) ? p.documents : (existing.documents || []),
            });
          }
        });
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
        db.policies = policiesRes.data.map((row: any) => {
          const extracted = extractBranchPrefix(row.content);
          return {
            id: row.id,
            title: row.title || "",
            category: row.category || "Conduct & Ethics",
            content: extracted.cleanText || row.content || "",
            branch: row.branch ? toBranchName(row.branch) : extracted.branch,
            lastUpdated: row.last_updated || row.lastUpdated || new Date().toISOString().split("T")[0],
            companyId: row.company_id || row.companyId || undefined
          };
        });
      }

      if (inventoryRequestsRes.data && inventoryRequestsRes.data.length > 0) {
        const sbRequests = inventoryRequestsRes.data.map((row: any) => {
          const extracted = extractBranchPrefix(row.item_name || row.itemName);
          const emp = (db.employees || []).find((e: any) => e.id === (row.employee_id || row.employeeId));
          const resolvedBranch = row.branch 
            ? toBranchName(row.branch) 
            : (extracted.branch || (emp?.branch ? toBranchName(emp.branch) : undefined));

          return {
            id: row.id,
            employeeId: row.employee_id || row.employeeId || "",
            employeeName: capitalizeName(row.employee_name || row.employeeName || ""),
            itemName: extracted.cleanText || row.item_name || row.itemName || "",
            category: row.category || "Laptop",
            requestDate: row.request_date || row.requestDate || "",
            reason: row.reason || "",
            branch: resolvedBranch ? toBranchName(resolvedBranch) : undefined,
            status: row.status || "Pending",
            companyId: row.company_id || row.companyId || undefined
          };
        });
        const reqMap = new Map();
        (db.inventoryRequests || []).forEach((r: any) => { if (r.id) reqMap.set(r.id, r); });
        sbRequests.forEach((r: any) => { reqMap.set(r.id, r); });
        db.inventoryRequests = Array.from(reqMap.values());
      }

      if (inventoryRes.data) {
        db.inventory = inventoryRes.data.map((row: any) => {
          const extracted = extractBranchPrefix(row.name);
          const assignedEmp = (db.employees || []).find((e: any) => e.id === (row.assigned_to_employee_id || row.assignedToEmployeeId));
          let serialBranch: string | undefined;
          if (row.serial_number) {
            const sn = row.serial_number.toUpperCase();
            if (sn.startsWith("SHASHTRI") || sn.startsWith("SHAS-") || sn.startsWith("SN-")) serialBranch = "Shashtri Nagar";
            else if (sn.startsWith("NOIDA") || sn.startsWith("NOI-")) serialBranch = "Noida";
            else if (sn.startsWith("LUDHIANA") || sn.startsWith("LUD-")) serialBranch = "Ludhiana";
          }
          const resolvedBranch = row.branch 
            ? toBranchName(row.branch) 
            : (extracted.branch || serialBranch || (assignedEmp?.branch ? toBranchName(assignedEmp.branch) : undefined));

          return {
            id: row.id,
            name: extracted.cleanText || row.name || "",
            serialNumber: row.serial_number || row.serialNumber || "",
            category: row.category || "Laptop",
            status: row.status || "Available",
            assignedToEmployeeId: row.assigned_to_employee_id || row.assignedToEmployeeId || null,
            assignedDate: row.assigned_date || row.assignedDate || null,
            branch: resolvedBranch ? toBranchName(resolvedBranch) : undefined,
            companyId: row.company_id || row.companyId || undefined
          };
        });
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

      if (holidaysRes && !holidaysRes.error && Array.isArray(holidaysRes.data)) {
        db.holidays = holidaysRes.data.map((row: any) => ({
          id: row.id,
          name: capitalizeName(row.name),
          date: row.date,
          type: row.type || "National"
        })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }

      let leavesData = (leavesRes && !leavesRes.error && Array.isArray(leavesRes.data) && leavesRes.data.length > 0)
        ? leavesRes.data
        : null;

      if (!leavesData) {
        const fallbackLeavesRes = await safeQuery(dbClient.from("leaves").select("*"));
        if (fallbackLeavesRes && !fallbackLeavesRes.error && Array.isArray(fallbackLeavesRes.data)) {
          leavesData = fallbackLeavesRes.data;
        }
      }

      if (leavesData && Array.isArray(leavesData) && leavesData.length > 0) {
        const sbLeaves = leavesData.map((row: any) => ({
          id: row.id,
          employeeId: row.employee_id || row.employeeId || "",
          employeeName: capitalizeName(row.employee_name || row.employeeName || ""),
          leaveType: row.leave_type || row.leaveType || "Casual Leave",
          startDate: row.start_date || row.startDate || "",
          endDate: row.end_date || row.endDate || "",
          reason: row.reason || "",
          status: row.status || "Pending",
          appliedDate: row.applied_date || row.appliedDate || "",
          companyId: row.company_id || row.companyId || undefined
        }));
        const leaveMap = new Map();
        (db.leaves || []).forEach((l: any) => { if (l && l.id) leaveMap.set(l.id, l); });
        sbLeaves.forEach((l: any) => { if (l && l.id) leaveMap.set(l.id, l); });
        db.leaves = Array.from(leaveMap.values());
      }

function getMoreUpToDateBreaks(breaksA: any[] = [], breaksB: any[] = []): any[] {
  const listA = breaksA || [];
  const listB = breaksB || [];

  const endedA = listA.filter(b => b && (b.end || b.break_end)).length;
  const endedB = listB.filter(b => b && (b.break_end || b.end)).length;

  if (endedA > endedB) return listA;
  if (endedB > endedA) return listB;

  if (listA.length > listB.length) return listA;
  if (listB.length > listA.length) return listB;

  if (listA.length > 0 && listB.length > 0) {
    const lastA = listA[listA.length - 1];
    const lastB = listB[listB.length - 1];
    const endA = lastA?.end || lastA?.break_end;
    const endB = lastB?.end || lastB?.break_end;
    if (endA && !endB) return listA;
    if (endB && !endA) return listB;
  }

  return listA;
}

      if (attendanceRes && !attendanceRes.error && Array.isArray(attendanceRes.data)) {
        const sbAttendance = attendanceRes.data.map((row: any) => {
          const sbBreaks = (breaksRes && breaksRes.data)
            ? breaksRes.data
                .filter((b: any) => b.attendance_id === row.id)
                .map((b: any) => ({
                  start: b.break_start,
                  end: b.break_end
                }))
            : [];

          const localMatch = (db.attendance || []).find((a: any) => a.id === row.id);
          const relatedBreaks = getMoreUpToDateBreaks(sbBreaks, localMatch?.breaks || []);

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
        db.attendance = sbAttendance;
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
                size: d.size || "1.2 MB",
                fileUrl: d.file_url || d.fileUrl || d.url || ""
              }));
            const docMap = new Map();
            docList.forEach(d => docMap.set(d.id, d));
            relDocs.forEach(d => docMap.set(d.id, d));
            docList = Array.from(docMap.values());
          }
          docList = docList.map((d: any) => ({
            id: d.id || `doc-${Math.random()}`,
            name: d.name || "Document",
            category: d.category || "ID Proof",
            uploadedAt: d.uploadedAt || d.uploaded_at || new Date().toISOString().split('T')[0],
            size: d.size || "1.2 MB",
            fileUrl: d.fileUrl || d.file_url || d.url || ""
          }));

          const customFieldsFromRow = typeof row.custom_fields === "string" ? JSON.parse(row.custom_fields) : row.custom_fields;
          const panVal = String(row.pan || customFieldsFromRow?.pan || fallbackEmp?.customFields?.pan || (fallbackEmp as any)?.pan || "");
          const uanVal = String(row.uan || customFieldsFromRow?.uan || fallbackEmp?.customFields?.uan || (fallbackEmp as any)?.uan || "");

          return {
            id: row.id,
            companyId: row.company_id || row.companyId || fallbackEmp?.companyId || "",
            prefix: row.prefix || fallbackEmp?.prefix || "Mr",
            fullName: capitalizeName(row.full_name || row.fullName || fallbackEmp?.fullName || ""),
            gender: row.gender || fallbackEmp?.gender || "Male",
            email: row.email || fallbackEmp?.email || "",
            phone: row.phone || fallbackEmp?.phone || "",
            role: row.role || fallbackEmp?.role || "employee",
            designationId: row.designation_id || row.designationId || fallbackEmp?.designationId || "des-4",
            department: row.department || fallbackEmp?.department || "Information Technology",
            branch: toBranchName(row.branch || row.branch_name || fallbackEmp?.branch || "Shashtri Nagar"),
            employmentType: row.employment_type || row.employmentType || fallbackEmp?.employmentType || "",
            joiningDate: row.joining_date || row.joiningDate || fallbackEmp?.joiningDate || "2024-03-15",
            status: row.status || fallbackEmp?.status || "Active",
            salary: {
              basic: Number(row.salary_basic ?? salaryFromRow?.basic ?? fallbackEmp?.salary?.basic ?? 45000),
              hra: Number(row.salary_hra ?? salaryFromRow?.hra ?? fallbackEmp?.salary?.hra ?? 18000),
              telephone: Number(row.salary_telephone ?? salaryFromRow?.telephone ?? fallbackEmp?.salary?.telephone ?? 0),
              fuel: Number(row.salary_fuel ?? salaryFromRow?.fuel ?? fallbackEmp?.salary?.fuel ?? 0),
              professionalDev: Number(row.salary_professional_dev ?? salaryFromRow?.professionalDev ?? fallbackEmp?.salary?.professionalDev ?? 0),
              lta: Number(row.salary_lta ?? salaryFromRow?.lta ?? fallbackEmp?.salary?.lta ?? 0),
              allowances: Number(row.salary_allowances ?? salaryFromRow?.allowances ?? fallbackEmp?.salary?.allowances ?? 10000),
              pfDeduction: Number(row.salary_pf_deduction ?? salaryFromRow?.pfDeduction ?? fallbackEmp?.salary?.pfDeduction ?? 3200),
              pfMode: row.salary_pf_mode || salaryFromRow?.pfMode || fallbackEmp?.salary?.pfMode || "percentage",
              tdsDeduction: Number(row.salary_tds_deduction ?? salaryFromRow?.tds_deduction ?? fallbackEmp?.salary?.tdsDeduction ?? 0),
              tdsMode: row.salary_tds_mode || salaryFromRow?.tdsMode || fallbackEmp?.salary?.tdsMode || "slab",
              tdsOptIn: (row.salary_tds_opt_in !== null && row.salary_tds_opt_in !== undefined) ? Boolean(row.salary_tds_opt_in) : (salaryFromRow?.tdsOptIn !== undefined ? Boolean(salaryFromRow.tdsOptIn) : fallbackEmp?.salary?.tdsOptIn),
              esiOptIn: (row.salary_esi_opt_in !== null && row.salary_esi_opt_in !== undefined) ? Boolean(row.salary_esi_opt_in) : (salaryFromRow?.esiOptIn !== undefined ? Boolean(salaryFromRow.esiOptIn) : fallbackEmp?.salary?.esiOptIn),
              esiDeduction: Number(row.salary_esi_deduction ?? salaryFromRow?.esiDeduction ?? fallbackEmp?.salary?.esiDeduction ?? 0)
            },
            bankDetails: {
              accountNumber: String(row.bank_account_number ?? bankDetailsFromRow?.accountNumber ?? fallbackEmp?.bankDetails?.accountNumber ?? ""),
              bankName: String(row.bank_name ?? bankDetailsFromRow?.bankName ?? fallbackEmp?.bankDetails?.bankName ?? ""),
              ifsc: String(row.bank_ifsc ?? bankDetailsFromRow?.ifsc ?? fallbackEmp?.bankDetails?.ifsc ?? "")
            },
            address: (() => {
              const a = String(row.address || fallbackEmp?.address || "").trim();
              return a ? (a.charAt(0).toUpperCase() + a.slice(1)) : "";
            })(),
            emergencyContact: {
              name: row.emergency_contact_name || emergencyFromRow?.name || fallbackEmp?.emergencyContact?.name || "",
              relation: row.emergency_contact_relation || emergencyFromRow?.relation || fallbackEmp?.emergencyContact?.relation || "",
              phone: row.emergency_contact_phone || emergencyFromRow?.phone || fallbackEmp?.emergencyContact?.phone || ""
            },
            customFields: {
              pan: panVal,
              uan: uanVal
            },
            pan: panVal,
            uan: uanVal,
            documents: docList,
            onboardingChecklist: (() => {
              let list: any[] = [];
              const raw = row.onboarding_checklist ?? row.onboardingChecklist;
              if (Array.isArray(raw) && raw.length > 0) list = raw;
              else if (typeof raw === "string" && raw.trim()) {
                try {
                  const parsed = JSON.parse(raw);
                  if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
                } catch (e) {}
              }
              if (list.length === 0) list = fallbackEmp?.onboardingChecklist || [];
              return list.map((i: any) => ({
                ...i,
                fileUrl: i.fileUrl || i.file_url || i.url || ""
              }));
            })(),
            exitChecklist: (() => {
              let list: any[] = [];
              const raw = row.exit_checklist ?? row.exitChecklist;
              if (Array.isArray(raw) && raw.length > 0) list = raw;
              else if (typeof raw === "string" && raw.trim()) {
                try {
                  const parsed = JSON.parse(raw);
                  if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
                } catch (e) {}
              }
              if (list.length === 0) list = fallbackEmp?.exitChecklist || [];
              return list.map((i: any) => ({
                ...i,
                fileUrl: i.fileUrl || i.file_url || i.url || ""
              }));
            })(),
            exitClearedAt: row.exit_cleared_at || row.exitClearedAt || fallbackEmp?.exitClearedAt || undefined,
            exitClearedBy: row.exit_cleared_by || row.exitClearedBy || fallbackEmp?.exitClearedBy || undefined,
            avatarUrl: row.avatar_url || row.avatarUrl || fallbackEmp?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop",
            bio: (() => {
              const b = String(row.bio || fallbackEmp?.bio || "").trim();
              return b ? (b.charAt(0).toUpperCase() + b.slice(1)) : "";
            })(),
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
        db.meetings = meetingsRes.data.map((row: any) => {
          const extracted = extractBranchPrefix(row.description);
          const organizerEmp = (db.employees || []).find((e: any) => e.id === (row.organizer_id || row.organizerId));
          const resolvedBranch = row.branch 
            ? toBranchName(row.branch) 
            : (extracted.branch || (organizerEmp?.branch ? toBranchName(organizerEmp.branch) : undefined));

          return {
            id: row.id,
            companyId: row.company_id || row.companyId || null,
            title: row.title || "",
            description: extracted.cleanText || row.description || "",
            reason: row.reason || "",
            type: row.type || "Online",
            organizerId: row.organizer_id || row.organizerId || "",
            participantIds: Array.isArray(row.participant_ids) 
              ? row.participant_ids 
              : typeof row.participant_ids === 'string' 
                ? JSON.parse(row.participant_ids) 
                : [],
            department: row.department || undefined,
            branch: resolvedBranch ? toBranchName(resolvedBranch) : undefined,
            priority: row.priority || undefined,
            date: row.date || "",
            startTime: row.start_time || row.startTime || "",
            endTime: row.end_time || row.endTime || "",
            duration: row.duration || undefined,
            timezone: row.timezone || undefined,
            location: row.location || undefined,
            link: row.link || undefined,
            createdAt: row.created_at || row.createdAt || new Date().toISOString()
          };
        });
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
        db.seatLayouts = seatLayoutsRes.data.map((row: any) => {
          const extracted = extractBranchPrefix(row.name);
          return {
            id: row.id,
            companyId: row.company_id || row.companyId || null,
            name: extracted.cleanText || row.name || "",
            branch: row.branch ? toBranchName(row.branch) : extracted.branch,
            sections: typeof row.sections === "string" ? JSON.parse(row.sections) : (row.sections || []),
            seats: typeof row.seats === "string" ? JSON.parse(row.seats) : (row.seats || []),
            updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
            updatedBy: row.updated_by || row.updatedBy || null
          };
        });
      }

      if (roomsRes && roomsRes.data) {
        db.rooms = roomsRes.data.map((row: any) => ({
          id: row.id,
          companyId: row.company_id || row.companyId || null,
          name: row.name || "",
          capacity: Number(row.capacity) || 6,
          amenities: typeof row.amenities === "string" ? JSON.parse(row.amenities) : (row.amenities || []),
          floor: row.floor || undefined,
          branch: row.branch ? toBranchName(row.branch) : undefined,
          isActive: row.is_active ?? row.isActive ?? true,
          createdAt: row.created_at || row.createdAt || new Date().toISOString()
        }));
      }

      if (roomBookingsRes && roomBookingsRes.data) {
        db.roomBookings = roomBookingsRes.data.map((row: any) => {
          const room = (roomsRes.data || []).find((r: any) => r.id === (row.room_id || row.roomId));
          const resolvedBranch = row.branch ? toBranchName(row.branch) : (room?.branch ? toBranchName(room.branch) : undefined);
          return {
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
            branch: resolvedBranch,
            createdAt: row.created_at || row.createdAt || new Date().toISOString()
          };
        });
      }

      if (deptsRes.data) {
        // Separate global (no branch) and per-branch departments
        const globalDepts: string[] = [];
        const branchDepts: Record<string, string[]> = {};
        for (const d of deptsRes.data) {
          const deptName = capitalizeName(d.name);
          if (!deptName) continue;
          if (d.branch) {
            const bName = toBranchName(d.branch);
            const bId = toBranchId(d.branch);
            if (!branchDepts[bName]) branchDepts[bName] = [];
            if (!branchDepts[bId]) branchDepts[bId] = [];
            if (!branchDepts[bName].includes(deptName)) branchDepts[bName].push(deptName);
            if (!branchDepts[bId].includes(deptName)) branchDepts[bId].push(deptName);
          } else {
            globalDepts.push(deptName);
          }
        }
        db.customDepartments = globalDepts;
        if (Object.keys(branchDepts).length > 0) {
          db.branchDepartments = { ...(db.branchDepartments || {}), ...branchDepts };
        }
      }

      if (branchesRes.data) {
        db.customBranches = branchesRes.data.map((b: any) => capitalizeName(b.name)).filter(Boolean);
      }

      const rawLeaveTypes = leaveTypesRes.data || customLeavesRes.data || [];
      db.branchLeaveTypes = {};

      const safeCapitalizeLeave = (str: string) => {
        if (!str) return "";
        if (str.includes("|")) {
          const [name, quota] = str.split("|");
          return `${capitalizeName(name)}|${quota}`;
        }
        return capitalizeName(str);
      };
      
      const globalLeaveMap = new Map<string, string>();

      rawLeaveTypes.forEach((row: any) => {
        let rawName = String(row.name || "");
        let branchRaw = row.branch || "";
        const tagMatch = rawName.match(/^\[([^\]]+)\]\s*(.+)$/);
        if (tagMatch) {
          branchRaw = branchRaw || tagMatch[1];
          rawName = tagMatch[2];
        }

        const item = safeCapitalizeLeave(rawName);
        if (!item) return;

        if (branchRaw) {
          const bName = toBranchName(branchRaw);
          const bId = toBranchId(branchRaw);
          
          const addToBranchList = (bKey: string) => {
            if (!db.branchLeaveTypes![bKey]) db.branchLeaveTypes![bKey] = [];
            const name = (item.includes("|") ? item.split("|")[0] : item).trim().toLowerCase();
            const existingIdx = db.branchLeaveTypes![bKey].findIndex((x: string) => (x.includes("|") ? x.split("|")[0] : x).trim().toLowerCase() === name);
            if (existingIdx >= 0) {
              if (item.includes("|")) db.branchLeaveTypes![bKey][existingIdx] = item;
            } else {
              db.branchLeaveTypes![bKey].push(item);
            }
          };

          addToBranchList(branchRaw);
          if (bName) addToBranchList(bName);
          if (bId) addToBranchList(bId);
        } else {
          const name = (item.includes("|") ? item.split("|")[0] : item).trim().toLowerCase();
          if (!globalLeaveMap.has(name) || item.includes("|")) {
            globalLeaveMap.set(name, item);
          }
        }
      });
      if (globalLeaveMap.size > 0) {
        db.customLeaveTypes = Array.from(globalLeaveMap.values());
      }

      db.branchAmenities = {};
      const globalAmenitiesMap = new Map<string, string>();

      if (customAmenitiesRes && customAmenitiesRes.data && customAmenitiesRes.data.length > 0) {
        customAmenitiesRes.data.forEach((row: any) => {
          let rawName = String(row.name || "");
          let branchRaw = row.branch || "";
          const tagMatch = rawName.match(/^\[([^\]]+)\]\s*(.+)$/);
          if (tagMatch) {
            branchRaw = branchRaw || tagMatch[1];
            rawName = tagMatch[2];
          }

          const displayName = capitalizeName(rawName);
          if (!displayName) return;
          const item = row.icon ? `${displayName}|${row.icon}` : displayName;

          if (branchRaw) {
            const bName = toBranchName(branchRaw);
            const bId = toBranchId(branchRaw);

            const addToBranchList = (bKey: string) => {
              if (!db.branchAmenities![bKey]) db.branchAmenities![bKey] = [];
              const name = (item.includes("|") ? item.split("|")[0] : item).trim().toLowerCase();
              const existingIdx = db.branchAmenities![bKey].findIndex((x: string) => (x.includes("|") ? x.split("|")[0] : x).trim().toLowerCase() === name);
              if (existingIdx >= 0) {
                if (item.includes("|")) db.branchAmenities![bKey][existingIdx] = item;
              } else {
                db.branchAmenities![bKey].push(item);
              }
            };

            addToBranchList(branchRaw);
            if (bName) addToBranchList(bName);
            if (bId) addToBranchList(bId);
          } else {
            const name = (item.includes("|") ? item.split("|")[0] : item).trim().toLowerCase();
            if (!globalAmenitiesMap.has(name) || item.includes("|")) {
              globalAmenitiesMap.set(name, item);
            }
          }
        });
      }

      if (globalAmenitiesMap.size > 0) {
        db.customAmenities = Array.from(globalAmenitiesMap.values());
      }

      if (infractionTypesRes && infractionTypesRes.data && infractionTypesRes.data.length > 0) {
        const sbInfractionTypes = infractionTypesRes.data.map((row: any) => ({
          id: row.id,
          name: row.name || "",
          description: row.description || "",
          defaultAmount: Number(row.default_amount ?? row.defaultAmount ?? 0),
          companyId: row.company_id || row.companyId || null,
          branch: row.branch ? toBranchName(row.branch) : undefined
        }));
        const typeMap = new Map();
        (db.infractionTypes || []).forEach((t: any) => { if (t.id) typeMap.set(t.id, t); });
        sbInfractionTypes.forEach((t: any) => { typeMap.set(t.id, t); });
        db.infractionTypes = Array.from(typeMap.values());
      }

      if (expenseCategoriesRes && expenseCategoriesRes.data && Array.isArray(expenseCategoriesRes.data)) {
        const sbCategories = expenseCategoriesRes.data.map((row: any) => {
          let name = row.name || "";
          let branch = row.branch ? toBranchName(row.branch) : undefined;
          const tagMatch = name.match(/^\[([^\]]+)\]\s*(.+)$/);
          if (tagMatch) {
            branch = branch || toBranchName(tagMatch[1]);
            name = tagMatch[2];
          }
          return {
            id: row.id,
            name: capitalizeName(name),
            description: row.description || "",
            companyId: row.company_id || row.companyId || null,
            branch
          };
        });
        const catMap = new Map();
        (db.expenseCategories || []).forEach((c: any) => { if (c && c.id) catMap.set(c.id, c); });
        sbCategories.forEach((c: any) => { catMap.set(c.id, c); });
        db.expenseCategories = Array.from(catMap.values());
      }

      if (corporateAllowancesFaqRes && corporateAllowancesFaqRes.data && Array.isArray(corporateAllowancesFaqRes.data)) {
        const sbFaqs = corporateAllowancesFaqRes.data.map((row: any) => {
          let title = row.title || "";
          let branch = row.branch ? toBranchName(row.branch) : undefined;
          const tagMatch = title.match(/^\[([^\]]+)\]\s*(.+)$/);
          if (tagMatch) {
            branch = branch || toBranchName(tagMatch[1]);
            title = tagMatch[2];
          }
          return {
            id: row.id,
            title,
            description: row.description || "",
            companyId: row.company_id || row.companyId || null,
            branch
          };
        });
        const faqMap = new Map();
        (db.corporateAllowancesFaqs || []).forEach((f: any) => { if (f && f.id) faqMap.set(f.id, f); });
        sbFaqs.forEach((f: any) => { faqMap.set(f.id, f); });
        db.corporateAllowancesFaqs = Array.from(faqMap.values());
      }

      if (grievancesRes && grievancesRes.data && grievancesRes.data.length > 0) {
        const sbGrievances = grievancesRes.data.map((row: any) => {
          const extracted = extractBranchPrefix(row.description);
          const emp = (db.employees || []).find((e: any) => e.id === (row.employee_id || row.employeeId));
          const resolvedBranch = row.branch 
            ? toBranchName(row.branch) 
            : (extracted.branch || (emp?.branch ? toBranchName(emp.branch) : undefined));

          return {
            id: row.id,
            companyId: row.company_id || "",
            employeeId: row.employee_id || "",
            employeeName: capitalizeName(row.employee_name || row.employeeName || ""),
            title: row.title || "",
            description: extracted.cleanText || row.description || "",
            category: row.category || "Other",
            branch: resolvedBranch ? toBranchName(resolvedBranch) : undefined,
            priority: row.priority || "Medium",
            status: row.status || "Open",
            isAnonymous: row.is_anonymous ?? false,
            createdAt: row.created_at || new Date().toISOString(),
            resolvedBy: row.resolved_by || undefined,
            resolvedByName: row.resolved_by_name ? capitalizeName(row.resolved_by_name) : undefined,
            resolutionMessage: row.resolution_message || undefined,
            resolvedAt: row.resolved_at || undefined,
            messages: typeof row.messages === "string" ? JSON.parse(row.messages) : (row.messages || [])
          };
        });
        const grvMap = new Map();
        (db.grievanceTickets || []).forEach((t: any) => { if (t.id) grvMap.set(t.id, t); });
        sbGrievances.forEach((t: any) => { grvMap.set(t.id, t); });
        db.grievanceTickets = Array.from(grvMap.values());
      }

      if (performanceRes && performanceRes.data && performanceRes.data.length > 0) {
        const sbPerf = performanceRes.data.map((row: any) => ({
          id: row.id,
          companyId: row.company_id || "",
          employeeId: row.employee_id || "",
          employeeName: capitalizeName(row.employee_name || row.employeeName || ""),
          reviewerId: row.reviewer_id || "",
          reviewerName: capitalizeName(row.reviewer_name || row.reviewerName || ""),
          type: row.type || "Appraisal",
          period: row.period || "",
          summary: row.summary || "",
          overallRating: row.overall_rating ?? undefined,
          incidentDate: row.incident_date || undefined,
          actionTaken: row.action_taken || undefined,
          sourceId: row.source_id || undefined,
          createdAt: row.created_at || new Date().toISOString(),
        }));
        const perfMap = new Map();
        (db.performanceRecords || []).forEach((r: any) => { if (r.id) perfMap.set(r.id, r); });
        sbPerf.forEach((r: any) => { perfMap.set(r.id, r); });
        db.performanceRecords = Array.from(perfMap.values());
      }

      try {
        if (timingSettingsRes && timingSettingsRes.data && Array.isArray(timingSettingsRes.data)) {
          if (!db.branchTimingSettings) db.branchTimingSettings = {};
          if (!db.companyTimingSettings) db.companyTimingSettings = {};

          timingSettingsRes.data.forEach((row: any) => {
            const tSettings = {
              clockInTime: row.clock_in_time || "09:00",
              clockOutTime: row.clock_out_time || "18:00",
              lateThreshold: row.late_threshold || "09:30",
              breakStartTime: row.break_start_time || "13:00",
              breakEndTime: row.break_end_time || "14:00"
            };
            const branchRaw = row.branch || (typeof row.id === "string" && row.id.startsWith("branch-") ? row.id.replace("branch-", "") : "");
            if (branchRaw) {
              const bName = toBranchName(branchRaw);
              const bId = toBranchId(branchRaw);
              db.branchTimingSettings[branchRaw] = tSettings;
              if (bName) db.branchTimingSettings[bName] = tSettings;
              if (bId) db.branchTimingSettings[bId] = tSettings;
            } else if (row.company_id) {
              db.companyTimingSettings[row.company_id] = tSettings;
            }
            if (row.id === "default" || (!branchRaw && (!companyId || row.company_id === companyId))) {
              db.timingSettings = tSettings;
            }
          });
        }
      } catch (err) {
        console.warn("Supabase timing_settings hydration error:", err);
      }

      // Load checklist_templates from Supabase
      try {
        let q = dbClient.from("checklist_templates").select("*");
        if (companyId) q = q.eq("company_id", companyId);
        const { data: tmplRows, error: tmplErr } = await q;
        if (tmplRows && Array.isArray(tmplRows) && !tmplErr && tmplRows.length > 0) {
          const parseTmpl = (r: any) => {
            let title = r.title || "";
            let branch = r.branch || null;
            const tagMatch = title.match(/^\[([^\]]+)\]\s*(.+)$/);
            if (tagMatch) {
              branch = branch || tagMatch[1];
              title = tagMatch[2];
            }
            return {
              id: r.id,
              title,
              description: r.description || "",
              category: r.category || (r.type === "onboarding" ? "Identity Proof" : "Contract"),
              required: r.required ?? true,
              type: r.type as "onboarding" | "exit",
              companyId: r.company_id || r.companyId || null,
              branch: branch ? toBranchName(branch) : undefined
            };
          };
          db.onboardingChecklistTemplates = tmplRows.filter((r: any) => r.type === "onboarding").map(parseTmpl);
          db.exitChecklistTemplates = tmplRows.filter((r: any) => r.type === "exit").map(parseTmpl);
        }
      } catch (err) {
        console.warn("Supabase checklist_templates hydration warning:", err);
      }

      // Load wifi_restriction_settings from Supabase
      try {
        let wifiData = null;
        if (companyId) {
          const { data } = await dbClient.from("wifi_restriction_settings").select("*").eq("company_id", companyId).maybeSingle();
          if (data) wifiData = data;
        }
        if (!wifiData) {
          const { data } = await dbClient.from("wifi_restriction_settings").select("*").eq("id", "default").maybeSingle();
          if (data) wifiData = data;
        }
        if (wifiData) {
          const rawIpStr = wifiData.allowed_ip || "";
          const parsedIps = rawIpStr.split(",").map((i: string) => i.trim()).filter(Boolean);
          db.wifiRestrictionSettings = {
            enabled: wifiData.enabled ?? false,
            allowedIp: rawIpStr,
            allowedIps: parsedIps,
            companyId: wifiData.company_id || undefined
          };
          // Dynamically load show_leave_count from Supabase column
          if (wifiData.show_leave_count !== null && wifiData.show_leave_count !== undefined) {
            db.showLeaveCount = wifiData.show_leave_count;
          }
        }
      } catch (err) {
        console.warn("Supabase wifi_restriction_settings hydration error:", err);
      }

      // Load company tax settings & branch prefixes from companies table
      try {
        let compQ = dbClient.from("companies").select("*");
        if (companyId) {
          compQ = compQ.eq("id", companyId);
        }
        const { data: companyData } = await compQ.maybeSingle();
        if (companyData) {
          if (companyData.branch_code_prefixes && typeof companyData.branch_code_prefixes === "object") {
            if (!db.branchCodePrefixes) db.branchCodePrefixes = {};
            Object.assign(db.branchCodePrefixes, companyData.branch_code_prefixes);
          }
          if (companyId) {
            if (!db.companySettings) db.companySettings = {};
            db.companySettings[companyId] = {
              companyId,
              name: companyData.name || "",
              logoUrl: companyData.logo_url || "",
              pan: companyData.pan || "",
              tan: companyData.tan || "",
              gstin: companyData.gstin || "",
              address: companyData.address || "",
              signatoryName: companyData.signatory_name || "",
              signatoryDesignation: companyData.signatory_designation || "",
            };
          }
        }
      } catch (err) {
        console.warn("Supabase companies hydration error:", err);
      }

      // Load per-branch wifi settings from wifi_restriction_settings with branch column
      try {
        if (companyId) {
          const { data: branchWifiRows } = await dbClient
            .from("wifi_restriction_settings")
            .select("*")
            .eq("company_id", companyId)
            .not("branch", "is", null);
          if (branchWifiRows && branchWifiRows.length > 0) {
            if (!db.branchWifiSettings) db.branchWifiSettings = {};
            for (const row of branchWifiRows) {
              const branchKey = toBranchName(row.branch);
              const parsedIps = (row.allowed_ip || "").split(",").map((i: string) => i.trim()).filter(Boolean);
              const setting = {
                enabled: row.enabled ?? false,
                allowedIp: row.allowed_ip || "",
                allowedIps: parsedIps,
                companyId: row.company_id || undefined
              };
              if (branchKey) {
                db.branchWifiSettings[branchKey] = setting;
                db.branchWifiSettings[toBranchId(branchKey)] = setting;
              }
            }
          }
        }
      } catch (err) {
        console.warn("Supabase per-branch wifi settings hydration error:", err);
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

  // Auto-issue or update missing/outdated Late Coming fines for any attendance punch recorded past lateThreshold
  if (db.attendance && db.attendance.length > 0) {
    if (!db.fines) db.fines = [];

    const lateTimeThreshold = db.timingSettings?.lateThreshold || "09:30";
    const [lateH, lateM] = lateTimeThreshold.split(":").map(Number);

    // Find late infraction setting configured in System Settings
    let lateInfr = (db.infractionTypes || []).find((t: any) => {
      const name = (t.name || "").toLowerCase();
      return name.includes("late") || name.includes("tardiness") || name.includes("comming") || name.includes("coming");
    });

    const configuredReason = lateInfr?.name || "Late Coming";
    const configuredAmtRaw = lateInfr ? (lateInfr.defaultAmount ?? (lateInfr as any).default_amount ?? (lateInfr as any).amount) : undefined;
    const parsedAmt = Number(configuredAmtRaw);
    const configuredAmount = (!isNaN(parsedAmt) && parsedAmt > 0) ? parsedAmt : 700;

    for (const punch of db.attendance) {
      if (!punch.clockIn || !punch.date) continue;

      let hours = 0;
      let minutes = 0;
      try {
        const clockInDate = new Date(punch.clockIn);
        const istStr = clockInDate.toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour12: false, hour: "2-digit", minute: "2-digit" });
        const [h, m] = istStr.split(":").map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          hours = h;
          minutes = m;
        }
      } catch (e) {}

      const isLate = punch.status === "Late" || hours > lateH || (hours === lateH && minutes > lateM);

      if (isLate && punch.status !== "Half Day" && punch.status !== "On Leave") {
        const emp = (db.employees || []).find((e: any) => (e.id || "").toLowerCase() === (punch.employeeId || "").toLowerCase());
        const empName = emp ? (emp.fullName || (emp as any).full_name || `Employee ${punch.employeeId}`) : `Employee ${punch.employeeId}`;

        const existingFine = db.fines.find((f: any) =>
          (f.employeeId || "").toLowerCase() === (punch.employeeId || "").toLowerCase() &&
          f.date === punch.date &&
          ((f.reason || "").toLowerCase().includes("late") || (f.reason || "").toLowerCase().includes("comming") || (f.reason || "").toLowerCase().includes("tardiness"))
        );

        if (!existingFine) {
          const autoFine = {
            id: `fin-auto-${punch.employeeId}-${punch.date.replace(/[^a-zA-Z0-9]/g, "")}`,
            employeeId: punch.employeeId,
            employeeName: empName,
            reason: configuredReason,
            amount: configuredAmount,
            date: punch.date,
            status: "Pending" as const
          };

          db.fines.unshift(autoFine);
          if (supabase) {
            syncFineToSupabase(autoFine).catch(e => console.warn("Auto-reconcile fine sync warning:", e));
          }
        } else {
          // Reconcile existing fine if employee name, amount, or reason were outdated
          let updated = false;
          if (empName && (existingFine.employeeName.startsWith("Employee EMP-") || existingFine.employeeName.startsWith("Employee Emp-") || !existingFine.employeeName)) {
            existingFine.employeeName = empName;
            updated = true;
          }
          if (configuredAmount > 0 && (existingFine.amount === 500 || existingFine.amount !== configuredAmount)) {
            existingFine.amount = configuredAmount;
            updated = true;
          }
          if (configuredReason && existingFine.reason !== configuredReason) {
            existingFine.reason = configuredReason;
            updated = true;
          }
          if (updated && supabase) {
            syncFineToSupabase(existingFine).catch(e => console.warn("Auto-reconcile fine update sync warning:", e));
          }
        }
      }
    }
  }

  saveDatabase(db);
  return NextResponse.json(db);
}

