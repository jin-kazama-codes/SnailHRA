import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";

export async function POST(request: Request) {
  try {
    const { month } = await request.json();
    if (!month) {
      return NextResponse.json({ error: "Month is required" }, { status: 400 });
    }

    const db = loadDatabase();
    let updatedCount = 0;
    db.payslips.forEach(p => {
      if (p.month === month && p.status === "Generated") {
        p.status = "Paid";
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      saveDatabase(db);
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (error) {
    console.error("Failed to pay all payslips:", error);
    return NextResponse.json({ error: "Failed to pay all payslips" }, { status: 500 });
  }
}
