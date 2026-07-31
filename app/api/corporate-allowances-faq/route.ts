import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase, initialCorporateAllowanceFaqs } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { MGM_COMPANY_ID } from "@/src/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId") || "";
  const db = loadDatabase();
  
  const dbClient = supabaseAdmin || supabase;

  if (dbClient) {
    try {
      const query = companyId 
        ? dbClient.from("corporate_allowances_faq").select("*").eq("company_id", companyId)
        : dbClient.from("corporate_allowances_faq").select("*");
      
      const { data, error } = await query;
      if (data && data.length > 0) {
        return NextResponse.json(data.map((row: any) => ({
          id: row.id,
          title: row.title || "",
          description: row.description || "",
          companyId: row.company_id || row.companyId || null,
          createdAt: row.created_at || row.createdAt || new Date().toISOString()
        })));
      }
    } catch (e) {
      console.warn("Supabase fetch corporate_allowances_faq warning:", e);
    }
  }
  
  let faqs = db.corporateAllowancesFaqs || [];
  if (companyId) {
    const filtered = faqs.filter(f => f.companyId === companyId);
    if (filtered.length > 0) {
      return NextResponse.json(filtered);
    }
    // Fallback seed defaults for company if no faqs exist for this companyId
    if (companyId === MGM_COMPANY_ID || companyId === "a1b2c3d4-0001-0001-0001-000000000001") {
      return NextResponse.json(initialCorporateAllowanceFaqs);
    }
  }
  
  return NextResponse.json(faqs);
}

export async function POST(request: Request) {
  try {
    const { id, title, description, companyId } = await request.json();
    if (!title || !description) {
      return NextResponse.json({ error: "Title and Description are required." }, { status: 400 });
    }
    
    const targetCompanyId = companyId || MGM_COMPANY_ID;
    const db = loadDatabase();
    const newFaq = {
      id: id || "faq-" + Date.now(),
      title: title.trim(),
      description: description.trim(),
      companyId: targetCompanyId,
      createdAt: new Date().toISOString()
    };
    
    if (!db.corporateAllowancesFaqs) db.corporateAllowancesFaqs = [];
    db.corporateAllowancesFaqs = [newFaq, ...db.corporateAllowancesFaqs.filter(f => f.id !== newFaq.id)];
    saveDatabase(db);
    
    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        await dbClient.from("corporate_allowances_faq").upsert({
          id: newFaq.id,
          title: newFaq.title,
          description: newFaq.description,
          company_id: newFaq.companyId,
          created_at: newFaq.createdAt
        }, { onConflict: "id" });
      } catch (e) {
        console.warn("Supabase corporate_allowances_faq upsert warning:", e);
      }
    }
    
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
    
    const db = loadDatabase();
    if (!db.corporateAllowancesFaqs) db.corporateAllowancesFaqs = [];
    db.corporateAllowancesFaqs = db.corporateAllowancesFaqs.filter(f => f.id !== id);
    saveDatabase(db);
    
    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        await dbClient.from("corporate_allowances_faq").delete().eq("id", id);
      } catch (e) {
        console.warn("Supabase corporate_allowances_faq delete warning:", e);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete corporate allowance FAQ" }, { status: 500 });
  }
}
