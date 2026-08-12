import React, { useState, useRef } from "react";
import { X, Pencil, Camera, Calculator, Sparkles, RefreshCw, Eye, EyeOff, User, Building, CreditCard, MapPin, PhoneCall, FileText } from "lucide-react";
import { Employee, Designation } from "../types";

interface EditEmployeeModalProps {
  employee: Employee;
  designations: Designation[];
  customDepartments?: string[];
  customBranches?: string[];
  role: "admin" | "hr" | "employee";
  onClose: () => void;
  onSave: (id: string, updatedData: any) => Promise<void> | void;
}

export default function EditEmployeeModal({
  employee,
  designations,
  customDepartments = ["Loans", "Insurance", "Risk", "HR", "Operations", "Compliance", "IT", "Sales"],
  customBranches = ["Head Office", "Shashtri Nagar", "Mumbai Branch"],
  role,
  onClose,
  onSave
}: EditEmployeeModalProps) {
  const [prefix, setPrefix] = useState<"Mr" | "Mrs" | "Miss" | "Ms">(employee.prefix || "Mr");
  const [fullName, setFullName] = useState(employee.fullName || "");
  const [gender, setGender] = useState<"Male" | "Female" | "Other">(employee.gender || "Male");
  const [email, setEmail] = useState(employee.email || "");
  const [phone, setPhone] = useState(employee.phone || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [roleType, setRoleType] = useState(employee.role || "employee");
  const [status, setStatus] = useState(employee.status || "Active");
  const [dateOfBirth, setDateOfBirth] = useState(employee.dateOfBirth || "");

  const [dept, setDept] = useState(employee.department || customDepartments[0] || "Loans");
  const [desigId, setDesigId] = useState(employee.designationId || designations[0]?.id || "");
  const [branch, setBranch] = useState(employee.branch || customBranches[0] || "Head Office");

  const [salaryBasic, setSalaryBasic] = useState(String(employee.salary?.basic ?? 30000));
  const [salaryHra, setSalaryHra] = useState(String(employee.salary?.hra ?? 12000));
  const [salaryAllowances, setSalaryAllowances] = useState(String(employee.salary?.allowances ?? 6000));
  const [salaryPf, setSalaryPf] = useState(String(employee.salary?.pfDeduction ?? 3600));
  const [salaryTds, setSalaryTds] = useState(String(employee.salary?.tdsDeduction ?? 0));

  const [bankAccount, setBankAccount] = useState(employee.bankDetails?.accountNumber || "");
  const [bankName, setBankName] = useState(employee.bankDetails?.bankName || "State Bank of India");
  const [bankIfsc, setBankIfsc] = useState(employee.bankDetails?.ifsc || "");

  const [address, setAddress] = useState(employee.address || "");
  const [emergencyName, setEmergencyName] = useState(employee.emergencyContact?.name || "");
  const [emergencyRelation, setEmergencyRelation] = useState(employee.emergencyContact?.relation || "");
  const [emergencyPhone, setEmergencyPhone] = useState(employee.emergencyContact?.phone || "");
  const [bio, setBio] = useState(employee.bio || "");

  const [avatarUrl, setAvatarUrl] = useState(employee.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const profileImageRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);

  const handleProfileImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setAvatarUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updated: any = {
        prefix,
        fullName: fullName.trim(),
        gender,
        email: email.trim(),
        phone: phone.trim(),
        role: roleType,
        status,
        dateOfBirth,
        department: dept,
        designationId: desigId,
        branch,
        salary: {
          basic: Number(salaryBasic) || 0,
          hra: Number(salaryHra) || 0,
          allowances: Number(salaryAllowances) || 0,
          pfDeduction: Number(salaryPf) || 0,
          tdsDeduction: Number(salaryTds) || 0,
        },
        bankDetails: {
          accountNumber: bankAccount.trim(),
          bankName: bankName.trim(),
          ifsc: bankIfsc.trim(),
        },
        address: address.trim(),
        emergencyContact: {
          name: emergencyName.trim(),
          relation: emergencyRelation.trim(),
          phone: emergencyPhone.trim(),
        },
        bio: bio.trim(),
        avatarUrl
      };

      if (password.trim()) {
        updated.password = password.trim();
      }

      await onSave(employee.id, updated);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const basicVal = Number(salaryBasic) || 0;
  const hraVal = Number(salaryHra) || Math.round(basicVal * 0.4);
  const allowVal = Number(salaryAllowances) || Math.round(basicVal * 0.2);
  const grossVal = basicVal + hraVal + allowVal;
  const pfVal = Number(salaryPf) || Math.round(basicVal * 0.12);
  const tdsVal = Number(salaryTds) || 0;
  const netVal = Math.max(0, grossVal - pfVal - tdsVal);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#1a1a1a] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#1a1a1a] bg-slate-50/50 dark:bg-[#121212]/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-800 dark:text-white text-base sm:text-lg flex items-center">
                Edit Employee Information
              </h3>
              <p className="text-xs text-slate-400 dark:text-gray-400">
                Modify personnel credentials, financial specs, and address details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
          
          {/* Section 1: Personnel Credentials */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#1a1a1a] pb-2">
              <User className="w-4 h-4 text-emerald-500" />
              <span>1. Personnel Credentials</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">Prefix</label>
                <select
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222] focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="Mr">Mr.</option>
                  <option value="Mrs">Mrs.</option>
                  <option value="Miss">Miss.</option>
                  <option value="Ms">Ms.</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222] focus:outline-none focus:border-emerald-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222] focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Others</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222] focus:outline-none focus:border-emerald-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222] focus:outline-none focus:border-emerald-500 font-medium font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">Change Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 pl-3.5 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222] focus:outline-none focus:border-emerald-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">Role Type</label>
                <select
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222] focus:outline-none focus:border-emerald-500 font-medium"
                  disabled={role !== "admin"}
                >
                  <option value="employee">Employee</option>
                  <option value="hr">HR Manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">Employment Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222] focus:outline-none focus:border-emerald-500 font-medium"
                  disabled={role === "employee"}
                >
                  <option value="Active">Active</option>
                  <option value="Probation">Probation</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222] focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Profile Photo Picker */}
              <div className="sm:col-span-2 md:col-span-3 p-3 bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-[#222] rounded-2xl flex items-center space-x-4">
                <img
                  src={avatarUrl}
                  alt="Profile Preview"
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/40 shadow-xs shrink-0"
                />
                <div className="flex-1 space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300">Employee Profile Photo</label>
                  <div className="flex items-center space-x-2">
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
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      Choose Photo
                    </button>
                    <input
                      type="text"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="Or paste image URL"
                      className="flex-1 bg-white dark:bg-[#0c0c0c] text-slate-800 dark:text-gray-200 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#2a2a2a] focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Designation & Placement */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#1a1a1a] pb-2">
              <Building className="w-4 h-4 text-emerald-500" />
              <span>2. Designation & Placement</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">Department</label>
                <select
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222] focus:outline-none focus:border-emerald-500 font-medium"
                >
                  {customDepartments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">Corporate Designation</label>
                <select
                  value={desigId}
                  onChange={(e) => setDesigId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222] focus:outline-none focus:border-emerald-500 font-medium"
                >
                  {designations.map(desg => (
                    <option key={desg.id} value={desg.id}>{desg.title} ({desg.department})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">Branch Office</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222] focus:outline-none focus:border-emerald-500 font-medium"
                >
                  {customBranches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Salary Allocation */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              <Calculator className="w-4 h-4 text-emerald-500" />
              <span>3. Bank & Compensation Allocation (Monthly)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-gray-300 mb-1">Basic (INR)</label>
                <input
                  type="number"
                  value={salaryBasic}
                  onChange={(e) => setSalaryBasic(e.target.value)}
                  className="w-full bg-white dark:bg-[#0c0c0c] text-slate-800 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#2a2a2a] font-mono font-semibold"
                  disabled={role === "employee"}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-gray-300 mb-1">HRA (INR)</label>
                <input
                  type="number"
                  value={salaryHra}
                  onChange={(e) => setSalaryHra(e.target.value)}
                  className="w-full bg-white dark:bg-[#0c0c0c] text-slate-800 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#2a2a2a] font-mono font-semibold"
                  disabled={role === "employee"}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-gray-300 mb-1">Allowances</label>
                <input
                  type="number"
                  value={salaryAllowances}
                  onChange={(e) => setSalaryAllowances(e.target.value)}
                  className="w-full bg-white dark:bg-[#0c0c0c] text-slate-800 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#2a2a2a] font-mono font-semibold"
                  disabled={role === "employee"}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-gray-300 mb-1">PF Deduction</label>
                <input
                  type="number"
                  value={salaryPf}
                  onChange={(e) => setSalaryPf(e.target.value)}
                  className="w-full bg-white dark:bg-[#0c0c0c] text-slate-800 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#2a2a2a] font-mono font-semibold"
                  disabled={role === "employee"}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-gray-300 mb-1">TDS Deduction</label>
                <input
                  type="number"
                  value={salaryTds}
                  onChange={(e) => setSalaryTds(e.target.value)}
                  className="w-full bg-white dark:bg-[#0c0c0c] text-slate-800 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#2a2a2a] font-mono font-semibold"
                  disabled={role === "employee"}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-emerald-200/50 dark:border-emerald-900/30 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <span>Gross: ₹{grossVal.toLocaleString("en-IN")}</span>
              <span>Net Pay: ₹{netVal.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Section 4: Bank Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#1a1a1a] pb-2">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              <span>4. Bank Account Specs</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">Account Number</label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222] font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Address */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#1a1a1a] pb-2">
              <MapPin className="w-4 h-4 text-emerald-500" />
              <span>5. Contact & Address Details</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">Residential Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 p-3 text-xs rounded-xl border border-slate-200 dark:border-[#222] focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Section 6: Emergency Contact */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#1a1a1a] pb-2">
              <PhoneCall className="w-4 h-4 text-emerald-500" />
              <span>6. Emergency Contact Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">Relationship</label>
                <input
                  type="text"
                  value={emergencyRelation}
                  onChange={(e) => setEmergencyRelation(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">Emergency Phone</label>
                <input
                  type="text"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222] font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 7: Biography */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#1a1a1a] pb-2">
              <FileText className="w-4 h-4 text-emerald-500" />
              <span>7. Employee Bio / Profile Summary</span>
            </div>

            <div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                placeholder="Enter a brief summary about your experience and background..."
                className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 p-3 text-xs rounded-xl border border-slate-200 dark:border-[#222] focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-[#1a1a1a]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 dark:bg-[#1a1a1a] hover:bg-slate-200 dark:hover:bg-[#252525] text-slate-600 dark:text-gray-300 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Profile...</span>
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
  );
}
