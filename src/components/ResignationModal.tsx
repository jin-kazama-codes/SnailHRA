import React, { useState } from "react";
import { LogOut, Calendar, AlertCircle, X, Check, Clock, Briefcase, FileText } from "lucide-react";
import { Employee } from "../types";

interface ResignationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  onSubmit: (data: {
    employeeId: string;
    resignationDate: string;
    lastWorkingDate: string;
    noticePeriodDays: number;
    reason: string;
    remarks: string;
    branch?: string;
  }) => Promise<void>;
}

const COMMON_REASONS = [
  "Better Career Opportunity",
  "Higher Education / Further Studies",
  "Personal & Family Commitments",
  "Relocation / Change of City",
  "Health / Medical Reasons",
  "Career Pivot / Domain Change",
  "Entrepreneurship / Business Venture",
  "Work-Life Balance / Personal Sabbatical",
  "Compensation & Benefits",
  "Other"
];

export function ResignationModal({ isOpen, onClose, employee, onSubmit }: ResignationModalProps) {
  const today = new Date().toISOString().split("T")[0];

  // Calculate default last working date (+30 days)
  const calcDefaultLWD = (startDate: string, days: number) => {
    const d = new Date(startDate || today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  const [resignationDate, setResignationDate] = useState(today);
  const [noticeDays, setNoticeDays] = useState(30);
  const [lastWorkingDate, setLastWorkingDate] = useState(() => calcDefaultLWD(today, 30));
  const [reason, setReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleNoticeChange = (days: number) => {
    setNoticeDays(days);
    setLastWorkingDate(calcDefaultLWD(resignationDate, days));
  };

  const handleResignationDateChange = (dateVal: string) => {
    setResignationDate(dateVal);
    setLastWorkingDate(calcDefaultLWD(dateVal, noticeDays));
  };

  const handleLWDChange = (lwdVal: string) => {
    setLastWorkingDate(lwdVal);
    // calculate custom days
    const d1 = new Date(resignationDate);
    const d2 = new Date(lwdVal);
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    setNoticeDays(diffDays > 0 ? diffDays : 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!resignationDate) {
      setErrorMsg("Please select a formal resignation date.");
      return;
    }
    if (!lastWorkingDate) {
      setErrorMsg("Please select your proposed last working day.");
      return;
    }
    if (new Date(lastWorkingDate) < new Date(resignationDate)) {
      setErrorMsg("Proposed last working day cannot be prior to resignation date.");
      return;
    }
    const finalReason = reason === "Other" && customReason.trim() ? customReason.trim() : reason;
    if (!finalReason) {
      setErrorMsg("Please specify the primary reason for resignation.");
      return;
    }
    if (!isConfirmed) {
      setErrorMsg("Please confirm the acknowledgment checkbox before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        employeeId: employee.id,
        resignationDate,
        lastWorkingDate,
        noticePeriodDays: noticeDays,
        reason: finalReason,
        remarks: remarks.trim(),
        branch: employee.branch
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to submit resignation request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] shadow-2xl flex flex-col overflow-hidden my-auto">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#222] p-4 sm:p-5 shrink-0 bg-white dark:bg-[#111]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 sm:p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl text-white shadow-md shadow-amber-500/20 shrink-0">
              <LogOut className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="font-display font-black text-slate-800 dark:text-white text-base sm:text-lg leading-tight">
                Submit Resignation Request
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                Initiate employee separation and exit clearance review
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1f1f1f] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container with Scrollable Body & Sticky Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs custom-scrollbar">
            {/* Employee Summary Card */}
            <div className="p-3 bg-slate-50 dark:bg-[#161616] rounded-2xl border border-slate-200/80 dark:border-[#262626] flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-300/40">
                  {employee.fullName ? employee.fullName.substring(0, 2).toUpperCase() : "EM"}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 dark:text-white truncate">{employee.fullName}</p>
                  <p className="text-[11px] text-slate-400 dark:text-gray-400 truncate">
                    {employee.code || employee.id} • {employee.department || "Operations"}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40 shrink-0">
                {employee.branch || "Branch Office"}
              </span>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl flex items-center space-x-2 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Resignation Date & Notice presets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Resignation Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={resignationDate}
                    onChange={(e) => handleResignationDateChange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a] px-3 py-2 rounded-xl text-slate-800 dark:text-gray-100 font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Proposed Last Working Day *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={lastWorkingDate}
                    min={resignationDate}
                    onChange={(e) => handleLWDChange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a] px-3 py-2 rounded-xl text-slate-800 dark:text-gray-100 font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Quick Notice Period Presets */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400">
                  Notice Period Duration: <span className="text-amber-600 dark:text-amber-400 font-black">{noticeDays} Days</span>
                </span>
                <span className="text-[10px] text-slate-400">Presets:</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[30, 60, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleNoticeChange(d)}
                    className={`py-1.5 px-2 rounded-xl font-bold text-[11px] border transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                      noticeDays === d
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-400 dark:border-amber-700 shadow-2xs font-extrabold"
                        : "bg-slate-50 dark:bg-[#161616] text-slate-600 dark:text-gray-400 border-slate-200 dark:border-[#282828] hover:border-slate-300"
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>{d} Days</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Reason for Resignation */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                Primary Reason for Resignation *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a] px-3.5 py-2 rounded-xl text-slate-800 dark:text-gray-100 font-medium focus:outline-none focus:border-amber-500"
              >
                {COMMON_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {reason === "Other" && (
              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Specify Reason *
                </label>
                <input
                  type="text"
                  required
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Briefly state your primary reason for leaving..."
                  className="w-full bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a] px-3.5 py-2 rounded-xl text-slate-800 dark:text-gray-100 font-medium focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {/* Remarks & Handover Notes */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                Remarks &amp; Handover Notes
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Detail your transition plan, project handovers, pending tasks, or special notes for your Branch HR..."
                className="w-full bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a] p-2.5 rounded-xl text-slate-800 dark:text-gray-100 font-medium focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
              />
            </div>

            {/* Policy Information Box */}
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/30 rounded-2xl text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Exit Separation &amp; Clearance Process</span>
              </p>
              <p className="text-amber-800/80 dark:text-amber-300/80 leading-tight">
                Upon submission, your resignation will be reviewed by Branch HR &amp; Admin. Once approved, the Exit Clearance Checklist will be unlocked for document verification and final no-dues settlement.
              </p>
            </div>

            {/* Confirmation Checkbox */}
            <div className="flex items-start space-x-2.5 pt-1">
              <input
                type="checkbox"
                id="confirm-resignation"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
              />
              <label htmlFor="confirm-resignation" className="text-slate-600 dark:text-gray-300 text-[11px] font-medium leading-tight cursor-pointer">
                I confirm that I wish to submit my formal resignation through the portal. I understand this will initiate the exit clearance review with Branch HR.
              </label>
            </div>
          </div>

          {/* Action Buttons - Sticky Footer */}
          <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-[#222] bg-slate-50/90 dark:bg-[#151515] flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-gray-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isConfirmed}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Submit Resignation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResignationModal;
