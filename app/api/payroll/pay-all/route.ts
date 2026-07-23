import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { syncPayslipToSupabase } from "@/src/lib/supabase";

export async function POST(request: Request) {
  try {
    const { month } = await request.json();
    if (!month) {
      return NextResponse.json({ error: "Month is required" }, { status: 400 });
    }

    const db = loadDatabase();
    let updatedCount = 0;
    const paidSlips: any[] = [];
    db.payslips.forEach(p => {
      if (p.month === month && p.status === "Generated") {
        p.status = "Paid";
        updatedCount++;
        paidSlips.push(p);
      }
    });

    if (updatedCount > 0) {
      saveDatabase(db);
      for (const p of paidSlips) {
        await syncPayslipToSupabase(p);
      }
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (error) {
    console.error("Failed to pay all payslips:", error);
    return NextResponse.json({ error: "Failed to pay all payslips" }, { status: 500 });
  }
}
