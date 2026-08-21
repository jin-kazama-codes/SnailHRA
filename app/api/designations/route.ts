import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { Designation, capitalizeName } from "@/src/types";
import { toBranchName } from "@/src/lib/branchUtils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || "";
    const branch = searchParams.get("branch") || "";
    const db = loadDatabase();
    const dbClient = supabaseAdmin || supabase;

    if (dbClient) {
      try {
        let query = dbClient.from("designations").select("*");
        if (companyId) query = query.eq("company_id", companyId);
        const { data, error } = await query;
        if (!error && data) {
          return NextResponse.json(data.map((row: any) => ({
            id: row.id,
            title: capitalizeName(row.title),
            department: capitalizeName(row.department),
            companyId: row.company_id || row.companyId || null,
            branch: row.branch || undefined
          })));
        }
      } catch (e) {
        console.warn("Supabase fetch designations error:", e);
      }
    }

    let designations = db.designations || [];
    if (companyId) {
      designations = designations.filter(d => !d.companyId || d.companyId === companyId);
    }
    return NextResponse.json(designations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch designations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, title, department, companyId, branch } = body;
    if (!title || !department) {
      return NextResponse.json({ error: "Title and Department are required" }, { status: 400 });
    }

    const db = loadDatabase();
    const dbClient = supabaseAdmin || supabase;
    const resolvedCompanyId = companyId || null;
    const resolvedBranch = (branch && branch !== "All Branches") ? toBranchName(branch) : undefined;

    const newDes: Designation = {
      id: id || ("des-" + Date.now()),
      title: capitalizeName(title),
      department: capitalizeName(department),
      companyId: resolvedCompanyId || undefined,
      branch: resolvedBranch
    };

    if (!db.designations) db.designations = [];
    db.designations = [newDes, ...db.designations.filter(d => d.id !== newDes.id)];
    saveDatabase(db);

    if (dbClient) {
      const payload: any = {
        id: newDes.id,
        title: newDes.title,
        department: newDes.department,
        company_id: resolvedCompanyId,
        branch: resolvedBranch || null
      };
      const { error } = await dbClient.from("designations").upsert(payload, { onConflict: "id" });
      if (error) {
        console.error("Failed to sync designation to Supabase:", error);
      }
    }

    return NextResponse.json(newDes, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create designation" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const db = loadDatabase();
    const dbClient = supabaseAdmin || supabase;

    if (!db.designations) db.designations = [];
    db.designations = db.designations.filter(d => d.id !== id);
    saveDatabase(db);

    if (dbClient) {
      const { error } = await dbClient.from("designations").delete().eq("id", id);
      if (error) {
        console.error("Failed to delete designation from Supabase:", error);
      }
    }

    return NextResponse.json({ success: true, message: "Designation deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete designation" }, { status: 500 });
  }
}
