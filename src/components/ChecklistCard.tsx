"use client";

import React, { useState, useRef } from "react";
import {
  FileText, Upload, CheckCircle2, XCircle, Clock, ShieldCheck, Eye, Trash2,
  AlertCircle, LogOut, Check, X, FileUp, Sparkles, AlertTriangle, ArrowRight, Plus, Download, Maximize2, Minimize2, Loader2
} from "lucide-react";
import { Employee, ChecklistItemTemplate, EmployeeChecklistItem, UserRole } from "../types";

export interface ChecklistCardProps {
  type: "onboarding" | "exit";
  employee: Employee;
  templates: ChecklistItemTemplate[];
  currentUserRole: UserRole;
  currentUserId: string;
  onUploadDocument: (employeeId: string, itemId: string, file: File, category?: string) => Promise<void> | void;
  onReviewItem: (employeeId: string, itemId: string, action: "approve" | "reject", comments?: string) => Promise<void> | void;
  onCreateTemplate?: (template: { title: string; description: string; category: string; required: boolean; type: "onboarding" | "exit"; branch?: string }) => Promise<void> | void;
  onDeleteTemplate?: (templateId: string) => Promise<void> | void;
  onGrantExitClearance?: (employeeId: string) => Promise<void> | void;
  onInitiateResignation?: (employeeId: string) => Promise<void> | void;
}

export default function ChecklistCard({
  type,
  employee,
  templates = [],
  currentUserRole,
  currentUserId,
  onUploadDocument,
  onReviewItem,
  onCreateTemplate,
  onDeleteTemplate,
  onGrantExitClearance,
  onInitiateResignation
}: ChecklistCardProps) {
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [reviewingItemId, setReviewingItemId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rejectingItemId, setRejectingItemId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("ID Proof");
  const [newRequired, setNewRequired] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<EmployeeChecklistItem>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeItemIdRef = useRef<string | null>(null);

  const canManage = currentUserRole === "admin" || currentUserRole === "hr" || currentUserRole === "super_admin";
  const isSelf = employee.id === currentUserId;
  const canUpload = canManage || isSelf;

  // Filter templates by type
  const matchingTemplates = templates.filter(t => t.type === type);

  // Existing checklist items on employee
  const employeeItems = (type === "onboarding" ? employee.onboardingChecklist : employee.exitChecklist) || [];

  type DisplayChecklistItem = EmployeeChecklistItem & { required?: boolean; description?: string };

  // Merge templates with employee checklist items to ensure all items are displayed
  const mergedItems: DisplayChecklistItem[] = matchingTemplates.map(tmpl => {
    const existing = employeeItems.find(i =>
      i.templateId === tmpl.id ||
      i.id === tmpl.id ||
      (i.title && tmpl.title && (
        i.title.trim().toLowerCase() === tmpl.title.trim().toLowerCase() ||
        i.title.trim().toLowerCase().includes(tmpl.title.trim().toLowerCase()) ||
        tmpl.title.trim().toLowerCase().includes(i.title.trim().toLowerCase()) ||
        i.title === tmpl.id
      ))
    );
    const override = localOverrides[tmpl.id]
      || (existing ? localOverrides[existing.id] : undefined)
      || (existing?.templateId ? localOverrides[existing.templateId] : undefined)
      || localOverrides[tmpl.title]
      || (existing?.title ? localOverrides[existing.title] : undefined);

    if (existing) {
      return {
        ...existing,
        templateId: tmpl.id,
        title: tmpl.title, // Always enforce human-readable requirement title from template
        description: tmpl.description || existing.description || "",
        required: tmpl.required !== undefined ? tmpl.required : ((existing as any).required ?? true),
        ...(override || {})
      };
    }
    return {
      id: tmpl.id,
      templateId: tmpl.id,
      title: tmpl.title,
      description: tmpl.description || "",
      type,
      status: "Pending" as const,
      required: tmpl.required,
      ...(override || {})
    };
  });

  // If active templates exist, display strictly matching templates. If no templates exist, fall back to employee items.
  if (matchingTemplates.length === 0 && employeeItems.length > 0) {
    employeeItems.forEach(item => {
      const exists = mergedItems.some(
        m => m.id === item.id || m.templateId === item.id || (m.title && item.title && m.title.trim().toLowerCase() === item.title.trim().toLowerCase())
      );
      if (!exists) {
        const override = localOverrides[item.id] || (item.templateId ? localOverrides[item.templateId] : undefined) || (item.title ? localOverrides[item.title] : undefined);
        mergedItems.push({
          ...item,
          required: true,
          ...(override || {})
        });
      }
    });
  }

  // Deduplicate by id — two templates may fuzzy-match the same employee item,
  // producing duplicate ids and triggering the React duplicate-key warning.
  const seenIds = new Set<string>();
  const deduped: DisplayChecklistItem[] = [];
  for (const item of mergedItems) {
    const key = item.id || item.templateId || item.title || "";
    if (!seenIds.has(key)) {
      seenIds.add(key);
      deduped.push(item);
    }
  }
  const uniqueItems = deduped;

  const totalItems = uniqueItems.length;
  const approvedItems = uniqueItems.filter(i => i.status === "Approved").length;
  const uploadedItems = uniqueItems.filter(i => i.status === "Uploaded" || i.status === "Approved").length;
  const pendingReviewItems = uniqueItems.filter(i => i.status === "Uploaded").length;

  const isAllApproved = totalItems > 0 && approvedItems === totalItems;
  const approvedPercent = totalItems > 0 ? Math.round((approvedItems / totalItems) * 100) : 0;
  const uploadedPercent = totalItems > 0 ? Math.round((uploadedItems / totalItems) * 100) : 0;
  const pendingReviewPercent = totalItems > 0 ? Math.round((pendingReviewItems / totalItems) * 100) : 0;

  const handleFileClick = (itemId: string) => {
    activeItemIdRef.current = itemId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !activeItemIdRef.current) return;
    const file = e.target.files[0];
    const itemId = activeItemIdRef.current;
    setUploadingItemId(itemId);
    try {
      const overrideUrl = URL.createObjectURL(file);
      const tmpl = matchingTemplates.find(t => t.id === itemId);
      setLocalOverrides(prev => ({
        ...prev,
        [itemId]: {
          status: "Uploaded",
          fileName: file.name,
          fileUrl: overrideUrl,
          uploadedAt: new Date().toISOString().split("T")[0]
        },
        ...(tmpl ? {
          [tmpl.id]: {
            status: "Uploaded",
            fileName: file.name,
            fileUrl: overrideUrl,
            uploadedAt: new Date().toISOString().split("T")[0]
          },
          [tmpl.title]: {
            status: "Uploaded",
            fileName: file.name,
            fileUrl: overrideUrl,
            uploadedAt: new Date().toISOString().split("T")[0]
          }
        } : {})
      }));
      await onUploadDocument(employee.id, itemId, file, tmpl?.category);
    } catch (err) {
      console.error("Failed to upload document for checklist item:", err);
    } finally {
      setUploadingItemId(null);
      activeItemIdRef.current = null;
      if (e.target) e.target.value = "";
    }
  };

  const handleApprove = async (itemId: string) => {
    setReviewingItemId(itemId);
    setReviewAction("approve");
    try {
      setLocalOverrides(prev => ({
        ...prev,
        [itemId]: {
          status: "Approved",
          reviewedBy: currentUserRole === "admin" ? "Admin" : "HR Manager",
          reviewedAt: new Date().toISOString().split("T")[0]
        }
      }));
      await onReviewItem(employee.id, itemId, "approve");
    } catch (err) {
      console.error("Failed to approve item:", err);
    } finally {
      setReviewingItemId(null);
      setReviewAction(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingItemId) return;
    const itemId = rejectingItemId;
    setReviewingItemId(itemId);
    setReviewAction("reject");
    try {
      setLocalOverrides(prev => ({
        ...prev,
        [itemId]: {
          status: "Rejected",
          comments: rejectComment || "Document rejected. Please re-upload valid proof.",
          reviewedBy: currentUserRole === "admin" ? "Admin" : "HR Manager",
          reviewedAt: new Date().toISOString().split("T")[0]
        }
      }));
      await onReviewItem(employee.id, itemId, "reject", rejectComment);
    } catch (err) {
      console.error("Failed to reject item:", err);
    } finally {
      setReviewingItemId(null);
      setReviewAction(null);
      setRejectingItemId(null);
      setRejectComment("");
    }
  };

  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSubmitting(true);
    try {
      if (onCreateTemplate) {
        await onCreateTemplate({
          title: newTitle.trim(),
          description: newDescription.trim(),
          category: newCategory,
          required: newRequired,
          type,
          branch: employee?.branch || undefined
        });
      }
      setShowAddModal(false);
      setNewTitle("");
      setNewDescription("");
      setNewCategory(type === "onboarding" ? "ID Proof" : "Contract");
      setNewRequired(true);
    } catch (err) {
      console.error("Failed to create requirement:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (type === "exit" && employee.status !== "Resigned" && !canManage) {
    return (
      <div className="bg-slate-50 dark:bg-[#0c0c0c] border border-slate-200 dark:border-[#222] rounded-2xl p-5 text-center">
        <LogOut className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-slate-700 dark:text-gray-300">Exit Clearance Checklist</h4>
        <p className="text-xs text-slate-400 dark:text-gray-500 mt-1 mb-3">
          This checklist activates automatically when an employee resigns or separation is initiated.
        </p>
        {isSelf && onInitiateResignation && (
          <button
            onClick={() => onInitiateResignation(employee.id)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Submit Resignation / Request Exit Clearance</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 shadow-md dark:shadow-black/40 transition-all duration-300 w-full ${
      type === "exit"
        ? "bg-gradient-to-br from-amber-500/10 via-white to-orange-500/10 dark:from-[#1f1508] dark:via-[#0f0f0f] dark:to-[#1a0f05] border-amber-300/80 dark:border-amber-900/60"
        : "bg-gradient-to-br from-emerald-500/5 via-white to-teal-500/5 dark:from-[#081b14] dark:via-[#0f0f0f] dark:to-[#091618] border-emerald-200/80 dark:border-emerald-900/50"
    }`}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif,.bmp,.heic,.heif,.svg,.jfif,.avif,.tiff,.tif"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className="mb-4 border-b border-slate-100 dark:border-[#1a1a1a] pb-3.5 space-y-2.5">
        {/* Row 1: Badges & Action Buttons */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider ${
            type === "exit"
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
          }`}>
            {type === "exit" ? "Exit Separation Window" : "Mandatory Employee KYC"}
          </span>

          <div className="flex items-center space-x-2 shrink-0 ml-auto">
            {canManage && onCreateTemplate && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center space-x-1.5 text-white hover:scale-[1.02] ${
                  type === "exit"
                    ? "bg-amber-600 hover:bg-amber-500"
                    : "bg-emerald-600 hover:bg-emerald-500"
                }`}
                title={`Add new required document item for ${type} checklist`}
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Add Requirement</span>
              </button>
            )}
            <span className={`inline-flex items-center text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-2xs whitespace-nowrap ${
              isAllApproved
                ? "bg-emerald-600 text-white"
                : uploadedItems > 0
                ? "bg-blue-600 text-white"
                : "bg-amber-500 text-white"
            }`}>
              <span>{approvedItems} / {totalItems} Approved</span>
            </span>
          </div>
        </div>

        {/* Row 2: Icon + Title in Single Line */}
        <div className="flex items-center space-x-2.5 w-full">
          <div className={`p-2 rounded-xl shrink-0 shadow-xs ${
            type === "exit"
              ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white"
              : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
          }`}>
            {type === "exit" ? (
              <LogOut className="w-4 h-4" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
          </div>
          <h3 className="font-display font-extrabold text-slate-800 dark:text-white text-base sm:text-lg leading-tight whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
            {type === "exit" ? "Employee Exit & Separation Clearance Checklist" : "Onboarding Document Checklist"}
          </h3>
        </div>

        {/* Row 3: Description */}
        <p className="text-xs text-slate-500 dark:text-gray-400 w-full leading-relaxed pt-0.5">
          {type === "exit"
            ? "All required exit documents and clearance forms must be uploaded by the resigning employee and verified by Admin/HR before final departure."
            : "Admin & HR defined checklist. Employees must upload required compliance, identity, and educational documents."}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 space-y-2 bg-slate-50/80 dark:bg-[#141414]/90 p-3.5 rounded-xl border border-slate-100 dark:border-[#222]">
        <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-gray-300">
          <span className="flex items-center space-x-1.5">
            <Sparkles className={`w-3.5 h-3.5 ${type === "exit" ? "text-amber-500" : "text-emerald-500"}`} />
            <span>Checklist Completion Progress</span>
          </span>
          <div className="flex items-center space-x-2 font-mono text-[11px]">
            {pendingReviewItems > 0 && (
              <span className="text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200/50 dark:border-blue-900/40">
                {uploadedPercent}% Uploaded ({pendingReviewItems} Pending HR Review)
              </span>
            )}
            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-900/40">
              {approvedPercent}% Approved
            </span>
          </div>
        </div>
        <div className="w-full bg-slate-200 dark:bg-[#222] rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-300/30 dark:border-[#333] flex">
          {/* Approved Segment (Emerald) */}
          <div
            className={`h-full transition-all duration-700 ${approvedPercent === 100 || pendingReviewPercent === 0 ? "rounded-full" : "rounded-l-full"} ${
              type === "exit"
                ? "bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500"
                : "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
            }`}
            style={{ width: `${approvedPercent}%` }}
          />
          {/* Pending HR Review Segment (Blue) */}
          <div
            className={`h-full bg-blue-500/80 transition-all duration-700 ${approvedPercent === 0 ? "rounded-full" : "rounded-r-full"}`}
            style={{ width: `${pendingReviewPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist Items List */}
      <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1.5 custom-scrollbar">
        {uniqueItems.map((item, idx) => {
          const isUploaded = item.status === "Uploaded";
          const isApproved = item.status === "Approved";
          const isRejected = item.status === "Rejected";
          const isPending = item.status === "Pending";
          const isUploading = uploadingItemId === item.id;

          return (
            <div
              key={`${item.id || item.templateId || item.title || "item"}-${idx}`}
              className={`p-4 rounded-2xl border transition-all duration-200 overflow-hidden ${
                isApproved
                  ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/50"
                  : isRejected
                  ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/50"
                  : isUploaded
                  ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-900/50"
                  : "bg-white dark:bg-[#141414] border-slate-200 dark:border-[#222]"
              }`}
            >
              {/* Item Title Row & Status */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <div className={`p-2 rounded-xl shrink-0 shadow-2xs ${
                    isApproved
                      ? "bg-emerald-500 text-white"
                      : isRejected
                      ? "bg-rose-500 text-white"
                      : isUploaded
                      ? "bg-blue-500 text-white"
                      : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {isApproved ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isRejected ? (
                      <XCircle className="w-4 h-4" />
                    ) : isUploaded ? (
                      <Clock className="w-4 h-4 animate-pulse" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>

                  <h4 className="font-extrabold text-slate-800 dark:text-white text-sm sm:text-base tracking-tight break-words">
                    {item.title}
                  </h4>

                  {item.required ? (
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 shrink-0">
                      Mandatory
                    </span>
                  ) : (
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                      Optional
                    </span>
                  )}

                  {canManage && onDeleteTemplate && item.templateId && (
                    <button
                      type="button"
                      onClick={() => onDeleteTemplate(item.templateId!)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer ml-1"
                      title="Delete this requirement item from checklist templates"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Indicator Pill */}
                <span className={`text-[10px] font-extrabold px-3 py-1 rounded-xl uppercase tracking-wider shrink-0 whitespace-nowrap shadow-2xs ${
                  isApproved
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                    : isRejected
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60"
                    : isUploaded
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                }`}>
                  {isApproved ? "Approved ✓" : isRejected ? "Rejected ✕" : isUploaded ? "Uploaded (Pending Review)" : "Pending Upload"}
                </span>
              </div>

              {/* Description */}
              {item.description && (
                <p className="text-xs text-slate-500 dark:text-gray-400 sm:pl-9 mb-2 leading-relaxed break-words">
                  {item.description}
                </p>
              )}

              {/* HR Reviewer Notes / Rejection Banner */}
              {isRejected && (
                <div className="sm:ml-9 mb-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-xs space-y-1 animate-in fade-in">
                  <div className="flex items-center space-x-1.5 text-rose-700 dark:text-rose-400 font-extrabold">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Action Required: Document Proof Rejected</span>
                  </div>
                  <p className="text-rose-600 dark:text-rose-300 text-[11px] leading-relaxed">
                    {item.comments ? (
                      <><strong>HR Reason:</strong> "{item.comments}"</>
                    ) : (
                      "Your uploaded document was rejected. Please re-upload a clear, valid copy of this requirement to complete compliance."
                    )}
                  </p>
                </div>
              )}

              {item.comments && !isRejected && (
                <div className="sm:ml-9 mb-2.5 text-xs px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span><strong className="font-bold">HR Review Feedback:</strong> {item.comments}</span>
                </div>
              )}

              {isApproved && item.reviewedBy && (
                <p className="sm:ml-9 mb-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Verified &amp; Approved by {item.reviewedBy} {item.reviewedAt ? `on ${new Date(item.reviewedAt).toLocaleDateString()}` : ""}</span>
                </p>
              )}

              {/* Action Buttons Bar - All in 1 Line Without Scroll */}
              <div className="pt-2.5 border-t border-slate-100 dark:border-[#222] flex items-center justify-between gap-1.5 flex-nowrap overflow-hidden">
                <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
                  {/* Upload Button */}
                  {canUpload && (
                    <button
                      type="button"
                      disabled={isUploading || (!canManage && (isUploaded || isApproved))}
                      onClick={() => handleFileClick(item.id)}
                      className={`px-2.5 py-1 text-[11px] sm:text-xs font-extrabold rounded-xl transition-all shadow-xs flex items-center space-x-1 whitespace-nowrap shrink-0 ${
                        isApproved
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 cursor-default opacity-90"
                          : isUploaded && !canManage
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800/60 cursor-not-allowed opacity-90"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                      }`}
                      title={
                        isApproved
                          ? "Document already verified and approved"
                          : isUploaded && !canManage
                          ? "Document uploaded and awaiting HR/Admin review"
                          : item.fileUrl
                          ? "Re-upload document file"
                          : "Upload document file"
                      }
                    >
                      {isApproved ? (
                        <>
                          <Check className="w-3 h-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span>Approved ✓</span>
                        </>
                      ) : isUploaded && !canManage ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 shrink-0 text-blue-600 dark:text-blue-400" />
                          <span>Uploaded</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3 shrink-0" />
                          <span>{isUploading ? "Uploading..." : isRejected ? "Re-upload" : item.fileUrl ? "Re-upload" : "Upload"}</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Preview Button */}
                  {item.fileUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ name: item.fileName || item.title, url: item.fileUrl! })}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-[#222] hover:bg-slate-200 dark:hover:bg-[#2a2a2a] text-slate-700 dark:text-gray-200 text-[11px] sm:text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap shrink-0 hover:scale-[1.02]"
                      title="View uploaded document file"
                    >
                      <Eye className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>View File</span>
                    </button>
                  )}
                </div>

                {/* Admin / HR Approval Actions - Same Line */}
                {canManage && (isUploaded || isPending || isRejected) && !isApproved && (
                  <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={!isUploaded || (reviewingItemId === item.id && reviewAction === "approve")}
                      onClick={() => handleApprove(item.id)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap shrink-0 ${
                        isUploaded
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                          : "bg-slate-200 text-slate-400 dark:bg-slate-800/80 dark:text-slate-600 border border-slate-300/40 dark:border-slate-700/40 cursor-not-allowed opacity-60"
                      }`}
                      title={
                        isUploaded
                          ? "Approve document clearance"
                          : "Approval disabled until document file is uploaded by employee"
                      }
                    >
                      {reviewingItemId === item.id && reviewAction === "approve" ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                          <span>Approving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3 h-3 shrink-0" />
                          <span>Approve</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={!isUploaded || (reviewingItemId === item.id && reviewAction === "reject")}
                      onClick={() => setRejectingItemId(item.id)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap shrink-0 ${
                        isUploaded
                          ? "bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                          : "bg-slate-200 text-slate-400 dark:bg-slate-800/80 dark:text-slate-600 border border-slate-300/40 dark:border-slate-700/40 cursor-not-allowed opacity-60"
                      }`}
                      title={
                        isUploaded
                          ? "Reject document"
                          : "Rejection disabled until document file is uploaded by employee"
                      }
                    >
                      {reviewingItemId === item.id && reviewAction === "reject" ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                          <span>Rejecting...</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3 shrink-0" />
                          <span>Reject</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {uniqueItems.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-6">
            No {type} checklist items configured yet by Admin/HR.
          </p>
        )}
      </div>

      {/* Exit Clearance Final Approval Section for Admin/HR */}
      {type === "exit" && canManage && (
        <div className="mt-6 pt-5 border-t border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row items-center justify-between gap-4 bg-amber-500/10 dark:bg-amber-950/30 p-4.5 rounded-2xl border border-amber-200/80 dark:border-amber-800/40">
          <div>
            <h5 className="font-extrabold text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-center">
              <ShieldCheck className="w-4 h-4 mr-1.5 text-amber-600 dark:text-amber-400 shrink-0" />
              Final Separation Clearance Sign-off
            </h5>
            <p className="text-xs text-amber-700/90 dark:text-amber-400/90 mt-0.5 leading-relaxed">
              {employee.exitClearedAt
                ? `Full Exit Clearance Issued by ${employee.exitClearedBy || "Admin/HR"} on ${new Date(employee.exitClearedAt).toLocaleDateString()}`
                : "Grant formal departure clearance after verifying all required exit clearance documents."}
            </p>
          </div>

          {employee.exitClearedAt ? (
            <span className="px-4 py-2 bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center space-x-1.5 shrink-0 whitespace-nowrap">
              <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
              <span>Full Separation Clearance Approved</span>
            </span>
          ) : (
            <button
              type="button"
              disabled={!isAllApproved && uniqueItems.some(i => i.required && i.status !== "Approved")}
              onClick={() => onGrantExitClearance && onGrantExitClearance(employee.id)}
              className={`px-5 py-2.5 font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center space-x-2 cursor-pointer shrink-0 whitespace-nowrap ${
                isAllApproved || !uniqueItems.some(i => i.required && i.status !== "Approved")
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-[1.02]"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Grant Final Exit Clearance</span>
            </button>
          )}
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className={`bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#222] shadow-2xl flex flex-col transition-all overflow-hidden ${
            isFullscreen 
              ? "fixed inset-0 z-[100] w-screen h-screen rounded-none border-0 max-w-none max-h-none p-0" 
              : "rounded-3xl w-full max-w-4xl max-h-[90vh]"
          }`}>
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#222] flex items-center justify-between bg-slate-50 dark:bg-[#0c0c0c] shrink-0">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base truncate">{previewDoc.name}</h4>
                  <p className="text-[11px] text-slate-400">Compliance &amp; Verification Document</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="px-3 py-1.5 bg-slate-200/80 dark:bg-[#222] text-slate-700 dark:text-gray-200 text-xs font-bold rounded-xl flex items-center space-x-1.5 hover:bg-slate-300 dark:hover:bg-[#333] transition-colors cursor-pointer"
                  title={isFullscreen ? "Exit Fullscreen" : "Full Screen View"}
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{isFullscreen ? "Exit Full Screen" : "Full Screen"}</span>
                </button>
                {previewDoc.url && (
                  <a
                    href={previewDoc.url}
                    download={previewDoc.name}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold rounded-xl flex items-center space-x-1.5 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Download</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPreviewDoc(null);
                    setIsFullscreen(false);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-[#222] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className={`p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-100/70 dark:bg-[#080808] custom-scrollbar ${
              isFullscreen ? "h-[calc(100vh-65px)] min-h-0" : "min-h-[500px]"
            }`}>
              {previewDoc.url ? (
                previewDoc.url.startsWith("data:image/") ||
                previewDoc.url.startsWith("blob:") ||
                /\.(jpg|jpeg|png|webp|svg|gif|bmp|heic|heif|avif|jfif|tiff|tif)(\?.*)?$/i.test(previewDoc.url) ||
                (previewDoc.name && /\.(jpg|jpeg|png|webp|svg|gif|bmp|heic|heif|avif|jfif|tiff|tif)$/i.test(previewDoc.name)) ? (
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.name}
                    className={`object-contain rounded-2xl shadow-md border border-slate-200 dark:border-[#222] ${
                      isFullscreen ? "max-h-[calc(100vh-100px)] max-w-full" : "max-h-[65vh] max-w-full"
                    }`}
                  />
                ) : (
                  <iframe
                    src={previewDoc.url}
                    title={previewDoc.name}
                    className={`w-full rounded-2xl border border-slate-200 dark:border-[#222] bg-white shadow-md ${
                      isFullscreen ? "h-[calc(100vh-100px)]" : "h-[65vh]"
                    }`}
                  />
                )
              ) : (
                <div className="p-10 bg-white dark:bg-[#141414] rounded-2xl border border-slate-200 dark:border-[#222] text-center space-y-4 max-w-md">
                  <FileText className="w-16 h-16 text-emerald-500 mx-auto" />
                  <div>
                    <h5 className="text-sm font-bold text-slate-800 dark:text-white">{previewDoc.name}</h5>
                    <p className="text-xs text-slate-400 mt-1">No preview URL available for this document file.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Comment Modal */}
      {rejectingItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#222] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2.5 text-rose-600 dark:text-rose-400">
              <div className="p-2 bg-rose-100 dark:bg-rose-950/60 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-slate-800 dark:text-white text-base">Reject Document Proof</h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
              Please state why this document is rejected so the employee is informed to re-upload clear proof.
            </p>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="e.g. Document copy is blurry or missing signatures..."
              className="w-full h-28 p-3.5 bg-slate-50 dark:bg-[#0c0c0c] border border-slate-200 dark:border-[#222] rounded-2xl text-xs text-slate-800 dark:text-gray-200 focus:outline-none focus:border-rose-500 font-medium"
            />
            <div className="flex justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRejectingItemId(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviewingItemId === rejectingItemId && reviewAction === "reject"}
                onClick={handleConfirmReject}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all hover:scale-[1.02] cursor-pointer flex items-center space-x-1.5"
              >
                {reviewingItemId === rejectingItemId && reviewAction === "reject" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <span>Confirm Rejection</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Checklist Requirement Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#222] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#222] pb-3">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                <div className={`p-2 rounded-xl text-white ${type === "exit" ? "bg-amber-600" : "bg-emerald-600"}`}>
                  <Plus className="w-4 h-4" />
                </div>
                <h4 className="font-extrabold text-slate-800 dark:text-white text-base">
                  Add {type === "exit" ? "Exit Clearance" : "Onboarding"} Requirement
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequirement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Aadhaar Card Copy, PAN Card, Form 16..."
                  className="w-full p-3 bg-slate-50 dark:bg-[#0c0c0c] border border-slate-200 dark:border-[#222] rounded-xl text-xs text-slate-800 dark:text-gray-200 focus:outline-none focus:border-emerald-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Document Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-[#0c0c0c] border border-slate-200 dark:border-[#222] rounded-xl text-xs text-slate-800 dark:text-gray-200 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="ID Proof">ID Proof (Aadhaar, Passport, PAN)</option>
                  <option value="Contract">Contract & Employment Agreement</option>
                  <option value="Tax Document">Tax Document / Form 16</option>
                  <option value="Educational">Educational & Marksheets</option>
                  <option value="Exit Clearance">Exit Clearance Form / Relieving</option>
                  <option value="Other">Other Compliance Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Description / Upload Guidance
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Instructions for employee on what proof to upload..."
                  className="w-full h-20 p-3 bg-slate-50 dark:bg-[#0c0c0c] border border-slate-200 dark:border-[#222] rounded-xl text-xs text-slate-800 dark:text-gray-200 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="flex items-center space-x-2.5 pt-1">
                <input
                  type="checkbox"
                  id={`required-${type}`}
                  checked={newRequired}
                  onChange={(e) => setNewRequired(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor={`required-${type}`} className="text-xs font-semibold text-slate-700 dark:text-gray-300 cursor-pointer">
                  Mandatory Requirement (Employee cannot complete clearance without this)
                </label>
              </div>

              <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-100 dark:border-[#222]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim()}
                  className={`px-5 py-2.5 font-extrabold text-xs text-white rounded-xl shadow-md transition-all cursor-pointer ${
                    type === "exit" ? "bg-amber-600 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-500"
                  } disabled:opacity-50`}
                >
                  {isSubmitting ? "Saving..." : "Add Requirement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
