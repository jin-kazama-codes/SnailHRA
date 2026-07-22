import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const expenseId = resolvedParams.id;
    const body = await request.json();
    const db = loadDatabase();

    if (!db.expenses) db.expenses = [];
    const index = db.expenses.findIndex(e => e.id === expenseId);
    if (index >= 0) {
      db.expenses[index] = { ...db.expenses[index], ...body };
      
      if (body.status === "Approved") {
        const claim = db.expenses[index];
        if (!db.reimbursements) db.reimbursements = [];
        const existingReim = db.reimbursements.find(r => r.claimId === claim.id);
        if (!existingReim) {
          const newReim = {
            id: "reim-" + Date.now(),
            employeeId: claim.employeeId,
            employeeName: claim.employeeName,
            category: claim.category,
            amount: claim.amount,
            claimId: claim.id,
            status: "Pending",
            processedDate: null
          };
          db.reimbursements.unshift(newReim as any);
        }
      }
    }

    saveDatabase(db);

    if (supabase) {
      try {
        await supabase.from("expenses").update(body).eq("id", expenseId);
      } catch (e) {
        console.warn("Supabase sync warning:", e);
      }
    }

    return NextResponse.json({ success: true, expense: db.expenses[index] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update expense" }, { status: 500 });
  }
}
