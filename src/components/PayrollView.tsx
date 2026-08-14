"use client";

import React, { useState } from "react";
import { 
  IndianRupee, Mail, Plus, Trash2, ShieldCheck, FileText, 
  Send, HelpCircle, Landmark, Sparkles, Settings, ArrowDownRight, Printer, CheckCircle,
  ChevronLeft, ChevronRight, RefreshCw, Sliders, Percent, ShieldAlert, Search, Save, UserCheck, UserX, Calculator, AlertCircle, Check, X, Pencil
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
  onUpdateEmployee?: (id: string, updatedData: any) => Promise<void> | void;
  companyName?: string;
  companyId?: string;
  companyLogoUrl?: string;
  empCodePrefix?: string; // e.g. "MGMDIR" — set by admin in System Settings
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
  onUpdateEmployee,
  companyName = "Your Company",
  companyId = "a1b2c3d4-0001-0001-0001-000000000001",
  companyLogoUrl,
  empCodePrefix = "EMP",
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

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return now.toLocaleString("en-IN", { month: "long", year: "numeric" });
  });
  const [compilingEmpId, setCompilingEmpId] = useState<string | null>(null);

  // Edit Allowances State before compiling slip
  const [editingEmpForSalary, setEditingEmpForSalary] = useState<Employee | null>(null);
  const [editTel, setEditTel] = useState("");
  const [editFuel, setEditFuel] = useState("");
  const [editProfDev, setEditProfDev] = useState("");
  const [editLta, setEditLta] = useState("");
  const [editSpAllow, setEditSpAllow] = useState("");
  const [editPfMode, setEditPfMode] = useState<"percentage" | "fixed_1800" | "custom">("percentage");
  const [editPfCustom, setEditPfCustom] = useState("");
  const [editTdsOptIn, setEditTdsOptIn] = useState(true);
  const [editTdsMode, setEditTdsMode] = useState<"slab" | "custom">("slab");
  const [editTdsCustom, setEditTdsCustom] = useState("");
  const [editEsiOptIn, setEditEsiOptIn] = useState(true);
  const [editEsiCustom, setEditEsiCustom] = useState("");
  const [isSavingSalary, setIsSavingSalary] = useState(false);

  const openEditAllowancesModal = (emp: Employee) => {
    setEditingEmpForSalary(emp);

    // Helper: compute config-derived value for an allowance field
    const basic = emp.salary?.basic || 0;
    const configTel = config?.telephoneType === "percentage"
      ? Math.round(basic * ((config.telephoneValue || 0) / 100))
      : (config?.telephoneValue || 0);
    const configFuel = config?.fuelType === "percentage"
      ? Math.round(basic * ((config.fuelValue || 0) / 100))
      : (config?.fuelValue || 0);
    const configProfDev = config?.professionalDevType === "percentage"
      ? Math.round(basic * ((config.professionalDevValue || 0) / 100))
      : (config?.professionalDevValue || 0);
    const configLta = config?.ltaType === "percentage"
      ? Math.round(basic * ((config.ltaValue || 0) / 100))
      : (config?.ltaValue || 0);
    const configSpAllow = config?.allowancesType === "percentage"
      ? Math.round(basic * ((config.allowancesValue || 0) / 100))
      : (config?.allowancesValue || 0);

    // Use employee's stored value if set, otherwise fall back to config-calculated default
    setEditTel(emp.salary?.telephone ? String(emp.salary.telephone) : configTel ? String(configTel) : "");
    setEditFuel(emp.salary?.fuel ? String(emp.salary.fuel) : configFuel ? String(configFuel) : "");
    setEditProfDev(emp.salary?.professionalDev ? String(emp.salary.professionalDev) : configProfDev ? String(configProfDev) : "");
    setEditLta(emp.salary?.lta ? String(emp.salary.lta) : configLta ? String(configLta) : "");
    setEditSpAllow(emp.salary?.allowances ? String(emp.salary.allowances) : configSpAllow ? String(configSpAllow) : "");
    setEditPfMode(emp.salary?.pfMode || (config?.pfModeDefault === "fixed_1800" ? "fixed_1800" : "percentage"));
    setEditPfCustom(emp.salary?.pfDeduction ? String(emp.salary.pfDeduction) : "");
    setEditTdsOptIn(emp.salary?.tdsOptIn !== undefined ? emp.salary.tdsOptIn : true);
    setEditTdsMode(emp.salary?.tdsMode || "slab");
    setEditTdsCustom(emp.salary?.tdsDeduction ? String(emp.salary.tdsDeduction) : "");
    setEditEsiOptIn(emp.salary?.esiOptIn !== undefined ? emp.salary.esiOptIn : true);
    setEditEsiCustom(emp.salary?.esiDeduction ? String(emp.salary.esiDeduction) : "");
  };

  const handleSaveAllowances = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmpForSalary || !onUpdateEmployee) return;

    setIsSavingSalary(true);
    try {
      const basic = editingEmpForSalary.salary.basic || 0;
      let calculatedPf = editingEmpForSalary.salary.pfDeduction;
      if (editPfMode === "fixed_1800") {
        calculatedPf = 1800;
      } else if (editPfMode === "custom") {
        calculatedPf = Number(editPfCustom) || 0;
      } else {
        calculatedPf = Math.round(basic * ((config?.pfValue || 12) / 100));
      }

      const updatedSalary = {
        ...editingEmpForSalary.salary,
        telephone: Number(editTel) || 0,
        fuel: Number(editFuel) || 0,
        professionalDev: Number(editProfDev) || 0,
        lta: Number(editLta) || 0,
        allowances: Number(editSpAllow) || 0,
        pfMode: editPfMode,
        pfDeduction: calculatedPf,
        tdsOptIn: editTdsOptIn,
        tdsMode: editTdsMode,
        tdsDeduction: editTdsOptIn ? (editTdsMode === "custom" ? (Number(editTdsCustom) || 0) : editingEmpForSalary.salary.tdsDeduction) : 0,
        esiOptIn: editEsiOptIn,
        esiDeduction: editEsiOptIn ? (Number(editEsiCustom) || 0) : 0,
      };

      await onUpdateEmployee(editingEmpForSalary.id, {
        salary: updatedSalary,
      });

      setEditingEmpForSalary(null);
    } catch (err) {
      console.error("Error saving allowances:", err);
    } finally {
      setIsSavingSalary(false);
    }
  };

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

  // Number to Indian Rupees words converter
  const numberToWordsIndian = (amount: number): string => {
    if (!amount || amount <= 0 || isNaN(amount)) return "Zero";
    const num = Math.floor(amount);
    const singleDigits = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tensDigits = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const convertTwoDigits = (n: number): string => {
      if (n < 20) return singleDigits[n];
      const tens = Math.floor(n / 10);
      const units = n % 10;
      return tensDigits[tens] + (units ? " " + singleDigits[units] : "");
    };

    let str = "";
    const crore = Math.floor(num / 10000000);
    let remainder = num % 10000000;
    const lakh = Math.floor(remainder / 100000);
    remainder = remainder % 100000;
    const thousand = Math.floor(remainder / 1000);
    remainder = remainder % 1000;
    const hundred = Math.floor(remainder / 100);
    remainder = remainder % 100;

    if (crore > 0) str += convertTwoDigits(crore) + " Crore ";
    if (lakh > 0) str += convertTwoDigits(lakh) + " Lakh ";
    if (thousand > 0) str += convertTwoDigits(thousand) + " Thousand ";
    if (hundred > 0) str += convertTwoDigits(hundred) + " Hundred ";
    if (remainder > 0) {
      if (str.length > 0) str += "and ";
      str += convertTwoDigits(remainder) + " ";
    }
    return str.trim();
  };

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

  // Generate employee code: PREFIX + 4-digit zero-padded number
  const getEmployeeCode = (emp: Employee): string => {
    const prefix = (typeof window !== "undefined" ? localStorage.getItem("snailhr_empCodePrefix") || empCodePrefix : empCodePrefix).toUpperCase();
    const num = emp.employeeNumber || (employees.findIndex(e => e.id === emp.id) + 1);
    return `${prefix}${String(num).padStart(4, "0")}`;
  };

  // Get all salary components with defaults — falls back to config-derived values when employee has no per-field override
  const getEmpSalaryComponents = (emp: Employee) => {
    const basic = emp.salary.basic || 0;
    const configTel = config?.telephoneType === "percentage"
      ? Math.round(basic * ((config.telephoneValue || 0) / 100))
      : (config?.telephoneValue || 0);
    const configFuel = config?.fuelType === "percentage"
      ? Math.round(basic * ((config.fuelValue || 0) / 100))
      : (config?.fuelValue || 0);
    const configProfDev = config?.professionalDevType === "percentage"
      ? Math.round(basic * ((config.professionalDevValue || 0) / 100))
      : (config?.professionalDevValue || 0);
    const configLta = config?.ltaType === "percentage"
      ? Math.round(basic * ((config.ltaValue || 0) / 100))
      : (config?.ltaValue || 0);
    const configSpAllow = config?.allowancesType === "percentage"
      ? Math.round(basic * ((config.allowancesValue || 0) / 100))
      : (config?.allowancesValue || 0);
    return {
      basic,
      hra: emp.salary.hra || 0,
      telephone: emp.salary.telephone || configTel,
      fuel: emp.salary.fuel || configFuel,
      professionalDev: emp.salary.professionalDev || configProfDev,
      lta: emp.salary.lta || configLta,
      allowances: emp.salary.allowances || configSpAllow,
      pfDeduction: emp.salary.pfDeduction || 0,
      tdsDeduction: emp.salary.tdsDeduction || 0,
    };
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
              {(() => {
                // Generate a rolling 6-month window: 3 prior + current + 2 upcoming
                const now = new Date();
                const dynamicMonths: string[] = [];
                for (let i = -3; i <= 2; i++) {
                  const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
                  dynamicMonths.push(d.toLocaleString("en-IN", { month: "long", year: "numeric" }));
                }
                const allMonths = Array.from(new Set([...dynamicMonths, ...payslips.map(p => p.month)]));
                // Sort chronologically
                allMonths.sort((a, b) => new Date(`1 ${a}`) > new Date(`1 ${b}`) ? 1 : -1);
                return allMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ));
              })()}
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

                <div className="w-full overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs table-auto">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-[#1a1a1a] text-slate-400 dark:text-gray-500 uppercase text-[10px] tracking-tight font-semibold">
                        <th className="py-2.5 px-2 text-left">Employee &amp; Code</th>
                        <th className="py-2.5 px-1.5 text-right">Basic</th>
                        <th className="py-2.5 px-1.5 text-right">HRA</th>
                        <th className="py-2.5 px-1.5 text-right">Tel.</th>
                        <th className="py-2.5 px-1.5 text-right">Fuel</th>
                        <th className="py-2.5 px-1.5 text-right">Prof Dev</th>
                        <th className="py-2.5 px-1.5 text-right">LTA</th>
                        <th className="py-2.5 px-1.5 text-right">Sp. Allow</th>
                        <th className="py-2.5 px-1.5 text-right">PF+TDS</th>
                        <th className="py-2.5 px-1.5 text-right text-rose-500">Fines</th>
                        <th className="py-2.5 px-1.5 text-right text-emerald-600">Net Pay</th>
                        <th className="py-2.5 px-2 text-center">Status</th>
                        <th className="py-2.5 px-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-[#1a1a1a]/50">
                      {paginatedEmployees.map(emp => {
                        const hasSlip = currentMonthPayslips.find(p => p.employeeId === emp.id);
                        const sal = getEmpSalaryComponents(emp);
                        const grossEarnings = sal.basic + sal.hra + sal.telephone + sal.fuel + sal.professionalDev + sal.lta + sal.allowances;
                        const pfDeduction = sal.pfDeduction || Math.round(sal.basic * 0.08);
                        const empPendingFines = (fines || [])
                          .filter(f => f.employeeId === emp.id && f.status === "Deducted From Payroll")
                          .reduce((sum, f) => sum + f.amount, 0);
                        const defaultTaxes = sal.tdsDeduction || Math.round(grossEarnings * 0.05);
                        const netSalaryEstimate = Math.max(0, grossEarnings - pfDeduction - empPendingFines - defaultTaxes);

                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a]/30 transition-colors">
                            <td className="py-2 px-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                                  {emp.fullName.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-800 dark:text-gray-100 text-xs truncate leading-tight">
                                    {emp.fullName}
                                  </div>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="font-mono text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1 py-0.2 rounded border border-amber-200/60 dark:border-amber-800/40">
                                      {getEmployeeCode(emp)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 dark:text-gray-500 font-normal truncate">• {emp.department}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-1.5 text-right font-mono text-[11px] text-slate-700 dark:text-gray-300 font-semibold whitespace-nowrap">₹{sal.basic.toLocaleString()}</td>
                            <td className="py-2 px-1.5 text-right font-mono text-[11px] text-slate-500 dark:text-gray-400 whitespace-nowrap">₹{sal.hra.toLocaleString()}</td>
                            <td className="py-2 px-1.5 text-right font-mono text-[11px] text-slate-500 dark:text-gray-400 whitespace-nowrap">₹{sal.telephone.toLocaleString()}</td>
                            <td className="py-2 px-1.5 text-right font-mono text-[11px] text-slate-500 dark:text-gray-400 whitespace-nowrap">₹{sal.fuel.toLocaleString()}</td>
                            <td className="py-2 px-1.5 text-right font-mono text-[11px] text-slate-500 dark:text-gray-400 whitespace-nowrap">₹{sal.professionalDev.toLocaleString()}</td>
                            <td className="py-2 px-1.5 text-right font-mono text-[11px] text-slate-500 dark:text-gray-400 whitespace-nowrap">₹{sal.lta.toLocaleString()}</td>
                            <td className="py-2 px-1.5 text-right font-mono text-[11px] text-slate-500 dark:text-gray-400 whitespace-nowrap">₹{sal.allowances.toLocaleString()}</td>
                            <td className="py-2 px-1.5 text-right font-mono text-[11px] text-indigo-500 font-medium whitespace-nowrap">₹{(pfDeduction + defaultTaxes).toLocaleString()}</td>
                            <td className="py-2 px-1.5 text-right font-mono text-[11px] text-rose-500 whitespace-nowrap">
                              ₹{hasSlip ? hasSlip.finesDeducted.toLocaleString() : empPendingFines.toLocaleString()}
                            </td>
                            <td className="py-2 px-1.5 text-right font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                              ₹{hasSlip ? hasSlip.netPay.toLocaleString() : netSalaryEstimate.toLocaleString()}
                            </td>
                            <td className="py-2 px-2 text-center whitespace-nowrap">
                              <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight ${
                                hasSlip?.status === "Paid" 
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50"
                                  : hasSlip?.status === "Generated"
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50"
                                  : "bg-slate-100 text-slate-500 dark:bg-[#1a1a1a] dark:text-gray-400 border border-slate-200/50 dark:border-[#2a2a2a]"
                              }`}>
                                {hasSlip ? hasSlip.status : "Pending Run"}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right whitespace-nowrap">
                              {hasSlip ? (
                                <div className="flex items-center justify-end space-x-1.5">
                                  <button
                                    onClick={() => setActiveSlip(hasSlip)}
                                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold text-[11px] inline-flex items-center space-x-1 cursor-pointer"
                                  >
                                    <span>Review</span>
                                  </button>
                                  {(role === "admin" || role === "hr") && onResetPayslip && (
                                    <button
                                      onClick={() => {
                                        if (confirm(`Reset and delete the generated payslip for ${emp.fullName} for ${selectedMonth}? This will release the fine deductions back to payroll.`)) {
                                          onResetPayslip(emp.id, selectedMonth);
                                        }
                                      }}
                                      className="text-rose-500 hover:text-rose-700 font-bold inline-flex items-center cursor-pointer ml-1 p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors"
                                      title="Reset compiled slip to regenerate"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-end space-x-1">
                                  {(role === "admin" || role === "hr") && onUpdateEmployee && (
                                    <button
                                      onClick={() => openEditAllowancesModal(emp)}
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 dark:bg-[#1a1a1a] dark:hover:bg-amber-950/40 text-slate-600 hover:text-amber-600 dark:text-gray-300 dark:hover:text-amber-400 border border-slate-200 dark:border-[#2a2a2a] transition-all cursor-pointer shrink-0"
                                      title="Edit Monthly Allowances (Tel, Fuel, Prof Dev, LTA)"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleCompileSlip(emp.id)}
                                    disabled={compilingEmpId === emp.id}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] px-2.5 py-1.5 rounded-lg inline-flex items-center space-x-1 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs shrink-0"
                                  >
                                    {compilingEmpId === emp.id ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 shrink-0 animate-spin" />
                                        <span>Compiling</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="w-3 h-3 shrink-0" />
                                        <span>Compile</span>
                                      </>
                                    )}
                                  </button>
                                </div>
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
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white dark:bg-[#0a0a0a]/95 dark:text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center space-x-3 backdrop-blur-md animate-in slide-in-from-top-4 fade-in duration-300 whitespace-nowrap">
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

                {/* Additional Specific Allowances: LTA, Telephone, Fuel, Professional Dev */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* Telephone Allowance */}
                  <div className="bg-slate-50/50 dark:bg-[#0a0a0a]/50 p-4 rounded-xl border border-slate-100 dark:border-[#1a1a1a] space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 dark:text-gray-200 text-xs block">Telephone Allowance</label>
                      <div className="flex bg-white dark:bg-[#1a1a1a] p-1 rounded-lg border border-slate-200 dark:border-[#252525] text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setConfig(prev => ({ ...prev, telephoneType: "percentage" }))}
                          className={`px-3 py-1 rounded-md transition-all cursor-pointer ${config.telephoneType === "percentage" ? "bg-emerald-600 text-white shadow-xs font-bold" : "text-slate-500 hover:text-slate-700 dark:hover:text-gray-300"}`}
                        >
                          % of Basic
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfig(prev => ({ ...prev, telephoneType: "fixed" }))}
                          className={`px-3 py-1 rounded-md transition-all cursor-pointer ${config.telephoneType === "fixed" ? "bg-emerald-600 text-white shadow-xs font-bold" : "text-slate-500 hover:text-slate-700 dark:hover:text-gray-300"}`}
                        >
                          ₹ Fixed
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={config.telephoneValue ? config.telephoneValue : ""}
                        onChange={e => setConfig(prev => ({ ...prev, telephoneValue: e.target.value === "" ? 0 : Number(e.target.value) }))}
                        placeholder={config.telephoneType === "percentage" ? "e.g. 5%" : "e.g. 1500"}
                        className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#1a1a1a] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">
                        {config.telephoneType === "percentage" ? "%" : "₹"}
                      </span>
                    </div>
                  </div>

                  {/* Fuel Allowance */}
                  <div className="bg-slate-50/50 dark:bg-[#0a0a0a]/50 p-4 rounded-xl border border-slate-100 dark:border-[#1a1a1a] space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 dark:text-gray-200 text-xs block">Fuel Allowance</label>
                      <div className="flex bg-white dark:bg-[#1a1a1a] p-1 rounded-lg border border-slate-200 dark:border-[#252525] text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setConfig(prev => ({ ...prev, fuelType: "percentage" }))}
                          className={`px-3 py-1 rounded-md transition-all cursor-pointer ${config.fuelType === "percentage" ? "bg-emerald-600 text-white shadow-xs font-bold" : "text-slate-500 hover:text-slate-700 dark:hover:text-gray-300"}`}
                        >
                          % of Basic
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfig(prev => ({ ...prev, fuelType: "fixed" }))}
                          className={`px-3 py-1 rounded-md transition-all cursor-pointer ${config.fuelType === "fixed" ? "bg-emerald-600 text-white shadow-xs font-bold" : "text-slate-500 hover:text-slate-700 dark:hover:text-gray-300"}`}
                        >
                          ₹ Fixed
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={config.fuelValue ? config.fuelValue : ""}
                        onChange={e => setConfig(prev => ({ ...prev, fuelValue: e.target.value === "" ? 0 : Number(e.target.value) }))}
                        placeholder={config.fuelType === "percentage" ? "e.g. 10%" : "e.g. 2000"}
                        className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#1a1a1a] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">
                        {config.fuelType === "percentage" ? "%" : "₹"}
                      </span>
                    </div>
                  </div>

                  {/* Professional Dev. / Tax */}
                  <div className="bg-slate-50/50 dark:bg-[#0a0a0a]/50 p-4 rounded-xl border border-slate-100 dark:border-[#1a1a1a] space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 dark:text-gray-200 text-xs block">Professional Dev. / Tax</label>
                      <div className="flex bg-white dark:bg-[#1a1a1a] p-1 rounded-lg border border-slate-200 dark:border-[#252525] text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setConfig(prev => ({ ...prev, professionalDevType: "percentage" }))}
                          className={`px-3 py-1 rounded-md transition-all cursor-pointer ${config.professionalDevType === "percentage" ? "bg-emerald-600 text-white shadow-xs font-bold" : "text-slate-500 hover:text-slate-700 dark:hover:text-gray-300"}`}
                        >
                          % of Basic
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfig(prev => ({ ...prev, professionalDevType: "fixed" }))}
                          className={`px-3 py-1 rounded-md transition-all cursor-pointer ${config.professionalDevType === "fixed" ? "bg-emerald-600 text-white shadow-xs font-bold" : "text-slate-500 hover:text-slate-700 dark:hover:text-gray-300"}`}
                        >
                          ₹ Fixed
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={config.professionalDevValue ? config.professionalDevValue : ""}
                        onChange={e => setConfig(prev => ({ ...prev, professionalDevValue: e.target.value === "" ? 0 : Number(e.target.value) }))}
                        placeholder={config.professionalDevType === "percentage" ? "e.g. 5%" : "e.g. 3000"}
                        className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#1a1a1a] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">
                        {config.professionalDevType === "percentage" ? "%" : "₹"}
                      </span>
                    </div>
                  </div>

                  {/* Leave Travel Allowance (LTA) */}
                  <div className="bg-slate-50/50 dark:bg-[#0a0a0a]/50 p-4 rounded-xl border border-slate-100 dark:border-[#1a1a1a] space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 dark:text-gray-200 text-xs block">Leave Travel Allowance (LTA)</label>
                      <div className="flex bg-white dark:bg-[#1a1a1a] p-1 rounded-lg border border-slate-200 dark:border-[#252525] text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setConfig(prev => ({ ...prev, ltaType: "percentage" }))}
                          className={`px-3 py-1 rounded-md transition-all cursor-pointer ${config.ltaType === "percentage" ? "bg-emerald-600 text-white shadow-xs font-bold" : "text-slate-500 hover:text-slate-700 dark:hover:text-gray-300"}`}
                        >
                          % of Basic
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfig(prev => ({ ...prev, ltaType: "fixed" }))}
                          className={`px-3 py-1 rounded-md transition-all cursor-pointer ${config.ltaType === "fixed" ? "bg-emerald-600 text-white shadow-xs font-bold" : "text-slate-500 hover:text-slate-700 dark:hover:text-gray-300"}`}
                        >
                          ₹ Fixed
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={config.ltaValue ? config.ltaValue : ""}
                        onChange={e => setConfig(prev => ({ ...prev, ltaValue: e.target.value === "" ? 0 : Number(e.target.value) }))}
                        placeholder={config.ltaType === "percentage" ? "e.g. 10%" : "e.g. 2500"}
                        className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#1a1a1a] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">
                        {config.ltaType === "percentage" ? "%" : "₹"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deductions Rules Card */}
              <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1a1a1a] pb-3">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Deduction Rules (PF, ESI & TDS/Tax)</h4>
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
                      <p className="text-[11px] text-slate-400">Default rule: 12% of Basic vs Fixed ₹1,800</p>
                    </div>
                    
                    <div className="flex bg-white dark:bg-[#1a1a1a] p-1 rounded-lg border border-slate-200 dark:border-[#252525] text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, pfModeDefault: "percentage", pfType: "percentage" }))}
                        className={`px-3 py-1 rounded-md transition-all ${config.pfModeDefault !== "fixed_1800" ? "bg-rose-600 text-white shadow-xs font-bold" : "text-slate-500"}`}
                      >
                        12% of Basic
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, pfModeDefault: "fixed_1800", pfType: "fixed", pfValue: 1800 }))}
                        className={`px-3 py-1 rounded-md transition-all ${config.pfModeDefault === "fixed_1800" ? "bg-rose-600 text-white shadow-xs font-bold" : "text-slate-500"}`}
                      >
                        Fixed ₹1,800
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
                      {config.pfModeDefault === "fixed_1800" ? "Fixed statutory PF cap: ₹1,800 / month" : `PF = ${config.pfValue}% of Basic`}
                    </p>
                  </div>
                </div>

                {/* ESI Deduction Rules */}
                <div className="bg-slate-50/50 dark:bg-[#0a0a0a]/50 p-4 rounded-xl border border-slate-100 dark:border-[#1a1a1a] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-700 dark:text-gray-200 text-xs flex items-center gap-1.5">
                        <span>Employee State Insurance (ESI)</span>
                        <span className="bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 text-[9px] px-2 py-0.5 rounded-full font-extrabold">Statutory</span>
                      </p>
                      <p className="text-[11px] text-slate-400">Calculated on Gross pay (typically for Gross ≤ ₹21,000)</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, esiEnabled: !prev.esiEnabled }))}
                      className={`px-3 py-1 rounded-full text-[10px] font-extrabold transition-all ${config.esiEnabled !== false ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}
                    >
                      {config.esiEnabled !== false ? "ESI Enabled" : "ESI Disabled"}
                    </button>
                  </div>

                  {config.esiEnabled !== false && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">ESI Rate (%)</label>
                        <input
                          type="number"
                          step="0.05"
                          value={config.esiRatePercentage ?? 0.75}
                          onChange={e => setConfig(prev => ({ ...prev, esiRatePercentage: Number(e.target.value) || 0 }))}
                          className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#1a1a1a] rounded-xl px-3 py-1.5 text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Gross Salary Ceiling (₹)</label>
                        <input
                          type="number"
                          value={config.esiGrossCeiling ?? 21000}
                          onChange={e => setConfig(prev => ({ ...prev, esiGrossCeiling: Number(e.target.value) || 0 }))}
                          className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#1a1a1a] rounded-xl px-3 py-1.5 text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Tax / TDS Setting */}
                <div className="bg-slate-50/50 dark:bg-[#0a0a0a]/50 p-4 rounded-xl border border-slate-100 dark:border-[#1a1a1a] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-700 dark:text-gray-200 text-xs">Income Tax (TDS) Default Rules</p>
                      <p className="text-[11px] text-slate-400">Flexibility: Employees can opt in/out or set manual TDS</p>
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

                  const telephone = config.telephoneType === "percentage" ? Math.round(basic * ((config.telephoneValue || 0) / 100)) : (config.telephoneValue || 0);
                  const fuel = config.fuelType === "percentage" ? Math.round(basic * ((config.fuelValue || 0) / 100)) : (config.fuelValue || 0);
                  const profDev = config.professionalDevType === "percentage" ? Math.round(basic * ((config.professionalDevValue || 0) / 100)) : (config.professionalDevValue || 0);
                  const lta = config.ltaType === "percentage" ? Math.round(basic * ((config.ltaValue || 0) / 100)) : (config.ltaValue || 0);

                  const gross = basic + hra + allowances + telephone + fuel + profDev + lta;

                  const isExempt = (config.pfExemptEmployeeIds || []).includes(simEmp.id);
                  const pf = isExempt ? 0 : (config.pfModeDefault === "fixed_1800" ? 1800 : (config.pfType === "percentage" ? Math.round(basic * (config.pfValue / 100)) : config.pfValue));
                  const tax = config.taxType === "percentage" ? Math.round(gross * (config.taxValue / 100)) : config.taxValue;
                  const esi = (config.esiEnabled !== false && gross <= (config.esiGrossCeiling || 21000)) ? Math.round(gross * ((config.esiRatePercentage || 0.75) / 100)) : 0;
                  const net = Math.max(0, gross - pf - tax - esi);

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

                          {telephone > 0 && (
                            <div className="flex justify-between">
                              <span>+ Telephone ({config.telephoneType === "percentage" ? `${config.telephoneValue}%` : "Fixed"})</span>
                              <span className="font-mono text-slate-700 dark:text-gray-200">₹{telephone.toLocaleString()}</span>
                            </div>
                          )}

                          {fuel > 0 && (
                            <div className="flex justify-between">
                              <span>+ Fuel ({config.fuelType === "percentage" ? `${config.fuelValue}%` : "Fixed"})</span>
                              <span className="font-mono text-slate-700 dark:text-gray-200">₹{fuel.toLocaleString()}</span>
                            </div>
                          )}

                          {profDev > 0 && (
                            <div className="flex justify-between">
                              <span>+ Prof. Dev ({config.professionalDevType === "percentage" ? `${config.professionalDevValue}%` : "Fixed"})</span>
                              <span className="font-mono text-slate-700 dark:text-gray-200">₹{profDev.toLocaleString()}</span>
                            </div>
                          )}

                          {lta > 0 && (
                            <div className="flex justify-between">
                              <span>+ LTA ({config.ltaType === "percentage" ? `${config.ltaValue}%` : "Fixed"})</span>
                              <span className="font-mono text-slate-700 dark:text-gray-200">₹{lta.toLocaleString()}</span>
                            </div>
                          )}

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

                        {esi > 0 && (
                          <div className="flex justify-between text-slate-600 dark:text-gray-300">
                            <span>- ESI ({config.esiRatePercentage ?? 0.75}%)</span>
                            <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">₹{esi.toLocaleString()}</span>
                          </div>
                        )}
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
      {activeSlip && (() => {
        const emp = employees.find(e => e.id === activeSlip.employeeId);
        const slipTelephone = activeSlip.telephone || 0;
        const slipFuel = activeSlip.fuel || 0;
        const slipProfDev = activeSlip.professionalDev || 0;
        const slipLta = activeSlip.lta || 0;
        const grossEarnings = activeSlip.basic + activeSlip.hra + slipTelephone + slipFuel + slipProfDev + slipLta + activeSlip.allowances;
        const grossDeductions = activeSlip.pfDeduction + activeSlip.taxDeduction + activeSlip.finesDeducted;
        const designation = getDesignationTitle(emp?.designationId || "");
        const empCode = emp ? getEmployeeCode(emp) : activeSlip.employeeId;
        
        return (
          <div className="fixed inset-0 bg-slate-100 dark:bg-[#0a0e17] z-50 flex flex-col w-full h-full min-h-screen overflow-hidden animate-in fade-in duration-200">
            
            {/* Full-Width Header Controls Bar */}
            <div className="bg-slate-900 px-6 py-3.5 text-white flex items-center justify-between shadow-md shrink-0 print:hidden">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveSlip(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-2 rounded-xl transition-colors cursor-pointer border border-slate-700"
                  title="Back to Payroll Dashboard"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-bold text-base leading-tight">Official Salary Payslip Statement</h3>
                  <p className="text-[11px] text-slate-400 font-mono">ID: {activeSlip.id}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Export PDF</span>
                </button>
                <button
                  onClick={() => setActiveSlip(null)}
                  className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-slate-300 hover:text-white text-xs font-semibold cursor-pointer border border-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {/* FULL PAGE PAYSLIP DOCUMENT CONTAINER */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-10 flex justify-center custom-scrollbar">
              <div className="bg-white text-slate-900 shadow-2xl border border-slate-300 rounded-2xl w-full max-w-4xl p-6 sm:p-10 my-auto printable-payslip font-sans space-y-6">
                
                {/* Document Top Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-4">
                  {/* Logo & Company Name */}
                  <div className="flex items-center space-x-4">
                    {companyLogoUrl ? (
                      <img 
                        src={companyLogoUrl} 
                        alt={companyName || "Company Logo"} 
                        className="h-12 max-w-[180px] object-contain shrink-0" 
                      />
                    ) : (
                      <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                        <div className="absolute inset-0 border-[3.5px] border-amber-500 rotate-45 rounded-xs"></div>
                        <div className="absolute inset-1.5 border-[3.5px] border-slate-900 rotate-45 rounded-xs"></div>
                      </div>
                    )}
                    <div>
                      <h2 className="text-base sm:text-lg font-black tracking-wider uppercase text-slate-900 font-sans">
                        {companyName || "MGM FINANCIERS PRIVATE LIMITED"}
                      </h2>
                    </div>
                  </div>

                  {/* Pay Slip Details */}
                  <div className="sm:text-right space-y-0.5">
                    <p className="text-xs font-bold text-slate-900">
                      Pay Slip for: <span className="font-bold">{activeSlip.month}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 italic">Amount in Rupees</p>
                  </div>
                </div>

                {/* Employee Info Grid Table */}
                <div className="border border-slate-700 overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse font-sans">
                    <tbody>
                      <tr className="border-b border-slate-700">
                        <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700 w-1/6">Employee Code</td>
                        <td className="p-2.5 text-slate-900 border-r border-slate-700 font-mono w-2/6">{empCode}</td>
                        <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700 w-1/6">Name</td>
                        <td className="p-2.5 text-slate-900 font-semibold w-2/6">{emp?.fullName || getEmployeeName(activeSlip.employeeId)}</td>
                      </tr>
                      <tr className="border-b border-slate-700">
                        <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">Email Id</td>
                        <td className="p-2.5 text-slate-900 border-r border-slate-700 truncate max-w-[170px]">{emp?.email || getEmployeeEmail(activeSlip.employeeId)}</td>
                        <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">Bank Account</td>
                        <td className="p-2.5 text-slate-900 font-mono">{emp?.bankDetails?.accountNumber ? `****${emp.bankDetails.accountNumber.slice(-4)}` : <span className="text-slate-400 italic">Not provided</span>}</td>
                      </tr>
                      <tr className="border-b border-slate-700">
                        <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">DOJ</td>
                        <td className="p-2.5 text-slate-900 border-r border-slate-700">{emp?.joiningDate || <span className="text-slate-400 italic">—</span>}</td>
                        <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">Department</td>
                        <td className="p-2.5 text-slate-900">{emp?.department || <span className="text-slate-400 italic">—</span>}</td>
                      </tr>
                      <tr className="border-b border-slate-700">
                        <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">Designation</td>
                        <td className="p-2.5 text-slate-900 border-r border-slate-700">{designation}</td>
                        <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">PAN</td>
                        <td className="p-2.5 text-slate-900 font-mono">{(emp?.customFields?.pan as string) || <span className="text-slate-400 italic">Not provided</span>}</td>
                      </tr>
                      <tr className="border-b border-slate-700">
                        <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">Location</td>
                        <td className="p-2.5 text-slate-900 border-r border-slate-700">{emp?.branch || emp?.address || <span className="text-slate-400 italic">—</span>}</td>
                        <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">UAN</td>
                        <td className="p-2.5 text-slate-900 font-mono">{(emp?.customFields?.uan as string) || <span className="text-slate-400 italic">Not provided</span>}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">STD Days</td>
                        <td className="p-2.5 text-slate-900 border-r border-slate-700 font-mono">30</td>
                        <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">Worked Days</td>
                        <td className="p-2.5 text-slate-900 font-mono">30</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Earnings & Deductions Grid Table */}
                <div className="border border-slate-700 overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-100">
                        <th className="p-2.5 font-bold text-slate-900 border-r border-slate-700 w-2/6">EARNINGS</th>
                        <th className="p-2.5 font-bold text-slate-900 border-r border-slate-700 text-right w-1/6">AMOUNT</th>
                        <th className="p-2.5 font-bold text-slate-900 border-r border-slate-700 w-2/6">DEDUCTIONS</th>
                        <th className="p-2.5 font-bold text-slate-900 text-right w-1/6">AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      <tr>
                        <td className="p-2.5 border-r border-slate-700 font-bold uppercase">BASIC</td>
                        <td className="p-2.5 border-r border-slate-700 text-right font-mono">{activeSlip.basic.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-2.5 border-r border-slate-700 font-bold uppercase">TDS</td>
                        <td className="p-2.5 text-right font-mono">{activeSlip.taxDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 border-r border-slate-700 font-bold uppercase">HRA</td>
                        <td className="p-2.5 border-r border-slate-700 text-right font-mono">{activeSlip.hra.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-2.5 border-r border-slate-700 font-bold uppercase">P.F.</td>
                        <td className="p-2.5 text-right font-mono">{activeSlip.pfDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 border-r border-slate-700 font-bold uppercase">TELEPHONE</td>
                        <td className="p-2.5 border-r border-slate-700 text-right font-mono">{slipTelephone.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-2.5 border-r border-slate-700 font-bold uppercase text-rose-700">LATE FINES</td>
                        <td className="p-2.5 text-right font-mono text-rose-700">{activeSlip.finesDeducted.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 border-r border-slate-700 font-bold uppercase">FUEL</td>
                        <td className="p-2.5 border-r border-slate-700 text-right font-mono">{slipFuel.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-2.5 border-r border-slate-700"></td>
                        <td className="p-2.5 text-right"></td>
                      </tr>
                      <tr>
                        <td className="p-2.5 border-r border-slate-700 font-bold uppercase">PROFESSIONAL DEV</td>
                        <td className="p-2.5 border-r border-slate-700 text-right font-mono">{slipProfDev.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-2.5 border-r border-slate-700"></td>
                        <td className="p-2.5 text-right"></td>
                      </tr>
                      <tr>
                        <td className="p-2.5 border-r border-slate-700 font-bold uppercase">LTA</td>
                        <td className="p-2.5 border-r border-slate-700 text-right font-mono">{slipLta.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-2.5 border-r border-slate-700"></td>
                        <td className="p-2.5 text-right"></td>
                      </tr>
                      <tr>
                        <td className="p-2.5 border-r border-slate-700 font-bold uppercase">SPECIAL ALLOWANCE</td>
                        <td className="p-2.5 border-r border-slate-700 text-right font-mono">{activeSlip.allowances.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-2.5 border-r border-slate-700"></td>
                        <td className="p-2.5 text-right"></td>
                      </tr>
                      {/* Totals Row */}
                      <tr className="border-t-2 border-slate-700 font-bold bg-slate-50">
                        <td className="p-2.5 border-r border-slate-700 uppercase">GROSS EARNINGS</td>
                        <td className="p-2.5 border-r border-slate-700 text-right font-mono">{grossEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-2.5 border-r border-slate-700 uppercase">GROSS DEDUCTIONS</td>
                        <td className="p-2.5 text-right font-mono">{grossDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      {/* Net Pay Row */}
                      <tr className="border-t border-slate-700 font-bold">
                        <td className="p-2.5 border-r border-slate-700 bg-white" colSpan={2}></td>
                        <td className="p-2.5 border-r border-slate-700 uppercase font-extrabold text-slate-900 bg-slate-100">NET PAY</td>
                        <td className="p-2.5 text-right font-mono font-black text-slate-900 bg-slate-100 text-sm">
                          {activeSlip.netPay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Net Pay In Words */}
                <div className="pt-2 space-y-1">
                  <p className="font-bold text-slate-900 text-xs">
                    NET Pay for the Month: <span className="font-mono font-extrabold">{activeSlip.netPay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /-</span> ({numberToWordsIndian(activeSlip.netPay)} Only)
                  </p>
                </div>

                {/* Document Subtext Footer */}
                <div className="pt-6 border-t border-slate-200">
                  <p className="text-[11px] text-slate-600 italic">
                    ** This is a computer generated payslip and does not require signature and stamp.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Adjust Monthly Allowances Modal */}
      {editingEmpForSalary && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setEditingEmpForSalary(null)}
        >
          <div 
            className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#1a1a1a] w-full max-w-2xl sm:max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-[#1a1a1a] p-5 pb-4 shrink-0 bg-slate-50/50 dark:bg-[#121212]/50">
              <div>
                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-base flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-500" />
                  Adjust Allowances before Compiling
                </h3>
                <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                  {editingEmpForSalary.fullName} ({getEmployeeCode(editingEmpForSalary)}) — {editingEmpForSalary.department}
                </p>
              </div>
              <button 
                onClick={() => setEditingEmpForSalary(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1a1a1a] text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAllowances} className="flex flex-col min-h-0 flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 mb-1">Telephone Allowance (INR)</label>
                    <input
                      type="number"
                      min="0"
                      value={editTel}
                      onChange={(e) => setEditTel(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-800 dark:text-gray-100 p-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#2a2a2a] font-mono font-bold focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. 1500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 mb-1">Fuel Allowance (INR)</label>
                    <input
                      type="number"
                      min="0"
                      value={editFuel}
                      onChange={(e) => setEditFuel(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-800 dark:text-gray-100 p-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#2a2a2a] font-mono font-bold focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. 2000"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 mb-1">Professional Dev. (INR)</label>
                    <input
                      type="number"
                      min="0"
                      value={editProfDev}
                      onChange={(e) => setEditProfDev(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-800 dark:text-gray-100 p-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#2a2a2a] font-mono font-bold focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. 3000"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 mb-1">LTA Allowance (INR)</label>
                    <input
                      type="number"
                      min="0"
                      value={editLta}
                      onChange={(e) => setEditLta(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-800 dark:text-gray-100 p-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#2a2a2a] font-mono font-bold focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. 2500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 mb-1">Special Allowance (INR)</label>
                    <input
                      type="number"
                      min="0"
                      value={editSpAllow}
                      onChange={(e) => setEditSpAllow(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-800 dark:text-gray-100 p-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#2a2a2a] font-mono font-bold focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. 5000"
                    />
                  </div>
                </div>

                {/* PF Mode Selector */}
                <div className="bg-slate-50/70 dark:bg-[#0a0a0a]/60 p-3 rounded-xl border border-slate-200 dark:border-[#1a1a1a] space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-gray-300">Provident Fund (PF) Rule</label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setEditPfMode("percentage")}
                      className={`py-1.5 px-2 rounded-lg border font-bold text-[11px] transition-all cursor-pointer ${editPfMode === "percentage" ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" : "bg-white dark:bg-[#1a1a1a] text-slate-600 dark:text-gray-300 border-slate-200 dark:border-[#252525]"}`}
                    >
                      12% of Basic
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPfMode("fixed_1800")}
                      className={`py-1.5 px-2 rounded-lg border font-bold text-[11px] transition-all cursor-pointer ${editPfMode === "fixed_1800" ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" : "bg-white dark:bg-[#1a1a1a] text-slate-600 dark:text-gray-300 border-slate-200 dark:border-[#252525]"}`}
                    >
                      Fixed ₹1,800
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPfMode("custom")}
                      className={`py-1.5 px-2 rounded-lg border font-bold text-[11px] transition-all cursor-pointer ${editPfMode === "custom" ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" : "bg-white dark:bg-[#1a1a1a] text-slate-600 dark:text-gray-300 border-slate-200 dark:border-[#252525]"}`}
                    >
                      Custom ₹
                    </button>
                  </div>
                  {editPfMode === "custom" && (
                    <input
                      type="number"
                      min="0"
                      value={editPfCustom}
                      onChange={e => setEditPfCustom(e.target.value)}
                      placeholder="Enter custom PF amount (INR)"
                      className="w-full bg-white dark:bg-[#151515] text-slate-800 dark:text-gray-100 p-2 text-xs rounded-lg border border-slate-200 dark:border-[#2a2a2a] font-mono font-bold mt-1"
                    />
                  )}
                </div>

                {/* TDS Opt-In & Mode Settings */}
                <div className="bg-slate-50/70 dark:bg-[#0a0a0a]/60 p-3 rounded-xl border border-slate-200 dark:border-[#1a1a1a] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-gray-300">Income Tax (TDS) Status</label>
                    <button
                      type="button"
                      onClick={() => setEditTdsOptIn(!editTdsOptIn)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold cursor-pointer transition-all ${editTdsOptIn ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}
                    >
                      {editTdsOptIn ? "✓ Opted IN (Tax Deducted)" : "✕ Opted OUT (No TDS)"}
                    </button>
                  </div>
                  {editTdsOptIn && (
                    <div className="space-y-1.5 pt-1">
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setEditTdsMode("slab")}
                          className={`py-1 px-2 rounded-lg border font-bold text-[10px] transition-all cursor-pointer ${editTdsMode === "slab" ? "bg-rose-600 text-white border-rose-600 shadow-xs" : "bg-white dark:bg-[#1a1a1a] text-slate-600 dark:text-gray-300 border-slate-200 dark:border-[#252525]"}`}
                        >
                          Auto Tax Slab ({config?.taxValue || 5}%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditTdsMode("custom")}
                          className={`py-1 px-2 rounded-lg border font-bold text-[10px] transition-all cursor-pointer ${editTdsMode === "custom" ? "bg-rose-600 text-white border-rose-600 shadow-xs" : "bg-white dark:bg-[#1a1a1a] text-slate-600 dark:text-gray-300 border-slate-200 dark:border-[#252525]"}`}
                        >
                          Manual Amount (₹)
                        </button>
                      </div>
                      {editTdsMode === "custom" && (
                        <input
                          type="number"
                          min="0"
                          value={editTdsCustom}
                          onChange={e => setEditTdsCustom(e.target.value)}
                          placeholder="Enter manual TDS tax amount (INR)"
                          className="w-full bg-white dark:bg-[#151515] text-slate-800 dark:text-gray-100 p-2 text-xs rounded-lg border border-slate-200 dark:border-[#2a2a2a] font-mono font-bold"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* ESI Opt-In & Amount */}
                <div className="bg-slate-50/70 dark:bg-[#0a0a0a]/60 p-3 rounded-xl border border-slate-200 dark:border-[#1a1a1a] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-gray-300">ESI Deduction</label>
                    <button
                      type="button"
                      onClick={() => setEditEsiOptIn(!editEsiOptIn)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold cursor-pointer transition-all ${editEsiOptIn ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}
                    >
                      {editEsiOptIn ? "✓ ESI Active" : "✕ ESI Exempt"}
                    </button>
                  </div>
                  {editEsiOptIn && (
                    <input
                      type="number"
                      min="0"
                      value={editEsiCustom}
                      onChange={e => setEditEsiCustom(e.target.value)}
                      placeholder="Auto calculated (~0.75% of gross) or enter custom ESI ₹"
                      className="w-full bg-white dark:bg-[#151515] text-slate-800 dark:text-gray-100 p-2 text-xs rounded-lg border border-slate-200 dark:border-[#2a2a2a] font-mono font-bold"
                    />
                  )}
                </div>

                {/* Live Gross & Net Pay preview box */}
                {(() => {
                  const basic = editingEmpForSalary.salary.basic || 0;
                  const hra = editingEmpForSalary.salary.hra || 0;
                  const tel = Number(editTel) || 0;
                  const fuel = Number(editFuel) || 0;
                  const profDev = Number(editProfDev) || 0;
                  const lta = Number(editLta) || 0;
                  const spAllow = Number(editSpAllow) || 0;
                  const gross = basic + hra + tel + fuel + profDev + lta + spAllow;

                  let pf = 0;
                  if (editPfMode === "fixed_1800") pf = 1800;
                  else if (editPfMode === "custom") pf = Number(editPfCustom) || 0;
                  else pf = Math.round(basic * ((config?.pfValue || 12) / 100));

                  let tds = 0;
                  if (editTdsOptIn) {
                    if (editTdsMode === "custom") tds = Number(editTdsCustom) || 0;
                    else tds = Math.round(gross * ((config?.taxValue || 5) / 100));
                  }

                  let esi = 0;
                  if (editEsiOptIn) {
                    if (editEsiCustom) esi = Number(editEsiCustom) || 0;
                    else if (gross <= (config?.esiGrossCeiling || 21000)) esi = Math.round(gross * ((config?.esiRatePercentage || 0.75) / 100));
                  }

                  const pendingFines = (fines || [])
                    .filter(f => f.employeeId === editingEmpForSalary.id && f.status === "Deducted From Payroll")
                    .reduce((sum, f) => sum + f.amount, 0);
                  const net = Math.max(0, gross - pf - tds - esi - pendingFines);

                  return (
                    <div className="p-3 bg-slate-50 dark:bg-[#0a0a0a] rounded-xl border border-slate-100 dark:border-[#1a1a1a] text-xs space-y-1">
                      <div className="flex justify-between text-slate-500 dark:text-gray-400 text-[11px]">
                        <span>PF: ₹{pf.toLocaleString()} | TDS: ₹{tds.toLocaleString()} | ESI: ₹{esi.toLocaleString()}</span>
                        <span>Deductions: ₹{(pf + tds + esi + pendingFines).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-[#1a1a1a] font-bold">
                        <span className="text-slate-700 dark:text-gray-200">New Est. Gross: <span className="font-mono text-emerald-600 dark:text-emerald-400">₹{gross.toLocaleString()}</span></span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">Est. Net Pay: ₹{net.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end space-x-2 p-5 pt-3 border-t border-slate-100 dark:border-[#1a1a1a] shrink-0 bg-slate-50/50 dark:bg-[#121212]/50">
                <button
                  type="button"
                  onClick={() => setEditingEmpForSalary(null)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-[#0a0a0a] dark:hover:bg-[#1a1a1a] text-slate-600 dark:text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSalary}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingSalary ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save &amp; Update</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
