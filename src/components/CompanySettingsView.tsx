"use client";

import React, { useState, useEffect } from "react";
import { Building2, Save, FileCheck, Shield, CheckCircle2, AlertCircle, RefreshCw, Eye, Sparkles, MapPin, UserCheck, Receipt } from "lucide-react";

export interface CompanySettingsData {
  companyId: string;
  name?: string;
  logoUrl?: string;
  pan: string;
  tan: string;
  gstin?: string;
  address?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
}

interface CompanySettingsViewProps {
  companyId: string;
  companyName: string;
  companyLogoUrl?: string;
  onSaveCompanySettings?: (settings: CompanySettingsData) => Promise<void> | void;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
}

export default function CompanySettingsView({
  companyId,
  companyName,
  companyLogoUrl,
  onSaveCompanySettings,
  showToast
}: CompanySettingsViewProps) {
  const [pan, setPan] = useState("");
  const [tan, setTan] = useState("");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryDesignation, setSignatoryDesignation] = useState("Principal Payroll Officer");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      if (!companyId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await fetch(`/api/company-settings?companyId=${companyId}`);
        const data = await res.json();
        if (data.success && data.companySettings) {
          const s = data.companySettings;
          setPan(s.pan || localStorage.getItem(`snailhr_companyPan_${companyId}`) || localStorage.getItem("snailhr_companyPan") || "");
          setTan(s.tan || localStorage.getItem(`snailhr_companyTan_${companyId}`) || localStorage.getItem("snailhr_companyTan") || "");
          setGstin(s.gstin || "");
          setAddress(s.address || "");
          setSignatoryName(s.signatoryName || "");
          setSignatoryDesignation(s.signatoryDesignation || "Principal Payroll Officer");
        }
      } catch (err) {
        console.error("Failed to load company settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [companyId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      showToast?.("Company ID is missing", "error");
      return;
    }

    setSaving(true);
    setSavedSuccess(false);

    const payload: CompanySettingsData = {
      companyId,
      name: companyName,
      logoUrl: companyLogoUrl,
      pan: pan.trim().toUpperCase(),
      tan: tan.trim().toUpperCase(),
      gstin: gstin.trim().toUpperCase(),
      address: address.trim(),
      signatoryName: signatoryName.trim(),
      signatoryDesignation: signatoryDesignation.trim(),
    };

    try {
      const res = await fetch("/api/company-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem(`snailhr_companyPan_${companyId}`, payload.pan);
        localStorage.setItem(`snailhr_companyTan_${companyId}`, payload.tan);
        localStorage.setItem("snailhr_companyPan", payload.pan);
        localStorage.setItem("snailhr_companyTan", payload.tan);

        if (onSaveCompanySettings) {
          await onSaveCompanySettings(payload);
        }

        setSavedSuccess(true);
        showToast?.("Company tax settings saved successfully!", "success");
        setTimeout(() => setSavedSuccess(false), 4000);
      } else {
        showToast?.(data.error || "Failed to save company settings", "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast?.(err.message || "Network error while saving settings", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0a0a0a] p-6 rounded-2xl border border-slate-200/80 dark:border-[#1a1a1a] shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-xs">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Company Settings</span>
              <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Form 16 & Tax Compliance
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
              Manage organization details, Employer PAN, TAN, and official authorized signatory for {companyName || "your company"}
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Saved &amp; Synced to Form 16</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Settings Form */}
        <div className="lg:col-span-2 space-y-6">

          {/* Active Company Card */}
          <div className="bg-white dark:bg-[#0a0a0a] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-[#1a1a1a] shadow-xs space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-[#1a1a1a]">
              <Shield className="w-4.5 h-4.5 text-emerald-500" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-gray-200">Company Identity</h2>
            </div>

            <div className="flex items-center gap-4">
              {companyLogoUrl ? (
                <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-[#222] p-1.5 bg-white shrink-0 flex items-center justify-center overflow-hidden">
                  <img src={companyLogoUrl} alt={companyName} className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-[#151515] border border-slate-200 dark:border-[#222] flex items-center justify-center text-slate-400 shrink-0">
                  <Building2 className="w-7 h-7" />
                </div>
              )}
              <div className="space-y-0.5">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">{companyName || "Organization"}</h3>
                <p className="text-xs text-slate-400 font-mono">Company ID: {companyId}</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Logged-in Tenant Scope</p>
              </div>
            </div>
          </div>

          {/* Employer Tax & Statutory Identifiers */}
          <div className="bg-white dark:bg-[#0a0a0a] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-[#1a1a1a] shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1a1a1a]">
              <div className="flex items-center space-x-3">
                <FileCheck className="w-4.5 h-4.5 text-violet-500" />
                <div>
                  <h2 className="text-sm font-bold text-slate-800 dark:text-gray-200">Employer Tax Numbers (Form 16 Part-B)</h2>
                  <p className="text-[11px] text-slate-400">These details are printed on all employee Form 16 Part-B Certificates &amp; TDS statements</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* PAN of Employer */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300">
                  PAN of Employer <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  placeholder="e.g. AACCM9821L"
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl text-sm font-mono tracking-wider font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 text-slate-800 dark:text-white"
                />
                <p className="text-[10px] text-slate-400">10-character Permanent Account Number of the company</p>
              </div>

              {/* TAN of Employer */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300">
                  TAN of Employer <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={tan}
                  onChange={(e) => setTan(e.target.value.toUpperCase())}
                  placeholder="e.g. DELM01928A"
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl text-sm font-mono tracking-wider font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 text-slate-800 dark:text-white"
                />
                <p className="text-[10px] text-slate-400">10-character Tax Deduction and Collection Account Number</p>
              </div>

              {/* GSTIN */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 07AACCM9821L1Z5"
                  maxLength={15}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl text-sm font-mono tracking-wider focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 text-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Registered Office Address */}
          <div className="bg-white dark:bg-[#0a0a0a] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-[#1a1a1a] shadow-xs space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-[#1a1a1a]">
              <MapPin className="w-4.5 h-4.5 text-blue-500" />
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-gray-200">Registered Office Address</h2>
                <p className="text-[11px] text-slate-400">Printed on official employee payslips and corporate statements</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300">
                Full Registered Address
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Unit 402, 4th Floor, Tower B, Sector 62, Noida, Uttar Pradesh 201309"
                rows={3}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 text-slate-800 dark:text-white resize-none"
              />
            </div>
          </div>

          {/* Authorized Signatory Details */}
          <div className="bg-white dark:bg-[#0a0a0a] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-[#1a1a1a] shadow-xs space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-[#1a1a1a]">
              <UserCheck className="w-4.5 h-4.5 text-amber-500" />
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-gray-200">Authorized Signatory / Verification Officer</h2>
                <p className="text-[11px] text-slate-400">The officer certifying the Form 16 Part-B deduction statements</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300">
                  Signatory Full Name
                </label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 text-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300">
                  Designation / Capacity
                </label>
                <input
                  type="text"
                  value={signatoryDesignation}
                  onChange={(e) => setSignatoryDesignation(e.target.value)}
                  placeholder="e.g. Principal Payroll Officer / Director"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 text-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="submit"
              disabled={saving || loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Company Tax Details</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Form 16 Employer Header Preview */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0a0a0a] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-[#1a1a1a] shadow-xs space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-[#1a1a1a]">
              <Eye className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-gray-200">
                Live Form 16 Header Preview
              </h3>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-gray-400">
              Here is how your company details will appear in the employer header on Form 16 Part-B:
            </p>

            <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden text-xs bg-slate-50/50 dark:bg-[#121212]/50 font-sans">
              <div className="p-3 border-b border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-[#181818] font-bold text-center text-slate-800 dark:text-gray-200 text-[11px]">
                FORM 16 PART-B (EMPLOYER PARTICULARS)
              </div>
              <table className="w-full text-[11px] border-collapse">
                <tbody>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <td className="p-2 font-bold text-slate-500 dark:text-gray-400 w-2/5 bg-slate-50 dark:bg-[#141414]">Employer Name</td>
                    <td className="p-2 font-semibold text-slate-800 dark:text-white">{companyName || "—"}</td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <td className="p-2 font-bold text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-[#141414]">Employer PAN</td>
                    <td className="p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400">{pan || <span className="text-slate-400 italic font-normal">Not configured</span>}</td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <td className="p-2 font-bold text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-[#141414]">Employer TAN</td>
                    <td className="p-2 font-mono font-bold text-violet-600 dark:text-violet-400">{tan || <span className="text-slate-400 italic font-normal">Not configured</span>}</td>
                  </tr>
                  {gstin && (
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-2 font-bold text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-[#141414]">GSTIN</td>
                      <td className="p-2 font-mono text-slate-700 dark:text-gray-300">{gstin}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="p-2 font-bold text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-[#141414]">Signatory</td>
                    <td className="p-2 text-slate-700 dark:text-gray-300">{signatoryName ? `${signatoryName} (${signatoryDesignation})` : "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/40 rounded-xl space-y-1 text-[11px] text-violet-800 dark:text-violet-300">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Multi-Tenant Isolation
              </p>
              <p className="leading-relaxed text-[10px] text-violet-700 dark:text-violet-400">
                These numbers are saved strictly per company ID. Admins of <strong>Code Vamp Tech</strong> configure their own PAN/TAN, and admins of <strong>MGM Financiers</strong> configure theirs independently.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
