import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";

export async function POST() {
  try {
    const db = loadDatabase();
    db.payslips = [];
    saveDatabase(db);

    if (supabase) {
      const { error } = await supabase.from("payslips").delete().neq("id", "");
      if (error) {
        console.warn("Supabase payslips table clear warning:", error.message);
      }
    }

    return NextResponse.json({ success: true, message: "All payslips cleared. All statuses reset to Pending Run." });
  } catch (error) {
    console.error("Failed to clear payslips:", error);
    return NextResponse.json({ error: "Failed to clear payslips" }, { status: 500 });
  }
}
