import React, { useState, useEffect, useRef } from "react";
import {
  AlertTriangle, Plus, X, Search, Kanban,
  List, Clock, CheckCircle, XCircle, MessageSquareWarning,
  RefreshCw, Loader2, Shield, User, FileText, Sparkles,
  ChevronLeft, ChevronRight, EyeOff, Inbox, Tag, Calendar, Send, MessageSquare
} from "lucide-react";
import { GrievanceTicket, Employee, TicketMessage } from "../types";
import { supabase } from "../lib/supabase-browser";

interface GrievanceViewProps {
  role: "admin" | "hr" | "employee";
  currentEmployee: Employee | undefined;
  companyId: string;
  employees: Employee[];
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const CATEGORIES = ["HR Policy", "Workplace", "Payroll", "IT", "Safety", "Conduct", "Benefits", "Other"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
const STATUSES = ["Open", "In Progress", "Resolved", "Rejected", "Closed"] as const;

const priorityColor: Record<string, string> = {
  Low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  High: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Urgent: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

const statusColor: Record<string, string> = {
  Open: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  "In Progress": "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  Resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  Closed: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const statusIcon: Record<string, React.ReactNode> = {
  Open: <Clock className="w-3.5 h-3.5" />,
  "In Progress": <RefreshCw className="w-3.5 h-3.5" />,
  Resolved: <CheckCircle className="w-3.5 h-3.5" />,
  Rejected: <XCircle className="w-3.5 h-3.5" />,
  Closed: <Shield className="w-3.5 h-3.5" />,
};

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${dateStr}, ${timeStr}`;
}

export default function GrievanceView({ role, currentEmployee, companyId, employees, showToast }: GrievanceViewProps) {
  const [tickets, setTickets] = useState<GrievanceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<GrievanceTicket | null>(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Raise ticket form state
  const emptyForm = { title: "", description: "", category: "Other", priority: "Medium" as typeof PRIORITIES[number], isAnonymous: false };
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Resolution panel state
  const [resolutionStatus, setResolutionStatus] = useState("");
  const [resolutionMessage, setResolutionMessage] = useState("");
  const [resolving, setResolving] = useState(false);

  // Ticket Chat State
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const modalBodyRef = useRef<HTMLDivElement | null>(null);
  const initialScrollDoneRef = useRef(false);
  const messageChannelRef = useRef<any>(null);

  const isHRAdmin = role === "admin" || role === "hr";

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ companyId, role });
      if (role === "employee" && currentEmployee?.id) params.set("employeeId", currentEmployee.id);
      const res = await fetch(`/api/grievances?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchTicketMessages = async (ticketId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await fetch(`/api/grievances/${ticketId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setTicketMessages(data.messages || []);
      }
    } catch (e) { console.error(e); }
    if (!silent) setLoadingMessages(false);
  };

  // Initial fetch + Supabase Realtime subscription for tickets list (0 polling API calls)
  useEffect(() => {
    fetchTickets();

    if (supabase) {
      const channel = supabase
        .channel("realtime:grievance_tickets")
        .on("postgres_changes", { event: "*", schema: "public", table: "grievance_tickets" }, () => {
          fetchTickets();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [companyId, role]);

  // Pure Supabase Realtime WebSocket subscription for ticket messages (0 polling API calls)
  useEffect(() => {
    if (selectedTicket) {
      initialScrollDoneRef.current = false;
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTop = 0;
      }
      setResolutionStatus(selectedTicket.status);
      setResolutionMessage(selectedTicket.resolutionMessage || "");
      fetchTicketMessages(selectedTicket.id);

      if (supabase) {
        const channel = supabase.channel(`ticket_chat_${selectedTicket.id}`, {
          config: { broadcast: { self: true } },
        });

        channel
          .on("broadcast", { event: "new_message" }, (data: any) => {
            const msgs = data?.payload?.messages || data?.messages;
            if (Array.isArray(msgs)) {
              setTicketMessages(msgs);
              setTimeout(() => {
                if (chatContainerRef.current) {
                  chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                }
              }, 50);
            }
          })
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "grievance_messages",
            },
            (payload: any) => {
              const newRow = payload.new;
              if (newRow && (newRow.ticket_id === selectedTicket.id || newRow.ticketId === selectedTicket.id) && Array.isArray(newRow.messages)) {
                setTicketMessages(newRow.messages);
                setTimeout(() => {
                  if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                  }
                }, 50);
              }
            }
          )
          .subscribe();

        messageChannelRef.current = channel;
      }

      return () => {
        if (supabase && messageChannelRef.current) {
          supabase.removeChannel(messageChannelRef.current);
          messageChannelRef.current = null;
        }
      };
    } else {
      setTicketMessages([]);
      setChatInput("");
    }
  }, [selectedTicket]);

  useEffect(() => {
    if (selectedTicket && ticketMessages.length > 0 && !initialScrollDoneRef.current) {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
      initialScrollDoneRef.current = true;
    }
  }, [ticketMessages, selectedTicket]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTicket || !chatInput.trim() || sendingMessage) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/grievances/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentEmployee?.id || role,
          senderName: currentEmployee?.fullName || (role === "admin" ? "Admin" : "HR"),
          senderRole: role,
          message: chatInput,
        }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        const newMessages = data.ticket?.messages || [];
        setTicketMessages(newMessages);
        setChatInput("");
        if (data.ticket) {
          setTickets(prev => prev.map(t => t.id === data.ticket.id ? data.ticket : t));
        }

        // Broadcast to all connected clients over WebSocket instantly
        if (messageChannelRef.current) {
          messageChannelRef.current.send({
            type: "broadcast",
            event: "new_message",
            payload: { messages: newMessages, ticketId: selectedTicket.id },
            messages: newMessages,
          });
        }

        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }, 50);
      } else {
        showToast(data.error || "Failed to send message", "error");
      }
    } catch (e) {
      showToast("Failed to send message", "error");
    }
    setSendingMessage(false);
  };

  const handleRaise = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      showToast("Title and description are required", "error"); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/grievances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, employeeId: currentEmployee?.id, employeeName: currentEmployee?.fullName, ...form }),
      });
      const data = await res.json();
      if (res.ok) {
        setTickets(prev => [data.ticket, ...prev]);
        setShowRaiseModal(false);
        setForm(emptyForm);
        showToast("Ticket raised successfully!", "success");
      } else { showToast(data.error || "Failed to raise ticket", "error"); }
    } catch (e) { showToast("Network error", "error"); }
    setSubmitting(false);
  };

  const handleResolve = async () => {
    if (!selectedTicket) return;
    if (!resolutionStatus) { showToast("Please select a status", "error"); return; }
    setResolving(true);
    try {
      const res = await fetch(`/api/grievances/${selectedTicket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: resolutionStatus, resolutionMessage, resolvedBy: currentEmployee?.id, resolvedByName: currentEmployee?.fullName }),
      });
      const data = await res.json();
      if (res.ok && data.ticket) {
        setTickets(prev => prev.map(t => t.id === data.ticket.id ? data.ticket : t));
        setSelectedTicket(data.ticket);
        showToast("Ticket status updated!", "success");
      } else { showToast(data.error || "Update failed", "error"); }
    } catch (e) { showToast("Network error", "error"); }
    setResolving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this ticket permanently?")) return;
    try {
      await fetch(`/api/grievances/${id}`, { method: "DELETE" });
      setTickets(prev => prev.filter(t => t.id !== id));
      if (selectedTicket?.id === id) setSelectedTicket(null);
      showToast("Ticket deleted.", "info");
    } catch (e) { showToast("Failed to delete ticket", "error"); }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterPriority, searchQuery]);

  const filteredTickets = tickets.filter(t => {
    const matchStatus = filterStatus === "All" || t.status === filterStatus ||
      (filterStatus === "Closed / Rejected" && (t.status === "Closed" || t.status === "Rejected"));
    const matchPriority = filterPriority === "All" || t.priority === filterPriority;
    const matchSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchPriority && matchSearch;
  });

  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE) || 1;
  const paginatedTickets = filteredTickets.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, filteredTickets.length);

  const kanbanColumns = [
    { label: "Open", statuses: ["Open"], accent: "bg-sky-400", border: "border-sky-300/40", bg: "bg-sky-50/40 dark:bg-sky-900/10" },
    { label: "In Progress", statuses: ["In Progress"], accent: "bg-violet-400", border: "border-violet-300/40", bg: "bg-violet-50/40 dark:bg-violet-900/10" },
    { label: "Resolved / Rejected", statuses: ["Resolved", "Rejected"], accent: "bg-emerald-400", border: "border-emerald-300/40", bg: "bg-emerald-50/40 dark:bg-emerald-900/10" },
    { label: "Closed", statuses: ["Closed"], accent: "bg-slate-400", border: "border-slate-200/60", bg: "bg-slate-50/40 dark:bg-slate-800/20" },
  ];

  const getResponderRole = (t: GrievanceTicket) => {
    if (!t.resolvedBy) return "Response";
    const emp = employees.find(e => e.id === t.resolvedBy);
    if (emp) {
      if (emp.role === "admin" || emp.role === "super_admin") return "Admin";
      if (emp.role === "hr") return "HR";
      return emp.role.toUpperCase();
    }
    return "Response";
  };

  // Employee-facing status pill filter
  const empStatusFilters = ["All", "Open", "In Progress", "Resolved", "Closed", "Rejected"];
  const empStatusAccent: Record<string, string> = {
    All: "bg-violet-600 text-white",
    Open: "bg-sky-500 text-white",
    "In Progress": "bg-amber-500 text-white",
    Resolved: "bg-emerald-500 text-white",
    Closed: "bg-slate-500 text-white",
    Rejected: "bg-rose-500 text-white",
  };
  const empStatusInactive = "bg-white dark:bg-[#111] border border-slate-200 dark:border-[#2a2a2a] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1a1a1a]";

  const ticketAccentBar: Record<string, string> = {
    Open: "bg-sky-500",
    "In Progress": "bg-amber-500",
    Resolved: "bg-emerald-500",
    Rejected: "bg-rose-500",
    Closed: "bg-slate-400",
  };

  return (
    <div className="relative">
      {/* === EMPLOYEE UI === */}
      {!isHRAdmin && (
        <div className="space-y-0">
          {/* Simple Header */}
          <div className="px-4 sm:px-6 pt-5 pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <MessageSquareWarning className="w-5 h-5 text-violet-500" /> Support &amp; Grievance
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Raise and track your support requests</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchTickets} className="p-2 rounded-xl border border-slate-200 dark:border-[#2a2a2a] text-slate-500 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowRaiseModal(true)}
                className="flex items-center gap-1.5 bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Raise Ticket
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-4 sm:px-6 pb-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tickets by title or category…"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
              />
            </div>
          </div>

          {/* Status pill tabs */}
          <div className="px-6 py-3 bg-slate-50 dark:bg-[#0a0a0a] border-b border-slate-100 dark:border-[#1a1a1a] flex items-center gap-2 overflow-x-auto scrollbar-none">
            {empStatusFilters.map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                  filterStatus === st ? empStatusAccent[st] ?? "bg-violet-600 text-white" : empStatusInactive
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Ticket list for employee */}
          <div className="p-4 sm:p-6 space-y-4">
            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
              </div>
            )}

            {/* Empty — no tickets */}
            {!loading && tickets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-950/30 dark:to-indigo-950/30 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-violet-500" />
                </div>
                <p className="font-bold text-slate-700 dark:text-slate-200 text-base">No tickets yet</p>
                <p className="text-xs text-slate-400 mt-1 mb-5">Start by raising your first support request.</p>
                <button
                  onClick={() => setShowRaiseModal(true)}
                  className="flex items-center gap-1.5 bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Raise a Ticket
                </button>
              </div>
            )}

            {/* Empty — filtered */}
            {!loading && tickets.length > 0 && filteredTickets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-[#0f0f0f] rounded-2xl border border-slate-100 dark:border-[#1e1e1e]">
                <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">No {filterStatus === "All" ? "" : filterStatus} tickets found</p>
                <button onClick={() => { setFilterStatus("All"); setSearchQuery(""); }} className="mt-3 text-xs text-violet-600 dark:text-violet-400 font-semibold hover:underline cursor-pointer">
                  Clear Filter
                </button>
              </div>
            )}

            {/* Employee ticket cards - 2 per row */}
            {!loading && filteredTickets.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {paginatedTickets.map((ticket, index) => {
                    const accentBar = ticketAccentBar[ticket.status] || "bg-slate-300";
                    const seqNum = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                    return (
                    <button
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className="w-full h-full text-left bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1e1e1e] rounded-2xl overflow-hidden hover:shadow-md hover:border-violet-200 dark:hover:border-violet-800/50 transition-all group cursor-pointer"
                    >
                      <div className="flex h-full">
                        {/* Color accent bar tied to status */}
                        <div className={`w-1.5 shrink-0 self-stretch ${accentBar}`} />
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Badges */}
                              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded-md border border-violet-200/50 dark:border-violet-800/40">
                                  #{seqNum}
                                </span>
                                <span className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${statusColor[ticket.status] || statusColor["Open"]}`}>
                                  {statusIcon[ticket.status]}<span>{ticket.status}</span>
                                </span>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${priorityColor[ticket.priority]}`}>{ticket.priority}</span>
                                <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                                  <Tag className="w-3 h-3" />{ticket.category}
                                </span>
                              </div>
                              {/* Title */}
                              <p className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-1">{ticket.title}</p>
                              {/* Description */}
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 leading-relaxed">{ticket.description}</p>

                              {/* Response bubble */}
                              {ticket.resolutionMessage && (
                                <div className="mt-2.5 bg-violet-50 dark:bg-violet-950/20 border-l-2 border-violet-400 rounded-r-xl px-3 py-2 flex items-start gap-2">
                                  <span className="bg-violet-600 text-white font-bold text-[8px] uppercase px-1.5 py-0.5 rounded shrink-0 mt-px">{getResponderRole(ticket)}</span>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">{ticket.resolutionMessage}</p>
                                </div>
                              )}
                            </div>
                            {/* Date + arrow */}
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                <Calendar className="w-3 h-3" />{formatDateTime(ticket.createdAt)}
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 transition-colors" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                </div>

                {/* Pagination */}
                {filteredTickets.length > ITEMS_PER_PAGE && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-[#1a1a1a]">
                    <p className="text-xs text-slate-500">
                      Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{startIndex}</span> &ndash; <span className="font-semibold text-slate-700 dark:text-slate-200">{endIndex}</span> of <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredTickets.length}</span>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                        className="p-2 rounded-xl border border-slate-200 dark:border-[#2a2a2a] text-slate-500 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button key={page} type="button" onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            currentPage === page ? "bg-violet-600 text-white shadow-sm" : "border border-slate-200 dark:border-[#2a2a2a] text-slate-500 hover:bg-slate-50 dark:hover:bg-[#1a1a1a]"
                          }`}>{page}</button>
                      ))}
                      <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                        className="p-2 rounded-xl border border-slate-200 dark:border-[#2a2a2a] text-slate-500 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* === ADMIN / HR UI === */}
      {isHRAdmin && (
      <div className="p-4 sm:p-6 space-y-5 relative">

      {/* Interactive Stats Cards (HR/Admin only) */}
      {isHRAdmin && tickets.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total Tickets", statusKey: "All", count: tickets.length, color: "text-slate-800 dark:text-white", badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", activeBg: "bg-slate-100/70 dark:bg-[#1a1a1a] border-slate-300 dark:border-slate-700" },
            { label: "Open", statusKey: "Open", count: tickets.filter(t => t.status === "Open").length, color: "text-sky-600 dark:text-sky-400", badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300", activeBg: "bg-sky-50/80 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/60" },
            { label: "In Progress", statusKey: "In Progress", count: tickets.filter(t => t.status === "In Progress").length, color: "text-violet-600 dark:text-violet-400", badge: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300", activeBg: "bg-violet-50/80 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800/60" },
            { label: "Resolved", statusKey: "Resolved", count: tickets.filter(t => t.status === "Resolved").length, color: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", activeBg: "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60" },
            { label: "Closed / Rejected", statusKey: "Closed / Rejected", count: tickets.filter(t => t.status === "Closed" || t.status === "Rejected").length, color: "text-rose-600 dark:text-rose-400", badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300", activeBg: "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60" },
          ].map(s => {
            const isActive = filterStatus === s.statusKey;
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => setFilterStatus(s.statusKey)}
                className={`text-left border rounded-2xl p-4 flex flex-col justify-between transition-all cursor-pointer ${
                  isActive
                    ? `${s.activeBg} shadow-xs font-semibold`
                    : "bg-white dark:bg-[#0f0f0f] border-slate-200/60 dark:border-[#1e1e1e] hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{s.label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badge}`}>
                    {s.count}
                  </span>
                </div>
                <span className={`text-2xl font-black mt-2 ${s.color}`}>{s.count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters (HR/Admin only) */}
      {isHRAdmin && (
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search tickets, employees, category…"
              className="pl-9 pr-3 py-2.5 w-full text-xs rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-xs py-2.5 px-3 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30">
            <option value="All">All Statuses</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
            className="text-xs py-2.5 px-3 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30">
            <option value="All">All Priorities</option>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
        </div>
      )}

      {/* Empty (no tickets overall) */}
      {!loading && tickets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Inbox className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
          <p className="font-semibold text-slate-500 dark:text-slate-400">No tickets yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {isHRAdmin ? "No grievances have been raised by employees." : "You haven't raised any support tickets."}
          </p>
          {!isHRAdmin && (
            <button onClick={() => setShowRaiseModal(true)} className="mt-5 flex items-center space-x-2 bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow cursor-pointer">
              <Plus className="w-4 h-4" /><span>Raise a Ticket</span>
            </button>
          )}
        </div>
      )}

      {/* Empty (filtered results empty) */}
      {!loading && tickets.length > 0 && filteredTickets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-[#0f0f0f] rounded-2xl border border-slate-200/70 dark:border-[#1e1e1e] p-8">
          <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">No tickets found</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            No tickets match the selected status filter <span className="font-semibold text-slate-600 dark:text-slate-300">"{filterStatus}"</span>.
          </p>
          <button onClick={() => { setFilterStatus("All"); setFilterPriority("All"); setSearchQuery(""); }} className="mt-4 text-xs text-violet-600 dark:text-violet-400 font-semibold hover:underline cursor-pointer">
            Clear Filter &amp; Show All
          </button>
        </div>
      )}

      {/* List View - 2 Tickets per row */}
      {!loading && viewMode === "list" && filteredTickets.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paginatedTickets.map((ticket, index) => {
              const seqNum = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
              return (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="w-full text-left bg-white dark:bg-[#0f0f0f] border border-slate-200/70 dark:border-[#1e1e1e] rounded-2xl p-4 hover:border-violet-400/60 dark:hover:border-violet-500/50 hover:shadow-md transition-all group cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3.5 relative overflow-hidden"
              >
                {/* Status Color Accent Bar on Left */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${ticketAccentBar[ticket.status] || "bg-violet-500"}`} />

                <div className="pl-3.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded-md border border-violet-200/50 dark:border-violet-800/40">
                      #{seqNum}
                    </span>
                    <span className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${statusColor[ticket.status] || statusColor["Open"]}`}>
                      {statusIcon[ticket.status]}<span>{ticket.status}</span>
                    </span>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${priorityColor[ticket.priority]}`}>{ticket.priority}</span>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#1a1a1a] px-2.5 py-0.5 rounded-full">{ticket.category}</span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors truncate">
                    {ticket.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 leading-relaxed">
                    {ticket.description}
                  </p>

                  {ticket.resolutionMessage && (
                    <div className="mt-2 bg-violet-50/60 dark:bg-violet-950/20 border-l-2 border-violet-500 rounded-r-lg p-2 flex items-center gap-2">
                      <span className="bg-violet-600 text-white font-bold text-[8px] uppercase px-1.5 py-0.2 rounded shrink-0">
                        {getResponderRole(ticket)}
                      </span>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate">
                        {ticket.resolutionMessage}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pl-3.5 md:pl-0 flex items-center gap-4 shrink-0 border-t md:border-t-0 border-slate-100 dark:border-[#1a1a1a] pt-2.5 md:pt-0">
                  {isHRAdmin && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                      {ticket.isAnonymous ? <EyeOff className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <User className="w-3.5 h-3.5 text-violet-500 shrink-0" />}
                      <span className="truncate max-w-[120px]">{ticket.isAnonymous ? "Anonymous" : ticket.employeeName}</span>
                    </span>
                  )}
                  <span className="text-xs text-slate-400 shrink-0">{formatDateTime(ticket.createdAt)}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 transition-colors shrink-0" />
                </div>
              </button>
            );
          })}
          </div>

          {/* Pagination bar */}
          {filteredTickets.length > ITEMS_PER_PAGE && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-[#1a1a1a]">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{startIndex}</span> &ndash; <span className="font-semibold text-slate-700 dark:text-slate-200">{endIndex}</span> of <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredTickets.length}</span> tickets
              </p>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl border border-slate-200 dark:border-[#2a2a2a] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-xl text-xs font-semibold transition-all cursor-pointer ${currentPage === page ? "bg-violet-600 text-white shadow-sm" : "border border-slate-200 dark:border-[#2a2a2a] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1a1a1a]"}`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl border border-slate-200 dark:border-[#2a2a2a] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Kanban View */}
      {!loading && viewMode === "kanban" && isHRAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kanbanColumns.map(col => {
            const colTickets = filteredTickets.filter(t => col.statuses.includes(t.status));
            return (
              <div key={col.label} className={`rounded-2xl border ${col.border} ${col.bg} p-3 flex flex-col gap-2 min-h-[180px]`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${col.accent} shrink-0`} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{col.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 bg-white dark:bg-[#1a1a1a] rounded-full px-2 py-0.5 shadow-sm">{colTickets.length}</span>
                </div>
                {colTickets.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No tickets</p>}
                {colTickets.map(t => (
                  <button key={t.id} onClick={() => setSelectedTicket(t)}
                    className="text-left bg-white dark:bg-[#111] rounded-xl p-3 shadow-sm border border-slate-100 dark:border-[#222] hover:border-violet-400/60 transition-all cursor-pointer group">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug line-clamp-2">{t.title}</p>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-violet-400 shrink-0 mt-0.5 transition-colors" />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${priorityColor[t.priority]}`}>{t.priority}</span>
                      <span className="text-[10px] text-slate-400">{t.isAnonymous ? "Anonymous" : t.employeeName}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{formatDate(t.createdAt)}</p>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
      </div>
      )}

      {/* Shared Modals - available to all roles */}

      {/* Support Ticket Chat & Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedTicket(null)} />
          <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-[#0f0f0f] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-[#1e1e1e] flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 dark:border-[#1a1a1a] bg-slate-50/50 dark:bg-[#121212]/50">
              <div className="space-y-1.5 min-w-0 pr-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${statusColor[selectedTicket.status] || statusColor["Open"]}`}>
                    {statusIcon[selectedTicket.status]}<span>{selectedTicket.status}</span>
                  </span>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${priorityColor[selectedTicket.priority]}`}>{selectedTicket.priority}</span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#1a1a1a] px-2.5 py-0.5 rounded-full">{selectedTicket.category}</span>
                </div>
                <h2 className="text-base font-bold text-slate-800 dark:text-white break-words leading-snug">{selectedTicket.title}</h2>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    {selectedTicket.isAnonymous ? <EyeOff className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5 text-violet-500" />}
                    <span>{selectedTicket.isAnonymous ? "Submitted anonymously" : selectedTicket.employeeName}</span>
                  </span>
                  <span>&bull;</span>
                  <span>{formatDateTime(selectedTicket.createdAt)}</span>
                </div>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-[#1a1a1a] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div ref={modalBodyRef} className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* HR / Admin Ticket Status Controller on top of Issue Description */}
              {isHRAdmin && (
                <div className="bg-slate-50 dark:bg-[#151515] p-3.5 rounded-2xl border border-slate-200/80 dark:border-[#222] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update Ticket Status:</span>
                    <select
                      value={resolutionStatus}
                      onChange={e => setResolutionStatus(e.target.value)}
                      className="text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 cursor-pointer shadow-xs"
                    >
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResolve}
                      disabled={resolving}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white px-3.5 py-1.5 rounded-xl cursor-pointer transition-all disabled:opacity-50 shadow-xs"
                    >
                      {resolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                      <span>Update Status</span>
                    </button>
                    {role === "admin" && (
                      <button
                        type="button"
                        onClick={() => handleDelete(selectedTicket.id)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
              {/* Ticket Original Description */}
              <div className="bg-violet-50/60 dark:bg-violet-950/20 border-l-4 border-violet-500 rounded-r-2xl p-4">
                <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">Issue Description</p>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              {/* Chat Thread Header */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-violet-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Ticket Messages & Discussion</span>
                  <span className="text-[11px] font-semibold text-violet-600 bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded-full">{ticketMessages.length}</span>
                </div>
                {loadingMessages && <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin" />}
              </div>

              {/* Chat Thread Messages Box */}
              <div ref={chatContainerRef} className="space-y-3 min-h-[160px] max-h-[300px] overflow-y-auto p-4 bg-slate-50/70 dark:bg-[#121212] rounded-2xl border border-slate-100 dark:border-[#1e1e1e]">
                {ticketMessages.length === 0 && !loadingMessages && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquareWarning className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No chat messages yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Send a message below to communicate directly about this ticket.</p>
                  </div>
                )}

                {ticketMessages.map(msg => {
                  const isMe = msg.senderId === currentEmployee?.id || (msg.senderRole === role && msg.senderName === (currentEmployee?.fullName || (role === "admin" ? "Admin" : "HR")));
                  const roleBadgeColor = msg.senderRole === "admin" ? "bg-purple-600" : msg.senderRole === "hr" ? "bg-violet-600" : "bg-sky-600";

                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">{msg.senderName}</span>
                        <span className={`text-[8px] font-bold text-white uppercase px-1.5 py-0.2 rounded ${roleBadgeColor}`}>{msg.senderRole}</span>
                        <span>&bull;</span>
                        <span>{formatDateTime(msg.createdAt)}</span>
                      </div>
                      <div className={`max-w-[85%] text-xs py-2.5 px-3.5 leading-relaxed ${
                        isMe
                          ? "bg-violet-600 text-white rounded-2xl rounded-tr-xs shadow-xs"
                          : "bg-white dark:bg-[#1c1c1c] text-slate-800 dark:text-slate-100 border border-slate-200/70 dark:border-[#2a2a2a] rounded-2xl rounded-tl-xs shadow-xs"
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Reply Form */}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-1">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Type a message or response..."
                  className="flex-1 text-xs py-2.5 px-4 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
                />
                <button
                  type="submit"
                  disabled={sendingMessage || !chatInput.trim()}
                  className="flex items-center gap-1.5 bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-all shadow-sm shrink-0"
                >
                  {sendingMessage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Raise Ticket Modal */}
      {showRaiseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowRaiseModal(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#0f0f0f] rounded-3xl shadow-2xl border border-slate-100 dark:border-[#1a1a1a]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#1a1a1a]">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-violet-500" />
                <h2 className="font-bold text-sm text-slate-800 dark:text-white">Raise a Support Ticket</h2>
              </div>
              <button onClick={() => setShowRaiseModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1a1a1a] cursor-pointer">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Brief summary of your issue"
                  className="w-full text-sm py-2.5 px-3 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full text-sm py-2.5 px-3 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Priority</label>
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as any }))}
                    className="w-full text-sm py-2.5 px-3 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30">
                    {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Description *</label>
                <textarea rows={4} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe the issue in detail. Include dates, names, or relevant context."
                  className="w-full text-sm py-2.5 px-3 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none" />
              </div>
              <label className="flex items-center space-x-3 cursor-pointer" onClick={() => setForm(p => ({ ...p, isAnonymous: !p.isAnonymous }))}>
                <div className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${form.isAnonymous ? "bg-violet-500" : "bg-slate-200 dark:bg-[#333]"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isAnonymous ? "left-5" : "left-0.5"}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Submit Anonymously</p>
                  <p className="text-[11px] text-slate-400">Your name will be hidden from HR &amp; Admin</p>
                </div>
              </label>
            </div>
            <div className="flex gap-3 px-6 pb-5">
              <button onClick={() => setShowRaiseModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#2a2a2a] text-sm font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] cursor-pointer">Cancel</button>
              <button onClick={handleRaise} disabled={submitting} className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-br from-violet-600 to-indigo-600 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl cursor-pointer shadow-md">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>{submitting ? "Submitting…" : "Submit Ticket"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
