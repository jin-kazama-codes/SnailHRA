import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { syncPayslipToSupabase, supabase } from "@/src/lib/supabase";

export async function POST(request: Request) {
  try {
    const { month } = await request.json();
    if (!month) {
      return NextResponse.json({ error: "Month is required" }, { status: 400 });
    }

    const db = loadDatabase();

    if (supabase) {
      const { data: slipsRows } = await supabase.from("payslips").select("*");
      if (slipsRows) {
        db.payslips = slipsRows.map((row: any) => ({
          id: row.id,
          employeeId: row.employee_id || row.employeeId || "",
          month: row.month || "",
          basic: Number(row.basic) || 0,
          hra: Number(row.hra) || 0,
          telephone: Number(row.telephone) || 0,
          fuel: Number(row.fuel) || 0,
          professionalDev: Number(row.professional_dev ?? row.professionalDev) || 0,
          lta: Number(row.lta) || 0,
          allowances: Number(row.allowances) || 0,
          finesDeducted: Number(row.fines_deducted ?? row.finesDeducted ?? 0),
          pfDeduction: Number(row.pf_deduction ?? row.pfDeduction ?? 0),
          taxDeduction: Number(row.tax_deduction ?? row.taxDeduction ?? 0),
          netPay: Number(row.net_pay ?? row.netPay ?? 0),
          status: row.status || "Generated",
          generatedAt: row.generated_at || row.generatedAt || "",
          sentToEmail: row.sent_to_email || row.sentToEmail || ""
        }));
      }
    }

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
