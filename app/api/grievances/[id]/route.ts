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
    const ticketId = resolvedParams.id;
    const body = await request.json();
    const { status, resolutionMessage, resolvedBy, resolvedByName } = body;

    const db = loadDatabase();
    if (!db.grievanceTickets) db.grievanceTickets = [];

    const idx = db.grievanceTickets.findIndex(t => t.id === ticketId);
    if (idx === -1) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const isTerminal = status === "Resolved" || status === "Rejected" || status === "Closed";
    db.grievanceTickets[idx] = {
      ...db.grievanceTickets[idx],
      ...(status && { status }),
      ...(resolutionMessage !== undefined && { resolutionMessage }),
      ...(resolvedBy && { resolvedBy }),
      ...(resolvedByName && { resolvedByName }),
      ...(isTerminal && { resolvedAt: new Date().toISOString() }),
    };

    saveDatabase(db);

    // Sync to Supabase
    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        const t = db.grievanceTickets[idx];
        const payload = {
          id: t.id,
          company_id: t.companyId || "",
          employee_id: t.employeeId || "",
          employee_name: t.employeeName || "",
          title: t.title || "",
          description: t.description || "",
          category: t.category || "Other",
          priority: t.priority || "Medium",
          status: t.status || "Open",
          is_anonymous: t.isAnonymous ?? false,
          created_at: t.createdAt || new Date().toISOString(),
          resolution_message: t.resolutionMessage ?? null,
          resolved_by: t.resolvedBy ?? null,
          resolved_by_name: t.resolvedByName ?? null,
          resolved_at: t.resolvedAt ?? null,
          messages: t.messages || [],
        };

        const { error } = await dbClient.from("grievance_tickets").upsert(payload, { onConflict: "id" });
        if (error) {
          console.error("Grievance update Supabase error:", error.message, error.details);
        } else {
          console.log("Successfully updated grievance ticket in Supabase:", t.id);
        }
      } catch (e) { console.warn("Grievance update Supabase exception:", e); }
    }

    return NextResponse.json({ success: true, ticket: db.grievanceTickets[idx] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update ticket" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const ticketId = resolvedParams.id;

    const db = loadDatabase();
    if (!db.grievanceTickets) db.grievanceTickets = [];
    db.grievanceTickets = db.grievanceTickets.filter(t => t.id !== ticketId);
    saveDatabase(db);

    if (supabase) {
      try { await supabase.from("grievance_tickets").delete().eq("id", ticketId); }
      catch (e) { console.warn("Grievance delete Supabase sync:", e); }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete ticket" }, { status: 500 });
  }
}
