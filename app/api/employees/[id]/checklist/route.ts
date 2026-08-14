import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { EmployeeChecklistItem, EmployeeDocument } from "@/src/types";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

async function getOrFetchEmployee(empId: string, db: any) {
  if (!db.employees) db.employees = [];
  
  const normSearch = empId.toLowerCase().replace(/[-_]/g, "");
  let emp = db.employees.find((e: any) => {
    if (!e || !e.id) return false;
    if (e.id === empId) return true;
    if (e.id.toLowerCase() === empId.toLowerCase()) return true;
    return e.id.toLowerCase().replace(/[-_]/g, "") === normSearch;
  });

  if (!emp) {
    const client = supabaseAdmin || supabase;
    if (client) {
      const alt1 = empId.replace(/_/g, "-");
      const alt2 = empId.replace(/-/g, "_");
      try {
        const { data: row } = await client
          .from("employees")
          .select("*")
          .or(`id.eq.${empId},id.eq.${alt1},id.eq.${alt2},id.ilike.${empId}`)
          .maybeSingle();

        if (row) {
          const bankDetailsFromRow = typeof row.bank_details === "string" ? JSON.parse(row.bank_details) : row.bank_details;
          const salaryFromRow = typeof row.salary === "string" ? JSON.parse(row.salary) : row.salary;
          const emergencyFromRow = typeof row.emergency_contact === "string" ? JSON.parse(row.emergency_contact) : row.emergency_contact;

          emp = {
            id: row.id,
            companyId: row.company_id || row.companyId || "",
            prefix: row.prefix || "Mr",
            fullName: row.full_name || row.fullName || "",
            gender: row.gender || "Male",
            email: row.email || "",
            phone: row.phone || "",
            role: row.role || "employee",
            designationId: row.designation_id || row.designationId || "des-4",
            department: row.department || "Information Technology",
            branch: row.branch || row.branch_name || "Mumbai Branch",
            employmentType: row.employment_type || row.employmentType || "",
            joiningDate: row.joining_date || row.joiningDate || "2024-03-15",
            status: row.status || "Active",
            salary: salaryFromRow || {},
            bankDetails: bankDetailsFromRow || {},
            address: row.address || "",
            emergencyContact: emergencyFromRow || {},
            customFields: typeof row.custom_fields === "string" ? JSON.parse(row.custom_fields) : (row.custom_fields || {}),
            documents: typeof row.documents === "string" ? JSON.parse(row.documents) : (row.documents || []),
            onboardingChecklist: typeof row.onboarding_checklist === "string" ? JSON.parse(row.onboarding_checklist) : (row.onboarding_checklist || []),
            exitChecklist: typeof row.exit_checklist === "string" ? JSON.parse(row.exit_checklist) : (row.exit_checklist || []),
            exitClearedAt: row.exit_cleared_at || row.exitClearedAt || undefined,
            exitClearedBy: row.exit_cleared_by || row.exitClearedBy || undefined,
            avatarUrl: row.avatar_url || row.avatarUrl || "",
            bio: row.bio || "",
            password: row.password || "",
            dateOfBirth: row.date_of_birth || undefined
          };
          db.employees.push(emp);
        }
      } catch (e) {
        console.warn("Failed to fetch employee from Supabase in checklist route:", e);
      }
    }
  }

  return emp;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const empId = resolvedParams.id;
    const { itemId, type, fileUrl, fileName, category, comments } = await request.json();

    if (!itemId || !type) {
      return NextResponse.json({ error: "Item ID and type are required" }, { status: 400 });
    }

    const db = loadDatabase();
    const emp = await getOrFetchEmployee(empId, db);

    if (!emp) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const checklistKey = type === "onboarding" ? "onboardingChecklist" : "exitChecklist";
    if (!emp[checklistKey]) emp[checklistKey] = [];

    let item = emp[checklistKey]!.find((i: any) =>
      i.id === itemId ||
      i.templateId === itemId ||
      (i.title && i.title.trim().toLowerCase() === String(itemId).trim().toLowerCase())
    );

    if (!item) {
      const templates = [...(db.onboardingChecklistTemplates || []), ...(db.exitChecklistTemplates || [])];
      const tmpl = templates.find(t => t.id === itemId || (t.title && t.title.trim().toLowerCase() === String(itemId).trim().toLowerCase()));
      item = {
        id: `chk-${Date.now()}`,
        templateId: tmpl?.id || itemId,
        title: tmpl?.title || itemId,
        description: tmpl?.description || "",
        type: (tmpl?.type || type) as "onboarding" | "exit",
        status: "Pending"
      };
      emp[checklistKey]!.push(item);
    }

    if (fileUrl) {
      item.fileUrl = fileUrl;
      item.fileName = fileName || item.title;
      item.status = "Uploaded";
      item.uploadedAt = new Date().toISOString().split("T")[0];
    }

    if (comments) {
      item.comments = comments;
    }

    saveDatabase(db);

    const client = supabaseAdmin || supabase;
    if (client) {
      try {
        const updateObj: any = {
          onboarding_checklist: emp.onboardingChecklist,
          exit_checklist: emp.exitChecklist
        };
        if (emp.documents) {
          updateObj.documents = emp.documents;
        }
        await client
          .from("employees")
          .update(updateObj)
          .or(`id.eq.${emp.id},id.eq.${empId},id.eq.${empId.replace(/_/g, '-')},id.eq.${empId.replace(/-/g, '_')}`);
      } catch (err) {
        console.warn("Failed to sync employee checklist to Supabase:", err);
      }
    }

    return NextResponse.json({ success: true, item, checklist: emp[checklistKey] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update checklist item" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const empId = resolvedParams.id;
    const { itemId, type, action, comments, reviewerName, fileUrl } = await request.json();

    const db = loadDatabase();
    const emp = await getOrFetchEmployee(empId, db);

    if (!emp) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (action === "grant_clearance") {
      emp.exitClearedAt = new Date().toISOString();
      emp.exitClearedBy = reviewerName || "Admin/HR";
      saveDatabase(db);

      const client = supabaseAdmin || supabase;
      if (client) {
        try {
          await client.from("employees").update({
            exit_cleared_at: emp.exitClearedAt,
            exit_cleared_by: emp.exitClearedBy
          }).or(`id.eq.${emp.id},id.eq.${empId},id.eq.${empId.replace(/_/g, '-')},id.eq.${empId.replace(/-/g, '_')}`);
        } catch (e) {}
      }

      return NextResponse.json({ success: true, message: "Final exit clearance granted successfully", employee: emp });
    }

    const primaryKey = type === "onboarding" ? "onboardingChecklist" : "exitChecklist";
    const secondaryKey = type === "onboarding" ? "exitChecklist" : "onboardingChecklist";

    if (!emp[primaryKey]) emp[primaryKey] = [];
    if (!emp[secondaryKey]) emp[secondaryKey] = [];

    let item = emp[primaryKey]!.find((i: any) =>
      i.id === itemId ||
      i.templateId === itemId ||
      (i.title && i.title.toLowerCase() === itemId.toLowerCase())
    );

    let actualType = type;

    if (!item) {
      item = emp[secondaryKey]!.find((i: any) =>
        i.id === itemId ||
        i.templateId === itemId ||
        (i.title && i.title.toLowerCase() === itemId.toLowerCase())
      );
      if (item) {
        actualType = type === "onboarding" ? "exit" : "onboarding";
      }
    }

    if (!item) {
      const templates = [...(db.onboardingChecklistTemplates || []), ...(db.exitChecklistTemplates || [])];
      const tmpl = templates.find(t => t.id === itemId || t.title.toLowerCase() === itemId.toLowerCase());
      actualType = tmpl?.type || (type as "onboarding" | "exit");
      item = {
        id: `chk-${Date.now()}`,
        templateId: tmpl?.id || itemId,
        title: tmpl?.title || itemId,
        description: tmpl?.description || "",
        type: actualType as "onboarding" | "exit",
        status: "Pending"
      };
      const keyToUse = actualType === "onboarding" ? "onboardingChecklist" : "exitChecklist";
      if (!emp[keyToUse]) emp[keyToUse] = [];
      emp[keyToUse]!.push(item);
    }

    if (fileUrl) {
      item.fileUrl = fileUrl;
      item.status = "Uploaded";
      item.uploadedAt = new Date().toISOString();
      item.comments = undefined;
    }

    if (action === "approve") {
      item.status = "Approved";
      item.reviewedBy = reviewerName || "Admin/HR";
      item.reviewedAt = new Date().toISOString();
      item.comments = comments || undefined;

      // Synchronize approved document with Employee Document Vault based on Checklist type
      const effectiveUrl = item.fileUrl || fileUrl || "";
      if (effectiveUrl) {
        item.fileUrl = effectiveUrl;
        if (!emp.documents) emp.documents = [];
        const checklistCategory = (item.type || actualType) === "onboarding" ? "Onboarding Document Checklist" : "Employee Exit & Separation Clearance Checklist";
        const docName = item.title;
        const existingDoc = emp.documents.find((d: any) => d.name === docName || d.id === `doc-${item.id}` || d.id === `doc-${itemId}` || (d.fileUrl && d.fileUrl === effectiveUrl) || d.name.startsWith(item.title));
        if (existingDoc) {
          existingDoc.name = docName;
          existingDoc.fileUrl = effectiveUrl;
          existingDoc.uploadedAt = item.uploadedAt || existingDoc.uploadedAt || new Date().toISOString().split("T")[0];
          existingDoc.approvedAt = item.reviewedAt || new Date().toISOString();
          existingDoc.reviewedBy = item.reviewedBy || reviewerName || "Admin/HR";
          existingDoc.category = checklistCategory as any;
        } else {
          const newDoc: EmployeeDocument = {
            id: `doc-${item.id}-${Date.now()}`,
            name: docName,
            category: checklistCategory as any,
            uploadedAt: item.uploadedAt || new Date().toISOString().split("T")[0],
            approvedAt: item.reviewedAt || new Date().toISOString(),
            reviewedBy: item.reviewedBy || reviewerName || "Admin/HR",
            size: "1.2 MB",
            fileUrl: effectiveUrl
          };
          emp.documents.push(newDoc);
        }
      }
    } else if (action === "reject") {
      item.status = "Rejected";
      item.reviewedBy = reviewerName || "Admin/HR";
      item.reviewedAt = new Date().toISOString();
      item.comments = comments || "Document rejected. Please re-upload valid proof.";

      // Remove rejected document from Vault if previously synced
      if (emp.documents) {
        emp.documents = emp.documents.filter((d: any) => d.name !== item.title && d.id !== `doc-${item.id}` && d.id !== `doc-${itemId}` && d.fileUrl !== item.fileUrl);
      }
    }

    saveDatabase(db);

    const client = supabaseAdmin || supabase;
    if (client) {
      try {
        const updateObj: any = {
          onboarding_checklist: emp.onboardingChecklist,
          exit_checklist: emp.exitChecklist,
          documents: emp.documents
        };
        await client.from("employees").update(updateObj).or(`id.eq.${emp.id},id.eq.${empId},id.eq.${empId.replace(/_/g, '-')},id.eq.${empId.replace(/-/g, '_')}`);
      } catch (err) {
        console.warn("Failed to sync employee checklist to Supabase:", err);
      }
    }

    const resultKey = actualType === "onboarding" ? "onboardingChecklist" : "exitChecklist";
    return NextResponse.json({ success: true, item, checklist: emp[resultKey], employee: emp });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to review checklist item" }, { status: 500 });
  }
}
