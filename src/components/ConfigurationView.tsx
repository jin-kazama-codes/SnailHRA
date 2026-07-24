"use client";

import React, { useState } from "react";
import { 
  Briefcase, Landmark, Calendar, MapPin, Plus, Trash2, 
  Database, CheckCircle, AlertTriangle, Copy, Check, RefreshCw 
} from "lucide-react";
import { Designation } from "../types";

interface ConfigurationViewProps {
  designations: Designation[];
  customLeaveTypes: string[];
  customDepartments: string[];
  customBranches: string[];
  supabaseStatus: {
    connected: boolean;
    synced: boolean;
    error?: string;
  };
  onAddDesignation: (title: string, department: string) => void;
  onRemoveDesignation: (id: string) => void;
  onUpdateCollection: (
    type: "leaveTypes" | "departments" | "branches", 
    updatedList: string[],
    action?: "add" | "remove",
    item?: string
  ) => void;
}

export default function ConfigurationView({
  designations,
  customLeaveTypes,
  customDepartments,
  customBranches,
  supabaseStatus,
  onAddDesignation,
  onRemoveDesignation,
  onUpdateCollection
}: ConfigurationViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"general" | "designations" | "supabase">("general");

  // Local Form States
  const [newDesignationTitle, setNewDesignationTitle] = useState("");
  const [newDesignationDept, setNewDesignationDept] = useState("");
  
  const [newLeaveType, setNewLeaveType] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newBranch, setNewBranch] = useState("");

  const [copiedSql, setCopiedSql] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSyncDatabase = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/sync-supabase", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncResult({ success: true, message: data.message || "Sync completed successfully!" });
      } else {
        setSyncResult({ success: false, message: data.error || "Sync failed." });
      }
    } catch (err: any) {
      setSyncResult({ success: false, message: err.message || "An error occurred during sync." });
    } finally {
      setSyncing(false);
    }
  };

  // SQL Snippet for Supabase Setup
  const sqlSnippet = `-- 1. Create SnailHR Cloud State Table
CREATE TABLE IF NOT EXISTS snailhr_state (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Initialize AppState row (Optional)
INSERT INTO snailhr_state (key, value)
VALUES ('app_state', '{}')
ON CONFLICT (key) DO NOTHING;`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlSnippet);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleAddDesignation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesignationTitle || !newDesignationDept) return;
    onAddDesignation(newDesignationTitle, newDesignationDept);
    setNewDesignationTitle("");
    setNewDesignationDept("");
  };

  const handleAddLeaveType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeaveType.trim()) return;
    const trimmed = newLeaveType.trim();
    const newList = customLeaveTypes.some(l => l.toLowerCase() === trimmed.toLowerCase())
      ? customLeaveTypes
      : [...customLeaveTypes, trimmed];
    onUpdateCollection("leaveTypes", newList, "add", trimmed);
    setNewLeaveType("");
  };

  const handleRemoveLeaveType = (leave: string) => {
    if (confirm(`Are you sure you want to delete "${leave}"?`)) {
      onUpdateCollection("leaveTypes", customLeaveTypes.filter(l => l !== leave), "remove", leave);
    }
  };

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartment.trim()) return;
    const trimmed = newDepartment.trim();
    const newList = customDepartments.some(d => d.toLowerCase() === trimmed.toLowerCase())
      ? customDepartments
      : [...customDepartments, trimmed];
    onUpdateCollection("departments", newList, "add", trimmed);
    setNewDepartment("");
  };

  const handleRemoveDepartment = (dept: string) => {
    if (confirm(`Are you sure you want to delete the "${dept}" department?`)) {
      onUpdateCollection("departments", customDepartments.filter(d => d !== dept), "remove", dept);
    }
  };

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranch.trim()) return;
    const trimmed = newBranch.trim();
    const newList = customBranches.some(b => b.toLowerCase() === trimmed.toLowerCase())
      ? customBranches
      : [...customBranches, trimmed];
    onUpdateCollection("branches", newList, "add", trimmed);
    setNewBranch("");
  };

  const handleRemoveBranch = (branch: string) => {
    if (confirm(`Are you sure you want to remove the "${branch}" branch office?`)) {
      onUpdateCollection("branches", customBranches.filter(b => b !== branch), "remove", branch);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Sub Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#1a1a1a] pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 dark:text-white">System Configuration</h2>
          <p className="text-xs text-slate-400 dark:text-gray-400">Configure corporate offices, custom designations, departments, leave policies, and Cloud storage states</p>
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-[#0f0f0f] p-1 rounded-xl border border-slate-200/50 dark:border-[#1a1a1a] text-xs font-semibold overflow-x-auto scrollbar-none max-w-full">
          <button 
            onClick={() => setActiveSubTab("general")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeSubTab === "general" ? "bg-white dark:bg-[#1a1a1a] shadow-xs text-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
          >
            General Variables
          </button>
          <button 
            onClick={() => setActiveSubTab("designations")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeSubTab === "designations" ? "bg-white dark:bg-[#1a1a1a] shadow-xs text-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
          >
            Designations Matrix
          </button>
          <button 
            onClick={() => setActiveSubTab("supabase")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeSubTab === "supabase" ? "bg-white dark:bg-[#1a1a1a] shadow-xs text-slate-800 dark:text-white flex items-center gap-1" : "text-slate-400 hover:text-slate-600 flex items-center gap-1"}`}
          >
            <Database className="w-3.5 h-3.5" />
            Supabase Cloud
          </button>
        </div>
      </div>

      {/* Sub Tab 1: General (Departments, Branches, Leave Types) */}
      {activeSubTab === "general" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Departments block */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-50 dark:border-[#1a1a1a] mb-3">
                <Landmark className="w-4.5 h-4.5 text-emerald-500" />
                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm">Company Departments</h3>
              </div>
              
              <form onSubmit={handleAddDepartment} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="e.g. Legal, Marketing"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl cursor-pointer transition-all"
                  title="Add Department"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              <div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                {customDepartments.map((dept) => (
                  <div key={dept} className="flex items-center justify-between text-xs p-2.5 bg-slate-50/50 dark:bg-[#1a1a1a]/30 border border-slate-100/30 dark:border-transparent rounded-xl">
                    <span className="font-semibold text-slate-700 dark:text-gray-300">{dept}</span>
                    <button
                      onClick={() => handleRemoveDepartment(dept)}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-gray-500 font-mono italic">Currently {customDepartments.length} Departments active</p>
          </div>

          {/* Office Branches block */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-50 dark:border-[#1a1a1a] mb-3">
                <MapPin className="w-4.5 h-4.5 text-blue-500" />
                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm">Corporate Branches</h3>
              </div>
              
              <form onSubmit={handleAddBranch} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="e.g. Bangalore Hub"
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl cursor-pointer transition-all"
                  title="Add Office Branch"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              <div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                {customBranches.map((branch) => (
                  <div key={branch} className="flex items-center justify-between text-xs p-2.5 bg-slate-50/50 dark:bg-[#1a1a1a]/30 border border-slate-100/30 dark:border-transparent rounded-xl">
                    <span className="font-semibold text-slate-700 dark:text-gray-300">{branch}</span>
                    <button
                      onClick={() => handleRemoveBranch(branch)}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-gray-500 font-mono italic">Currently {customBranches.length} Branches active</p>
          </div>

          {/* Leave Types block */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-50 dark:border-[#1a1a1a] mb-3">
                <Calendar className="w-4.5 h-4.5 text-indigo-500" />
                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm">Leave Policies</h3>
              </div>
              
              <form onSubmit={handleAddLeaveType} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="e.g. Sabbatical Leave"
                  value={newLeaveType}
                  onChange={(e) => setNewLeaveType(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl cursor-pointer transition-all"
                  title="Add Leave Policy Type"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              <div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                {customLeaveTypes.map((leave) => (
                  <div key={leave} className="flex items-center justify-between text-xs p-2.5 bg-slate-50/50 dark:bg-[#1a1a1a]/30 border border-slate-100/30 dark:border-transparent rounded-xl">
                    <span className="font-semibold text-slate-700 dark:text-gray-300">{leave}</span>
                    <button
                      onClick={() => handleRemoveLeaveType(leave)}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-gray-500 font-mono italic">Currently {customLeaveTypes.length} Leave types configured</p>
          </div>
        </div>
      )}

      {/* Sub Tab 2: Designations */}
      {activeSubTab === "designations" && (
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-50 dark:border-[#1a1a1a] pb-3">
            <div>
              <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm">Designations Directory</h3>
              <p className="text-xs text-slate-400 dark:text-gray-400">Map precise job titles and their reporting departments</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add Designation form */}
            <div className="lg:col-span-1 p-4 bg-slate-50 dark:bg-[#0a0a0a]/50 border border-slate-100/50 dark:border-[#1a1a1a] rounded-xl space-y-4 h-fit">
              <h4 className="font-display font-semibold text-slate-700 dark:text-gray-300 text-xs">Register New Designation</h4>
              
              <form onSubmit={handleAddDesignation} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Job Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Underwriter"
                    value={newDesignationTitle}
                    onChange={(e) => setNewDesignationTitle(e.target.value)}
                    className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department Mapping</label>
                  <select
                    value={newDesignationDept}
                    onChange={(e) => setNewDesignationDept(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-hidden"
                  >
                    <option value="">-- Select Department --</option>
                    {customDepartments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Designation</span>
                </button>
              </form>
            </div>

            {/* Designations list table */}
            <div className="lg:col-span-2 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#1a1a1a] text-slate-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                    <th className="py-2 px-3">Designation ID</th>
                    <th className="py-2 px-3">Job Title</th>
                    <th className="py-2 px-3">Department</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-[#1a1a1a]/50">
                  {designations.map(des => (
                    <tr key={des.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a]/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400 dark:text-gray-500">{des.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-gray-300">{des.title}</td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-gray-400 font-medium">{des.department}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove the designation "${des.title}"?`)) {
                              onRemoveDesignation(des.id);
                            }
                          }}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab 3: Supabase Setup Monitor */}
      {activeSubTab === "supabase" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Tracker */}
          <div className="lg:col-span-1 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-50 dark:border-[#1a1a1a] mb-4">
                <Database className="w-4.5 h-4.5 text-teal-500" />
                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">Supabase Status</h3>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#0a0a0a]/50 rounded-xl border border-slate-100/50 dark:border-[#1a1a1a]">
                  <span className="font-semibold text-slate-500">Client Connection</span>
                  {supabaseStatus.connected ? (
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      <CheckCircle className="w-4 h-4" /> Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 font-bold animate-pulse">
                      <AlertTriangle className="w-4 h-4" /> File Fallback
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#0a0a0a]/50 rounded-xl border border-slate-100/50 dark:border-[#1a1a1a]">
                  <span className="font-semibold text-slate-500">Sync Pipeline</span>
                  {supabaseStatus.synced ? (
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      <CheckCircle className="w-4 h-4" /> Live Cloud Synced
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 font-bold">
                      <AlertTriangle className="w-4 h-4" /> Setup Required
                    </span>
                  )}
                </div>

                {supabaseStatus.error && (
                  <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/50 rounded-xl text-rose-700 dark:text-rose-400 text-[11px] leading-relaxed">
                    <p className="font-bold">Error logs:</p>
                    <p className="font-mono mt-1 text-[10px] break-all">{supabaseStatus.error}</p>
                  </div>
                )}

                {supabaseStatus.connected && (
                  <button
                    onClick={handleSyncDatabase}
                    disabled={syncing}
                    className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800/50 text-white font-semibold py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    {syncing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Syncing Data...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-3.5 h-3.5" />
                        <span>Sync Local Data to Supabase</span>
                      </>
                    )}
                  </button>
                )}

                {syncResult && (
                  <div className={`p-3 rounded-xl text-[11px] leading-relaxed border ${
                    syncResult.success 
                      ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-950/50 text-emerald-700 dark:text-emerald-400" 
                      : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-950/50 text-rose-700 dark:text-rose-400"
                  }`}>
                    <p className="font-semibold">{syncResult.success ? "Success:" : "Error:"}</p>
                    <p className="mt-0.5">{syncResult.message}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-emerald-50/40 dark:bg-emerald-950/10 p-3.5 rounded-xl border border-emerald-100/50 dark:border-emerald-900/30 text-[11px] text-emerald-800 dark:text-emerald-400 leading-normal">
              <span className="font-bold">How MGM FINANCIERS PRIV LIMITED Sync Works</span>
              <p className="mt-1 text-emerald-700/80 dark:text-emerald-400/80">
                MGM FINANCIERS PRIV LIMITED utilizes an ultra-fast, robust cloud sync pipeline. The entire organizational state is automatically read and synchronized in an atomic key-value configuration. If your database table is pending, the app automatically fails-safe to the local JSON filesystem, so operations never halt!
              </p>
            </div>
          </div>

          {/* Setup Guide */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow space-y-4">
            <div>
              <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">Supabase Setup Guide & SQL Console</h3>
              <p className="text-xs text-slate-400 dark:text-gray-400">Run this simple DDL script inside your Supabase SQL Editor to activate live synchronization immediately.</p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <pre className="bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#2a2a2a] rounded-xl p-4 text-[11px] font-mono text-slate-700 dark:text-emerald-400/90 overflow-x-auto custom-scrollbar max-h-[180px] leading-relaxed">
                  {sqlSnippet}
                </pre>
                
                <button
                  onClick={copyToClipboard}
                  className="absolute top-2.5 right-2.5 bg-white dark:bg-[#1a1a1a] hover:bg-slate-100 border border-slate-100 dark:border-[#2a2a2a] text-slate-500 dark:text-gray-400 p-2 rounded-lg cursor-pointer transition-colors flex items-center gap-1 text-xs"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[10px] font-semibold text-emerald-500">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-semibold">Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-xs text-slate-500 dark:text-gray-400 space-y-2 leading-relaxed bg-slate-50/50 dark:bg-[#1a1a1a]/30 p-4 rounded-xl border border-slate-100/50 dark:border-[#1a1a1a]">
                <span className="font-bold text-slate-700 dark:text-gray-300">Detailed Steps:</span>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Log in to your <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline">Supabase Dashboard</a> and open your project.</li>
                  <li>Click on the <b>SQL Editor</b> icon in the left-hand navigation sidebar.</li>
                  <li>Click <b>New Query</b>, paste the SQL code snippet above into the console.</li>
                  <li>Click the <b>Run</b> button. The table will be provisioned in milliseconds, and MGM FINANCIERS PRIV LIMITED will instantly sync live!</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
