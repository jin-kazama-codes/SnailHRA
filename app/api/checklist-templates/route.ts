import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { ChecklistItemTemplate } from "@/src/types";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { toBranchName, toBranchId } from "@/src/lib/branchUtils";

export async function GET() {
  const db = loadDatabase();
  const client = supabaseAdmin || supabase;
  if (client) {
    try {
      const { data: rows, error } = await client.from("checklist_templates").select("*");
      if (rows && Array.isArray(rows) && !error && rows.length > 0) {
        const parseRow = (r: any) => {
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

        db.onboardingChecklistTemplates = rows
          .filter((r: any) => r.type === "onboarding")
          .map(parseRow);
        db.exitChecklistTemplates = rows
          .filter((r: any) => r.type === "exit")
          .map(parseRow);
      }
    } catch (e) {
      console.warn("Failed to fetch checklist_templates in GET route:", e);
    }
  }
  return NextResponse.json({
    onboardingChecklistTemplates: db.onboardingChecklistTemplates || [],
    exitChecklistTemplates: db.exitChecklistTemplates || []
  });
}

export async function POST(request: Request) {
  try {
    const { title, description, category, required, type, companyId, branch } = await request.json();

    if (!title || !type) {
      return NextResponse.json({ error: "Title and type ('onboarding' or 'exit') are required" }, { status: 400 });
    }

    const db = loadDatabase();
    const rawBranch = (branch && branch !== "All Branches") ? branch : "";
    const bName = rawBranch ? toBranchName(rawBranch) : "";

    const newTemplate: ChecklistItemTemplate = {
      id: `${type === "onboarding" ? "onb" : "exit"}-tmpl-${Date.now()}`,
      title: title.trim(),
      description: description ? description.trim() : "",
      category: category || (type === "onboarding" ? "Identity Proof" : "Contract"),
      required: required !== undefined ? Boolean(required) : true,
      type: type as "onboarding" | "exit",
      companyId: companyId || undefined,
      branch: bName || undefined
    };

    if (type === "onboarding") {
      if (!db.onboardingChecklistTemplates) db.onboardingChecklistTemplates = [];
      db.onboardingChecklistTemplates.push(newTemplate);
    } else {
      if (!db.exitChecklistTemplates) db.exitChecklistTemplates = [];
      db.exitChecklistTemplates.push(newTemplate);
    }

    saveDatabase(db);

    const client = supabaseAdmin || supabase;
    if (client) {
      try {
        // Try inserting with branch column
        let branchSaved = false;
        if (bName) {
          const { error: bErr } = await client.from("checklist_templates").upsert({
            id: newTemplate.id,
            title: newTemplate.title,
            description: newTemplate.description,
            category: newTemplate.category,
            required: newTemplate.required,
            type: newTemplate.type,
            company_id: newTemplate.companyId || null,
            branch: bName
          }, { onConflict: "id" });
          if (!bErr) branchSaved = true;
        }

        if (!branchSaved) {
          const encodedTitle = bName ? `[${bName}] ${newTemplate.title}` : newTemplate.title;
          await client.from("checklist_templates").upsert({
            id: newTemplate.id,
            title: encodedTitle,
            description: newTemplate.description,
            category: newTemplate.category,
            required: newTemplate.required,
            type: newTemplate.type,
            company_id: newTemplate.companyId || null
          }, { onConflict: "id" });
        }
      } catch (sbErr) {
        console.warn("Failed to sync checklist template to Supabase:", sbErr);
      }
    }

    return NextResponse.json({ success: true, template: newTemplate });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to add checklist template" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

    const db = loadDatabase();
    let deletedTitle = "";
    let deletedType: "onboarding" | "exit" | null = null;

    if (db.onboardingChecklistTemplates) {
      const tmpl = db.onboardingChecklistTemplates.find(t => t.id === id);
      if (tmpl) {
        deletedTitle = tmpl.title;
        deletedType = "onboarding";
      }
      db.onboardingChecklistTemplates = db.onboardingChecklistTemplates.filter(t => t.id !== id);
    }
    if (db.exitChecklistTemplates) {
      const tmpl = db.exitChecklistTemplates.find(t => t.id === id);
      if (tmpl) {
        deletedTitle = tmpl.title;
        deletedType = "exit";
      }
      db.exitChecklistTemplates = db.exitChecklistTemplates.filter(t => t.id !== id);
    }

    // Clean up items for deleted template from all employee records
    if (db.employees && db.employees.length > 0) {
      db.employees.forEach(emp => {
        if (emp.onboardingChecklist) {
          emp.onboardingChecklist = emp.onboardingChecklist.filter(i => {
            const matches = i.templateId === id || i.id === id || (deletedTitle && i.title && i.title.trim().toLowerCase() === deletedTitle.trim().toLowerCase());
            return !matches;
          });
        }
        if (emp.exitChecklist) {
          emp.exitChecklist = emp.exitChecklist.filter(i => {
            const matches = i.templateId === id || i.id === id || (deletedTitle && i.title && i.title.trim().toLowerCase() === deletedTitle.trim().toLowerCase());
            return !matches;
          });
        }
      });
    }

    const client = supabaseAdmin || supabase;
    if (client) {
      try {
        await client.from("checklist_templates").delete().eq("id", id);
        if (db.employees && db.employees.length > 0) {
          for (const emp of db.employees) {
            await client.from("employees").update({
              onboarding_checklist: emp.onboardingChecklist || [],
              exit_checklist: emp.exitChecklist || []
            }).eq("id", emp.id);
          }
        }
      } catch (sbErr) {
        console.warn("Failed to sync template deletion to Supabase:", sbErr);
      }
    }

    saveDatabase(db);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete checklist template" }, { status: 500 });
  }
}
