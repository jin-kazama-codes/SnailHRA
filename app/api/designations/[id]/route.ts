import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const desId = resolvedParams.id;
    const db = loadDatabase();
    const dbClient = supabaseAdmin || supabase;

    if (!db.designations) db.designations = [];
    db.designations = db.designations.filter(d => d.id !== desId);
    saveDatabase(db);

    if (dbClient) {
      const { error } = await dbClient.from("designations").delete().eq("id", desId);
      if (error) {
        console.error("Failed to delete designation from Supabase:", error);
      }
    }

    return NextResponse.json({ success: true, message: "Designation deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete designation" }, { status: 500 });
  }
}
