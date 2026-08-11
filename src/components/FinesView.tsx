"use client";

import React, { useState } from "react";
import { 
  Scale, AlertTriangle, Plus, Check, DollarSign, Sparkles, UserCheck, X, Trash2, Search, Filter
} from "lucide-react";
import { Fine, Employee, UserRole, InfractionType } from "../types";

interface FinesViewProps {
  fines: Fine[];
  employees: Employee[];
  role: UserRole;
  currentEmployeeId: string;
  infractionTypes?: InfractionType[];
  onAddFine: (fineData: any) => void;
  onUpdateFineStatus: (id: string, status: "Paid" | "Deducted From Payroll") => void;
  onDeleteFine?: (id: string) => void;
  companyName?: string;
}

export default function FinesView({
  fines,
  employees,
  role,
  currentEmployeeId,
  infractionTypes = [],
  onAddFine,
  onUpdateFineStatus,
  onDeleteFine,
  companyName = "Your Company"
}: FinesViewProps) {
  const [showFineForm, setShowFineForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReasonFilter, setSelectedReasonFilter] = useState("ALL");

  const getEmployeeName = (empId: string) => {
    return employees.find(e => e.id === empId)?.fullName || "Unknown Employee";
  };

  const getEmployeeDept = (empId: string) => {
    return employees.find(e => e.id === empId)?.department || "";
  };

  // Helper to normalize common typos like "Late Comming" -> "Late Coming"
  const normalizeReason = (reason: string) => {
    if (!reason) return "";
    const clean = reason.trim();
    if (/^late\s+comming$/i.test(clean)) {
      return "Late Coming";
    }
    return clean;
  };

  // Unique violation reasons list for filter dropdown (deduplicated & normalized)
  const uniqueViolationReasons = React.useMemo(() => {
    const map = new Map<string, string>();
    infractionTypes.forEach(t => {
      if (t.name) {
        const norm = normalizeReason(t.name);
        if (!map.has(norm.toLowerCase())) {
          map.set(norm.toLowerCase(), norm);
        }
      }
    });
    fines.forEach(f => {
      if (f.reason) {
        const norm = normalizeReason(f.reason);
        if (!map.has(norm.toLowerCase())) {
          map.set(norm.toLowerCase(), norm);
        }
      }
    });
    return Array.from(map.values()).sort();
  }, [infractionTypes, fines]);

  // Filtered fines based on role, search term (name/dept), and violation reason
  const filteredFines = React.useMemo(() => {
    return fines.filter(fine => {
      // Role filter
      if (role === "employee" && fine.employeeId !== currentEmployeeId) {
        return false;
      }

      // Violation reason filter (normalized to match typos seamlessly)
      if (selectedReasonFilter !== "ALL") {
        const fineNorm = normalizeReason(fine.reason || "").toLowerCase();
        const filterNorm = normalizeReason(selectedReasonFilter).toLowerCase();
        if (fineNorm !== filterNorm) {
          return false;
        }
      }

      // Employee name search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const empName = (fine.employeeName || getEmployeeName(fine.employeeId)).toLowerCase();
        const empDept = getEmployeeDept(fine.employeeId).toLowerCase();
        const fineReason = (fine.reason || "").toLowerCase();
        const match = empName.includes(q) || empDept.includes(q) || fineReason.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [fines, role, currentEmployeeId, selectedReasonFilter, searchQuery, employees]);

  // Group employees by branch and sort within each branch: Admin, HR, Employee
  const groupedEmployees = React.useMemo(() => {
    const groups: { [branch: string]: Employee[] } = {};
    
    employees.forEach(emp => {
      const branchName = emp.branch || "Mumbai Branch";
      if (!groups[branchName]) {
        groups[branchName] = [];
      }
      groups[branchName].push(emp);
    });

    const rolePriority: { [key: string]: number } = {
      admin: 1,
      hr: 2,
      employee: 3
    };

    const sortedBranchNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));

    return sortedBranchNames.map(branch => {
      const branchEmps = [...groups[branch]].sort((a, b) => {
        const priorityA = rolePriority[a.role] || 4;
        const priorityB = rolePriority[b.role] || 4;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return a.fullName.localeCompare(b.fullName);
      });
      return { branch, employees: branchEmps };
    });
  }, [employees]);

  // Fine form fields
  const [fineEmpId, setFineEmpId] = useState(employees[0]?.id || "");
  const [fineReason, setFineReason] = useState<string>(() => infractionTypes[0]?.name || "");
  const [fineAmount, setFineAmount] = useState<string>(() =>
    String(infractionTypes[0]?.defaultAmount || 500)
  );

  const handleReasonChange = (reason: string) => {
    setFineReason(reason);
    const matched = infractionTypes.find(t => t.name === reason);
    if (matched && matched.defaultAmount) {
      setFineAmount(String(matched.defaultAmount));
    }
  };

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
                  {groupedEmployees.map(group => (
                    <optgroup key={group.branch} label={group.branch}>
                      {group.employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName} ({emp.id}) - Role: {emp.role === "hr" ? "HR" : emp.role === "admin" ? "Admin" : "Employee"}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 dark:text-gray-400">Infraction Type</label>
                <select
                  value={fineReason}
                  onChange={(e) => handleReasonChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a]"
                >
                  {infractionTypes.length > 0 ? (
                    infractionTypes.map((type) => (
                      <option key={type.id} value={type.name}>
                        {type.name}{type.description ? ` (${type.description})` : ""}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No types configured — add in System Settings</option>
                  )}
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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">
          <div>
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm">Branch Violations Ledger</h3>
            <p className="text-[11px] text-slate-400 dark:text-gray-400">Showing {filteredFines.length} of {fines.length} penalty records</p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Search by Employee Name */}
            <div className="relative flex-1 md:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by employee name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 text-xs pl-8 pr-7 py-1.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a] focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-xs font-bold"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Filter by Violation Reason */}
            <div className="relative flex-1 md:w-52">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedReasonFilter}
                onChange={(e) => setSelectedReasonFilter(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a] focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Violation Reasons</option>
                {uniqueViolationReasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

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
              {filteredFines.map(fine => (
                <tr key={fine.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a]/40 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-700 dark:text-gray-300 flex items-center space-x-2">
                    <div className="w-6.5 h-6.5 rounded-full bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center font-bold text-[9px] uppercase">
                      {(fine.employeeName || getEmployeeName(fine.employeeId)).charAt(0)}
                    </div>
                    <div>
                      <span className="block leading-tight">{fine.employeeName || getEmployeeName(fine.employeeId)}</span>
                      <span className="text-[10px] text-slate-400 dark:text-gray-500 font-normal">{getEmployeeDept(fine.employeeId)}</span>
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
                    <div className="flex items-center justify-end space-x-1.5">
                      {fine.status === "Pending" ? (
                        (role === "admin" || role === "hr") ? (
                          <>
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
                          </>
                        ) : (
                          <span className="text-slate-400 italic font-medium">To be auto-deducted in payslip</span>
                        )
                      ) : (
                        <span className="text-slate-400 dark:text-gray-500 font-medium">Fine Settled</span>
                      )}

                      {(role === "admin" || role === "hr") && onDeleteFine && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete/revoke the fine for "${fine.employeeName || getEmployeeName(fine.employeeId)}"?`)) {
                              onDeleteFine(fine.id);
                            }
                          }}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer ml-1 border border-transparent hover:border-rose-200"
                          title="Delete / Revoke Fine (Admin/HR)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredFines.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400 dark:text-gray-500">
                    {searchQuery || selectedReasonFilter !== "ALL"
                      ? "No penalty records match your search or filter criteria."
                      : "No penalties recorded. Keep up the high standard of compliance!"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
