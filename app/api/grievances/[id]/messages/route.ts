import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { TicketMessage } from "@/src/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const ticketId = resolvedParams.id;

    const db = loadDatabase();
    if (!db.grievanceTickets) db.grievanceTickets = [];

    const ticketIdx = db.grievanceTickets.findIndex(t => t.id === ticketId);
    if (ticketIdx === -1) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const localMessages: TicketMessage[] = db.grievanceTickets[ticketIdx].messages || [];

    // If local DB has messages, return them
    if (localMessages.length > 0) {
      return NextResponse.json({ messages: localMessages });
    }

    // Otherwise try to fetch from Supabase grievance_messages (fallback after restart)
    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        const { data, error } = await dbClient
          .from("grievance_messages")
          .select("messages")
          .eq("ticket_id", ticketId)
          .single();

        if (!error && data && Array.isArray(data.messages) && data.messages.length > 0) {
          const supabaseMessages: TicketMessage[] = data.messages;

          // Sync back to local DB so future reads don't need Supabase
          db.grievanceTickets[ticketIdx].messages = supabaseMessages;
          saveDatabase(db);

          return NextResponse.json({ messages: supabaseMessages });
        }
      } catch (e) {
        console.warn("Grievance messages Supabase fetch exception:", e);
      }
    }

    return NextResponse.json({ messages: [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const ticketId = resolvedParams.id;
    const body = await request.json();
    const { senderId, senderName, senderRole, message } = body;

    if (!senderId || !message?.trim()) {
      return NextResponse.json({ error: "senderId and message are required" }, { status: 400 });
    }

    const db = loadDatabase();
    if (!db.grievanceTickets) db.grievanceTickets = [];

    let idx = db.grievanceTickets.findIndex(t => t.id === ticketId);

    const dbClient = supabaseAdmin || supabase;
    if (idx === -1 && dbClient) {
      try {
        const { data } = await dbClient.from("grievance_tickets").select("*").eq("id", ticketId).maybeSingle();
        if (data) {
          db.grievanceTickets.push({
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
            messages: typeof data.messages === "string" ? JSON.parse(data.messages) : (data.messages || [])
          });
          idx = db.grievanceTickets.length - 1;
        }
      } catch (e) {}
    }

    if (idx === -1) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    // If local messages are empty, try to restore from Supabase first
    if (!db.grievanceTickets[idx].messages || db.grievanceTickets[idx].messages!.length === 0) {
      if (dbClient) {
        try {
          const { data } = await dbClient
            .from("grievance_messages")
            .select("messages")
            .eq("ticket_id", ticketId)
            .single();
          if (data && Array.isArray(data.messages)) {
            db.grievanceTickets[idx].messages = data.messages;
          }
        } catch (e) {
          console.warn("Restore messages from Supabase exception:", e);
        }
      }
    }

    const newMessage: TicketMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ticketId,
      senderId,
      senderName: senderName || "User",
      senderRole: senderRole || "employee",
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };

    if (!db.grievanceTickets[idx].messages) {
      db.grievanceTickets[idx].messages = [];
    }
    db.grievanceTickets[idx].messages!.push(newMessage);

    saveDatabase(db);

    const allMessages = db.grievanceTickets[idx].messages || [];

    // Sync to Supabase: 1 row per ticket in grievance_messages, all messages in JSONB array
    if (dbClient) {
      try {
        const { error: msgErr } = await dbClient.from("grievance_messages").upsert(
          {
            ticket_id: ticketId,
            messages: allMessages,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "ticket_id" }
        );
        if (msgErr) console.error("Grievance messages Supabase upsert error:", msgErr.message);
      } catch (e) {
        console.warn("Grievance messages Supabase sync exception:", e);
      }
    }

    return NextResponse.json({ success: true, message: newMessage, ticket: db.grievanceTickets[idx] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to post message" }, { status: 500 });
  }
}
