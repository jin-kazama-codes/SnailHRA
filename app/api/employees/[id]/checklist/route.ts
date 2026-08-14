import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { EmployeeChecklistItem, EmployeeDocument } from "@/src/types";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

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
    if (!db.employees) db.employees = [];
    const emp = db.employees.find(e => e.id === empId);

    if (!emp) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const checklistKey = type === "onboarding" ? "onboardingChecklist" : "exitChecklist";
    if (!emp[checklistKey]) emp[checklistKey] = [];

    let item = emp[checklistKey]!.find(i =>
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
        const updateObj: any = {};
        if (type === "onboarding") {
          updateObj.onboarding_checklist = emp.onboardingChecklist;
        } else {
          updateObj.exit_checklist = emp.exitChecklist;
        }
        if (emp.documents) {
          updateObj.documents = emp.documents;
        }
        await client.from("employees").update(updateObj).eq("id", empId);
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
    if (!db.employees) db.employees = [];
    const emp = db.employees.find(e => e.id === empId);

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
          }).eq("id", empId);
        } catch (e) {}
      }

      return NextResponse.json({ success: true, message: "Final exit clearance granted successfully", employee: emp });
    }

    const primaryKey = type === "onboarding" ? "onboardingChecklist" : "exitChecklist";
    const secondaryKey = type === "onboarding" ? "exitChecklist" : "onboardingChecklist";

    if (!emp[primaryKey]) emp[primaryKey] = [];
    if (!emp[secondaryKey]) emp[secondaryKey] = [];

    let item = emp[primaryKey]!.find(i =>
      i.id === itemId ||
      i.templateId === itemId ||
      (i.title && i.title.toLowerCase() === itemId.toLowerCase())
    );

    let actualType = type;

    if (!item) {
      item = emp[secondaryKey]!.find(i =>
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
        const existingDoc = emp.documents.find(d => d.name === docName || d.id === `doc-${item.id}` || d.id === `doc-${itemId}` || (d.fileUrl && d.fileUrl === effectiveUrl) || d.name.startsWith(item.title));
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
        emp.documents = emp.documents.filter(d => d.name !== item.title && d.id !== `doc-${item.id}` && d.id !== `doc-${itemId}` && d.fileUrl !== item.fileUrl);
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
        await client.from("employees").update(updateObj).eq("id", empId);
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
