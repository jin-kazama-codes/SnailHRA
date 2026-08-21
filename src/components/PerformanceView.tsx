import React, { useState, useEffect } from "react";
import {
  TrendingUp, Plus, X, Star, Search, ChevronRight, RefreshCw,
  Loader2, User, AlertTriangle, Award, ThumbsUp, Scale,
  Clock, FileText, Inbox, ChevronDown, Calendar
} from "lucide-react";
import { PerformanceRecord, Fine, Employee } from "../types";
import { toBranchName, toBranchId } from "../lib/branchUtils";

interface PerformanceViewProps {
  role: "admin" | "hr" | "employee";
  currentEmployee: Employee | undefined;
  companyId: string;
  employees: Employee[];
  fines: Fine[]; // auto-surfaced from Fines module
  selectedBranch?: string;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

type RecordType = "Appraisal" | "Incident" | "Commendation" | "Disciplinary";
type Tab = "board" | "spotlight";

const RECORD_TYPES: RecordType[] = ["Appraisal", "Incident", "Commendation", "Disciplinary"];

const typeStyle: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  Appraisal: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: <Star className="w-3.5 h-3.5" />, label: "Appraisal" },
  Incident: { color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Incident" },
  Commendation: { color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", icon: <ThumbsUp className="w-3.5 h-3.5" />, label: "Commendation" },
  Disciplinary: { color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Disciplinary" },
  Fine: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: <Scale className="w-3.5 h-3.5" />, label: "Fine" },
};

function formatDate(iso: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function StarRating({ rating, max = 5, onChange }: { rating: number; max?: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <button key={i} type="button"
          onClick={() => onChange && onChange(i + 1)}
          className={`${onChange ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"}`}>
          <Star className={`w-4 h-4 ${i < rating ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-700"}`} />
        </button>
      ))}
    </div>
  );
}

export default function PerformanceView({ role, currentEmployee, companyId, employees, fines, selectedBranch = "All Branches", showToast }: PerformanceViewProps) {
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("board");
  const [filterType, setFilterType] = useState("All");
  const [filterEmployee, setFilterEmployee] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [spotlightEmployee, setSpotlightEmployee] = useState<Employee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isHRAdmin = role === "admin" || role === "hr";

  // Form state
  const emptyForm = {
    employeeId: "", type: "Appraisal" as RecordType, period: "",
    summary: "", overallRating: 0, incidentDate: "", actionTaken: "",
  };
  const [form, setForm] = useState(emptyForm);

  // Convert fines to virtual PerformanceRecord-like objects for display
  const fineRecords: (PerformanceRecord & { _isFine: boolean })[] = fines
    .filter(f => {
      if (!isHRAdmin) return f.employeeId === currentEmployee?.id;
      return true;
    })
    .map(f => {
      const emp = employees.find(e => e.id === f.employeeId);
      return {
        id: f.id,
        companyId: companyId,
        employeeId: f.employeeId,
        employeeName: f.employeeName || emp?.fullName || f.employeeId,
        reviewerId: "",
        reviewerName: "System",
        type: "Fine" as any,
        period: f.date?.substring(0, 7) || "",
        summary: `Fine: ${f.reason} - ₹${f.amount?.toLocaleString("en-IN")} (${f.status})`,
        incidentDate: f.date,
        createdAt: f.date,
        sourceId: f.id,
        _isFine: true,
      };
    });

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ companyId, role });
      if (role === "employee" && currentEmployee?.id) params.set("employeeId", currentEmployee.id);
      const res = await fetch(`/api/performance/records?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [companyId, role]);

  const handleAdd = async () => {
    if (!form.employeeId || !form.summary.trim()) {
      showToast("Employee and summary are required", "error"); return;
    }
    setSubmitting(true);
    try {
      const emp = employees.find(e => e.id === form.employeeId);
      const res = await fetch("/api/performance/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          employeeId: form.employeeId,
          employeeName: emp?.fullName || form.employeeId,
          reviewerId: currentEmployee?.id,
          reviewerName: currentEmployee?.fullName,
          type: form.type,
          period: form.period,
          summary: form.summary,
          overallRating: form.overallRating || undefined,
          incidentDate: form.incidentDate || undefined,
          actionTaken: form.actionTaken || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRecords(prev => [data.record, ...prev]);
        setShowAddModal(false);
        setForm(emptyForm);
        showToast("Performance record added!", "success");
      } else { showToast(data.error || "Failed to add record", "error"); }
    } catch (e) { showToast("Network error", "error"); }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    try {
      await fetch(`/api/performance/records/${id}`, { method: "DELETE" });
      setRecords(prev => prev.filter(r => r.id !== id));
      showToast("Record deleted.", "info");
    } catch (e) { showToast("Failed to delete", "error"); }
  };

  // Branch filtered records
  const branchFilteredRecords = records.filter(r => {
    if (selectedBranch && selectedBranch !== "All Branches") {
      const emp = employees.find(e => e.id === r.employeeId);
      const itemBranch = r.branch || emp?.branch;
      if (itemBranch) {
        const cleanItem = toBranchName(itemBranch).trim().toLowerCase();
        const cleanTarget = toBranchName(selectedBranch).trim().toLowerCase();
        const idItem = toBranchId(itemBranch);
        const idTarget = toBranchId(selectedBranch);
        return cleanItem === cleanTarget || (idItem && idTarget && idItem === idTarget);
      }
      return false;
    }
    return true;
  });

  // Merge stored records + virtual fine records for display
  const allDisplayRecords = [
    ...branchFilteredRecords,
    ...fineRecords,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredRecords = allDisplayRecords.filter(r => {
    const matchType = filterType === "All" || r.type === filterType;
    const matchEmp = filterEmployee === "All" || r.employeeId === filterEmployee;
    const matchSearch = !searchQuery || r.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchEmp && matchSearch;
  });

  // Stats
  const appraisalCount = allDisplayRecords.filter(r => r.type === "Appraisal").length;
  const incidentCount = allDisplayRecords.filter(r => r.type === "Incident").length;
  const commendationCount = allDisplayRecords.filter(r => r.type === "Commendation").length;
  const fineCount = fineRecords.length;
  const avgRating = (() => {
    const rated = allDisplayRecords.filter(r => r.type === "Appraisal" && r.overallRating);
    if (!rated.length) return null;
    return (rated.reduce((s, r) => s + (r.overallRating || 0), 0) / rated.length).toFixed(1);
  })();

  // Spotlight employee data
  const spotlightRecords = spotlightEmployee
    ? allDisplayRecords.filter(r => r.employeeId === spotlightEmployee.id)
    : [];
  const spotlightRated = spotlightRecords.filter(r => r.type === "Appraisal" && r.overallRating);
  const spotlightAvg = spotlightRated.length
    ? (spotlightRated.reduce((s, r) => s + (r.overallRating || 0), 0) / spotlightRated.length).toFixed(1)
    : null;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Performance Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isHRAdmin ? "Track appraisals, incidents, commendations & fines" : "View your performance history"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchRecords} className="p-2 rounded-xl border border-slate-200 dark:border-[#2a2a2a] text-slate-500 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          {isHRAdmin && (
            <button onClick={() => setShowAddModal(true)} className="flex items-center space-x-2 bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all">
              <Plus className="w-4 h-4" /><span>Add Record</span>
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Appraisals", typeKey: "Appraisal", count: appraisalCount, color: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", activeBg: "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60", icon: <Star className="w-3.5 h-3.5" /> },
          { label: "Incidents", typeKey: "Incident", count: incidentCount, color: "text-orange-600 dark:text-orange-400", badge: "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300", activeBg: "bg-orange-50/80 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/60", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
          { label: "Commendations", typeKey: "Commendation", count: commendationCount, color: "text-violet-600 dark:text-violet-400", badge: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300", activeBg: "bg-violet-50/80 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800/60", icon: <ThumbsUp className="w-3.5 h-3.5" /> },
          { label: "Fines", typeKey: "Fine", count: fineCount, color: "text-amber-600 dark:text-amber-400", badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300", activeBg: "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60", icon: <Scale className="w-3.5 h-3.5" /> },
          { label: "Avg Rating", typeKey: "All", count: avgRating ? `${avgRating}/5` : "-", color: "text-sky-600 dark:text-sky-400", badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300", activeBg: "bg-sky-50/80 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/60", icon: <TrendingUp className="w-3.5 h-3.5" /> },
        ].map(s => {
          const isActive = filterType === s.typeKey;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => setFilterType(prev => (prev === s.typeKey && s.typeKey !== "All") ? "All" : s.typeKey)}
              className={`text-left border rounded-2xl p-4 flex flex-col justify-between transition-all cursor-pointer ${
                isActive
                  ? `${s.activeBg} shadow-xs font-semibold`
                  : "bg-white dark:bg-[#0f0f0f] border-slate-200/60 dark:border-[#1e1e1e] hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{s.label}</span>
                <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badge}`}>
                  {s.icon}<span>{s.count}</span>
                </span>
              </div>
              <span className={`text-2xl font-black mt-2 ${s.color}`}>{s.count}</span>
            </button>
          );
        })}
      </div>

      {/* Tabs (HR/Admin only) */}
      {isHRAdmin && (
        <div className="flex items-center bg-slate-100 dark:bg-[#1a1a1a] rounded-xl p-1 w-fit">
          {([["board", "Records Board"], ["spotlight", "Employee Spotlight"]] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${tab === t ? "bg-white dark:bg-[#0f0f0f] shadow text-emerald-600 dark:text-emerald-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Records Board ── */}
      {(tab === "board" || !isHRAdmin) && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {isHRAdmin && (
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search records, employee name…"
                  className="pl-9 pr-3 py-2.5 w-full text-xs rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
              </div>
            )}
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="text-xs py-2.5 px-3 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
              <option value="All">All Types</option>
              {[...RECORD_TYPES, "Fine"].map(t => <option key={t}>{t}</option>)}
            </select>
            {isHRAdmin && (
              <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}
                className="text-xs py-2.5 px-3 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                <option value="All">All Employees</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
            )}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            </div>
          )}

          {!loading && filteredRecords.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Inbox className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
              <p className="font-semibold text-slate-500 dark:text-slate-400">No records yet</p>
              <p className="text-xs text-slate-400 mt-1">
                {isHRAdmin ? "Add your first performance record using the button above." : "No performance records found for your profile."}
              </p>
            </div>
          )}

          {!loading && filteredRecords.length > 0 && (
            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200/70 dark:border-[#1e1e1e] rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#1a1a1a] bg-slate-50/80 dark:bg-[#121212]">
                    <th className="text-left px-4 py-3.5 font-bold uppercase tracking-wider text-[10px] text-slate-400">Type</th>
                    {isHRAdmin && <th className="text-left px-4 py-3.5 font-bold uppercase tracking-wider text-[10px] text-slate-400">Employee</th>}
                    <th className="text-left px-4 py-3.5 font-bold uppercase tracking-wider text-[10px] text-slate-400">Summary</th>
                    <th className="text-left px-4 py-3.5 font-bold uppercase tracking-wider text-[10px] text-slate-400 hidden sm:table-cell">Period</th>
                    <th className="text-left px-4 py-3.5 font-bold uppercase tracking-wider text-[10px] text-slate-400 hidden md:table-cell">Rating</th>
                    <th className="text-left px-4 py-3.5 font-bold uppercase tracking-wider text-[10px] text-slate-400">Date</th>
                    {isHRAdmin && <th className="px-4 py-3.5" />}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r, i) => {
                    const ts = typeStyle[r.type] || typeStyle["Incident"];
                    const isFine = (r as any)._isFine;
                    return (
                      <tr key={r.id} className={`border-b border-slate-50 dark:border-[#111] hover:bg-slate-50 dark:hover:bg-[#111] transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/30 dark:bg-[#0a0a0a]/30"}`}>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1.5 text-[11px] font-semibold w-fit px-2 py-1 rounded-lg ${ts.color}`}>
                            {ts.icon}{ts.label}
                          </span>
                        </td>
                        {isHRAdmin && <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{r.employeeName}</td>}
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[200px]">
                          <p className="line-clamp-2">{r.summary}</p>
                          {r.actionTaken && <p className="text-[10px] text-slate-400 mt-0.5 italic">Action: {r.actionTaken}</p>}
                        </td>
                        <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">{r.period || "-"}</td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {r.overallRating ? <StarRating rating={r.overallRating} /> : <span className="text-slate-300 dark:text-slate-700">-</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{formatDate(r.incidentDate || r.createdAt)}</td>
                        {isHRAdmin && (
                          <td className="px-4 py-3">
                            {!isFine && (
                              <button onClick={() => handleDelete(r.id)} className="p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors cursor-pointer">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Employee Spotlight ── */}
      {tab === "spotlight" && isHRAdmin && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Select Employee</label>
            <select value={spotlightEmployee?.id || ""} onChange={e => setSpotlightEmployee(employees.find(emp => emp.id === e.target.value) || null)}
              className="text-sm py-2.5 px-3 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 w-full max-w-sm">
              <option value="">- Choose an employee -</option>
              {employees.filter(e => e.role !== "super_admin").map(e => <option key={e.id} value={e.id}>{e.fullName} ({e.department})</option>)}
            </select>
          </div>

          {!spotlightEmployee && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <User className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-400">Select an employee above to see their performance history</p>
            </div>
          )}

          {spotlightEmployee && (
            <div className="space-y-4">
              {/* Profile header */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 text-white flex items-center gap-4">
                {spotlightEmployee.avatarUrl ? (
                  <img src={spotlightEmployee.avatarUrl} className="w-14 h-14 rounded-xl object-cover border-2 border-white/20" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-xl">
                    {spotlightEmployee.fullName[0]}
                  </div>
                )}
                <div>
                  <p className="font-black text-lg">{spotlightEmployee.fullName}</p>
                  <p className="text-sm opacity-80">{spotlightEmployee.department} · {spotlightEmployee.status}</p>
                </div>
                <div className="ml-auto text-right">
                  {spotlightAvg && (
                    <>
                      <p className="text-3xl font-black">{spotlightAvg}</p>
                      <p className="text-xs opacity-70">Avg Rating</p>
                    </>
                  )}
                </div>
              </div>

              {/* Type breakdown pills */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(typeStyle).map(([type, ts]) => {
                  const count = spotlightRecords.filter(r => r.type === type).length;
                  if (!count) return null;
                  return (
                    <div key={type} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${ts.color}`}>
                      {ts.icon}<span>{count} {ts.label}</span>
                    </div>
                  );
                })}
                {spotlightRecords.length === 0 && <p className="text-sm text-slate-400">No records found for this employee.</p>}
              </div>

              {/* Timeline */}
              {spotlightRecords.length > 0 && (
                <div className="relative space-y-0 border-l-2 border-slate-100 dark:border-[#1a1a1a] ml-3">
                  {spotlightRecords.map((r, i) => {
                    const ts = typeStyle[r.type] || typeStyle["Incident"];
                    return (
                      <div key={r.id} className="relative pl-6 pb-5">
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full flex items-center justify-center ${ts.color} border-2 border-white dark:border-[#0f0f0f]`}>
                          <span className="w-2 h-2">{ts.icon}</span>
                        </div>
                        <div className="bg-white dark:bg-[#111] border border-slate-100 dark:border-[#1a1a1a] rounded-xl p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${ts.color}`}>{ts.label}</span>
                                {r.period && <span className="text-[11px] text-slate-400">{r.period}</span>}
                              </div>
                              <p className="text-sm text-slate-700 dark:text-slate-300">{r.summary}</p>
                              {r.actionTaken && <p className="text-xs text-slate-400 mt-1 italic">Action: {r.actionTaken}</p>}
                              {r.overallRating && <div className="mt-1.5"><StarRating rating={r.overallRating} /></div>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(r.incidentDate || r.createdAt)}</span>
                            {r.reviewerName && r.reviewerName !== "System" && <span>&middot; by {r.reviewerName}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Record Modal */}
      {showAddModal && isHRAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#0f0f0f] rounded-3xl shadow-2xl border border-slate-100 dark:border-[#1a1a1a] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#1a1a1a] sticky top-0 bg-white dark:bg-[#0f0f0f] z-10">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <h2 className="font-bold text-sm text-slate-800 dark:text-white">Add Performance Record</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1a1a1a] cursor-pointer">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Employee */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Employee *</label>
                <select value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}
                  className="w-full text-sm py-2.5 px-3 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                  <option value="">Select an employee</option>
                  {employees.filter(e => e.role !== "super_admin").map(e => <option key={e.id} value={e.id}>{e.fullName} - {e.department}</option>)}
                </select>
              </div>

              {/* Type + Period */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Record Type *</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as RecordType }))}
                    className="w-full text-sm py-2.5 px-3 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                    {RECORD_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Period (optional)</label>
                  <input value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))}
                    placeholder="e.g. Q3 2025, Annual 2025"
                    className="w-full text-sm py-2.5 px-3 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Summary / Notes *</label>
                <textarea rows={3} value={form.summary} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))}
                  placeholder="Describe the performance observation, incident, or commendation…"
                  className="w-full text-sm py-2.5 px-3 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none" />
              </div>

              {/* Rating (for Appraisal / Commendation) */}
              {(form.type === "Appraisal" || form.type === "Commendation") && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 block">Overall Rating (1–5)</label>
                  <StarRating rating={form.overallRating} onChange={v => setForm(p => ({ ...p, overallRating: v }))} />
                </div>
              )}

              {/* Incident fields */}
              {(form.type === "Incident" || form.type === "Disciplinary") && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Incident Date</label>
                    <input type="date" value={form.incidentDate} onChange={e => setForm(p => ({ ...p, incidentDate: e.target.value }))}
                      className="w-full text-sm py-2.5 px-3 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Action Taken</label>
                    <input value={form.actionTaken} onChange={e => setForm(p => ({ ...p, actionTaken: e.target.value }))}
                      placeholder="e.g. Verbal warning, Written notice, No action"
                      className="w-full text-sm py-2.5 px-3 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-5">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#2a2a2a] text-sm font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] cursor-pointer">Cancel</button>
              <button onClick={handleAdd} disabled={submitting} className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-br from-emerald-600 to-teal-600 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl cursor-pointer shadow-md">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>{submitting ? "Saving…" : "Save Record"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
