import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { GrievanceTicket } from "@/src/types";

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

    let idx = db.grievanceTickets.findIndex(t => t.id === ticketId);

    const dbClient = supabaseAdmin || supabase;
    if (idx === -1 && dbClient) {
      try {
        const { data } = await dbClient.from("grievance_tickets").select("*").eq("id", ticketId).maybeSingle();
        if (data) {
          const restoredTicket: GrievanceTicket = {
            id: data.id,
            companyId: data.company_id || "",
            employeeId: data.employee_id || "",
            employeeName: data.employee_name || "",
            title: data.title || "",
            description: data.description || "",
            category: data.category || "Other",
            priority: data.priority || "Medium",
            status: data.status || "Open",
            isAnonymous: data.is_anonymous ?? false,
            createdAt: data.created_at || new Date().toISOString(),
            resolvedBy: data.resolved_by || undefined,
            resolvedByName: data.resolved_by_name || undefined,
            resolutionMessage: data.resolution_message || undefined,
            resolvedAt: data.resolved_at || undefined,
            messages: typeof data.messages === "string" ? JSON.parse(data.messages) : (data.messages || [])
          };
          db.grievanceTickets.push(restoredTicket);
          idx = db.grievanceTickets.length - 1;
        }
      } catch (e) {}
    }

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
