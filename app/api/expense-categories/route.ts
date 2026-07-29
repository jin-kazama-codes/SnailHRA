import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { capitalizeName } from "@/src/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId") || "";
  const db = loadDatabase();
  
  if (supabase) {
    try {
      const query = companyId 
        ? supabase.from("expense_categories").select("*").eq("company_id", companyId)
        : supabase.from("expense_categories").select("*");
      
      const { data, error } = await query;
      if (data && data.length > 0) {
        return NextResponse.json(data.map((row: any) => ({
          id: row.id,
          name: capitalizeName(row.name),
          companyId: row.company_id || row.companyId || null,
          description: row.description || ""
        })));
      }
    } catch (e) {
      console.warn("Supabase fetch expense categories error:", e);
    }
  }
  
  let categories = db.expenseCategories || [];
  if (companyId) {
    categories = categories.filter(c => c.companyId === companyId);
  }
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  try {
    const { id, name, companyId, description } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    
    const db = loadDatabase();
    const newCategory = {
      id: id || "expcat-" + Date.now(),
      name: capitalizeName(name),
      companyId: companyId || "",
      description: description || ""
    };
    
    if (!db.expenseCategories) db.expenseCategories = [];
    db.expenseCategories = [newCategory, ...db.expenseCategories.filter(c => c.id !== newCategory.id)];
    saveDatabase(db);
    
    if (supabase) {
      try {
        await supabase.from("expense_categories").upsert({
          id: newCategory.id,
          name: newCategory.name,
          company_id: newCategory.companyId,
          description: newCategory.description
        }, { onConflict: "id" });
      } catch (e) {
        console.warn("Supabase expense categories upsert error:", e);
      }
    }
    
    return NextResponse.json({ success: true, category: newCategory });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
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
    if (!db.expenseCategories) db.expenseCategories = [];
    db.expenseCategories = db.expenseCategories.filter(c => c.id !== id);
    saveDatabase(db);
    
    if (supabase) {
      try {
        await supabase.from("expense_categories").delete().eq("id", id);
      } catch (e) {
        console.warn("Supabase expense category delete error:", e);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
