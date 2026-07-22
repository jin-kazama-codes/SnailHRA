"use client";

import React, { useState } from "react";
import {
  Search, UserPlus, FileText, CheckCircle2, XCircle,
  Trash2, Mail, Phone, Briefcase, Calendar, ChevronRight,
  Eye, FileUp, ShieldCheck, AlertCircle, Sparkles, Building, MapPin, Landmark
} from "lucide-react";
import { Employee, Designation, UserRole, EmployeeDocument, OnboardingTask } from "../types";

interface DirectoryViewProps {
  employees: Employee[];
  designations: Designation[];
  role: UserRole;
  currentUserId: string;
  customDepartments?: string[];
  customBranches?: string[];
  onOnboardEmployee: (empData: any) => void;
  onUpdateEmployee: (id: string, updatedData: any) => void;
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

  // Upload state
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState<any>("ID Proof");

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

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      return;
    }
    const data = {
      fullName, email, phone, role: empRole, designationId: selectedDesgId, department,
      branch: onboardBranch || (customBranches && customBranches.length > 0 ? customBranches[0] : "Noida Field Hub"),
      joiningDate, salaryBasic, salaryHra, salaryAllowances, salaryPf,
      bankAccount, bankName, bankIfsc, address, bio, password
    };
    onOnboardEmployee(data);

    // Clear state & close
    setFullName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setAddress("");
    setBio("");
    setOnboardBranch("");
    setShowOnboardForm(false);
  };

  const handleDocUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName) return;
    if (activeEmployee) {
      onAddDocument(activeEmployee.id, {
        name: docName.endsWith(".pdf") ? docName : docName + ".pdf",
        category: docCategory,
        size: (Math.random() * 2 + 0.5).toFixed(1) + " MB"
      });
      setDocName("");
      setShowUploadModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Filter and Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs dark:neon-glow">
        <div className="flex items-center space-x-3 flex-1 min-w-[280px]">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search NBFC agents by name, email, or employee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium"
            />
          </div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-semibold focus:outline-hidden"
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
              className="bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-semibold focus:outline-hidden"
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

        {(role === "admin" || role === "hr") && (
          <button
            onClick={() => {
              setShowOnboardForm(true);
              setOnboardBranch(role === "hr" ? userBranch : (customBranches && customBranches.length > 0 ? customBranches[0] : "Noida Field Hub"));
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-xs shadow-emerald-600/10 dark:shadow-emerald-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Onboard New Agent</span>
          </button>
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
                        <button className="p-1 hover:bg-white dark:hover:bg-gray-800 rounded text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300" title="Download Mock">
                          <Eye className="w-4 h-4" />
                        </button>
                        {(role === "admin" || role === "hr" || activeEmployee.id === currentUserId) && (
                          <button
                            onClick={() => onDeleteDocument(activeEmployee.id, doc.id)}
                            className="p-1 hover:bg-white dark:hover:bg-gray-800 rounded text-rose-400 hover:text-rose-600 dark:text-rose-500 dark:hover:text-rose-400"
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
                <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">Document Name</label>
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
                  onClick={() => setShowUploadModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-[#0a0a0a] dark:hover:bg-[#1a1a1a] text-slate-600 dark:text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Upload
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
                        placeholder="e.g. vikram@snailhr.com"
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

                {/* Section 5: Biography */}
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
    </div>
  );
}
