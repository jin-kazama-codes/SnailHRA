import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const recordId = resolvedParams.id;
    const body = await request.json();

    const db = loadDatabase();
    if (!db.performanceRecords) db.performanceRecords = [];

    const idx = db.performanceRecords.findIndex(r => r.id === recordId);
    if (idx === -1) return NextResponse.json({ error: "Record not found" }, { status: 404 });

    db.performanceRecords[idx] = { ...db.performanceRecords[idx], ...body };
    saveDatabase(db);

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        const r = db.performanceRecords[idx];
        const { error } = await dbClient.from("performance_records").upsert({
          id: r.id,
          company_id: r.companyId || "",
          employee_id: r.employeeId || "",
          employee_name: r.employeeName || "",
          reviewer_id: r.reviewerId || "",
          reviewer_name: r.reviewerName || "",
          type: r.type || "Appraisal",
          period: r.period || "",
          summary: r.summary || "",
          overall_rating: r.overallRating ?? null,
          incident_date: r.incidentDate ?? null,
          action_taken: r.actionTaken ?? null,
          source_id: r.sourceId ?? null,
          created_at: r.createdAt || new Date().toISOString(),
        }, { onConflict: "id" });
        if (error) {
          console.error("Performance update Supabase error:", error.message, error.details);
        } else {
          console.log("Successfully updated performance record in Supabase:", r.id);
        }
      } catch (e) { console.warn("Performance update Supabase sync error:", e); }
    }

    return NextResponse.json({ success: true, record: db.performanceRecords[idx] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update record" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const recordId = resolvedParams.id;

    const db = loadDatabase();
    if (!db.performanceRecords) db.performanceRecords = [];
    db.performanceRecords = db.performanceRecords.filter(r => r.id !== recordId);
    saveDatabase(db);

    if (supabase) {
      try { await supabase.from("performance_records").delete().eq("id", recordId); }
      catch (e) { console.warn("Performance delete Supabase sync error:", e); }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete record" }, { status: 500 });
  }
}
