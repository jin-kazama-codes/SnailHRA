"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Shield, Calculator, Lock, Unlock, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, TrendingDown, TrendingUp, FileText, Info } from "lucide-react";
import { Employee, EmployeeTaxProfile } from "../types";
import { computeTDS, TaxComputationInput, TaxComputationResult } from "../lib/taxEngine";

interface TaxProfileModalProps {
  employee: Employee;
  onClose: () => void;
  onSave: (employeeId: string, taxProfile: EmployeeTaxProfile) => Promise<void> | void;
  defaultRegime?: "new" | "old";
}

const SECTION_LABELS: Record<string, string> = {
  section80C: "80C — PPF / ELSS / LIC / Home Loan Principal",
  section80CCD1B: "80CCD(1B) — NPS Self Contribution",
  section80D: "80D — Health Insurance Premium",
  section80E: "80E — Education Loan Interest",
  section80G: "80G — Donations to Charitable Funds",
  section80EEA: "80EEA — Affordable Home Loan Interest",
};

const SECTION_CAPS: Record<string, number | null> = {
  section80C: 150000,
  section80CCD1B: 50000,
  section80D: 25000,
  section80E: null,
  section80G: null,
  section80EEA: 150000,
};

function formatINR(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

function pct(val: number): string {
  return val.toFixed(0) + "%";
}

export default function TaxProfileModal({ employee, onClose, onSave, defaultRegime = "new" }: TaxProfileModalProps) {
  const existing = employee.salary?.taxProfile;

  // ── Form State ────────────────────────────────────────────────────────────
  const [regime, setRegime] = useState<"new" | "old">(existing?.regime ?? defaultRegime);
  const [rentPaid, setRentPaid] = useState(String(existing?.monthlyRentPaid ?? ""));
  const [cityType, setCityType] = useState<"metro" | "non-metro">(existing?.cityType ?? "non-metro");
  const [s80C, setS80C] = useState(String(existing?.section80C ?? ""));
  const [s80CCD1B, setS80CCD1B] = useState(String(existing?.section80CCD1B ?? ""));
  const [s80D, setS80D] = useState(String(existing?.section80D ?? ""));
  const [s80E, setS80E] = useState(String(existing?.section80E ?? ""));
  const [s80G, setS80G] = useState(String(existing?.section80G ?? ""));
  const [s80EEA, setS80EEA] = useState(String(existing?.section80EEA ?? ""));
  const [employerNPS, setEmployerNPS] = useState(String(existing?.employerNPS ?? ""));
  const [profTax, setProfTax] = useState(String(existing?.professionalTax ?? "2400"));
  const [manualTDS, setManualTDS] = useState(String(existing?.manualMonthlyTDS ?? ""));
  const [tdsLocked, setTdsLocked] = useState(existing?.tdsLocked ?? false);
  const [showWorksheet, setShowWorksheet] = useState(false);
  const [saving, setSaving] = useState(false);

  const salary = employee.salary;

  // ── Build TaxComputationInput ─────────────────────────────────────────────
  const taxInput: TaxComputationInput = useMemo(() => ({
    annualBasic: salary.basic * 12,
    annualHRA: salary.hra * 12,
    annualLTA: (salary.lta ?? 0) * 12,
    annualSpecialAllowance: salary.allowances * 12,
    annualTelephone: (salary.telephone ?? 0) * 12,
    annualFuel: (salary.fuel ?? 0) * 12,
    annualProfDev: (salary.professionalDev ?? 0) * 12,
    annualPFEmployee: salary.pfDeduction * 12,
    regime,
    monthlyRentPaid: Number(rentPaid) || 0,
    cityType,
    section80C: Number(s80C) || 0,
    section80CCD1B: Number(s80CCD1B) || 0,
    section80D: Number(s80D) || 0,
    section80E: Number(s80E) || 0,
    section80G: Number(s80G) || 0,
    section80EEA: Number(s80EEA) || 0,
    employerNPS: Number(employerNPS) || 0,
    professionalTax: Number(profTax) || 0,
    manualMonthlyTDS: tdsLocked ? (Number(manualTDS) || 0) : undefined,
    tdsLocked,
  }), [regime, rentPaid, cityType, s80C, s80CCD1B, s80D, s80E, s80G, s80EEA, employerNPS, profTax, manualTDS, tdsLocked, salary]);

  const result: TaxComputationResult = useMemo(() => computeTDS(taxInput), [taxInput]);

  const handleSave = async () => {
    setSaving(true);
    const profile: EmployeeTaxProfile = {
      regime,
      monthlyRentPaid: Number(rentPaid) || undefined,
      cityType,
      section80C: Number(s80C) || undefined,
      section80CCD1B: Number(s80CCD1B) || undefined,
      section80D: Number(s80D) || undefined,
      section80E: Number(s80E) || undefined,
      section80G: Number(s80G) || undefined,
      section80EEA: Number(s80EEA) || undefined,
      employerNPS: Number(employerNPS) || undefined,
      professionalTax: Number(profTax) || undefined,
      manualMonthlyTDS: tdsLocked ? (Number(manualTDS) || 0) : undefined,
      tdsLocked,
    };
    await onSave(employee.id, profile);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-6">
      <div className="relative bg-white dark:bg-[#0f0f0f] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#1a1a1a] w-full max-w-3xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-[#1a1a1a]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-white text-sm">Income Tax Profile</p>
              <p className="text-xs text-slate-400">{employee.fullName} · {employee.code || employee.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1a1a1a] cursor-pointer">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* ── Regime Selection ─────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-2">Tax Regime (FY 2025-26)</p>
            <div className="grid grid-cols-2 gap-3">
              {(["new", "old"] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRegime(r)}
                  className={`flex flex-col p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    regime === r
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                      : "border-slate-200 dark:border-[#222] hover:border-violet-300"
                  }`}
                >
                  <span className={`font-bold text-sm ${regime === r ? "text-violet-700 dark:text-violet-400" : "text-slate-700 dark:text-gray-300"}`}>
                    {r === "new" ? "🆕 New Regime" : "📋 Old Regime"}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                    {r === "new"
                      ? "Std deduction ₹75,000 · 87A rebate up to ₹12L · No Chapter VI-A"
                      : "Std deduction ₹50,000 · HRA + 80C + other exemptions allowed"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Regime Comparison Badge ──────────────────────────────────── */}
          {result.savingsVsAlternate > 0 && (
            <div className={`flex items-center space-x-2.5 p-3 rounded-xl text-xs font-semibold ${
              result.betterRegime === regime
                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
            }`}>
              {result.betterRegime === regime ? (
                <><CheckCircle className="w-4 h-4 shrink-0" /><span>✅ <strong>{regime === "new" ? "New Regime" : "Old Regime"}</strong> saves {formatINR(result.savingsVsAlternate)}/year vs alternate regime for this employee.</span></>
              ) : (
                <><AlertTriangle className="w-4 h-4 shrink-0" /><span>⚠️ Switching to <strong>{result.betterRegime === "new" ? "New Regime" : "Old Regime"}</strong> would save {formatINR(result.savingsVsAlternate)}/year.</span></>
              )}
            </div>
          )}

          {/* ── HRA Section (Old Regime only) ────────────────────────────── */}
          {regime === "old" && (
            <div className="bg-slate-50 dark:bg-[#0a0a0a] rounded-xl p-4 border border-slate-100 dark:border-[#1a1a1a] space-y-3">
              <p className="text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider">HRA Exemption (Sec 10(13A))</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-gray-400 mb-1 block">Monthly Rent Paid</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                    <input type="number" value={rentPaid} onChange={e => setRentPaid(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-[#222] bg-white dark:bg-[#141414] text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-gray-400 mb-1 block">City Type</label>
                  <select value={cityType} onChange={e => setCityType(e.target.value as "metro" | "non-metro")}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-[#222] bg-white dark:bg-[#141414] text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400">
                    <option value="metro">Metro (Delhi/Mumbai/Kolkata/Chennai) — 50% of Basic</option>
                    <option value="non-metro">Non-Metro — 40% of Basic</option>
                  </select>
                </div>
              </div>
              {result.hraExemption > 0 && (
                <div className="flex items-center text-[11px] text-emerald-600 dark:text-emerald-400">
                  <TrendingDown className="w-3.5 h-3.5 mr-1" />
                  HRA Exemption: {formatINR(result.hraExemption)}/year (Annual HRA: {formatINR(salary.hra * 12)})
                </div>
              )}
            </div>
          )}

          {/* ── Chapter VI-A (Old Regime only) ──────────────────────────── */}
          {regime === "old" && (
            <div className="bg-slate-50 dark:bg-[#0a0a0a] rounded-xl p-4 border border-slate-100 dark:border-[#1a1a1a] space-y-3">
              <p className="text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider">Chapter VI-A — Investment Declarations</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { key: "80C", label: "80C — PPF/ELSS/LIC/EPF/Home Loan", cap: 150000, state: s80C, setState: setS80C, note: `Auto-includes PF: ₹${(salary.pfDeduction * 12).toLocaleString()}` },
                  { key: "80CCD1B", label: "80CCD(1B) — NPS Self Contrib.", cap: 50000, state: s80CCD1B, setState: setS80CCD1B, note: "Additional to 80C" },
                  { key: "80D", label: "80D — Health Insurance Premium", cap: 25000, state: s80D, setState: setS80D, note: "₹50K if senior citizen" },
                  { key: "80E", label: "80E — Education Loan Interest", cap: null, state: s80E, setState: setS80E, note: "No upper limit" },
                  { key: "80G", label: "80G — Donations", cap: null, state: s80G, setState: setS80G, note: "As per qualifying %" },
                  { key: "80EEA", label: "80EEA — Affordable Home Loan Int.", cap: 150000, state: s80EEA, setState: setS80EEA, note: "New home buyers" },
                ].map(({ key, label, cap, state, setState, note }) => (
                  <div key={key}>
                    <label className="text-[11px] text-slate-600 dark:text-gray-400 mb-1 flex items-center justify-between">
                      <span>{label}</span>
                      {cap && <span className="text-slate-400">Max {formatINR(cap)}</span>}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                      <input type="number" value={state} onChange={e => setState(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-[#222] bg-white dark:bg-[#141414] text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        placeholder="Annual amount" max={cap ?? undefined} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{note}</p>
                  </div>
                ))}
              </div>
              {result.totalChapterVIA > 0 && (
                <div className="flex items-center text-[11px] text-emerald-600 dark:text-emerald-400">
                  <TrendingDown className="w-3.5 h-3.5 mr-1" />
                  Total Chapter VI-A deduction: {formatINR(result.totalChapterVIA)}/year
                </div>
              )}
            </div>
          )}

          {/* ── Common Deductions (both regimes) ────────────────────────── */}
          <div className="bg-slate-50 dark:bg-[#0a0a0a] rounded-xl p-4 border border-slate-100 dark:border-[#1a1a1a] space-y-3">
            <p className="text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider">Deductions Valid in Both Regimes</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-slate-600 dark:text-gray-400 mb-1 flex items-center justify-between">
                  <span>80CCD(2) — Employer NPS Contribution</span>
                  <span className="text-slate-400">Max 10% of Basic</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                  <input type="number" value={employerNPS} onChange={e => setEmployerNPS(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-[#222] bg-white dark:bg-[#141414] text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    placeholder="Annual amount" max={salary.basic * 12 * 0.10} />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Max: {formatINR(Math.round(salary.basic * 12 * 0.10))}/year</p>
              </div>
              <div>
                <label className="text-[11px] text-slate-600 dark:text-gray-400 mb-1 block">Professional Tax (Annual)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                  <input type="number" value={profTax} onChange={e => setProfTax(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-[#222] bg-white dark:bg-[#141414] text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    placeholder="2400" max={2500} />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Typically ₹2,400/year. Max allowed: ₹2,500.</p>
              </div>
            </div>
          </div>

          {/* ── Manual TDS Override ──────────────────────────────────────── */}
          <div className={`rounded-xl p-4 border ${tdsLocked ? "border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/20" : "border-slate-100 dark:border-[#1a1a1a] bg-slate-50 dark:bg-[#0a0a0a]"}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider">Manual TDS Override</p>
                <p className="text-[11px] text-slate-400">Skip all calculations — force a fixed monthly TDS amount.</p>
              </div>
              <button onClick={() => setTdsLocked(!tdsLocked)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  tdsLocked ? "bg-rose-600 text-white" : "bg-slate-200 dark:bg-[#222] text-slate-600 dark:text-gray-400"
                }`}>
                {tdsLocked ? <><Lock className="w-3 h-3" /><span>Locked</span></> : <><Unlock className="w-3 h-3" /><span>Unlock to override</span></>}
              </button>
            </div>
            {tdsLocked && (
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                <input type="number" value={manualTDS} onChange={e => setManualTDS(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-sm font-bold rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-[#141414] text-rose-700 dark:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  placeholder="Enter fixed monthly TDS amount" />
              </div>
            )}
          </div>

          {/* ── Live Tax Preview Panel ────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-violet-200">Live Tax Preview</p>
              <button onClick={() => setShowWorksheet(!showWorksheet)}
                className="flex items-center space-x-1 text-[11px] text-violet-200 hover:text-white cursor-pointer transition-colors">
                <FileText className="w-3.5 h-3.5" />
                <span>{showWorksheet ? "Hide" : "Show"} Form 16 Worksheet</span>
                {showWorksheet ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-white/10 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-violet-200 uppercase tracking-wider">Annual Gross</p>
                <p className="font-bold text-base mt-0.5 font-mono">{formatINR(result.annualGrossIncome)}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-violet-200 uppercase tracking-wider">Taxable Income</p>
                <p className="font-bold text-base mt-0.5 font-mono">{formatINR(result.netTaxableIncome)}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-violet-200 uppercase tracking-wider">Annual Tax</p>
                <p className="font-bold text-base mt-0.5 font-mono">{formatINR(result.netAnnualTax)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between py-2.5 border-t border-white/20">
              <div>
                <p className="text-[10px] text-violet-200">Monthly TDS to Deduct</p>
                <p className="font-extrabold text-2xl font-mono tracking-tight">{formatINR(result.netMonthlyTDS)}</p>
              </div>
              {result.rebate87A > 0 && (
                <div className="bg-emerald-400/20 border border-emerald-400/40 rounded-xl px-3 py-1.5 text-xs text-emerald-200 font-semibold">
                  ✅ Sec 87A Rebate Applied<br />
                  <span className="text-[11px] opacity-80">Tax = ₹0 (Income ≤ {regime === "new" ? "₹12L" : "₹5L"})</span>
                </div>
              )}
            </div>

            {/* Form 16 Worksheet */}
            {showWorksheet && (
              <div className="mt-3 bg-white/5 rounded-xl p-3 border border-white/10 text-xs space-y-1">
                <p className="font-bold text-violet-100 text-[11px] uppercase tracking-wider mb-2">
                  Form 16 Part-B Computation — {regime === "new" ? "New Tax Regime" : "Old Tax Regime"} (FY 2025-26)
                </p>
                <WorksheetRow label="Gross Annual Income" value={result.annualGrossIncome} />
                <WorksheetRow label="(−) Standard Deduction" value={-result.standardDeduction} />
                {result.hraExemption > 0 && <WorksheetRow label="(−) HRA Exemption [Sec 10(13A)]" value={-result.hraExemption} />}
                {result.ltaExemption > 0 && <WorksheetRow label="(−) LTA Exemption [Sec 10(5)]" value={-result.ltaExemption} />}
                {result.professionalTaxDeduction > 0 && <WorksheetRow label="(−) Professional Tax [Sec 16(iii)]" value={-result.professionalTaxDeduction} />}
                {result.employerNPSDeduction > 0 && <WorksheetRow label="(−) Employer NPS [80CCD(2)]" value={-result.employerNPSDeduction} />}
                {result.section80C > 0 && <WorksheetRow label="(−) 80C (PPF/ELSS/LIC/EPF)" value={-result.section80C} />}
                {result.section80CCD1B > 0 && <WorksheetRow label="(−) 80CCD(1B) — NPS Self" value={-result.section80CCD1B} />}
                {result.section80D > 0 && <WorksheetRow label="(−) 80D — Health Insurance" value={-result.section80D} />}
                {result.section80E > 0 && <WorksheetRow label="(−) 80E — Education Loan Interest" value={-result.section80E} />}
                {result.section80G > 0 && <WorksheetRow label="(−) 80G — Donations" value={-result.section80G} />}
                {result.section80EEA > 0 && <WorksheetRow label="(−) 80EEA — Affordable Home Loan" value={-result.section80EEA} />}
                <div className="border-t border-white/10 pt-1 mt-1">
                  <WorksheetRow label="= Net Taxable Income" value={result.netTaxableIncome} bold />
                </div>
                {result.slabwiseTax.map((s, i) => (
                  <WorksheetRow key={i} label={`  ${s.slab} @ ${pct(s.rate)}`} value={s.tax} indent />
                ))}
                <WorksheetRow label="= Base Tax" value={result.baseTax} />
                {result.surcharge > 0 && <WorksheetRow label="(+) Surcharge" value={result.surcharge} />}
                {result.cess > 0 && <WorksheetRow label="(+) Health & Education Cess (4%)" value={result.cess} />}
                {result.rebate87A > 0 && <WorksheetRow label="(−) Section 87A Rebate" value={-result.rebate87A} />}
                <div className="border-t border-white/20 pt-1 mt-1">
                  <WorksheetRow label="= Net Annual Tax Liability" value={result.netAnnualTax} bold />
                  <WorksheetRow label="= Monthly TDS (÷ 12)" value={result.netMonthlyTDS} bold />
                </div>
                <div className="mt-2 p-2 bg-white/10 rounded-lg text-[10px] text-violet-200">
                  <p><strong>Alternate Regime ({regime === "new" ? "Old" : "New"}) Annual Tax:</strong> {formatINR(result.alternateRegimeTax)}</p>
                  <p><strong>Better Regime:</strong> {result.betterRegime === "new" ? "New Regime" : "Old Regime"} — saves {formatINR(result.savingsVsAlternate)}/year</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-5 border-t border-slate-100 dark:border-[#1a1a1a]">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200 cursor-pointer transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg hover:from-violet-700 hover:to-indigo-700 transition-all cursor-pointer disabled:opacity-60">
            {saving ? "Saving..." : "Save Tax Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

function WorksheetRow({ label, value, bold, indent }: { label: string; value: number; bold?: boolean; indent?: boolean }) {
  const color = value < 0 ? "text-emerald-300" : "text-white";
  return (
    <div className={`flex justify-between items-center py-0.5 ${indent ? "pl-3" : ""} ${bold ? "font-bold" : "opacity-80"}`}>
      <span className="text-violet-100">{label}</span>
      <span className={`font-mono ${color}`}>
        {value < 0 ? `(${formatINR(Math.abs(value))})` : formatINR(value)}
      </span>
    </div>
  );
}
