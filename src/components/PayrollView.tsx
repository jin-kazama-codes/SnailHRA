"use client";

import React, { useState } from "react";
import {
  IndianRupee, Mail, Plus, Trash2, ShieldCheck, FileText,
  Send, HelpCircle, Landmark, Sparkles, Settings, ArrowDownRight, Printer, CheckCircle,
  ChevronLeft, ChevronRight, RefreshCw, Sliders, Percent, ShieldAlert, Search, Save, UserCheck, UserX, Calculator, AlertCircle, Check, X, Pencil,
  Upload, Paperclip, Download, Eye, ExternalLink, CheckCircle2, Image as ImageIcon, File
} from "lucide-react";
import { Employee, Designation, Payslip, SimulatedEmail, UserRole, Fine, PayrollConfig, EmployeeTaxProfile } from "../types";
import TaxProfileModal from "./TaxProfileModal";
import { computeMonthlyTDSFromEmployee, computeTDS, TaxComputationInput, TaxComputationResult } from "../lib/taxEngine";

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
  onResetPayslip?: (employeeId: string, month: string, payslipId?: string) => Promise<void> | void;
  onUpdateEmployee?: (id: string, updatedData: any) => Promise<void> | void;
  onUploadPayrollDocument?: (employeeId: string, month: string, fileOrFiles: File | File[], payslipId?: string) => Promise<any>;
  onDeletePayrollDocument?: (employeeId: string, month: string, payslipId?: string, docId?: string) => Promise<boolean>;
  companyName?: string;
  companyId?: string;
  companyLogoUrl?: string;
  empCodePrefix?: string; // e.g. "MGMDIR" — set by admin in System Settings
  selectedBranch?: string;
  companyPan?: string;
  companyTan?: string;
  initialSubTab?: "payslips" | "my_payslips" | "config";
}

export function computeIncomeTax(gross: number, taxType: "percentage" | "fixed" | "slab" | string | undefined, taxValue: number | undefined): number {
  if (taxType === "fixed") {
    return taxValue ?? 0;
  }
  if (taxType === "slab") {
    return computeMonthlyTDSFromEmployee(
      {
        basic: Math.round(gross * 0.5),
        hra: Math.round(gross * 0.2),
        allowances: Math.round(gross * 0.3),
        pfDeduction: Math.round(gross * 0.5 * 0.12),
        tdsOptIn: true,
      },
      "slab",
      0
    );
  }
  // percentage
  return Math.round(gross * ((taxValue ?? 5) / 100));
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
  onUploadPayrollDocument,
  onDeletePayrollDocument,
  companyName = "SnailHR Payroll",
  companyId = "",
  companyLogoUrl = "",
  empCodePrefix = "EMP",
  selectedBranch = "All Branches",
  companyPan = "",
  companyTan = "",
  initialSubTab
}: PayrollViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"payslips" | "my_payslips" | "config">(() => {
    if (initialSubTab) return initialSubTab;
    if (role === "employee") return "my_payslips";
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("snailhr_payroll_activeSubTab");
      if (saved === "payslips" || saved === "my_payslips" || saved === "config") {
        return saved as any;
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
  const [editPfMode, setEditPfMode] = useState<"percentage" | "fixed_1800" | "custom" | "exempt">("percentage");
  const [editPfCustom, setEditPfCustom] = useState("");
  const [editTdsOptIn, setEditTdsOptIn] = useState(true);
  const [editTdsMode, setEditTdsMode] = useState<"slab" | "custom">("slab");
  const [editTdsCustom, setEditTdsCustom] = useState("");
  const [editEsiOptIn, setEditEsiOptIn] = useState(true);
  const [editEsiMode, setEditEsiMode] = useState<"auto" | "custom">("auto");
  const [editEsiCustom, setEditEsiCustom] = useState("");
  const [isSavingSalary, setIsSavingSalary] = useState(false);
  const [taxProfileEmp, setTaxProfileEmp] = useState<Employee | null>(null);

  // Document Upload & Viewer States (Multiple Docs Support)
  const [uploadModalEmp, setUploadModalEmp] = useState<{ emp: Employee; payslip?: Payslip } | null>(null);
  const [viewDocModal, setViewDocModal] = useState<{ payslip: Payslip; employeeName: string; empCode: string } | null>(null);
  const [uploadDocFiles, setUploadDocFiles] = useState<File[]>([]);
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadDocError, setUploadDocError] = useState("");
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  const isPdf = (url?: string, name?: string) => {
    if (!url && !name) return false;
    const str = `${url || ""} ${name || ""}`.toLowerCase();
    return str.includes(".pdf") || str.includes("application/pdf");
  };

  const handleDownloadFile = (url: string, filename: string) => {
    if (!url) return;
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "payslip-document";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      window.open(url, "_blank");
    }
  };

  const handleDownloadAllFiles = (docs: Array<{ url: string; name: string }>) => {
    if (!docs || docs.length === 0) return;
    docs.forEach((doc, idx) => {
      setTimeout(() => {
        handleDownloadFile(doc.url, doc.name);
      }, idx * 300);
    });
  };

  const handleExecuteUploadDoc = async () => {
    if (!uploadModalEmp || uploadDocFiles.length === 0 || !onUploadPayrollDocument) return;
    setIsUploadingDoc(true);
    setUploadDocError("");
    try {
      const updatedSlip = await onUploadPayrollDocument(
        uploadModalEmp.emp.id,
        selectedMonth,
        uploadDocFiles,
        uploadModalEmp.payslip?.id
      );
      if (updatedSlip) {
        setUploadModalEmp(null);
        setUploadDocFiles([]);
        // If viewDocModal was open, update it
        if (viewDocModal && (viewDocModal.payslip.id === updatedSlip.id || viewDocModal.payslip.employeeId === uploadModalEmp.emp.id)) {
          setViewDocModal({
            ...viewDocModal,
            payslip: updatedSlip
          });
          setActiveDocIndex(0);
        }
      }
    } catch (err: any) {
      setUploadDocError(err?.message || "Failed to upload documents");
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDeleteAttachedDoc = async (slip: Payslip, docId?: string) => {
    if (!onDeletePayrollDocument) return;
    if (!confirm("Are you sure you want to delete this attached payroll document?")) return;
    setIsDeletingDoc(true);
    try {
      const success = await onDeletePayrollDocument(slip.employeeId, slip.month, slip.id, docId);
      if (success) {
        const remainingDocs = (slip.documents || []).filter(d => d.id !== docId);
        if (remainingDocs.length === 0) {
          setViewDocModal(null);
        } else if (viewDocModal) {
          setViewDocModal({
            ...viewDocModal,
            payslip: {
              ...viewDocModal.payslip,
              documents: remainingDocs,
              documentUrl: remainingDocs[0]?.url,
              documentName: remainingDocs[0]?.name
            }
          });
          setActiveDocIndex(0);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingDoc(false);
    }
  };

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

    // Prefer the employee's saved value (set via a previous "Save & Update") over the
    // config-derived default. Fall back to config only when no employee-specific value exists.
    setEditTel(emp.salary?.telephone !== undefined ? String(emp.salary.telephone) : String(configTel));
    setEditFuel(emp.salary?.fuel !== undefined ? String(emp.salary.fuel) : String(configFuel));
    setEditProfDev(emp.salary?.professionalDev !== undefined ? String(emp.salary.professionalDev) : String(configProfDev));
    setEditLta(emp.salary?.lta !== undefined ? String(emp.salary.lta) : String(configLta));
    setEditSpAllow(emp.salary?.allowances !== undefined ? String(emp.salary.allowances) : String(configSpAllow));
    const isPfExempt = (config?.pfExemptEmployeeIds || []).includes(emp.id) ||
      (config?.pfExemptEmployeeIds || []).includes(emp.code || "") ||
      emp.salary?.pfMode === "exempt";
    setEditPfMode(isPfExempt ? "exempt" : (emp.salary?.pfMode || (config?.pfModeDefault === "fixed_1800" ? "fixed_1800" : "percentage")));
    setEditPfCustom(emp.salary?.pfDeduction ? String(emp.salary.pfDeduction) : "");
    setEditTdsOptIn(emp.salary?.tdsOptIn !== undefined ? emp.salary.tdsOptIn : true);
    setEditTdsMode(emp.salary?.tdsMode || "slab");
    setEditTdsCustom(emp.salary?.tdsDeduction ? String(emp.salary.tdsDeduction) : "");
    const isEsiExempt = (config?.esiExemptEmployeeIds || []).includes(emp.id) ||
      (config?.esiExemptEmployeeIds || []).includes(emp.code || "") ||
      emp.salary?.esiOptIn === false;
    setEditEsiOptIn(!isEsiExempt);
    // Always recalculate ESI from the config-derived gross (same logic as the table)
    // so stale stored esiDeduction values never show in the modal
    const configHraForEsi = config?.hraType === "percentage"
      ? Math.round(basic * ((config?.hraValue || 0) / 100))
      : (config?.hraValue || 0);
    const configGross = basic + configHraForEsi + configTel + configFuel + configProfDev + configLta + configSpAllow;
    const esiCeiling = config?.esiGrossCeiling ?? 21000;
    const recalcEsi = (!isEsiExempt && (esiCeiling <= 0 || configGross <= esiCeiling))
      ? Math.round(configGross * ((config?.esiRatePercentage || 0.75) / 100))
      : 0;
    const esiMode = emp.salary?.esiMode === "custom" ? "custom" : "auto";
    setEditEsiMode(esiMode);
    // If custom mode, populate with the freshly recalculated value (not stale stored value)
    setEditEsiCustom(esiMode === "custom" ? String(recalcEsi) : "");
  };

  const handleSaveAllowances = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmpForSalary || !onUpdateEmployee) return;

    setIsSavingSalary(true);
    try {
      const basic = editingEmpForSalary.salary.basic || 0;
      let calculatedPf = 0;
      if (editPfMode === "exempt") {
        calculatedPf = 0;
      } else if (editPfMode === "fixed_1800") {
        calculatedPf = 1800;
      } else if (editPfMode === "custom") {
        calculatedPf = Number(editPfCustom) || 0;
      } else {
        calculatedPf = Math.round(basic * ((config?.pfValue || 12) / 100));
      }

      const configHra = config?.hraType === "percentage"
        ? Math.round(basic * ((config?.hraValue || 0) / 100))
        : (config?.hraValue || 0);

      let calculatedEsi = 0;
      if (editEsiOptIn) {
        if (editEsiMode === "custom" && editEsiCustom !== "") {
          calculatedEsi = Number(editEsiCustom) || 0;
        } else {
          const gross = basic + configHra + Number(editTel) + Number(editFuel) + Number(editProfDev) + Number(editLta) + Number(editSpAllow);
          const esiGrossCeiling = config?.esiGrossCeiling ?? 21000;
          if (esiGrossCeiling <= 0 || gross <= esiGrossCeiling) {
            calculatedEsi = Math.round(gross * ((config?.esiRatePercentage || 0.75) / 100));
          }
        }
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
        tdsDeduction: editTdsOptIn ? (editTdsMode === "custom" ? (Number(editTdsCustom) || 0) : 0) : 0,
        esiOptIn: editEsiOptIn,
        esiMode: editEsiMode,
        esiDeduction: calculatedEsi,
      };

      await onUpdateEmployee(editingEmpForSalary.id, {
        salary: updatedSalary,
      });

      // Keep tenant config PF & ESI exemption lists in sync if modal toggles changed
      const currentPfExemptList = config?.pfExemptEmployeeIds || [];
      let updatedPfExemptList = [...currentPfExemptList];

      if (editPfMode === "exempt") {
        if (!updatedPfExemptList.includes(editingEmpForSalary.id)) {
          updatedPfExemptList.push(editingEmpForSalary.id);
        }
      } else {
        updatedPfExemptList = updatedPfExemptList.filter(id => id !== editingEmpForSalary.id && id !== editingEmpForSalary.code);
      }

      const currentEsiExemptList = config?.esiExemptEmployeeIds || [];
      let updatedEsiExemptList = [...currentEsiExemptList];

      if (!editEsiOptIn) {
        if (!updatedEsiExemptList.includes(editingEmpForSalary.id)) {
          updatedEsiExemptList.push(editingEmpForSalary.id);
        }
      } else {
        updatedEsiExemptList = updatedEsiExemptList.filter(id => id !== editingEmpForSalary.id && id !== editingEmpForSalary.code);
      }

      const isPfChanged = JSON.stringify(updatedPfExemptList) !== JSON.stringify(currentPfExemptList);
      const isEsiChanged = JSON.stringify(updatedEsiExemptList) !== JSON.stringify(currentEsiExemptList);

      if (isPfChanged || isEsiChanged) {
        const newConfig = {
          ...config,
          companyId,
          pfExemptEmployeeIds: updatedPfExemptList,
          esiExemptEmployeeIds: updatedEsiExemptList
        };
        setConfig(newConfig);
        fetch("/api/payroll/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newConfig),
        }).catch(err => console.warn("Failed to update exempt lists on salary save:", err));
      }

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
    esiExemptEmployeeIds: [],
    allowancesType: "percentage",
    allowancesValue: 20,
    taxType: "percentage",
    taxValue: 5,
  });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [pfSearchQuery, setPfSearchQuery] = useState("");
  const [esiSearchQuery, setEsiSearchQuery] = useState("");
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
        setSaveSuccessMsg("Payroll rules, PF exemptions & ESI exemptions saved successfully for tenant!");
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

  const toggleEsiExempt = (empId: string) => {
    setConfig(prev => {
      const current = prev.esiExemptEmployeeIds || [];
      const exists = current.includes(empId);
      const next = exists ? current.filter(id => id !== empId) : [...current, empId];
      return { ...prev, esiExemptEmployeeIds: next };
    });
  };


  // Selected payslip for detailed view modal
  const [activeSlip, setActiveSlip] = useState<Payslip | null>(null);
  const [slipModalTab, setSlipModalTab] = useState<"payslip" | "form16">("payslip");

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

  // Pagination & Search state for Payroll Center list (15 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [nameSearchQuery, setNameSearchQuery] = useState("");
  const ITEMS_PER_PAGE = 15;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [nameSearchQuery]);

  const filteredEmployees = React.useMemo(() => {
    let list = employees;
    if (nameSearchQuery && nameSearchQuery.trim() !== "") {
      const q = nameSearchQuery.trim().toLowerCase();
      list = list.filter(emp => {
        const name = (emp.fullName || "").toLowerCase();
        const code = (emp.code || emp.id || "").toLowerCase();
        const dept = (emp.department || "").toLowerCase();
        const email = (emp.email || "").toLowerCase();
        return name.includes(q) || code.includes(q) || dept.includes(q) || email.includes(q);
      });
    }

    return [...list].sort((a, b) => {
      // 1. If createdAt is present, sort latest date first
      const aCreated = (a as any).createdAt || (a as any).created_at;
      const bCreated = (b as any).createdAt || (b as any).created_at;
      if (aCreated && bCreated) {
        const diff = new Date(bCreated).getTime() - new Date(aCreated).getTime();
        if (diff !== 0) return diff;
      }
      // 2. If employeeNumber is present, highest number first
      if (a.employeeNumber && b.employeeNumber) {
        const diff = b.employeeNumber - a.employeeNumber;
        if (diff !== 0) return diff;
      }
      // 3. Numeric code/id extraction (e.g. EMP-2126 vs EMP-2112)
      const numA = parseInt((a.code || a.id || "").replace(/\D/g, ""), 10) || 0;
      const numB = parseInt((b.code || b.id || "").replace(/\D/g, ""), 10) || 0;
      if (numA !== numB && numA > 0 && numB > 0) {
        return numB - numA;
      }
      // 4. Joining Date latest first
      if (a.joiningDate && b.joiningDate) {
        const diff = new Date(b.joiningDate).getTime() - new Date(a.joiningDate).getTime();
        if (diff !== 0) return diff;
      }
      return 0;
    });
  }, [employees, nameSearchQuery]);

  const totalItems = filteredEmployees.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

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
    return employees.find(e => e.id === empId || e.code === empId)?.fullName || "Unknown Employee";
  };

  const getEmployeeEmail = (empId: string) => {
    return employees.find(e => e.id === empId || e.code === empId)?.email || "";
  };

  const getEmployeeBank = (empId: string) => {
    const emp = employees.find(e => e.id === empId || e.code === empId);
    if (emp && emp.bankDetails && emp.bankDetails.bankName) {
      const ac = emp.bankDetails.accountNumber ? ` - A/C ****${emp.bankDetails.accountNumber.slice(-4)}` : "";
      return `${emp.bankDetails.bankName}${ac}`;
    }
    return "Direct Bank Transfer";
  };

  // Generate employee code: returns employee's exact database code/id if formatted, otherwise formats prefix
  const getEmployeeCode = (emp: Employee): string => {
    if (emp.code && emp.code.trim() !== "") {
      return emp.code;
    }
    if (emp.id && (emp.id.startsWith("EMP-") || emp.id.startsWith("EMP0") || emp.id.includes("-"))) {
      return emp.id;
    }
    if (emp.employeeNumber) {
      const prefix = (typeof window !== "undefined" ? localStorage.getItem("snailhr_empCodePrefix") || empCodePrefix : empCodePrefix).toUpperCase();
      return `${prefix}${String(emp.employeeNumber).padStart(4, "0")}`;
    }
    return emp.id || "EMP";
  };

  // Get all salary components with defaults — falls back to config-derived values when employee has no per-field override
  const getEmpSalaryComponents = (emp: Employee) => {
    const basic = emp.salary?.basic || 0;
    const configHra = config?.hraType === "percentage"
      ? Math.round(basic * ((config.hraValue ?? 40) / 100))
      : (config?.hraValue ?? 0);
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

    // Prefer employee-specific saved values (set via "Adjust Allowances" modal) over
    // the global config-derived defaults. emp.salary.telephone etc. are set on Save & Update.
    const telephone = emp.salary?.telephone !== undefined ? emp.salary.telephone : configTel;
    const fuel = emp.salary?.fuel !== undefined ? emp.salary.fuel : configFuel;
    const professionalDev = emp.salary?.professionalDev !== undefined ? emp.salary.professionalDev : configProfDev;
    const lta = emp.salary?.lta !== undefined ? emp.salary.lta : configLta;
    const allowances = emp.salary?.allowances !== undefined ? emp.salary.allowances : configSpAllow;

    return {
      basic,
      hra: configHra,
      telephone,
      fuel,
      professionalDev,
      lta,
      allowances,
      pfDeduction: emp.salary?.pfDeduction || 0,
      tdsDeduction: emp.salary?.tdsDeduction || 0,
    };
  };

  const currentMonthPayslips = payslips.filter(p => p.month === selectedMonth);

  return (
    <div className="space-y-6">
      {/* Tab Navigation header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-3.5 sm:p-4 shadow-xs dark:neon-glow">
        <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-[#0a0a0a] p-1 rounded-xl border border-slate-100 dark:border-[#1a1a1a] text-xs font-semibold overflow-x-auto scrollbar-none max-w-full">
          {role === "employee" ? (
            <button
              onClick={() => setActiveSubTab("my_payslips")}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeSubTab === "my_payslips" ? "bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-white shadow-xs font-bold" : "text-slate-400 hover:text-slate-600"}`}
            >
              My Salary Payslips
            </button>
          ) : (
            <>
              <button
                onClick={() => setActiveSubTab("payslips")}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeSubTab === "payslips" ? "bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-white shadow-xs font-bold" : "text-slate-400 hover:text-slate-600"}`}
              >
                Payroll Dashboard
              </button>

              <button
                onClick={() => setActiveSubTab("my_payslips")}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${activeSubTab === "my_payslips" ? "bg-white dark:bg-[#1a1a1a] text-emerald-600 dark:text-emerald-400 shadow-xs font-bold" : "text-slate-400 hover:text-slate-600"}`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>My Salary Payslips</span>
              </button>

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

        {(activeSubTab === "payslips" || activeSubTab === "my_payslips") && (
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

      {/* Employee View: My Salary Payslips / Vault */}
      {(activeSubTab === "my_payslips" || (role === "employee" && activeSubTab === "payslips")) && (
        <div className="space-y-6">
          {(() => {
            const currentEmpObj = employees.find(e => e.id === currentEmployeeId || e.code === currentEmployeeId);
            const myEmployeeIds = new Set([
              currentEmployeeId,
              currentEmpObj?.id,
              currentEmpObj?.code,
              currentEmpObj ? getEmployeeCode(currentEmpObj) : undefined
            ].filter(Boolean) as string[]);

            const myVaultPayslips = payslips.filter(p => 
              myEmployeeIds.has(p.employeeId) && 
              (!selectedMonth || selectedMonth === "All" || p.month === selectedMonth) &&
              p.status !== "Draft"
            );

            return (
              <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
                <div className="mb-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">
                  <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">My Payslips Vault</h3>
                  <p className="text-xs text-slate-400 dark:text-gray-500">Download and print validated salary slips and attached documents</p>
                </div>

                <div className="space-y-3">
                  {myVaultPayslips.map(slip => {
                    const docList = (slip.documents && slip.documents.length > 0)
                      ? slip.documents
                      : (slip.documentUrl ? [{ id: "doc-1", name: slip.documentName || "Document", url: slip.documentUrl }] : []);

                    const targetEmp = employees.find(e => e.id === slip.employeeId || e.code === slip.employeeId) || currentEmpObj;
                    const sal = targetEmp ? getEmpSalaryComponents(targetEmp) : null;
                    const grossEarnings = sal ? (sal.basic + sal.hra + sal.telephone + sal.fuel + sal.professionalDev + sal.lta + sal.allowances) : 0;
                    const isPfExempt = (config?.pfExemptEmployeeIds || []).includes(slip.employeeId) || targetEmp?.salary?.pfMode === "exempt";
                    let pfDeduction = 0;
                    if (!isPfExempt && sal) {
                      if (targetEmp?.salary?.pfMode === "fixed_1800" || config?.pfModeDefault === "fixed_1800") {
                        pfDeduction = 1800;
                      } else if (targetEmp?.salary?.pfMode === "custom" && targetEmp?.salary?.pfDeduction !== undefined && targetEmp.salary.pfDeduction > 0) {
                        pfDeduction = targetEmp.salary.pfDeduction;
                      } else {
                        pfDeduction = (config?.pfType === "fixed")
                          ? (config?.pfValue ?? 1800)
                          : Math.round(sal.basic * ((config?.pfValue ?? 12) / 100));
                      }
                    }
                    const empTdsOptIn = targetEmp?.salary?.tdsOptIn !== false;
                    const defaultTaxes = (!empTdsOptIn || !targetEmp?.salary)
                      ? 0
                      : computeMonthlyTDSFromEmployee(
                        { ...targetEmp.salary, taxProfile: targetEmp.salary?.taxProfile as any },
                        config?.taxType || "percentage",
                        config?.taxValue ?? 5
                      );
                    const isEsiExempt = (config?.esiExemptEmployeeIds || []).includes(slip.employeeId) ||
                      (config?.esiExemptEmployeeIds || []).includes(targetEmp?.code || "") ||
                      targetEmp?.salary?.esiOptIn === false;
                    let esiEst = 0;
                    if (config?.esiEnabled !== false && !isEsiExempt) {
                      if (targetEmp?.salary?.esiMode === "custom" && targetEmp?.salary?.esiDeduction !== undefined && targetEmp.salary.esiDeduction > 0) {
                        esiEst = targetEmp.salary.esiDeduction;
                      } else {
                        const esiCeiling = config?.esiGrossCeiling ?? 21000;
                        if (esiCeiling <= 0 || grossEarnings <= esiCeiling) {
                          esiEst = Math.round(grossEarnings * ((config?.esiRatePercentage ?? 0.75) / 100));
                        }
                      }
                    }
                    const empPendingFines = (fines || [])
                      .filter(f => f.employeeId === slip.employeeId && f.status === "Deducted From Payroll")
                      .reduce((sum, f) => sum + f.amount, 0);

                    const estimatedNet = Math.max(0, grossEarnings - pfDeduction - defaultTaxes - esiEst - empPendingFines);
                    const effectiveNetPay = (slip.netPay && slip.netPay > 0) ? slip.netPay : estimatedNet;

                    return (
                      <div key={slip.id} className="p-4 bg-slate-50/50 dark:bg-[#0a0a0a]/50 border border-slate-100 dark:border-[#1a1a1a] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-bold text-slate-800 dark:text-white text-xs">{slip.month} Earnings Summary</p>
                            {slip.status === "Draft" && (
                              <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200/50">
                                Pending Compilation
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 dark:text-gray-500 font-medium">
                            Net Disbursed: <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">₹{effectiveNetPay.toLocaleString()}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-gray-500">Disbursed to: {getEmployeeBank(slip.employeeId)}</p>
                        </div>

                        <div className="flex items-center space-x-2">
                          {docList.length > 0 && (
                            <button
                              onClick={() => {
                                const emp = targetEmp;
                                setViewDocModal({
                                  payslip: slip,
                                  employeeName: emp?.fullName || getEmployeeName(slip.employeeId),
                                  empCode: emp ? getEmployeeCode(emp) : slip.employeeId
                                });
                                setActiveDocIndex(0);
                              }}
                              className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer transition-all border border-blue-200/80 dark:border-blue-800/60 shadow-2xs"
                              title="View and download all attached salary documents"
                            >
                              <Paperclip className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <span>{docList.length === 1 ? "Attached Document" : `Attached Docs (${docList.length})`}</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setActiveSlip(slip);
                              setSlipModalTab("payslip");
                            }}
                            className="bg-emerald-600/10 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-600/20 px-3 py-2 rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View PDF Slip</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveSlip(slip);
                              setSlipModalTab("form16");
                            }}
                            className="bg-violet-600/10 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 hover:bg-violet-600/20 px-3 py-2 rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                            <span>View Form 16</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {myVaultPayslips.length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-6 bg-slate-50/50 dark:bg-[#0a0a0a]/10 rounded-xl">No salary payslips generated for this billing month yet.</p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Admin/HR View: Payroll Processing Dashboard */}
      {role !== "employee" && activeSubTab === "payslips" && (
        <div className="space-y-6">
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
              <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 sm:p-5 shadow-xs dark:neon-glow space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">
                  <div>
                    <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">Employees Payroll Center</h3>
                    <p className="text-xs text-slate-400 dark:text-gray-500">Generate structural salary slips with automated email dispatch</p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                    {/* Search by Name / Employee Code */}
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={nameSearchQuery}
                        onChange={(e) => setNameSearchQuery(e.target.value)}
                        placeholder="Search employee by name, ID..."
                        className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 rounded-xl border border-slate-200 dark:border-[#252525] focus:outline-none focus:border-emerald-500 transition-all font-medium placeholder:text-slate-400"
                      />
                      {nameSearchQuery && (
                        <button
                          onClick={() => setNameSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 cursor-pointer"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`Disburse salary for all Generated slips in ${selectedMonth}?`)) {
                          onPayAllPayslips(selectedMonth);
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap text-center justify-center"
                    >
                      Bulk Disburse Payments
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-[#0a0a0a]/50 p-3 rounded-xl border border-slate-100 dark:border-[#1a1a1a] text-[11px] text-slate-500 dark:text-gray-400 leading-normal flex items-start space-x-2">
                  <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Generating a salary slip immediately locks any outstanding late-coming fines and compiles HRA structures. An automated verification notification with structural break-up is sent directly to the employee's email address.</span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0">
                  <table className="w-full text-left border-collapse text-xs min-w-[980px]">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-[#1a1a1a] text-slate-400 dark:text-gray-500 uppercase text-[10px] tracking-tight font-semibold">
                        <th className="py-2.5 px-2 text-left min-w-[170px]">Employee &amp; Code</th>
                        <th className="py-2.5 px-1.5 text-right min-w-[70px]">Basic</th>
                        <th className="py-2.5 px-1.5 text-right min-w-[70px]">HRA</th>
                        <th className="py-2.5 px-1.5 text-right min-w-[60px]">Tel.</th>
                        <th className="py-2.5 px-1.5 text-right min-w-[60px]">Fuel</th>
                        <th className="py-2.5 px-1.5 text-right min-w-[65px]">Prof Dev</th>
                        <th className="py-2.5 px-1.5 text-right min-w-[60px]">LTA</th>
                        <th className="py-2.5 px-1.5 text-right min-w-[70px]">Sp. Allow</th>
                        <th className="py-2.5 px-1.5 text-right min-w-[70px]">PF+TDS</th>
                        <th className="py-2.5 px-1.5 text-right text-rose-500 min-w-[65px]">Fines</th>
                        <th className="py-2.5 px-1.5 text-right text-emerald-600 min-w-[80px]">Net Pay</th>
                        <th className="py-2.5 px-2 text-center min-w-[80px]">Status</th>
                        <th className="py-2.5 px-3 text-center min-w-[130px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-[#1a1a1a]/50">
                      {paginatedEmployees.map(emp => {
                        const hasSlip = currentMonthPayslips.find(p => p.employeeId === emp.id);
                        const sal = getEmpSalaryComponents(emp);
                        const grossEarnings = sal.basic + sal.hra + sal.telephone + sal.fuel + sal.professionalDev + sal.lta + sal.allowances;
                        const isPfExempt = (config?.pfExemptEmployeeIds || []).includes(emp.id) ||
                          (config?.pfExemptEmployeeIds || []).includes(emp.code || "") ||
                          emp.salary?.pfMode === "exempt";
                        let pfDeduction = 0;
                        if (!isPfExempt) {
                          if (emp.salary?.pfMode === "fixed_1800" || config?.pfModeDefault === "fixed_1800") {
                            pfDeduction = 1800;
                          } else if (emp.salary?.pfMode === "custom" && emp.salary?.pfDeduction !== undefined && emp.salary?.pfDeduction > 0) {
                            pfDeduction = emp.salary.pfDeduction;
                          } else {
                            pfDeduction = (config?.pfType === "fixed")
                              ? (config?.pfValue ?? 1800)
                              : Math.round(sal.basic * ((config?.pfValue ?? 12) / 100));
                          }
                        }
                        const empPendingFines = (fines || [])
                          .filter(f => f.employeeId === emp.id && f.status === "Deducted From Payroll")
                          .reduce((sum, f) => sum + f.amount, 0);
                        const empTdsOptIn = emp.salary?.tdsOptIn !== false;
                        const defaultTaxes = !empTdsOptIn
                          ? 0
                          : computeMonthlyTDSFromEmployee(
                            { ...emp.salary, taxProfile: emp.salary?.taxProfile as any },
                            config?.taxType || "percentage",
                            config?.taxValue ?? 5
                          );

                        const isEsiExempt = (config?.esiExemptEmployeeIds || []).includes(emp.id) ||
                          (config?.esiExemptEmployeeIds || []).includes(emp.code || "") ||
                          emp.salary?.esiOptIn === false;
                        let esiEst = 0;
                        if (config?.esiEnabled !== false && !isEsiExempt) {
                          if (emp.salary?.esiMode === "custom" && emp.salary?.esiDeduction !== undefined && emp.salary.esiDeduction > 0) {
                            esiEst = emp.salary.esiDeduction;
                          } else {
                            const esiCeiling = config?.esiGrossCeiling ?? 21000;
                            if (esiCeiling <= 0 || grossEarnings <= esiCeiling) {
                              esiEst = Math.round(grossEarnings * ((config?.esiRatePercentage ?? 0.75) / 100));
                            }
                          }
                        }

                        const netSalaryEstimate = Math.max(0, grossEarnings - pfDeduction - defaultTaxes - esiEst - empPendingFines);

                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a]/30 transition-colors">
                            <td className="py-2 px-2">
                              <div className="flex items-start space-x-2">
                                <div className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center font-bold text-[10px] uppercase shrink-0 mt-0.5">
                                  {emp.fullName.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-800 dark:text-gray-100 text-xs truncate leading-tight">
                                    {emp.fullName}
                                  </div>
                                  <div className="mt-0.5">
                                    <span className="inline-block font-mono text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1 py-0.2 rounded border border-amber-200/60 dark:border-amber-800/40 leading-none">
                                      {getEmployeeCode(emp)}
                                    </span>
                                  </div>
                                  <div className="text-[9.5px] text-slate-400 dark:text-gray-500 font-medium truncate mt-0.5 leading-tight">
                                    {(() => {
                                      const des = designations.find(d => d.id === emp.designationId);
                                      return des?.title || (emp as any).designation || emp.department || "Specialist";
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </td>
                            {(() => {
                              const isCompiled = hasSlip && hasSlip.status !== "Draft";
                              const docList = (hasSlip?.documents && hasSlip.documents.length > 0)
                                ? hasSlip.documents
                                : (hasSlip?.documentUrl ? [{ id: "doc-1", name: hasSlip.documentName || "Document", url: hasSlip.documentUrl }] : []);
                              const docCount = docList.length;

                              return (
                                <>
                                  <td className="py-2 px-1.5 text-right font-mono text-[11px] text-slate-700 dark:text-gray-300 font-semibold whitespace-nowrap">₹{(isCompiled ? hasSlip.basic : sal.basic).toLocaleString()}</td>
                                  <td className="py-2 px-1.5 text-right font-mono text-[11px] text-slate-500 dark:text-gray-400 whitespace-nowrap">₹{(isCompiled ? hasSlip.hra : sal.hra).toLocaleString()}</td>
                                  <td className="py-2 px-1.5 text-right font-mono text-[11px] text-slate-500 dark:text-gray-400 whitespace-nowrap">₹{(isCompiled ? hasSlip.telephone : sal.telephone).toLocaleString()}</td>
                                  <td className="py-2 px-1.5 text-right font-mono text-[11px] text-slate-500 dark:text-gray-400 whitespace-nowrap">₹{(isCompiled ? hasSlip.fuel : sal.fuel).toLocaleString()}</td>
                                  <td className="py-2 px-1.5 text-right font-mono text-[11px] text-slate-500 dark:text-gray-400 whitespace-nowrap">₹{(isCompiled ? hasSlip.professionalDev : sal.professionalDev).toLocaleString()}</td>
                                  <td className="py-2 px-1.5 text-right font-mono text-[11px] text-slate-500 dark:text-gray-400 whitespace-nowrap">₹{(isCompiled ? hasSlip.lta : sal.lta).toLocaleString()}</td>
                                  <td className="py-2 px-1.5 text-right font-mono text-[11px] text-slate-500 dark:text-gray-400 whitespace-nowrap">₹{(isCompiled ? hasSlip.allowances : sal.allowances).toLocaleString()}</td>
                                  <td className="py-2 px-1.5 text-right font-mono text-[11px] text-indigo-500 font-medium whitespace-nowrap">₹{(pfDeduction + defaultTaxes + esiEst).toLocaleString()}</td>
                                  <td className="py-2 px-1.5 text-right font-mono text-[11px] text-rose-500 whitespace-nowrap">
                                    ₹{isCompiled ? hasSlip.finesDeducted.toLocaleString() : empPendingFines.toLocaleString()}
                                  </td>
                                  <td className="py-2 px-1.5 text-right font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                                    ₹{isCompiled ? hasSlip.netPay.toLocaleString() : netSalaryEstimate.toLocaleString()}
                                  </td>
                                  <td className="py-2 px-2 text-center whitespace-nowrap">
                                    <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight ${isCompiled && hasSlip?.status === "Paid"
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50"
                                      : isCompiled && hasSlip?.status === "Generated"
                                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50"
                                        : "bg-slate-100 text-slate-500 dark:bg-[#1a1a1a] dark:text-gray-400 border border-slate-200/50 dark:border-[#2a2a2a]"
                                      }`}>
                                      {isCompiled ? hasSlip.status : "Pending Run"}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-center whitespace-nowrap">
                                    {isCompiled ? (
                                      <div className="flex items-center justify-center space-x-1.5">
                                        {/* Document Uploaded / Upload button */}
                                        {docCount > 0 ? (
                                          <button
                                            onClick={() => {
                                              setViewDocModal({
                                                payslip: hasSlip,
                                                employeeName: emp.fullName,
                                                empCode: getEmployeeCode(emp)
                                              });
                                              setActiveDocIndex(0);
                                            }}
                                            className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60 text-[10px] font-bold inline-flex items-center space-x-1 cursor-pointer transition-all shadow-2xs shrink-0"
                                            title={`${docCount} document${docCount > 1 ? 's' : ''} attached. Click to view, download, or manage.`}
                                          >
                                            <Paperclip className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span className="font-bold">{docCount === 1 ? "1 Doc" : `${docCount} Docs`}</span>
                                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                          </button>
                                        ) : (
                                          (role === "admin" || role === "hr") && onUploadPayrollDocument && (
                                            <button
                                              onClick={() => {
                                                setUploadModalEmp({ emp, payslip: hasSlip });
                                                setUploadDocFiles([]);
                                                setUploadDocError("");
                                              }}
                                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-[#1a1a1a] dark:hover:bg-blue-950/40 text-slate-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 border border-slate-200 dark:border-[#2a2a2a] text-[10px] font-semibold inline-flex items-center space-x-1 cursor-pointer transition-all shrink-0"
                                              title="Upload PDF or Image document(s) for this employee's payslip"
                                            >
                                              <Upload className="w-3 h-3 text-blue-500 shrink-0" />
                                              <span>Upload Doc</span>
                                            </button>
                                          )
                                        )}

                                        <button
                                          onClick={() => {
                                            setActiveSlip(hasSlip);
                                            setSlipModalTab("payslip");
                                          }}
                                          className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold text-[11px] inline-flex items-center space-x-1 cursor-pointer"
                                        >
                                          <span>Review</span>
                                        </button>
                                        {(role === "admin" || role === "hr") && onResetPayslip && (
                                          <button
                                            onClick={() => {
                                              if (confirm(`Reset and delete the generated payslip for ${emp.fullName} for ${selectedMonth}? This will release the fine deductions back to payroll.`)) {
                                                onResetPayslip(emp.id, selectedMonth, hasSlip?.id);
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
                                      <div className="flex items-center justify-center space-x-1">
                                        {/* Document Uploaded / Upload button for pending run */}
                                        {docCount > 0 ? (
                                          <button
                                            onClick={() => {
                                              setViewDocModal({
                                                payslip: hasSlip!,
                                                employeeName: emp.fullName,
                                                empCode: getEmployeeCode(emp)
                                              });
                                              setActiveDocIndex(0);
                                            }}
                                            className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60 text-[10px] font-bold inline-flex items-center space-x-1 cursor-pointer transition-all shadow-2xs shrink-0"
                                            title={`${docCount} document${docCount > 1 ? 's' : ''} attached. Click to view, download, or manage.`}
                                          >
                                            <Paperclip className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span className="font-bold">{docCount === 1 ? "1 Doc" : `${docCount} Docs`}</span>
                                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                          </button>
                                        ) : (
                                          (role === "admin" || role === "hr") && onUploadPayrollDocument && (
                                            <button
                                              onClick={() => {
                                                setUploadModalEmp({ emp, payslip: hasSlip });
                                                setUploadDocFiles([]);
                                                setUploadDocError("");
                                              }}
                                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-[#1a1a1a] dark:hover:bg-blue-950/40 text-slate-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 border border-slate-200 dark:border-[#2a2a2a] transition-all cursor-pointer shrink-0"
                                              title="Upload PDF or Image document(s) for this employee"
                                            >
                                              <Upload className="w-3.5 h-3.5 text-blue-500" />
                                            </button>
                                          )
                                        )}

                                        {(role === "admin" || role === "hr") && onUpdateEmployee && (
                                          <button
                                            onClick={() => openEditAllowancesModal(emp)}
                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 dark:bg-[#1a1a1a] dark:hover:bg-amber-950/40 text-slate-600 hover:text-amber-600 dark:text-gray-300 dark:hover:text-amber-400 border border-slate-200 dark:border-[#2a2a2a] transition-all cursor-pointer shrink-0"
                                            title="Edit Monthly Allowances (Tel, Fuel, Prof Dev, LTA)"
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {(role === "admin" || role === "hr") && onUpdateEmployee && (
                                          <button
                                            onClick={() => setTaxProfileEmp(emp)}
                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-violet-50 dark:bg-[#1a1a1a] dark:hover:bg-violet-950/40 text-slate-600 hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400 border border-slate-200 dark:border-[#2a2a2a] transition-all cursor-pointer shrink-0"
                                            title="Set Tax Profile (Regime, HRA, 80C, etc.)"
                                          >
                                            <Calculator className="w-3.5 h-3.5" />
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
                                </>
                              );
                            })()}
                          </tr>
                        );
                      })}
                      {paginatedEmployees.length === 0 && (
                        <tr>
                          <td colSpan={13} className="py-10 text-center text-slate-400 dark:text-gray-500 text-xs">
                            No employees found matching "<span className="font-bold text-slate-700 dark:text-gray-200">{nameSearchQuery}</span>".
                            <button
                              onClick={() => setNameSearchQuery("")}
                              className="ml-2 font-bold text-emerald-600 dark:text-emerald-400 underline cursor-pointer"
                            >
                              Clear search
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalItems > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-[#1a1a1a] text-xs">
                    <div className="text-slate-400 font-medium text-center sm:text-left">
                      Showing <span className="font-bold text-slate-700 dark:text-gray-200">{startIndex + 1}</span> to <span className="font-bold text-slate-700 dark:text-gray-200">{endIndex}</span> of <span className="font-bold text-slate-700 dark:text-gray-200">{totalItems}</span> employees
                    </div>

                    <div className="flex items-center space-x-1.5 overflow-x-auto max-w-full py-1">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={safeCurrentPage === 1}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-[#1a1a1a] text-slate-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-all cursor-pointer shrink-0"
                        title="Previous Page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0 ${safeCurrentPage === page
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
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-[#1a1a1a] text-slate-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-all cursor-pointer shrink-0"
                        title="Next Page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                      <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, taxType: "slab" }))}
                        className={`px-3 py-1 rounded-md transition-all ${config.taxType === "slab" ? "bg-rose-600 text-white shadow-xs font-bold" : "text-slate-500"}`}
                      >
                        Tax Slabs
                      </button>
                    </div>
                  </div>

                  {config.taxType === "slab" ? (
                    <div className="pt-2 space-y-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="bg-white dark:bg-[#141414] border border-slate-200/80 dark:border-[#222] rounded-xl p-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                            0% (NIL)
                          </span>
                          <p className="text-[11px] font-bold text-slate-700 dark:text-gray-200 mt-1.5 font-mono">Up to ₹33,333/mo</p>
                          <p className="text-[9px] text-slate-400">Annual: Up to ₹4L</p>
                        </div>
                        <div className="bg-white dark:bg-[#141414] border border-slate-200/80 dark:border-[#222] rounded-xl p-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400">
                            5%
                          </span>
                          <p className="text-[11px] font-bold text-slate-700 dark:text-gray-200 mt-1.5 font-mono">₹33,334–₹66,667</p>
                          <p className="text-[9px] text-slate-400">Annual: ₹4L–₹8L</p>
                        </div>
                        <div className="bg-white dark:bg-[#141414] border border-slate-200/80 dark:border-[#222] rounded-xl p-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
                            10%
                          </span>
                          <p className="text-[11px] font-bold text-slate-700 dark:text-gray-200 mt-1.5 font-mono">₹66,668–₹1,00,000</p>
                          <p className="text-[9px] text-slate-400">Annual: ₹8L–₹12L</p>
                        </div>
                        <div className="bg-white dark:bg-[#141414] border border-slate-200/80 dark:border-[#222] rounded-xl p-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
                            15%
                          </span>
                          <p className="text-[11px] font-bold text-slate-700 dark:text-gray-200 mt-1.5 font-mono">₹1,00,001–₹1,33,333</p>
                          <p className="text-[9px] text-slate-400">Annual: ₹12L–₹16L</p>
                        </div>
                        <div className="bg-white dark:bg-[#141414] border border-slate-200/80 dark:border-[#222] rounded-xl p-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                            20%
                          </span>
                          <p className="text-[11px] font-bold text-slate-700 dark:text-gray-200 mt-1.5 font-mono">₹1,33,334–₹1,66,667</p>
                          <p className="text-[9px] text-slate-400">Annual: ₹16L–₹20L</p>
                        </div>
                        <div className="bg-white dark:bg-[#141414] border border-slate-200/80 dark:border-[#222] rounded-xl p-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400">
                            25%
                          </span>
                          <p className="text-[11px] font-bold text-slate-700 dark:text-gray-200 mt-1.5 font-mono">₹1,66,668–₹2,00,000</p>
                          <p className="text-[9px] text-slate-400">Annual: ₹20L–₹24L</p>
                        </div>
                        <div className="bg-white dark:bg-[#141414] border border-slate-200/80 dark:border-[#222] rounded-xl p-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                            30%
                          </span>
                          <p className="text-[11px] font-bold text-slate-700 dark:text-gray-200 mt-1.5 font-mono">Above ₹2,00,000</p>
                          <p className="text-[9px] text-slate-400">Annual: Above ₹24L</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-gray-400 italic">
                        India New Tax Regime FY 2025-26 (Budget 2025) — 7 slabs (0%–30%) applied progressively on monthly gross earnings.
                      </p>
                    </div>
                  ) : (
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
                  )}
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
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all text-xs select-none ${isExempt
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

              {/* Employee ESI Exemption Manager */}
              <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#1a1a1a] pb-3">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                      <UserX className="w-4 h-4 text-blue-500" />
                      <span>ESI Exempted Employees Manager</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Select employees who are exempted from ESI deduction (ESI will be set to ₹0)
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = employees.map(e => e.id);
                        setConfig(prev => ({ ...prev, esiExemptEmployeeIds: allIds }));
                      }}
                      className="text-[10px] font-bold px-2.5 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-900/40 hover:bg-blue-100 transition-all cursor-pointer"
                    >
                      Exempt All
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, esiExemptEmployeeIds: [] }))}
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
                    value={esiSearchQuery}
                    onChange={e => setEsiSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a] rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-700 dark:text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Checkbox List */}
                <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                  {employees
                    .filter(e => {
                      const q = esiSearchQuery.toLowerCase();
                      const dName = getDesignationTitle(e.designationId).toLowerCase();
                      return e.fullName.toLowerCase().includes(q) || e.department.toLowerCase().includes(q) || dName.includes(q);
                    })
                    .map(emp => {
                      const isExempt = (config.esiExemptEmployeeIds || []).includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all text-xs select-none ${isExempt
                            ? "bg-blue-50/60 dark:bg-blue-950/20 border-blue-300 dark:border-blue-900/50 shadow-xs"
                            : "bg-slate-50/50 dark:bg-[#0a0a0a]/30 border-slate-100 dark:border-[#1a1a1a] hover:bg-slate-100/60"
                            }`}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={isExempt}
                              onChange={() => toggleEsiExempt(emp.id)}
                              className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                            />
                            <div>
                              <p className="font-bold text-slate-800 dark:text-white leading-tight">{emp.fullName}</p>
                              <p className="text-[10px] text-slate-400 leading-tight">
                                {getDesignationTitle(emp.designationId)} • {emp.department}
                              </p>
                            </div>
                          </div>

                          {isExempt ? (
                            <span className="text-[10px] font-extrabold bg-blue-500 text-white px-2 py-0.5 rounded-full shadow-xs">
                              EXEMPTED (₹0 ESI)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">
                              Standard ESI Active
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
                  const isEsiSimExempt = (config.esiExemptEmployeeIds || []).includes(simEmp.id);
                  const pf = isExempt ? 0 : (config.pfModeDefault === "fixed_1800" ? 1800 : (config.pfType === "percentage" ? Math.round(basic * (config.pfValue / 100)) : config.pfValue));
                  const tax = computeMonthlyTDSFromEmployee(
                    {
                      basic, hra, allowances, telephone, fuel, professionalDev: profDev, lta,
                      pfDeduction: pf,
                      tdsOptIn: simEmp.salary?.tdsOptIn !== false,
                      tdsMode: simEmp.salary?.tdsMode,
                      tdsDeduction: simEmp.salary?.tdsDeduction,
                      taxProfile: simEmp.salary?.taxProfile as any,
                    },
                    config.taxType,
                    config.taxValue
                  );
                  const esiGrossCeiling = config.esiGrossCeiling ?? 21000;
                  const esi = (config.esiEnabled !== false && !isEsiSimExempt && (esiGrossCeiling <= 0 || gross <= esiGrossCeiling)) ? Math.round(gross * ((config.esiRatePercentage || 0.75) / 100)) : 0;
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
                          <span>- Tax / TDS ({config.taxType === "slab" ? "FY 2025-26 Slabs (0%–30%)" : config.taxType === "percentage" ? `${config.taxValue}%` : "Fixed"})</span>
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
        const emp = employees.find(e => e.id === activeSlip.employeeId || e.code === activeSlip.employeeId || getEmployeeCode(e) === activeSlip.employeeId);
        const empPan = String(
          (emp?.customFields?.pan as string) ||
          (emp as any)?.pan ||
          (emp as any)?.panNumber ||
          (emp as any)?.pan_number ||
          (emp?.customFields?.panNumber as string) ||
          (emp?.customFields?.pan_number as string) ||
          (emp as any)?.custom_fields?.pan ||
          ""
        ).trim();
        const empUan = String(
          (emp?.customFields?.uan as string) ||
          (emp as any)?.uan ||
          (emp as any)?.uanNumber ||
          (emp as any)?.uan_number ||
          (emp?.customFields?.uanNumber as string) ||
          (emp?.customFields?.uan_number as string) ||
          (emp as any)?.custom_fields?.uan ||
          ""
        ).trim();

        const isPfExempt = (config?.pfExemptEmployeeIds || []).includes(activeSlip.employeeId) ||
          (emp && ((config?.pfExemptEmployeeIds || []).includes(emp.id) ||
            (config?.pfExemptEmployeeIds || []).includes(emp.code || "") ||
            emp.salary?.pfMode === "exempt"));

        const isEsiExempt = (config?.esiExemptEmployeeIds || []).includes(activeSlip.employeeId) ||
          (emp && ((config?.esiExemptEmployeeIds || []).includes(emp.id) ||
            (config?.esiExemptEmployeeIds || []).includes(emp.code || "") ||
            emp.salary?.esiOptIn === false));

        const slipTelephone = (activeSlip.telephone && activeSlip.telephone > 0) ? activeSlip.telephone : (emp?.salary?.telephone || 0);
        const slipFuel = (activeSlip.fuel && activeSlip.fuel > 0) ? activeSlip.fuel : (emp?.salary?.fuel || 0);
        const slipProfDev = (activeSlip.professionalDev && activeSlip.professionalDev > 0) ? activeSlip.professionalDev : (emp?.salary?.professionalDev || 0);
        const slipLta = (activeSlip.lta && activeSlip.lta > 0) ? activeSlip.lta : (emp?.salary?.lta || 0);
        const slipAllowances = (activeSlip.allowances !== undefined && activeSlip.allowances > 0) ? activeSlip.allowances : (emp?.salary?.allowances || 0);
        const grossEarnings = activeSlip.basic + activeSlip.hra + slipTelephone + slipFuel + slipProfDev + slipLta + slipAllowances;

        const slipPf = isPfExempt ? 0 : (activeSlip.pfDeduction || 0);
        const slipEsi = isEsiExempt ? 0 : (activeSlip.esiDeduction || 0);
        const slipTds = activeSlip.taxDeduction || 0;
        const slipFines = activeSlip.finesDeducted || 0;

        const grossDeductions = slipPf + slipTds + slipFines + slipEsi;
        const displayNetPay = Math.max(0, grossEarnings - grossDeductions);
        const designation = getDesignationTitle(emp?.designationId || "");
        const empCode = emp ? getEmployeeCode(emp) : activeSlip.employeeId;

        const activeDeductions: { label: string; amount: number; isRose?: boolean }[] = [];
        if (slipTds > 0) {
          activeDeductions.push({ label: "TDS", amount: slipTds });
        }
        if (!isPfExempt && slipPf > 0) {
          activeDeductions.push({ label: "P.F.", amount: slipPf });
        }
        if (slipFines > 0) {
          activeDeductions.push({ label: "LATE FINES", amount: slipFines, isRose: true });
        }
        if (!isEsiExempt && slipEsi > 0) {
          activeDeductions.push({ label: "E.S.I.", amount: slipEsi });
        }

        const activeEarnings: { label: string; amount: number }[] = [];
        if (activeSlip.basic > 0) activeEarnings.push({ label: "BASIC", amount: activeSlip.basic });
        if (activeSlip.hra > 0) activeEarnings.push({ label: "HRA", amount: activeSlip.hra });
        if (slipTelephone > 0) activeEarnings.push({ label: "TELEPHONE", amount: slipTelephone });
        if (slipFuel > 0) activeEarnings.push({ label: "FUEL", amount: slipFuel });
        if (slipProfDev > 0) activeEarnings.push({ label: "PROFESSIONAL DEV", amount: slipProfDev });
        if (slipLta > 0) activeEarnings.push({ label: "LTA", amount: slipLta });
        if (slipAllowances > 0) activeEarnings.push({ label: "SPECIAL ALLOWANCE", amount: slipAllowances });

        const totalTableRows = Math.max(activeEarnings.length, activeDeductions.length, 1);
        const empTaxProfile = emp?.salary?.taxProfile;
        const regime = empTaxProfile?.regime ?? (config?.defaultTaxRegime ?? "new");
        const basic = activeSlip.basic || 0;
        const hra = activeSlip.hra || 0;
        const telephone = slipTelephone;
        const fuel = slipFuel;
        const profDev = slipProfDev;
        const lta = slipLta;
        const allowances = slipAllowances;
        const pf = slipPf;

        const taxInput: TaxComputationInput = {
          annualBasic: basic * 12,
          annualHRA: hra * 12,
          annualLTA: lta * 12,
          annualSpecialAllowance: allowances * 12,
          annualTelephone: telephone * 12,
          annualFuel: fuel * 12,
          annualProfDev: profDev * 12,
          annualPFEmployee: pf * 12,
          regime,
          monthlyRentPaid: empTaxProfile?.monthlyRentPaid || 0,
          cityType: empTaxProfile?.cityType || "non-metro",
          section80C: empTaxProfile?.section80C || 0,
          section80CCD1B: empTaxProfile?.section80CCD1B || 0,
          section80D: empTaxProfile?.section80D || 0,
          section80E: empTaxProfile?.section80E || 0,
          section80G: empTaxProfile?.section80G || 0,
          section80EEA: empTaxProfile?.section80EEA || 0,
          employerNPS: empTaxProfile?.employerNPS || 0,
          professionalTax: empTaxProfile?.professionalTax || 2400,
          manualMonthlyTDS: empTaxProfile?.tdsLocked ? empTaxProfile.manualMonthlyTDS : undefined,
          tdsLocked: empTaxProfile?.tdsLocked || false,
        };

        const taxResult: TaxComputationResult = computeTDS(taxInput);

        return (
          <div className="fixed inset-0 bg-slate-100 dark:bg-[#0a0e17] z-50 flex flex-col w-full h-full min-h-screen overflow-hidden animate-in fade-in duration-200">

            {/* Full-Width Header Controls Bar */}
            <div className="bg-slate-900 px-6 py-3 text-white flex flex-wrap items-center justify-between gap-3 shadow-md shrink-0 print:hidden">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveSlip(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-2 rounded-xl transition-colors cursor-pointer border border-slate-700"
                  title="Back to Payroll Dashboard"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-bold text-sm sm:text-base leading-tight">
                    {slipModalTab === "payslip" ? "Official Salary Payslip Statement" : "Form 16 Part-B & Annual Tax Certificate"}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {emp?.fullName || getEmployeeName(activeSlip.employeeId)} · {empCode} · {activeSlip.month}
                  </p>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 shadow-inner space-x-1">
                <button
                  onClick={() => setSlipModalTab("payslip")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${slipModalTab === "payslip"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Salary Payslip</span>
                </button>
                <button
                  onClick={() => setSlipModalTab("form16")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${slipModalTab === "form16"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Form 16 (Tax Part-B)</span>
                </button>

                {activeSlip.documentUrl && (
                  <button
                    onClick={() => setViewDocModal({
                      payslip: activeSlip,
                      employeeName: emp?.fullName || getEmployeeName(activeSlip.employeeId),
                      empCode
                    })}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer bg-blue-600/90 text-white hover:bg-blue-600 shadow-sm"
                    title="View and download attached document"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Attached Document</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
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

            {/* FULL PAGE DOCUMENT CONTAINER */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-10 flex justify-center custom-scrollbar">

              {slipModalTab === "payslip" ? (
                /* ─── PAYSLIP VIEW ────────────────────────────────────────── */
                <div className="bg-white text-slate-900 shadow-2xl border border-slate-300 rounded-2xl w-full max-w-4xl p-6 sm:p-10 my-auto printable-payslip font-sans space-y-6">

                  {/* Document Top Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-4">
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
                          {companyName}
                        </h2>
                      </div>
                    </div>

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
                          <td className="p-2.5 text-slate-900 border-r border-slate-700 font-mono">{emp?.joiningDate || ""}</td>
                          <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">Department</td>
                          <td className="p-2.5 text-slate-900">{emp?.department || ""}</td>
                        </tr>
                        <tr className="border-b border-slate-700">
                          <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">Designation</td>
                          <td className="p-2.5 text-slate-900 border-r border-slate-700">{designation || ""}</td>
                          <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">PAN</td>
                          <td className="p-2.5 text-slate-900 font-mono">{empPan}</td>
                        </tr>
                        <tr className="border-b border-slate-700">
                          <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">Location</td>
                          <td className="p-2.5 text-slate-900 border-r border-slate-700">{emp?.branch || ""}</td>
                          <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">UAN</td>
                          <td className="p-2.5 text-slate-900 font-mono">{empUan}</td>
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

                  {/* Earnings & Deductions Table */}
                  <div className="border border-slate-700 overflow-hidden">
                    <table className="w-full text-xs text-left border-collapse font-sans">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-700 font-bold text-slate-900">
                          <th className="p-2.5 border-r border-slate-700 w-1/4 uppercase">EARNINGS</th>
                          <th className="p-2.5 border-r border-slate-700 w-1/4 text-right uppercase">AMOUNT</th>
                          <th className="p-2.5 border-r border-slate-700 w-1/4 uppercase">DEDUCTIONS</th>
                          <th className="p-2.5 w-1/4 text-right uppercase">AMOUNT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: totalTableRows }).map((_, idx) => {
                          const earn = activeEarnings[idx];
                          const ded = activeDeductions[idx];
                          return (
                            <tr key={idx}>
                              {earn ? (
                                <>
                                  <td className="p-2.5 border-r border-slate-700 font-bold uppercase">{earn.label}</td>
                                  <td className="p-2.5 border-r border-slate-700 text-right font-mono">{earn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </>
                              ) : (
                                <>
                                  <td className="p-2.5 border-r border-slate-700"></td>
                                  <td className="p-2.5 border-r border-slate-700 text-right"></td>
                                </>
                              )}
                              {ded ? (
                                <>
                                  <td className={`p-2.5 border-r border-slate-700 font-bold uppercase ${ded.isRose ? "text-rose-700" : ""}`}>{ded.label}</td>
                                  <td className={`p-2.5 text-right font-mono ${ded.isRose ? "text-rose-700" : ""}`}>{ded.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </>
                              ) : (
                                <>
                                  <td className="p-2.5 border-r border-slate-700"></td>
                                  <td className="p-2.5 text-right"></td>
                                </>
                              )}
                            </tr>
                          );
                        })}
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
                            {displayNetPay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Net Pay In Words */}
                  <div className="pt-2 space-y-1">
                    <p className="font-bold text-slate-900 text-xs">
                      NET Pay for the Month: <span className="font-mono font-extrabold">{displayNetPay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /-</span> ({numberToWordsIndian(displayNetPay)} Only)
                    </p>
                  </div>

                  {/* Document Subtext & Switch Action */}
                  <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-[11px] text-slate-600 italic">
                      ** This is a computer generated payslip and does not require signature and stamp.
                    </p>
                    <button
                      onClick={() => setSlipModalTab("form16")}
                      className="text-xs font-bold text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg border border-violet-200 transition-colors flex items-center space-x-1.5 cursor-pointer print:hidden"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>Switch to View Form 16 Part-B</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* ─── FORM 16 PART-B VIEW ─────────────────────────────────── */
                <div className="bg-white text-slate-900 shadow-2xl border border-slate-300 rounded-2xl w-full max-w-4xl p-6 sm:p-10 my-auto printable-payslip font-sans space-y-6">

                  {/* Form 16 Top Header */}
                  <div className="text-center border-b pb-4 space-y-1">
                    <h2 className="text-base sm:text-lg font-black tracking-wider uppercase text-slate-900 font-sans">
                      FORM NO. 16
                    </h2>
                    <p className="text-xs font-semibold text-slate-600">
                      [See rule 31(1)(a)]
                    </p>
                    <p className="text-xs font-bold text-slate-800">
                      PART B: Certificate under Section 203 of the Income-tax Act, 1961 for Tax Deducted at Source on Salary
                    </p>
                    <div className="flex items-center justify-center gap-4 text-xs font-mono font-bold text-slate-700 pt-1">
                      <span>Assessment Year: <strong className="text-slate-900">2026-27</strong></span>
                      <span>|</span>
                      <span>Financial Year: <strong className="text-slate-900">2025-26</strong></span>
                      <span>|</span>
                      <span className="px-2 py-0.5 rounded bg-violet-50 text-violet-700 font-bold border border-violet-200">
                        {taxResult.regime === "new" ? "New Tax Regime (u/s 115BAC)" : "Old Tax Regime"}
                      </span>
                    </div>
                  </div>

                  {/* Employer and Employee Info Grid */}
                  <div className="border border-slate-700 overflow-hidden">
                    <table className="w-full text-xs text-left border-collapse font-sans">
                      <tbody>
                        <tr className="border-b border-slate-700">
                          <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700 w-1/4">Name of Employer</td>
                          <td className="p-2.5 text-slate-900 border-r border-slate-700 font-semibold w-1/4">{companyName || ""}</td>
                          <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700 w-1/4">Name of Employee</td>
                          <td className="p-2.5 text-slate-900 font-semibold w-1/4">{emp?.fullName || getEmployeeName(activeSlip.employeeId)}</td>
                        </tr>
                        <tr className="border-b border-slate-700">
                          <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">PAN of Employer</td>
                          <td className="p-2.5 text-slate-900 border-r border-slate-700 font-mono">
                            {companyPan || (config as any)?.companyPan || (typeof window !== "undefined" ? (localStorage.getItem(`snailhr_companyPan_${companyId}`) || localStorage.getItem("snailhr_companyPan") || "") : "") || ""}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">Employee PAN</td>
                          <td className="p-2.5 text-slate-900 font-mono">{empPan}</td>
                        </tr>
                        <tr className="border-b border-slate-700">
                          <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">TAN of Employer</td>
                          <td className="p-2.5 text-slate-900 border-r border-slate-700 font-mono">
                            {companyTan || (config as any)?.companyTan || (typeof window !== "undefined" ? (localStorage.getItem(`snailhr_companyTan_${companyId}`) || localStorage.getItem("snailhr_companyTan") || "") : "") || ""}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">Employee Code</td>
                          <td className="p-2.5 text-slate-900 font-mono">{empCode}</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">Branch & Location</td>
                          <td className="p-2.5 text-slate-900 border-r border-slate-700">{emp?.branch || ""}</td>
                          <td className="p-2.5 font-bold text-slate-900 bg-slate-50 border-r border-slate-700">Designation / Dept</td>
                          <td className="p-2.5 text-slate-900">
                            {(() => {
                              const desig = emp?.designationId ? getDesignationTitle(emp.designationId) : ((emp as any)?.designation || "");
                              const dept = emp?.department || "";
                              if (desig && dept) return `${desig} (${dept})`;
                              return desig || dept || "";
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Form 16 Part-B Computation Breakdown Table */}
                  <div className="border border-slate-700 overflow-hidden">
                    <table className="w-full text-xs text-left border-collapse font-sans">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-700 font-bold text-slate-900">
                          <th className="p-2.5 border-r border-slate-700 w-12 text-center">S.No</th>
                          <th className="p-2.5 border-r border-slate-700">Particulars</th>
                          <th className="p-2.5 border-r border-slate-700 w-36 text-right">Amount (₹)</th>
                          <th className="p-2.5 w-36 text-right font-bold">Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {/* 1. Gross Salary */}
                        <tr className="bg-slate-50/70 font-bold">
                          <td className="p-2.5 border-r border-slate-700 text-center">1</td>
                          <td className="p-2.5 border-r border-slate-700" colSpan={2}>
                            Gross Salary as per provisions of section 17(1)
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold">
                            ₹{taxResult.annualGrossIncome.toLocaleString('en-IN')}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2.5 border-r border-slate-700 text-center text-slate-400"></td>
                          <td className="p-2.5 border-r border-slate-700 pl-6 text-slate-700">(a) Annual Basic Salary</td>
                          <td className="p-2.5 border-r border-slate-700 text-right font-mono text-slate-700">₹{(basic * 12).toLocaleString('en-IN')}</td>
                          <td className="p-2.5 text-right font-mono"></td>
                        </tr>
                        <tr>
                          <td className="p-2.5 border-r border-slate-700 text-center text-slate-400"></td>
                          <td className="p-2.5 border-r border-slate-700 pl-6 text-slate-700">(b) House Rent Allowance (HRA)</td>
                          <td className="p-2.5 border-r border-slate-700 text-right font-mono text-slate-700">₹{(hra * 12).toLocaleString('en-IN')}</td>
                          <td className="p-2.5 text-right font-mono"></td>
                        </tr>
                        <tr>
                          <td className="p-2.5 border-r border-slate-700 text-center text-slate-400"></td>
                          <td className="p-2.5 border-r border-slate-700 pl-6 text-slate-700">(c) Special & Other Allowances</td>
                          <td className="p-2.5 border-r border-slate-700 text-right font-mono text-slate-700">₹{((allowances + telephone + fuel + profDev + lta) * 12).toLocaleString('en-IN')}</td>
                          <td className="p-2.5 text-right font-mono"></td>
                        </tr>

                        {/* 2. Exemptions u/s 10 */}
                        <tr className="bg-slate-50/70 font-bold">
                          <td className="p-2.5 border-r border-slate-700 text-center">2</td>
                          <td className="p-2.5 border-r border-slate-700" colSpan={2}>
                            Less: Allowances to the extent exempt under section 10
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                            {taxResult.hraExemption + taxResult.ltaExemption > 0
                              ? `(−) ₹${(taxResult.hraExemption + taxResult.ltaExemption).toLocaleString('en-IN')}`
                              : "₹0"}
                          </td>
                        </tr>
                        {taxResult.hraExemption > 0 && (
                          <tr>
                            <td className="p-2.5 border-r border-slate-700 text-center text-slate-400"></td>
                            <td className="p-2.5 border-r border-slate-700 pl-6 text-slate-700">HRA Exemption u/s 10(13A)</td>
                            <td className="p-2.5 border-r border-slate-700 text-right font-mono text-slate-700">₹{taxResult.hraExemption.toLocaleString('en-IN')}</td>
                            <td className="p-2.5 text-right font-mono"></td>
                          </tr>
                        )}
                        {taxResult.ltaExemption > 0 && (
                          <tr>
                            <td className="p-2.5 border-r border-slate-700 text-center text-slate-400"></td>
                            <td className="p-2.5 border-r border-slate-700 pl-6 text-slate-700">LTA Exemption u/s 10(5)</td>
                            <td className="p-2.5 border-r border-slate-700 text-right font-mono text-slate-700">₹{taxResult.ltaExemption.toLocaleString('en-IN')}</td>
                            <td className="p-2.5 text-right font-mono"></td>
                          </tr>
                        )}

                        {/* 3. Deductions u/s 16 */}
                        <tr className="bg-slate-50/70 font-bold">
                          <td className="p-2.5 border-r border-slate-700 text-center">3</td>
                          <td className="p-2.5 border-r border-slate-700" colSpan={2}>
                            Deductions under section 16
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                            (−) ₹{(taxResult.standardDeduction + taxResult.professionalTaxDeduction).toLocaleString('en-IN')}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2.5 border-r border-slate-700 text-center text-slate-400"></td>
                          <td className="p-2.5 border-r border-slate-700 pl-6 text-slate-700">(a) Standard Deduction u/s 16(ia)</td>
                          <td className="p-2.5 border-r border-slate-700 text-right font-mono text-slate-700">₹{taxResult.standardDeduction.toLocaleString('en-IN')}</td>
                          <td className="p-2.5 text-right font-mono"></td>
                        </tr>
                        {taxResult.professionalTaxDeduction > 0 && (
                          <tr>
                            <td className="p-2.5 border-r border-slate-700 text-center text-slate-400"></td>
                            <td className="p-2.5 border-r border-slate-700 pl-6 text-slate-700">(b) Tax on Employment (PT) u/s 16(iii)</td>
                            <td className="p-2.5 border-r border-slate-700 text-right font-mono text-slate-700">₹{taxResult.professionalTaxDeduction.toLocaleString('en-IN')}</td>
                            <td className="p-2.5 text-right font-mono"></td>
                          </tr>
                        )}

                        {/* 4. Chapter VI-A Deductions */}
                        <tr className="bg-slate-50/70 font-bold">
                          <td className="p-2.5 border-r border-slate-700 text-center">4</td>
                          <td className="p-2.5 border-r border-slate-700" colSpan={2}>
                            Deductions under Chapter VI-A (80C, 80D, 80CCD, etc.)
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                            {taxResult.totalChapterVIA > 0 ? `(−) ₹${taxResult.totalChapterVIA.toLocaleString('en-IN')}` : "₹0"}
                          </td>
                        </tr>
                        {taxResult.section80C > 0 && (
                          <tr>
                            <td className="p-2.5 border-r border-slate-700 text-center text-slate-400"></td>
                            <td className="p-2.5 border-r border-slate-700 pl-6 text-slate-700">Section 80C (PPF / EPF / LIC / ELSS)</td>
                            <td className="p-2.5 border-r border-slate-700 text-right font-mono text-slate-700">₹{taxResult.section80C.toLocaleString('en-IN')}</td>
                            <td className="p-2.5 text-right font-mono"></td>
                          </tr>
                        )}
                        {taxResult.section80CCD1B > 0 && (
                          <tr>
                            <td className="p-2.5 border-r border-slate-700 text-center text-slate-400"></td>
                            <td className="p-2.5 border-r border-slate-700 pl-6 text-slate-700">Section 80CCD(1B) (NPS Self)</td>
                            <td className="p-2.5 border-r border-slate-700 text-right font-mono text-slate-700">₹{taxResult.section80CCD1B.toLocaleString('en-IN')}</td>
                            <td className="p-2.5 text-right font-mono"></td>
                          </tr>
                        )}
                        {taxResult.section80D > 0 && (
                          <tr>
                            <td className="p-2.5 border-r border-slate-700 text-center text-slate-400"></td>
                            <td className="p-2.5 border-r border-slate-700 pl-6 text-slate-700">Section 80D (Health Insurance)</td>
                            <td className="p-2.5 border-r border-slate-700 text-right font-mono text-slate-700">₹{taxResult.section80D.toLocaleString('en-IN')}</td>
                            <td className="p-2.5 text-right font-mono"></td>
                          </tr>
                        )}
                        {taxResult.employerNPSDeduction > 0 && (
                          <tr>
                            <td className="p-2.5 border-r border-slate-700 text-center text-slate-400"></td>
                            <td className="p-2.5 border-r border-slate-700 pl-6 text-slate-700">Section 80CCD(2) (Employer NPS)</td>
                            <td className="p-2.5 border-r border-slate-700 text-right font-mono text-slate-700">₹{taxResult.employerNPSDeduction.toLocaleString('en-IN')}</td>
                            <td className="p-2.5 text-right font-mono"></td>
                          </tr>
                        )}

                        {/* 5. Net Taxable Income */}
                        <tr className="bg-slate-100 font-extrabold text-slate-900 text-sm">
                          <td className="p-2.5 border-r border-slate-700 text-center">5</td>
                          <td className="p-2.5 border-r border-slate-700 uppercase" colSpan={2}>
                            Total Taxable Income (Rounded off u/s 288A)
                          </td>
                          <td className="p-2.5 text-right font-mono font-black text-slate-900">
                            ₹{taxResult.netTaxableIncome.toLocaleString('en-IN')}
                          </td>
                        </tr>

                        {/* 6. Tax Computation on Total Income */}
                        <tr className="bg-slate-50/70 font-bold">
                          <td className="p-2.5 border-r border-slate-700 text-center">6</td>
                          <td className="p-2.5 border-r border-slate-700" colSpan={2}>
                            Tax Computation on Total Income
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold">
                            ₹{taxResult.baseTax.toLocaleString('en-IN')}
                          </td>
                        </tr>
                        {taxResult.slabwiseTax.map((slab, i) => (
                          <tr key={i}>
                            <td className="p-2.5 border-r border-slate-700 text-center text-slate-400"></td>
                            <td className="p-2.5 border-r border-slate-700 pl-6 text-slate-700">Slab: {slab.slab} @ {slab.rate}%</td>
                            <td className="p-2.5 border-r border-slate-700 text-right font-mono text-slate-700">₹{slab.tax.toLocaleString('en-IN')}</td>
                            <td className="p-2.5 text-right font-mono"></td>
                          </tr>
                        ))}

                        {/* 7. Section 87A Rebate */}
                        {taxResult.rebate87A > 0 && (
                          <tr className="text-emerald-700 font-semibold">
                            <td className="p-2.5 border-r border-slate-700 text-center">7</td>
                            <td className="p-2.5 border-r border-slate-700" colSpan={2}>
                              Less: Rebate under section 87A (Income eligible for full tax rebate)
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold">
                              (−) ₹{taxResult.rebate87A.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        )}

                        {/* 8. Health & Education Cess */}
                        <tr>
                          <td className="p-2.5 border-r border-slate-700 text-center">8</td>
                          <td className="p-2.5 border-r border-slate-700" colSpan={2}>
                            Add: Health and Education Cess @ 4%
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                            (+) ₹{taxResult.cess.toLocaleString('en-IN')}
                          </td>
                        </tr>

                        {/* 9. Final Annual Tax Liability */}
                        <tr className="bg-slate-900 text-white font-extrabold text-sm">
                          <td className="p-3 border-r border-slate-700 text-center">9</td>
                          <td className="p-3 border-r border-slate-700 uppercase" colSpan={2}>
                            Total Annual Tax Liability Payable
                          </td>
                          <td className="p-3 text-right font-mono font-black text-emerald-400 text-base">
                            ₹{taxResult.netAnnualTax.toLocaleString('en-IN')}
                          </td>
                        </tr>

                        {/* 10. Monthly TDS Deduction */}
                        <tr className="bg-emerald-50 text-emerald-950 font-bold">
                          <td className="p-3 border-r border-slate-700 text-center">10</td>
                          <td className="p-3 border-r border-slate-700" colSpan={2}>
                            Monthly TDS Applicable to Payroll (Annual Tax ÷ 12)
                          </td>
                          <td className="p-3 text-right font-mono font-black text-emerald-700 text-base">
                            ₹{taxResult.netMonthlyTDS.toLocaleString('en-IN')} / mo
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Verification Note & Footer */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700">
                    <p className="font-bold text-slate-900">Verification & Certification:</p>
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      I, in capacity of Principal Payroll Officer for <strong>{companyName || "Code Vamp Tech"}</strong>, hereby certify that a sum of <strong>₹{taxResult.netAnnualTax.toLocaleString('en-IN')}</strong> is the calculated annual tax liability on the gross earnings of <strong>{emp?.fullName || getEmployeeName(activeSlip.employeeId)}</strong> for Assessment Year 2026-27 under the selected tax regime.
                    </p>
                    <p className="text-[10px] text-slate-400 italic pt-1">
                      ** This is a digitally generated Form 16 Part-B computation sheet valid for employee records and IT return filing.
                    </p>
                  </div>

                  {/* Bottom Switch Action */}
                  <div className="pt-2 flex justify-end print:hidden">
                    <button
                      onClick={() => setSlipModalTab("payslip")}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl border border-emerald-200 transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Switch to View Monthly Payslip</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        );
      })()}
      {/* Tax Profile Modal */}
      {taxProfileEmp && (
        <TaxProfileModal
          employee={taxProfileEmp}
          config={config}
          defaultRegime={config?.defaultTaxRegime ?? "new"}
          onClose={() => setTaxProfileEmp(null)}
          onSave={async (empId, taxProfile) => {
            if (onUpdateEmployee) {
              const emp = employees.find(e => e.id === empId);
              if (emp) {
                await onUpdateEmployee(empId, {
                  salary: { ...emp.salary, taxProfile },
                });
              }
            }
          }}
        />
      )}
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
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-gray-300">Provident Fund (PF) Rule</label>
                    <button
                      type="button"
                      onClick={() => setEditPfMode(editPfMode === "exempt" ? "percentage" : "exempt")}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold cursor-pointer transition-all ${editPfMode === "exempt" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"}`}
                    >
                      {editPfMode === "exempt" ? "✕ Opted OUT (PF Exempt)" : "✓ Opted IN (PF Active)"}
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setEditPfMode("percentage")}
                      className={`py-1.5 px-1.5 rounded-lg border font-bold text-[10px] transition-all cursor-pointer ${editPfMode === "percentage" ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" : "bg-white dark:bg-[#1a1a1a] text-slate-600 dark:text-gray-300 border-slate-200 dark:border-[#252525]"}`}
                    >
                      12% Basic
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPfMode("fixed_1800")}
                      className={`py-1.5 px-1.5 rounded-lg border font-bold text-[10px] transition-all cursor-pointer ${editPfMode === "fixed_1800" ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" : "bg-white dark:bg-[#1a1a1a] text-slate-600 dark:text-gray-300 border-slate-200 dark:border-[#252525]"}`}
                    >
                      Fixed ₹1.8k
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPfMode("custom")}
                      className={`py-1.5 px-1.5 rounded-lg border font-bold text-[10px] transition-all cursor-pointer ${editPfMode === "custom" ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" : "bg-white dark:bg-[#1a1a1a] text-slate-600 dark:text-gray-300 border-slate-200 dark:border-[#252525]"}`}
                    >
                      Custom ₹
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPfMode("exempt")}
                      className={`py-1.5 px-1.5 rounded-lg border font-bold text-[10px] transition-all cursor-pointer ${editPfMode === "exempt" ? "bg-amber-600 text-white border-amber-600 shadow-xs" : "bg-white dark:bg-[#1a1a1a] text-slate-600 dark:text-gray-300 border-slate-200 dark:border-[#252525]"}`}
                    >
                      Exempt (₹0)
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
                    <div className="flex items-center space-x-2">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-gray-300">Income Tax (TDS) Status</label>
                      <button
                        type="button"
                        onClick={() => {
                          const emp = editingEmpForSalary;
                          setEditingEmpForSalary(null);
                          setTaxProfileEmp(emp);
                        }}
                        className="text-[10px] text-violet-600 dark:text-violet-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        title="Configure Regime, HRA, 80C, etc."
                      >
                        <Calculator className="w-3 h-3" />
                        <span>Configure Tax Profile</span>
                      </button>
                    </div>
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
                          {config?.taxType === "slab" ? "Auto Tax Slab (FY 2025-26)" : `${config?.taxValue || 5}% of Gross`}
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
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-gray-300">ESI Deduction Rule</label>
                      <span className="text-[10px] text-slate-400 block">Exempt if Monthly Gross &gt; ₹21,000</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditEsiOptIn(!editEsiOptIn)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold cursor-pointer transition-all ${editEsiOptIn ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}
                    >
                      {editEsiOptIn ? "✓ Opted IN (ESI Active)" : "✕ Opted OUT (ESI Exempt)"}
                    </button>
                  </div>
                  {editEsiOptIn && (
                    <div className="space-y-1.5 pt-1">
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setEditEsiMode("auto")}
                          className={`py-1 px-2 rounded-lg border font-bold text-[10px] transition-all cursor-pointer ${editEsiMode === "auto" ? "bg-blue-600 text-white border-blue-600 shadow-xs" : "bg-white dark:bg-[#1a1a1a] text-slate-600 dark:text-gray-300 border-slate-200 dark:border-[#252525]"}`}
                        >
                          Auto Rule ({config?.esiRatePercentage || 0.75}%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditEsiMode("custom")}
                          className={`py-1 px-2 rounded-lg border font-bold text-[10px] transition-all cursor-pointer ${editEsiMode === "custom" ? "bg-blue-600 text-white border-blue-600 shadow-xs" : "bg-white dark:bg-[#1a1a1a] text-slate-600 dark:text-gray-300 border-slate-200 dark:border-[#252525]"}`}
                        >
                          Manual Amount (₹)
                        </button>
                      </div>
                      {editEsiMode === "custom" && (
                        <input
                          type="number"
                          min="0"
                          value={editEsiCustom}
                          onChange={e => setEditEsiCustom(e.target.value)}
                          placeholder="Enter manual ESI deduction amount (INR)"
                          className="w-full bg-white dark:bg-[#151515] text-slate-800 dark:text-gray-100 p-2 text-xs rounded-lg border border-slate-200 dark:border-[#2a2a2a] font-mono font-bold"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Live Gross & Net Pay preview box */}
                {(() => {
                  const basic = editingEmpForSalary.salary?.basic || 0;
                  // Always compute HRA from config (same as the table), never from stale stored value
                  const hra = config?.hraType === "percentage"
                    ? Math.round(basic * ((config?.hraValue || 0) / 100))
                    : (config?.hraValue || 0);
                  const tel = Number(editTel) || 0;
                  const fuel = Number(editFuel) || 0;
                  const profDev = Number(editProfDev) || 0;
                  const lta = Number(editLta) || 0;
                  const spAllow = Number(editSpAllow) || 0;
                  const gross = basic + hra + tel + fuel + profDev + lta + spAllow;

                  let pf = 0;
                  if (editPfMode === "exempt") pf = 0;
                  else if (editPfMode === "fixed_1800") pf = 1800;
                  else if (editPfMode === "custom") pf = Number(editPfCustom) || 0;
                  else pf = Math.round(basic * ((config?.pfValue || 12) / 100));

                  let tds = 0;
                  if (editTdsOptIn) {
                    if (editTdsMode === "custom") tds = Number(editTdsCustom) || 0;
                    else {
                      tds = computeMonthlyTDSFromEmployee(
                        {
                          basic, hra, telephone: tel, fuel, professionalDev: profDev, lta, allowances: spAllow,
                          pfDeduction: pf, tdsOptIn: true,
                          taxProfile: editingEmpForSalary.salary?.taxProfile as any,
                        },
                        config?.taxType || "percentage",
                        config?.taxValue ?? 5
                      );
                    }
                  }

                  let esi = 0;
                  if (editEsiOptIn) {
                    if (editEsiMode === "custom" && editEsiCustom !== "") esi = Number(editEsiCustom) || 0;
                    else {
                      const esiGrossCeiling = config?.esiGrossCeiling ?? 21000;
                      if (esiGrossCeiling <= 0 || gross <= esiGrossCeiling) esi = Math.round(gross * ((config?.esiRatePercentage || 0.75) / 100));
                    }
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

      {/* Multi-Document Viewer & Gallery Management Modal */}
      {viewDocModal && (() => {
        const latestSlip = payslips.find(
          p => p.id === viewDocModal.payslip.id || (p.employeeId === viewDocModal.payslip.employeeId && p.month === viewDocModal.payslip.month)
        ) || viewDocModal.payslip;

        const allDocs = (latestSlip.documents && latestSlip.documents.length > 0)
          ? latestSlip.documents
          : (latestSlip.documentUrl ? [{
              id: "doc-1",
              name: latestSlip.documentName || "Payroll Document",
              url: latestSlip.documentUrl,
              uploadedAt: latestSlip.documentUploadedAt || "",
              uploadedBy: latestSlip.documentUploadedBy || "Admin"
            }] : []);

        const safeActiveIndex = activeDocIndex < allDocs.length ? activeDocIndex : 0;
        const currentDoc = allDocs[safeActiveIndex] || allDocs[0];
        const isCurrentPdf = currentDoc ? isPdf(currentDoc.url, currentDoc.name) : false;

        return (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#1a1a1a] rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-[#1a1a1a] shrink-0 bg-slate-50/80 dark:bg-[#121212]/80">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    {isCurrentPdf ? (
                      <FileText className="w-5 h-5 text-rose-500" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-slate-800 dark:text-white text-sm sm:text-base truncate">
                      {currentDoc?.name || "Attached Payroll Document"}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono truncate">
                      {viewDocModal.employeeName} ({viewDocModal.empCode}) · {latestSlip.month}
                      {currentDoc?.uploadedBy && ` · Uploaded by: ${currentDoc.uploadedBy}`}
                      {allDocs.length > 1 && ` · Showing ${safeActiveIndex + 1} of ${allDocs.length} documents`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {currentDoc?.url && (
                    <>
                      <button
                        onClick={() => handleDownloadFile(currentDoc.url, currentDoc.name || "payroll_document")}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all shadow-xs"
                        title="Download Active Document"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Download</span>
                      </button>
                      {allDocs.length > 1 && (
                        <button
                          onClick={() => handleDownloadAllFiles(allDocs)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all shadow-xs hidden sm:flex"
                          title="Download All Attached Documents"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download All ({allDocs.length})</span>
                        </button>
                      )}
                      <a
                        href={currentDoc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1a1a1a] dark:hover:bg-[#252525] text-slate-600 dark:text-gray-300 transition-colors"
                        title="Open file in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </>
                  )}

                  <button
                    onClick={() => setViewDocModal(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Multi-Document Gallery Selector Tabs (Always visible if 1 or more docs) */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100/80 dark:bg-[#151515] border-b border-slate-200/80 dark:border-[#222] overflow-x-auto shrink-0">
                <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 mr-1 shrink-0">
                  Attached Documents ({allDocs.length}):
                </span>
                {allDocs.map((doc, idx) => {
                  const isPdfDoc = isPdf(doc.url, doc.name);
                  const isSelected = safeActiveIndex === idx;
                  return (
                    <button
                      key={doc.id || idx}
                      onClick={() => setActiveDocIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer transition-all border shrink-0 ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/30"
                          : "bg-white dark:bg-[#1e1e1e] text-slate-700 dark:text-gray-300 border-slate-200 dark:border-[#2c2c2c] hover:bg-slate-50 dark:hover:bg-[#282828]"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                        isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-[#2a2a2a] text-slate-500"
                      }`}>
                        {idx + 1}
                      </span>
                      {isPdfDoc ? (
                        <FileText className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-rose-500"}`} />
                      ) : (
                        <ImageIcon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-blue-500"}`} />
                      )}
                      <span className="truncate max-w-[140px]">{doc.name}</span>
                    </button>
                  );
                })}

                {(role === "admin" || role === "hr") && onUploadPayrollDocument && (
                  <button
                    onClick={() => {
                      const targetEmp = employees.find(e => e.id === latestSlip.employeeId);
                      if (targetEmp) {
                        setUploadModalEmp({ emp: targetEmp, payslip: latestSlip });
                        setUploadDocFiles([]);
                        setUploadDocError("");
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-dashed border-blue-400/80 dark:border-blue-500/60 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-bold flex items-center space-x-1 cursor-pointer transition-all shrink-0 ml-1"
                    title="Upload and attach more documents for this employee"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>+ Add More</span>
                  </button>
                )}
              </div>

              {/* Document Content View Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-100 dark:bg-[#070707] flex items-center justify-center min-h-[400px]">
                {currentDoc?.url ? (
                  isCurrentPdf ? (
                    <div className="w-full h-full flex flex-col space-y-2">
                      <div className="flex items-center justify-between px-2 text-[11px] text-slate-500">
                        <span>Previewing: <strong className="text-slate-700 dark:text-gray-300">{currentDoc.name}</strong></span>
                        <a
                          href={currentDoc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center space-x-1"
                        >
                          <span>Open in Full Tab</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <iframe
                        src={currentDoc.url}
                        className="w-full h-[62vh] rounded-xl border border-slate-200 dark:border-[#202020] bg-white shadow-xs"
                        title="PDF Document Preview"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center max-w-full">
                      <img
                        src={currentDoc.url}
                        alt={currentDoc.name || "Document Image"}
                        className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-200 dark:border-[#202020] bg-white dark:bg-[#121212]"
                      />
                    </div>
                  )
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-gray-600" />
                    <p className="text-sm font-semibold">No document preview available.</p>
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-100 dark:border-[#1a1a1a] bg-white dark:bg-[#0f0f0f] shrink-0">
                <div className="text-slate-400 text-xs font-mono">
                  {currentDoc?.uploadedAt && (
                    <span>Uploaded on: {new Date(currentDoc.uploadedAt).toLocaleString("en-IN")}</span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {(role === "admin" || role === "hr") && onUploadPayrollDocument && (
                    <button
                      onClick={() => {
                        const targetEmp = employees.find(e => e.id === latestSlip.employeeId);
                        if (targetEmp) {
                          setUploadModalEmp({ emp: targetEmp, payslip: latestSlip });
                          setUploadDocFiles([]);
                          setUploadDocError("");
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#2a2a2a] text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
                      title="Upload additional or replacement documents"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-500" />
                      <span>+ Add More Documents</span>
                    </button>
                  )}

                  {(role === "admin" || role === "hr") && onDeletePayrollDocument && currentDoc && (
                    <button
                      onClick={() => handleDeleteAttachedDoc(latestSlip, currentDoc.id)}
                      disabled={isDeletingDoc}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors disabled:opacity-50"
                      title="Delete this document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isDeletingDoc ? "Deleting..." : "Delete This Doc"}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setViewDocModal(null)}
                    className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1a1a1a] dark:hover:bg-[#252525] text-slate-700 dark:text-gray-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Multi-Document Upload Modal (Rendered on top with z-[70]) */}
      {uploadModalEmp && (
        <div className="fixed inset-0 bg-black/75 z-[70] flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#1a1a1a] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-[#1a1a1a] shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-800 dark:text-white text-sm">
                    Upload Payroll Document(s)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {uploadModalEmp.emp.fullName} ({getEmployeeCode(uploadModalEmp.emp)}) · {selectedMonth}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setUploadModalEmp(null);
                  setUploadDocFiles([]);
                  setUploadDocError("");
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Info Banner */}
              <div className="bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300 flex items-start space-x-2">
                <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  Upload <strong>1 or more documents</strong> (Salary slips, NEFT transfer receipts, incentive sheets, appraisal letters) in <strong>PDF or Image format (PNG, JPG, JPEG, WEBP)</strong>.
                </span>
              </div>

              {uploadDocError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadDocError}</span>
                </div>
              )}

              {/* Drag & Drop Zone */}
              <label className="block border-2 border-dashed border-slate-300 dark:border-[#2a2a2a] hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 rounded-2xl p-6 text-center cursor-pointer transition-all">
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/*,.png,.jpg,.jpeg,.webp,.svg"
                  onChange={e => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      setUploadDocFiles(prev => [...prev, ...Array.from(files)]);
                      setUploadDocError("");
                    }
                  }}
                  className="hidden"
                />
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-700 dark:text-gray-200">
                      Click or drag &amp; drop to choose file(s)
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Select 1 or multiple PDFs / Images (Max 25MB each)
                    </p>
                  </div>
                </div>
              </label>

              {/* Staged Files List */}
              {uploadDocFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-gray-300">
                    <span>Selected Files ({uploadDocFiles.length})</span>
                    <button
                      type="button"
                      onClick={() => setUploadDocFiles([])}
                      className="text-rose-500 hover:underline text-[11px] font-normal cursor-pointer"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {uploadDocFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-[#151515] border border-slate-200/80 dark:border-[#252525] rounded-xl text-xs"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            {isPdf(undefined, file.name) ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 dark:text-gray-100 truncate max-w-[240px]">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUploadDocFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-[#1a1a1a] bg-slate-50/50 dark:bg-[#121212]/50 shrink-0">
              <span className="text-[11px] text-slate-400 font-medium">
                {uploadDocFiles.length === 0
                  ? "No files selected"
                  : `${uploadDocFiles.length} file${uploadDocFiles.length > 1 ? "s" : ""} staged`}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setUploadModalEmp(null);
                    setUploadDocFiles([]);
                    setUploadDocError("");
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-[#1a1a1a] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={uploadDocFiles.length === 0 || isUploadingDoc}
                  onClick={handleExecuteUploadDoc}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {isUploadingDoc ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Upload {uploadDocFiles.length > 0 ? `${uploadDocFiles.length} Document${uploadDocFiles.length > 1 ? "s" : ""}` : "Documents"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
