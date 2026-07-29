import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { Designation } from "@/src/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, department, companyId } = body;
    if (!title || !department) {
      return NextResponse.json({ error: "Title and Department are required" }, { status: 400 });
    }

    const db = loadDatabase();
    const dbClient = supabaseAdmin || supabase;
    const resolvedCompanyId = companyId || null;

    const newDes: Designation = {
      id: "des-" + Date.now(),
      title,
      department,
      companyId: resolvedCompanyId || undefined
    };

    if (!db.designations) db.designations = [];
    db.designations.push(newDes);
    saveDatabase(db);

    if (dbClient) {
      const { error } = await dbClient.from("designations").upsert({
        id: newDes.id,
        title: newDes.title,
        department: newDes.department,
        company_id: resolvedCompanyId
      });
      if (error) {
        console.error("Failed to sync designation to Supabase:", error);
      }
    }

    return NextResponse.json(newDes, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create designation" }, { status: 500 });
  }
}
