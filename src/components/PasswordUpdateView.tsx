import React, { useState } from "react";
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck, Sparkles, RefreshCw, Key, Shield, Info, UserCheck, Users, Search, Building2 } from "lucide-react";
import { Employee } from "../types";

interface PasswordUpdateViewProps {
  currentEmployee?: Employee;
  employees?: Employee[];
  role?: "admin" | "hr" | "employee";
  companyId?: string;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

export default function PasswordUpdateView({
  currentEmployee,
  employees = [],
  role = "employee",
  companyId = "",
  showToast
}: PasswordUpdateViewProps) {
  const isAdminOrHR = role === "admin" || role === "hr" || currentEmployee?.role === "admin" || currentEmployee?.role === "hr";

  // Tab state for Admin: 'my_password' vs 'employee_password'
  const [activeTab, setActiveTab] = useState<"my_password" | "employee_password">("my_password");

  // Admin employee selection state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState<string>("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeCompanyId = companyId || currentEmployee?.companyId || "";

  // Strictly filter employee roster to logged-in user's company tenant ID only
  const companyScopedEmployees = employees.filter(emp => {
    if (!activeCompanyId) return true;
    const empCompId = emp.companyId || (emp as any).company_id;
    return empCompId === activeCompanyId;
  });

  const filteredEmployees = companyScopedEmployees.filter(emp =>
    emp.fullName.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
    emp.id.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(employeeSearchQuery.toLowerCase())
  );

  const isTargetingEmployee = activeTab === "employee_password" && isAdminOrHR;
  const targetEmployee = isTargetingEmployee
    ? companyScopedEmployees.find(e => e.id === selectedEmployeeId)
    : currentEmployee;

  const passwordsMatch = newPassword.length > 0 && verifyPassword.length > 0 && newPassword === verifyPassword;
  const isNewPasswordValid = newPassword.length >= 6;
  const hasMinLength = newPassword.length >= 6;
  const hasStrongLength = newPassword.length >= 8;
  const hasNumberOrSymbol = /[0-9!@#$%^&*]/.test(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isTargetingEmployee && !selectedEmployeeId) {
      setErrorMessage("Please select an employee from your company to update their password.");
      return;
    }

    if (!isTargetingEmployee && !oldPassword) {
      setErrorMessage("Please enter your current old password.");
      return;
    }

    if (!newPassword) {
      setErrorMessage("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters long.");
      return;
    }

    if (!verifyPassword) {
      setErrorMessage("Please verify the new password.");
      return;
    }

    if (newPassword !== verifyPassword) {
      setErrorMessage("New password and verified password do not match.");
      return;
    }

    const effectiveEmployeeId = isTargetingEmployee ? selectedEmployeeId : currentEmployee?.id;

    if (!effectiveEmployeeId) {
      setErrorMessage("Target employee session not found.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: effectiveEmployeeId,
          oldPassword: isTargetingEmployee ? undefined : oldPassword,
          newPassword,
          isAdminReset: isTargetingEmployee,
          companyId: activeCompanyId
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to update password.");
        showToast(data.error || "Failed to update password.", "error");
      } else {
        const msg = isTargetingEmployee
          ? `Password for ${targetEmployee?.fullName || "Employee"} updated successfully!`
          : "Your password has been updated successfully!";
        setSuccessMessage(msg);
        showToast(msg, "success");
        setOldPassword("");
        setNewPassword("");
        setVerifyPassword("");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("An unexpected error occurred while updating password.");
      showToast("Error updating password.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-900/10 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-48 h-48 bg-teal-300/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-bold tracking-wider uppercase text-emerald-200 border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isAdminOrHR ? "Company Tenant Password Control" : "Account Security & Credentials"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
              Password Update
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              {isAdminOrHR
                ? "Update your own password or reset passwords for employees within your company tenant."
                : "Keep your account secure by updating your password regularly."}
            </p>
          </div>

          {currentEmployee && (
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 flex items-center space-x-3 shrink-0 shadow-sm">
              <img
                src={currentEmployee.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop"}
                alt={currentEmployee.fullName}
                className="w-11 h-11 rounded-full object-cover border-2 border-emerald-400/50 shadow-xs"
              />
              <div>
                <p className="font-bold text-xs sm:text-sm text-white">{currentEmployee.fullName}</p>
                <p className="text-[11px] text-emerald-200 capitalize font-medium">Logged in: {role}</p>
                <p className="text-[10px] font-mono text-emerald-300/80">ID: {currentEmployee.id}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Mode Switcher Tabs */}
      {isAdminOrHR && (
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200/80 dark:border-[#1a1a1a] rounded-2xl p-1.5 shadow-xs flex items-center space-x-2">
          <button
            onClick={() => {
              setActiveTab("my_password");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "my_password"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-[#1a1a1a]"
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Update My Password</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("employee_password");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "employee_password"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-[#1a1a1a]"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Reset Employee Password ({companyScopedEmployees.length} Teammates)</span>
          </button>
        </div>
      )}

      {/* Main Grid: Form & Security Guidelines */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0f0f0f] border border-slate-200/80 dark:border-[#1a1a1a] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center space-x-3 pb-5 border-b border-slate-100 dark:border-[#1a1a1a]">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
              {isTargetingEmployee ? <UserCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white font-display">
                {isTargetingEmployee ? "Reset Company Employee Password" : "Change Your Password"}
              </h2>
              <p className="text-xs text-slate-400 dark:text-gray-400">
                {isTargetingEmployee
                  ? "Select an employee from your company tenant to update their password."
                  : "Fill in your old and new credentials below."}
              </p>
            </div>
          </div>

          {/* Error Alert Banner */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-start space-x-3 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Success Alert Banner */}
          {successMessage && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-start space-x-3 text-emerald-700 dark:text-emerald-300 text-xs animate-in fade-in duration-200">
              <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Admin Mode: Select Employee Dropdown (Tenant Scoped) */}
            {isTargetingEmployee && (
              <div className="space-y-2 bg-slate-50/70 dark:bg-[#141414] p-4 rounded-2xl border border-slate-200/80 dark:border-[#222]">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
                    Select Employee <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                    <Building2 className="w-3 h-3 inline mr-0.5" />
                    Company Tenant Filtered ({companyScopedEmployees.length} employees)
                  </span>
                </div>

                {/* Filter input */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={employeeSearchQuery}
                    onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                    placeholder="Filter employee by name or ID..."
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0c0c0c] border border-slate-200 dark:border-[#2a2a2a] rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3.5 py-3 bg-white dark:bg-[#0c0c0c] border border-slate-200 dark:border-[#2a2a2a] rounded-xl text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all font-medium cursor-pointer"
                  required
                >
                  <option value="">-- Choose an Employee in Your Company --</option>
                  {filteredEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.role.toUpperCase()}) [{emp.id}]
                    </option>
                  ))}
                </select>

                {/* Selected Employee Badge */}
                {targetEmployee && (
                  <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl flex items-center space-x-3">
                    <img
                      src={targetEmployee.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop"}
                      alt={targetEmployee.fullName}
                      className="w-9 h-9 rounded-full object-cover border border-emerald-400/40 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-slate-800 dark:text-white truncate">{targetEmployee.fullName}</p>
                      <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate">
                        {targetEmployee.department} • <span className="capitalize">{targetEmployee.role}</span>
                      </p>
                      <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">ID: {targetEmployee.id}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Field 1: Enter Old Password (Only for Personal Mode) */}
            {!isTargetingEmployee && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
                  Enter Old Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showOldPassword ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full pl-10 pr-12 py-3 bg-slate-50/80 dark:bg-[#141414] border border-slate-200 dark:border-[#222] rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all font-sans"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Field 2: Enter New Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
                {isTargetingEmployee ? "Enter New Password for Employee" : "Enter New Password"} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full pl-10 pr-12 py-3 bg-slate-50/80 dark:bg-[#141414] border border-slate-200 dark:border-[#222] rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all font-sans"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 cursor-pointer"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center space-x-2 text-[11px]">
                    <div className="h-1.5 flex-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full transition-all duration-300 ${
                          hasStrongLength ? "w-full bg-emerald-500" : hasMinLength ? "w-2/3 bg-amber-500" : "w-1/3 bg-rose-500"
                        }`}
                      />
                    </div>
                    <span
                      className={`font-semibold ${
                        hasStrongLength ? "text-emerald-600 dark:text-emerald-400" : hasMinLength ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {hasStrongLength ? "Strong" : hasMinLength ? "Medium" : "Weak (min 6)"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Field 3: Verify New Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
                Verify New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <input
                  type={showVerifyPassword ? "text" : "password"}
                  value={verifyPassword}
                  onChange={(e) => setVerifyPassword(e.target.value)}
                  placeholder="Re-enter new password to verify"
                  className={`w-full pl-10 pr-12 py-3 bg-slate-50/80 dark:bg-[#141414] border rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all font-sans ${
                    verifyPassword.length > 0
                      ? passwordsMatch
                        ? "border-emerald-500 focus:ring-emerald-500/30"
                        : "border-rose-500 focus:ring-rose-500/30"
                      : "border-slate-200 dark:border-[#222] focus:ring-emerald-500/40 focus:border-emerald-500"
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowVerifyPassword(!showVerifyPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 cursor-pointer"
                  tabIndex={-1}
                >
                  {showVerifyPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {verifyPassword.length > 0 && (
                <div className="flex items-center space-x-1.5 pt-1 text-[11px]">
                  {passwordsMatch ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-5 flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-[#1a1a1a]">
              <button
                type="button"
                onClick={() => {
                  setOldPassword("");
                  setNewPassword("");
                  setVerifyPassword("");
                  setSelectedEmployeeId("");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                disabled={loading}
                className="px-5 py-2.5 bg-slate-100 dark:bg-[#1a1a1a] hover:bg-slate-200 dark:hover:bg-[#252525] text-slate-600 dark:text-gray-300 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Reset Fields
              </button>

              <button
                type="submit"
                disabled={
                  loading ||
                  (isTargetingEmployee && !selectedEmployeeId) ||
                  (!isTargetingEmployee && !oldPassword) ||
                  !newPassword ||
                  !verifyPassword ||
                  !passwordsMatch ||
                  !isNewPasswordValid
                }
                className={`px-6 py-2.5 rounded-xl font-bold text-xs text-white transition-all flex items-center space-x-2 cursor-pointer shadow-md ${
                  loading ||
                  (isTargetingEmployee && !selectedEmployeeId) ||
                  (!isTargetingEmployee && !oldPassword) ||
                  !newPassword ||
                  !verifyPassword ||
                  !passwordsMatch ||
                  !isNewPasswordValid
                    ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none"
                    : "bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 shadow-emerald-600/20"
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isTargetingEmployee ? "Update Employee Password" : "Update My Password"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Info & Security Guidelines Card (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Security Best Practices Card */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200/80 dark:border-[#1a1a1a] rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-[#1a1a1a]">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-white font-display">Password Policy</h3>
            </div>

            <ul className="space-y-3 text-xs text-slate-600 dark:text-gray-300">
              <li className="flex items-start space-x-2.5">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${hasMinLength ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>
                  ✓
                </div>
                <span>Minimum <strong>6 characters</strong> in length.</span>
              </li>

              <li className="flex items-start space-x-2.5">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${passwordsMatch ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>
                  ✓
                </div>
                <span>New Password and Verification field must match.</span>
              </li>

              <li className="flex items-start space-x-2.5">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${hasNumberOrSymbol ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>
                  ✓
                </div>
                <span>Include numbers or special symbols for high security.</span>
              </li>
            </ul>

            <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/30 rounded-2xl flex items-start space-x-2.5 text-amber-800 dark:text-amber-300 text-[11px]">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p>
                {isTargetingEmployee
                  ? "Tenant Isolation Active: You are updating credentials for an employee belonging strictly to your company tenant."
                  : "Updating your password updates your login credentials across all active sessions immediately."}
              </p>
            </div>
          </div>

          {/* Target Profile Card */}
          <div className="bg-linear-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                {isTargetingEmployee ? "Target Employee Profile" : "Current Logged-In User"}
              </span>
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            </div>
            {targetEmployee ? (
              <div className="flex items-center space-x-3 pt-1">
                <img
                  src={targetEmployee.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop"}
                  alt={targetEmployee.fullName}
                  className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-white truncate">{targetEmployee.fullName}</p>
                  <p className="text-xs text-slate-300 capitalize">{targetEmployee.role} • {targetEmployee.department}</p>
                  <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">ID: {targetEmployee.id}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Select an employee from the dropdown list on the left.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
