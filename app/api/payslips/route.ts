import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { Payslip } from "@/src/types";

export async function POST(request: Request) {
  try {
    const payslip: Payslip = await request.json();
    const db = loadDatabase();
    db.payslips.push(payslip);
    saveDatabase(db);
    return NextResponse.json({ success: true, payslip });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate payslip" }, { status: 500 });
  }
}
