import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { ExpenseClaim } from "@/src/types";
import { supabase, syncExpenseToSupabase } from "@/src/lib/supabase";

export async function GET() {
  const db = loadDatabase();
  if (supabase) {
    try {
      const { data } = await supabase.from("expenses").select("*");
      if (data && data.length > 0) {
        const mappedExpenses: ExpenseClaim[] = data.map((row: any) => ({
          id: row.id,
          employeeId: row.employee_id || row.employeeId || "",
          employeeName: row.employee_name || row.employeeName || "",
          category: row.category || "Others",
          amount: Number(row.amount) || 0,
          date: row.date || "",
          description: row.description || "",
          status: row.status || "Pending"
        }));
        const expMap = new Map();
        (db.expenses || []).forEach((e: any) => { if (e.id) expMap.set(e.id, e); });
        mappedExpenses.forEach((e: any) => { expMap.set(e.id, e); });
        const mergedExpenses = Array.from(expMap.values());
        db.expenses = mergedExpenses;
        return NextResponse.json(mergedExpenses);
      }
    } catch (err) {
      console.warn("Supabase fetch expenses error:", err);
    }
  }
  return NextResponse.json(db.expenses || []);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = loadDatabase();
    
    const emp = db.employees.find(e => e.id === body.employeeId);
    const empName = body.employeeName || emp?.fullName || "Employee " + (body.employeeId || "");
    const claimId = body.id || "exp-" + Date.now();

    const newClaim: ExpenseClaim = {
      id: claimId,
      employeeId: body.employeeId || "",
      employeeName: empName,
      category: body.category || "Others",
      amount: Number(body.amount) || 0,
      date: body.date || new Date().toISOString().split("T")[0],
      description: body.description || "",
      status: body.status || "Pending"
    };

    if (!db.expenses) db.expenses = [];
    db.expenses = [newClaim, ...db.expenses.filter(e => e.id !== claimId)];
    saveDatabase(db);

    await syncExpenseToSupabase(newClaim);

    return NextResponse.json({ success: true, claim: newClaim });
  } catch (error: any) {
    console.error("Failed to create expense claim:", error);
    return NextResponse.json({ error: "Failed to create expense claim" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, status } = await request.json();
    const db = loadDatabase();
    if (!db.expenses) db.expenses = [];
    db.expenses = db.expenses.map(e => e.id === id ? { ...e, status } : e);
    saveDatabase(db);

    if (supabase) {
      try {
        await supabase.from("expenses").update({ status }).eq("id", id);
      } catch (e) {
        console.warn("Supabase expense update error:", e);
      }
    }

    return NextResponse.json({ success: true, id, status });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update expense status" }, { status: 500 });
  }
}
