import React, { useState } from "react";
import { 
  BookOpen, Scale, ShieldAlert, Sparkles, Building, Info, FileText
} from "lucide-react";
import { Policy, UserRole } from "../types";

interface PoliciesViewProps {
  policies: Policy[];
  role: UserRole;
}

export default function PoliciesView({
  policies,
  role
}: PoliciesViewProps) {
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(policies[0]?.id || null);

  const selectedPolicy = policies.find(p => p.id === selectedPolicyId) || policies[0];

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
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl border border-emerald-100/50 dark:border-emerald-900/30">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Regulatory Compliant</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policy list sidebar */}
        <div className="lg:col-span-1 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs dark:neon-glow flex flex-col space-y-2 h-[480px]">
          <div className="mb-3 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-xs uppercase tracking-wider text-slate-400">Chapters & Modules</h3>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
            {policies.map(policy => {
              const isSelected = selectedPolicy?.id === policy.id;
              return (
                <div
                  key={policy.id}
                  onClick={() => setSelectedPolicyId(policy.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-3 text-xs ${
                    isSelected 
                      ? "bg-emerald-50/75 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-xs text-slate-800 dark:text-white" 
                      : "bg-slate-50/50 dark:bg-[#0a0a0a]/40 hover:bg-slate-50 dark:hover:bg-[#0a0a0a]/80 border-slate-100/50 dark:border-[#1a1a1a] text-slate-500"
                  }`}
                >
                  <BookOpen className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{policy.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{policy.category}</p>
                  </div>
                </div>
              );
            })}
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
                <span className="text-[10px] text-slate-400 font-mono font-semibold pt-1">Last Updated: {selectedPolicy.lastUpdated}</span>
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
    </div>
  );
}
