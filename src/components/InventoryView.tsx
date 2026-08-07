import React, { useState, useEffect } from "react";
import { 
  Laptop, Tablet, Radio, Layers, Plus, Check, X, Trash2,
  HelpCircle, AlertCircle, FileText, User, Calendar
} from "lucide-react";
import { InventoryItem, InventoryRequest, Employee, UserRole } from "../types";

interface InventoryViewProps {
  inventory: InventoryItem[];
  inventoryRequests: InventoryRequest[];
  employees: Employee[];
  role: UserRole;
  currentEmployeeId: string;
  customBranches?: string[];
  onAddAsset: (assetData: any) => void;
  onDeleteAsset: (id: string) => void;
  onApplyAssetRequest: (reqData: any) => void;
  onReviewAssetRequest: (id: string, status: "Approved" | "Rejected", assetId?: string) => void;
}

export default function InventoryView({
  inventory,
  inventoryRequests,
  employees,
  role,
  currentEmployeeId,
  customBranches,
  onAddAsset,
  onDeleteAsset,
  onApplyAssetRequest,
  onReviewAssetRequest
}: InventoryViewProps) {
  const [activeTab, setActiveTab] = useState<"items" | "requests">("items");
  const [showAddAssetForm, setShowAddAssetForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Allocation states
  const [allocatingReqId, setAllocatingReqId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");

  // Add asset fields
  const [assetName, setAssetName] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [assetCategory, setAssetCategory] = useState<any>("Laptop");

  const getBranchCode = (branchName: string) => {
    if (!branchName) return "";
    const codeMap: Record<string, string> = {
      "Noida HQ": "NOIDA-HQ",
      "Mumbai Branch": "MUM-BR",
      "Pune Digital Office": "PUNE-DO",
      "Hyderabad Hub": "HYD-HUB"
    };
    if (codeMap[branchName]) return codeMap[branchName];
    return branchName.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 10);
  };

  // Automatically pre-select the logged-in employee's branch and generate initial serial code
  useEffect(() => {
    const currentEmp = employees.find(e => e.id === currentEmployeeId);
    const empBranch = currentEmp?.branch || "Mumbai Branch";
    setSelectedBranch(empBranch);
    const code = getBranchCode(empBranch);
    const catCode = assetCategory === "Laptop" ? "LP" : assetCategory === "Mobile Tablet" ? "TB" : assetCategory === "WiFi Dongle" ? "WF" : "AST";
    if (!serialNumber || showAddAssetForm) {
      const randNum = Math.floor(1000 + Math.random() * 9000);
      setSerialNumber(`${code}-${catCode}-${randNum}`);
    }
  }, [currentEmployeeId, employees, showAddAssetForm]);

  const handleCategorySelect = (category: string) => {
    setAssetCategory(category as any);
    const branchToUse = selectedBranch || (employees.find(e => e.id === currentEmployeeId)?.branch) || "Mumbai Branch";
    if (branchToUse) {
      const code = getBranchCode(branchToUse);
      const catCode = category === "Laptop" ? "LP" : category === "Mobile Tablet" ? "TB" : category === "WiFi Dongle" ? "WF" : "AST";
      const randNum = Math.floor(1000 + Math.random() * 9000);
      setSerialNumber(`${code}-${catCode}-${randNum}`);
    }
  };

  // Request asset fields
  const [reqItemName, setReqItemName] = useState("");
  const [reqCategory, setReqCategory] = useState("Laptop");
  const [reqReason, setReqReason] = useState("");
  const [itemSelectionMode, setItemSelectionMode] = useState<"select" | "custom">("select");
  const [selectedExistingAssetId, setSelectedExistingAssetId] = useState("");

  const handleAddAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName || !serialNumber) return;
    onAddAsset({
      id: `inv-${Date.now()}`,
      name: assetName,
      serialNumber,
      category: assetCategory,
      status: "Available",
      assignedToEmployeeId: null,
      assignedDate: null,
      branch: selectedBranch || undefined
    });
    setAssetName("");
    setShowAddAssetForm(false);

    // Reset serial number for next asset
    const currentEmp = employees.find(e => e.id === currentEmployeeId);
    const empBranch = currentEmp?.branch || "Mumbai Branch";
    if (empBranch) {
      setSelectedBranch(empBranch);
      const code = getBranchCode(empBranch);
      const catCode = assetCategory === "Laptop" ? "LP" : assetCategory === "Mobile Tablet" ? "TB" : assetCategory === "WiFi Dongle" ? "WF" : "AST";
      const randNum = Math.floor(1000 + Math.random() * 9000);
      setSerialNumber(`${code}-${catCode}-${randNum}`);
    }
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalItemName = reqItemName;
    if (itemSelectionMode === "select") {
      const existingAsset = inventory.find(i => i.id === selectedExistingAssetId);
      if (!existingAsset) return;
      finalItemName = `${existingAsset.name} (S/N: ${existingAsset.serialNumber})`;
    } else {
      if (!reqItemName) return;
    }
    if (!reqReason) return;
    onApplyAssetRequest({
      employeeId: currentEmployeeId,
      itemName: finalItemName,
      category: reqCategory,
      reason: reqReason
    });
    setReqItemName("");
    setSelectedExistingAssetId("");
    setReqReason("");
    setShowRequestForm(false);
  };

  const handleApproveClick = (reqId: string, category: string) => {
    // Check available assets under this category
    const availableAssets = inventory.filter(i => i.category === category && i.status === "Available");
    if (availableAssets.length === 0) {
      // Approve ticket directly if no available asset in directory
      onReviewAssetRequest(reqId, "Approved");
      return;
    }
    setAllocatingReqId(reqId);
    setSelectedAssetId(availableAssets[0].id);
  };

  const handleCompleteAllocation = (reqId: string) => {
    onReviewAssetRequest(reqId, "Approved", selectedAssetId || undefined);
    setAllocatingReqId(null);
  };

  const getEmployeeName = (empId: string) => {
    return employees.find(e => e.id === empId)?.fullName || "Unknown Employee";
  };

  const getEmployeeDept = (empId: string) => {
    return employees.find(e => e.id === empId)?.department || "Loans";
  };

  const getAssetIcon = (category: string) => {
    switch (category) {
      case "Laptop": return <Laptop className="w-5 h-5" />;
      case "Mobile Tablet": return <Tablet className="w-5 h-5" />;
      case "WiFi Dongle": return <Radio className="w-5 h-5" />;
      default: return <Layers className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-3.5 sm:p-4 shadow-xs dark:neon-glow">
        <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-[#0a0a0a] p-1 rounded-xl border border-slate-100 dark:border-[#1a1a1a] text-xs font-semibold overflow-x-auto scrollbar-none max-w-full">
          <button
            onClick={() => setActiveTab("items")}
            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeTab === "items" ? "bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-white shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
          >
            Hardware Assets Directory
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeTab === "requests" ? "bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-white shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
          >
            Asset Requisition Tickets {inventoryRequests.filter(r => r.status === "Pending").length > 0 && (
              <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-mono font-bold text-[9px] px-2 py-0.5 rounded-full ml-1.5">
                {inventoryRequests.filter(r => r.status === "Pending").length} Pending
              </span>
            )}
          </button>
        </div>

        {activeTab === "items" && (role === "admin" || role === "hr") && (
          <button
            onClick={() => setShowAddAssetForm(!showAddAssetForm)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center space-x-1 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddAssetForm ? "Hide Form" : "Register Hardware Asset"}</span>
          </button>
        )}

        {activeTab === "requests" && role === "employee" && (
          <button
            onClick={() => setShowRequestForm(!showRequestForm)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center space-x-1 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showRequestForm ? "Hide Form" : "Request Hardware"}</span>
          </button>
        )}
      </div>

      {/* SUBTAB 1: Assets Grid */}
      {activeTab === "items" && (
        <div className="space-y-6">
          {/* Add Asset Form (Admin Only) */}
          {showAddAssetForm && (role === "admin" || role === "hr") && (
            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow animate-in fade-in duration-200">
              <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md mb-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">Register New Hardware Asset</h3>

              <form onSubmit={handleAddAssetSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-500 dark:text-gray-400 mb-1">Asset Model Name</label>
                    <input 
                      type="text"
                      value={assetName}
                      onChange={(e) => setAssetName(e.target.value)}
                      placeholder="e.g. MacBook Pro M3"
                      className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-500 dark:text-gray-400 mb-1">Branch (Branch Serial Code)</label>
                    <input 
                      type="text"
                      value={selectedBranch ? `${selectedBranch} (${getBranchCode(selectedBranch)})` : "Fetching branch..."}
                      readOnly
                      disabled
                      className="w-full bg-slate-100 dark:bg-[#1a1a1a]/70 text-slate-700 dark:text-gray-300 px-3 py-2 rounded-xl border border-slate-200 dark:border-[#262626] font-medium cursor-not-allowed select-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-500 dark:text-gray-400 mb-1">
                      Company Serial Code {selectedBranch && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold ml-1">[{getBranchCode(selectedBranch)}]</span>}
                    </label>
                    <input 
                      type="text"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder="e.g. ASSET-LP-8849"
                      className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-500 dark:text-gray-400 mb-1">Asset Category</label>
                    <select
                      value={assetCategory}
                      onChange={(e) => handleCategorySelect(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-medium cursor-pointer"
                    >
                      <option value="Laptop">Laptop Notebook</option>
                      <option value="Mobile Tablet">Mobile Sales Tablet</option>
                      <option value="WiFi Dongle">4G WiFi Dongle</option>
                      <option value="Access Card">Physical Access Card</option>
                      <option value="Other">Other / Monitors / Peripherals</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl cursor-pointer"
                  >
                    Register Asset
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Asset List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inventory.map(item => (
              <div key={item.id} className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-xl border border-emerald-100/50 dark:border-emerald-900/50">
                      {getAssetIcon(item.category)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-white text-xs">{item.name}</h4>
                      <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">Serial: <span className="font-mono font-medium">{item.serialNumber}</span></p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${
                    item.status === "Available" 
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : item.status === "Assigned"
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
                  }`}>
                    {item.status}
                  </span>
                </div>

                <div className="border-t border-slate-50 dark:border-[#1a1a1a]/80 pt-3 flex items-center justify-between text-xs">
                  {item.status === "Assigned" && item.assignedToEmployeeId ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5.5 h-5.5 rounded-full bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center font-bold text-[9px]">
                        {getEmployeeName(item.assignedToEmployeeId).charAt(0)}
                      </div>
                      <div>
                        <span className="block text-slate-500 dark:text-gray-400 leading-tight">Assigned To</span>
                        <span className="block font-semibold text-slate-700 dark:text-gray-300 text-[11px] leading-tight mt-0.5">{getEmployeeName(item.assignedToEmployeeId)}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-[11px] italic">No active allocation logs</span>
                  )}

                  <div className="flex items-center space-x-2">
                    {item.assignedDate && (
                      <span className="text-[10px] text-slate-400 font-mono">On {item.assignedDate}</span>
                    )}
                    {(role === "admin" || role === "hr") && (
                      <button
                        onClick={() => onDeleteAsset(item.id)}
                        title="Delete Asset"
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 2: Requests tickets */}
      {activeTab === "requests" && (
        <div className="space-y-6">
          {/* Submit Request Form (Employee Only) */}
          {showRequestForm && role === "employee" && (
            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl overflow-hidden shadow-xs dark:neon-glow animate-in fade-in duration-200">
              {/* Form Header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1a1a1a] bg-gradient-to-r from-slate-50 to-white dark:from-[#0a0a0a] dark:to-[#0f0f0f]">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-800 dark:text-white text-sm">Submit Asset Requisition</h3>
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">Select from directory or request a new hardware asset</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleRequestSubmit} className="p-6 space-y-5 text-xs">

                {/* Mode Toggle Cards */}
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-3 text-[11px] uppercase tracking-wider">Item Specifications Required *</label>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* Select from Directory card */}
                    <button
                      type="button"
                      onClick={() => {
                        setItemSelectionMode("select");
                        setReqItemName("");
                        const first = inventory.find(i => i.status === "Available");
                        setSelectedExistingAssetId(first ? first.id : "");
                      }}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer group ${
                        itemSelectionMode === "select"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 shadow-md shadow-emerald-100 dark:shadow-emerald-950/30"
                          : "border-slate-200 dark:border-[#262626] bg-slate-50 dark:bg-[#0a0a0a] hover:border-slate-300 dark:hover:border-[#333]"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 transition-colors ${
                        itemSelectionMode === "select" ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-[#1a1a1a] text-slate-400"
                      }`}>
                        <Layers className="w-4 h-4" />
                      </div>
                      <p className={`font-bold text-[11px] mb-0.5 ${itemSelectionMode === "select" ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-gray-400"}`}>
                        From Directory
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-gray-500 leading-relaxed">Pick an existing registered asset</p>
                      {itemSelectionMode === "select" && (
                        <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>

                    {/* Request New Asset card */}
                    <button
                      type="button"
                      onClick={() => {
                        setItemSelectionMode("custom");
                        setSelectedExistingAssetId("");
                      }}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer group ${
                        itemSelectionMode === "custom"
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 shadow-md shadow-indigo-100 dark:shadow-indigo-950/30"
                          : "border-slate-200 dark:border-[#262626] bg-slate-50 dark:bg-[#0a0a0a] hover:border-slate-300 dark:hover:border-[#333]"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 transition-colors ${
                        itemSelectionMode === "custom" ? "bg-indigo-500 text-white" : "bg-slate-200 dark:bg-[#1a1a1a] text-slate-400"
                      }`}>
                        <Plus className="w-4 h-4" />
                      </div>
                      <p className={`font-bold text-[11px] mb-0.5 ${itemSelectionMode === "custom" ? "text-indigo-700 dark:text-indigo-400" : "text-slate-600 dark:text-gray-400"}`}>
                        New Asset Request
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-gray-500 leading-relaxed">Specify an asset not yet registered</p>
                      {itemSelectionMode === "custom" && (
                        <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Select Mode — Asset Picker */}
                  {itemSelectionMode === "select" && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      {inventory.length === 0 ? (
                        <div className="flex items-start space-x-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40">
                          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-bold text-amber-700 dark:text-amber-400 text-[11px]">No assets in directory</p>
                            <p className="text-amber-600 dark:text-amber-500 text-[10px] mt-0.5">No hardware has been registered yet. Switch to <span className="font-bold">New Asset Request</span> to describe what you need.</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <select
                              value={selectedExistingAssetId}
                              onChange={(e) => {
                                setSelectedExistingAssetId(e.target.value);
                                const asset = inventory.find(i => i.id === e.target.value);
                                if (asset) setReqCategory(asset.category);
                              }}
                              className="w-full bg-white dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-[#262626] font-semibold cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-all"
                            >
                              <option value="" disabled>— Choose an asset from the directory —</option>
                              {inventory.map(asset => (
                                <option key={asset.id} value={asset.id}>
                                  {asset.status === "Available" ? "✅" : asset.status === "Assigned" ? "🔒" : "⚠️"} {asset.name} · S/N: {asset.serialNumber} · [{asset.status}]
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </div>

                          {/* Selected Asset Preview Card */}
                          {selectedExistingAssetId && (() => {
                            const asset = inventory.find(i => i.id === selectedExistingAssetId);
                            if (!asset) return null;
                            const isAvailable = asset.status === "Available";
                            return (
                              <div className={`flex items-center space-x-3 p-3.5 rounded-xl border ${
                                isAvailable
                                  ? "bg-emerald-50 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-900/40"
                                  : "bg-amber-50 dark:bg-amber-950/15 border-amber-200 dark:border-amber-900/40"
                              }`}>
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                  isAvailable ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                                }`}>
                                  {getAssetIcon(asset.category)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-slate-800 dark:text-white text-[11px] truncate">{asset.name}</p>
                                  <p className="text-slate-400 dark:text-gray-500 text-[10px] font-mono mt-0.5">S/N: {asset.serialNumber}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase shrink-0 ${
                                  isAvailable
                                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                                    : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                                }`}>
                                  {asset.status}
                                </span>
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  )}

                  {/* Custom Mode — Text Input */}
                  {itemSelectionMode === "custom" && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                      <input
                        type="text"
                        value={reqItemName}
                        onChange={(e) => setReqItemName(e.target.value)}
                        placeholder="e.g. Lenovo ThinkPad T14 (For Loan Evaluations)"
                        className="w-full bg-white dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#262626] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all placeholder:text-slate-300 dark:placeholder:text-gray-600"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Asset Category */}
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-2 text-[11px] uppercase tracking-wider">Asset Category</label>
                  <div className="relative">
                    <select
                      value={reqCategory}
                      onChange={(e) => setReqCategory(e.target.value)}
                      className="w-full bg-white dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-[#262626] font-semibold cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-all"
                    >
                      <option value="Laptop">💻 Laptop Notebook</option>
                      <option value="Mobile Tablet">📱 Mobile Sales Tablet</option>
                      <option value="WiFi Dongle">📡 4G WiFi Dongle</option>
                      <option value="Other">🖥️ Other Miscellaneous</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                {/* Justification */}
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-2 text-[11px] uppercase tracking-wider">Requisition Justification *</label>
                  <textarea
                    value={reqReason}
                    onChange={(e) => setReqReason(e.target.value)}
                    placeholder="Specify operational requirement, customer site field audits, etc..."
                    rows={3}
                    className="w-full bg-white dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-4 py-3 rounded-xl border border-slate-200 dark:border-[#262626] focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-all resize-none placeholder:text-slate-300 dark:placeholder:text-gray-600 leading-relaxed"
                    required
                  />
                </div>

                {/* Submit Row */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-[#1a1a1a]">
                  <p className="text-[10px] text-slate-400 dark:text-gray-500">Your request will be reviewed by HR / Admin</p>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold px-5 py-2 rounded-xl cursor-pointer transition-all flex items-center space-x-1.5 shadow-md shadow-emerald-200 dark:shadow-emerald-950/40"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Submit Ticket</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Requisition Ticket Logs */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">
              <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">Asset Requisitions</h3>

              {/* Status Filter Toolbar */}
              <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-[#0a0a0a] p-1 rounded-xl border border-slate-100 dark:border-[#1a1a1a] text-xs font-semibold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter("All")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    statusFilter === "All"
                      ? "bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
                  }`}
                >
                  All ({(role === "employee" ? inventoryRequests.filter(r => r.employeeId === currentEmployeeId) : inventoryRequests).length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("Pending")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                    statusFilter === "Pending"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
                  }`}
                >
                  <span>Pending</span>
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                    statusFilter === "Pending" ? "bg-amber-600 text-white" : "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
                  }`}>
                    {(role === "employee" ? inventoryRequests.filter(r => r.employeeId === currentEmployeeId) : inventoryRequests).filter(r => r.status === "Pending").length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("Approved")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                    statusFilter === "Approved"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
                  }`}
                >
                  <span>Approved</span>
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                    statusFilter === "Approved" ? "bg-emerald-700 text-white" : "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                  }`}>
                    {(role === "employee" ? inventoryRequests.filter(r => r.employeeId === currentEmployeeId) : inventoryRequests).filter(r => r.status === "Approved").length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("Rejected")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                    statusFilter === "Rejected"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
                  }`}
                >
                  <span>Rejected</span>
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                    statusFilter === "Rejected" ? "bg-rose-700 text-white" : "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400"
                  }`}>
                    {(role === "employee" ? inventoryRequests.filter(r => r.employeeId === currentEmployeeId) : inventoryRequests).filter(r => r.status === "Rejected").length}
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {[...inventoryRequests]
                .filter(r => role === "employee" ? r.employeeId === currentEmployeeId : true)
                .filter(r => statusFilter === "All" ? true : r.status === statusFilter)
                .sort((a, b) => {
                  const tsA = parseInt(a.id.replace(/\D/g, "") || "0", 10);
                  const tsB = parseInt(b.id.replace(/\D/g, "") || "0", 10);
                  if (tsA && tsB && tsA !== tsB) return tsB - tsA;
                  if (a.requestDate && b.requestDate && a.requestDate !== b.requestDate) {
                    return new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime();
                  }
                  return 0;
                })
                .map(req => {
                  const isAllocatingThis = allocatingReqId === req.id;
                  const availableOptionAssets = inventory.filter(i => i.category === req.category && i.status === "Available");

                  return (
                    <div key={req.id} className="p-4 bg-slate-50/50 dark:bg-[#0a0a0a]/50 border border-slate-100 dark:border-[#1a1a1a] rounded-xl space-y-3 text-xs">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="font-bold text-slate-700 dark:text-gray-300">{req.employeeName}</span>
                            <span className="text-[10px] bg-slate-100 dark:bg-[#1a1a1a] text-slate-400 dark:text-gray-500 px-2 py-0.5 rounded font-mono">{req.employeeId}</span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold px-2 py-0.5 rounded">{req.category} Requested</span>
                          </div>
                          <p className="text-slate-400 dark:text-gray-500 font-medium">{getEmployeeDept(req.employeeId)} Department • Filed: {req.requestDate}</p>
                        </div>

                        <div className="flex items-center space-x-2 self-end md:self-auto">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${
                            req.status === "Approved" 
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                              : req.status === "Pending"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 animate-pulse"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
                          }`}>
                            {req.status}
                          </span>

                          {req.status === "Pending" && (role === "admin" || role === "hr") && !isAllocatingThis && (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => onReviewAssetRequest(req.id, "Rejected")}
                                className="p-1 hover:bg-slate-200 text-rose-400 hover:text-rose-600 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleApproveClick(req.id, req.category)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-2 py-1 rounded-md flex items-center space-x-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>Allocate</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-[#0a0a0a] p-3 rounded-lg border border-slate-100 dark:border-[#1a1a1a] leading-relaxed text-slate-600 dark:text-gray-300">
                        <p className="font-semibold text-slate-800 dark:text-white text-[11px] mb-1">Item Requested: {req.itemName}</p>
                        <p className="italic text-[11px]">" {req.reason} "</p>
                      </div>

                      {/* Hardware Allocation Inline form */}
                      {isAllocatingThis && (
                        <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/40 rounded-xl space-y-3.5 animate-in slide-in-from-top duration-200">
                          <p className="font-semibold text-emerald-800 dark:text-emerald-400 flex items-center">
                            <AlertCircle className="w-4.5 h-4.5 mr-1.5" /> Select Hardware Serial to allocate
                          </p>

                          <div className="flex items-center space-x-3">
                            <select
                                value={selectedAssetId}
                                onChange={(e) => setSelectedAssetId(e.target.value)}
                                className="bg-white dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-bold focus:outline-hidden flex-1"
                            >
                              {availableOptionAssets.map(asset => (
                                <option key={asset.id} value={asset.id}>{asset.name} (S/N: {asset.serialNumber})</option>
                              ))}
                            </select>

                            <button
                              onClick={() => setAllocatingReqId(null)}
                              className="bg-slate-100 hover:bg-slate-200 dark:bg-[#1a1a1a] dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 px-3 py-2 rounded-xl font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleCompleteAllocation(req.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl cursor-pointer"
                            >
                              Confirm Allocation
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              {inventoryRequests
                .filter(r => role === "employee" ? r.employeeId === currentEmployeeId : true)
                .filter(r => statusFilter === "All" ? true : r.status === statusFilter).length === 0 && (
                <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-6 bg-slate-50/50 dark:bg-[#0a0a0a]/10 rounded-xl">
                  {statusFilter === "All" ? "No asset requisition tickets logged." : `No ${statusFilter.toLowerCase()} asset requisition tickets found.`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
