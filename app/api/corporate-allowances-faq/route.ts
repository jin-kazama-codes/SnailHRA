import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase, initialCorporateAllowanceFaqs } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { MGM_COMPANY_ID } from "@/src/lib/supabase";
import { CorporateAllowanceFaq } from "@/src/types";
import { toBranchName } from "@/src/lib/branchUtils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId") || "";
  
  const dbClient = supabaseAdmin || supabase;

  if (dbClient) {
    try {
      const query = companyId 
        ? dbClient.from("corporate_allowances_faq").select("*").eq("company_id", companyId)
        : dbClient.from("corporate_allowances_faq").select("*");
      
      const { data, error } = await query;
      if (!error && data) {
        return NextResponse.json(data.map((row: any) => ({
          id: row.id,
          title: row.title || "",
          description: row.description || "",
          companyId: row.company_id || row.companyId || null,
          branch: row.branch || undefined,
          createdAt: row.created_at || row.createdAt || new Date().toISOString()
        })));
      }
    } catch (e) {
      console.warn("Supabase fetch corporate_allowances_faq warning:", e);
    }
  }
  
  const db = loadDatabase();
  let faqs = db.corporateAllowancesFaqs || [];
  if (companyId) {
    return NextResponse.json(faqs.filter(f => !f.companyId || f.companyId === companyId));
  }
  
  return NextResponse.json(faqs);
}

export async function POST(request: Request) {
  try {
    const { id, title, description, companyId, branch } = await request.json();
    if (!title || !description) {
      return NextResponse.json({ error: "Title and Description are required." }, { status: 400 });
    }
    
    const targetCompanyId = companyId || MGM_COMPANY_ID;
    const resolvedBranch = (branch && branch !== "All Branches") ? toBranchName(branch) : undefined;

    const newFaq: CorporateAllowanceFaq = {
      id: id || ("faq-" + Date.now()),
      title: title.trim(),
      description: description.trim(),
      companyId: targetCompanyId,
      branch: resolvedBranch,
      createdAt: new Date().toISOString()
    };
    
    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      const { error } = await dbClient.from("corporate_allowances_faq").upsert({
        id: newFaq.id,
        title: newFaq.title,
        description: newFaq.description,
        company_id: newFaq.companyId,
        branch: resolvedBranch || null,
        created_at: newFaq.createdAt
      }, { onConflict: "id" });

      if (error) {
        console.warn("Supabase corporate_allowances_faq upsert warning:", error);
      }
    }

    // Local DB update
    const db = loadDatabase();
    if (!db.corporateAllowancesFaqs) db.corporateAllowancesFaqs = [];
    db.corporateAllowancesFaqs = [newFaq, ...db.corporateAllowancesFaqs.filter(f => f.id !== newFaq.id)];
    saveDatabase(db);
    
    return NextResponse.json({ success: true, faq: newFaq });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save corporate allowance FAQ" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Id is required." }, { status: 400 });
    }
    
    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      const { error } = await dbClient.from("corporate_allowances_faq").delete().eq("id", id);
      if (error) {
        console.warn("Supabase corporate_allowances_faq delete warning:", error);
      }
    }
    
    // Local fallback only if Supabase is unavailable or errored out
    const db = loadDatabase();
    if (!db.corporateAllowancesFaqs) db.corporateAllowancesFaqs = [];
    db.corporateAllowancesFaqs = db.corporateAllowancesFaqs.filter(f => f.id !== id);
    saveDatabase(db);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete corporate allowance FAQ" }, { status: 500 });
  }
}
