import React, { useState } from "react";
import { 
  Calendar, Check, X, FileEdit, Plus, Sparkles, 
  Clock, AlertCircle, FileText, ChevronRight, UserCheck
} from "lucide-react";
import { LeaveRequest, Holiday, Employee, UserRole } from "../types";

interface LeavesViewProps {
  leaves: LeaveRequest[];
  holidays: Holiday[];
  employees: Employee[];
  role: UserRole;
  currentEmployeeId: string;
  onApplyLeave: (leaveData: any) => void;
  onReviewLeave: (id: string, status: "Approved" | "Rejected") => void;
}

export default function LeavesView({
  leaves,
  holidays,
  employees,
  role,
  currentEmployeeId,
  onApplyLeave,
  onReviewLeave
}: LeavesViewProps) {
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [leaveType, setLeaveType] = useState<any>("Casual Leave");
  const [startDate, setStartDate] = useState("2026-07-22");
  const [endDate, setEndDate] = useState("2026-07-24");
  const [reason, setReason] = useState("");

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !startDate || !endDate) return;
    onApplyLeave({
      employeeId: currentEmployeeId,
      leaveType,
      startDate,
      endDate,
      reason
    });
    setReason("");
    setShowApplyForm(false);
  };

  const getEmployeeName = (empId: string) => {
    return employees.find(e => e.id === empId)?.fullName || "Agent";
  };

  const getEmployeeDept = (empId: string) => {
    return employees.find(e => e.id === empId)?.department || "Loans";
  };

  // Leave Balances (Simulated)
  const leaveBalances = [
    { type: "Casual Leaves", allocated: 18, consumed: 4, color: "border-l-emerald-500 text-emerald-600 bg-emerald-500/5" },
    { type: "Medical Leaves", allocated: 12, consumed: 2, color: "border-l-teal-500 text-teal-600 bg-teal-500/5" },
    { type: "Earned Leaves", allocated: 15, consumed: 0, color: "border-l-indigo-500 text-indigo-600 bg-indigo-500/5" },
    { type: "Maternity/Paternity", allocated: 30, consumed: 0, color: "border-l-purple-500 text-purple-600 bg-purple-500/5" }
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
                        <option value="Casual Leave">Casual Leave</option>
                        <option value="Medical Leave">Medical Leave</option>
                        <option value="Earned Leave">Earned Leave</option>
                        <option value="Maternity/Paternity">Maternity/Paternity</option>
                        <option value="Loss of Pay">Loss of Pay (LWP)</option>
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

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-xs"
                    >
                      Submit Automated Request
                    </button>
                  </div>
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
                        <span className="font-bold text-slate-800 dark:text-white text-xs">{leave.employeeName}</span>
                        <span className="text-[10px] bg-slate-200 dark:bg-[#1a1a1a] text-slate-500 dark:text-gray-400 px-2 py-0.5 rounded font-mono">{leave.employeeId}</span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold px-2 py-0.5 rounded">{leave.leaveType}</span>
                      </div>
                      <p className="text-slate-400 dark:text-gray-500 font-medium">Department: {getEmployeeDept(leave.employeeId)}</p>
                      <p className="text-slate-600 dark:text-gray-300 italic">" {leave.reason} "</p>
                      <p className="font-mono text-[10px] text-slate-400 dark:text-gray-500">Dates: {leave.startDate} to {leave.endDate} • Submitted {leave.appliedDate}</p>
                    </div>

                    <div className="flex space-x-2 shrink-0 self-end md:self-auto">
                      <button
                        onClick={() => onReviewLeave(leave.id, "Rejected")}
                        className="bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 hover:bg-rose-100 px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => onReviewLeave(leave.id, "Approved")}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
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
            <div className="mb-4">
              <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">Leaves Archive Ledger</h3>
              <p className="text-xs text-slate-400 dark:text-gray-500">Audit trail of all requested and disbursed absences</p>
            </div>

            <div className="space-y-2.5 max-h-[250px] overflow-y-auto custom-scrollbar">
              {leaves
                .filter(l => role === "employee" ? l.employeeId === currentEmployeeId : true)
                .map(leave => (
                  <div key={leave.id} className="p-3 bg-slate-50/50 dark:bg-[#0a0a0a]/40 border border-slate-100/50 dark:border-[#1a1a1a]/50 rounded-xl flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-700 dark:text-gray-300">{leave.employeeName}</span>
                        <span className="text-[10px] text-slate-400 dark:text-gray-500">• {leave.leaveType}</span>
                      </div>
                      <p className="font-mono text-[10px] text-slate-400 dark:text-gray-500">{leave.startDate} to {leave.endDate} ({leave.reason})</p>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${
                      leave.status === "Approved" 
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : leave.status === "Pending"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 animate-pulse"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                    }`}>
                      {leave.status}
                    </span>
                  </div>
                ))}
              {leaves.filter(l => role === "employee" ? l.employeeId === currentEmployeeId : true).length === 0 && (
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
              <span className="text-[10px] font-bold text-slate-400 font-mono">List</span>
            </div>

            <div className="space-y-3.5 max-h-[380px] overflow-y-auto custom-scrollbar">
              {holidays.map(holiday => {
                const isPassed = new Date(holiday.date) < new Date("2026-07-20");
                return (
                  <div key={holiday.id} className={`flex items-center justify-between text-xs p-2 rounded-xl transition-all ${
                    isPassed 
                      ? "opacity-50 bg-slate-50/50 dark:bg-[#0a0a0a]/10 text-slate-400" 
                      : "bg-slate-50 dark:bg-[#0a0a0a]/40 hover:bg-slate-100/50 dark:hover:bg-[#0a0a0a]/70 border border-slate-100/50 dark:border-[#1a1a1a]"
                  }`}>
                    <div>
                      <p className="font-semibold text-slate-700 dark:text-gray-300">{holiday.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-gray-500">{holiday.type} Leave Holiday</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-gray-400 bg-white dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a] px-2 py-1 rounded-md">
                      {new Date(holiday.date).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
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
    </div>
  );
}
