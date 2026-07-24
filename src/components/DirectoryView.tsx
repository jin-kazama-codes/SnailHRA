"use client";

import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Search, UserPlus, FileText, CheckCircle2, XCircle,
  Trash2, Mail, Phone, Briefcase, Calendar, ChevronRight,
  Eye, FileUp, ShieldCheck, AlertCircle, Sparkles, Building, MapPin, Landmark, Pencil,
  Camera, Download, X, RefreshCw, ExternalLink, FileSpreadsheet, Table, Upload, Plus, Layers,
  ArrowLeft, History, Clock, User, Check
} from "lucide-react";
import { Employee, Designation, UserRole, EmployeeDocument, OnboardingTask, ExcelUploadRecord } from "../types";

interface DirectoryViewProps {
  employees: Employee[];
  designations: Designation[];
  role: UserRole;
  currentUserId: string;
  customDepartments?: string[];
  customBranches?: string[];
  onOnboardEmployee: (empData: any) => void;
  onBulkOnboardEmployee?: (payload: { employees: any[]; filename?: string; fileData?: string } | any[]) => Promise<void> | void;
  onUpdateEmployee: (id: string, updatedData: any) => Promise<void> | void;
  onAddDocument: (empId: string, docData: any) => void;
  onDeleteDocument: (empId: string, docId: string) => void;
  onToggleOnboardingTask: (empId: string, taskId: string, completed: boolean) => void;
}

export default function DirectoryView({
  employees,
  designations,
  role,
  currentUserId,
  customDepartments,
  customBranches,
  onOnboardEmployee,
  onBulkOnboardEmployee,
  onUpdateEmployee,
  onAddDocument,
  onDeleteDocument,
  onToggleOnboardingTask
}: DirectoryViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [activeEmpId, setActiveEmpId] = useState<string | null>(employees[0]?.id || null);
  const [showOnboardForm, setShowOnboardForm] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string; category?: string; size?: string } | null>(null);
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

  useEffect(() => {
    if (viewMode === "bulk_upload") {
      fetchUploadHistory();
    }
  }, [viewMode]);

  // Generate & Download Shareable Dummy Sample Excel File
  const downloadSampleTemplate = () => {
    const headers = [
      "Full Name", "Email", "Phone", "Role", "Department", "Branch",
      "Designation", "Joining Date", "Status", "Basic Salary", "HRA",
      "Allowances", "PF Deduction", "Bank Name", "Account Number",
      "IFSC Code", "Address", "Emergency Contact Name", "Emergency Contact Relation",
      "Emergency Contact Phone", "Password", "Blood Group", "PAN Number"
    ];

    const sampleRow1 = {
      "Full Name": "Amit Kumar Sharma",
      "Email": "amit.sharma@mgmfinanciers.com",
      "Phone": "+91 98765 12345",
      "Role": "employee",
      "Department": "Loans",
      "Branch": "Mumbai Branch",
      "Designation": "Senior Loan Officer",
      "Joining Date": "2026-07-01",
      "Status": "Active",
      "Basic Salary": 50000,
      "HRA": 20000,
      "Allowances": 12000,
      "PF Deduction": 3600,
      "Bank Name": "HDFC Bank",
      "Account Number": "50100234567891",
      "IFSC Code": "HDFC0001234",
      "Address": "Flat 402, Sunshine Towers, Andheri East, Mumbai",
      "Emergency Contact Name": "Sunita Sharma",
      "Emergency Contact Relation": "Spouse",
      "Emergency Contact Phone": "+91 98765 99999",
      "Password": "MGM@1234",
      "Blood Group": "B+",
      "PAN Number": "ABCDE1234F"
    };

    const sampleRow2 = {
      "Full Name": "Kavita Reddy",
      "Email": "kavita.reddy@mgmfinanciers.com",
      "Phone": "+91 91234 56789",
      "Role": "employee",
      "Department": "Risk",
      "Branch": "Noida HQ",
      "Designation": "Risk Analyst",
      "Joining Date": "2026-07-15",
      "Status": "Active",
      "Basic Salary": 45000,
      "HRA": 18000,
      "Allowances": 9000,
      "PF Deduction": 3200,
      "Bank Name": "ICICI Bank",
      "Account Number": "000401567890",
      "IFSC Code": "ICIC0000004",
      "Address": "Sector 62, Noida, UP",
      "Emergency Contact Name": "Rajesh Reddy",
      "Emergency Contact Relation": "Father",
      "Emergency Contact Phone": "+91 91234 00000",
      "Password": "MGM@1234",
      "Blood Group": "O+",
      "PAN Number": "XYZPK9876L"
    };

    const worksheet = XLSX.utils.json_to_sheet([sampleRow1, sampleRow2], { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Import Template");
    XLSX.writeFile(workbook, "MGM_Employee_Import_Template.xlsx");
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
        designation: "designationTitle", designationtitle: "designationTitle", title: "designationTitle",
        joiningdate: "joiningDate", dateofjoining: "joiningDate", joining_date: "joiningDate", doj: "joiningDate",
        status: "status", employeestatus: "status",
        basicsalary: "salaryBasic", basic: "salaryBasic", salarybasic: "salaryBasic",
        hra: "salaryHra", hraallowance: "salaryHra", salaryhra: "salaryHra",
        allowances: "salaryAllowances", otherallowances: "salaryAllowances", salaryallowances: "salaryAllowances",
        pfdeduction: "salaryPf", pf: "salaryPf", salarypf: "salaryPf",
        bankname: "bankName", bank: "bankName",
        accountnumber: "bankAccount", bankaccount: "bankAccount", bankaccountnumber: "bankAccount",
        ifsc: "bankIfsc", ifsccode: "bankIfsc", bankifsc: "bankIfsc",
        address: "address", residentialaddress: "address",
        emergencycontactname: "emergencyName", emergencyname: "emergencyName", contactperson: "emergencyName",
        emergencycontactrelation: "emergencyRelation", emergencyrelation: "emergencyRelation", relation: "emergencyRelation",
        emergencycontactphone: "emergencyPhone", emergencyphone: "emergencyPhone",
        password: "password"
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
  const [editBankAccount, setEditBankAccount] = useState("");
  const [editBankName, setEditBankName] = useState("");
  const [editBankIfsc, setEditBankIfsc] = useState("");
  const [editEmergencyName, setEditEmergencyName] = useState("");
  const [editEmergencyRelation, setEditEmergencyRelation] = useState("");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("");

  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>("");
  const [profileImageUrl, setProfileImageUrl] = useState<string>("");
  const profileImageRef = useRef<HTMLInputElement>(null);

  const [editProfileImageFile, setEditProfileImageFile] = useState<File | null>(null);
  const [editProfileImagePreview, setEditProfileImagePreview] = useState<string>("");
  const editProfileImageRef = useRef<HTMLInputElement>(null);

  // Onboard form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [empRole, setEmpRole] = useState<UserRole>("employee");
  const [selectedDesgId, setSelectedDesgId] = useState(designations[0]?.id || "");
  const [department, setDepartment] = useState("Loans");
  const [onboardBranch, setOnboardBranch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [joiningDate, setJoiningDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [salaryBasic, setSalaryBasic] = useState("45000");
  const [salaryHra, setSalaryHra] = useState("18000");
  const [salaryAllowances, setSalaryAllowances] = useState("10000");
  const [salaryPf, setSalaryPf] = useState("3200");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("State Bank of India");
  const [bankIfsc, setBankIfsc] = useState("");
  const [address, setAddress] = useState("");
  const [bio, setBio] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  const loggedInUser = employees.find(e => e.id === currentUserId) || employees[0];
  const userBranch = loggedInUser?.branch || "Mumbai Branch";

  const accessibleEmployees = role === "admin"
    ? employees
    : role === "hr"
      ? employees.filter(e => (e.branch || "Mumbai Branch") === userBranch && e.role !== "admin")
      : employees.filter(e => e.id === currentUserId);

  const activeEmployee = accessibleEmployees.find(e => e.id === activeEmpId) || accessibleEmployees[0];

  const filteredEmployees = accessibleEmployees.filter(emp => {
    const matchesSearch = emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === "All" || emp.department === selectedDept;
    const matchesBranch = selectedBranch === "All" || (emp.branch || "Mumbai Branch") === selectedBranch;
    return matchesSearch && matchesDept && matchesBranch;
  });

  const getDesignationTitle = (id: string) => {
    return designations.find(d => d.id === id)?.title || "Specialist";
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      return;
    }

    let avatarUrl = "";
    if (profileImageFile) {
      avatarUrl = await uploadProfileImage();
    }

    const data = {
      fullName, email, phone, role: empRole, designationId: selectedDesgId, department,
      branch: onboardBranch || (customBranches && customBranches.length > 0 ? customBranches[0] : "Noida Field Hub"),
      joiningDate, salaryBasic, salaryHra, salaryAllowances, salaryPf,
      bankAccount, bankName, bankIfsc, address, bio, password,
      emergencyName, emergencyRelation, emergencyPhone,
      avatarUrl
    };
    onOnboardEmployee(data);

    // Clear state & close
    setFullName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setAddress("");
    setBio("");
    setEmergencyName("");
    setEmergencyRelation("");
    setEmergencyPhone("");
    setOnboardBranch("");
    setProfileImageFile(null);
    setProfileImagePreview("");
    setShowOnboardForm(false);
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
    setEditBankAccount(emp.bankDetails?.accountNumber || "");
    setEditBankName(emp.bankDetails?.bankName || "");
    setEditBankIfsc(emp.bankDetails?.ifsc || "");
    setEditEmergencyName(emp.emergencyContact?.name || "");
    setEditEmergencyRelation(emp.emergencyContact?.relation || "");
    setEditEmergencyPhone(emp.emergencyContact?.phone || "");
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
        address: editAddress,
        bio: editBio,
        avatarUrl: avatarUrl,
        salary: {
          basic: Number(editSalaryBasic),
          hra: Number(editSalaryHra),
          allowances: Number(editSalaryAllowances),
          pfDeduction: Number(editSalaryPf),
        },
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
      };
      await onUpdateEmployee(activeEmployee.id, updated);
      setShowEditModal(false);
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
              title="Back to Agent Roster"
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
            >
              <Download className="w-4 h-4" />
              <span>Download Sample Excel</span>
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

            <button
              onClick={fetchUploadHistory}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-xs flex items-center gap-1 cursor-pointer hover:underline"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Log</span>
            </button>
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
                    <th className="p-3 font-bold">Agents Imported</th>
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
                          +{item.recordCount} Agents
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
                        {item.fileData ? (
                          <button
                            onClick={() => downloadUploadedFile(item)}
                            className="text-emerald-600 hover:text-emerald-700 font-semibold text-[11px] flex items-center space-x-1 ml-auto cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download XL</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Saved</span>
                        )}
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
              placeholder="Search NBFC agents by name, email, or ID..."
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
                {(customBranches && customBranches.length > 0
                  ? customBranches
                  : ["Noida HQ", "Mumbai Branch", "Pune Digital Office", "Hyderabad Hub"]
                ).map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {(role === "admin" || role === "hr") && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setShowOnboardForm(true);
                setOnboardBranch(role === "hr" ? userBranch : (customBranches && customBranches.length > 0 ? customBranches[0] : "Noida Field Hub"));
              }}
              className="bg-[#009966] hover:bg-[#008055] text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Onboard New Agent</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Directory List and Detail Profile Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Employee List */}
        <div className="lg:col-span-1 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs dark:neon-glow flex flex-col h-[650px]">
          <div className="mb-4">
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">Active Agent Roster</h3>
            <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">Found {filteredEmployees.length} agents matching criteria</p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
            {filteredEmployees.map(emp => {
              const isActive = activeEmployee?.id === emp.id;
              const isSelf = emp.id === currentUserId;
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
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0f0f0f] ${emp.status === "Active" ? "bg-emerald-500" : "bg-amber-500"
                      }`}></span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-700 dark:text-gray-300 text-xs truncate">
                        {emp.fullName} {isSelf && <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 font-bold px-1.5 py-0.2 rounded">Me</span>}
                      </p>
                      <span className="text-[9px] text-slate-400 dark:text-gray-500 font-mono">{emp.id}</span>
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
        <div className="lg:col-span-2 space-y-6">
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
                      <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">Joined on {activeEmployee.joiningDate}</p>
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
                    <h4 className="text-xs font-semibold text-slate-400 dark:text-gray-400 uppercase tracking-wider mb-1.5">Agent Biography</h4>
                    <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed font-sans">{activeEmployee.bio}</p>
                  </div>
                )}
              </div>

              {/* Bento Profile Tabulation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Emergency & Financial Details */}
                <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow space-y-4">
                  <div>
                    <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm mb-3 flex items-center">
                      <Landmark className="w-4.5 h-4.5 text-emerald-500 mr-2" /> Bank & Salary Specs
                    </h3>
                    <div className="bg-slate-50/50 dark:bg-[#0a0a0a]/50 rounded-xl p-3 space-y-2 border border-slate-100/50 dark:border-[#1a1a1a]/50 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Basic Salary</span>
                        <span className="font-semibold text-slate-700 dark:text-gray-300 font-mono">₹{activeEmployee.salary.basic.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">HRA Allowance</span>
                        <span className="font-semibold text-slate-700 dark:text-gray-300 font-mono">₹{activeEmployee.salary.hra.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Other Allowances</span>
                        <span className="font-semibold text-slate-700 dark:text-gray-300 font-mono">₹{activeEmployee.salary.allowances.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 dark:border-[#1a1a1a] pt-1.5">
                        <span className="text-slate-400">Bank Account</span>
                        <span className="font-semibold text-slate-700 dark:text-gray-300 font-mono">****{activeEmployee.bankDetails.accountNumber.slice(-4)} ({activeEmployee.bankDetails.bankName})</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm mb-3 flex items-center">
                      <MapPin className="w-4.5 h-4.5 text-emerald-500 mr-2" /> Emergency Contacts & Address
                    </h3>
                    <div className="bg-slate-50/50 dark:bg-[#0a0a0a]/50 rounded-xl p-3 space-y-2 border border-slate-100/50 dark:border-[#1a1a1a]/50 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Contact Person</span>
                        <span className="font-semibold text-slate-700 dark:text-gray-300">{activeEmployee.emergencyContact.name} ({activeEmployee.emergencyContact.relation})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Contact Phone</span>
                        <span className="font-semibold text-slate-700 dark:text-gray-300 font-mono">{activeEmployee.emergencyContact.phone}</span>
                      </div>
                      <div className="border-t border-slate-100 dark:border-[#1a1a1a] pt-1.5">
                        <span className="text-slate-400 block mb-1">Residential Address</span>
                        <span className="text-slate-500 dark:text-gray-400 leading-tight block">{activeEmployee.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Custom & Dynamic Attributes Section */}
                  {activeEmployee.customFields && Object.keys(activeEmployee.customFields).length > 0 && (
                    <div>
                      <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm mb-3 flex items-center">
                        <Sparkles className="w-4.5 h-4.5 text-teal-500 mr-2" /> Custom & Dynamic Attributes
                      </h3>
                      <div className="bg-teal-50/40 dark:bg-teal-950/20 rounded-xl p-3 space-y-2 border border-teal-100 dark:border-teal-900/30 text-xs">
                        {Object.entries(activeEmployee.customFields).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center py-1 border-b last:border-b-0 border-teal-100/50 dark:border-teal-900/20">
                            <span className="text-slate-500 dark:text-gray-400 font-medium">{key}</span>
                            <span className="font-bold text-slate-800 dark:text-teal-200 bg-white dark:bg-[#0f0f0f] px-2 py-0.5 rounded-md border border-teal-100 dark:border-teal-900/40 font-mono text-[11px]">
                              {String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Onboarding Checklist Tracker */}
                <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm flex items-center">
                      <ShieldCheck className="w-4.5 h-4.5 text-emerald-500 mr-2" /> Onboarding Checklist
                    </h3>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                      {activeEmployee.onboardingTasks.filter(t => t.completed).length}/{activeEmployee.onboardingTasks.length} Completed
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 dark:text-gray-500 mb-3 leading-tight">Must be completed by newly onboarded NBFC agents during the 15-day probation window.</p>

                  <div className="space-y-2.5">
                    {activeEmployee.onboardingTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => {
                          if (role === "admin" || role === "hr" || activeEmployee.id === currentUserId) {
                            onToggleOnboardingTask(activeEmployee.id, task.id, !task.completed);
                          }
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${task.completed
                          ? "bg-slate-50/50 dark:bg-[#0a0a0a]/50 border-slate-100 dark:border-[#1a1a1a]/50 text-slate-500 dark:text-gray-400"
                          : "bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/40 text-slate-700 dark:text-gray-300 cursor-pointer hover:bg-emerald-50/50"
                          }`}
                      >
                        <span className={`font-semibold ${task.completed ? "line-through text-slate-400 dark:text-gray-500" : ""}`}>{task.taskName}</span>
                        <span className="flex items-center">
                          {task.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300 dark:text-gray-600" />
                          )}
                        </span>
                      </div>
                    ))}
                    {activeEmployee.onboardingTasks.length === 0 && (
                      <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-4">No pending onboarding items.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Document Management Section */}
              <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
                <div className="flex items-center justify-between mb-4 border-b border-slate-50 dark:border-[#1a1a1a] pb-3">
                  <div>
                    <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">Employee Document Vault</h3>
                    <p className="text-xs text-slate-400 dark:text-gray-500">Aadhaar, PAN, and training clearance logs</p>
                  </div>

                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="border border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/10 transition-colors cursor-pointer"
                  >
                    <FileUp className="w-4 h-4" />
                    <span>Upload Document</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeEmployee.documents.map(doc => (
                    <div key={doc.id} className="p-3 bg-slate-50 dark:bg-[#0a0a0a]/50 border border-slate-100 dark:border-[#1a1a1a] rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="bg-emerald-100/50 dark:bg-emerald-950/40 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                          <FileText className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-700 dark:text-gray-300 truncate">{doc.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium">Category: {doc.category} • {doc.size}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            name: doc.name,
                            url: doc.fileUrl || "",
                            category: doc.category,
                            size: doc.size
                          })}
                          className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                          title="Preview Document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(role === "admin" || role === "hr" || activeEmployee.id === currentUserId) && (
                          <button
                            type="button"
                            onClick={() => onDeleteDocument(activeEmployee.id, doc.id || doc.name)}
                            className="p-1 hover:bg-white dark:hover:bg-gray-800 rounded text-rose-400 hover:text-rose-600 dark:text-rose-500 dark:hover:text-rose-400 cursor-pointer"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {activeEmployee.documents.length === 0 && (
                    <p className="col-span-2 text-xs text-slate-400 dark:text-gray-500 text-center py-6 bg-slate-50/50 dark:bg-[#0a0a0a]/10 rounded-xl">No uploaded compliance documents yet.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-12 text-center shadow-xs dark:neon-glow">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-gray-400">Select an employee from the active roster list to load their comprehensive profile.</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md mb-4 flex items-center">
              <FileUp className="w-5 h-5 text-emerald-500 mr-2" /> Upload Security Document
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
                  <option value="ID Proof">ID Proof (Aadhaar, Passport, PAN)</option>
                  <option value="Contract">Contract & Employment Agreement</option>
                  <option value="Tax Document">Tax Document / Form 16</option>
                  <option value="Educational">Educational & Certificates</option>
                  <option value="Other">Other Miscellaneous</option>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white dark:bg-[#0f0f0f] border-l border-slate-100 dark:border-[#1a1a1a] w-full max-w-2xl h-full p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1a1a1a] pb-4">
                <div>
                  <h3 className="font-display font-semibold text-slate-800 dark:text-white text-lg flex items-center">
                    <UserPlus className="w-5 h-5 text-emerald-500 mr-2" /> Onboard New Agent
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
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Vikram Malhotra"
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Email Address *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. vikram@mgmfinanciers.com"
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +91 99999 88888"
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Password *</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Set login password"
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Role Type</label>
                      <select
                        value={empRole}
                        onChange={(e) => setEmpRole(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                      >
                        <option value="employee">Employee / Agent</option>
                        <option value="hr">HR Manager</option>
                        <option value="admin">Administrator</option>
                      </select>
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
                        <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">Agent Profile Photo</label>
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
                          : ["Loans", "Insurance", "Risk", "HR", "Operations", "Compliance", "IT", "Sales"]
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
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Branch Office *</label>
                      <select
                        value={onboardBranch}
                        onChange={(e) => setOnboardBranch(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                        required
                        disabled={role === "hr"}
                      >
                        {(customBranches && customBranches.length > 0
                          ? customBranches
                          : ["Noida HQ", "Mumbai Branch", "Pune Digital Office", "Hyderabad Hub"]
                        ).map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Salary structure */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">3. Salary Allocation Break-up (Monthly)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">Basic Salary (INR)</label>
                      <input
                        type="number"
                        value={salaryBasic}
                        onChange={(e) => setSalaryBasic(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 p-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">HRA (INR)</label>
                      <input
                        type="number"
                        value={salaryHra}
                        onChange={(e) => setSalaryHra(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 p-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">Allowances (INR)</label>
                      <input
                        type="number"
                        value={salaryAllowances}
                        onChange={(e) => setSalaryAllowances(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 p-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">PF Deduction (INR)</label>
                      <input
                        type="number"
                        value={salaryPf}
                        onChange={(e) => setSalaryPf(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 p-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-mono"
                      />
                    </div>
                  </div>
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

                {/* Section 7: Biography */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Agent Bio / Profile Summary</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={2}
                    placeholder="Brief outline of credentials or NBFC sales experiences..."
                    className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-[#1a1a1a]">
                  <button
                    type="button"
                    onClick={() => setShowOnboardForm(false)}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-[#0a0a0a] dark:hover:bg-[#1a1a1a] text-slate-600 dark:text-gray-300 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Complete Onboarding</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Edit Employee Slideover */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white dark:bg-[#0f0f0f] border-l border-slate-100 dark:border-[#1a1a1a] w-full max-w-2xl h-full p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
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
                {/* Section 1: Basic Info */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">1. Personnel Credentials</h4>
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
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Role Type</label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
                      >
                        <option value="employee">Employee / Agent</option>
                        <option value="hr">HR Manager</option>
                        <option value="admin">Administrator</option>
                      </select>
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

                    <div className="md:col-span-2 flex items-center space-x-4 p-3 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a] rounded-xl mt-2">
                      <div className="relative w-12 h-12 bg-slate-200 dark:bg-gray-800 rounded-full overflow-hidden flex items-center justify-center border border-slate-300 dark:border-gray-700 shrink-0">
                        {editProfileImagePreview ? (
                          <img src={editProfileImagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">Agent Profile Photo</label>
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

                {/* Section 2: Department and Designations */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">2. Designation & Placement</h4>
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
                        {(customBranches && customBranches.length > 0
                          ? customBranches
                          : ["Noida HQ", "Mumbai Branch", "Pune Digital Office", "Hyderabad Hub"]
                        ).map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Salary structure */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">3. Salary Allocation Break-up (Monthly)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">Basic Salary (INR)</label>
                      <input
                        type="number"
                        value={editSalaryBasic}
                        onChange={(e) => setEditSalaryBasic(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 p-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">HRA (INR)</label>
                      <input
                        type="number"
                        value={editSalaryHra}
                        onChange={(e) => setEditSalaryHra(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 p-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">Allowances (INR)</label>
                      <input
                        type="number"
                        value={editSalaryAllowances}
                        onChange={(e) => setEditSalaryAllowances(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 p-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">PF Deduction (INR)</label>
                      <input
                        type="number"
                        value={editSalaryPf}
                        onChange={(e) => setEditSalaryPf(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 p-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Bank specs */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">4. Bank & Compensation Account</h4>
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

                {/* Section 5: Contact & Address Details */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">5. Contact & Address Details</h4>
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

                {/* Section 6: Emergency Contact Details */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">6. Emergency Contact Details</h4>
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

                {/* Section 7: Biography */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Agent Bio / Profile Summary</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-[#1a1a1a]">
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
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#1a1a1a] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1a1a1a] flex items-center justify-between bg-slate-50/50 dark:bg-[#0a0a0a]/50">
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
                {previewDoc.url && (
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-slate-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="hidden sm:inline">Open in New Tab</span>
                  </a>
                )}
                <button
                  onClick={() => setPreviewDoc(null)}
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
                          M
                        </div>
                        <div>
                          <h2 className="font-bold text-slate-900 text-base tracking-wide uppercase">MGM FINANCIERS PRIV LIMITED</h2>
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
                              <span className="text-slate-700 font-medium text-[11px]">{activeEmployee?.branch || "MGM Mumbai HQ"}</span>
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
                          This document certifies that <strong className="text-slate-900">"{previewDoc.name}"</strong> has been executed and deposited into the official MGM FINANCIERS PRIV LIMITED Compliance Vault for employee <strong className="text-slate-900">{activeEmployee?.fullName || "Employee"}</strong> ({activeEmployee?.id || "EMP-1001"}).
                        </p>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                          <div className="flex justify-between border-b border-slate-200 pb-1.5">
                            <span className="text-slate-500">Executing Entity:</span>
                            <span className="font-semibold text-slate-900">MGM FINANCIERS PRIV LIMITED</span>
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
                            <p className="font-serif italic text-emerald-800 text-sm font-semibold mt-1">MGM FINANCIERS PRIV LIMITED Operations Bot</p>
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
                    Upload an Excel (.xlsx / .xls / .csv) file to add multiple agents at once.
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

            {/* Template Download Banner */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 dark:text-emerald-300 block mb-0.5">
                    Need a template for employee data?
                  </span>
                  <span className="text-slate-500 dark:text-gray-400">
                    Download our ready-to-use Excel template with sample records and all required/optional headers.
                  </span>
                </div>
              </div>
              <button
                onClick={downloadSampleTemplate}
                className="bg-white dark:bg-[#151515] hover:bg-slate-50 dark:hover:bg-[#1e1e1e] text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-2 transition-all shrink-0 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download Sample Excel</span>
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
                            {ch} ⭐
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
    </div>
  );
}
