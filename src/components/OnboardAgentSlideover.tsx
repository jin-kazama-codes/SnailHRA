"use client";

import React, { useState, useRef } from "react";
import {
  UserPlus, Eye, EyeOff, Sparkles, Camera, X, RefreshCw
} from "lucide-react";

interface OnboardAgentSlideoverProps {
  companyId: string;
  companyName: string;
  /** role forced at open — "admin" | "hr" | "employee" */
  defaultRole?: "admin" | "hr" | "employee";
  customBranches?: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function OnboardAgentSlideover({
  companyId,
  companyName,
  defaultRole = "admin",
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
  const [empRole, setEmpRole] = useState<"admin" | "hr" | "employee">(defaultRole);
  const [dateOfBirth, setDateOfBirth] = useState("");

  // Section 2 — placement
  const [department, setDepartment] = useState("Management");
  const [designation, setDesignation] = useState("Manager");
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split("T")[0]);
  const [branch, setBranch] = useState("Head Office");

  // Section 3 — salary
  const [salaryBasic, setSalaryBasic] = useState("");
  const [salaryHra, setSalaryHra] = useState("");
  const [salaryAllowances, setSalaryAllowances] = useState("");
  const [salaryPf, setSalaryPf] = useState("");
  const [salaryTds, setSalaryTds] = useState("");

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

  // Section 7 — bio
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
    setError(null);
    setSubmitting(true);

    try {
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
          salaryBasic: Number(salaryBasic) || 0,
          salaryHra: Number(salaryHra) || 0,
          salaryAllowances: Number(salaryAllowances) || 0,
          salaryPf: Number(salaryPf) || 0,
          salaryTds: Number(salaryTds) || 0,
          bankAccount,
          bankName,
          bankIfsc,
          address,
          emergencyName,
          emergencyRelation,
          emergencyPhone,
          bio,
          avatarUrl: profileImagePreview || undefined,
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
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +91 99999 88888" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Password *</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Set login password"
                    className={`${inputCls} pr-10`} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-500 transition-colors cursor-pointer" tabIndex={-1}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
                  {["Management", "Loans", "Insurance", "Risk", "HR", "Operations", "Compliance", "IT", "Sales"].map(d => (
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
            </div>
          </div>

          {/* 3. Salary */}
          <div>
            <h4 className={sectionTitle}>3. Salary Allocation Break-up (Monthly)</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Basic Salary (INR)", value: salaryBasic, set: setSalaryBasic, ph: "45000" },
                { label: "HRA (INR)", value: salaryHra, set: setSalaryHra, ph: "18000" },
                { label: "Allowances (INR)", value: salaryAllowances, set: setSalaryAllowances, ph: "10000" },
                { label: "PF Deduction (INR)", value: salaryPf, set: setSalaryPf, ph: "3200" },
                { label: "TDS / Prof. Tax (INR)", value: salaryTds, set: setSalaryTds, ph: "6150" },
              ].map(f => (
                <div key={f.label} className="flex flex-col justify-end">
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">{f.label}</label>
                  <input type="number" value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                    className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 p-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-mono focus:outline-none focus:border-violet-500" />
                </div>
              ))}
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

          {/* 7. Bio */}
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
