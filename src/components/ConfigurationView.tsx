"use client";

import React, { useState } from "react";
import { 
  Briefcase, Landmark, Calendar, MapPin, Plus, Trash2 
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
  subscriptionModel?: number;
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
  subscriptionModel = 1,
  onAddDesignation,
  onRemoveDesignation,
  onUpdateCollection
}: ConfigurationViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"general" | "designations">("general");

  // Local Form States
  const [newDesignationTitle, setNewDesignationTitle] = useState("");
  const [newDesignationDept, setNewDesignationDept] = useState("");
  
  const [newLeaveType, setNewLeaveType] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newBranch, setNewBranch] = useState("");

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
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 dark:text-white">System Configuration</h2>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
              subscriptionModel === 4 ? "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900/50" :
              subscriptionModel === 3 ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50" :
              subscriptionModel === 2 ? "bg-green-50 text-green-600 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/50" :
              "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
            }`}>
              {subscriptionModel === 4 ? "Full Suite Plan" : 
               subscriptionModel === 3 ? "Chatbot Only Plan" : 
               subscriptionModel === 2 ? "WhatsApp Only Plan" : 
               "Basic Plan"}
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-gray-400">Configure corporate offices, custom designations, departments, and leave policies</p>
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

    </div>
  );
}
