import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { ChecklistItemTemplate } from "@/src/types";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

export async function GET() {
  const db = loadDatabase();
  return NextResponse.json({
    onboardingChecklistTemplates: db.onboardingChecklistTemplates || [],
    exitChecklistTemplates: db.exitChecklistTemplates || []
  });
}

export async function POST(request: Request) {
  try {
    const { title, description, category, required, type, companyId } = await request.json();

    if (!title || !type) {
      return NextResponse.json({ error: "Title and type ('onboarding' or 'exit') are required" }, { status: 400 });
    }

    const db = loadDatabase();

    const newTemplate: ChecklistItemTemplate = {
      id: `${type === "onboarding" ? "onb" : "exit"}-tmpl-${Date.now()}`,
      title: title.trim(),
      description: description ? description.trim() : "",
      category: category || (type === "onboarding" ? "Identity Proof" : "Contract"),
      required: required !== undefined ? Boolean(required) : true,
      type: type as "onboarding" | "exit",
      companyId: companyId || undefined
    };

    if (type === "onboarding") {
      if (!db.onboardingChecklistTemplates) db.onboardingChecklistTemplates = [];
      db.onboardingChecklistTemplates.push(newTemplate);
    } else {
      if (!db.exitChecklistTemplates) db.exitChecklistTemplates = [];
      db.exitChecklistTemplates.push(newTemplate);
    }

    saveDatabase(db);
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

    // Clean up unuploaded pending items for deleted template from all employee records
    if (db.employees && db.employees.length > 0) {
      db.employees.forEach(emp => {
        if (emp.onboardingChecklist) {
          emp.onboardingChecklist = emp.onboardingChecklist.filter(i => {
            const matches = i.templateId === id || i.id === id || (deletedTitle && i.title && i.title.trim().toLowerCase() === deletedTitle.trim().toLowerCase());
            if (matches && i.status === "Pending") return false;
            return true;
          });
        }
        if (emp.exitChecklist) {
          emp.exitChecklist = emp.exitChecklist.filter(i => {
            const matches = i.templateId === id || i.id === id || (deletedTitle && i.title && i.title.trim().toLowerCase() === deletedTitle.trim().toLowerCase());
            if (matches && i.status === "Pending") return false;
            return true;
          });
        }
      });

      const client = supabaseAdmin || supabase;
      if (client) {
        try {
          for (const emp of db.employees) {
            await client.from("employees").update({
              onboarding_checklist: emp.onboardingChecklist || [],
              exit_checklist: emp.exitChecklist || []
            }).eq("id", emp.id);
          }
        } catch (sbErr) {
          console.warn("Failed to sync employee checklist cleanup to Supabase:", sbErr);
        }
      }
    }

    saveDatabase(db);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete checklist template" }, { status: 500 });
  }
}
