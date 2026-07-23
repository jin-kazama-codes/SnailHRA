"use client";

import React, { useState } from "react";
import { 
  BookOpen, Scale, ShieldAlert, Sparkles, Plus, Trash2, X, FilePlus, Loader2
} from "lucide-react";
import { Policy, UserRole } from "../types";

interface PoliciesViewProps {
  policies: Policy[];
  role: UserRole;
  onAddPolicy?: (newPolicy: { title: string; category: Policy["category"]; content: string }) => Promise<boolean>;
  onDeletePolicy?: (id: string) => Promise<void>;
}

export default function PoliciesView({
  policies,
  role,
  onAddPolicy,
  onDeletePolicy
}: PoliciesViewProps) {
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(policies[0]?.id || null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Policy["category"]>("Conduct & Ethics");
  const [content, setContent] = useState("");

  const canManage = role === "admin" || role === "hr";

  const selectedPolicy = policies.find(p => p.id === selectedPolicyId) || policies[0];

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    if (onAddPolicy) {
      setLoading(true);
      const success = await onAddPolicy({
        title: title.trim(),
        category,
        content: content.trim()
      });
      setLoading(false);
      if (success) {
        setTitle("");
        setCategory("Conduct & Ethics");
        setContent("");
        setIsModalOpen(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5.5 h-5.5 text-emerald-500" />
            <span>Corporate Policies Handbook</span>
          </h2>
          <p className="text-xs text-slate-400 dark:text-gray-400">Compliance protocols, sales guidelines, and operational standards</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {canManage && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Policy</span>
            </button>
          )}

          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl border border-emerald-100/50 dark:border-emerald-900/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Regulatory Compliant</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policy list sidebar */}
        <div className="lg:col-span-1 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs dark:neon-glow flex flex-col space-y-2 h-[260px] lg:h-[480px]">
          <div className="mb-3 pb-3 border-b border-slate-50 dark:border-[#1a1a1a] flex justify-between items-center">
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-xs uppercase tracking-wider text-slate-400">Chapters & Modules</h3>
            <span className="text-[10px] bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 font-bold px-2 py-0.5 rounded-full">{policies.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
            {policies.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-8">No policies created yet.</p>
            ) : (
              policies.map(policy => {
                const isSelected = selectedPolicy?.id === policy.id;
                return (
                  <div
                    key={policy.id}
                    onClick={() => setSelectedPolicyId(policy.id)}
                    className={`group p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      isSelected 
                        ? "bg-emerald-50/75 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-xs text-slate-800 dark:text-white" 
                        : "bg-slate-50/50 dark:bg-[#0a0a0a]/40 hover:bg-slate-50 dark:hover:bg-[#0a0a0a]/80 border-slate-100/50 dark:border-[#1a1a1a] text-slate-500"
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <BookOpen className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{policy.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{policy.category}</p>
                      </div>
                    </div>

                    {canManage && onDeletePolicy && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePolicy(policy.id);
                        }}
                        title="Delete Policy"
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Active Policy Content */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-6 shadow-xs dark:neon-glow h-[480px] overflow-y-auto custom-scrollbar flex flex-col justify-between">
          {selectedPolicy ? (
            <div className="space-y-4">
              <div className="border-b border-slate-100 dark:border-[#1a1a1a] pb-3 flex justify-between items-start flex-wrap gap-2">
                <div>
                  <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase">
                    {selectedPolicy.category}
                  </span>
                  <h2 className="text-xl font-bold font-display text-slate-800 dark:text-white mt-2">{selectedPolicy.title}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400 font-mono font-semibold pt-1">Last Updated: {selectedPolicy.lastUpdated}</span>
                  {canManage && onDeletePolicy && (
                    <button
                      onClick={() => onDeletePolicy(selectedPolicy.id)}
                      className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-semibold hover:underline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="prose dark:prose-invert text-xs max-w-none text-slate-600 dark:text-gray-300 leading-relaxed font-sans space-y-3">
                <p className="whitespace-pre-wrap">{selectedPolicy.content}</p>
              </div>

              <div className="bg-slate-50 dark:bg-[#0a0a0a]/50 p-4 rounded-xl border border-slate-100 dark:border-[#1a1a1a] flex items-center justify-between text-xs mt-6">
                <div className="flex items-center space-x-2">
                  <Scale className="w-5 h-5 text-emerald-500" />
                  <span className="font-semibold text-slate-700 dark:text-gray-300">Regulatory Compliance Acknowledged</span>
                </div>
                <span className="text-emerald-600 font-bold">Read & Agreed</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-12">Select a policy on the left panel to display contents.</p>
          )}
        </div>
      </div>

      {/* Add Policy Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#1a1a1a] rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-[#1a1a1a] pb-3">
              <h3 className="font-display font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-emerald-500" />
                <span>Add Corporate Policy</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Policy Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Remote Work & Travel Protocol"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#262626] rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Policy["category"])}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#262626] rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="Conduct & Ethics">Conduct & Ethics</option>
                  <option value="Employee Benefits">Employee Benefits</option>
                  <option value="Compliance & Security">Compliance & Security</option>
                  <option value="NBFC Sales & Commissions">NBFC Sales & Commissions</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Policy Details & Rules *
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Write clear, comprehensive company policy terms, compliance requirements, and guidelines..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#262626] rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#1a1a1a]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-[#262626] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Policy...</span>
                    </>
                  ) : (
                    <span>Save Policy</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

