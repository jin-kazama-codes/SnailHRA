"use client";

import React, { useState } from "react";
import { 
  IndianRupee, Mail, Plus, Trash2, ShieldCheck, FileText, 
  Send, HelpCircle, Landmark, Sparkles, Settings, ArrowDownRight, Printer, CheckCircle,
  ChevronLeft, ChevronRight, RefreshCw, Sliders, Percent, ShieldAlert, Search, Save, UserCheck, UserX, Calculator, AlertCircle, Check, X
} from "lucide-react";
import { Employee, Designation, Payslip, SimulatedEmail, UserRole, Fine, PayrollConfig } from "../types";

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
  onResetPayslip?: (employeeId: string, month: string) => Promise<void> | void;
  companyName?: string;
  companyId?: string;
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
  onPayAllPayslips,
  onResetPayslip,
  companyName = "Your Company",
  companyId = "a1b2c3d4-0001-0001-0001-000000000001"
}: PayrollViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"payslips" | "config">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("snailhr_payroll_activeSubTab");
      if (saved === "payslips" || saved === "config") {
        return saved;
      }
    }
    return "payslips";
  });


  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("snailhr_payroll_activeSubTab", activeSubTab);
    }
  }, [activeSubTab]);

  const [selectedMonth, setSelectedMonth] = useState("July 2026");
  const [compilingEmpId, setCompilingEmpId] = useState<string | null>(null);

  // Payroll Configuration State
  const [config, setConfig] = useState<PayrollConfig>({
    companyId,
    hraType: "percentage",
    hraValue: 40,
    pfType: "percentage",
    pfValue: 12,
    pfExemptEmployeeIds: [],
    allowancesType: "percentage",
    allowancesValue: 20,
    taxType: "percentage",
    taxValue: 5,
  });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [pfSearchQuery, setPfSearchQuery] = useState("");
  const [simEmpId, setSimEmpId] = useState<string>(employees[0]?.id || "");

  // Load tenant payroll config from backend API
  const fetchConfig = React.useCallback(async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch(`/api/payroll/config?companyId=${encodeURIComponent(companyId)}`);
      const data = await res.json();
      if (res.ok && data.config) {
        setConfig(data.config);
      }
    } catch (err) {
      console.warn("Failed to fetch payroll config:", err);
    } finally {
      setLoadingConfig(false);
    }
  }, [companyId]);

  React.useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  React.useEffect(() => {
    if (employees.length > 0 && !simEmpId) {
      setSimEmpId(employees[0].id);
    }
  }, [employees, simEmpId]);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setSaveSuccessMsg("");
    try {
      const res = await fetch("/api/payroll/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, companyId }),
      });
      const data = await res.json();
      if (res.ok && data.config) {
        setConfig(data.config);
        setSaveSuccessMsg("Payroll rules and PF exemptions saved successfully for tenant!");
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      } else {
        alert(data.error || "Failed to save payroll rules");
      }
    } catch (err) {
      alert("Error saving payroll configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  const togglePfExempt = (empId: string) => {
    setConfig(prev => {
      const current = prev.pfExemptEmployeeIds || [];
      const exists = current.includes(empId);
      const next = exists ? current.filter(id => id !== empId) : [...current, empId];
      return { ...prev, pfExemptEmployeeIds: next };
    });
  };


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


  const getDesignationTitle = (id: string) => {
    return designations.find(d => d.id === id)?.title || "Associate";
  };

  const getEmployeeName = (empId: string) => {
    return employees.find(e => e.id === empId)?.fullName || "Unknown Employee";
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
                onClick={() => setActiveSubTab("config")}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${activeSubTab === "config" ? "bg-white dark:bg-[#1a1a1a] text-emerald-600 dark:text-emerald-400 font-bold shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                <span>Salary & PF Rules</span>
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
                    <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">Employees Payroll Center</h3>
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
                  <span>Generating a salary slip immediately locks any outstanding late-coming fines and compiles HRA structures. An automated verification notification with structural break-up is sent directly to the employee's email address.</span>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-[#1a1a1a] text-slate-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                        <th className="py-2.5 px-3 whitespace-nowrap">Employee Name</th>
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
                          .filter(f => f.employeeId === emp.id && f.status === "Deducted From Payroll")
                          .reduce((sum, f) => sum + f.amount, 0);
                        const defaultTaxes = typeof emp.salary.tdsDeduction === "number"
                          ? emp.salary.tdsDeduction
                          : Math.round(grossEarnings * 0.05);
                        const netSalaryEstimate = Math.max(0, grossEarnings - pfDeduction - empPendingFines - defaultTaxes);

                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a]/30 transition-colors">
                            <td className="py-3 px-3 font-semibold text-slate-700 dark:text-gray-300 flex items-center space-x-2 whitespace-nowrap">
                              <div className="w-5.5 h-5.5 rounded-full bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center font-bold text-[9px] uppercase shrink-0">
                                {emp.fullName.charAt(0)}
                              </div>
                              <div>
                                <span className="block leading-tight">{emp.fullName}</span>
                                <span className="text-[10px] text-slate-400 dark:text-gray-500 font-normal">{emp.department}</span>
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
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => setActiveSlip(hasSlip)}
                                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold inline-flex items-center space-x-1 cursor-pointer"
                                  >
                                    <span>Review Slip</span>
                                  </button>
                                  {(role === "admin" || role === "hr") && onResetPayslip && (
                                    <button
                                      onClick={() => {
                                        if (confirm(`Reset and delete the generated payslip for ${emp.fullName} for ${selectedMonth}? This will release the fine deductions back to payroll.`)) {
                                          onResetPayslip(emp.id, selectedMonth);
                                        }
                                      }}
                                      className="text-rose-500 hover:text-rose-700 font-bold inline-flex items-center cursor-pointer ml-2"
                                      title="Reset compiled slip to regenerate"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
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
                      Showing <span className="font-bold text-slate-700 dark:text-gray-200">{startIndex + 1}</span> to <span className="font-bold text-slate-700 dark:text-gray-200">{endIndex}</span> of <span className="font-bold text-slate-700 dark:text-gray-200">{totalItems}</span> employees
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




      {/* SUBTAB 4: Tenant Salary & PF Configuration */}
      {activeSubTab === "config" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Banner Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-emerald-200" />
                <h3 className="font-display font-bold text-lg">Tenant Salary & PF Configuration</h3>
              </div>
              <p className="text-xs text-emerald-100 max-w-xl">
                Set basic-salary-based formulas for HRA, Allowances, PF, and TDS/Tax deductions. Manage employee Provident Fund (PF) exemptions with real-time tenant scoping.
              </p>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="bg-white text-emerald-700 hover:bg-emerald-50 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-emerald-600" />}
                <span>{savingConfig ? "Saving Rules..." : "Save Configuration"}</span>
              </button>
            </div>
          </div>

          {/* Floating Toast Notification on Success */}
          {saveSuccessMsg && (
            <div className="fixed top-20 right-6 z-50 bg-slate-900/95 text-white dark:bg-[#0a0a0a]/95 dark:text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center space-x-3 backdrop-blur-md animate-in slide-in-from-top-4 fade-in duration-300">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="pr-2">
                <p className="font-extrabold text-xs text-white">Payroll Rules Saved!</p>
                <p className="text-[11px] text-emerald-300 font-medium">{saveSuccessMsg}</p>
              </div>
              <button
                type="button"
                onClick={() => setSaveSuccessMsg("")}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}


          {/* Split View Grid: Left = Formula Settings, Right = Live Simulator & PF Exemption */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Column 1 & 2: Component Calculation Formula Settings */}
            <div className="lg:col-span-2 space-y-6">

              {/* Earnings Formulas Card */}
              <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1a1a1a] pb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Earnings Component Rules</h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Calculated from Basic Salary</span>
                </div>

                {/* HRA Setting */}
                <div className="bg-slate-50/50 dark:bg-[#0a0a0a]/50 p-4 rounded-xl border border-slate-100 dark:border-[#1a1a1a] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-700 dark:text-gray-200 text-xs">House Rent Allowance (HRA)</p>
                      <p className="text-[11px] text-slate-400">Allowance for accommodation expenses</p>
                    </div>
                    
                    {/* Type Switcher */}
                    <div className="flex bg-white dark:bg-[#1a1a1a] p-1 rounded-lg border border-slate-200 dark:border-[#252525] text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, hraType: "percentage" }))}
                        className={`px-3 py-1 rounded-md transition-all ${config.hraType === "percentage" ? "bg-emerald-600 text-white shadow-xs font-bold" : "text-slate-500"}`}
                      >
                        % of Basic
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, hraType: "fixed" }))}
                        className={`px-3 py-1 rounded-md transition-all ${config.hraType === "fixed" ? "bg-emerald-600 text-white shadow-xs font-bold" : "text-slate-500"}`}
                      >
                        ₹ Fixed
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 pt-1">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={config.hraValue}
                        onChange={e => setConfig(prev => ({ ...prev, hraValue: Number(e.target.value) || 0 }))}
                        className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#1a1a1a] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">
                        {config.hraType === "percentage" ? "%" : "₹"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {config.hraType === "percentage" ? `HRA = ${config.hraValue}% of Basic Salary` : `Fixed ₹${config.hraValue.toLocaleString()} per month`}
                    </p>
                  </div>
                </div>

                {/* Special Allowances Setting */}
                <div className="bg-slate-50/50 dark:bg-[#0a0a0a]/50 p-4 rounded-xl border border-slate-100 dark:border-[#1a1a1a] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-700 dark:text-gray-200 text-xs">Special & Other Allowances</p>
                      <p className="text-[11px] text-slate-400">Medical, conveyance & flexible benefits</p>
                    </div>
                    
                    <div className="flex bg-white dark:bg-[#1a1a1a] p-1 rounded-lg border border-slate-200 dark:border-[#252525] text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, allowancesType: "percentage" }))}
                        className={`px-3 py-1 rounded-md transition-all ${config.allowancesType === "percentage" ? "bg-emerald-600 text-white shadow-xs font-bold" : "text-slate-500"}`}
                      >
                        % of Basic
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, allowancesType: "fixed" }))}
                        className={`px-3 py-1 rounded-md transition-all ${config.allowancesType === "fixed" ? "bg-emerald-600 text-white shadow-xs font-bold" : "text-slate-500"}`}
                      >
                        ₹ Fixed
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 pt-1">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={config.allowancesValue}
                        onChange={e => setConfig(prev => ({ ...prev, allowancesValue: Number(e.target.value) || 0 }))}
                        className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#1a1a1a] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">
                        {config.allowancesType === "percentage" ? "%" : "₹"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {config.allowancesType === "percentage" ? `Allowances = ${config.allowancesValue}% of Basic` : `Fixed ₹${config.allowancesValue.toLocaleString()} per month`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Deductions Rules Card */}
              <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1a1a1a] pb-3">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Deduction Rules (PF & TDS/Tax)</h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Government & Statutory Deductions</span>
                </div>

                {/* Provident Fund Setting */}
                <div className="bg-slate-50/50 dark:bg-[#0a0a0a]/50 p-4 rounded-xl border border-slate-100 dark:border-[#1a1a1a] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-700 dark:text-gray-200 text-xs flex items-center gap-1.5">
                        <span>Provident Fund (PF) Contribution</span>
                        <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[9px] px-2 py-0.5 rounded-full font-extrabold">Statutory</span>
                      </p>
                      <p className="text-[11px] text-slate-400">Employee PF contribution deducted monthly</p>
                    </div>
                    
                    <div className="flex bg-white dark:bg-[#1a1a1a] p-1 rounded-lg border border-slate-200 dark:border-[#252525] text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, pfType: "percentage" }))}
                        className={`px-3 py-1 rounded-md transition-all ${config.pfType === "percentage" ? "bg-rose-600 text-white shadow-xs font-bold" : "text-slate-500"}`}
                      >
                        % of Basic
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, pfType: "fixed" }))}
                        className={`px-3 py-1 rounded-md transition-all ${config.pfType === "fixed" ? "bg-rose-600 text-white shadow-xs font-bold" : "text-slate-500"}`}
                      >
                        ₹ Fixed
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 pt-1">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={config.pfValue}
                        onChange={e => setConfig(prev => ({ ...prev, pfValue: Number(e.target.value) || 0 }))}
                        className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#1a1a1a] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-gray-200 focus:outline-none focus:border-rose-500"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">
                        {config.pfType === "percentage" ? "%" : "₹"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {config.pfType === "percentage" ? `PF = ${config.pfValue}% of Basic` : `Fixed ₹${config.pfValue.toLocaleString()} per month`}
                    </p>
                  </div>
                </div>

                {/* Tax / TDS Setting */}
                <div className="bg-slate-50/50 dark:bg-[#0a0a0a]/50 p-4 rounded-xl border border-slate-100 dark:border-[#1a1a1a] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-700 dark:text-gray-200 text-xs">Income Tax (TDS) / Profession Tax</p>
                      <p className="text-[11px] text-slate-400">Calculated on Gross Compensation</p>
                    </div>
                    
                    <div className="flex bg-white dark:bg-[#1a1a1a] p-1 rounded-lg border border-slate-200 dark:border-[#252525] text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, taxType: "percentage" }))}
                        className={`px-3 py-1 rounded-md transition-all ${config.taxType === "percentage" ? "bg-rose-600 text-white shadow-xs font-bold" : "text-slate-500"}`}
                      >
                        % of Gross
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, taxType: "fixed" }))}
                        className={`px-3 py-1 rounded-md transition-all ${config.taxType === "fixed" ? "bg-rose-600 text-white shadow-xs font-bold" : "text-slate-500"}`}
                      >
                        ₹ Fixed
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 pt-1">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={config.taxValue}
                        onChange={e => setConfig(prev => ({ ...prev, taxValue: Number(e.target.value) || 0 }))}
                        className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#1a1a1a] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-gray-200 focus:outline-none focus:border-rose-500"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">
                        {config.taxType === "percentage" ? "%" : "₹"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {config.taxType === "percentage" ? `Tax = ${config.taxValue}% of Gross Pay` : `Fixed ₹${config.taxValue.toLocaleString()} per month`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Employee PF Exemption Manager */}
              <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#1a1a1a] pb-3">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                      <UserX className="w-4 h-4 text-amber-500" />
                      <span>PF Exempted Employees Manager</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Select employees who are exempted from PF deduction (PF will be set to ₹0)
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = employees.map(e => e.id);
                        setConfig(prev => ({ ...prev, pfExemptEmployeeIds: allIds }));
                      }}
                      className="text-[10px] font-bold px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-900/40 hover:bg-amber-100 transition-all cursor-pointer"
                    >
                      Exempt All
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, pfExemptEmployeeIds: [] }))}
                      className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Search Filter */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search employee by name, designation, or department..."
                    value={pfSearchQuery}
                    onChange={e => setPfSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a] rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-700 dark:text-gray-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Checkbox List */}
                <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                  {employees
                    .filter(e => {
                      const q = pfSearchQuery.toLowerCase();
                      const dName = getDesignationTitle(e.designationId).toLowerCase();
                      return e.fullName.toLowerCase().includes(q) || e.department.toLowerCase().includes(q) || dName.includes(q);
                    })
                    .map(emp => {
                      const isExempt = (config.pfExemptEmployeeIds || []).includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all text-xs select-none ${
                            isExempt
                              ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/50 shadow-xs"
                              : "bg-slate-50/50 dark:bg-[#0a0a0a]/30 border-slate-100 dark:border-[#1a1a1a] hover:bg-slate-100/60"
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={isExempt}
                              onChange={() => togglePfExempt(emp.id)}
                              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                            />
                            <div>
                              <p className="font-bold text-slate-800 dark:text-white leading-tight">{emp.fullName}</p>
                              <p className="text-[10px] text-slate-400 leading-tight">
                                {getDesignationTitle(emp.designationId)} • {emp.department}
                              </p>
                            </div>
                          </div>

                          {isExempt ? (
                            <span className="text-[10px] font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-xs">
                              EXEMPTED (₹0 PF)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">
                              Standard PF Active
                            </span>
                          )}
                        </label>

                      );
                    })}

                  {employees.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6">No active employees found.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Column 3: Live Simulator & Preview Calculator */}
            <div className="space-y-6">

              <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs sticky top-[75px] space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-[#1a1a1a] pb-3">
                  <Calculator className="w-5 h-5 text-emerald-500" />
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Live Salary Simulator</h4>
                    <p className="text-[10px] text-slate-400">Test formula outputs in real-time</p>
                  </div>
                </div>

                {/* Select Sample Employee */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Select Employee for Simulation:</label>
                  <select
                    value={simEmpId}
                    onChange={e => setSimEmpId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a] text-slate-700 dark:text-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  >
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.fullName} ({getDesignationTitle(e.designationId)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Simulation Output Card */}
                {(() => {
                  const simEmp = employees.find(e => e.id === simEmpId) || employees[0];
                  if (!simEmp) return null;

                  const basic = simEmp.salary?.basic || 45000;
                  const hra = config.hraType === "percentage" ? Math.round(basic * (config.hraValue / 100)) : config.hraValue;
                  const allowances = config.allowancesType === "percentage" ? Math.round(basic * (config.allowancesValue / 100)) : config.allowancesValue;
                  const gross = basic + hra + allowances;

                  const isExempt = (config.pfExemptEmployeeIds || []).includes(simEmp.id);
                  const pf = isExempt ? 0 : (config.pfType === "percentage" ? Math.round(basic * (config.pfValue / 100)) : config.pfValue);
                  const tax = config.taxType === "percentage" ? Math.round(gross * (config.taxValue / 100)) : config.taxValue;
                  const net = gross - pf - tax;

                  return (
                    <div className="space-y-3 pt-2">
                      <div className="bg-slate-50/80 dark:bg-[#0a0a0a]/60 p-4 rounded-xl border border-slate-100 dark:border-[#1a1a1a] space-y-2.5 text-xs">
                        <p className="font-extrabold text-slate-800 dark:text-white border-b border-slate-100 dark:border-[#1a1a1a] pb-1.5 flex justify-between">
                          <span>Basic Salary</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">₹{basic.toLocaleString()}</span>
                        </p>

                        <div className="space-y-1.5 pt-1 text-slate-500 dark:text-gray-400">
                          <div className="flex justify-between">
                            <span>+ HRA ({config.hraType === "percentage" ? `${config.hraValue}%` : "Fixed"})</span>
                            <span className="font-mono text-slate-700 dark:text-gray-200">₹{hra.toLocaleString()}</span>
                          </div>

                          <div className="flex justify-between">
                            <span>+ Allowances ({config.allowancesType === "percentage" ? `${config.allowancesValue}%` : "Fixed"})</span>
                            <span className="font-mono text-slate-700 dark:text-gray-200">₹{allowances.toLocaleString()}</span>
                          </div>

                          <div className="flex justify-between font-bold text-slate-800 dark:text-white pt-1.5 border-t border-slate-100 dark:border-[#1a1a1a]">
                            <span>Gross Compensation</span>
                            <span className="font-mono">₹{gross.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Deductions Breakdown */}
                      <div className="bg-rose-50/40 dark:bg-rose-950/10 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 space-y-2 text-xs">
                        <p className="font-bold text-rose-700 dark:text-rose-400 uppercase text-[10px] tracking-wider">Estimated Deductions</p>

                        <div className="flex justify-between items-center text-slate-600 dark:text-gray-300">
                          <span>- Provident Fund (PF)</span>
                          {isExempt ? (
                            <span className="font-mono text-amber-600 dark:text-amber-400 font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                              ₹0 (EXEMPT)
                            </span>
                          ) : (
                            <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">₹{pf.toLocaleString()}</span>
                          )}
                        </div>

                        <div className="flex justify-between text-slate-600 dark:text-gray-300">
                          <span>- Tax / TDS ({config.taxType === "percentage" ? `${config.taxValue}%` : "Fixed"})</span>
                          <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">₹{tax.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Net Disbursed Card */}
                      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-4 rounded-xl text-white space-y-1 shadow-md">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">Simulated Net Disbursed Pay</p>
                        <p className="text-2xl font-black font-mono">₹{net.toLocaleString()}</p>
                        <p className="text-[10px] text-emerald-100 pt-1">
                          Direct credit to {simEmp.bankDetails?.bankName || "Bank"} (A/C ****{simEmp.bankDetails?.accountNumber?.slice(-4) || "XXXX"})
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Action button */}
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center space-x-2 text-xs mt-2"
                >
                  {savingConfig ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Rules & Exemption List...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Rules & Exemption List</span>
                    </>
                  )}
                </button>

              </div>

            </div>

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
                  <h3 className="font-display font-bold text-md leading-none">{companyName} Compensation Audit</h3>
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
                  <h2 className="text-sm font-bold text-slate-800 dark:text-white">{companyName}</h2>
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
                  <span className="text-slate-400 block">Employee Name</span>
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
                This is a computer-generated salary slip issued by {companyName}. No physical seal or handwritten signatures are required.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
