import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { toBranchId, toBranchName } from "@/src/lib/branchUtils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = loadDatabase();
    const { searchParams } = new URL(request.url);
    const branch = searchParams.get("branch");
    const companyId = searchParams.get("companyId") || "";

    // Try to load fresh from Supabase companies table
    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        let q = dbClient.from("companies").select("branch_code_prefixes, id");
        if (companyId) {
          q = q.eq("id", companyId);
        }
        const { data: companyData } = await q.maybeSingle();
        if (companyData?.branch_code_prefixes && typeof companyData.branch_code_prefixes === "object") {
          if (!db.branchCodePrefixes) db.branchCodePrefixes = {};
          Object.assign(db.branchCodePrefixes, companyData.branch_code_prefixes);
          saveDatabase(db);
        }
      } catch (e) {
        console.warn("Failed to load branch_code_prefixes from Supabase:", e);
      }
    }

    if (branch && branch !== "All Branches") {
      const bName = toBranchName(branch);
      const bId = toBranchId(branch);
      const prefix = (db.branchCodePrefixes && (db.branchCodePrefixes[branch] || db.branchCodePrefixes[bName] || db.branchCodePrefixes[bId])) || db.empCodePrefix || "EMP";
      return NextResponse.json({ prefix, branchCodePrefixes: db.branchCodePrefixes || {} });
    }

    return NextResponse.json({
      empCodePrefix: db.empCodePrefix || "EMP",
      branchCodePrefixes: db.branchCodePrefixes || {}
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch code prefix" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prefix, companyId, branch } = body;

    if (!prefix || typeof prefix !== "string") {
      return NextResponse.json({ error: "prefix string is required" }, { status: 400 });
    }

    const clean = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!clean) {
      return NextResponse.json({ error: "prefix contains no valid alphanumeric characters" }, { status: 400 });
    }

    const db = loadDatabase();
    const rawBranch = (branch && branch !== "All Branches") ? branch : "";

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        let q = dbClient.from("companies").select("branch_code_prefixes, id");
        if (companyId) {
          q = q.eq("id", companyId);
        }
        const { data: companyData } = await q.maybeSingle();
        if (companyData?.branch_code_prefixes && typeof companyData.branch_code_prefixes === "object") {
          if (!db.branchCodePrefixes) db.branchCodePrefixes = {};
          Object.assign(db.branchCodePrefixes, companyData.branch_code_prefixes);
        }
      } catch (e) {
        console.warn("Failed to load existing branch_code_prefixes before save:", e);
      }
    }

    if (!db.branchCodePrefixes) db.branchCodePrefixes = {};

    if (rawBranch) {
      const bName = toBranchName(rawBranch);
      const bId = toBranchId(rawBranch);
      db.branchCodePrefixes[rawBranch] = clean;
      if (bName) db.branchCodePrefixes[bName] = clean;
      if (bId) db.branchCodePrefixes[bId] = clean;
    } else {
      db.empCodePrefix = clean;
    }

    saveDatabase(db);

    // Persist to Supabase companies table
    if (dbClient) {
      try {
        let updateQuery = dbClient
          .from("companies")
          .update({ branch_code_prefixes: db.branchCodePrefixes });
        
        if (companyId) {
          updateQuery = updateQuery.eq("id", companyId);
        }
        
        const { error: upsertErr } = await updateQuery;
        if (upsertErr) {
          console.warn("Failed to save branch_code_prefixes to Supabase:", upsertErr.message);
        }
      } catch (e) {
        console.warn("Error saving branch_code_prefixes to Supabase:", e);
      }
    }

    return NextResponse.json({
      success: true,
      prefix: clean,
      branch: rawBranch || undefined,
      branchCodePrefixes: db.branchCodePrefixes
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save branch code prefix" }, { status: 500 });
  }
}
