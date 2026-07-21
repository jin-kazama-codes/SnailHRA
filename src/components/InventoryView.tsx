import React, { useState } from "react";
import { 
  Laptop, Tablet, Radio, Layers, Plus, Check, X, 
  HelpCircle, AlertCircle, FileText, User, Calendar
} from "lucide-react";
import { InventoryItem, InventoryRequest, Employee, UserRole } from "../types";

interface InventoryViewProps {
  inventory: InventoryItem[];
  inventoryRequests: InventoryRequest[];
  employees: Employee[];
  role: UserRole;
  currentEmployeeId: string;
  onAddAsset: (assetData: any) => void;
  onApplyAssetRequest: (reqData: any) => void;
  onReviewAssetRequest: (id: string, status: "Approved" | "Rejected", assetId?: string) => void;
}

export default function InventoryView({
  inventory,
  inventoryRequests,
  employees,
  role,
  currentEmployeeId,
  onAddAsset,
  onApplyAssetRequest,
  onReviewAssetRequest
}: InventoryViewProps) {
  const [activeTab, setActiveTab] = useState<"items" | "requests">("items");
  const [showAddAssetForm, setShowAddAssetForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Allocation states
  const [allocatingReqId, setAllocatingReqId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState("");

  // Add asset fields
  const [assetName, setAssetName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [assetCategory, setAssetCategory] = useState<any>("Laptop");

  // Request asset fields
  const [reqItemName, setReqItemName] = useState("");
  const [reqCategory, setReqCategory] = useState("Laptop");
  const [reqReason, setReqReason] = useState("");

  const handleAddAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName || !serialNumber) return;
    onAddAsset({
      name: assetName,
      serialNumber,
      category: assetCategory
    });
    setAssetName("");
    setSerialNumber("");
    setShowAddAssetForm(false);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqItemName || !reqReason) return;
    onApplyAssetRequest({
      employeeId: currentEmployeeId,
      itemName: reqItemName,
      category: reqCategory,
      reason: reqReason
    });
    setReqItemName("");
    setReqReason("");
    setShowRequestForm(false);
  };

  const handleApproveClick = (reqId: string, category: string) => {
    // Show allocation interface
    const availableAssets = inventory.filter(i => i.category === category && i.status === "Available");
    if (availableAssets.length === 0) {
      alert(`No available items under the ${category} category in inventory! Add assets first.`);
      return;
    }
    setAllocatingReqId(reqId);
    setSelectedAssetId(availableAssets[0].id);
  };

  const handleCompleteAllocation = (reqId: string) => {
    if (!selectedAssetId) return;
    onReviewAssetRequest(reqId, "Approved", selectedAssetId);
    setAllocatingReqId(null);
  };

  const getEmployeeName = (empId: string) => {
    return employees.find(e => e.id === empId)?.fullName || "Unknown Agent";
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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs dark:neon-glow">
        <div className="flex space-x-1.5 bg-slate-50 dark:bg-[#0a0a0a] p-1 rounded-xl border border-slate-100 dark:border-[#1a1a1a] text-xs font-semibold">
          <button
            onClick={() => setActiveTab("items")}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${activeTab === "items" ? "bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-white shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
          >
            Hardware Assets Directory
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${activeTab === "requests" ? "bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-white shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <label className="block font-semibold text-slate-500 dark:text-gray-400 mb-1">Company Serial Code</label>
                    <input 
                      type="text"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder="e.g. SNAIL-LP-8849"
                      className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-500 dark:text-gray-400 mb-1">Asset Category</label>
                    <select
                      value={assetCategory}
                      onChange={(e) => setAssetCategory(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-medium"
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

                  {item.assignedDate && (
                    <span className="text-[10px] text-slate-400 font-mono">On {item.assignedDate}</span>
                  )}
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
            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow animate-in fade-in duration-200">
              <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md mb-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">Submit Asset Requisition</h3>

              <form onSubmit={handleRequestSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-500 dark:text-gray-400 mb-1">Item Specifications Required *</label>
                    <input 
                      type="text"
                      value={reqItemName}
                      onChange={(e) => setReqItemName(e.target.value)}
                      placeholder="e.g. Lenovo ThinkPad T14 (For Loan Evaluations)"
                      className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-500 dark:text-gray-400 mb-1">Asset Category</label>
                    <select
                      value={reqCategory}
                      onChange={(e) => setReqCategory(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-medium"
                    >
                      <option value="Laptop">Laptop Notebook</option>
                      <option value="Mobile Tablet">Mobile Sales Tablet</option>
                      <option value="WiFi Dongle">4G WiFi Dongle</option>
                      <option value="Other">Other Miscellaneous</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-500 dark:text-gray-400 mb-1">Requisition Justification *</label>
                  <textarea 
                    value={reqReason}
                    onChange={(e) => setReqReason(e.target.value)}
                    placeholder="Specify operational requirement, customer site field audits, etc..."
                    rows={2.5}
                    className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden"
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl cursor-pointer"
                  >
                    Submit Ticket
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Requisition Ticket Logs */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md mb-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">Asset Requisitions</h3>

            <div className="space-y-4">
              {inventoryRequests
                .filter(r => role === "employee" ? r.employeeId === currentEmployeeId : true)
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
              {inventoryRequests.filter(r => role === "employee" ? r.employeeId === currentEmployeeId : true).length === 0 && (
                <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-6 bg-slate-50/50 dark:bg-[#0a0a0a]/10 rounded-xl">No asset requisition tickets logged.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
