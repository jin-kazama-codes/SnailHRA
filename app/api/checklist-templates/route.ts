import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { ChecklistItemTemplate } from "@/src/types";

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
    if (db.onboardingChecklistTemplates) {
      db.onboardingChecklistTemplates = db.onboardingChecklistTemplates.filter(t => t.id !== id);
    }
    if (db.exitChecklistTemplates) {
      db.exitChecklistTemplates = db.exitChecklistTemplates.filter(t => t.id !== id);
    }

    saveDatabase(db);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete checklist template" }, { status: 500 });
  }
}
