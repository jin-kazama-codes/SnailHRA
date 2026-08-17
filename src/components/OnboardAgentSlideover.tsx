"use client";

import React, { useState, useRef } from "react";
import {
  UserPlus, Eye, EyeOff, Sparkles, Camera, X, RefreshCw, ShieldAlert, CheckCircle2
} from "lucide-react";

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

interface OnboardAgentSlideoverProps {
  companyId: string;
  companyName: string;
  /** role forced at open — "admin" | "hr" | "employee" */
  defaultRole?: "admin" | "hr" | "employee";
  customDepartments?: string[];
  customBranches?: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function OnboardAgentSlideover({
  companyId,
  companyName,
  defaultRole = "admin",
  customDepartments,
  customBranches,
  onClose,
  onSuccess,
}: OnboardAgentSlideoverProps) {
  // Section 1 — credentials
  const [prefix, setPrefix] = useState<"Mr" | "Mrs" | "Miss" | "Ms" | "">("Mr");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other" | "">("Male");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [empRole, setEmpRole] = useState<"admin" | "hr" | "employee">(defaultRole);
  const [dateOfBirth, setDateOfBirth] = useState("");

  // Section 2 — placement
  const [department, setDepartment] = useState(customDepartments && customDepartments.length > 0 ? customDepartments[0] : "Information Technology");
  const [designation, setDesignation] = useState("Manager");
  const [joiningDate, setJoiningDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [branch, setBranch] = useState("Head Office");
  const [employmentType, setEmploymentType] = useState<"contract" | "permanent" | "consultant" | "">("");

  // Section 3 — salary
  const [salaryBasic, setSalaryBasic] = useState("");
  const [salaryHra, setSalaryHra] = useState("");
  const [salaryTelephone, setSalaryTelephone] = useState("");
  const [salaryFuel, setSalaryFuel] = useState("");
  const [salaryProfDev, setSalaryProfDev] = useState("");
  const [salaryLta, setSalaryLta] = useState("");
  const [salaryAllowances, setSalaryAllowances] = useState("");
  const [salaryPf, setSalaryPf] = useState("");
  const [salaryPfMode, setSalaryPfMode] = useState<"percentage" | "fixed_1800" | "custom">("percentage");
  const [salaryTds, setSalaryTds] = useState("");
  const [salaryTdsOptIn, setSalaryTdsOptIn] = useState<boolean>(true);
  const [salaryTdsMode, setSalaryTdsMode] = useState<"slab" | "custom">("slab");
  const [salaryEsiOptIn, setSalaryEsiOptIn] = useState<boolean>(true);
  const [salaryEsi, setSalaryEsi] = useState("");

  // Section 4 — bank
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");

  // Section 5 — address
  const [address, setAddress] = useState("");

  // Section 6 — emergency
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  // Section 7 — PAN & UAN
  const [pan, setPan] = useState("");
  const [uan, setUan] = useState("");

  // Section 8 — bio
  const [bio, setBio] = useState("");

  // Profile photo
  const profileImageRef = useRef<HTMLInputElement>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProfileImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setProfileImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError("Full name, email, and password are required.");
      return;
    }
    if (phone.trim() && !isValidPhoneNumber(phone)) {
      const is91 = phone.trim().startsWith("+91") || phone.trim().startsWith("91");
      setError(is91 ? "Invalid Phone Number! Numbers with +91 must contain exactly 10 digits after +91 (total 12 digits)." : "Invalid Phone Number! Numbers without +91 must contain exactly 10 digits.");
      return;
    }
    if (!isValidPassword(password)) {
      setError("Password must be at least 6 characters and contain at least 1 capital letter, 1 number, and 1 special symbol (!@#$%^&*).");
      return;
    }
    if (pan.trim() && !isValidPAN(pan)) {
      setError("Invalid PAN Number format! PAN must be 5 letters, 4 numbers, and 1 letter (e.g. ABCDE1234F).");
      return;
    }
    if (uan.trim() && !isValidUAN(uan)) {
      setError("Invalid UAN Number format! UAN must be 12 digits (e.g. 101146669488).");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      let finalAvatarUrl = profileImagePreview || undefined;
      if (profileImageFile) {
        try {
          const formData = new FormData();
          formData.append("file", profileImageFile);
          formData.append("bucket", "employee-avatars");
          const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
          const uploadData = await uploadRes.json();
          if (uploadRes.ok && uploadData.url) {
            finalAvatarUrl = uploadData.url;
          }
        } catch (uploadErr) {
          console.error("Failed to upload avatar in slideover:", uploadErr);
        }
      }

      const res = await fetch(`/api/superadmin/companies/${companyId}/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix,
          fullName,
          gender,
          email,
          phone,
          password,
          role: empRole,
          department,
          designation,
          joiningDate,
          dateOfBirth,
          branch,
          employmentType,
          salaryBasic: Number(salaryBasic) || 0,
          salaryHra: Number(salaryHra) || 0,
          salaryTelephone: Number(salaryTelephone) || 0,
          salaryFuel: Number(salaryFuel) || 0,
          salaryProfDev: Number(salaryProfDev) || 0,
          salaryLta: Number(salaryLta) || 0,
          salaryAllowances: Number(salaryAllowances) || 0,
          salaryPf: Number(salaryPf) || 0,
          salaryPfMode,
          salaryTds: Number(salaryTds) || 0,
          salaryTdsMode,
          salaryTdsOptIn,
          salaryEsi: Number(salaryEsi) || 0,
          salaryEsiOptIn,
          bankAccount,
          bankName,
          bankIfsc,
          address,
          emergencyName,
          emergencyRelation,
          emergencyPhone,
          bio,
          avatarUrl: finalAvatarUrl,
          customFields: {
            pan: pan.trim().toUpperCase(),
            uan: uan.trim(),
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || "Failed to create user.");
      }
    } catch (err: any) {
      setError(err?.message || "Server error.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-none focus:border-violet-500 font-medium transition-colors";
  const labelCls = "block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1";
  const sectionTitle = "text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2.5";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-white dark:bg-[#0f0f0f] border-l border-slate-100 dark:border-[#1a1a1a] w-full max-w-2xl h-full p-6 overflow-y-auto flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1a1a1a] pb-4 mb-6">
          <div>
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-lg flex items-center">
              <UserPlus className="w-5 h-5 text-violet-500 mr-2" /> Onboard New Employee
            </h3>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">
              For: <span className="font-bold text-violet-500">{companyName}</span> · Initiate payroll, workspace assets, and welcome sequence
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] rounded-lg text-slate-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-center space-x-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30 text-xs font-semibold">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 flex-1">

          {/* 1. Personnel Credentials */}
          <div>
            <h4 className={sectionTitle}>1. Personnel Credentials</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Full Name *</label>
                <div className="flex gap-2">
                  <select
                    value={prefix}
                    onChange={e => setPrefix(e.target.value as any)}
                    className={`${inputCls} w-20 shrink-0`}
                  >
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Miss">Miss</option>
                    <option value="Ms">Ms</option>
                  </select>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Vikram Malhotra" className={inputCls} required />
                </div>
              </div>
              <div>
                <label className={labelCls}>Email Address *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. vikram@company.com" className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => {
                    setPhone(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. +91 99999 88888"
                  className={`${inputCls} ${
                    phone.trim() && !isValidPhoneNumber(phone)
                      ? "border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50/20"
                      : phone.trim() && isValidPhoneNumber(phone)
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : ""
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
                ) : null}
              </div>
              <div>
                <label className={labelCls}>Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    placeholder="Set login password"
                    className={`${inputCls} pr-10 ${
                      password && !isValidPassword(password)
                        ? "border-amber-500 focus:border-amber-500"
                        : password && isValidPassword(password)
                        ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : ""
                    }`}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-500 transition-colors cursor-pointer" tabIndex={-1}>
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
                <label className={labelCls}>Role Type</label>
                <select value={empRole} onChange={e => setEmpRole(e.target.value as any)} className={inputCls}>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Gender *</label>
                <div className="flex gap-2">
                  {(["Male", "Female", "Other"] as const).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                        gender === g
                          ? "bg-violet-600 text-white border-violet-600"
                          : "bg-slate-50 dark:bg-[#0a0a0a] text-slate-500 dark:text-gray-400 border-slate-100 dark:border-[#1a1a1a] hover:border-violet-300"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Date of Birth *</label>
                <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)}
                  className={inputCls} required />
              </div>
              <div className="md:col-span-2 flex items-center space-x-4 p-3 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a] rounded-xl">
                <div className="relative w-12 h-12 bg-slate-200 dark:bg-gray-800 rounded-full overflow-hidden flex items-center justify-center border border-slate-300 dark:border-gray-700 shrink-0">
                  {profileImagePreview
                    ? <img src={profileImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    : <Camera className="w-5 h-5 text-slate-400" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">Employee Profile Photo</p>
                  <input type="file" ref={profileImageRef} accept="image/*"
                    onChange={handleProfileImageSelect} className="hidden" />
                  <button type="button" onClick={() => profileImageRef.current?.click()}
                    className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/20 dark:hover:bg-violet-950/40 text-violet-700 dark:text-violet-400 text-xs font-semibold rounded-lg border border-violet-100 dark:border-violet-900/30 cursor-pointer">
                    Choose Photo
                  </button>
                  {profileImageFile && <span className="text-[10px] text-slate-400 ml-2 font-mono">{profileImageFile.name}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Designation & Placement */}
          <div>
            <h4 className={sectionTitle}>2. Designation &amp; Placement</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Department</label>
                <select value={department} onChange={e => setDepartment(e.target.value)} className={inputCls}>
                  {(customDepartments && customDepartments.length > 0
                    ? customDepartments
                    : ["Information Technology", "Loans", "Insurance", "Risk", "HR", "Operations", "Compliance", "IT", "Sales", "Finance", "Executive"]
                  ).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Corporate Designation</label>
                <input type="text" value={designation} onChange={e => setDesignation(e.target.value)}
                  placeholder="e.g. Managing Director" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Joining Date</label>
                <input type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Branch Office *</label>
                <select value={branch} onChange={e => setBranch(e.target.value)} className={inputCls} required>
                  {(customBranches && customBranches.length > 0 ? customBranches : ["Head Office"]).map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Employment Type *</label>
                <select value={employmentType} onChange={e => setEmploymentType(e.target.value as any)} className={inputCls}>
                  <option value="">Select Employment Type...</option>
                  <option value="permanent">Permanent</option>
                  <option value="contract">Contract</option>
                  <option value="consultant">Consultant</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Salary */}
          <div>
            <h4 className={sectionTitle}>3. Salary Allocation Break-up (Monthly)</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Basic Salary (INR)", value: salaryBasic, set: setSalaryBasic, ph: "45000" },
                { label: "HRA (INR)", value: salaryHra, set: setSalaryHra, ph: "18000" },
                { label: "Telephone Allowance (INR)", value: salaryTelephone, set: setSalaryTelephone, ph: "1000" },
                { label: "Fuel Allowance (INR)", value: salaryFuel, set: setSalaryFuel, ph: "8000" },
                { label: "Professional Dev. (INR)", value: salaryProfDev, set: setSalaryProfDev, ph: "1000" },
                { label: "LTA (INR)", value: salaryLta, set: setSalaryLta, ph: "1650" },
                { label: "Special Allowance (INR)", value: salaryAllowances, set: setSalaryAllowances, ph: "10000" },
              ].map(f => (
                <div key={f.label} className="flex flex-col justify-end">
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">{f.label}</label>
                  <input type="number" value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                    className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 p-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-mono focus:outline-none focus:border-violet-500" />
                </div>
              ))}
            </div>

            {/* Statutory Deductions: PF, TDS, ESI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
              {/* PF Mode */}
              <div className="bg-slate-50 dark:bg-[#0a0a0a] p-2.5 rounded-xl border border-slate-100 dark:border-[#1a1a1a] space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-gray-300">Provident Fund (PF)</label>
                <select
                  value={salaryPfMode}
                  onChange={e => setSalaryPfMode(e.target.value as any)}
                  className="w-full bg-white dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-[#222]"
                >
                  <option value="percentage">12% of Basic</option>
                  <option value="fixed_1800">Fixed ₹1,800 Cap</option>
                  <option value="custom">Custom ₹</option>
                </select>
                {salaryPfMode === "custom" && (
                  <input
                    type="number"
                    value={salaryPf}
                    onChange={e => setSalaryPf(e.target.value)}
                    placeholder="PF ₹"
                    className="w-full bg-white dark:bg-[#141414] text-slate-800 dark:text-gray-200 p-1 text-xs rounded border"
                  />
                )}
              </div>

              {/* TDS Opt-In */}
              <div className="bg-slate-50 dark:bg-[#0a0a0a] p-2.5 rounded-xl border border-slate-100 dark:border-[#1a1a1a] space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-gray-300">TDS Income Tax</label>
                  <button
                    type="button"
                    onClick={() => setSalaryTdsOptIn(!salaryTdsOptIn)}
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${salaryTdsOptIn ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-slate-200 text-slate-600"}`}
                  >
                    {salaryTdsOptIn ? "Opted IN" : "Opted OUT"}
                  </button>
                </div>
                {salaryTdsOptIn ? (
                  <select
                    value={salaryTdsMode}
                    onChange={e => setSalaryTdsMode(e.target.value as any)}
                    className="w-full bg-white dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-[#222]"
                  >
                    <option value="slab">Auto Tax Slab (5%)</option>
                    <option value="custom">Manual TDS ₹</option>
                  </select>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">No TDS deducted</p>
                )}
                {salaryTdsOptIn && salaryTdsMode === "custom" && (
                  <input
                    type="number"
                    value={salaryTds}
                    onChange={e => setSalaryTds(e.target.value)}
                    placeholder="TDS ₹"
                    className="w-full bg-white dark:bg-[#141414] text-slate-800 dark:text-gray-200 p-1 text-xs rounded border"
                  />
                )}
              </div>

              {/* ESI Opt-In */}
              <div className="bg-slate-50 dark:bg-[#0a0a0a] p-2.5 rounded-xl border border-slate-100 dark:border-[#1a1a1a] space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-gray-300">ESI Deduction</label>
                  <button
                    type="button"
                    onClick={() => setSalaryEsiOptIn(!salaryEsiOptIn)}
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${salaryEsiOptIn ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400" : "bg-slate-200 text-slate-600"}`}
                  >
                    {salaryEsiOptIn ? "ESI Active" : "ESI Exempt"}
                  </button>
                </div>
                {salaryEsiOptIn ? (
                  <input
                    type="number"
                    value={salaryEsi}
                    onChange={e => setSalaryEsi(e.target.value)}
                    placeholder="Auto ~0.75% or custom ₹"
                    className="w-full bg-white dark:bg-[#141414] text-slate-800 dark:text-gray-200 p-1.5 text-xs rounded-lg border font-mono"
                  />
                ) : (
                  <p className="text-[10px] text-slate-400 italic">ESI Exempted</p>
                )}
              </div>
            </div>
          </div>

          {/* 4. Bank */}
          <div>
            <h4 className={sectionTitle}>4. Bank &amp; Compensation Account</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Account Number</label>
                <input type="text" value={bankAccount} onChange={e => setBankAccount(e.target.value)}
                  placeholder="501002938192" className={`${inputCls} font-mono`} />
              </div>
              <div>
                <label className={labelCls}>Bank Name</label>
                <input type="text" value={bankName} onChange={e => setBankName(e.target.value)}
                  placeholder="HDFC Bank" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>IFSC Code</label>
                <input type="text" value={bankIfsc} onChange={e => setBankIfsc(e.target.value)}
                  placeholder="HDFC0000104" className={`${inputCls} font-mono`} />
              </div>
            </div>
          </div>

          {/* 5. Address */}
          <div>
            <h4 className={sectionTitle}>5. Contact &amp; Address Details</h4>
            <label className={labelCls}>Residential Address</label>
            <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2}
              placeholder="Enter full physical residential address..."
              className={`${inputCls} resize-none`} />
          </div>

          {/* 6. Emergency Contact */}
          <div>
            <h4 className={sectionTitle}>6. Emergency Contact Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Contact Name</label>
                <input type="text" value={emergencyName} onChange={e => setEmergencyName(e.target.value)}
                  placeholder="e.g. Suman Sharma" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Relationship</label>
                <input type="text" value={emergencyRelation} onChange={e => setEmergencyRelation(e.target.value)}
                  placeholder="e.g. Spouse / Parent" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Contact Phone</label>
                <input type="text" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)}
                  placeholder="+91 99999 88888" className={`${inputCls} font-mono`} />
              </div>
            </div>
          </div>

          {/* 7. PAN & UAN */}
          <div>
            <h4 className={sectionTitle}>7. Identity &amp; Compliance Documents</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>PAN Number</label>
                <input
                  type="text"
                  value={pan}
                  onChange={e => {
                    setPan(e.target.value.toUpperCase().trim());
                    if (error) setError(null);
                  }}
                  placeholder="e.g. ABCDE1234F"
                  maxLength={10}
                  className={`${inputCls} font-mono tracking-widest uppercase transition-colors ${
                    pan.trim() && !isValidPAN(pan)
                      ? "border-rose-500 text-rose-600 dark:text-rose-400 focus:border-rose-500 bg-rose-50/20"
                      : pan.trim() && isValidPAN(pan)
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 focus:border-emerald-500"
                      : "border-slate-100 dark:border-[#1a1a1a]"
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
                <label className={labelCls}>UAN Number</label>
                <input
                  type="text"
                  value={uan}
                  onChange={e => {
                    setUan(e.target.value.replace(/\D/g, ""));
                    if (error) setError(null);
                  }}
                  placeholder="e.g. 101146669488"
                  maxLength={12}
                  className={`${inputCls} font-mono tracking-widest transition-colors ${
                    uan.trim() && !isValidUAN(uan)
                      ? "border-rose-500 text-rose-600 dark:text-rose-400 focus:border-rose-500 bg-rose-50/20"
                      : uan.trim() && isValidUAN(uan)
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 focus:border-emerald-500"
                      : "border-slate-100 dark:border-[#1a1a1a]"
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

          {/* 8. Bio */}
          <div>
            <label className={labelCls}>Employee Bio / Profile Summary</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2}
              placeholder="Brief outline of credentials or professional experience..."
              className={`${inputCls} resize-none`} />
          </div>

          {/* Submit */}
          <div className="flex justify-center space-x-2 pt-4 border-t border-slate-100 dark:border-[#1a1a1a]">
            <button type="button" onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-[#0a0a0a] dark:hover:bg-[#1a1a1a] text-slate-600 dark:text-gray-300 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors">
              {submitting
                ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Creating...</span></>
                : <><Sparkles className="w-4 h-4" /><span>Complete Onboarding</span></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
