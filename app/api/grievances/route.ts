import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { GrievanceTicket } from "@/src/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || "";
    const role = searchParams.get("role") || "employee";
    const employeeId = searchParams.get("employeeId") || "";

    const db = loadDatabase();
    let tickets: GrievanceTicket[] = db.grievanceTickets || [];

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        let query = dbClient.from("grievance_tickets").select("*");
        if (companyId) {
          query = query.or(`company_id.eq.${companyId},company_id.eq.,company_id.is.null`);
        }
        const { data, error } = await query.order("created_at", { ascending: false });

        if (!error && data && Array.isArray(data)) {
          const sbTickets: GrievanceTicket[] = data.map((row: any) => ({
            id: row.id,
            companyId: row.company_id || "",
            employeeId: row.employee_id || "",
            employeeName: row.employee_name || row.employeeName || "",
            title: row.title || "",
            description: row.description || "",
            category: row.category || "Other",
            priority: row.priority || "Medium",
            status: row.status || "Open",
            isAnonymous: row.is_anonymous ?? false,
            createdAt: row.created_at || new Date().toISOString(),
            resolvedBy: row.resolved_by || undefined,
            resolvedByName: row.resolved_by_name || undefined,
            resolutionMessage: row.resolution_message || undefined,
            resolvedAt: row.resolved_at || undefined,
            messages: typeof row.messages === "string" ? JSON.parse(row.messages) : (row.messages || [])
          }));

          const ticketMap = new Map<string, GrievanceTicket>();
          (tickets || []).forEach(t => { if (t && t.id) ticketMap.set(t.id, t); });
          sbTickets.forEach(t => { if (t && t.id) ticketMap.set(t.id, t); });
          tickets = Array.from(ticketMap.values());

          db.grievanceTickets = tickets;
          saveDatabase(db);
        }
      } catch (e) {
        console.warn("Supabase grievance fetch exception in GET /api/grievances:", e);
      }
    }

    // Filter by company
    if (companyId) {
      tickets = tickets.filter(t => !t.companyId || t.companyId === companyId || t.companyId === "default" || t.companyId === "");
    }

    // Employees only see their own
    if (role === "employee" && employeeId) {
      tickets = tickets.filter(t => t.employeeId === employeeId);
    }

    // Sort newest first
    tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json({ tickets });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch tickets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyId, employeeId, employeeName, title, description, category, priority, isAnonymous } = body;

    if (!title || !description || !employeeId) {
      return NextResponse.json({ error: "title, description, and employeeId are required" }, { status: 400 });
    }

    const ticket: GrievanceTicket = {
      id: `grv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      companyId: companyId || "",
      employeeId,
      employeeName: isAnonymous ? "Anonymous" : (employeeName || employeeId),
      title,
      description,
      category: category || "Other",
      priority: priority || "Medium",
      status: "Open",
      isAnonymous: !!isAnonymous,
      createdAt: new Date().toISOString(),
    };

    const db = loadDatabase();
    if (!db.grievanceTickets) db.grievanceTickets = [];
    db.grievanceTickets.unshift(ticket);
    saveDatabase(db);

    // Sync to Supabase
    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        const { error } = await dbClient.from("grievance_tickets").upsert({
          id: ticket.id,
          company_id: ticket.companyId || "",
          employee_id: ticket.employeeId || "",
          employee_name: ticket.employeeName || "",
          title: ticket.title || "",
          description: ticket.description || "",
          category: ticket.category || "Other",
          priority: ticket.priority || "Medium",
          status: ticket.status || "Open",
          is_anonymous: ticket.isAnonymous ?? false,
          created_at: ticket.createdAt,
          resolution_message: null,
          resolved_by: null,
          resolved_by_name: null,
          resolved_at: null,
          messages: ticket.messages || [],
        }, { onConflict: "id" });
        if (error) {
          console.error("Grievance insert Supabase error:", error.message, error.details);
        } else {
          console.log("Successfully created grievance ticket in Supabase:", ticket.id);
        }
      } catch (e) { console.warn("Grievance Supabase sync exception:", e); }
    }

    return NextResponse.json({ success: true, ticket });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create ticket" }, { status: 500 });
  }
}
