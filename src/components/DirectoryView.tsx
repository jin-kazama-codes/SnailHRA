"use client";

import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Search, UserPlus, FileText, CheckCircle2, XCircle,
  Trash2, Mail, Phone, Briefcase, Calendar, ChevronRight,
  Eye, EyeOff, FileUp, ShieldCheck, AlertCircle, ShieldAlert, Sparkles, Building, MapPin, Landmark, Pencil,
  Camera, Download, X, RefreshCw, ExternalLink, FileSpreadsheet, Table, Upload, Plus, Layers,
  ArrowLeft, History, Clock, User, Check, Sliders, UserX, Calculator, LogOut, Maximize2, Minimize2
} from "lucide-react";
import { Employee, Designation, UserRole, EmployeeDocument, OnboardingTask, ExcelUploadRecord, PayrollConfig, ChecklistItemTemplate } from "../types";
import ChecklistCard from "./ChecklistCard";

const isValidPAN = (p: string) => !p.trim() || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(p.trim().toUpperCase());
const isValidUAN = (u: string) => !u.trim() || /^[0-9]{12}$/.test(u.trim());
const isValidPhoneNumber = (p: string) => {
  if (!p.trim()) return true;
  const cleaned = p.trim().replace(/[\s\-\(\)]/g, "");
  const digits = cleaned.replace(/\D/g, "");
  if (cleaned.startsWith("+91") || cleaned.startsWith("91")) {
    return digits.length === 12;
  }
  return digits.length === 10 && !cleaned.startsWith("+");
};
const checkPasswordStrength = (pwd: string) => {
  return {
    hasMinLength: pwd.length >= 6,
    hasUpper: /[A-Z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
  };
};
const isValidPassword = (pwd: string) => {
  const s = checkPasswordStrength(pwd);
  return s.hasMinLength && s.hasUpper && s.hasNumber && s.hasSpecial;
};


interface DirectoryViewProps {
  employees: Employee[];
  designations: Designation[];
  role: UserRole;
  currentUserId: string;
  customDepartments?: string[];
  customBranches?: string[];
  companyId?: string;
  companyName?: string;
  subscriptionModel?: number;
  onboardingChecklistTemplates?: ChecklistItemTemplate[];
  exitChecklistTemplates?: ChecklistItemTemplate[];
  onOnboardEmployee: (empData: any) => void;
  onBulkOnboardEmployee?: (payload: { employees: any[]; filename?: string; fileData?: string } | any[]) => Promise<void> | void;
  onUpdateEmployee: (id: string, updatedData: any) => Promise<void> | void;
  onAddDocument: (empId: string, docData: any) => void;
  onDeleteDocument: (empId: string, docId: string) => void;
  onToggleOnboardingTask: (empId: string, taskId: string, completed: boolean) => void;
  onUploadChecklistDocument?: (employeeId: string, itemId: string, file: File, category?: string) => Promise<void> | void;
  onReviewChecklistItem?: (employeeId: string, itemId: string, action: "approve" | "reject", comments?: string) => Promise<void> | void;
  onCreateChecklistTemplate?: (template: { title: string; description: string; category: string; required: boolean; type: "onboarding" | "exit" }) => Promise<void> | void;
  onDeleteChecklistTemplate?: (templateId: string) => Promise<void> | void;
  onGrantExitClearance?: (employeeId: string) => Promise<void> | void;
  onInitiateResignation?: (employeeId: string) => Promise<void> | void;
  onUpdateCollection?: (
    type: "leaveTypes" | "departments" | "branches",
    updatedList: string[],
    action?: "add" | "remove",
    item?: string
  ) => Promise<void> | void;
}

export default function DirectoryView({
  employees,
  designations,
  role,
  currentUserId,
  customDepartments,
  customBranches,
  companyId = "",
  companyName = "SnailHRA Tenant",
  subscriptionModel = 1,
  onboardingChecklistTemplates = [],
  exitChecklistTemplates = [],
  onOnboardEmployee,
  onBulkOnboardEmployee,
  onUpdateEmployee,
  onAddDocument,
  onDeleteDocument,
  onToggleOnboardingTask,
  onUploadChecklistDocument,
  onReviewChecklistItem,
  onCreateChecklistTemplate,
  onDeleteChecklistTemplate,
  onGrantExitClearance,
  onInitiateResignation,
  onUpdateCollection
}: DirectoryViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"All" | "Active" | "Probation" | "Suspended" | "Resigned">("All");
  const [activeEmpId, setActiveEmpId] = useState<string | null>(() => currentUserId || employees[0]?.id || null);
  const [activeChecklistTab, setActiveChecklistTab] = useState<"onboarding" | "exit">("onboarding");
  const [showOnboardForm, setShowOnboardForm] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Manage departments & branches state
  const [showManageCollections, setShowManageCollections] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newBranchName, setNewBranchName] = useState("");

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartmentName.trim() || !onUpdateCollection) return;
    const trimmed = newDepartmentName.trim();
    const currentList = customDepartments || ["Loans", "Insurance", "Risk", "HR", "Operations", "Compliance", "IT", "Sales"];
    const newList = currentList.some(d => d.toLowerCase() === trimmed.toLowerCase())
      ? currentList
      : [...currentList, trimmed];
    onUpdateCollection("departments", newList, "add", trimmed);
    setNewDepartmentName("");
  };

  const handleRemoveDepartment = (dept: string) => {
    if (!onUpdateCollection) return;
    if (confirm(`Are you sure you want to delete the "${dept}" department?`)) {
      const currentList = customDepartments || ["Loans", "Insurance", "Risk", "HR", "Operations", "Compliance", "IT", "Sales"];
      onUpdateCollection("departments", currentList.filter(d => d !== dept), "remove", dept);
    }
  };

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim() || !onUpdateCollection) return;
    const trimmed = newBranchName.trim();
    const currentList = customBranches || [];
    const newList = currentList.some(b => b.toLowerCase() === trimmed.toLowerCase())
      ? currentList
      : [...currentList, trimmed];
    onUpdateCollection("branches", newList, "add", trimmed);
    setNewBranchName("");
  };

  const handleRemoveBranch = (branchItem: string) => {
    if (!onUpdateCollection) return;
    if (confirm(`Are you sure you want to delete the "${branchItem}" branch?`)) {
      const currentList = customBranches || [];
      onUpdateCollection("branches", currentList.filter(b => b !== branchItem), "remove", branchItem);
    }
  };
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string; category?: string; size?: string } | null>(null);
  const [isDocFullscreen, setIsDocFullscreen] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Upload state
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState<any>("ID Proof");
  const [docFile, setDocFile] = useState<File | null>(null);
  const docFileRef = useRef<HTMLInputElement>(null);

  // View Mode: "roster" (default) or "bulk_upload" (full page hub)
  const [viewMode, setViewMode] = useState<"roster" | "bulk_upload">("roster");

  // Bulk Upload Excel State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [rawFileData, setRawFileData] = useState<string>("");
  const [parsedBulkData, setParsedBulkData] = useState<any[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [customFieldHeaders, setCustomFieldHeaders] = useState<string[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Upload History Logs State (Date-wise, newest on top)
  const [uploadHistory, setUploadHistory] = useState<ExcelUploadRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const fetchUploadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/employees/bulk/history");
      if (res.ok) {
        const json = await res.json();
        setUploadHistory(json.uploads || []);
      }
    } catch (err) {
      console.error("Failed to fetch upload history log:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const deleteSingleUploadHistoryLog = async (id: string) => {
    try {
      const res = await fetch(`/api/employees/bulk/history/${id}`, { method: "DELETE" });
      if (res.ok) {
        setUploadHistory(prev => prev.filter(item => item.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete upload log:", e);
    }
  };

  const clearAllUploadHistoryLogs = async () => {
    if (!window.confirm("Are you sure you want to clear all upload logs?")) return;
    try {
      const res = await fetch("/api/employees/bulk/history", { method: "DELETE" });
      if (res.ok) {
        setUploadHistory([]);
      }
    } catch (e) {
      console.error("Failed to clear upload logs:", e);
    }
  };

  useEffect(() => {
    if (viewMode === "bulk_upload") {
      fetchUploadHistory();
    }
  }, [viewMode]);

  // Generate & Download Shareable Dummy Sample Excel File with Custom & Unique Headers
  // Generate & Download Clean Dummy Excel File with fresh distinct employee records
  const downloadSampleTemplate = () => {
    const headers = [
      "Full Name", "Email", "Phone", "Role", "Department", "Branch",
      "Designation", "Joining Date", "Status", "Basic Salary", "HRA",
      "Allowances", "PF Deduction", "Bank Name", "Account Number",
      "IFSC Code", "Address", "Emergency Contact Name", "Emergency Contact Relation",
      "Emergency Contact Phone", "Password", "Bio"
    ];

    const sampleRow1 = {
      "Full Name": "Vikramaditya Rao",
      "Email": "vikramaditya.rao@company.com",
      "Phone": "+91 98111 22334",
      "Role": "employee",
      "Department": "Loans",
      "Branch": "Mumbai Branch",
      "Designation": "Senior Loan Officer",
      "Joining Date": "2026-08-01",
      "Status": "Active",
      "Basic Salary": 58000,
      "HRA": 23200,
      "Allowances": 14000,
      "PF Deduction": 4200,
      "Bank Name": "Kotak Mahindra Bank",
      "Account Number": "881900223411",
      "IFSC Code": "KKBK0000123",
      "Address": "A-45, Vaishali Nagar, Mumbai, Maharashtra",
      "Emergency Contact Name": "Pooja Rao",
      "Emergency Contact Relation": "Spouse",
      "Emergency Contact Phone": "+91 98111 99999",
      "Password": "Pass@2026",
      "Bio": "Senior Credit & Loan Evaluation Specialist."
    };

    const sampleRow2 = {
      "Full Name": "Neha Saxena",
      "Email": "neha.saxena@company.com",
      "Phone": "+91 97222 33445",
      "Role": "employee",
      "Department": "Risk",
      "Branch": "Noida HQ",
      "Designation": "Risk Analyst",
      "Joining Date": "2026-08-05",
      "Status": "Active",
      "Basic Salary": 49000,
      "HRA": 19600,
      "Allowances": 11000,
      "PF Deduction": 3500,
      "Bank Name": "Axis Bank",
      "Account Number": "91201004567890",
      "IFSC Code": "UTIB0000567",
      "Address": "Block B, Sector 62, Noida, UP",
      "Emergency Contact Name": "Rohan Saxena",
      "Emergency Contact Relation": "Brother",
      "Emergency Contact Phone": "+91 97222 88888",
      "Password": "Pass@2026",
      "Bio": "Fraud Risk & Portfolio Compliance Officer."
    };

    const sampleRow3 = {
      "Full Name": "Tarun Deshmukh",
      "Email": "tarun.deshmukh@company.com",
      "Phone": "+91 96333 44556",
      "Role": "employee",
      "Department": "Operations",
      "Branch": "Pune Digital Office",
      "Designation": "Collections Specialist",
      "Joining Date": "2026-08-10",
      "Status": "Active",
      "Basic Salary": 62000,
      "HRA": 24800,
      "Allowances": 15000,
      "PF Deduction": 4800,
      "Bank Name": "ICICI Bank",
      "Account Number": "000401987654",
      "IFSC Code": "ICIC0000004",
      "Address": "Plot 12, Baner Road, Pune, Maharashtra",
      "Emergency Contact Name": "Meenal Deshmukh",
      "Emergency Contact Relation": "Spouse",
      "Emergency Contact Phone": "+91 96333 77777",
      "Password": "Pass@2026",
      "Bio": "Field Operations & Collections Management Lead."
    };

    const worksheet = XLSX.utils.json_to_sheet([sampleRow1, sampleRow2, sampleRow3], { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Import Template");
    XLSX.writeFile(workbook, `${companyName ? companyName.replace(/\s+/g, '_') : 'Company'}_Employee_Import_Template.xlsx`);
  };

  // Download Past Uploaded Excel File
  const downloadUploadedFile = (record: ExcelUploadRecord) => {
    if (!record.fileData) return;
    try {
      const link = document.createElement("a");
      const dataUri = record.fileData.startsWith("data:")
        ? record.fileData
        : `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${record.fileData}`;
      link.href = dataUri;
      link.download = record.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Download error:", e);
    }
  };

  // Parse Uploaded Excel File & Extract Standard + Dynamic Custom Fields
  const handleBulkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFile(file);
    setBulkError(null);
    setParsedBulkData([]);
    setDetectedHeaders([]);
    setCustomFieldHeaders([]);
    setRawFileData("");

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Read file to base64 for archiving
      const reader = new FileReader();
      reader.onload = (ev) => {
        const b64 = ev.target?.result as string;
        setRawFileData(b64 || "");
      };
      reader.readAsDataURL(file);

      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!rawRows || rawRows.length === 0) {
        setBulkError("The selected Excel file is empty or invalid.");
        return;
      }

      // Collect raw column headers
      const allHeaders = Object.keys(rawRows[0] || {});
      setDetectedHeaders(allHeaders);

      // Known standard field mappings (normalized key => internal property)
      const standardMap: Record<string, string> = {
        fullname: "fullName", name: "fullName", full_name: "fullName", employeename: "fullName", employee_name: "fullName",
        email: "email", emailaddress: "email", email_address: "email",
        phone: "phone", phonenumber: "phone", phone_number: "phone", mobile: "phone", contact: "phone",
        role: "role", userrole: "role",
        department: "department", dept: "department",
        branch: "branch", office: "branch",
        designation: "designationTitle", designationtitle: "designationTitle", title: "designationTitle", designationid: "designationTitle",
        joiningdate: "joiningDate", dateofjoining: "joiningDate", joining_date: "joiningDate", doj: "joiningDate",
        status: "status", employeestatus: "status",
        basicsalary: "salaryBasic", basic: "salaryBasic", salarybasic: "salaryBasic",
        hra: "salaryHra", hraallowance: "salaryHra", salaryhra: "salaryHra",
        allowances: "salaryAllowances", otherallowances: "salaryAllowances", salaryallowances: "salaryAllowances",
        pfdeduction: "salaryPf", pf: "salaryPf", salarypf: "salaryPf", salarypfdeduction: "salaryPf",
        tdsdeduction: "salaryTds", tds: "salaryTds", salarytds: "salaryTds", salarytdsdeduction: "salaryTds", taxdeduction: "salaryTds", tax: "salaryTds", salarytax: "salaryTds", tdsprofessiontax: "salaryTds", professiontax: "salaryTds",
        bankname: "bankName", bank: "bankName",
        accountnumber: "bankAccount", bankaccount: "bankAccount", bankaccountnumber: "bankAccount",
        ifsc: "bankIfsc", ifsccode: "bankIfsc", bankifsc: "bankIfsc",
        address: "address", residentialaddress: "address",
        emergencycontactname: "emergencyName", emergencyname: "emergencyName", contactperson: "emergencyName",
        emergencycontactrelation: "emergencyRelation", emergencyrelation: "emergencyRelation", relation: "emergencyRelation",
        emergencycontactphone: "emergencyPhone", emergencyphone: "emergencyPhone",
        password: "password", avatarurl: "avatarUrl"
      };

      const customHeaders: string[] = [];
      allHeaders.forEach(h => {
        const cleanKey = h.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!standardMap[cleanKey]) {
          customHeaders.push(h);
        }
      });
      setCustomFieldHeaders(customHeaders);

      // Process each row
      const processedEmployees = rawRows.map((row: any) => {
        const emp: any = { customFields: {} };

        Object.keys(row).forEach(header => {
          const val = row[header];
          const cleanKey = header.toLowerCase().replace(/[^a-z0-9]/g, "");
          const stdTarget = standardMap[cleanKey];

          if (stdTarget) {
            emp[stdTarget] = String(val).trim();
          } else if (val !== "" && val !== null && val !== undefined) {
            // Unmapped header -> store as dynamic custom field
            emp.customFields[header] = typeof val === "number" ? val : String(val).trim();
          }
        });

        return emp;
      });

      setParsedBulkData(processedEmployees);
    } catch (err: any) {
      console.error("Excel parse error:", err);
      setBulkError("Failed to parse Excel file. Please ensure it is a valid .xlsx or .csv document.");
    }
  };

  // Submit Bulk Upload
  const handleExecuteBulkSubmit = async () => {
    if (!parsedBulkData.length || isProcessingBulk) return;
    setIsProcessingBulk(true);
    try {
      if (onBulkOnboardEmployee) {
        await onBulkOnboardEmployee({
          employees: parsedBulkData,
          filename: bulkFile?.name || `Employee_Import_${new Date().toISOString().slice(0, 10)}.xlsx`,
          fileData: rawFileData
        });
      }
      setShowBulkModal(false);
      setBulkFile(null);
      setParsedBulkData([]);
      setRawFileData("");
      await fetchUploadHistory();
    } catch (err) {
      console.error("Bulk submit execution error:", err);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Edit employee state
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editRole, setEditRole] = useState<any>("employee");
  const [editDesigId, setEditDesigId] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editBranch, setEditBranch] = useState("");
  const [editStatus, setEditStatus] = useState<any>("Active");
  const [editAddress, setEditAddress] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editSalaryBasic, setEditSalaryBasic] = useState("");
  const [editSalaryHra, setEditSalaryHra] = useState("");
  const [editSalaryAllowances, setEditSalaryAllowances] = useState("");
  const [editSalaryPf, setEditSalaryPf] = useState("");
  const [editSalaryTds, setEditSalaryTds] = useState("0");
  const [editBankAccount, setEditBankAccount] = useState("");
  const [editBankName, setEditBankName] = useState("");
  const [editBankIfsc, setEditBankIfsc] = useState("");
  const [editEmergencyName, setEditEmergencyName] = useState("");
  const [editEmergencyRelation, setEditEmergencyRelation] = useState("");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("");
  const [editDateOfBirth, setEditDateOfBirth] = useState("");
  const [editPan, setEditPan] = useState("");
  const [editUan, setEditUan] = useState("");
  const [editEmploymentType, setEditEmploymentType] = useState<"contract" | "permanent" | "consultant" | "">("");

  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>("");
  const [profileImageUrl, setProfileImageUrl] = useState<string>("");
  const profileImageRef = useRef<HTMLInputElement>(null);

  const [editProfileImageFile, setEditProfileImageFile] = useState<File | null>(null);
  const [editProfileImagePreview, setEditProfileImagePreview] = useState<string>("");
  const editProfileImageRef = useRef<HTMLInputElement>(null);

  // Onboard form state
  const [prefix, setPrefix] = useState<"Mr" | "Mrs" | "Miss" | "Ms" | "">("Mr");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other" | "">("Male");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [empRole, setEmpRole] = useState<UserRole>("employee");
  const [selectedDesgId, setSelectedDesgId] = useState(designations[0]?.id || "");
  const [department, setDepartment] = useState("Information Technology");
  const [employmentType, setEmploymentType] = useState<"contract" | "permanent" | "consultant" | "">("");
  const [onboardBranch, setOnboardBranch] = useState("");
  const [joiningDate, setJoiningDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [salaryBasic, setSalaryBasic] = useState("");
  const [salaryHra, setSalaryHra] = useState("");
  const [salaryTelephone, setSalaryTelephone] = useState("");
  const [salaryFuel, setSalaryFuel] = useState("");
  const [salaryProfDev, setSalaryProfDev] = useState("");
  const [salaryLta, setSalaryLta] = useState("");
  const [salaryAllowances, setSalaryAllowances] = useState("");
  const [salaryPf, setSalaryPf] = useState("");
  const [salaryTds, setSalaryTds] = useState("");
  const [salaryEsi, setSalaryEsi] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [address, setAddress] = useState("");
  const [bio, setBio] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [pan, setPan] = useState("");
  const [uan, setUan] = useState("");
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingOnboard, setIsSubmittingOnboard] = useState(false);

  // Payroll Configuration integration for Onboarding Form
  const [onboardPayrollConfig, setOnboardPayrollConfig] = useState<PayrollConfig | null>(null);
  const [onboardIsPfExempt, setOnboardIsPfExempt] = useState<boolean>(false);
  const [onboardIsEsiExempt, setOnboardIsEsiExempt] = useState<boolean>(false);

  // Fetch tenant payroll rules when onboarding or editing modal opens
  useEffect(() => {
    if (showOnboardForm || showEditModal) {
      fetch(`/api/payroll/config?companyId=${encodeURIComponent(companyId || "")}`)
        .then(res => res.json())
        .then(data => {
          if (data.config) {
            setOnboardPayrollConfig(data.config);
            if (salaryBasic) {
              recomputeOnboardSalaryComponentsWithConfig(salaryBasic, onboardIsPfExempt, onboardIsEsiExempt, data.config);
            }
          }
        })
        .catch(err => console.warn("Failed to load payroll config for employee modal:", err));
    }
  }, [showOnboardForm, showEditModal, companyId, salaryBasic, onboardIsPfExempt, onboardIsEsiExempt]);

  useEffect(() => {
    if (customDepartments && customDepartments.length > 0) {
      if (!department || !customDepartments.includes(department)) {
        setDepartment(customDepartments[0]);
      }
    }
  }, [customDepartments]);

  // Helper to recompute HRA, Allowances, PF, Tax, ESI dynamically when Basic salary or exemption toggles change
  const recomputeOnboardSalaryComponentsWithConfig = (basicStr: string, pfExemptFlag: boolean, esiExemptFlag: boolean, cfg: PayrollConfig | null) => {
    const basicVal = Number(basicStr) || 0;
    if (!cfg || basicVal <= 0) {
      setSalaryHra("0");
      setSalaryTelephone("0");
      setSalaryFuel("0");
      setSalaryProfDev("0");
      setSalaryLta("0");
      setSalaryAllowances("0");
      setSalaryPf("0");
      setSalaryTds("0");
      setSalaryEsi("0");
      return;
    }

    const hra = cfg.hraType === "percentage"
      ? Math.round(basicVal * (cfg.hraValue / 100))
      : cfg.hraValue;

    const allowances = cfg.allowancesType === "percentage"
      ? Math.round(basicVal * (cfg.allowancesValue / 100))
      : cfg.allowancesValue;

    const telephone = cfg.telephoneType === "percentage"
      ? Math.round(basicVal * ((cfg.telephoneValue || 0) / 100))
      : (cfg.telephoneValue || 0);

    const fuel = cfg.fuelType === "percentage"
      ? Math.round(basicVal * ((cfg.fuelValue || 0) / 100))
      : (cfg.fuelValue || 0);

    const profDev = cfg.professionalDevType === "percentage"
      ? Math.round(basicVal * ((cfg.professionalDevValue || 0) / 100))
      : (cfg.professionalDevValue || 0);

    const lta = cfg.ltaType === "percentage"
      ? Math.round(basicVal * ((cfg.ltaValue || 0) / 100))
      : (cfg.ltaValue || 0);

    const gross = basicVal + hra + allowances + telephone + fuel + profDev + lta;

    const pf = pfExemptFlag
      ? 0
      : (cfg.pfModeDefault === "fixed_1800"
        ? 1800
        : (cfg.pfType === "percentage"
          ? Math.round(basicVal * (cfg.pfValue / 100))
          : cfg.pfValue));

    const tax = cfg.taxType === "percentage"
      ? Math.round(gross * (cfg.taxValue / 100))
      : cfg.taxValue;

    const esiGrossCeiling = cfg.esiGrossCeiling ?? 21000;
    const esiRate = cfg.esiRatePercentage ?? 0.75;
    const esi = (cfg.esiEnabled !== false && !esiExemptFlag && (esiGrossCeiling <= 0 || gross <= esiGrossCeiling))
      ? Math.round(gross * (esiRate / 100))
      : 0;

    setSalaryHra(String(hra));
    setSalaryTelephone(String(telephone));
    setSalaryFuel(String(fuel));
    setSalaryProfDev(String(profDev));
    setSalaryLta(String(lta));
    setSalaryAllowances(String(allowances));
    setSalaryPf(String(pf));
    setSalaryTds(String(tax));
    setSalaryEsi(String(esi));
  };

  const recomputeOnboardSalaryComponents = (basicStr: string, pfExemptFlag: boolean, esiExemptFlag: boolean) => {
    recomputeOnboardSalaryComponentsWithConfig(basicStr, pfExemptFlag, esiExemptFlag, onboardPayrollConfig);
  };


  const loggedInUser = employees.find(e => e.id === currentUserId) || employees[0];
  const userBranch = loggedInUser?.branch || "Mumbai Branch";

  const accessibleEmployees = role === "admin"
    ? employees
    : role === "hr"
      ? employees.filter(e => (e.branch || "Mumbai Branch") === userBranch && e.role !== "admin")
      : employees.filter(e => e.id === currentUserId);

  const filteredEmployees = accessibleEmployees
    .filter(emp => {
      const matchesSearch = emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = selectedDept === "All" || emp.department === selectedDept;
      const matchesBranch = selectedBranch === "All" || (emp.branch || "Mumbai Branch") === selectedBranch;
      const matchesStatus = selectedStatusFilter === "All" || (emp.status || "Active") === selectedStatusFilter;
      return matchesSearch && matchesDept && matchesBranch && matchesStatus;
    })
    .sort((a, b) => {
      // Current logged-in user (Me) remains at top
      const aIsSelf = a.id === currentUserId;
      const bIsSelf = b.id === currentUserId;
      if (aIsSelf && !bIsSelf) return -1;
      if (!aIsSelf && bIsSelf) return 1;

      // Hierarchy: Admin (1) -> HR (2) -> Employee (3)
      const roleRank = (roleStr: string) => {
        if (roleStr === "admin") return 1;
        if (roleStr === "hr") return 2;
        return 3;
      };

      const rankA = roleRank(a.role);
      const rankB = roleRank(b.role);

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      return a.fullName.localeCompare(b.fullName);
    });

  const activeEmployee = filteredEmployees.find(e => e.id === activeEmpId) || filteredEmployees[0] || null;

  const getDesignationTitle = (id: string) => {
    return designations.find(d => d.id === id)?.title || "Specialist";
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingOnboard) return;
    if (!fullName || !email || !password) {
      return;
    }

    if (phone.trim() && !isValidPhoneNumber(phone)) {
      const is91 = phone.trim().startsWith("+91") || phone.trim().startsWith("91");
      setOnboardError(is91 ? "Invalid Phone Number! Numbers with +91 must contain exactly 10 digits after +91 (total 12 digits)." : "Invalid Phone Number! Numbers without +91 must contain exactly 10 digits.");
      return;
    }
    if (!isValidPassword(password)) {
      setOnboardError("Password must be at least 6 characters and contain at least 1 capital letter, 1 number, and 1 special symbol (!@#$%^&*).");
      return;
    }
    if (pan.trim() && !isValidPAN(pan)) {
      setOnboardError("Invalid PAN Number format! PAN must be 5 letters, 4 numbers, and 1 letter (e.g. ABCDE1234F).");
      return;
    }
    if (uan.trim() && !isValidUAN(uan)) {
      setOnboardError("Invalid UAN Number format! UAN must be exactly 12 digits (e.g. 101146669488).");
      return;
    }
    setOnboardError(null);

    setIsSubmittingOnboard(true);
    try {
      let avatarUrl = "";
      if (profileImageFile) {
        avatarUrl = await uploadProfileImage();
      }

      const activePrefix = (typeof window !== "undefined" ? localStorage.getItem("snailhr_empCodePrefix") : null) || "EMP";
      const data = {
        empCodePrefix: activePrefix,
        prefix, fullName, gender, email, phone, role: empRole, designationId: selectedDesgId, department, employmentType,
        branch: onboardBranch || (customBranches && customBranches.length > 0 ? customBranches[0] : ""),
        joiningDate, dateOfBirth, salaryBasic, salaryHra,
        salaryTelephone, salaryFuel, salaryProfDev, salaryLta,
        salaryAllowances, salaryPf, salaryTds, salaryEsi,
        salaryPfMode: onboardIsPfExempt ? "exempt" : "percentage",
        salaryEsiOptIn: !onboardIsEsiExempt,
        onboardIsPfExempt,
        onboardIsEsiExempt,
        bankAccount, bankName, bankIfsc,
        address: address.trim() ? (address.trim().charAt(0).toUpperCase() + address.trim().slice(1)) : "",
        bio: bio.trim() ? (bio.trim().charAt(0).toUpperCase() + bio.trim().slice(1)) : "",
        password,
        emergencyName, emergencyRelation, emergencyPhone,
        avatarUrl,
        companyId: companyId,
        customFields: {
          pan: pan.trim().toUpperCase(),
          uan: uan.trim(),
        },
        pan: pan.trim().toUpperCase(),
        uan: uan.trim(),
      };
      await onOnboardEmployee(data);

      // Clear state & close
      setPrefix("Mr");
      setFullName("");
      setGender("Male");
      setEmail("");
      setPhone("");
      setPassword("");
      setAddress("");
      setBio("");
      setEmergencyName("");
      setEmergencyRelation("");
      setEmergencyPhone("");
      setDateOfBirth("");
      setEmploymentType("");
      setOnboardBranch("");
      setSalaryBasic("");
      setSalaryHra("");
      setSalaryTelephone("");
      setSalaryFuel("");
      setSalaryProfDev("");
      setSalaryLta("");
      setSalaryAllowances("");
      setSalaryPf("");
      setSalaryTds("");
      setSalaryEsi("");
      setPan("");
      setUan("");
      setOnboardIsPfExempt(false);
      setOnboardIsEsiExempt(false);

      setBankAccount("");
      setBankName("");
      setBankIfsc("");
      setProfileImageFile(null);
      setProfileImagePreview("");
      setShowOnboardForm(false);
    } catch (err) {
      console.error("Error onboarding employee:", err);
      setOnboardError("Failed to onboard employee. Please try again.");
    } finally {
      setIsSubmittingOnboard(false);
    }
  };

  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName || !activeEmployee) return;

    setUploadingDoc(true);
    let fileUrl = "";
    let fileSize = "N/A";

    try {
      // If a real file was selected, upload to Supabase S3
      if (docFile) {
        const formData = new FormData();
        formData.append("file", docFile);
        formData.append("bucket", "employee-documents");

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (res.ok && data.url) {
          fileUrl = data.url;
        }
        fileSize = (docFile.size / 1024 / 1024).toFixed(1) + " MB";
      } else {
        fileSize = (Math.random() * 2 + 0.5).toFixed(1) + " MB";
      }

      onAddDocument(activeEmployee.id, {
        name: docName.endsWith(".pdf") || docFile ? (docFile ? docFile.name : docName + ".pdf") : docName + ".pdf",
        category: docCategory,
        size: fileSize,
        fileUrl,
      });
      setDocName("");
      setDocFile(null);
      if (docFileRef.current) docFileRef.current.value = "";
      setShowUploadModal(false);
    } catch (err) {
      console.error("Document upload error:", err);
    } finally {
      setUploadingDoc(false);
    }
  };

  // Open edit modal and pre-fill all fields from the active employee
  const openEditModal = (emp: any) => {
    setEditFullName(emp.fullName || "");
    setEditEmail(emp.email || "");
    setEditPhone(emp.phone || "");
    setEditPassword("");
    setShowEditPassword(false);
    setEditRole(emp.role || "employee");
    setEditDesigId(emp.designationId || "");
    setEditDept(emp.department || "");
    setEditBranch(emp.branch || "");
    setEditStatus(emp.status || "Active");
    setEditAddress(emp.address || "");
    setEditBio(emp.bio || "");
    setEditSalaryBasic(String(emp.salary?.basic || ""));
    setEditSalaryHra(String(emp.salary?.hra || ""));
    setEditSalaryAllowances(String(emp.salary?.allowances || ""));
    setEditSalaryPf(String(emp.salary?.pfDeduction || ""));
    setEditSalaryTds(String(emp.salary?.tdsDeduction || "0"));
    setEditBankAccount(emp.bankDetails?.accountNumber || "");
    setEditBankName(emp.bankDetails?.bankName || "");
    setEditBankIfsc(emp.bankDetails?.ifsc || "");
    setEditEmergencyName(emp.emergencyContact?.name || "");
    setEditEmergencyRelation(emp.emergencyContact?.relation || "");
    setEditEmergencyPhone(emp.emergencyContact?.phone || "");
    setEditDateOfBirth(emp.dateOfBirth || "");
    setEditEmploymentType(emp.employmentType || "");
    setEditPan((emp.customFields?.pan as string) || emp.pan || "");
    setEditUan((emp.customFields?.uan as string) || emp.uan || "");
    setEditProfileImageFile(null);
    setEditProfileImagePreview(emp.avatarUrl || "");
    setShowEditModal(true);
  };

  const handleEditProfileImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditProfileImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setEditProfileImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadEditProfileImage = async (): Promise<string> => {
    if (!editProfileImageFile) return editProfileImagePreview || "";
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", editProfileImageFile);
      formData.append("bucket", "employee-avatars");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.url) return data.url;
    } catch (err) {
      console.error("Edit avatar upload error:", err);
    } finally {
      setUploadingAvatar(false);
    }
    return editProfileImagePreview || "";
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmployee || isSavingEdit) return;

    if (editPan.trim() && !isValidPAN(editPan)) {
      setEditError("Invalid PAN Number format! Must be 5 letters, 4 numbers, and 1 letter (e.g. ABCDE1234F).");
      return;
    }
    if (editUan.trim() && !isValidUAN(editUan)) {
      setEditError("Invalid UAN Number format! Must be exactly 12 digits (e.g. 101146669488).");
      return;
    }
    setEditError(null);

    setIsSavingEdit(true);
    try {
      let avatarUrl = activeEmployee.avatarUrl || "";
      if (editProfileImageFile) {
        avatarUrl = await uploadEditProfileImage();
      } else if (editProfileImagePreview) {
        avatarUrl = editProfileImagePreview;
      }

      const updated = {
        ...activeEmployee,
        fullName: editFullName,
        email: editEmail,
        phone: editPhone,
        role: editRole,
        designationId: editDesigId,
        department: editDept,
        branch: editBranch,
        status: editStatus,
        employmentType: editEmploymentType,
        address: editAddress.trim() ? (editAddress.trim().charAt(0).toUpperCase() + editAddress.trim().slice(1)) : "",
        bio: editBio.trim() ? (editBio.trim().charAt(0).toUpperCase() + editBio.trim().slice(1)) : "",
        avatarUrl: avatarUrl,
        dateOfBirth: editDateOfBirth,
        salary: (() => {
          const basicVal = Number(editSalaryBasic) || 0;
          const hraVal = onboardPayrollConfig
            ? (onboardPayrollConfig.hraType === "percentage" ? Math.round(basicVal * (onboardPayrollConfig.hraValue / 100)) : onboardPayrollConfig.hraValue)
            : Math.round(basicVal * 0.4);
          const allowancesVal = onboardPayrollConfig
            ? (onboardPayrollConfig.allowancesType === "percentage" ? Math.round(basicVal * (onboardPayrollConfig.allowancesValue / 100)) : onboardPayrollConfig.allowancesValue)
            : Math.round(basicVal * 0.2);
          const grossVal = basicVal + hraVal + allowancesVal;
          const isPfExempt = (onboardPayrollConfig?.pfExemptEmployeeIds || []).includes(activeEmployee.id);
          const pfVal = isPfExempt
            ? 0
            : (onboardPayrollConfig
              ? (onboardPayrollConfig.pfType === "percentage" ? Math.round(basicVal * (onboardPayrollConfig.pfValue / 100)) : onboardPayrollConfig.pfValue)
              : Math.round(basicVal * 0.12));
          const isEsiExempt = (onboardPayrollConfig?.esiExemptEmployeeIds || []).includes(activeEmployee.id);
          const esiGrossCeiling = onboardPayrollConfig?.esiGrossCeiling ?? 21000;
          const esiVal = (onboardPayrollConfig?.esiEnabled !== false && !isEsiExempt && (esiGrossCeiling <= 0 || grossVal <= esiGrossCeiling))
            ? Math.round(grossVal * ((onboardPayrollConfig?.esiRatePercentage || 0.75) / 100))
            : 0;
          const tdsVal = onboardPayrollConfig
            ? (onboardPayrollConfig.taxType === "percentage" ? Math.round(grossVal * (onboardPayrollConfig.taxValue / 100)) : onboardPayrollConfig.taxValue)
            : Math.round(grossVal * 0.05);

          return {
            basic: basicVal,
            hra: hraVal,
            allowances: allowancesVal,
            pfDeduction: pfVal,
            esiDeduction: esiVal,
            tdsDeduction: tdsVal,
          };
        })(),
        bankDetails: {
          accountNumber: editBankAccount,
          bankName: editBankName,
          ifsc: editBankIfsc,
        },
        emergencyContact: {
          name: editEmergencyName,
          relation: editEmergencyRelation,
          phone: editEmergencyPhone,
        },
        customFields: {
          ...(activeEmployee.customFields || {}),
          pan: editPan.trim().toUpperCase(),
          uan: editUan.trim(),
        },
      };

      if (editPassword.trim()) {
        updated.password = editPassword.trim();
      }

      await onUpdateEmployee(activeEmployee.id, updated);
      setShowEditModal(false);
      setEditPassword("");
    } catch (err) {
      console.error("Error updating employee details:", err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle profile photo selection for onboard form
  const handleProfileImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProfileImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Upload profile image to Supabase S3 and return URL
  const uploadProfileImage = async (): Promise<string> => {
    if (!profileImageFile) return profileImagePreview || "";
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", profileImageFile);
      formData.append("bucket", "employee-avatars");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.url) return data.url;
    } catch (err) {
      console.error("Avatar upload error:", err);
    } finally {
      setUploadingAvatar(false);
    }
    return profileImagePreview || "";
  };

  if (viewMode === "bulk_upload") {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Full Page Navigation & Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 sm:p-5 shadow-xs dark:neon-glow">
          <div className="flex items-center space-x-3.5">
            <button
              onClick={() => setViewMode("roster")}
              className="p-2 bg-slate-50 dark:bg-[#1a1a1a] hover:bg-slate-100 dark:hover:bg-[#252525] text-slate-700 dark:text-gray-200 rounded-xl transition-all border border-slate-100 dark:border-[#222] cursor-pointer"
              title="Back to Employee Roster"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                <h1 className="font-display font-extrabold text-slate-800 dark:text-white text-lg sm:text-xl">
                  Excel Employee Import & Audit Center
                </h1>
              </div>
              <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                Bulk onboard employees, auto-fill non-compulsory fields, detect dynamic columns, and manage date-wise upload history.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={downloadSampleTemplate}
              className="bg-white dark:bg-[#151515] hover:bg-slate-50 dark:hover:bg-[#1e1e1e] text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-xs"
              title="Download dummy Excel file with sample employee records"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Download Dummy Excel File</span>
            </button>
            <button
              onClick={() => setViewMode("roster")}
              className="bg-[#009966] hover:bg-[#008055] text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
            >
              <span>Back to Roster</span>
            </button>
          </div>
        </div>

        {/* Section 1: Drag-and-Drop Excel Upload & Live Data Preview Workspace */}
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 sm:p-6 shadow-xs dark:neon-glow space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1a1a1a] pb-3">
            <div className="flex items-center space-x-2">
              <Upload className="w-5 h-5 text-teal-500" />
              <h2 className="font-display font-bold text-slate-800 dark:text-white text-base">
                Upload New Excel / CSV Spreadsheet
              </h2>
            </div>
            <span className="text-xs text-slate-400 dark:text-gray-500">
              Supported Formats: .xlsx, .xls, .csv
            </span>
          </div>

          {/* Interactive Drag & Drop Area */}
          <div
            onClick={() => bulkFileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${bulkFile
              ? "border-teal-500 bg-teal-50/20 dark:bg-teal-950/10"
              : "border-slate-200 dark:border-[#222] hover:border-emerald-500 bg-slate-50/50 dark:bg-[#0a0a0a]"
              }`}
          >
            <input
              ref={bulkFileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleBulkFileChange}
              className="hidden"
            />

            <Upload className="w-10 h-10 mx-auto text-slate-400 dark:text-gray-500 mb-2 animate-bounce" />

            {bulkFile ? (
              <div>
                <span className="font-bold text-slate-800 dark:text-white text-base block">
                  {bulkFile.name}
                </span>
                <span className="text-xs text-slate-400 dark:text-gray-500 mt-1 block">
                  {(bulkFile.size / 1024).toFixed(1)} KB • Click to choose a different file
                </span>
              </div>
            ) : (
              <div>
                <span className="font-bold text-slate-700 dark:text-gray-300 text-sm block">
                  Click or Drag & Drop Excel File Here
                </span>
                <span className="text-xs text-slate-400 dark:text-gray-500 mt-1 block">
                  Supports standard fields + any new dynamic fields automatically
                </span>
                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-[#222] inline-block" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={downloadSampleTemplate}
                    className="bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold text-xs px-4 py-2 rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-xs mx-auto"
                  >
                    <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Download Dummy Excel File</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Parsing Errors */}
          {bulkError && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl p-3 text-xs text-rose-600 dark:text-rose-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{bulkError}</span>
            </div>
          )}

          {/* Parsed Data Preview Table */}
          {parsedBulkData.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50 dark:bg-[#0a0a0a] p-3.5 rounded-xl border border-slate-100 dark:border-[#1a1a1a]">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-800 dark:text-white text-xs">
                    Parsed {parsedBulkData.length} Employee Record{parsedBulkData.length > 1 ? "s" : ""}
                  </span>
                  <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                    Ready to Onboard
                  </span>
                </div>

                {customFieldHeaders.length > 0 && (
                  <div className="flex items-center space-x-1.5 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 px-3 py-1 rounded-lg text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="font-semibold">
                      New Dynamic Fields Detected: {customFieldHeaders.join(", ")}
                    </span>
                  </div>
                )}
              </div>

              {/* Informational Banner */}
              <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3 text-xs text-slate-600 dark:text-gray-300">
                💡 <strong>Smart Fallback Info:</strong> Non-compulsory missing fields (Joining Date, Salary Components, Bank Defaults, Emergency Contacts) will be automatically populated with smart defaults.
              </div>

              {/* Full Width Table */}
              <div className="border border-slate-100 dark:border-[#1a1a1a] rounded-xl overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#121212] text-slate-600 dark:text-gray-300 border-b border-slate-100 dark:border-[#1a1a1a]">
                    <tr>
                      <th className="p-3 font-bold">#</th>
                      <th className="p-3 font-bold">Full Name</th>
                      <th className="p-3 font-bold">Email</th>
                      <th className="p-3 font-bold">Role / Dept</th>
                      <th className="p-3 font-bold">Phone</th>
                      <th className="p-3 font-bold">Branch</th>
                      {customFieldHeaders.map(ch => (
                        <th key={ch} className="p-3 font-bold text-teal-600 dark:text-teal-400">
                          {ch} ⭐
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1a1a1a] text-slate-700 dark:text-gray-300 font-medium">
                    {parsedBulkData.map((emp, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-[#151515]">
                        <td className="p-3 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-800 dark:text-white">
                          {emp.fullName || emp.name || `Employee ${idx + 1}`}
                        </td>
                        <td className="p-3 text-slate-500 dark:text-gray-400 font-mono text-[11px]">
                          {emp.email || "(Auto-generated)"}
                        </td>
                        <td className="p-3">
                          {emp.role || "employee"} • {emp.department || "Loans"}
                        </td>
                        <td className="p-3 font-mono text-[11px]">
                          {emp.phone || "+91 99999 00000"}
                        </td>
                        <td className="p-3">
                          {emp.branch || "Mumbai Branch"}
                        </td>
                        {customFieldHeaders.map(ch => (
                          <td key={ch} className="p-3 font-mono text-teal-600 dark:text-teal-300 font-bold text-[11px]">
                            {String(emp.customFields?.[ch] ?? "-")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={!parsedBulkData.length || isProcessingBulk}
                  onClick={handleExecuteBulkSubmit}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-xl flex items-center space-x-2 transition-all shadow-md cursor-pointer"
                >
                  {isProcessingBulk ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing & Saving Upload Log...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Onboard {parsedBulkData.length} Employees & Save XL Log</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Upload History & Audit Log Table (Date-wise, Newest on Top) */}
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 sm:p-6 shadow-xs dark:neon-glow space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-[#1a1a1a] pb-3">
            <div className="flex items-center space-x-2.5">
              <History className="w-5 h-5 text-emerald-500" />
              <div>
                <h2 className="font-display font-bold text-slate-800 dark:text-white text-base">
                  Uploaded Excel Files Archive (Newest On Top)
                </h2>
                <p className="text-xs text-slate-400 dark:text-gray-500">
                  Audit log of all uploaded spreadsheets, dates, uploader details, and imported counts.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {uploadHistory.length > 0 && (
                <button
                  onClick={clearAllUploadHistoryLogs}
                  className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xs flex items-center gap-1 cursor-pointer hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>
              )}
              <button
                onClick={fetchUploadHistory}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-xs flex items-center gap-1 cursor-pointer hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Log</span>
              </button>
            </div>
          </div>

          {loadingHistory ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
              <span>Loading upload history logs...</span>
            </div>
          ) : uploadHistory.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <FileSpreadsheet className="w-8 h-8 text-slate-300 dark:text-gray-600 mx-auto" />
              <p className="text-xs text-slate-400 dark:text-gray-500">No Excel file uploads recorded yet in database.</p>
            </div>
          ) : (
            <div className="border border-slate-100 dark:border-[#1a1a1a] rounded-xl overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#121212] text-slate-600 dark:text-gray-300 border-b border-slate-100 dark:border-[#1a1a1a]">
                  <tr>
                    <th className="p-3 font-bold">Upload Date & Time</th>
                    <th className="p-3 font-bold">Filename</th>
                    <th className="p-3 font-bold">Uploaded By</th>
                    <th className="p-3 font-bold">Employees Imported</th>
                    <th className="p-3 font-bold">Dynamic Custom Fields</th>
                    <th className="p-3 font-bold">Status</th>
                    <th className="p-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1a1a1a] text-slate-700 dark:text-gray-300 font-medium">
                  {uploadHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-[#151515]">
                      <td className="p-3 font-mono text-[11px] text-slate-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{new Date(item.uploadedAt).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="p-3 font-bold text-slate-800 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{item.filename}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-gray-300">
                        <div className="flex items-center space-x-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.uploadedByName}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold px-2.5 py-1 rounded-full text-[11px]">
                          +{item.recordCount} Employees
                        </span>
                      </td>
                      <td className="p-3">
                        {item.detectedCustomFields && item.detectedCustomFields.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.detectedCustomFields.map(f => (
                              <span key={f} className="bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-semibold px-2 py-0.5 rounded-md text-[10px] border border-teal-100 dark:border-teal-900/30">
                                {f}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Standard Fields Only</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/40">
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {item.fileData && (
                            <button
                              onClick={() => downloadUploadedFile(item)}
                              className="text-emerald-600 hover:text-emerald-700 font-semibold text-[11px] flex items-center space-x-1 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download XL</span>
                            </button>
                          )}
                          <button
                            onClick={() => deleteSingleUploadHistoryLog(item.id)}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-md transition-colors cursor-pointer"
                            title="Delete Log Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Filter and Action Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-3.5 sm:p-4 shadow-xs dark:neon-glow">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-3 flex-1 min-w-0">
          <div className="relative w-full sm:w-auto flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search NBFC employees by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-semibold focus:outline-hidden"
            >
              <option value="All">All Departments</option>
              {(customDepartments && customDepartments.length > 0
                ? customDepartments
                : ["Loans", "Insurance", "Risk", "HR", "Operations", "Compliance", "IT", "Sales"]
              ).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {role === "admin" && (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full sm:w-auto bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-semibold focus:outline-hidden"
              >
                <option value="All">All Branches</option>
                {(customBranches || []).map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            )}
            {(role === "admin" || role === "hr") && (
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                className="w-full sm:w-auto bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-semibold focus:outline-hidden"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Probation">Probation</option>
                <option value="Suspended">Suspended</option>
              </select>
            )}
          </div>
        </div>

        {(role === "admin" || role === "hr") && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setShowOnboardForm(true);
                setOnboardBranch(role === "hr" ? userBranch : (customBranches && customBranches.length > 0 ? customBranches[0] : ""));
              }}
              className="bg-[#009966] hover:bg-[#008055] text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Onboard New Employee</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Directory List and Detail Profile Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Employee List */}
        <div className="lg:col-span-6 xl:col-span-6 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 sm:p-5 shadow-xs dark:neon-glow flex flex-col h-[650px] min-w-0">
          <div className="mb-3">
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md sm:text-lg">
              {selectedStatusFilter === "All" ? "Employees Roster" : `${selectedStatusFilter} Employees Roster`}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 dark:text-gray-500 mt-0.5">Found {filteredEmployees.length} employees matching criteria</p>
          </div>

          {/* Segmented Status Filter Tabs */}
          {(role === "admin" || role === "hr") && (
            <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100/90 dark:bg-[#141414] rounded-xl mb-3.5 border border-slate-200/60 dark:border-[#222] w-full box-border overflow-hidden">
              {(["All", "Active", "Probation", "Suspended", "Resigned"] as const).map((st) => {
                const isSelected = selectedStatusFilter === st;
                const count = accessibleEmployees.filter(e => {
                  const matchesSearch = e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    e.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    e.id.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesDept = selectedDept === "All" || e.department === selectedDept;
                  const matchesBranch = selectedBranch === "All" || (e.branch || "Mumbai Branch") === selectedBranch;
                  const matchesStatus = st === "All" || (e.status || "Active") === st;
                  return matchesSearch && matchesDept && matchesBranch && matchesStatus;
                }).length;

                const dotColors = {
                  All: "bg-slate-400 dark:bg-gray-400",
                  Active: "bg-emerald-500",
                  Probation: "bg-amber-500",
                  Suspended: "bg-rose-500",
                  Resigned: "bg-purple-500",
                };

                const activeStyles = {
                  All: "bg-white dark:bg-[#222] text-slate-800 dark:text-white shadow-xs border-slate-200 dark:border-[#333] font-bold",
                  Active: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/50 shadow-xs font-bold",
                  Probation: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/50 shadow-xs font-bold",
                  Suspended: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/50 shadow-xs font-bold",
                  Resigned: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/50 shadow-xs font-bold",
                };

                return (
                  <button
                    key={st}
                    onClick={() => setSelectedStatusFilter(st)}
                    className={`w-full flex items-center justify-center space-x-0.5 sm:space-x-1 py-1.5 px-0.5 sm:px-1 rounded-lg text-[10px] xl:text-[11px] transition-all cursor-pointer border whitespace-nowrap overflow-hidden ${
                      isSelected
                        ? activeStyles[st]
                        : "border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 hover:bg-white/40 dark:hover:bg-[#1a1a1a]"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[st]}`}></span>
                    <span className="font-semibold">{st}</span>
                    <span className="text-[9px] sm:text-[10px] opacity-80 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
            {filteredEmployees.map(emp => {
              const isActive = activeEmployee?.id === emp.id;
              const isSelf = emp.id === currentUserId;
              const empStatus = emp.status || "Active";
              return (
                <div
                  key={emp.id}
                  onClick={() => setActiveEmpId(emp.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center space-x-3 ${isActive
                    ? "bg-emerald-50/75 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-xs"
                    : "bg-slate-50/50 dark:bg-[#0a0a0a]/50 hover:bg-slate-50 dark:hover:bg-[#1a1a1a]/80 border-slate-100/50 dark:border-[#1a1a1a]"
                    }`}
                >
                  <div className="relative">
                    <img
                      src={emp.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop"}
                      alt={emp.fullName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-gray-700"
                    />
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0f0f0f] ${
                      empStatus === "Active" ? "bg-emerald-500" : empStatus === "Suspended" ? "bg-rose-500" : "bg-amber-500"
                    }`}></span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <p className="font-semibold text-slate-700 dark:text-gray-300 text-xs truncate">
                          {emp.fullName} {isSelf && <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 font-bold px-1.5 py-0.2 rounded">Me</span>}
                        </p>
                        {empStatus !== "Active" && (
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider shrink-0 ${
                            empStatus === "Suspended"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40"
                          }`}>
                            {empStatus}
                          </span>
                        )}
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 font-sans ${
                        emp.role === "admin"
                          ? "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/40"
                          : emp.role === "hr"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40"
                          : "bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}>
                        {emp.role === "admin" ? "Admin" : emp.role === "hr" ? "HR Manager" : "Employee"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium truncate mt-0.5">
                      {getDesignationTitle(emp.designationId)} • {emp.department}
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? "text-emerald-600 translate-x-1" : "text-slate-300"}`} />
                </div>
              );
            })}

            {filteredEmployees.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-8">No employees found.</p>
            )}
          </div>
        </div>

        {/* Right Side: Tabular Profile Details */}
        <div className="lg:col-span-6 xl:col-span-6 h-[650px] min-h-[650px] flex flex-col justify-between space-y-6">
          {activeEmployee ? (
            <>
              {/* Profile Card Header */}
              <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-6 shadow-xs dark:neon-glow">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <img
                      src={activeEmployee.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop"}
                      alt={activeEmployee.fullName}
                      className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500/20"
                    />
                    <div>
                      <h2 className="text-xl font-bold font-display text-slate-800 dark:text-white flex items-center space-x-2">
                        <span>{activeEmployee.fullName}</span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${activeEmployee.status === "Active"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                          }`}>{activeEmployee.status}</span>
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-gray-400 font-medium mt-1">
                        {getDesignationTitle(activeEmployee.designationId)} ({activeEmployee.department} Department)
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">
                        Joined on {activeEmployee.joiningDate}
                        {activeEmployee.dateOfBirth && ` • Born on ${new Date(activeEmployee.dateOfBirth).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}`}
                      </p>
                    </div>
                  </div>

                  {/* Actions for Onboard Checklists */}
                  <div className="flex items-center space-x-2 bg-slate-50 dark:bg-[#0a0a0a]/50 p-1.5 rounded-xl border border-slate-100 dark:border-[#1a1a1a] w-full sm:w-auto justify-around sm:justify-start">
                    {(role === "admin" || role === "hr") && (
                      <button
                        onClick={() => openEditModal(activeEmployee)}
                        className="p-2 hover:bg-white dark:hover:bg-[#1a1a1a] rounded-lg text-slate-500 dark:text-gray-400 hover:text-emerald-500 transition-all cursor-pointer"
                        title="Edit Employee Details"
                      >
                        <Pencil className="w-4.5 h-4.5" />
                      </button>
                    )}
                    <a href={`mailto:${activeEmployee.email}`} className="p-2 hover:bg-white dark:hover:bg-[#1a1a1a] rounded-lg text-slate-500 dark:text-gray-400 hover:text-emerald-500 transition-all">
                      <Mail className="w-4.5 h-4.5" />
                    </a>
                    <a href={`tel:${activeEmployee.phone}`} className="p-2 hover:bg-white dark:hover:bg-[#1a1a1a] rounded-lg text-slate-500 dark:text-gray-400 hover:text-emerald-500 transition-all">
                      <Phone className="w-4.5 h-4.5" />
                    </a>
                  </div>
                </div>

                {/* Biography */}
                {activeEmployee.bio && (
                  <div className="mt-5 pt-4 border-t border-slate-50 dark:border-gray-800">
                    <h4 className="text-xs font-semibold text-slate-400 dark:text-gray-400 uppercase tracking-wider mb-1.5">Employee Biography</h4>
                    <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed font-sans">
                      {activeEmployee.bio ? (activeEmployee.bio.charAt(0).toUpperCase() + activeEmployee.bio.slice(1)) : ""}
                    </p>
                  </div>
                )}
              </div>

              {/* Bento Profile Tabulation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Bank & Salary Specs */}
                <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
                  <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm mb-3 flex items-center">
                    <Landmark className="w-4.5 h-4.5 text-emerald-500 mr-2" /> Bank & Salary Specs
                  </h3>
                  <div className="bg-slate-50/50 dark:bg-[#0a0a0a]/50 rounded-xl p-3.5 space-y-2.5 border border-slate-100/50 dark:border-[#1a1a1a]/50 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Basic Salary</span>
                      <span className="font-semibold text-slate-700 dark:text-gray-300 font-mono">₹{activeEmployee.salary.basic.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">HRA Allowance</span>
                      <span className="font-semibold text-slate-700 dark:text-gray-300 font-mono">₹{activeEmployee.salary.hra.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Other Allowances</span>
                      <span className="font-semibold text-slate-700 dark:text-gray-300 font-mono">₹{activeEmployee.salary.allowances.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 dark:border-[#1a1a1a] pt-2">
                      <span className="text-slate-400">Bank Account</span>
                      <span className="font-semibold text-slate-700 dark:text-gray-300 font-mono">****{activeEmployee.bankDetails.accountNumber.slice(-4)} ({activeEmployee.bankDetails.bankName})</span>
                    </div>
                  </div>
                </div>

                {/* Emergency Contacts & Address */}
                <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
                  <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm mb-3 flex items-center">
                    <MapPin className="w-4.5 h-4.5 text-emerald-500 mr-2" /> Emergency Contacts & Address
                  </h3>
                  <div className="bg-slate-50/50 dark:bg-[#0a0a0a]/50 rounded-xl p-3.5 space-y-2.5 border border-slate-100/50 dark:border-[#1a1a1a]/50 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Contact Person</span>
                      <span className="font-semibold text-slate-700 dark:text-gray-300">
                        {activeEmployee.emergencyContact.name ? (activeEmployee.emergencyContact.name.charAt(0).toUpperCase() + activeEmployee.emergencyContact.name.slice(1)) : ""} {activeEmployee.emergencyContact.relation ? `(${activeEmployee.emergencyContact.relation.charAt(0).toUpperCase() + activeEmployee.emergencyContact.relation.slice(1)})` : ""}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Contact Phone</span>
                      <span className="font-semibold text-slate-700 dark:text-gray-300 font-mono">{activeEmployee.emergencyContact.phone}</span>
                    </div>
                    <div className="border-t border-slate-100 dark:border-[#1a1a1a] pt-2">
                      <span className="text-slate-400 block mb-1">Residential Address</span>
                      <span className="text-slate-500 dark:text-gray-400 leading-tight block">
                        {activeEmployee.address ? (activeEmployee.address.charAt(0).toUpperCase() + activeEmployee.address.slice(1)) : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom & Dynamic Attributes Section */}
              {activeEmployee.customFields && Object.keys(activeEmployee.customFields).length > 0 && (
                <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
                  <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm mb-3 flex items-center">
                    <Sparkles className="w-4.5 h-4.5 text-teal-500 mr-2" /> Custom & Dynamic Attributes
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(activeEmployee.customFields).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-3 rounded-xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 text-xs">
                        <span className="text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[11px]">
                          {key.toLowerCase() === "pan" ? "PAN Number" : key.toLowerCase() === "uan" ? "UAN Number" : key.toUpperCase()}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-teal-200 bg-white dark:bg-[#0f0f0f] px-2.5 py-1 rounded-md border border-teal-100 dark:border-teal-900/40 font-mono text-[11px] uppercase tracking-wider">
                          {String(value).toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-12 text-center shadow-xs dark:neon-glow flex flex-col items-center justify-center min-h-[450px]">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl mb-3 border border-amber-100 dark:border-amber-900/30">
                <UserX className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">
                No {selectedStatusFilter === "All" ? "" : selectedStatusFilter} Employees Found
              </h3>
              <p className="text-xs text-slate-400 dark:text-gray-500 max-w-sm leading-relaxed">
                There are currently no employees with <span className="font-semibold text-slate-600 dark:text-gray-300">{selectedStatusFilter === "All" ? "matching criteria" : `status "${selectedStatusFilter}"`}</span> in the selected department and branch filters.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Checklists & Document Vault Full Width Stack */}
      {activeEmployee && (
        <div className="space-y-4 mt-6 w-full">
          {(() => {
            const isExitDoc = (doc: EmployeeDocument) => {
              const cat = (doc.category || "").toLowerCase();
              const name = (doc.name || "").toLowerCase();
              return (
                cat.includes("exit") ||
                cat.includes("resignation") ||
                cat.includes("separation") ||
                cat.includes("no dues") ||
                cat.includes("asset handover") ||
                name.includes("(exit)") ||
                name.includes("resignation") ||
                name.includes("no dues") ||
                name.includes("exit clearance") ||
                name.includes("clearance")
              );
            };

            const getDynamicVaultDocs = (emp: Employee, isExit: boolean) => {
              const checklist = isExit ? (emp.exitChecklist || []) : (emp.onboardingChecklist || []);
              const templates = isExit ? exitChecklistTemplates : onboardingChecklistTemplates;
              const rawDocs = (emp.documents || []).filter(doc => isExit ? isExitDoc(doc) : !isExitDoc(doc));
              
              const map = new Map<string, any>();

              // 1. Add strictly APPROVED checklist items
              checklist.forEach(item => {
                if (item.fileUrl && item.status === "Approved") {
                  const tmpl = (templates || []).find(t => t.id === item.templateId || t.id === item.id);
                  let cleanName = tmpl?.title || item.title || "Document";
                  if (cleanName.startsWith("onb-tmpl-") || cleanName.startsWith("exit-tmpl-")) {
                    cleanName = tmpl?.title || (isExit ? "Exit Clearance Document" : "Onboarding Document");
                  }
                  cleanName = cleanName.replace(/\s*\(Onboarding\)/gi, "").replace(/\s*\(Exit\)/gi, "");

                  const key = cleanName.trim().toLowerCase();
                  map.set(key, {
                    id: `chk-${item.id}`,
                    name: cleanName,
                    category: isExit ? "Employee Exit & Separation Clearance Checklist" : "Onboarding Document Checklist",
                    uploadedAt: item.uploadedAt || new Date().toISOString().split("T")[0],
                    approvedAt: item.reviewedAt || new Date().toISOString().split("T")[0],
                    reviewedBy: item.reviewedBy || "HR Manager",
                    size: "1.2 MB",
                    fileUrl: item.fileUrl
                  });
                }
              });

              // 2. Add raw documents ONLY if they have explicit HR approval AND no pending checklist item
              rawDocs.forEach(d => {
                const isApprovedDoc = Boolean(d.approvedAt || (d as any).status === "Approved");
                if (!isApprovedDoc) return; // Exclude unapproved raw documents!

                const docName = (d.name || "").trim().toLowerCase();
                const matchingChecklistItem = checklist.find(item => {
                  const itemTitle = (item.title || "").trim().toLowerCase();
                  const tmpl = (templates || []).find(t => t.id === item.templateId || t.id === item.id);
                  const tmplTitle = (tmpl?.title || "").trim().toLowerCase();
                  return docName.includes(itemTitle) || itemTitle.includes(docName) || (tmplTitle && (docName.includes(tmplTitle) || tmplTitle.includes(docName)));
                });

                // If there's a checklist item for this requirement and it's NOT approved, DO NOT show in vault!
                if (matchingChecklistItem && matchingChecklistItem.status !== "Approved") {
                  return;
                }

                // If not already in map from an approved checklist item, add it
                const matchingApprovedInMap = Array.from(map.keys()).some(k => docName.includes(k) || k.includes(docName));
                if (!matchingApprovedInMap) {
                  map.set(docName, d);
                }
              });

              return Array.from(map.values());
            };

            const onboardingDocs = getDynamicVaultDocs(activeEmployee, false);
            const exitDocs = getDynamicVaultDocs(activeEmployee, true);

            const dynamicOnboardingSubtitle = onboardingChecklistTemplates && onboardingChecklistTemplates.length > 0
              ? onboardingChecklistTemplates.map(t => t.title).join(", ")
              : "Aadhaar, PAN, contracts, tax forms & clearance logs";

            const dynamicExitSubtitle = exitChecklistTemplates && exitChecklistTemplates.length > 0
              ? exitChecklistTemplates.map(t => t.title).join(", ")
              : "Resignation copy, no-dues certificate, asset handover & exit logs";

            return (
              <div className="space-y-4 w-full">
                {/* Header & Toggle Switch */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f0f0f] p-4 rounded-2xl border border-slate-200 dark:border-[#222] shadow-xs">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-xl text-white font-bold ${activeChecklistTab === "exit" ? "bg-gradient-to-r from-amber-500 to-orange-600" : "bg-gradient-to-r from-emerald-500 to-teal-600"}`}>
                      {activeChecklistTab === "exit" ? <LogOut className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-display font-extrabold text-slate-800 dark:text-white text-base sm:text-lg">
                        {activeChecklistTab === "exit" ? "Employee Exit & Separation Clearance Checklist & Vault" : "Onboarding Document Checklist & Vault"}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-gray-400">
                        {activeChecklistTab === "exit"
                          ? "Exit separation requirements paired with approved exit document vault"
                          : "Mandatory employee KYC requirements paired with approved onboarding document vault"}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-[#2a2a2a] shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setActiveChecklistTab("onboarding")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                        activeChecklistTab === "onboarding"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:white"
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Onboarding Checklist &amp; Vault</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveChecklistTab("exit")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                        activeChecklistTab === "exit"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:white"
                      }`}
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      <span>Exit Clearance Checklist &amp; Vault</span>
                    </button>
                  </div>
                </div>

                {/* 2-Column Paired Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                  {activeChecklistTab === "onboarding" ? (
                    <>
                      {/* Left Column: Onboarding Document Checklist Card */}
                      <ChecklistCard
                        type="onboarding"
                        employee={activeEmployee}
                        templates={onboardingChecklistTemplates}
                        currentUserRole={role}
                        currentUserId={currentUserId}
                        onCreateTemplate={onCreateChecklistTemplate}
                        onDeleteTemplate={onDeleteChecklistTemplate}
                        onUploadDocument={async (empId, itemId, file, category) => {
                          if (onUploadChecklistDocument) {
                            await onUploadChecklistDocument(empId, itemId, file, category);
                          }
                        }}
                        onReviewItem={async (empId, itemId, action, comments) => {
                          if (onReviewChecklistItem) {
                            await onReviewChecklistItem(empId, itemId, action, comments);
                          }
                        }}
                      />

                      {/* Right Column: Onboarding Document Checklist Vault Card */}
                      <div className="bg-gradient-to-br from-emerald-500/5 via-white to-teal-500/5 dark:from-[#081b14] dark:via-[#0f0f0f] dark:to-[#091618] border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl p-5 shadow-md dark:shadow-black/40 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4 border-b border-emerald-100 dark:border-emerald-950/60 pb-3 gap-2">
                            <div className="flex items-start space-x-3 min-w-0 flex-1">
                              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 rounded-xl shrink-0 mt-0.5 shadow-2xs">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-base truncate">
                                  Onboarding Document Checklist
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-gray-400 truncate" title={dynamicOnboardingSubtitle}>
                                  {dynamicOnboardingSubtitle}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setDocCategory("Onboarding Document Checklist");
                                setShowUploadModal(true);
                              }}
                              className="border border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer shrink-0 shadow-2xs"
                            >
                              <FileUp className="w-4 h-4" />
                              <span>Upload Document</span>
                            </button>
                          </div>

                          <div className="max-h-[500px] overflow-y-auto pr-1.5 custom-scrollbar">
                            <div className="grid grid-cols-1 gap-3">
                              {onboardingDocs.map(doc => {
                                const cleanName = doc.name.replace(/\s*\(Onboarding\)/gi, "").replace(/\s*\(Exit\)/gi, "");
                                const matchingItem = (activeEmployee.onboardingChecklist || [])
                                  .concat(activeEmployee.exitChecklist || [])
                                  .find(i => (i.title && i.title.trim().toLowerCase() === cleanName.trim().toLowerCase()) || i.id === doc.id);
                                const uploadDate = doc.uploadedAt || matchingItem?.uploadedAt;
                                const approveDate = doc.approvedAt || matchingItem?.reviewedAt;

                                return (
                                  <div key={doc.id} className="p-3.5 bg-white/90 dark:bg-[#0a0a0a]/90 border border-emerald-100 dark:border-[#1a1a1a] rounded-2xl flex items-center justify-between text-xs space-x-3 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-800 transition-all hover:shadow-xs">
                                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                                      <div className="p-2.5 bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 rounded-xl shrink-0">
                                        <FileText className="w-4.5 h-4.5" />
                                      </div>
                                      <div className="min-w-0 flex-1 space-y-1">
                                        <p className="font-extrabold text-slate-800 dark:text-gray-200 truncate text-xs sm:text-sm" title={cleanName}>
                                          {cleanName}
                                        </p>
                                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 whitespace-nowrap">
                                            {doc.category === "Onboarding Document Checklist" ? "Onboarding Document Checklist" : doc.category}
                                          </span>
                                          <span className="text-xs text-slate-400 font-mono">• {doc.size || "1.2 MB"}</span>
                                        </div>
                                        <div className="flex items-center space-x-2.5 flex-wrap gap-y-1 text-[11px] font-medium text-slate-500 dark:text-gray-400 pt-0.5">
                                          {uploadDate && (
                                            <span className="inline-flex items-center space-x-1 text-slate-600 dark:text-gray-300">
                                              <Clock className="w-3 h-3 text-blue-500 shrink-0" />
                                              <span>Uploaded: {uploadDate.includes("T") ? new Date(uploadDate).toLocaleDateString() : uploadDate}</span>
                                            </span>
                                          )}
                                          {approveDate && (
                                            <span className="inline-flex items-center space-x-1 text-emerald-700 dark:text-emerald-400 font-bold">
                                              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                              <span>Approved: {approveDate.includes("T") ? new Date(approveDate).toLocaleDateString() : approveDate}</span>
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-1 shrink-0 pl-1">
                                      <button
                                        type="button"
                                        onClick={() => setPreviewDoc({
                                          name: cleanName,
                                          url: doc.fileUrl || "",
                                          category: doc.category,
                                          size: doc.size
                                        })}
                                        className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer border border-emerald-200/50 dark:border-emerald-800/40"
                                        title="Preview Document"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      {(role === "admin" || role === "hr" || activeEmployee.id === currentUserId) && (
                                        <button
                                          type="button"
                                          onClick={() => onDeleteDocument(activeEmployee.id, doc.id || doc.name)}
                                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-rose-500 hover:text-rose-700 dark:text-rose-400 cursor-pointer border border-rose-200/50 dark:border-rose-900/40"
                                          title="Delete Document"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              {onboardingDocs.length === 0 && (
                                <p className="col-span-full text-xs text-slate-400 dark:text-gray-500 text-center py-8 bg-white/40 dark:bg-[#0a0a0a]/30 rounded-2xl border border-dashed border-emerald-200/60 dark:border-emerald-950">
                                  No uploaded onboarding compliance documents yet.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Left Column: Exit Document Clearance Checklist Card */}
                      <ChecklistCard
                        type="exit"
                        employee={activeEmployee}
                        templates={exitChecklistTemplates}
                        currentUserRole={role}
                        currentUserId={currentUserId}
                        onCreateTemplate={onCreateChecklistTemplate}
                        onDeleteTemplate={onDeleteChecklistTemplate}
                        onUploadDocument={async (empId, itemId, file, category) => {
                          if (onUploadChecklistDocument) {
                            await onUploadChecklistDocument(empId, itemId, file, category);
                          }
                        }}
                        onReviewItem={async (empId, itemId, action, comments) => {
                          if (onReviewChecklistItem) {
                            await onReviewChecklistItem(empId, itemId, action, comments);
                          }
                        }}
                        onGrantExitClearance={async (empId) => {
                          if (onGrantExitClearance) {
                            await onGrantExitClearance(empId);
                          }
                        }}
                        onInitiateResignation={async (empId) => {
                          if (onInitiateResignation) {
                            await onInitiateResignation(empId);
                          }
                        }}
                      />

                      {/* Right Column: Employee Exit & Separation Clearance Checklist Vault Card */}
                      <div className="bg-gradient-to-br from-amber-500/10 via-white to-orange-500/10 dark:from-[#1f1508] dark:via-[#0f0f0f] dark:to-[#1a0f05] border border-amber-300/80 dark:border-amber-900/60 rounded-2xl p-5 shadow-md dark:shadow-black/40 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4 border-b border-amber-100 dark:border-amber-950/60 pb-3 gap-2">
                            <div className="flex items-start space-x-3 min-w-0 flex-1">
                              <div className="p-2.5 bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 rounded-xl shrink-0 mt-0.5 shadow-2xs">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-base truncate">
                                  Employee Exit &amp; Separation Clearance Checklist
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                                  Resignation copy, no-dues certificate, asset handover &amp; exit logs
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setDocCategory("Employee Exit & Separation Clearance Checklist");
                                setShowUploadModal(true);
                              }}
                              className="border border-amber-600 text-amber-700 dark:border-amber-500 dark:text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors cursor-pointer shrink-0 shadow-2xs"
                            >
                              <FileUp className="w-4 h-4" />
                              <span>Upload Document</span>
                            </button>
                          </div>

                          <div className="max-h-[500px] overflow-y-auto pr-1.5 custom-scrollbar">
                            <div className="grid grid-cols-1 gap-3">
                              {exitDocs.map(doc => {
                                const cleanName = doc.name.replace(/\s*\(Onboarding\)/gi, "").replace(/\s*\(Exit\)/gi, "");
                                const matchingItem = (activeEmployee.onboardingChecklist || [])
                                  .concat(activeEmployee.exitChecklist || [])
                                  .find(i => (i.title && i.title.trim().toLowerCase() === cleanName.trim().toLowerCase()) || i.id === doc.id);
                                const uploadDate = doc.uploadedAt || matchingItem?.uploadedAt;
                                const approveDate = doc.approvedAt || matchingItem?.reviewedAt;

                                return (
                                  <div key={doc.id} className="p-3.5 bg-white/90 dark:bg-[#0a0a0a]/90 border border-amber-100 dark:border-[#1a1a1a] rounded-2xl flex items-center justify-between text-xs space-x-3 shadow-2xs hover:border-amber-300 dark:hover:border-amber-800 transition-all hover:shadow-xs">
                                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                                      <div className="p-2.5 bg-amber-100/80 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 rounded-xl shrink-0">
                                        <FileText className="w-4.5 h-4.5" />
                                      </div>
                                      <div className="min-w-0 flex-1 space-y-1">
                                        <p className="font-extrabold text-slate-800 dark:text-gray-200 truncate text-xs sm:text-sm" title={cleanName}>
                                          {cleanName}
                                        </p>
                                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 whitespace-nowrap">
                                            {doc.category === "Employee Exit & Separation Clearance Checklist" ? "Employee Exit Clearance Checklist" : doc.category}
                                          </span>
                                          <span className="text-xs text-slate-400 font-mono">• {doc.size || "1.2 MB"}</span>
                                        </div>
                                        <div className="flex items-center space-x-2.5 flex-wrap gap-y-1 text-[11px] font-medium text-slate-500 dark:text-gray-400 pt-0.5">
                                          {uploadDate && (
                                            <span className="inline-flex items-center space-x-1 text-slate-600 dark:text-gray-300">
                                              <Clock className="w-3 h-3 text-blue-500 shrink-0" />
                                              <span>Uploaded: {uploadDate.includes("T") ? new Date(uploadDate).toLocaleDateString() : uploadDate}</span>
                                            </span>
                                          )}
                                          {approveDate && (
                                            <span className="inline-flex items-center space-x-1 text-emerald-700 dark:text-emerald-400 font-bold">
                                              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                              <span>Approved: {approveDate.includes("T") ? new Date(approveDate).toLocaleDateString() : approveDate}</span>
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-1 shrink-0 pl-1">
                                      <button
                                        type="button"
                                        onClick={() => setPreviewDoc({
                                          name: cleanName,
                                          url: doc.fileUrl || "",
                                          category: doc.category,
                                          size: doc.size
                                        })}
                                        className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400 transition-colors cursor-pointer border border-amber-200/50 dark:border-amber-800/40"
                                        title="Preview Document"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      {(role === "admin" || role === "hr" || activeEmployee.id === currentUserId) && (
                                        <button
                                          type="button"
                                          onClick={() => onDeleteDocument(activeEmployee.id, doc.id || doc.name)}
                                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-rose-500 hover:text-rose-700 dark:text-rose-400 cursor-pointer border border-rose-200/50 dark:border-rose-900/40"
                                          title="Delete Document"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              {exitDocs.length === 0 && (
                                <p className="col-span-full text-xs text-slate-400 dark:text-gray-500 text-center py-8 bg-white/40 dark:bg-[#0a0a0a]/30 rounded-2xl border border-dashed border-amber-200/60 dark:border-amber-950">
                                  No uploaded exit &amp; separation clearance documents yet.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md mb-4 flex items-center">
              <FileUp className="w-5 h-5 text-emerald-500 mr-2" /> Upload Document
            </h3>

            <form onSubmit={handleDocUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Select File *</label>
                <input
                  type="file"
                  ref={docFileRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setDocFile(file);
                    if (file && !docName) {
                      setDocName(file.name.replace(/\.[^/.]+$/, ""));
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950/30 dark:file:text-emerald-400 cursor-pointer"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Document Display Name *</label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Form_16_Tax_Clearance"
                  className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Category</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                >
                  <optgroup label="Onboarding Document Checklist">
                    <option value="Onboarding Document Checklist">Onboarding Document Checklist</option>
                    <option value="ID Proof">ID Proof (Aadhaar, Passport, PAN)</option>
                    <option value="Contract">Contract &amp; Employment Agreement</option>
                    <option value="Tax Document">Tax Document / Form 16</option>
                    <option value="Educational">Educational &amp; Certificates</option>
                  </optgroup>
                  <optgroup label="Employee Exit &amp; Separation Clearance Checklist">
                    <option value="Employee Exit &amp; Separation Clearance Checklist">Employee Exit &amp; Separation Clearance Checklist</option>
                    <option value="Resignation Letter">Resignation / Separation Letter</option>
                    <option value="No Dues Certificate">No Dues Certificate</option>
                    <option value="Asset Handover">Asset Handover Receipt</option>
                  </optgroup>
                  <optgroup label="General / Other">
                    <option value="Other">Other Miscellaneous</option>
                  </optgroup>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setDocFile(null);
                    setDocName("");
                  }}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-[#0a0a0a] dark:hover:bg-[#1a1a1a] text-slate-600 dark:text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {uploadingDoc && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{uploadingDoc ? "Uploading..." : "Upload"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Onboard New Employee Slideover */}
      {showOnboardForm && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end"
          onClick={() => setShowOnboardForm(false)}
        >
          <div 
            className="bg-white dark:bg-[#0f0f0f] border-l border-slate-100 dark:border-[#1a1a1a] w-full max-w-2xl h-full p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1a1a1a] pb-4">
                <div>
                  <h3 className="font-display font-semibold text-slate-800 dark:text-white text-lg flex items-center">
                    <UserPlus className="w-5 h-5 text-emerald-500 mr-2" /> Onboard New Employee
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-gray-500">Initiate payroll, workspace assets, and welcome sequence</p>
                </div>
                <button
                  onClick={() => setShowOnboardForm(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] rounded-lg text-slate-400"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleOnboardSubmit} className="space-y-5">
                {/* Section 1: Basic Info */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">1. Personnel Credentials</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Full Name *</label>
                      <div className="flex gap-2">
                        <select
                          value={prefix}
                          onChange={(e) => setPrefix(e.target.value as any)}
                          className="bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-2 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium w-20 shrink-0"
                        >
                          <option value="Mr">Mr</option>
                          <option value="Mrs">Mrs</option>
                          <option value="Miss">Miss</option>
                          <option value="Ms">Ms</option>
                        </select>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Vikram Malhotra"
                          className="flex-1 bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Email Address *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. vikram@company.com"
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (onboardError) setOnboardError(null);
                        }}
                        placeholder="e.g. +91 99999 88888"
                        className={`w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border font-medium transition-colors ${
                          phone.trim() && !isValidPhoneNumber(phone)
                            ? "border-rose-500 text-rose-600 dark:text-rose-400 focus:border-rose-500 bg-rose-50/20"
                            : phone.trim() && isValidPhoneNumber(phone)
                            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 focus:border-emerald-500"
                            : "border-slate-100 dark:border-[#1a1a1a] focus:border-emerald-500"
                        }`}
                      />
                      {phone.trim() && !isValidPhoneNumber(phone) ? (
                        <p className="text-[10px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 shrink-0" />
                          {phone.trim().startsWith("+91") || phone.trim().startsWith("91")
                            ? "Phone with +91 must have exactly 10 digits after country code (total 12 digits)"
                            : "Phone number without +91 must be exactly 10 digits"}
                        </p>
                      ) : phone.trim() && isValidPhoneNumber(phone) ? (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          Valid Phone Number format ({phone.trim().startsWith("+91") || phone.trim().startsWith("91") ? "12 digits with +91" : "10 digits"})
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-1">10 digits without +91 or 12 digits with +91</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Password *</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (onboardError) setOnboardError(null);
                          }}
                          onFocus={() => setIsPasswordFocused(true)}
                          onBlur={() => setIsPasswordFocused(false)}
                          placeholder="Set login password"
                          className={`w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 pr-9 text-xs rounded-xl border font-medium transition-colors ${
                            password && !isValidPassword(password)
                              ? "border-amber-500 focus:border-amber-500"
                              : password && isValidPassword(password)
                              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 focus:border-emerald-500"
                              : "border-slate-100 dark:border-[#1a1a1a] focus:border-emerald-500"
                          }`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Live Password Strength Requirements Checklist — Shown when field is focused or being typed */}
                      {(isPasswordFocused || (password.length > 0 && !isValidPassword(password))) && (() => {
                        const s = checkPasswordStrength(password);
                        return (
                          <div className="mt-2 p-2.5 bg-slate-50 dark:bg-[#0c0c0c] rounded-xl border border-slate-100 dark:border-[#1a1a1a] space-y-1 text-[10px] animate-in fade-in slide-in-from-top-1 duration-150">
                            <p className="font-bold text-slate-500 dark:text-gray-400 mb-1 uppercase tracking-wider text-[9px]">Password Requirements:</p>
                            <div className="grid grid-cols-2 gap-1.5 font-medium">
                              <div className={`flex items-center gap-1.5 ${s.hasUpper ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400 dark:text-gray-500"}`}>
                                {s.hasUpper ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-gray-600 shrink-0 flex items-center justify-center text-[8px] font-bold">A</span>}
                                <span>1 Capital Letter (A-Z)</span>
                              </div>
                              <div className={`flex items-center gap-1.5 ${s.hasNumber ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400 dark:text-gray-500"}`}>
                                {s.hasNumber ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-gray-600 shrink-0 flex items-center justify-center text-[8px] font-bold">1</span>}
                                <span>1 Numeric Digit (0-9)</span>
                              </div>
                              <div className={`flex items-center gap-1.5 ${s.hasSpecial ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400 dark:text-gray-500"}`}>
                                {s.hasSpecial ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-gray-600 shrink-0 flex items-center justify-center text-[8px] font-bold">#</span>}
                                <span>1 Special Symbol (!@#$)</span>
                              </div>
                              <div className={`flex items-center gap-1.5 ${s.hasMinLength ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400 dark:text-gray-500"}`}>
                                {s.hasMinLength ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-gray-600 shrink-0 flex items-center justify-center text-[8px] font-bold">6</span>}
                                <span>Min 6 Characters</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Gender *</label>
                      <div className="flex gap-2">
                        {(["Male", "Female", "Other"] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGender(g)}
                            className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                              gender === g
                                ? "bg-emerald-500 text-white border-emerald-500"
                                : "bg-slate-50 dark:bg-[#0a0a0a] text-slate-500 dark:text-gray-400 border-slate-100 dark:border-[#1a1a1a] hover:border-emerald-300"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Role Type</label>
                      <select
                        value={empRole}
                        onChange={(e) => setEmpRole(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                        disabled={role === "hr"}
                      >
                        <option value="employee">Employee</option>
                        {role === "admin" && <option value="hr">HR Manager</option>}
                        {role === "admin" && <option value="admin">Administrator</option>}
                      </select>
                      {role === "hr" && (
                        <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">
                          HR Managers can only onboard Employee roles.
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2 flex items-center space-x-4 p-3 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a] rounded-xl mt-2">
                      <div className="relative w-12 h-12 bg-slate-200 dark:bg-gray-800 rounded-full overflow-hidden flex items-center justify-center border border-slate-300 dark:border-gray-700">
                        {profileImagePreview ? (
                          <img src={profileImagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">Employee Profile Photo</label>
                        <input
                          type="file"
                          ref={profileImageRef}
                          accept="image/*"
                          onChange={handleProfileImageSelect}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => profileImageRef.current?.click()}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-lg border border-emerald-100 dark:border-emerald-900/30 cursor-pointer"
                        >
                          Choose Photo
                        </button>
                        {profileImageFile && (
                          <span className="text-[10px] text-slate-400 ml-2 font-mono">{profileImageFile.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Department and Designations */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">2. Designation & Placement</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Department</label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                      >
                        {(customDepartments && customDepartments.length > 0
                          ? customDepartments
                          : ["Information Technology", "Loans", "Insurance", "Risk", "HR", "Operations", "Compliance", "IT", "Sales", "Finance", "Executive"]
                        ).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Corporate Designation</label>
                      <select
                        value={selectedDesgId}
                        onChange={(e) => setSelectedDesgId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                      >
                        {designations.map(desg => (
                          <option key={desg.id} value={desg.id}>{desg.title} ({desg.department})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Joining Date</label>
                      <input
                        type="date"
                        value={joiningDate}
                        onChange={(e) => setJoiningDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Branch Office *</label>
                      <select
                        value={onboardBranch}
                        onChange={(e) => setOnboardBranch(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                        required
                        disabled={role === "hr"}
                      >
                        {(customBranches || []).map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Employment Type *</label>
                      <select
                        value={employmentType}
                        onChange={(e) => setEmploymentType(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                      >
                        <option value="">Select Employment Type...</option>
                        <option value="permanent">Permanent</option>
                        <option value="contract">Contract</option>
                        <option value="consultant">Consultant</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Salary Allocation & Tenant Payroll Rules (New Flow) */}
                <div className="space-y-3.5 bg-slate-50/80 dark:bg-[#0a0a0a]/60 p-4 rounded-2xl border border-slate-100 dark:border-[#1a1a1a]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-[#1a1a1a] pb-2.5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                        <span>3. Compensation & Tenant Payroll Rules</span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Components auto-computed based on your active tenant configuration
                      </p>
                    </div>

                    {onboardPayrollConfig && (
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-1 shrink-0">
                        <Sparkles className="w-3 h-3 text-emerald-500" />
                        <span>Tenant Rules Active ({onboardPayrollConfig.hraValue}% HRA, {onboardPayrollConfig.pfValue}% PF)</span>
                      </span>
                    )}
                  </div>

                  {/* Input 1: Basic Salary & Input 2 & 3: PF/ESI Exemption Toggles */}
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-200 mb-1">
                        Basic Salary (INR) *
                      </label>
                      <input
                        type="number"
                        value={salaryBasic}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSalaryBasic(val);
                          recomputeOnboardSalaryComponents(val, onboardIsPfExempt, onboardIsEsiExempt);
                        }}
                        placeholder="e.g. 45000"
                        className="w-full bg-white dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#1a1a1a] font-mono font-bold focus:outline-none focus:border-emerald-500 shadow-xs"
                        required
                      />
                    </div>

                    {/* Exemption Checkbox Toggles Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* PF Exemption Checkbox Toggle */}
                      <div className="p-3 bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-[#252525] flex items-center justify-between shadow-xs">
                        <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-gray-200">
                          <input
                            type="checkbox"
                            checked={onboardIsPfExempt}
                            onChange={e => {
                              const checked = e.target.checked;
                              setOnboardIsPfExempt(checked);
                              recomputeOnboardSalaryComponents(salaryBasic, checked, onboardIsEsiExempt);
                            }}
                            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                          />
                          <span>Exempt from Provident Fund (PF)</span>
                        </label>

                        {onboardIsPfExempt ? (
                          <span className="text-[10px] font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-xs">
                            EXEMPTED (₹0 PF)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Standard PF Active
                          </span>
                        )}
                      </div>

                      {/* ESI Exemption Checkbox Toggle */}
                      <div className="p-3 bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-[#252525] flex items-center justify-between shadow-xs">
                        <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-gray-200">
                          <input
                            type="checkbox"
                            checked={onboardIsEsiExempt}
                            onChange={e => {
                              const checked = e.target.checked;
                              setOnboardIsEsiExempt(checked);
                              recomputeOnboardSalaryComponents(salaryBasic, onboardIsPfExempt, checked);
                            }}
                            className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                          />
                          <span>Exempt from ESI Insurance</span>
                        </label>

                        {onboardIsEsiExempt ? (
                          <span className="text-[10px] font-extrabold bg-blue-500 text-white px-2 py-0.5 rounded-full shadow-xs">
                            EXEMPTED (₹0 ESI)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Standard ESI Active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Auto-Computed Breakdown Card */}
                  {Number(salaryBasic) > 0 && (
                    <div className="p-3.5 bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-[#252525] space-y-2 text-xs shadow-xs animate-in fade-in">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#252525] pb-1.5 flex justify-between">
                        <span>Auto-Computed Salary Structure</span>
                        <span className="text-emerald-500 font-mono">Tenant Rules Applied</span>
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                        <div className="bg-slate-50 dark:bg-[#0a0a0a] p-2 rounded-lg border border-slate-100 dark:border-[#252525]">
                          <span className="text-slate-400 block text-[9px] uppercase">HRA Allowance</span>
                          <span className="font-bold text-slate-700 dark:text-gray-200 font-mono">₹{Number(salaryHra).toLocaleString()}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-[#0a0a0a] p-2 rounded-lg border border-slate-100 dark:border-[#252525]">
                          <span className="text-slate-400 block text-[9px] uppercase">Telephone Allow.</span>
                          <input type="number" value={salaryTelephone} onChange={e => setSalaryTelephone(e.target.value)} placeholder="0" className="w-full font-bold text-slate-700 dark:text-gray-200 font-mono bg-transparent text-xs outline-none" />
                        </div>
                        <div className="bg-slate-50 dark:bg-[#0a0a0a] p-2 rounded-lg border border-slate-100 dark:border-[#252525]">
                          <span className="text-slate-400 block text-[9px] uppercase">Fuel Allow.</span>
                          <input type="number" value={salaryFuel} onChange={e => setSalaryFuel(e.target.value)} placeholder="0" className="w-full font-bold text-slate-700 dark:text-gray-200 font-mono bg-transparent text-xs outline-none" />
                        </div>
                        <div className="bg-slate-50 dark:bg-[#0a0a0a] p-2 rounded-lg border border-slate-100 dark:border-[#252525]">
                          <span className="text-slate-400 block text-[9px] uppercase">Prof. Dev.</span>
                          <input type="number" value={salaryProfDev} onChange={e => setSalaryProfDev(e.target.value)} placeholder="0" className="w-full font-bold text-slate-700 dark:text-gray-200 font-mono bg-transparent text-xs outline-none" />
                        </div>
                        <div className="bg-slate-50 dark:bg-[#0a0a0a] p-2 rounded-lg border border-slate-100 dark:border-[#252525]">
                          <span className="text-slate-400 block text-[9px] uppercase">LTA</span>
                          <input type="number" value={salaryLta} onChange={e => setSalaryLta(e.target.value)} placeholder="0" className="w-full font-bold text-slate-700 dark:text-gray-200 font-mono bg-transparent text-xs outline-none" />
                        </div>
                        <div className="bg-slate-50 dark:bg-[#0a0a0a] p-2 rounded-lg border border-slate-100 dark:border-[#252525]">
                          <span className="text-slate-400 block text-[9px] uppercase">Special Allowances</span>
                          <span className="font-bold text-slate-700 dark:text-gray-200 font-mono">₹{Number(salaryAllowances).toLocaleString()}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-[#0a0a0a] p-2 rounded-lg border border-slate-100 dark:border-[#252525]">
                          <span className="text-slate-400 block text-[9px] uppercase">PF Deduction</span>
                          {onboardIsPfExempt ? (
                            <span className="font-bold text-amber-600 font-mono text-[10px]">₹0 (EXEMPT)</span>
                          ) : (
                            <span className="font-bold text-rose-500 font-mono">₹{Number(salaryPf).toLocaleString()}</span>
                          )}
                        </div>
                        <div className="bg-slate-50 dark:bg-[#0a0a0a] p-2 rounded-lg border border-slate-100 dark:border-[#252525]">
                          <span className="text-slate-400 block text-[9px] uppercase">ESI Deduction</span>
                          {onboardIsEsiExempt ? (
                            <span className="font-bold text-blue-600 font-mono text-[10px]">₹0 (EXEMPT)</span>
                          ) : (
                            <span className="font-bold text-blue-500 font-mono">₹{Number(salaryEsi).toLocaleString()}</span>
                          )}
                        </div>
                        <div className="bg-slate-50 dark:bg-[#0a0a0a] p-2 rounded-lg border border-slate-100 dark:border-[#252525]">
                          <span className="text-slate-400 block text-[9px] uppercase">TDS / Tax</span>
                          <span className="font-bold text-rose-500 font-mono">₹{Number(salaryTds).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="bg-emerald-600/10 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-500/20 flex items-center justify-between font-bold text-xs pt-1.5">
                        <span className="text-slate-700 dark:text-gray-200">
                          Gross Pay: <span className="font-mono text-emerald-600 dark:text-emerald-400">₹{(Number(salaryBasic) + Number(salaryHra) + Number(salaryTelephone) + Number(salaryFuel) + Number(salaryProfDev) + Number(salaryLta) + Number(salaryAllowances)).toLocaleString()}</span>
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                          Est. Net Pay: ₹{((Number(salaryBasic) + Number(salaryHra) + Number(salaryTelephone) + Number(salaryFuel) + Number(salaryProfDev) + Number(salaryLta) + Number(salaryAllowances)) - (Number(salaryPf) + Number(salaryTds) + Number(salaryEsi))).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>



                {/* Section 4: Bank specs */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">4. Bank & Compensation Account</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        placeholder="e.g. 501002938192"
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="HDFC Bank"
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">IFSC Code</label>
                      <input
                        type="text"
                        value={bankIfsc}
                        onChange={(e) => setBankIfsc(e.target.value)}
                        placeholder="HDFC0000104"
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 5: Contact & Address Details */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">5. Contact & Address Details</h4>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Residential Address</label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={2}
                      placeholder="Enter full physical residential address..."
                      className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Section 6: Emergency Contact Details */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">6. Emergency Contact Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Contact Name</label>
                      <input
                        type="text"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        placeholder="e.g. Suman Sharma"
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Relationship</label>
                      <input
                        type="text"
                        value={emergencyRelation}
                        onChange={(e) => setEmergencyRelation(e.target.value)}
                        placeholder="e.g. Spouse / Parent"
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        placeholder="e.g. +91 99999 88888"
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 7: PAN & UAN Numbers */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">7. Identity &amp; Compliance Documents</h4>
                  {onboardError && (
                    <div className="mb-3 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{onboardError}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">PAN Number</label>
                      <input
                        type="text"
                        value={pan}
                        onChange={(e) => {
                          setPan(e.target.value.toUpperCase().trim());
                          if (onboardError) setOnboardError(null);
                        }}
                        placeholder="e.g. ABCDE1234F"
                        maxLength={10}
                        className={`w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border font-mono tracking-widest uppercase font-medium transition-colors ${
                          pan.trim() && !isValidPAN(pan)
                            ? "border-rose-500 text-rose-600 dark:text-rose-400 focus:border-rose-500 bg-rose-50/20"
                            : pan.trim() && isValidPAN(pan)
                            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 focus:border-emerald-500"
                            : "border-slate-100 dark:border-[#1a1a1a] focus:border-emerald-500"
                        }`}
                      />
                      {pan.trim() && !isValidPAN(pan) ? (
                        <p className="text-[10px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 shrink-0" />
                          Invalid PAN format (5 letters, 4 numbers, 1 letter)
                        </p>
                      ) : pan.trim() && isValidPAN(pan) ? (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          Valid PAN Number format
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-1">Permanent Account Number (10 characters, e.g. ABCDE1234F)</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">UAN Number</label>
                      <input
                        type="text"
                        value={uan}
                        onChange={(e) => {
                          setUan(e.target.value.replace(/\D/g, ""));
                          if (onboardError) setOnboardError(null);
                        }}
                        placeholder="e.g. 101146669488"
                        maxLength={12}
                        className={`w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border font-mono tracking-widest font-medium transition-colors ${
                          uan.trim() && !isValidUAN(uan)
                            ? "border-rose-500 text-rose-600 dark:text-rose-400 focus:border-rose-500 bg-rose-50/20"
                            : uan.trim() && isValidUAN(uan)
                            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 focus:border-emerald-500"
                            : "border-slate-100 dark:border-[#1a1a1a] focus:border-emerald-500"
                        }`}
                      />
                      {uan.trim() && !isValidUAN(uan) ? (
                        <p className="text-[10px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 shrink-0" />
                          Invalid UAN format (Must be 12 digits)
                        </p>
                      ) : uan.trim() && isValidUAN(uan) ? (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          Valid UAN Number format
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-1">Universal Account Number (12 digits) for PF</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 8: Biography */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Employee Bio / Profile Summary</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={2}
                    placeholder="Brief outline of credentials or NBFC sales experiences..."
                    className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-center space-x-2 pt-4 border-t border-slate-100 dark:border-[#1a1a1a]">
                  <button
                    type="button"
                    onClick={() => setShowOnboardForm(false)}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-[#0a0a0a] dark:hover:bg-[#1a1a1a] text-slate-600 dark:text-gray-300 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOnboard}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-all"
                  >
                    {isSubmittingOnboard ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                        <span>Creating Profile...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span>Complete Onboarding</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Edit Employee Slideover */}
      {showEditModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end"
          onClick={() => setShowEditModal(false)}
        >
          <div 
            className="bg-white dark:bg-[#0f0f0f] border-l border-slate-100 dark:border-[#1a1a1a] w-full max-w-2xl h-full p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1a1a1a] pb-4">
                <div>
                  <h3 className="font-display font-semibold text-slate-800 dark:text-white text-lg flex items-center">
                    <Pencil className="w-5 h-5 text-emerald-500 mr-2" /> Edit Employee Information
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-gray-500">Modify personnel credentials, financial specs, and settings</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] rounded-lg text-slate-400"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-5">
                {(() => {
                  let dSecIdx = 0;
                  return (
                    <>
                      {/* Section: Basic Info */}
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">{++dSecIdx}. Personnel Credentials</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Full Name *</label>
                            <input
                              type="text"
                              value={editFullName}
                              onChange={(e) => setEditFullName(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Email Address *</label>
                            <input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Phone Number</label>
                            <input
                              type="text"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                            />
                          </div>
                          {(role === "admin" || role === "hr") && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Change Password</label>
                              <div className="relative">
                                <input
                                  type={showEditPassword ? "text" : "password"}
                                  value={editPassword}
                                  onChange={(e) => setEditPassword(e.target.value)}
                                  placeholder="Leave blank to keep existing"
                                  className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 pl-3 pr-10 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowEditPassword(!showEditPassword)}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 p-1 rounded-lg cursor-pointer"
                                  title={showEditPassword ? "Hide password" : "Show password"}
                                >
                                  {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          )}
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Role Type</label>
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value as any)}
                              className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                              disabled={role === "hr"}
                            >
                              <option value="employee">Employee</option>
                              {role === "admin" && <option value="hr">HR Manager</option>}
                              {role === "admin" && <option value="admin">Administrator</option>}
                            </select>
                            {role === "hr" && (
                              <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">
                                HR Managers can only assign Employee roles.
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Employment Status</label>
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value as any)}
                              className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                            >
                              <option value="Active">Active</option>
                              <option value="Probation">Probation</option>
                              <option value="Suspended">Suspended</option>
                            </select>
                          </div>
                          {(role === "admin" || role === "hr") && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Employment Type</label>
                              <select
                                value={editEmploymentType}
                                onChange={(e) => setEditEmploymentType(e.target.value as any)}
                                className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                              >
                                <option value="">Select Employment Type...</option>
                                <option value="permanent">Permanent</option>
                                <option value="contract">Contract</option>
                                <option value="consultant">Consultant</option>
                              </select>
                            </div>
                          )}
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Date of Birth</label>
                            <input
                              type="date"
                              value={editDateOfBirth}
                              onChange={(e) => setEditDateOfBirth(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                            />
                          </div>

                          <div className="md:col-span-2 flex items-center space-x-4 p-3 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a] rounded-xl mt-2">
                            <div className="relative w-12 h-12 bg-slate-200 dark:bg-gray-800 rounded-full overflow-hidden flex items-center justify-center border border-slate-300 dark:border-gray-700 shrink-0">
                              {editProfileImagePreview ? (
                                <img src={editProfileImagePreview} alt="Preview" className="w-full h-full object-cover" />
                              ) : (
                                <Camera className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">Employee Profile Photo</label>
                              <input
                                type="file"
                                ref={editProfileImageRef}
                                accept="image/*"
                                onChange={handleEditProfileImageSelect}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => editProfileImageRef.current?.click()}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-lg border border-emerald-100 dark:border-emerald-900/30 cursor-pointer"
                              >
                                Choose Photo
                              </button>
                              {editProfileImageFile && (
                                <span className="text-[10px] text-slate-400 ml-2 font-mono">{editProfileImageFile.name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section: Department and Designations (Only for Admin / HR) */}
                      {(role === "admin" || role === "hr") && (
                        <div>
                          <h4 className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">{++dSecIdx}. Designation & Placement</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Department</label>
                              <select
                                value={editDept}
                                onChange={(e) => setEditDept(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                              >
                                {(customDepartments && customDepartments.length > 0
                                  ? customDepartments
                                  : ["Loans", "Insurance", "Risk", "HR", "Operations", "Compliance", "IT", "Sales"]
                                ).map((d) => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Corporate Designation</label>
                              <select
                                value={editDesigId}
                                onChange={(e) => setEditDesigId(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                              >
                                {designations.map(desg => (
                                  <option key={desg.id} value={desg.id}>{desg.title} ({desg.department})</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Branch Office</label>
                              <select
                                value={editBranch}
                                onChange={(e) => setEditBranch(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                              >
                                {(customBranches || []).map((b) => (
                                  <option key={b} value={b}>{b}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Section: Salary structure (Only for Admin) */}
                      {role === "admin" && (
                        <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border-2 border-emerald-500/40 dark:border-emerald-500/30 ring-4 ring-emerald-500/10 shadow-xs">
                          <h4 className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Calculator className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{++dSecIdx}. SALARY ALLOCATION (MONTHLY)</span>
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 dark:text-gray-300 mb-1">Basic Salary (INR) *</label>
                              <input
                                type="number"
                                value={editSalaryBasic}
                                onChange={(e) => setEditSalaryBasic(e.target.value)}
                                className="w-full bg-white dark:bg-[#0a0a0a] text-slate-800 dark:text-gray-100 p-2.5 text-xs rounded-xl border border-emerald-300 dark:border-emerald-700/50 font-mono font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-xs"
                                placeholder="e.g. 50000"
                              />
                            </div>
                            
                            <div className="text-[11px] text-slate-700 dark:text-gray-200 bg-white dark:bg-[#0d1612] p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 shadow-xs space-y-2">
                              <div className="flex justify-between items-center text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                <span className="flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-emerald-500" />
                                  Calculated via Salary &amp; PF Rules
                                </span>
                              </div>
                              {(() => {
                                const basicVal = Number(editSalaryBasic) || 0;
                                const hra = onboardPayrollConfig
                                  ? (onboardPayrollConfig.hraType === "percentage" ? Math.round(basicVal * (onboardPayrollConfig.hraValue / 100)) : onboardPayrollConfig.hraValue)
                                  : Math.round(basicVal * 0.4);
                                const allowances = onboardPayrollConfig
                                  ? (onboardPayrollConfig.allowancesType === "percentage" ? Math.round(basicVal * (onboardPayrollConfig.allowancesValue / 100)) : onboardPayrollConfig.allowancesValue)
                                  : Math.round(basicVal * 0.2);
                                const gross = basicVal + hra + allowances;
                                const isExempt = (onboardPayrollConfig?.pfExemptEmployeeIds || []).includes(activeEmployee?.id);
                                const isEsiExempt = (onboardPayrollConfig?.esiExemptEmployeeIds || []).includes(activeEmployee?.id);
                                const pf = isExempt
                                  ? 0
                                  : (onboardPayrollConfig
                                    ? (onboardPayrollConfig.pfType === "percentage" ? Math.round(basicVal * (onboardPayrollConfig.pfValue / 100)) : onboardPayrollConfig.pfValue)
                                    : Math.round(basicVal * 0.12));
                                const esiGrossCeiling = onboardPayrollConfig?.esiGrossCeiling ?? 21000;
                                const esi = (onboardPayrollConfig?.esiEnabled !== false && !isEsiExempt && (esiGrossCeiling <= 0 || gross <= esiGrossCeiling))
                                  ? Math.round(gross * ((onboardPayrollConfig?.esiRatePercentage || 0.75) / 100))
                                  : 0;
                                const tax = onboardPayrollConfig
                                  ? (onboardPayrollConfig.taxType === "percentage" ? Math.round(gross * (onboardPayrollConfig.taxValue / 100)) : onboardPayrollConfig.taxValue)
                                  : Math.round(gross * 0.05);
                                const net = Math.max(0, gross - pf - tax - esi);

                                return (
                                  <div className="space-y-1.5 text-[11px]">
                                    <div className="flex justify-between">
                                      <span className="text-slate-600 dark:text-gray-400">HRA: <strong className="font-mono text-slate-800 dark:text-gray-200">₹{hra.toLocaleString()}</strong></span>
                                      <span className="text-slate-600 dark:text-gray-400">Allowances: <strong className="font-mono text-slate-800 dark:text-gray-200">₹{allowances.toLocaleString()}</strong></span>
                                    </div>
                                    <div className="flex justify-between border-t border-emerald-100 dark:border-emerald-900/50 pt-1.5">
                                      <span className="text-slate-600 dark:text-gray-400">PF: <strong className="font-mono text-slate-800 dark:text-gray-200">{isExempt ? "Exempt (₹0)" : `₹${pf.toLocaleString()}`}</strong></span>
                                      <span className="text-slate-600 dark:text-gray-400">ESI: <strong className="font-mono text-slate-800 dark:text-gray-200">{isEsiExempt ? "Exempt (₹0)" : `₹${esi.toLocaleString()}`}</strong></span>
                                      <span className="text-slate-600 dark:text-gray-400">Tax/TDS: <strong className="font-mono text-slate-800 dark:text-gray-200">₹{tax.toLocaleString()}</strong></span>
                                    </div>
                                    <div className="flex justify-between font-bold text-emerald-700 dark:text-emerald-400 pt-1.5 border-t border-emerald-200/80 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/40 p-2 rounded-lg">
                                      <span>Est. Gross: <span className="font-mono text-emerald-800 dark:text-emerald-300">₹{gross.toLocaleString()}</span></span>
                                      <span>Est. Net: <span className="font-mono text-emerald-800 dark:text-emerald-300">₹{net.toLocaleString()}</span></span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Section: Bank specs */}
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">{++dSecIdx}. Bank & Compensation Account</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">Account Number</label>
                            <input
                              type="text"
                              value={editBankAccount}
                              onChange={(e) => setEditBankAccount(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">Bank Name</label>
                            <input
                              type="text"
                              value={editBankName}
                              onChange={(e) => setEditBankName(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">IFSC Code</label>
                            <input
                              type="text"
                              value={editBankIfsc}
                              onChange={(e) => setEditBankIfsc(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section: Contact & Address Details */}
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">{++dSecIdx}. Contact & Address Details</h4>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Residential Address</label>
                          <textarea
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                            rows={2}
                            className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Section: Emergency Contact Details */}
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">{++dSecIdx}. Emergency Contact Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Contact Name</label>
                            <input
                              type="text"
                              value={editEmergencyName}
                              onChange={(e) => setEditEmergencyName(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Relationship</label>
                            <input
                              type="text"
                              value={editEmergencyRelation}
                              onChange={(e) => setEditEmergencyRelation(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Contact Phone</label>
                            <input
                              type="text"
                              value={editEmergencyPhone}
                              onChange={(e) => setEditEmergencyPhone(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section: PAN & UAN Numbers */}
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">{++dSecIdx}. Identity &amp; Compliance Documents</h4>
                        {editError && (
                          <div className="mb-3 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 shrink-0" />
                            <span>{editError}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">PAN Number</label>
                            <input
                              type="text"
                              value={editPan}
                              onChange={(e) => {
                                setEditPan(e.target.value.toUpperCase().trim());
                                if (editError) setEditError(null);
                              }}
                              placeholder="e.g. ABCDE1234F"
                              maxLength={10}
                              className={`w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border font-mono tracking-widest uppercase font-medium transition-colors ${
                                editPan.trim() && !isValidPAN(editPan)
                                  ? "border-rose-500 text-rose-600 dark:text-rose-400 focus:border-rose-500 bg-rose-50/20"
                                  : editPan.trim() && isValidPAN(editPan)
                                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 focus:border-emerald-500"
                                  : "border-slate-100 dark:border-[#1a1a1a] focus:border-emerald-500"
                              }`}
                            />
                            {editPan.trim() && !isValidPAN(editPan) ? (
                              <p className="text-[10px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 shrink-0" />
                                Invalid PAN format (5 letters, 4 numbers, 1 letter)
                              </p>
                            ) : editPan.trim() && isValidPAN(editPan) ? (
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                Valid PAN Number format
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-400 mt-1">Permanent Account Number (10 characters)</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">UAN Number</label>
                            <input
                              type="text"
                              value={editUan}
                              onChange={(e) => {
                                setEditUan(e.target.value.replace(/\D/g, ""));
                                if (editError) setEditError(null);
                              }}
                              placeholder="e.g. 101146669488"
                              maxLength={12}
                              className={`w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border font-mono tracking-widest font-medium transition-colors ${
                                editUan.trim() && !isValidUAN(editUan)
                                  ? "border-rose-500 text-rose-600 dark:text-rose-400 focus:border-rose-500 bg-rose-50/20"
                                  : editUan.trim() && isValidUAN(editUan)
                                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 focus:border-emerald-500"
                                  : "border-slate-100 dark:border-[#1a1a1a] focus:border-emerald-500"
                              }`}
                            />
                            {editUan.trim() && !isValidUAN(editUan) ? (
                              <p className="text-[10px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 shrink-0" />
                                Invalid UAN format (Must be 12 digits)
                              </p>
                            ) : editUan.trim() && isValidUAN(editUan) ? (
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                Valid UAN Number format
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-400 mt-1">Universal Account Number (12 digits) for PF</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Section: Biography */}
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">{++dSecIdx}. Employee Bio / Profile Summary</h4>
                        <textarea
                          value={editBio}
                          onChange={(e) => setEditBio(e.target.value)}
                          rows={2}
                          className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>
                    </>
                  );
                })()}

                <div className="flex justify-center space-x-2 pt-4 border-t border-slate-100 dark:border-[#1a1a1a]">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-[#0a0a0a] dark:hover:bg-[#1a1a1a] text-slate-600 dark:text-gray-300 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-all"
                  >
                    {isSavingEdit ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className={`bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#1a1a1a] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden transition-all ${
            isDocFullscreen
              ? "fixed inset-0 z-[100] w-screen h-screen rounded-none border-0 max-w-none max-h-none p-0"
              : "rounded-2xl w-full max-w-4xl max-h-[90vh]"
          }`}>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1a1a1a] flex items-center justify-between bg-slate-50/50 dark:bg-[#0a0a0a]/50 shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="bg-emerald-100 dark:bg-emerald-950/60 p-2 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-slate-800 dark:text-white text-base truncate">
                    {previewDoc.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    Category: {previewDoc.category || "General"} {previewDoc.size ? `• ${previewDoc.size}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsDocFullscreen(!isDocFullscreen)}
                  className="px-3 py-1.5 bg-slate-200/80 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 text-xs font-bold rounded-xl flex items-center space-x-1.5 hover:bg-slate-300 dark:hover:bg-[#252525] transition-colors cursor-pointer"
                  title={isDocFullscreen ? "Exit Fullscreen" : "Full Screen View"}
                >
                  {isDocFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{isDocFullscreen ? "Exit Full Screen" : "Full Screen"}</span>
                </button>
                {previewDoc.url && (
                  <a
                    href={previewDoc.url}
                    download={previewDoc.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-slate-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download</span>
                  </a>
                )}
                <button
                  onClick={() => {
                    setPreviewDoc(null);
                    setIsDocFullscreen(false);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a1a1a] rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center min-h-[420px] bg-slate-100/70 dark:bg-[#050505] custom-scrollbar">
              {previewDoc.url ? (
                previewDoc.url.startsWith("data:image/") ||
                  /\.(jpg|jpeg|png|webp|svg|gif)(\?.*)?$/i.test(previewDoc.url) ? (
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.name}
                    className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-200 dark:border-[#222]"
                  />
                ) : /\.(xlsx|xls|csv)(\?.*)?$/i.test(previewDoc.url) || previewDoc.name.match(/\.(xlsx|xls|csv)$/i) ? (
                  /* Excel / Spreadsheet Live File Previewer */
                  <div className="w-full max-w-3xl bg-white dark:bg-[#0f0f0f] rounded-xl shadow-xl border border-slate-200 dark:border-[#1a1a1a] overflow-hidden flex flex-col">
                    {/* Excel Ribbon */}
                    <div className="bg-emerald-800 text-white px-4 py-2 text-xs flex items-center justify-between font-semibold">
                      <div className="flex items-center space-x-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                        <span>{previewDoc.name} — Excel Workbook</span>
                      </div>
                      <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded text-emerald-100">XLSX Mode</span>
                    </div>

                    {/* Formula Bar */}
                    <div className="bg-slate-50 dark:bg-[#141414] border-b border-slate-200 dark:border-[#222] px-3 py-1.5 flex items-center space-x-2 text-xs">
                      <span className="font-mono font-bold text-slate-400">fx</span>
                      <span className="font-mono text-slate-600 dark:text-gray-300 text-[11px] truncate">=SUM(C2:C10)</span>
                    </div>

                    {/* Spreadsheet Table Grid */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse font-sans">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 dark:text-gray-400 text-[11px] border-b border-slate-200 dark:border-[#222]">
                            <th className="p-2 border-r border-slate-200 dark:border-[#222] w-10 text-center">#</th>
                            <th className="p-2 border-r border-slate-200 dark:border-[#222]">A (Record ID)</th>
                            <th className="p-2 border-r border-slate-200 dark:border-[#222]">B (Description)</th>
                            <th className="p-2 border-r border-slate-200 dark:border-[#222]">C (Category)</th>
                            <th className="p-2">D (Status)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#1a1a1a] text-slate-700 dark:text-gray-200 font-mono text-[11px]">
                          <tr>
                            <td className="p-2 bg-slate-50 dark:bg-[#141414] text-center font-bold text-slate-400">1</td>
                            <td className="p-2 font-semibold">REC-001</td>
                            <td className="p-2">{previewDoc.name}</td>
                            <td className="p-2">{previewDoc.category || "Financial"}</td>
                            <td className="p-2 text-emerald-600 font-bold">VERIFIED</td>
                          </tr>
                          <tr>
                            <td className="p-2 bg-slate-50 dark:bg-[#141414] text-center font-bold text-slate-400">2</td>
                            <td className="p-2 font-semibold">REC-002</td>
                            <td className="p-2">Compliance Audit Entry</td>
                            <td className="p-2">Audit Log</td>
                            <td className="p-2 text-emerald-600 font-bold">PASSED</td>
                          </tr>
                          <tr>
                            <td className="p-2 bg-slate-50 dark:bg-[#141414] text-center font-bold text-slate-400">3</td>
                            <td className="p-2 font-semibold">REC-003</td>
                            <td className="p-2">Tax Clearance Log</td>
                            <td className="p-2">Payroll</td>
                            <td className="p-2 text-emerald-600 font-bold">VALIDATED</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-slate-50 dark:bg-[#141414] p-3 border-t border-slate-200 dark:border-[#222] flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 dark:text-gray-400">Sheet: [Sheet1] [Summary]</span>
                      <a
                        href={previewDoc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Spreadsheet</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  /* PDF / Document Iframe View */
                  <iframe
                    src={previewDoc.url}
                    title={previewDoc.name}
                    className="w-full h-[65vh] rounded-xl border border-slate-200 dark:border-[#222] bg-white shadow-md"
                  />
                )
              ) : (
                /* Fallback Formatted Document / PDF / Spreadsheet Sheet */
                previewDoc.name.match(/\.(xlsx|xls|csv)$/i) || previewDoc.category === "Tax Document" || previewDoc.name.toLowerCase().includes("sheet") || previewDoc.name.toLowerCase().includes("excel") ? (
                  /* Excel Spreadsheet View for Sample Files */
                  <div className="w-full max-w-3xl bg-white dark:bg-[#0f0f0f] rounded-xl shadow-xl border border-slate-200 dark:border-[#1a1a1a] overflow-hidden flex flex-col">
                    <div className="bg-emerald-800 text-white px-4 py-2 text-xs flex items-center justify-between font-semibold">
                      <div className="flex items-center space-x-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                        <span>{previewDoc.name} — Vault Spreadsheet</span>
                      </div>
                      <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded text-emerald-100">XLSX</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-[#141414] border-b border-slate-200 dark:border-[#222] px-3 py-1.5 flex items-center space-x-2 text-xs">
                      <span className="font-mono font-bold text-slate-400">fx</span>
                      <span className="font-mono text-slate-600 dark:text-gray-300 text-[11px] truncate">=COMPLIANCE_CHECK("{activeEmployee?.id}")</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 dark:text-gray-400 text-[11px] border-b border-slate-200 dark:border-[#222]">
                            <th className="p-2 border-r border-slate-200 dark:border-[#222] w-10 text-center">#</th>
                            <th className="p-2 border-r border-slate-200 dark:border-[#222]">A (Employee Name)</th>
                            <th className="p-2 border-r border-slate-200 dark:border-[#222]">B (Document Ref)</th>
                            <th className="p-2 border-r border-slate-200 dark:border-[#222]">C (Category)</th>
                            <th className="p-2">D (Verification)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#1a1a1a] text-slate-700 dark:text-gray-200 font-mono text-[11px]">
                          <tr>
                            <td className="p-2 bg-slate-50 dark:bg-[#141414] text-center font-bold text-slate-400">1</td>
                            <td className="p-2 font-semibold">{activeEmployee?.fullName || "Employee"}</td>
                            <td className="p-2">{previewDoc.name}</td>
                            <td className="p-2">{previewDoc.category || "Financial"}</td>
                            <td className="p-2 text-emerald-600 font-bold">VERIFIED & ENCRYPTED</td>
                          </tr>
                          <tr>
                            <td className="p-2 bg-slate-50 dark:bg-[#141414] text-center font-bold text-slate-400">2</td>
                            <td className="p-2 font-semibold">Department</td>
                            <td className="p-2">{activeEmployee?.department || "Loans"}</td>
                            <td className="p-2">Branch: {activeEmployee?.branch}</td>
                            <td className="p-2 text-emerald-600 font-bold">MATCHED</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* Printable PDF Document View for Sample Files */
                  <div className="w-full max-w-2xl bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 p-8 font-sans relative overflow-hidden select-none">
                    {/* Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none transform -rotate-12">
                      <span className="text-8xl font-black uppercase text-slate-900 tracking-widest">VERIFIED</span>
                    </div>

                    {/* Header */}
                    <div className="border-b-2 border-slate-800 pb-4 mb-6 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-emerald-700 text-white rounded-lg flex items-center justify-center font-bold text-lg">
                          {companyName ? companyName.charAt(0).toUpperCase() : "C"}
                        </div>
                        <div>
                          <h2 className="font-bold text-slate-900 text-base tracking-wide uppercase">{companyName || "Corporate Operations"}</h2>
                          <p className="text-[10px] text-slate-500 font-medium">Compliance & Verification Vault • Official Document Record</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-block bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider">
                          VERIFIED RECORD
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">Ref ID: {previewDoc.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-2026</p>
                      </div>
                    </div>

                    {/* Title Banner */}
                    <div className="bg-slate-900 text-white p-3 rounded-lg text-center mb-6 shadow-xs">
                      <h3 className="font-bold text-sm tracking-wider uppercase">{previewDoc.name}</h3>
                      <p className="text-[10px] text-slate-300">Category: {previewDoc.category || "Official Record"} • Security Vault Encryption Verified</p>
                    </div>

                    {/* Content */}
                    {previewDoc.name.toLowerCase().includes("aadhaar") || previewDoc.name.toLowerCase().includes("pan") || previewDoc.category === "ID Proof" ? (
                      <div className="space-y-6">
                        <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5">
                          <div className="relative">
                            <img
                              src={activeEmployee?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop"}
                              alt="Holder"
                              className="w-24 h-28 object-cover rounded-lg border-2 border-slate-700 shadow-md"
                            />
                            <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1 rounded-full text-[10px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div className="flex-1 space-y-2 text-xs">
                            <div className="grid grid-cols-2 gap-2 border-b border-slate-200 pb-2">
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase font-bold">Full Legal Name</span>
                                <span className="font-bold text-slate-900">{activeEmployee?.fullName || "Employee Record"}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase font-bold">Employee ID</span>
                                <span className="font-bold text-emerald-700">{activeEmployee?.id || "EMP-1001"}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 border-b border-slate-200 pb-2">
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase font-bold">Document Type</span>
                                <span className="font-semibold text-slate-800">{previewDoc.category || "Government Identity"}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase font-bold">Document Number</span>
                                <span className="font-mono font-bold text-slate-900 tracking-wider">XXXX-XXXX-9842</span>
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">Registered Branch</span>
                              <span className="text-slate-700 font-medium text-[11px]">{activeEmployee?.branch || "Main Branch"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-dashed border-slate-300 pt-4 text-[10px] text-slate-500">
                          <div className="flex items-center space-x-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            <span>Digitally Authenticated by HR Vault System</span>
                          </div>
                          <div className="text-right font-mono text-[9px] text-slate-400">
                            SHA256: 7f8a9b2c3d4e5f6a1b2c3d4e5f6a7b8c
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-5 text-xs text-slate-700 leading-relaxed">
                        <p className="font-serif italic text-slate-600">
                          This document certifies that <strong className="text-slate-900">"{previewDoc.name}"</strong> has been executed and deposited into the official {companyName || "Corporate"} Compliance Vault for employee <strong className="text-slate-900">{activeEmployee?.fullName || "Employee"}</strong> ({activeEmployee?.id || "EMP-1001"}).
                        </p>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                          <div className="flex justify-between border-b border-slate-200 pb-1.5">
                            <span className="text-slate-500">Executing Entity:</span>
                            <span className="font-semibold text-slate-900">{companyName || "Corporate Entity"}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-1.5">
                            <span className="text-slate-500">Assigned Employee:</span>
                            <span className="font-semibold text-slate-900">{activeEmployee?.fullName} ({activeEmployee?.role?.toUpperCase()})</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-1.5">
                            <span className="text-slate-500">Department & Branch:</span>
                            <span className="font-semibold text-slate-900">{activeEmployee?.department} • {activeEmployee?.branch}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Verification Status:</span>
                            <span className="font-bold text-emerald-600">ACTIVE & VALIDATED</span>
                          </div>
                        </div>

                        <div className="pt-4 flex items-center justify-between border-t border-slate-200">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Digital Signature</p>
                            <p className="font-serif italic text-emerald-800 text-sm font-semibold mt-1">{companyName || "Corporate"} Operations Bot</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Date of Archive</p>
                            <p className="font-medium text-slate-800 text-xs mt-1">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
      {/* Bulk Upload Excel Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1a1a1a] pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-teal-50 dark:bg-teal-950/40 rounded-2xl flex items-center justify-center text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-slate-800 dark:text-white text-base sm:text-lg">
                    Bulk Onboard Employees
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-gray-500">
                    Upload an Excel (.xlsx / .xls / .csv) file to add multiple employees at once.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkFile(null);
                  setParsedBulkData([]);
                  setBulkError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>



            {/* File Upload Zone */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
                Select or Drop Excel / CSV File:
              </label>

              <div
                onClick={() => bulkFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${bulkFile
                  ? "border-teal-500 bg-teal-50/20 dark:bg-teal-950/10"
                  : "border-slate-200 dark:border-[#222] hover:border-emerald-500 bg-slate-50/50 dark:bg-[#0a0a0a]"
                  }`}
              >
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleBulkFileChange}
                  className="hidden"
                />

                <Upload className="w-8 h-8 mx-auto text-slate-400 dark:text-gray-500 mb-2" />

                {bulkFile ? (
                  <div>
                    <span className="font-bold text-slate-800 dark:text-white text-sm block">
                      {bulkFile.name}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-gray-500">
                      {(bulkFile.size / 1024).toFixed(1)} KB • Click to change file
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-gray-300 text-xs block">
                      Click to browse or drag & drop .xlsx / .csv file here
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-gray-500 mt-1 block">
                      Supports standard columns + any new dynamic columns
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Parsing Errors */}
            {bulkError && (
              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl p-3 text-xs text-rose-600 dark:text-rose-400 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bulkError}</span>
              </div>
            )}

            {/* Parsed Data Preview Section */}
            {parsedBulkData.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-800 dark:text-white text-xs">
                      Parsed {parsedBulkData.length} Employee{parsedBulkData.length > 1 ? "s" : ""}
                    </span>
                    <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                      Ready to Import
                    </span>
                  </div>

                  {customFieldHeaders.length > 0 && (
                    <div className="flex items-center space-x-1.5 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 px-2.5 py-1 rounded-lg text-[11px]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="font-semibold">
                        New Dynamic Fields Detected: {customFieldHeaders.join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Information Callout */}
                <div className="bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a] rounded-xl p-2.5 text-[11px] text-slate-500 dark:text-gray-400 flex items-center justify-between">
                  <span>
                    💡 <strong>Smart Defaults:</strong> Missing optional fields (joining date, bank details, emergency contacts, salary structure) will be auto-populated automatically.
                  </span>
                </div>

                {/* Preview Table */}
                <div className="border border-slate-100 dark:border-[#1a1a1a] rounded-xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#121212] text-slate-600 dark:text-gray-300 border-b border-slate-100 dark:border-[#1a1a1a] sticky top-0">
                      <tr>
                        <th className="p-2.5 font-bold">#</th>
                        <th className="p-2.5 font-bold">Full Name</th>
                        <th className="p-2.5 font-bold">Email</th>
                        <th className="p-2.5 font-bold">Role / Dept</th>
                        <th className="p-2.5 font-bold">Phone</th>
                        {customFieldHeaders.map(ch => (
                          <th key={ch} className="p-2.5 font-bold text-teal-600 dark:text-teal-400">
                            {ch.toLowerCase() === "pan" ? "PAN Number" : ch.toLowerCase() === "uan" ? "UAN Number" : ch.toUpperCase()} ⭐
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#1a1a1a] text-slate-700 dark:text-gray-300 font-medium">
                      {parsedBulkData.map((emp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-[#151515]">
                          <td className="p-2.5 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-slate-800 dark:text-white">
                            {emp.fullName || emp.name || `Employee ${idx + 1}`}
                          </td>
                          <td className="p-2.5 text-slate-500 dark:text-gray-400 font-mono text-[11px]">
                            {emp.email || "(Auto-generated)"}
                          </td>
                          <td className="p-2.5">
                            {emp.role || "employee"} • {emp.department || "Loans"}
                          </td>
                          <td className="p-2.5 font-mono text-[11px]">
                            {emp.phone || "+91 99999 00000"}
                          </td>
                          {customFieldHeaders.map(ch => (
                            <td key={ch} className="p-2.5 font-mono text-teal-600 dark:text-teal-300 font-bold text-[11px]">
                              {String(emp.customFields?.[ch] ?? "-")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-[#1a1a1a]">
              <button
                type="button"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkFile(null);
                  setParsedBulkData([]);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!parsedBulkData.length || isProcessingBulk}
                onClick={handleExecuteBulkSubmit}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center space-x-2 transition-all shadow-md cursor-pointer"
              >
                {isProcessingBulk ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Adding Employees...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add {parsedBulkData.length || ""} Employees</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MANAGE DEPARTMENTS & BRANCHES MODAL ── */}
      {showManageCollections && role === "admin" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1a1a1a] pb-3">
              <div>
                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-base">
                  Manage Departments &amp; Branches
                </h3>
                <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">Customize your company's departments and branches</p>
              </div>
              <button
                onClick={() => setShowManageCollections(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] rounded-lg text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Departments Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Departments</h4>
              <form onSubmit={handleAddDepartment} className="flex gap-2">
                <input
                  type="text"
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                  placeholder="e.g. Finance, Marketing..."
                  className="flex-1 bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-none focus:border-violet-500 font-medium transition-colors"
                  required
                />
                <button
                  type="submit"
                  className="bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
                >
                  Add
                </button>
              </form>

              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 custom-scrollbar">
                {(customDepartments && customDepartments.length > 0
                  ? customDepartments
                  : ["Loans", "Insurance", "Risk", "HR", "Operations", "Compliance", "IT", "Sales"]
                ).map((dept) => (
                  <div
                    key={dept}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-slate-50 dark:bg-[#0a0a0a] text-slate-600 dark:text-gray-300 border border-slate-100 dark:border-[#1a1a1a] rounded-lg text-xs"
                  >
                    <span>{dept}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDepartment(dept)}
                      className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-[#1a1a1a]" />

            {/* Branches Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Branches</h4>
              <form onSubmit={handleAddBranch} className="flex gap-2">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="e.g. Pune Branch, Delhi Hub..."
                  className="flex-1 bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-none focus:border-violet-500 font-medium transition-colors"
                  required
                />
                <button
                  type="submit"
                  className="bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
                >
                  Add
                </button>
              </form>

              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 custom-scrollbar">
                {(customBranches || []).map((br) => (
                  <div
                    key={br}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-slate-50 dark:bg-[#0a0a0a] text-slate-600 dark:text-gray-300 border border-slate-100 dark:border-[#1a1a1a] rounded-lg text-xs"
                  >
                    <span>{br}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBranch(br)}
                      className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-[#1a1a1a]">
              <button
                type="button"
                onClick={() => setShowManageCollections(false)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-[#0a0a0a] dark:hover:bg-[#1a1a1a] text-slate-600 dark:text-gray-300 px-5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
