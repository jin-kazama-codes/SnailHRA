"use client";

import React, { useState } from "react";
import { 
  Calendar, Check, X, FileEdit, Plus, Sparkles, 
  Clock, AlertCircle, FileText, ChevronRight, UserCheck, RefreshCw, Trash2
} from "lucide-react";
import { LeaveRequest, Holiday, Employee, UserRole } from "../types";

interface LeavesViewProps {
  leaves: LeaveRequest[];
  holidays: Holiday[];
  employees: Employee[];
  role: UserRole;
  currentEmployeeId: string;
  customLeaveTypes?: string[];
  onApplyLeave: (leaveData: any) => Promise<void> | void;
  onReviewLeave: (id: string, status: "Approved" | "Rejected") => Promise<void> | void;
  onAddHoliday?: (newHoliday: { name: string; date: string; type: "National" | "Regional" | "Restricted" }) => Promise<boolean>;
  onDeleteHoliday?: (id: string) => void;
}

export default function LeavesView({
  leaves,
  holidays,
  employees,
  role,
  currentEmployeeId,
  customLeaveTypes,
  onApplyLeave,
  onReviewLeave,
  onAddHoliday,
  onDeleteHoliday
}: LeavesViewProps) {
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [showApplyForm, setShowApplyForm] = useState(false);
  const [leaveType, setLeaveType] = useState<any>("Casual Leave");
  const [startDate, setStartDate] = useState(() => getTodayStr());
  const [endDate, setEndDate] = useState(() => getTodayStr());
  const [reason, setReason] = useState("");
  const [ledgerFilter, setLedgerFilter] = useState<"mine" | "all">("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingLeaveId, setProcessingLeaveId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Add Holiday Modal state
  const [showAddHolidayModal, setShowAddHolidayModal] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState(() => getTodayStr());
  const [newHolidayType, setNewHolidayType] = useState<"National" | "Regional" | "Restricted">("National");
  const [isSubmittingHoliday, setIsSubmittingHoliday] = useState(false);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleReviewAction = async (id: string, status: "Approved" | "Rejected") => {
    if (processingLeaveId) return;
    setProcessingLeaveId(id);

    const targetLeave = leaves.find(l => l.id === id);
    const empName = targetLeave?.employeeName || (targetLeave ? getEmployeeName(targetLeave.employeeId) : "Employee");

    try {
      await onReviewLeave(id, status);
      if (status === "Approved") {
        showToast(`Leave request for ${empName} was APPROVED successfully!`, "success");
      } else {
        showToast(`Leave request for ${empName} was REJECTED.`, "error");
      }
    } catch (err) {
      console.error("Error processing review:", err);
      showToast("Failed to process leave review request.", "error");
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !startDate || !endDate || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onApplyLeave({
        employeeId: currentEmployeeId,
        leaveType,
        startDate,
        endDate,
        reason
      });
      setReason("");
      setShowApplyForm(false);
      showToast(`Leave request (${leaveType}) submitted successfully!`, "success");
    } catch (err) {
      console.error("Error applying leave:", err);
      showToast("Failed to submit leave request.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEmployeeName = (empId: string) => {
    return employees.find(e => e.id === empId)?.fullName || "Agent";
  };

  const getEmployeeDept = (empId: string) => {
    return employees.find(e => e.id === empId)?.department || "Loans";
  };

  // Leave Balances (Dynamic)
  const getConsumedCount = (leaveType: string) => {
    return leaves.filter(l => l.employeeId === currentEmployeeId && l.leaveType === leaveType && l.status === "Approved").length;
  };
  const leaveBalances = [
    { type: "Casual Leaves", allocated: 18, consumed: getConsumedCount("Casual Leave"), color: "border-l-emerald-500 text-emerald-600 bg-emerald-500/5" },
    { type: "Medical Leaves", allocated: 12, consumed: getConsumedCount("Medical Leave"), color: "border-l-teal-500 text-teal-600 bg-teal-500/5" },
    { type: "Earned Leaves", allocated: 15, consumed: getConsumedCount("Earned Leave"), color: "border-l-indigo-500 text-indigo-600 bg-indigo-500/5" },
    { type: "Maternity/Paternity", allocated: 30, consumed: getConsumedCount("Maternity/Paternity"), color: "border-l-purple-500 text-purple-600 bg-purple-500/5" }
  ];

  return (
    <div className="space-y-6">
      {/* Leave balance grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {leaveBalances.map((bal, idx) => (
          <div key={idx} className={`border border-slate-100 dark:border-[#1a1a1a] bg-white dark:bg-[#0f0f0f] rounded-xl p-4 shadow-xs dark:neon-glow border-l-3 ${bal.color}`}>
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider">{bal.type}</h4>
            <div className="flex items-baseline space-x-1.5 mt-2">
              <span className="text-2xl font-bold text-slate-800 dark:text-white font-mono">{bal.allocated - bal.consumed}</span>
              <span className="text-xs text-slate-400">/ {bal.allocated} Available</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">{bal.consumed} Days consumed this year</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Submit / Approval Boards */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Apply Leave Card (Employee Persona) */}
          {role === "employee" ? (
            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">
                <div>
                  <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">Apply for Leave</h3>
                  <p className="text-xs text-slate-400 dark:text-gray-500">Submit automated leave tracking requests</p>
                </div>
                <button
                  onClick={() => setShowApplyForm(!showApplyForm)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center space-x-1 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showApplyForm ? "Hide Form" : "Request Leave"}</span>
                </button>
              </div>

              {showApplyForm ? (
                <form onSubmit={handleApplySubmit} className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Leave Type</label>
                      <select
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-medium"
                      >
                        {(customLeaveTypes && customLeaveTypes.length > 0
                          ? customLeaveTypes
                          : ["Casual Leave", "Medical Leave", "Earned Leave", "Maternity Leave", "Paternity Leave", "Loss of Pay"]
                        ).map((lt) => (
                          <option key={lt} value={lt}>{lt}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Start Date</label>
                      <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-medium font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">End Date</label>
                      <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-medium font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Reason / Brief justification</label>
                    <textarea 
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Dental appointment and recovery"
                      rows={2}
                      className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden"
                      required
                    />
                  </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-xs flex items-center space-x-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                          <span>Submitting Request...</span>
                        </>
                      ) : (
                        <span>Submit Automated Request</span>
                      )}
                    </button>
                </form>
              ) : (
                <div className="p-6 text-center bg-slate-50/50 dark:bg-[#0a0a0a]/10 rounded-xl">
                  <p className="text-xs text-slate-400 dark:text-gray-500">Need time off? Request medical, casual or earned leaves with instant supervisor routing.</p>
                </div>
              )}
            </div>
          ) : (
            /* Approvals Board for HR & Admin */
            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
              <div className="mb-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">
                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">Supervisor Approvals Board</h3>
                <p className="text-xs text-slate-400 dark:text-gray-500">Review, approve, or reject active leave logs</p>
              </div>

              <div className="space-y-3.5">
                {leaves.filter(l => l.status === "Pending").map(leave => (
                  <div key={leave.id} className="p-4 bg-slate-50/70 dark:bg-[#0a0a0a]/50 border border-slate-100 dark:border-[#1a1a1a] rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800 dark:text-white text-xs">{leave.employeeName || getEmployeeName(leave.employeeId)}</span>
                        <span className="text-[10px] bg-slate-200 dark:bg-[#1a1a1a] text-slate-500 dark:text-gray-400 px-2 py-0.5 rounded font-mono">{leave.employeeId}</span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold px-2 py-0.5 rounded">{leave.leaveType}</span>
                      </div>
                      <p className="text-slate-400 dark:text-gray-500 font-medium">Department: {getEmployeeDept(leave.employeeId)}</p>
                      <p className="text-slate-600 dark:text-gray-300 italic">" {leave.reason} "</p>
                      <p className="font-mono text-[10px] text-slate-400 dark:text-gray-500">Dates: {leave.startDate} to {leave.endDate} • Submitted {leave.appliedDate}</p>
                    </div>

                    <div className="flex space-x-2 shrink-0 self-end md:self-auto">
                      <button
                        onClick={() => handleReviewAction(leave.id, "Rejected")}
                        disabled={processingLeaveId === leave.id}
                        className="bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 hover:bg-rose-100 px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                      >
                        {processingLeaveId === leave.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleReviewAction(leave.id, "Approved")}
                        disabled={processingLeaveId === leave.id}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                      >
                        {processingLeaveId === leave.id ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                            <span>Approving...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
                {leaves.filter(l => l.status === "Pending").length === 0 && (
                  <div className="p-6 text-center bg-slate-50/50 dark:bg-[#0a0a0a]/10 rounded-xl">
                    <p className="text-xs text-slate-400 dark:text-gray-500">Perfect! No pending leave requests to review.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Leaves History Log */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <div>
                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">Leaves Archive Ledger</h3>
                <p className="text-xs text-slate-400 dark:text-gray-500">Audit trail of requested and disbursed absences</p>
              </div>

              {role !== "employee" && (
                <div className="flex items-center bg-slate-100 dark:bg-[#0a0a0a] p-1 rounded-xl text-xs space-x-1 border border-slate-200/50 dark:border-[#1a1a1a] shrink-0">
                  <button
                    onClick={() => setLedgerFilter("mine")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      ledgerFilter === "mine"
                        ? "bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-white shadow-xs font-bold"
                        : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"
                    }`}
                  >
                    My Applied Leaves
                  </button>
                  <button
                    onClick={() => setLedgerFilter("all")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      ledgerFilter === "all"
                        ? "bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-white shadow-xs font-bold"
                        : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"
                    }`}
                  >
                    All Company Leaves
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2.5 max-h-[480px] overflow-y-auto custom-scrollbar">
              {leaves
                .filter(l => (role === "employee" || ledgerFilter === "mine") ? l.employeeId === currentEmployeeId : true)
                .slice()
                .sort((a, b) => {
                  // Pending / newest leaves at the top
                  if (a.status === "Pending" && b.status !== "Pending") return -1;
                  if (a.status !== "Pending" && b.status === "Pending") return 1;
                  return (b.id || "").localeCompare(a.id || "");
                })
                .map(leave => {
                  const empName = leave.employeeName || getEmployeeName(leave.employeeId);
                  const statusVal = leave.status || "Pending";

                  return (
                    <div key={leave.id || `lv-${Math.random()}`} className="p-3 bg-slate-50/50 dark:bg-[#0a0a0a]/40 border border-slate-100/50 dark:border-[#1a1a1a]/50 rounded-xl flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-700 dark:text-gray-300">{empName}</span>
                          <span className="text-[10px] text-slate-400 dark:text-gray-500">• {leave.leaveType}</span>
                        </div>
                        <p className="font-mono text-[10px] text-slate-400 dark:text-gray-500">{leave.startDate} to {leave.endDate} ({leave.reason})</p>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${
                        statusVal === "Approved" 
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                          : statusVal === "Pending"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-extrabold animate-pulse"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400"
                      }`}>
                        {statusVal === "Pending" ? "APPLIED (PENDING)" : statusVal}
                      </span>
                    </div>
                  );
                })}
              {leaves.filter(l => (role === "employee" || ledgerFilter === "mine") ? l.employeeId === currentEmployeeId : true).length === 0 && (
                <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-4">No leave history logged.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Holiday List Tracker */}
        <div className="lg:col-span-1 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow flex flex-col justify-between h-fit space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 dark:border-[#1a1a1a] pb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <h4 className="font-display font-semibold text-slate-800 dark:text-white text-sm">2026 Holiday Schedule</h4>
              </div>
              {(role === "admin" || role === "hr") ? (
                <button
                  onClick={() => setShowAddHolidayModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Holiday</span>
                </button>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 font-mono">List</span>
              )}
            </div>

            <div className="space-y-3.5 max-h-[380px] overflow-y-auto custom-scrollbar">
              {holidays.map(holiday => {
                const today = new Date();
                today.setHours(0,0,0,0);
                const isPassed = new Date(holiday.date) < today;
                return (
                  <div key={holiday.id} className={`flex items-center justify-between text-xs p-2.5 rounded-xl transition-all ${
                    isPassed 
                      ? "opacity-50 bg-slate-50/50 dark:bg-[#0a0a0a]/10 text-slate-400" 
                      : "bg-slate-50 dark:bg-[#0a0a0a]/40 hover:bg-slate-100/50 dark:hover:bg-[#0a0a0a]/70 border border-slate-100/50 dark:border-[#1a1a1a]"
                  }`}>
                    <div>
                      <p className="font-semibold text-slate-700 dark:text-gray-300">{holiday.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-gray-500">{holiday.type} Leave Holiday</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-slate-500 dark:text-gray-400 bg-white dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a] px-2 py-1 rounded-md">
                        {new Date(holiday.date.includes("T") ? holiday.date : holiday.date + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                      {(role === "admin" || role === "hr") && onDeleteHoliday && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete "${holiday.name}"?`)) {
                              onDeleteHoliday(holiday.id);
                              showToast("Holiday removed", "info");
                            }
                          }}
                          className="text-slate-300 hover:text-rose-600 dark:text-gray-600 dark:hover:text-rose-400 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Delete Holiday"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-[#0a0a0a]/50 p-3 rounded-xl border border-slate-100 dark:border-[#1a1a1a]/50 text-[11px] text-slate-400 leading-normal">
            ℹ️ <b>National holidays</b> apply to all branches nationwide, while regional closures depend on local state notification tables (e.g. Maharashtra, Noida, Telangana).
          </div>
        </div>
      </div>

      {/* Add Holiday Modal */}
      {showAddHolidayModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1a1a1a]">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-emerald-500" />
                <h3 className="font-display font-bold text-slate-800 dark:text-white text-md">Add Holiday</h3>
              </div>
              <button onClick={() => setShowAddHolidayModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newHolidayName || !newHolidayDate) return;
              setIsSubmittingHoliday(true);
              if (onAddHoliday) {
                const success = await onAddHoliday({
                  name: newHolidayName,
                  date: newHolidayDate,
                  type: newHolidayType
                });
                if (success) {
                  showToast("Holiday added successfully!", "success");
                  setShowAddHolidayModal(false);
                  setNewHolidayName("");
                }
              }
              setIsSubmittingHoliday(false);
            }} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-gray-400 font-semibold mb-1">Holiday Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Independence Day, Raksha Bandhan"
                  value={newHolidayName}
                  onChange={e => setNewHolidayName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#222] rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-gray-400 font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newHolidayDate}
                    onChange={e => setNewHolidayDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#222] rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-gray-400 font-semibold mb-1">Holiday Type</label>
                  <select
                    value={newHolidayType}
                    onChange={e => setNewHolidayType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#222] rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="National">National</option>
                    <option value="Regional">Regional</option>
                    <option value="Restricted">Restricted</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddHolidayModal(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingHoliday}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingHoliday ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Holiday</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center space-x-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md transition-all ${
            toast.type === "success"
              ? "bg-emerald-900/95 text-emerald-100 border-emerald-500/40 shadow-emerald-900/20"
              : toast.type === "error"
              ? "bg-rose-900/95 text-rose-100 border-rose-500/40 shadow-rose-900/20"
              : "bg-slate-900/95 text-slate-100 border-slate-700"
          }`}>
            <div className={`p-1 rounded-full ${toast.type === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
              {toast.type === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </div>
            <span className="text-xs font-semibold tracking-wide pr-2">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
