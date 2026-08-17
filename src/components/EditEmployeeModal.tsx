import React, { useState, useRef } from "react";
import { X, Pencil, Camera, Calculator, Sparkles, RefreshCw, Eye, EyeOff, User, Building, CreditCard, MapPin, PhoneCall, FileText, Mail } from "lucide-react";
import { Employee, Designation } from "../types";

interface EditEmployeeModalProps {
  employee: Employee;
  designations: Designation[];
  customDepartments?: string[];
  customBranches?: string[];
  role: "admin" | "hr" | "employee";
  initialMode?: "view" | "edit";
  onClose: () => void;
  onSave: (id: string, updatedData: any) => Promise<void> | void;
}

export default function EditEmployeeModal({
  employee,
  designations,
  customDepartments = ["Loans", "Insurance", "Risk", "HR", "Operations", "Compliance", "IT", "Sales"],
  customBranches = ["Head Office", "Shashtri Nagar", "Mumbai Branch"],
  role,
  initialMode = "view",
  onClose,
  onSave
}: EditEmployeeModalProps) {
  const [isEditing, setIsEditing] = useState(initialMode === "edit");

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
  const [employmentType, setEmploymentType] = useState<"contract" | "permanent" | "consultant" | "">(employee.employmentType || "");

  const [salaryBasic, setSalaryBasic] = useState(String(employee.salary?.basic ?? 30000));
  const [salaryHra, setSalaryHra] = useState(String(employee.salary?.hra ?? 12000));
  const [salaryTelephone, setSalaryTelephone] = useState(String(employee.salary?.telephone ?? 0));
  const [salaryFuel, setSalaryFuel] = useState(String(employee.salary?.fuel ?? 0));
  const [salaryProfDev, setSalaryProfDev] = useState(String(employee.salary?.professionalDev ?? 0));
  const [salaryLta, setSalaryLta] = useState(String(employee.salary?.lta ?? 0));
  const [salaryAllowances, setSalaryAllowances] = useState(String(employee.salary?.allowances ?? 6000));
  const [salaryPf, setSalaryPf] = useState(String(employee.salary?.pfDeduction ?? 3600));
  const [salaryTds, setSalaryTds] = useState(String(employee.salary?.tdsDeduction ?? 0));
  const [pfMode, setPfMode] = useState<"percentage" | "fixed_1800" | "custom" | "exempt">(employee.salary?.pfMode || "percentage");
  const [tdsOptIn, setTdsOptIn] = useState<boolean>(employee.salary?.tdsOptIn !== undefined ? employee.salary.tdsOptIn : true);
  const [tdsMode, setTdsMode] = useState<"slab" | "custom">(employee.salary?.tdsMode || "slab");
  const [esiOptIn, setEsiOptIn] = useState<boolean>(employee.salary?.esiOptIn !== undefined ? employee.salary.esiOptIn : true);
  const [esiMode, setEsiMode] = useState<"auto" | "custom">(employee.salary?.esiMode || (employee.salary?.esiDeduction && employee.salary?.esiDeduction > 0 ? "custom" : "auto"));
  const [salaryEsi, setSalaryEsi] = useState(String(employee.salary?.esiDeduction ?? 0));

  const [bankAccount, setBankAccount] = useState(employee.bankDetails?.accountNumber || "");
  const [bankName, setBankName] = useState(employee.bankDetails?.bankName || "");
  const [bankIfsc, setBankIfsc] = useState(employee.bankDetails?.ifsc || "");

  const [address, setAddress] = useState(employee.address || "");
  const [emergencyName, setEmergencyName] = useState(employee.emergencyContact?.name || "");
  const [emergencyRelation, setEmergencyRelation] = useState(employee.emergencyContact?.relation || "");
  const [emergencyPhone, setEmergencyPhone] = useState(employee.emergencyContact?.phone || "");
  const [bio, setBio] = useState(employee.bio || "");
  const [pan, setPan] = useState((employee.customFields?.pan as string) || "");
  const [uan, setUan] = useState((employee.customFields?.uan as string) || "");

  const [avatarUrl, setAvatarUrl] = useState(employee.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const profileImageRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);

  const handleProfileImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setProfileImagePreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let finalAvatarUrl = avatarUrl;

      // If a local image file was selected, upload to S3 / Supabase storage bucket
      if (profileImageFile) {
        try {
          const formData = new FormData();
          formData.append("file", profileImageFile);
          formData.append("bucket", "employee-avatars");
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          const data = await res.json();
          if (res.ok && data.url) {
            finalAvatarUrl = data.url;
          }
        } catch (uploadErr) {
          console.error("Profile image S3 upload error:", uploadErr);
        }
      }

      const bVal = Number(salaryBasic) || 0;
      const gVal = bVal + (Number(salaryHra) || 0) + (Number(salaryTelephone) || 0) + (Number(salaryFuel) || 0) + (Number(salaryProfDev) || 0) + (Number(salaryLta) || 0) + (Number(salaryAllowances) || 0);

      const calculatedPf = pfMode === "fixed_1800"
        ? 1800
        : pfMode === "custom"
        ? (Number(salaryPf) || 0)
        : Math.round(bVal * 0.12);

      const calculatedTds = tdsOptIn
        ? (tdsMode === "custom" ? (Number(salaryTds) || 0) : Math.round(gVal * 0.05))
        : 0;

      const calculatedEsi = esiOptIn
        ? (esiMode === "custom" && salaryEsi !== "" ? (Number(salaryEsi) || 0) : (gVal <= 21000 ? Math.round(gVal * 0.0075) : 0))
        : 0;

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
        employmentType,
        salary: {
          basic: bVal,
          hra: Number(salaryHra) || 0,
          telephone: Number(salaryTelephone) || 0,
          fuel: Number(salaryFuel) || 0,
          professionalDev: Number(salaryProfDev) || 0,
          lta: Number(salaryLta) || 0,
          allowances: Number(salaryAllowances) || 0,
          pfDeduction: calculatedPf,
          pfMode,
          tdsDeduction: calculatedTds,
          tdsMode,
          tdsOptIn,
          esiOptIn,
          esiMode,
          esiDeduction: calculatedEsi,
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
        avatarUrl: finalAvatarUrl,
        customFields: {
          ...(employee.customFields || {}),
          pan: pan.trim(),
          uan: uan.trim(),
        },
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
  const telVal = Number(salaryTelephone) || 0;
  const fuelVal = Number(salaryFuel) || 0;
  const profDevVal = Number(salaryProfDev) || 0;
  const ltaVal = Number(salaryLta) || 0;
  const allowVal = Number(salaryAllowances) || Math.round(basicVal * 0.2);
  const grossVal = basicVal + hraVal + telVal + fuelVal + profDevVal + ltaVal + allowVal;
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
              {isEditing ? <Pencil className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-800 dark:text-white text-base sm:text-lg flex items-center">
                {isEditing ? "Edit Employee Information" : "Employee Profile"}
              </h3>
              <p className="text-xs text-slate-400 dark:text-gray-400">
                {isEditing
                  ? "Modify personnel credentials, financial specs, and address details"
                  : "Personnel record and organizational details overview"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1e1e1e] dark:hover:bg-[#252525] text-slate-600 dark:text-gray-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>View Profile</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        {!isEditing ? (
          /* View Profile Mode */
          <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
            {/* Profile Hero Header Card */}
            <div className="relative p-6 rounded-3xl bg-linear-to-br from-emerald-500/10 via-slate-500/5 to-emerald-500/10 dark:from-emerald-950/30 dark:via-slate-900/30 dark:to-emerald-950/30 border border-emerald-500/20 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="relative shrink-0">
                <img
                  src={profileImagePreview || avatarUrl}
                  alt={fullName}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white dark:border-[#1a1a1a] shadow-lg ring-4 ring-emerald-500/30"
                />
                <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-[#1f1f1f] rounded-full shadow-xs" title="Active Account" />
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-800 dark:text-white">
                    {prefix ? `${prefix}. ` : ""}{fullName}
                  </h2>
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                    {roleType === "admin" ? "Administrator" : roleType === "hr" ? "HR Manager" : "Employee"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-slate-700">
                    {status}
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-600 dark:text-emerald-400/90 flex items-center justify-center sm:justify-start gap-1.5">
                  <Building className="w-3.5 h-3.5" />
                  <span>{designations.find(d => d.id === desigId)?.title || "Team Member"}</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span>{dept}</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span>{branch}</span>
                </p>

                <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-mono text-slate-700 dark:text-gray-300">{email}</span>
                  </div>
                  {phone && (
                    <div className="flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="font-mono text-slate-700 dark:text-gray-300">{phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* View Section Details */}
            {(() => {
              let vSecIdx = 0;
              return (
                <div className="space-y-6">
                  {/* Section: Personnel Credentials */}
                  <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-[#141414]/50 border border-slate-200/80 dark:border-[#222] space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 dark:border-[#222] pb-2">
                      <User className="w-4 h-4 text-emerald-500" />
                      <span>{++vSecIdx}. Personnel Credentials</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">Prefix</span>
                        <span className="font-semibold text-slate-700 dark:text-gray-200">{prefix}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">Full Name</span>
                        <span className="font-bold text-slate-800 dark:text-gray-100">{fullName}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">Gender</span>
                        <span className="font-semibold text-slate-700 dark:text-gray-200">{gender}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">Email Address</span>
                        <span className="font-mono text-slate-700 dark:text-gray-200">{email}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">Phone Number</span>
                        <span className="font-mono text-slate-700 dark:text-gray-200">{phone || "Not set"}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">Role Type</span>
                        <span className="font-semibold text-slate-700 dark:text-gray-200 capitalize">
                          {roleType === "admin" ? "Administrator" : roleType === "hr" ? "HR Manager" : "Employee"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">Employment Status</span>
                        <span className="inline-block px-2.5 py-0.5 mt-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          {status}
                        </span>
                      </div>
                      {(role === "admin" || role === "hr") && (
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">Employment Type</span>
                          <span className="font-semibold text-slate-700 dark:text-gray-200 capitalize">{employmentType ? employmentType : "Not specified"}</span>
                        </div>
                      )}
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">Date of Birth</span>
                        <span className="font-semibold text-slate-700 dark:text-gray-200">{dateOfBirth || "Not specified"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Section: Designation & Placement */}
                  {(role === "admin" || role === "hr") && (
                    <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-[#141414]/50 border border-slate-200/80 dark:border-[#222] space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 dark:border-[#222] pb-2">
                        <Building className="w-4 h-4 text-emerald-500" />
                        <span>{++vSecIdx}. Designation & Placement</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">Department</span>
                          <span className="font-semibold text-slate-700 dark:text-gray-200">{dept}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">Corporate Designation</span>
                          <span className="font-semibold text-slate-700 dark:text-gray-200">
                            {designations.find(d => d.id === desigId)?.title || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">Branch Office</span>
                          <span className="font-semibold text-slate-700 dark:text-gray-200">{branch}</span>
                        </div>
                      </div>
                    </div>
                  )}

                   {/* Section: Salary Allocation */}
                  {role === "admin" && (
                    <div className="p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider border-b border-emerald-200/50 dark:border-emerald-900/30 pb-2">
                        <Calculator className="w-4 h-4 text-emerald-500" />
                        <span>{++vSecIdx}. Bank &amp; Compensation Allocation (Monthly)</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-400">Basic (INR)</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-gray-100">₹{basicVal.toLocaleString("en-IN")}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-400">HRA (INR)</span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-gray-300">₹{hraVal.toLocaleString("en-IN")}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-400">Telephone (INR)</span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-gray-300">₹{telVal.toLocaleString("en-IN")}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-400">Fuel (INR)</span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-gray-300">₹{fuelVal.toLocaleString("en-IN")}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-400">Prof. Dev (INR)</span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-gray-300">₹{profDevVal.toLocaleString("en-IN")}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-400">LTA (INR)</span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-gray-300">₹{ltaVal.toLocaleString("en-IN")}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-400">Special Allow.</span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-gray-300">₹{allowVal.toLocaleString("en-IN")}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-400">PF Deduction</span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-gray-300">₹{pfVal.toLocaleString("en-IN")}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-400">TDS Deduction</span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-gray-300">₹{tdsVal.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-emerald-200/50 dark:border-emerald-900/30 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        <span>Gross: ₹{grossVal.toLocaleString("en-IN")}</span>
                        <span>Net Pay: ₹{netVal.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  )}

                  {/* Section: Bank Account Specs */}
                  <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-[#141414]/50 border border-slate-200/80 dark:border-[#222] space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 dark:border-[#222] pb-2">
                      <CreditCard className="w-4 h-4 text-emerald-500" />
                      <span>{++vSecIdx}. Bank Account Specs</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">Account Number</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-gray-200">{bankAccount || "Not provided"}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">Bank Name</span>
                        <span className="font-semibold text-slate-700 dark:text-gray-200">{bankName || "Not provided"}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">IFSC Code</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-gray-200">{bankIfsc || "Not provided"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Section: Contact & Address Details */}
                  <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-[#141414]/50 border border-slate-200/80 dark:border-[#222] space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 dark:border-[#222] pb-2">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      <span>{++vSecIdx}. Contact & Address Details</span>
                    </div>
                    <div className="text-xs">
                      <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">Residential Address</span>
                      <p className="font-medium text-slate-700 dark:text-gray-200 mt-1 whitespace-pre-line">{address || "No address specified."}</p>
                    </div>
                  </div>

                  {/* Section: Emergency Contact Details */}
                  <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-[#141414]/50 border border-slate-200/80 dark:border-[#222] space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 dark:border-[#222] pb-2">
                      <PhoneCall className="w-4 h-4 text-emerald-500" />
                      <span>{++vSecIdx}. Emergency Contact Details</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">Contact Name</span>
                        <span className="font-semibold text-slate-700 dark:text-gray-200">{emergencyName || "N/A"}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">Relationship</span>
                        <span className="font-semibold text-slate-700 dark:text-gray-200">{emergencyRelation || "N/A"}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">Emergency Phone</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-gray-200">{emergencyPhone || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Section: Tax & Compliance IDs */}
                  <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-[#141414]/50 border border-slate-200/80 dark:border-[#222] space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 dark:border-[#222] pb-2">
                      <CreditCard className="w-4 h-4 text-emerald-500" />
                      <span>{++vSecIdx}. Tax &amp; Compliance IDs</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">PAN Number</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-gray-200">{pan || <span className="text-slate-400 italic">Not provided</span>}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400 dark:text-gray-500">UAN Number</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-gray-200">{uan || <span className="text-slate-400 italic">Not provided</span>}</span>
                      </div>
                    </div>
                  </div>

                  {/* Section: Employee Bio */}
                  <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-[#141414]/50 border border-slate-200/80 dark:border-[#222] space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 dark:border-[#222] pb-2">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      <span>{++vSecIdx}. Employee Bio / Profile Summary</span>
                    </div>
                    <div className="text-xs">
                      <p className="font-medium text-slate-700 dark:text-gray-200 leading-relaxed whitespace-pre-line">{bio || "No summary provided."}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* View Mode Action Footer */}
            <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-[#1a1a1a]">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-100 dark:bg-[#1a1a1a] hover:bg-slate-200 dark:hover:bg-[#252525] text-slate-600 dark:text-gray-300 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center space-x-2 cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
                <span>Edit Employee Information</span>
              </button>
            </div>
          </div>
        ) : (
          /* Edit Profile Form Mode */
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
            {(() => {
              let secIdx = 0;
              return (
                <>
                  {/* Section: Personnel Credentials */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#1a1a1a] pb-2">
                      <User className="w-4 h-4 text-emerald-500" />
                      <span>{++secIdx}. Personnel Credentials</span>
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

                      {(role === "admin" || role === "hr") && (
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
                      )}

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
                          <option value="Resigned">Resigned (Triggers Exit Clearance)</option>
                        </select>
                      </div>

                      {(role === "admin" || role === "hr") && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">Employment Type</label>
                          <select
                            value={employmentType}
                            onChange={(e) => setEmploymentType(e.target.value as any)}
                            className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222] focus:outline-none focus:border-emerald-500 font-medium"
                          >
                            <option value="">Select Employment Type...</option>
                            <option value="permanent">Permanent</option>
                            <option value="contract">Contract</option>
                            <option value="consultant">Consultant</option>
                          </select>
                        </div>
                      )}

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
                          src={profileImagePreview || avatarUrl}
                          alt="Profile Preview"
                          className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/40 shadow-xs shrink-0"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300">Employee Profile Photo</label>
                            {profileImageFile && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                                Uploading {profileImageFile.name} on save
                              </span>
                            )}
                          </div>
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
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
                            >
                              Choose Photo
                            </button>
                            <input
                              type="text"
                              value={profileImageFile ? `Selected file: ${profileImageFile.name}` : avatarUrl}
                              onChange={(e) => {
                                setAvatarUrl(e.target.value);
                                setProfileImageFile(null);
                                setProfileImagePreview(null);
                              }}
                              placeholder="Or paste image URL"
                              readOnly={!!profileImageFile}
                              className="flex-1 bg-white dark:bg-[#0c0c0c] text-slate-800 dark:text-gray-200 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#2a2a2a] focus:outline-none focus:border-emerald-500 font-mono"
                            />
                            {profileImageFile && (
                              <button
                                type="button"
                                onClick={() => {
                                  setProfileImageFile(null);
                                  setProfileImagePreview(null);
                                }}
                                className="px-2 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-gray-300 text-[11px] rounded-lg cursor-pointer"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section: Designation & Placement (Only for Admin / HR) */}
                  {(role === "admin" || role === "hr") && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#1a1a1a] pb-2">
                        <Building className="w-4 h-4 text-emerald-500" />
                        <span>{++secIdx}. Designation & Placement</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">Department</label>
                          <select
                            value={dept}
                            onChange={(e) => setDept(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222] focus:outline-none focus:border-emerald-500 font-medium"
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
                  )}

                  {/* Section: Salary Allocation (Only for Admin) */}
                  {role === "admin" && (
                    <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                        <Calculator className="w-4 h-4 text-emerald-500" />
                        <span>{++secIdx}. Bank & Compensation Allocation (Monthly)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-gray-200 mb-1">
                            Basic (INR) <span className="text-emerald-500 font-normal">(Editable)</span>
                          </label>
                          <input
                            type="number"
                            value={salaryBasic}
                            onChange={(e) => setSalaryBasic(e.target.value)}
                            className="w-full bg-white dark:bg-[#0c0c0c] text-slate-800 dark:text-gray-100 px-3 py-2 text-xs rounded-xl border-2 border-emerald-500/50 dark:border-emerald-500/40 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                            placeholder="e.g. 30000"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 dark:text-gray-400 mb-1">
                            HRA (INR) <span className="text-[9px] text-slate-400 font-normal">(40% Auto)</span>
                          </label>
                          <input
                            type="number"
                            value={hraVal}
                            readOnly
                            disabled
                            className="w-full bg-slate-100/80 dark:bg-[#141414] text-slate-600 dark:text-gray-400 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#222] font-mono font-medium cursor-not-allowed opacity-80"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 dark:text-gray-400 mb-1">
                            Allowances <span className="text-[9px] text-slate-400 font-normal">(20% Auto)</span>
                          </label>
                          <input
                            type="number"
                            value={allowVal}
                            readOnly
                            disabled
                            className="w-full bg-slate-100/80 dark:bg-[#141414] text-slate-600 dark:text-gray-400 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#222] font-mono font-medium cursor-not-allowed opacity-80"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 dark:text-gray-400 mb-1">
                            PF Rule <span className="text-[9px] text-emerald-500 font-bold">(12% vs Fixed ₹1800)</span>
                          </label>
                          <select
                            value={pfMode}
                            onChange={e => setPfMode(e.target.value as any)}
                            className="w-full bg-white dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#222] font-semibold"
                          >
                            <option value="percentage">12% of Basic (₹{Math.round(basicVal * 0.12).toLocaleString()})</option>
                            <option value="fixed_1800">Fixed ₹1,800 Cap</option>
                            <option value="custom">Custom Manual ₹</option>
                          </select>
                          {pfMode === "custom" && (
                            <input
                              type="number"
                              min="0"
                              value={salaryPf}
                              onChange={e => setSalaryPf(e.target.value)}
                              placeholder="Enter custom PF ₹"
                              className="w-full bg-white dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-[#222] font-mono font-bold mt-1"
                            />
                          )}
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-gray-400">TDS Income Tax</label>
                            <button
                              type="button"
                              onClick={() => setTdsOptIn(!tdsOptIn)}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${tdsOptIn ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}
                            >
                              {tdsOptIn ? "Opted IN" : "Opted OUT"}
                            </button>
                          </div>
                          {tdsOptIn ? (
                            <div className="space-y-1">
                              <select
                                value={tdsMode}
                                onChange={e => setTdsMode(e.target.value as any)}
                                className="w-full bg-white dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#222] font-semibold"
                              >
                                <option value="slab">Auto Slab (5%)</option>
                                <option value="custom">Manual Amount (₹)</option>
                              </select>
                              {tdsMode === "custom" && (
                                <input
                                  type="number"
                                  min="0"
                                  value={salaryTds}
                                  onChange={e => setSalaryTds(e.target.value)}
                                  placeholder="Manual TDS ₹"
                                  className="w-full bg-white dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-[#222] font-mono font-bold"
                                />
                              )}
                            </div>
                          ) : (
                            <div className="p-2 bg-slate-100 dark:bg-[#141414] text-slate-400 text-[10px] rounded-xl italic">TDS Disabled</div>
                          )}
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-gray-400">ESI Deduction Rule</label>
                            <button
                              type="button"
                              onClick={() => setEsiOptIn(!esiOptIn)}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${esiOptIn ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}
                            >
                              {esiOptIn ? "✓ ESI Active" : "✕ ESI Exempt"}
                            </button>
                          </div>
                          {esiOptIn ? (
                            <div className="space-y-1.5 pt-0.5">
                              <div className="grid grid-cols-2 gap-1 text-xs">
                                <button
                                  type="button"
                                  onClick={() => setEsiMode("auto")}
                                  className={`py-1 px-1.5 rounded-lg border font-bold text-[9px] transition-all cursor-pointer ${esiMode === "auto" ? "bg-blue-600 text-white border-blue-600 shadow-xs" : "bg-white dark:bg-[#141414] text-slate-600 dark:text-gray-300 border-slate-200 dark:border-[#222]"}`}
                                >
                                  Auto Rule
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEsiMode("custom")}
                                  className={`py-1 px-1.5 rounded-lg border font-bold text-[9px] transition-all cursor-pointer ${esiMode === "custom" ? "bg-blue-600 text-white border-blue-600 shadow-xs" : "bg-white dark:bg-[#141414] text-slate-600 dark:text-gray-300 border-slate-200 dark:border-[#222]"}`}
                                >
                                  Manual Amount (₹)
                                </button>
                              </div>
                              {esiMode === "custom" && (
                                <input
                                  type="number"
                                  min="0"
                                  value={salaryEsi}
                                  onChange={e => setSalaryEsi(e.target.value)}
                                  placeholder="Manual ESI ₹"
                                  className="w-full bg-white dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-[#222] font-mono font-bold"
                                />
                              )}
                            </div>
                          ) : (
                            <div className="p-2 bg-slate-100 dark:bg-[#141414] text-slate-400 text-[10px] rounded-xl italic">ESI Exempted</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-emerald-200/50 dark:border-emerald-900/30 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        <span>Gross: ₹{grossVal.toLocaleString("en-IN")}</span>
                        <span>Net Pay: ₹{netVal.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  )}

                  {/* Section: Bank Details */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#1a1a1a] pb-2">
                      <CreditCard className="w-4 h-4 text-emerald-500" />
                      <span>{++secIdx}. Bank Account Specs</span>
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

                  {/* Section: Address */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#1a1a1a] pb-2">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      <span>{++secIdx}. Contact & Address Details</span>
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

                  {/* Section: Emergency Contact */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#1a1a1a] pb-2">
                      <PhoneCall className="w-4 h-4 text-emerald-500" />
                      <span>{++secIdx}. Emergency Contact Details</span>
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

                  {/* Section: Tax & Compliance IDs */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#1a1a1a] pb-2">
                      <CreditCard className="w-4 h-4 text-emerald-500" />
                      <span>{++secIdx}. Tax &amp; Compliance IDs</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">PAN Number</label>
                        <input
                          type="text"
                          value={pan}
                          onChange={(e) => setPan(e.target.value.toUpperCase())}
                          maxLength={10}
                          placeholder="e.g. ABCDE1234F"
                          className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222] font-mono uppercase focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">UAN Number</label>
                        <input
                          type="text"
                          value={uan}
                          onChange={(e) => setUan(e.target.value)}
                          maxLength={12}
                          placeholder="e.g. 101234567890"
                          className="w-full bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-gray-200 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#222] font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section: Biography */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#1a1a1a] pb-2">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      <span>{++secIdx}. Employee Bio / Profile Summary</span>
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
                </>
              );
            })()}

            {/* Edit Mode Action Footer */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-[#1a1a1a]">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-[#1a1a1a] hover:bg-slate-200 dark:hover:bg-[#252525] text-slate-600 dark:text-gray-300 rounded-xl font-bold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Back to Profile View</span>
              </button>

              <div className="flex items-center space-x-3">
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
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
