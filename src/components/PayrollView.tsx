"use client";

import React, { useState } from "react";
import { 
  IndianRupee, Mail, Plus, Trash2, ShieldCheck, FileText, 
  Send, HelpCircle, Landmark, Sparkles, Settings, ArrowDownRight, Printer, CheckCircle,
  ChevronLeft, ChevronRight, RefreshCw
} from "lucide-react";
import { Employee, Designation, Payslip, SimulatedEmail, UserRole, Fine } from "../types";

interface PayrollViewProps {
  employees: Employee[];
  designations: Designation[];
  payslips: Payslip[];
  emails: SimulatedEmail[];
  fines?: Fine[];
  role: UserRole;
  currentEmployeeId: string;
  onAddDesignation: (title: string, department: string) => void;
  onRemoveDesignation: (id: string) => void;
  onGeneratePayslip: (employeeId: string, month: string) => Promise<void> | void;
  onPayAllPayslips: (month: string) => void;
}

export default function PayrollView({
  employees,
  designations,
  payslips,
  emails,
  fines = [],
  role,
  currentEmployeeId,
  onAddDesignation,
  onRemoveDesignation,
  onGeneratePayslip,
  onPayAllPayslips
}: PayrollViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"payslips" | "designations" | "emailLogs">("payslips");
  const [selectedMonth, setSelectedMonth] = useState("July 2026");
  const [compilingEmpId, setCompilingEmpId] = useState<string | null>(null);

  // Designation state
  const [newTitle, setNewTitle] = useState("");
  const [newDept, setNewDept] = useState("Loans");

  // Selected payslip for detailed view modal
  const [activeSlip, setActiveSlip] = useState<Payslip | null>(null);

  // Pagination state for Payroll Center list (9 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  const totalItems = employees.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const paginatedEmployees = employees.slice(startIndex, endIndex);

  const handleCompileSlip = async (empId: string) => {
    if (compilingEmpId) return;
    setCompilingEmpId(empId);
    try {
      await onGeneratePayslip(empId, selectedMonth);
    } finally {
      setCompilingEmpId(null);
    }
  };

  const handleAddDesg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    onAddDesignation(newTitle, newDept);
    setNewTitle("");
  };

  const getDesignationTitle = (id: string) => {
    return designations.find(d => d.id === id)?.title || "Associate";
  };

  const getEmployeeName = (empId: string) => {
    return employees.find(e => e.id === empId)?.fullName || "Unknown Agent";
  };

  const getEmployeeEmail = (empId: string) => {
    return employees.find(e => e.id === empId)?.email || "";
  };

  const getEmployeeBank = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    return emp ? `${emp.bankDetails.bankName} - A/C ****${emp.bankDetails.accountNumber.slice(-4)}` : "HDFC Bank";
  };

  const currentMonthPayslips = payslips.filter(p => p.month === selectedMonth);

  return (
    <div className="space-y-6">
      {/* Tab Navigation header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-3.5 sm:p-4 shadow-xs dark:neon-glow">
        <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-[#0a0a0a] p-1 rounded-xl border border-slate-100 dark:border-[#1a1a1a] text-xs font-semibold overflow-x-auto scrollbar-none max-w-full">
          <button
            onClick={() => setActiveSubTab("payslips")}
            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeSubTab === "payslips" ? "bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-white shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
          >
            {role === "employee" ? "My Salary Payslips" : "Payroll Dashboard"}
          </button>
          
          {(role === "admin" || role === "hr") && (
            <>
              <button
                onClick={() => setActiveSubTab("designations")}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeSubTab === "designations" ? "bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-white shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
              >
                Designation Manager
              </button>
              <button
                onClick={() => setActiveSubTab("emailLogs")}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeSubTab === "emailLogs" ? "bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-white shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
              >
                Emailed Payslips Ledger
              </button>
            </>
          )}
        </div>

        {activeSubTab === "payslips" && (
          <div className="flex items-center space-x-2 shrink-0">
            <label className="text-xs font-semibold text-slate-400">Month Ledger:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-1.5 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-bold focus:outline-hidden"
            >
              {Array.from(new Set(["June 2026", "July 2026", "August 2026", ...payslips.map(p => p.month)])).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* SUBTAB 1: Payslips Grid & Generating Station */}
      {activeSubTab === "payslips" && (
        <div className="space-y-6">
          {role === "employee" ? (
            /* Employee View: Payslip Archives */
            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
              <div className="mb-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">
                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">My Payslips Vault</h3>
                <p className="text-xs text-slate-400 dark:text-gray-500">Download and print validated salary slips</p>
              </div>

              <div className="space-y-3">
                {payslips
                  .filter(p => p.employeeId === currentEmployeeId)
                  .map(slip => (
                    <div key={slip.id} className="p-4 bg-slate-50/50 dark:bg-[#0a0a0a]/50 border border-slate-100 dark:border-[#1a1a1a] rounded-xl flex items-center justify-between text-xs">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 dark:text-white text-xs">{slip.month} Earnings Summary</p>
                        <p className="text-slate-400 dark:text-gray-500 font-medium">Net Disbursed: <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">₹{slip.netPay.toLocaleString()}</span></p>
                        <p className="text-[10px] text-slate-400 dark:text-gray-500">Disbursed to: {getEmployeeBank(slip.employeeId)}</p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setActiveSlip(slip)}
                          className="bg-emerald-600/10 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-600/20 px-3 py-2 rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View PDF Slip</span>
                        </button>
                      </div>
                    </div>
                  ))}
                {payslips.filter(p => p.employeeId === currentEmployeeId).length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-6 bg-slate-50/50 dark:bg-[#0a0a0a]/10 rounded-xl">No salary payslips generated for this billing month yet.</p>
                )}
              </div>
            </div>
          ) : (
            /* HR/Admin View: Process and Generate Payslips */
            <>
              {/* Top Monthly Summary KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs dark:neon-glow flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Slips Generated This Month</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-white font-mono mt-1">
                      {currentMonthPayslips.length} <span className="text-xs text-slate-400 font-normal">/ {employees.length}</span>
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs dark:neon-glow flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Total Net Disbursed Log</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                      ₹{currentMonthPayslips.reduce((sum, p) => sum + p.netPay, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs dark:neon-glow flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">EPF Provident Fund Logs</p>
                    <p className="text-xl font-bold text-indigo-500 font-mono mt-1">
                      ₹{currentMonthPayslips.reduce((sum, p) => sum + p.pfDeduction, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center font-bold">
                    <Landmark className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Full-width Lending Agents Payroll Center Table Card */}
              <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">
                  <div>
                    <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">Lending Agents Payroll Center</h3>
                    <p className="text-xs text-slate-400 dark:text-gray-500">Generate structural salary slips with automated email dispatch</p>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Disburse salary for all Generated slips in ${selectedMonth}?`)) {
                        onPayAllPayslips(selectedMonth);
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    Bulk Disburse Payments
                  </button>
                </div>

                <div className="bg-slate-50 dark:bg-[#0a0a0a]/50 p-3 rounded-xl border border-slate-100 dark:border-[#1a1a1a] text-[11px] text-slate-500 dark:text-gray-400 leading-normal flex items-start space-x-2">
                  <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Generating a salary slip immediately locks any outstanding late-coming fines and compiles HRA structures. An automated verification notification with structural break-up is sent directly to the agent's email address.</span>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-[#1a1a1a] text-slate-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                        <th className="py-2.5 px-3 whitespace-nowrap">Agent Name</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Base Compensation</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">HRA + Allowances</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Fines Deducted</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Net Disbursed</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-[#1a1a1a]/50">
                      {paginatedEmployees.map(emp => {
                        const hasSlip = currentMonthPayslips.find(p => p.employeeId === emp.id);
                        const grossEarnings = emp.salary.basic + emp.salary.hra + emp.salary.allowances;
                        const pfDeduction = emp.salary.pfDeduction || Math.round(emp.salary.basic * 0.08);
                        const empPendingFines = (fines || [])
                          .filter(f => f.employeeId === emp.id && f.status === "Pending")
                          .reduce((sum, f) => sum + f.amount, 0);
                        const defaultTaxes = Math.round(grossEarnings * 0.05);
                        const netSalaryEstimate = Math.max(0, grossEarnings - pfDeduction - empPendingFines - defaultTaxes);

                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a]/30 transition-colors">
                            <td className="py-3 px-3 font-semibold text-slate-700 dark:text-gray-300 flex items-center space-x-2 whitespace-nowrap">
                              <div className="w-5.5 h-5.5 rounded-full bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center font-bold text-[9px] uppercase shrink-0">
                                {emp.fullName.charAt(0)}
                              </div>
                              <div>
                                <span className="block leading-tight">{emp.fullName}</span>
                                <span className="text-[10px] text-slate-400 dark:text-gray-500 font-normal font-mono">{emp.id}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-600 dark:text-gray-400 font-semibold whitespace-nowrap">₹{emp.salary.basic.toLocaleString()}</td>
                            <td className="py-3 px-3 font-mono text-slate-500 dark:text-gray-500 whitespace-nowrap">₹{(emp.salary.hra + emp.salary.allowances).toLocaleString()}</td>
                            <td className="py-3 px-3 font-mono text-rose-500 whitespace-nowrap">
                              ₹{hasSlip ? hasSlip.finesDeducted.toLocaleString() : empPendingFines.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                              ₹{hasSlip ? hasSlip.netPay.toLocaleString() : netSalaryEstimate.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${
                                hasSlip?.status === "Paid" 
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                  : hasSlip?.status === "Generated"
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                                  : "bg-slate-100 text-slate-500 dark:bg-[#1a1a1a] dark:text-gray-400"
                              }`}>
                                {hasSlip ? hasSlip.status : "Pending Run"}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              {hasSlip ? (
                                <button
                                  onClick={() => setActiveSlip(hasSlip)}
                                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold inline-flex items-center space-x-1 cursor-pointer"
                                >
                                  <span>Review Slip</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleCompileSlip(emp.id)}
                                  disabled={compilingEmpId === emp.id}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-2.5 py-1.5 rounded-lg inline-flex items-center space-x-1 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {compilingEmpId === emp.id ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
                                      <span>Compiling...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                      <span>Compile Slip</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalItems > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-[#1a1a1a] text-xs">
                    <div className="text-slate-400 font-medium">
                      Showing <span className="font-bold text-slate-700 dark:text-gray-200">{startIndex + 1}</span> to <span className="font-bold text-slate-700 dark:text-gray-200">{endIndex}</span> of <span className="font-bold text-slate-700 dark:text-gray-200">{totalItems}</span> agents
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={safeCurrentPage === 1}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-[#1a1a1a] text-slate-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-all cursor-pointer"
                        title="Previous Page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                            safeCurrentPage === page
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-50 dark:bg-[#0a0a0a] text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] border border-slate-100 dark:border-[#1a1a1a]"
                          }`}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                        disabled={safeCurrentPage === totalPages}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-[#1a1a1a] text-slate-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-all cursor-pointer"
                        title="Next Page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* SUBTAB 2: Designation Settings Manager */}
      {activeSubTab === "designations" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Designation Form */}
          <div className="lg:col-span-1 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md mb-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">Add Corporate Designation</h3>

            <form onSubmit={handleAddDesg} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Designation Title</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Senior Insurance Underwriter"
                  className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Functional Department</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-medium"
                >
                  <option value="Loans">Loans Department</option>
                  <option value="Insurance">Insurance Department</option>
                  <option value="Risk">Risk Department</option>
                  <option value="HR">HR Department</option>
                  <option value="Operations">Operations</option>
                  <option value="Compliance">Compliance</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Register Designation</span>
              </button>
            </form>
          </div>

          {/* Designation Listing */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md mb-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">Designation Directories</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {designations.map(desg => (
                <div key={desg.id} className="p-3 bg-slate-50/50 dark:bg-[#0a0a0a]/40 border border-slate-100/50 dark:border-[#1a1a1a]/50 rounded-xl flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-700 dark:text-gray-300">{desg.title}</p>
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium">Department: {desg.department}</p>
                    <p className="text-[9px] text-slate-400 font-mono">{desg.id}</p>
                  </div>

                  {desg.id.startsWith("des-") && desg.id !== "des-1" && desg.id !== "des-2" && desg.id !== "des-3" && (
                    <button
                      onClick={() => onRemoveDesignation(desg.id)}
                      className="p-1 hover:bg-white dark:hover:bg-[#1a1a1a] text-rose-400 hover:text-rose-600 dark:text-rose-500 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: Simulated Emailed Payslips Logs */}
      {activeSubTab === "emailLogs" && (
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
          <div className="mb-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">Emailed Notification Logs</h3>
            <p className="text-xs text-slate-400 dark:text-gray-500">Live feed of automated email campaigns dispatched during salary runs</p>
          </div>

          <div className="space-y-4">
            {emails.slice().reverse().map(email => (
              <div key={email.id} className="p-4 bg-slate-50/50 dark:bg-[#0a0a0a]/20 border border-slate-100 dark:border-[#1a1a1a] rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100/50 dark:border-[#1a1a1a] pb-2">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-700 dark:text-gray-300 flex items-center">
                      <Mail className="w-4 h-4 text-emerald-500 mr-2" /> To: {email.recipientName} ({email.recipientEmail})
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 font-medium"><b>Subject</b>: {email.subject}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{new Date(email.sentAt).toLocaleString()}</span>
                </div>
                <p className="text-slate-600 dark:text-gray-300 whitespace-pre-wrap font-mono text-[11px] leading-relaxed bg-white dark:bg-[#0a0a0a] p-3 rounded-lg border border-slate-100 dark:border-[#1a1a1a]">
                  {email.body}
                </p>
              </div>
            ))}
            {emails.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-8">No emailed dispatches logged yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Detailed Salary Slip Modal */}
      {activeSlip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-emerald-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-display font-bold text-md leading-none">SnailHR Compensation Audit</h3>
                  <p className="text-[10px] text-emerald-100 mt-1 font-mono">ID: {activeSlip.id}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveSlip(null)}
                  className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-white text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Slip content */}
            <div className="p-6 space-y-6 text-xs max-h-[500px] overflow-y-auto custom-scrollbar">
              {/* Employer Info */}
              <div className="flex justify-between items-start border-b border-slate-100 dark:border-[#1a1a1a] pb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 dark:text-white">SNAIL HR SOLUTIONS & FINANCE</h2>
                  <p className="text-slate-400 mt-0.5">Corporate Headquarters, Bandra-Kurla Complex</p>
                  <p className="text-slate-400">Mumbai, MH - 400051</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">SALARY STATEMENT</p>
                  <p className="text-slate-400 mt-0.5">Pay Month: <b>{activeSlip.month}</b></p>
                  <p className="text-slate-400">Status: <span className="font-bold text-emerald-600 uppercase font-mono">{activeSlip.status}</span></p>
                </div>
              </div>

              {/* Employee Detail Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-[#0a0a0a]/40 p-4 rounded-xl border border-slate-100/50 dark:border-[#1a1a1a]/50">
                <div>
                  <span className="text-slate-400 block">Agent Name</span>
                  <span className="font-semibold text-slate-700 dark:text-gray-300">{getEmployeeName(activeSlip.employeeId)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Employee Code</span>
                  <span className="font-semibold text-slate-700 dark:text-gray-300 font-mono">{activeSlip.employeeId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Designation</span>
                  <span className="font-semibold text-slate-700 dark:text-gray-300">
                    {getDesignationTitle(employees.find(e => e.id === activeSlip.employeeId)?.designationId || "")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Bank Account</span>
                  <span className="font-semibold text-slate-700 dark:text-gray-300 font-mono">****{employees.find(e => e.id === activeSlip.employeeId)?.bankDetails.accountNumber.slice(-4)}</span>
                </div>
              </div>

              {/* Table of Earnings / Deductions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Earnings */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-[#1a1a1a] pb-1.5 text-xs uppercase text-emerald-600">Earnings Detail</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Basic Salary</span>
                      <span className="font-semibold text-slate-700 dark:text-gray-300 font-mono">₹{activeSlip.basic.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">HRA Allowance</span>
                      <span className="font-semibold text-slate-700 dark:text-gray-300 font-mono">₹{activeSlip.hra.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Special Allowances</span>
                      <span className="font-semibold text-slate-700 dark:text-gray-300 font-mono">₹{activeSlip.allowances.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-slate-100 dark:border-[#1a1a1a] pt-1.5">
                      <span className="text-slate-800 dark:text-white">Gross Earnings</span>
                      <span className="text-slate-800 dark:text-white font-mono">₹{(activeSlip.basic + activeSlip.hra + activeSlip.allowances).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-[#1a1a1a] pb-1.5 text-xs uppercase text-rose-600">Deductions Detail</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Employee PF</span>
                      <span className="font-semibold text-slate-700 dark:text-gray-300 font-mono">₹{activeSlip.pfDeduction.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">TDS / Profession Tax</span>
                      <span className="font-semibold text-slate-700 dark:text-gray-300 font-mono">₹{activeSlip.taxDeduction.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-rose-500">
                      <span>Corporate Late Fines</span>
                      <span className="font-semibold font-mono">₹{activeSlip.finesDeducted.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-slate-100 dark:border-[#1a1a1a] pt-1.5">
                      <span className="text-slate-800 dark:text-white">Total Deductions</span>
                      <span className="text-slate-800 dark:text-white font-mono">₹{(activeSlip.pfDeduction + activeSlip.taxDeduction + activeSlip.finesDeducted).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net disbursed */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl flex items-center justify-between border border-emerald-100 dark:border-emerald-900/40 pt-3">
                <div>
                  <p className="font-semibold text-emerald-800 dark:text-emerald-400">Net Salary Disbursed (In Bank Account)</p>
                  <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">Cleared on H2 Automated Settlement Server</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">₹{activeSlip.netPay.toLocaleString()}</p>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 dark:text-gray-500 text-center leading-normal pt-2">
                This is a computer-generated salary slip in SnailHR. No physical seal or handwritten signatures are required. Legal inquiries may be routed to priya.patel@snailhr.com.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
