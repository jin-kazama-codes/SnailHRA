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

    // Filter by company
    if (companyId) tickets = tickets.filter(t => (t.companyId || "") === companyId);

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
