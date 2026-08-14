import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { PerformanceRecord } from "@/src/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || "";
    const role = searchParams.get("role") || "employee";
    const employeeId = searchParams.get("employeeId") || "";

    const db = loadDatabase();
    let records: PerformanceRecord[] = db.performanceRecords || [];

    if (companyId) records = records.filter(r => (r.companyId || "") === companyId);
    if (role === "employee" && employeeId) {
      records = records.filter(r => r.employeeId === employeeId);
    }

    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json({ records });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch performance records" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyId, employeeId, employeeName, reviewerId, reviewerName, type, period, summary, overallRating, incidentDate, actionTaken, sourceId } = body;

    if (!employeeId || !type || !summary) {
      return NextResponse.json({ error: "employeeId, type, and summary are required" }, { status: 400 });
    }

    const record: PerformanceRecord = {
      id: `prf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      companyId: companyId || "",
      employeeId,
      employeeName: employeeName || employeeId,
      reviewerId: reviewerId || "",
      reviewerName: reviewerName || "",
      type,
      period: period || "",
      summary,
      overallRating: overallRating ?? undefined,
      incidentDate: incidentDate || undefined,
      actionTaken: actionTaken || undefined,
      sourceId: sourceId || undefined,
      createdAt: new Date().toISOString(),
    };

    const db = loadDatabase();
    if (!db.performanceRecords) db.performanceRecords = [];
    db.performanceRecords.unshift(record);
    saveDatabase(db);

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        const { error } = await dbClient.from("performance_records").upsert({
          id: record.id,
          company_id: record.companyId,
          employee_id: record.employeeId,
          employee_name: record.employeeName,
          reviewer_id: record.reviewerId,
          reviewer_name: record.reviewerName,
          type: record.type,
          period: record.period,
          summary: record.summary,
          overall_rating: record.overallRating ?? null,
          incident_date: record.incidentDate ?? null,
          action_taken: record.actionTaken ?? null,
          source_id: record.sourceId ?? null,
          created_at: record.createdAt,
        }, { onConflict: "id" });
        if (error) {
          console.error("Performance record Supabase insert error:", error.message, error.details);
        } else {
          console.log("Successfully created performance record in Supabase:", record.id);
        }
      } catch (e) { console.warn("Performance record Supabase sync exception:", e); }
    }

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create performance record" }, { status: 500 });
  }
}
