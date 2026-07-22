"use client";

import React, { useState } from "react";
import { 
  Scale, AlertTriangle, Plus, Check, DollarSign, Sparkles, UserCheck, X
} from "lucide-react";
import { Fine, Employee, UserRole } from "../types";

interface FinesViewProps {
  fines: Fine[];
  employees: Employee[];
  role: UserRole;
  currentEmployeeId: string;
  onAddFine: (fineData: any) => void;
  onUpdateFineStatus: (id: string, status: "Paid" | "Deducted From Payroll") => void;
}

export default function FinesView({
  fines,
  employees,
  role,
  currentEmployeeId,
  onAddFine,
  onUpdateFineStatus
}: FinesViewProps) {
  const [showFineForm, setShowFineForm] = useState(false);

  // Fine form fields
  const [fineEmpId, setFineEmpId] = useState(employees[0]?.id || "");
  const [fineReason, setFineReason] = useState<string>("Late Coming");
  const [fineAmount, setFineAmount] = useState("500");

  const handleFineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fineEmpId || !fineAmount) return;
    const emp = employees.find(e => e.id === fineEmpId);
    onAddFine({
      employeeId: fineEmpId,
      employeeName: emp ? emp.fullName : getEmployeeName(fineEmpId),
      reason: fineReason,
      amount: Number(fineAmount)
    });
    setShowFineForm(false);
  };

  const getEmployeeName = (empId: string) => {
    return employees.find(e => e.id === empId)?.fullName || "Unknown Employee";
  };

  const pendingFinesCount = fines.filter(f => f.status === "Pending").length;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5.5 h-5.5 text-rose-500" />
            <span>Fines & Infractions Desk</span>
          </h2>
          <p className="text-xs text-slate-400 dark:text-gray-400">Track and settle regulatory, attendance, and administrative penalty logs</p>
        </div>

        <div className="flex items-center gap-2">
          {pendingFinesCount > 0 && (
            <span className="bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 font-bold text-[10px] tracking-wide uppercase px-3 py-1.5 rounded-xl animate-pulse">
              {pendingFinesCount} Pending Settlements
            </span>
          )}

          {(role === "admin" || role === "hr") && (
            <button
              onClick={() => setShowFineForm(!showFineForm)}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{showFineForm ? "Close Panel" : "Log Corporate Infraction"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin infracton Form */}
      {showFineForm && (role === "admin" || role === "hr") && (
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow animate-in fade-in duration-200">
          <div className="flex justify-between items-center pb-3 border-b border-slate-50 dark:border-[#1a1a1a] mb-4">
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm">Log Corporate Fine Penalty</h3>
            <button onClick={() => setShowFineForm(false)} className="text-slate-400 hover:text-slate-600 font-bold text-base">&times;</button>
          </div>

          <form onSubmit={handleFineSubmit} className="space-y-4 text-xs font-semibold">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-slate-500 dark:text-gray-400">Employee Name</label>
                <select
                  value={fineEmpId}
                  onChange={(e) => setFineEmpId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a]"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.id}) - Role: {emp.role === "hr" ? "HR" : emp.role === "admin" ? "Admin" : "Employee"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 dark:text-gray-400">Infraction Type</label>
                <select
                  value={fineReason}
                  onChange={(e) => setFineReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a]"
                >
                  <option value="Late Coming">Late Coming (Attendance policy breach)</option>
                  <option value="Compliance Violation">Compliance Violation (Secure CRM breach)</option>
                  <option value="Unprofessional Conduct">Unprofessional Conduct</option>
                  <option value="Lost Asset">Lost / Damaged SnailHR Assets</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 dark:text-gray-400">Fine Penalty Amount (INR)</label>
                <input 
                  type="number"
                  value={fineAmount}
                  onChange={(e) => setFineAmount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a] font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-50 dark:border-[#1a1a1a]">
              <button
                type="submit"
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4.5 py-2.5 rounded-xl cursor-pointer shadow-xs"
              >
                Authorize Fine Penalty
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Fines Violations list */}
      <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
        <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm mb-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">Branch Violations Ledger</h3>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#1a1a1a] text-slate-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Employee Name</th>
                <th className="py-2.5 px-3">Violation Reason</th>
                <th className="py-2.5 px-3">Date Authorised</th>
                <th className="py-2.5 px-3">Penalty Charge</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Settlement Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-[#1a1a1a]/50">
              {fines
                .filter(f => role === "employee" ? f.employeeId === currentEmployeeId : true)
                .map(fine => (
                  <tr key={fine.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a]/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-700 dark:text-gray-300 flex items-center space-x-2">
                      <div className="w-6.5 h-6.5 rounded-full bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center font-bold text-[9px] uppercase">
                        {(fine.employeeName || getEmployeeName(fine.employeeId)).charAt(0)}
                      </div>
                      <div>
                        <span className="block leading-tight">{fine.employeeName || getEmployeeName(fine.employeeId)}</span>
                        <span className="text-[10px] text-slate-400 dark:text-gray-500 font-normal font-mono">{fine.employeeId}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-650 dark:text-gray-450 font-semibold">{fine.reason}</td>
                    <td className="py-3 px-3 font-mono text-slate-400 dark:text-gray-500">{fine.date}</td>
                    <td className="py-3 px-3 font-mono text-rose-500 font-bold">₹{fine.amount.toLocaleString()}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${
                        fine.status === "Pending" 
                          ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 animate-pulse"
                          : fine.status === "Paid"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                      }`}>
                        {fine.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {fine.status === "Pending" ? (
                        (role === "admin" || role === "hr") ? (
                          <div className="flex space-x-1.5 justify-end">
                            <button
                              onClick={() => onUpdateFineStatus(fine.id, "Deducted From Payroll")}
                              className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 px-2 py-1.5 rounded-lg font-bold text-[10px] cursor-pointer"
                              title="Flag for automatic payroll deduction"
                            >
                              Deduct in Payroll
                            </button>
                            <button
                              onClick={() => onUpdateFineStatus(fine.id, "Paid")}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1.5 rounded-lg font-bold text-[10px] cursor-pointer"
                              title="Mark paid directly in cash"
                            >
                              Paid Direct
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic font-medium">To be auto-deducted in payslip</span>
                        )
                      ) : (
                        <span className="text-slate-400 dark:text-gray-500 font-medium">Fine Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              {fines.filter(f => role === "employee" ? f.employeeId === currentEmployeeId : true).length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400 dark:text-gray-500">No penalties recorded. Keep up the high standard of compliance!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
