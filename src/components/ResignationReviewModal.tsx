import React, { useState } from "react";
import { LogOut, Calendar, CheckCircle2, XCircle, X, Clock, Building2, User, FileText, AlertCircle } from "lucide-react";
import { ResignationRequest } from "../types";

interface ResignationReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resignation?: ResignationRequest;
  request?: ResignationRequest;
  onReview: (data: {
    id: string;
    status: "Approved" | "Rejected";
    approvedLastWorkingDate?: string;
    reviewRemarks: string;
  }) => Promise<void>;
}

export function ResignationReviewModal({
  isOpen,
  onClose,
  resignation: propResignation,
  request: propRequest,
  onReview,
}: ResignationReviewModalProps) {
  const resignation = (propResignation || propRequest)!;
  const [approvedDate, setApprovedDate] = useState(
    resignation?.approvedLastWorkingDate || resignation?.lastWorkingDate || ""
  );
  const [remarks, setRemarks] = useState(resignation.reviewRemarks || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState<"Approved" | "Rejected" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleAction = async (status: "Approved" | "Rejected") => {
    setErrorMsg("");
    if (status === "Rejected" && !remarks.trim()) {
      setErrorMsg("Please provide HR/Admin remarks explaining the rejection or retention discussion.");
      return;
    }
    if (status === "Approved" && !approvedDate) {
      setErrorMsg("Please confirm the official approved last working date.");
      return;
    }

    setIsSubmitting(true);
    setActionType(status);
    try {
      await onReview({
        id: resignation.id,
        status,
        approvedLastWorkingDate: status === "Approved" ? approvedDate : undefined,
        reviewRemarks: remarks.trim(),
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to process resignation review");
    } finally {
      setIsSubmitting(false);
      setActionType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-2xl sm:rounded-3xl max-w-xl w-full max-h-[92vh] sm:max-h-[88vh] shadow-2xl flex flex-col overflow-hidden my-auto">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#222] p-4 sm:p-5 shrink-0 bg-white dark:bg-[#111]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 sm:p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl text-white shadow-md shadow-amber-500/20 shrink-0">
              <LogOut className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="font-display font-black text-slate-800 dark:text-white text-base sm:text-lg leading-tight">
                Review Resignation Request
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                Branch-level exit clearance &amp; separation decision
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

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs custom-scrollbar">

        {/* Employee Summary Card */}
        <div className="p-4 bg-slate-50 dark:bg-[#161616] rounded-2xl border border-slate-200/80 dark:border-[#262626] space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center text-sm shrink-0 border border-amber-300/40">
                {resignation.employeeName ? resignation.employeeName.substring(0, 2).toUpperCase() : "EM"}
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-white text-sm">{resignation.employeeName}</p>
                <p className="text-[11px] text-slate-400 dark:text-gray-400">
                  {resignation.employeeCode || resignation.employeeId} • {resignation.designation || "Staff"} • {resignation.department || "Operations"}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40 shrink-0 flex items-center space-x-1">
              <Building2 className="w-3 h-3" />
              <span>{resignation.branch}</span>
            </span>
          </div>

          {/* Key Dates Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/60 dark:border-[#252525]">
            <div className="p-2.5 bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-100 dark:border-[#282828]">
              <span className="text-[10px] text-slate-400 block font-semibold">Resignation Date</span>
              <span className="font-bold text-slate-700 dark:text-gray-200 font-mono text-[11px]">
                {resignation.resignationDate}
              </span>
            </div>
            <div className="p-2.5 bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-100 dark:border-[#282828]">
              <span className="text-[10px] text-slate-400 block font-semibold">Requested Last Day</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-[11px]">
                {resignation.lastWorkingDate}
              </span>
            </div>
            <div className="p-2.5 bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-100 dark:border-[#282828] col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 block font-semibold">Notice Duration</span>
              <span className="font-bold text-slate-700 dark:text-gray-200 font-mono text-[11px]">
                {resignation.noticePeriodDays || 30} Days
              </span>
            </div>
          </div>

          {/* Reason & Employee Remarks */}
          <div className="pt-1 space-y-1.5">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Primary Reason:</span>
              <p className="font-semibold text-slate-800 dark:text-gray-200 bg-white dark:bg-[#1a1a1a] p-2 rounded-lg border border-slate-100 dark:border-[#282828]">
                {resignation.reason}
              </p>
            </div>
            {resignation.remarks && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Employee Handover &amp; Remarks:</span>
                <p className="text-slate-600 dark:text-gray-300 bg-white dark:bg-[#1a1a1a] p-2.5 rounded-lg border border-slate-100 dark:border-[#282828] leading-relaxed whitespace-pre-wrap">
                  {resignation.remarks}
                </p>
              </div>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl flex items-center space-x-2 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* HR / Admin Review Form */}
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
              Official Approved Last Working Day *
            </label>
            <input
              type="date"
              required
              value={approvedDate}
              min={resignation.resignationDate}
              onChange={(e) => setApprovedDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a] px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-gray-100 font-medium focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Defaults to employee requested last day. Adjust if notice period waiver or extension was negotiated.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
              HR / Admin Review Remarks
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Approved. Notice period waiver approved by management. Department clearance initiated..."
              className="w-full bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a] p-3 rounded-xl text-slate-800 dark:text-gray-100 font-medium focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
            />
          </div>

          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/30 rounded-2xl text-[11px] text-emerald-900 dark:text-emerald-200">
            <p className="font-bold flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Next Steps Upon Approval</span>
            </p>
            <p className="text-emerald-800/80 dark:text-emerald-300/80 leading-tight mt-0.5">
              Approving this resignation will set the employee status to <strong>"Resigned"</strong> and immediately activate the <strong>Exit Clearance Checklist</strong> for asset return, no-dues verification, and final clearance.
            </p>
          </div>
        </div>
      </div>

        {/* Action Buttons - Sticky Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-[#222] bg-slate-50/90 dark:bg-[#151515] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-gray-200 transition-colors cursor-pointer order-last sm:order-first"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleAction("Rejected")}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              <span>{isSubmitting && actionType === "Rejected" ? "Rejecting..." : "Reject / Retain"}</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleAction("Approved")}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting && actionType === "Approved" ? "Approving..." : "Approve Resignation"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResignationReviewModal;
