"use client";

import React, { useState, useEffect } from "react";
import {
  Building2, Users, Shield, Plus, CheckCircle,
  XCircle, ShieldCheck, LogOut, Check, Sun, Moon, X,
  RefreshCw, AlertCircle, Pencil
} from "lucide-react";
import { Company } from "../types";
import OnboardAgentSlideover from "./OnboardAgentSlideover";

interface SuperAdminDashboardProps {
  onLogout: () => void;
}

export default function SuperAdminDashboard({ onLogout }: SuperAdminDashboardProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanySlug, setNewCompanySlug] = useState("");
  const [newCompanyModel, setNewCompanyModel] = useState<1 | 2 | 3 | 4>(1);
  const [newCompanyLogoUrl, setNewCompanyLogoUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit company state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editLogoUploading, setEditLogoUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [isOnboardOpen, setIsOnboardOpen] = useState(false);

  // Dark mode — syncs with the same key as the main app
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("snailhr_theme") === "dark" ||
        document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("snailhr_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("snailhr_theme", "light");
    }
  }, [darkMode]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/superadmin/companies");
      const data = await res.json();
      if (res.ok && data.success) {
        setCompanies(data.companies);
      } else {
        throw new Error(data.error || "Failed to load companies");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch companies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleNameChange = (name: string) => {
    setNewCompanyName(name);
    setNewCompanySlug(
      name.toLowerCase().trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
    );
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName || !newCompanySlug) return;
    setCreating(true);
    try {
      const res = await fetch("/api/superadmin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCompanyName, slug: newCompanySlug, subscriptionModel: newCompanyModel, logoUrl: newCompanyLogoUrl || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsCreateCompanyOpen(false);
        setNewCompanyName(""); setNewCompanySlug(""); setNewCompanyModel(1); setNewCompanyLogoUrl("");
        showToast(`${newCompanyName} provisioned successfully.`);
        fetchCompanies();
      } else {
        showToast(data.error || "Failed to create company", "error");
      }
    } catch {
      showToast("Error creating company", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "company-logo");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        setNewCompanyLogoUrl(data.url);
      } else {
        showToast(data.error || "Logo upload failed", "error");
      }
    } catch {
      showToast("Error uploading logo", "error");
    } finally {
      setLogoUploading(false);
    }
  };

  const openEdit = (company: Company, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditCompany(company);
    setEditName(company.name);
    setEditSlug(company.slug);
    setEditLogoUrl(company.logoUrl || "");
    setIsEditOpen(true);
  };

  const handleEditLogoUpload = async (file: File) => {
    setEditLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "company-logo");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        setEditLogoUrl(data.url);
      } else {
        showToast(data.error || "Logo upload failed", "error");
      }
    } catch {
      showToast("Error uploading logo", "error");
    } finally {
      setEditLogoUploading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCompany || !editName || !editSlug) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/superadmin/companies/${editCompany.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          slug: editSlug,
          logoUrl: editLogoUrl || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsEditOpen(false);
        showToast(`${editName} updated successfully.`);
        fetchCompanies();
        // Update selected company if it's the one being edited
        if (selectedCompany?.id === editCompany.id) {
          setSelectedCompany(prev => prev ? { ...prev, name: editName, slug: editSlug, logoUrl: editLogoUrl || undefined } : null);
        }
      } else {
        showToast(data.error || "Failed to update company", "error");
      }
    } catch {
      showToast("Error updating company", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCompany = async (id: string, updates: Partial<Company>) => {
    try {
      const res = await fetch(`/api/superadmin/companies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchCompanies();
        if (selectedCompany?.id === id) {
          setSelectedCompany(prev => prev ? { ...prev, ...updates } : null);
        }
      } else {
        showToast(data.error || "Failed to update company", "error");
      }
    } catch {
      showToast("Error updating company", "error");
    }
  };

  const handleSelectCompany = async (company: Company) => {
    setSelectedCompany(company);
    setLoadingUsers(true);
    setCompanyUsers([]);
    try {
      const res = await fetch(`/api/superadmin/companies/${company.id}/users`);
      const data = await res.json();
      if (res.ok && data.success) setCompanyUsers(data.users);
    } catch {
      console.error("Failed to fetch users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAdminCreated = () => {
    showToast(`Admin user created for ${selectedCompany?.name}.`);
    if (selectedCompany) handleSelectCompany(selectedCompany);
    fetchCompanies();
  };

  const getModelBadge = (model: number) => {
    const map: Record<number, { label: string; cls: string }> = {
      1: { label: "Basic", cls: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700" },
      2: { label: "WhatsApp", cls: "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900/50" },
      3: { label: "Chatbot", cls: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50" },
      4: { label: "Full Suite", cls: "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-900/50" },
    };
    return map[model] || map[1];
  };

  const getRoleBadge = (role: string) => {
    if (role === "admin") return "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-900/50";
    if (role === "hr") return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50";
    return "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700";
  };

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => c.isActive).length;
  const totalEmployees = companies.reduce((s, c) => s + (c.totalEmployees || 0), 0);
  const totalAdmins = companies.reduce((s, c) => s + (c.totalAdmins || 0), 0);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 antialiased">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[200] flex items-center space-x-3 px-4 py-3 rounded-2xl border text-xs font-semibold shadow-lg transition-all ${toast.type === "success"
            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50"
            : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50"
          }`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Header ── matches the main app header exactly */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-md border-b border-slate-100 dark:border-[#1a1a1a]/80 px-4 py-2.5 shadow-xs flex items-center justify-between gap-2">
        {/* Left — branding */}
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl flex items-center justify-center text-white shadow-md shadow-violet-600/20">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-extrabold text-sm text-slate-800 dark:text-white tracking-tight leading-none">
              SnailHR <span className="text-violet-500">Console</span>
            </span>
            <span className="text-[9px] font-bold tracking-widest text-slate-400 dark:text-gray-500 uppercase leading-none mt-0.5">
              Super Admin Panel
            </span>
          </div>
        </div>

        {/* Right — controls */}
        <div className="flex items-center space-x-2">
          {/* Active badge */}
          <div className="hidden sm:flex items-center bg-slate-50 dark:bg-[#0f0f0f] px-3 py-1.5 rounded-xl border border-slate-100 dark:border-[#1a1a1a] text-xs gap-2 shadow-xs">
            <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
            <span className="text-slate-400 font-semibold hidden md:inline">Logged in:</span>
            <span className="text-slate-800 dark:text-gray-200 font-bold">Super Administrator</span>
          </div>

          {/* Sign out */}
          <button
            onClick={onLogout}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl border border-rose-100/50 dark:border-rose-900/20 transition-all cursor-pointer shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center justify-center p-2 bg-slate-50 dark:bg-[#0f0f0f] text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-violet-400 rounded-xl border border-slate-100 dark:border-[#1a1a1a] transition-colors cursor-pointer"
            title="Toggle dark mode"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* Error banner */}
        {error && (
          <div className="flex items-center space-x-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Companies", value: totalCompanies, icon: <Building2 className="w-5 h-5" />, color: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900/50" },
            { label: "Active Tenants", value: activeCompanies, icon: <CheckCircle className="w-5 h-5" />, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50" },
            { label: "Admin Users", value: totalAdmins, icon: <ShieldCheck className="w-5 h-5" />, color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/50" },
            { label: "Total Workforce", value: totalEmployees, icon: <Users className="w-5 h-5" />, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50" },
          ].map(stat => (
            <div key={stat.label} className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] p-4 rounded-2xl flex items-center space-x-4 shadow-xs">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{stat.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Split Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Companies List */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-3xl p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-slate-800 dark:text-white">Tenant Organizations</h2>
                <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">Configure corporate instances and subscription plans</p>
              </div>
              <button
                onClick={() => setIsCreateCompanyOpen(true)}
                className="flex items-center space-x-2 text-xs font-semibold px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all cursor-pointer shadow-sm shadow-violet-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create Company</span>
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs font-bold flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Fetching organizations...</span>
              </div>
            ) : companies.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 dark:border-[#1a1a1a] rounded-2xl text-slate-400 dark:text-gray-500 text-xs">
                No organizations yet. Use the <strong>Create Company</strong> button to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {companies.map(company => {
                  const badge = getModelBadge(company.subscriptionModel);
                  return (
                    <div
                      key={company.id}
                      onClick={() => handleSelectCompany(company)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${selectedCompany?.id === company.id
                          ? "bg-violet-50 dark:bg-violet-950/10 border-violet-300 dark:border-violet-800/50 shadow-sm"
                          : "bg-slate-50 dark:bg-[#0a0a0a]/50 border-slate-100 dark:border-[#1a1a1a] hover:border-slate-200 dark:hover:border-[#252525]"
                        }`}
                    >
                      <div className="flex items-start space-x-3.5">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#0f0f0f] flex items-center justify-center shrink-0 border border-slate-100 dark:border-[#1a1a1a] overflow-hidden">
                          {company.logoUrl ? (
                            <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain" />
                          ) : (
                            <Building2 className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white">{company.name}</h4>
                          <p className="text-[10px] font-mono text-slate-400 dark:text-gray-500">slug: {company.slug}</p>
                          <div className="flex items-center space-x-2 mt-1.5">
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${badge.cls}`}>
                              {badge.label}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {company.totalEmployees || 0} employees
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 self-end md:self-center" onClick={e => e.stopPropagation()}>
                        {/* Edit button */}
                        <button
                          onClick={(e) => openEdit(company, e)}
                          className="p-1.5 rounded-lg border border-violet-200 dark:border-violet-900/50 bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors cursor-pointer"
                          title="Edit company"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <select
                          value={company.subscriptionModel}
                          onChange={e => handleUpdateCompany(company.id, { subscriptionModel: Number(e.target.value) as 1 | 2 | 3 | 4 })}
                          className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#1a1a1a] text-[10px] font-semibold text-slate-600 dark:text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-violet-500"
                        >
                          <option value={1}>Model 1: Basic</option>
                          <option value={2}>Model 2: WhatsApp</option>
                          <option value={3}>Model 3: Chatbot</option>
                          <option value={4}>Model 4: Full Suite</option>
                        </select>
                        <button
                          onClick={() => handleUpdateCompany(company.id, { isActive: !company.isActive })}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${company.isActive
                              ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                              : "border-slate-200 dark:border-[#1a1a1a] bg-slate-50 dark:bg-[#0a0a0a] text-slate-400"
                            }`}
                          title={company.isActive ? "Mark Inactive" : "Mark Active"}
                        >
                          {company.isActive ? <Check className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Company Detail Panel */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-3xl p-6 space-y-5 shadow-xs">
            <div>
              <h2 className="font-bold text-base text-slate-800 dark:text-white">Tenant Details</h2>
              <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">Select a company to view users</p>
            </div>

            {selectedCompany ? (
              <div className="space-y-5">
                {/* Company summary */}
                <div className="bg-slate-50 dark:bg-[#0a0a0a]/50 border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {selectedCompany.logoUrl ? (
                        <img src={selectedCompany.logoUrl} alt={selectedCompany.name} className="w-10 h-10 rounded-xl object-contain border border-slate-100 dark:border-[#1a1a1a] bg-white dark:bg-[#0f0f0f]" />
                      ) : null}
                      <div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-white">{selectedCompany.name}</h3>
                        <p className="text-[10px] font-mono text-slate-400 dark:text-gray-500 mt-0.5 truncate max-w-[160px]">ID: {selectedCompany.id}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${selectedCompany.isActive ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50" : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"}`}>
                      {selectedCompany.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-[#1a1a1a] text-xs space-y-1.5">
                    <p className="text-slate-500 dark:text-gray-400">
                      <span className="font-bold text-slate-700 dark:text-gray-300">Plan: </span>
                      {getModelBadge(selectedCompany.subscriptionModel).label}
                    </p>
                    <p className="text-slate-500 dark:text-gray-400">
                      <span className="font-bold text-slate-700 dark:text-gray-300">Created: </span>
                      {new Date(selectedCompany.createdAt).toLocaleDateString()}
                    </p>
                    {selectedCompany.logoUrl && (
                      <p className="text-slate-500 dark:text-gray-400 break-all">
                        <span className="font-bold text-slate-700 dark:text-gray-300">Logo URL: </span>
                        <a href={selectedCompany.logoUrl} target="_blank" rel="noopener noreferrer" className="text-violet-500 underline text-[9px]">{selectedCompany.logoUrl}</a>
                      </p>
                    )}
                  </div>
                </div>

                {/* Users */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Users &amp; Staff</h4>
                    <button
                      onClick={() => setIsOnboardOpen(true)}
                      className="flex items-center space-x-1 text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Admin</span>
                    </button>
                  </div>

                  {loadingUsers ? (
                    <div className="flex justify-center py-8 text-slate-400 dark:text-gray-500 text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Fetching users...
                    </div>
                  ) : companyUsers.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-slate-200 dark:border-[#1a1a1a] rounded-xl text-slate-400 dark:text-gray-500 text-xs">
                      No users created yet.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {companyUsers.map((user: any) => (
                        <div key={user.id} className="p-3 bg-slate-50 dark:bg-[#0a0a0a]/50 border border-slate-100 dark:border-[#1a1a1a] rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white">{user.fullName}</p>
                            <p className="text-[10px] text-slate-400 dark:text-gray-500">{user.email}</p>
                          </div>
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${getRoleBadge(user.role)}`}>
                            {user.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center border border-dashed border-slate-200 dark:border-[#1a1a1a] rounded-2xl text-slate-400 dark:text-gray-500 text-xs">
                Select a company from the list to view its workspace details.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── CREATE COMPANY MODAL ── */}
      {isCreateCompanyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-white">Create Tenant Company</h3>
                <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">Provision a new organization instance</p>
              </div>
              <button onClick={() => setIsCreateCompanyOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1a1a1a]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-px bg-slate-100 dark:bg-[#1a1a1a]" />
            <form onSubmit={handleCreateCompany} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">Company Name</label>
                <input type="text" value={newCompanyName} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Acme Corp" required
                  className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a] text-slate-700 dark:text-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-violet-500 transition-colors" />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">URL Slug</label>
                <input type="text" value={newCompanySlug} onChange={e => setNewCompanySlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))} placeholder="acme-corp" required
                  className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a] text-slate-700 dark:text-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-violet-500 transition-colors font-mono text-[11px]" />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">Subscription Plan</label>
                <select value={newCompanyModel} onChange={e => setNewCompanyModel(Number(e.target.value) as 1 | 2 | 3 | 4)}
                  className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a] text-slate-700 dark:text-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-violet-500 font-semibold">
                  <option value={1}>Model 1: Basic (No WhatsApp / No Chatbot)</option>
                  <option value={2}>Model 2: WhatsApp Only</option>
                  <option value={3}>Model 3: Chatbot Only</option>
                  <option value={4}>Model 4: Full Suite (Both Enabled)</option>
                </select>
              </div>

              {/* Logo Upload */}
              <div className="space-y-2">
                <label className="block text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">Company Logo</label>
                <div className="flex items-center gap-3">
                  {newCompanyLogoUrl ? (
                    <div className="relative shrink-0">
                      <img src={newCompanyLogoUrl} alt="Logo preview" className="w-12 h-12 rounded-xl object-contain border border-slate-200 dark:border-[#1a1a1a] bg-slate-50 dark:bg-[#0a0a0a]" />
                      <button type="button" onClick={() => setNewCompanyLogoUrl("")} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center cursor-pointer">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 dark:border-[#1a1a1a] flex items-center justify-center text-slate-300 dark:text-slate-600 shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                  )}
                  <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors text-[10px] font-semibold ${logoUploading
                      ? "bg-slate-50 dark:bg-[#0a0a0a] border-slate-100 dark:border-[#1a1a1a] text-slate-400 cursor-wait"
                      : "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-900/40 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                    }`}>
                    {logoUploading ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Uploading...</span></>
                    ) : (
                      <><span>📁</span><span>{newCompanyLogoUrl ? "Replace Logo" : "Upload Logo"}</span></>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={logoUploading}
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleLogoUpload(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <p className="text-[9px] text-slate-400 dark:text-gray-500">PNG, JPG, SVG — saved to Supabase S3 storage</p>
              </div>

              <button type="submit" disabled={creating}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-2 mt-2">
                {creating ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Provisioning...</span></> : <span>Provision Company Instance</span>}
              </button>
            </form>
          </div>
        </div>
      )}


      {/* ── ONBOARD AGENT SLIDEOVER ── */}
      {isOnboardOpen && selectedCompany && (
        <OnboardAgentSlideover
          companyId={selectedCompany.id}
          companyName={selectedCompany.name}
          defaultRole="admin"
          onClose={() => setIsOnboardOpen(false)}
          onSuccess={handleAdminCreated}
        />
      )}

      {/* ── EDIT COMPANY MODAL ── */}
      {isEditOpen && editCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-white">Edit Company</h3>
                <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">Update organization details</p>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1a1a1a]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-px bg-slate-100 dark:bg-[#1a1a1a]" />

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* Company Name */}
              <div className="space-y-1">
                <label className="block text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">Company Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  required
                  className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a] text-slate-700 dark:text-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              {/* URL Slug */}
              <div className="space-y-1">
                <label className="block text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">URL Slug</label>
                <input
                  type="text"
                  value={editSlug}
                  onChange={e => setEditSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  placeholder="acme-corp"
                  required
                  className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a] text-slate-700 dark:text-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-violet-500 transition-colors font-mono text-[11px]"
                />
              </div>

              {/* Logo Upload */}
              <div className="space-y-2">
                <label className="block text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">Company Logo</label>
                <div className="flex items-center gap-3">
                  {editLogoUrl ? (
                    <div className="relative shrink-0">
                      <img
                        src={editLogoUrl}
                        alt="Logo preview"
                        className="w-14 h-14 rounded-xl object-contain border border-slate-200 dark:border-[#1a1a1a] bg-slate-50 dark:bg-[#0a0a0a]"
                      />
                      <button
                        type="button"
                        onClick={() => setEditLogoUrl("")}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-rose-400 transition-colors"
                        title="Remove logo"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-200 dark:border-[#1a1a1a] flex items-center justify-center text-slate-300 dark:text-slate-600 shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                  )}

                  <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors text-[10px] font-semibold ${editLogoUploading
                      ? "bg-slate-50 dark:bg-[#0a0a0a] border-slate-100 dark:border-[#1a1a1a] text-slate-400 cursor-wait"
                      : "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-900/40 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                    }`}>
                    {editLogoUploading ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Uploading...</span></>
                    ) : (
                      <><span>📁</span><span>{editLogoUrl ? "Replace Logo" : "Upload Logo"}</span></>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={editLogoUploading}
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleEditLogoUpload(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <p className="text-[9px] text-slate-400 dark:text-gray-500">PNG, JPG, SVG — uploaded to Supabase S3</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 border border-slate-200 dark:border-[#1a1a1a] bg-slate-50 dark:bg-[#0a0a0a] text-slate-600 dark:text-slate-300 font-semibold py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-2 text-xs"
                >
                  {saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Saving...</span></> : <><Check className="w-3.5 h-3.5" /><span>Save Changes</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

