import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { syncFineToSupabase } from "@/src/lib/supabase";
import { Fine } from "@/src/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = loadDatabase();

    const empId = body.employeeId || body.employee_id || "";
    const emp = (db.employees || []).find((e: any) => e.id === empId);

    const fine: Fine = {
      id: body.id || `fin-${Date.now()}`,
      employeeId: empId,
      employeeName: body.employeeName || body.employee_name || emp?.fullName || `Employee ${empId}`,
      reason: body.reason || "Late Coming",
      amount: Number(body.amount) || 0,
      date: body.date || new Date().toISOString().split("T")[0],
      status: body.status || "Pending"
    };

    if (!db.fines) db.fines = [];
    db.fines = [fine, ...db.fines.filter((f: any) => f.id !== fine.id)];
    saveDatabase(db);

    await syncFineToSupabase(fine);

    return NextResponse.json({ success: true, fine });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to issue fine" }, { status: 500 });
  }
}

