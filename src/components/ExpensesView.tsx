"use client";

import React, { useState } from "react";
import { 
  DollarSign, FileText, Plus, Check, X, ShieldAlert, 
  HelpCircle, Sparkles, Receipt, RefreshCw, AlertCircle
} from "lucide-react";
import { ExpenseClaim, Reimbursement, Employee, UserRole } from "../types";

interface ExpensesViewProps {
  expenses: ExpenseClaim[];
  reimbursements: Reimbursement[];
  employees: Employee[];
  role: UserRole;
  currentEmployeeId: string;
  onSubmitExpense: (expenseData: any) => void;
  onReviewExpense: (id: string, status: "Approved" | "Rejected") => void;
  onPayReimbursement: (id: string) => void;
}

export default function ExpensesView({
  expenses,
  reimbursements,
  employees,
  role,
  currentEmployeeId,
  onSubmitExpense,
  onReviewExpense,
  onPayReimbursement
}: ExpensesViewProps) {

  const [showClaimForm, setShowClaimForm] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Claim fields
  const [category, setCategory] = useState<any>("Travel & Fuel");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [description, setDescription] = useState("");

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !date) return;
    const targetEmpId = currentEmployeeId || (employees.find(emp => emp.role === role)?.id || employees[0]?.id || "");
    onSubmitExpense({
      employeeId: targetEmpId,
      category,
      amount,
      date,
      description
    });
    setDescription("");
    setAmount("");
    setShowClaimForm(false);
  };

  const handleReviewAction = async (id: string, status: "Approved" | "Rejected") => {
    if (processingId) return;
    setProcessingId(id);
    try {
      await onReviewExpense(id, status);
    } finally {
      setProcessingId(null);
    }
  };

  const getEmployeeName = (empId: string) => {
    return employees.find(e => e.id === empId)?.fullName || "Unknown Agent";
  };

  const getEmployeeBank = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    return emp ? `${emp.bankDetails.bankName} (A/C ****${emp.bankDetails.accountNumber.slice(-4)})` : "Registered Bank";
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl p-3.5 sm:p-4 shadow-xs dark:neon-glow">
        <div>
          <h2 className="font-display font-bold text-slate-800 dark:text-white text-sm">Expense Claims Tracker</h2>
          <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">Submit and review business expense claims</p>
        </div>

        {role === "employee" && (
          <button
            onClick={() => setShowClaimForm(!showClaimForm)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center space-x-1 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{showClaimForm ? "Hide Form" : "Claim Business Expense"}</span>
          </button>
        )}
      </div>

      {/* Claims Logs & Review panel */}
      {(
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Action Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Submit Claim Form */}
            {showClaimForm && role === "employee" && (
              <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow animate-in fade-in duration-200">
                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md mb-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">Claim New Business Expense</h3>

                <form onSubmit={handleClaimSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-500 dark:text-gray-400 mb-1">Expense Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-medium"
                      >
                        <option value="Travel & Fuel">Travel & Fuel (Client Site Audits)</option>
                        <option value="Client Entertainment">Client Entertainment & Dinners</option>
                        <option value="Broadband & Phone">Broadband & Office Phone</option>
                        <option value="Office Supplies">Office Stationery & Supplies</option>
                        <option value="Training & Courses">Professional Training & Certs</option>
                        <option value="Others">Others / Miscellaneous</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-500 dark:text-gray-400 mb-1">Amount (INR) *</label>
                      <input 
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="e.g. 1500"
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-medium font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-500 dark:text-gray-400 mb-1">Receipt Date</label>
                      <input 
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 px-3 py-2 rounded-xl border border-slate-100 dark:border-[#1a1a1a] font-medium font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-500 dark:text-gray-400 mb-1">Description / Client Details</label>
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Specify purpose, client or loan prospect names, locations visited..."
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
                      File Expense Claim
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Supervisor claims approval board (For HR/Admin) */}
            {role !== "employee" && (
              <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
                <div className="mb-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">
                  <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">Supervisor Expense Audit</h3>
                  <p className="text-xs text-slate-400 dark:text-gray-500">Approve or reject pending field and customer entertainment bills</p>
                </div>

                <div className="space-y-3.5">
                  {expenses.filter(e => e.status === "Pending").map(claim => (
                    <div key={claim.id} className="p-4 bg-slate-50/50 dark:bg-[#0a0a0a]/50 border border-slate-100 dark:border-[#1a1a1a] rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-700 dark:text-gray-300">{claim.employeeName}</span>
                          <span className="text-[10px] bg-slate-100 dark:bg-[#1a1a1a] text-slate-400 dark:text-gray-500 px-2 py-0.5 rounded font-mono">{claim.employeeId}</span>
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 font-bold px-2 py-0.5 rounded">{claim.category}</span>
                        </div>
                        <p className="text-slate-600 dark:text-gray-300 italic">" {claim.description} "</p>
                        <p className="font-mono text-[10px] text-slate-400 dark:text-gray-500">Claim Amount: <b className="text-emerald-600">₹{claim.amount.toLocaleString()}</b> • Receipt Date: {claim.date}</p>
                      </div>

                      <div className="flex space-x-2 shrink-0 self-end md:self-auto">
                        <button
                          onClick={() => handleReviewAction(claim.id, "Rejected")}
                          disabled={processingId === claim.id}
                          className="bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 hover:bg-rose-100 px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                        >
                          {processingId === claim.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleReviewAction(claim.id, "Approved")}
                          disabled={processingId === claim.id}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                        >
                          {processingId === claim.id ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                              <span>Approving...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve & Reimburse</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                  {expenses.filter(e => e.status === "Pending").length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-4 bg-slate-50/50 dark:bg-[#0a0a0a]/10 rounded-xl">No pending expenses to review.</p>
                  )}
                </div>
              </div>
            )}

            {/* Claims History Log */}
            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
              <div className="mb-4">
                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">Corporate Claims Ledger</h3>
                <p className="text-xs text-slate-400 dark:text-gray-500">Historical records of business filing claims</p>
              </div>

              <div className="space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                {(() => {
                  const activeEmpId = currentEmployeeId || (employees.find(emp => emp.role === role)?.id || employees[0]?.id || "");
                  const visibleExpenses = expenses.filter(e => role === "employee" ? (e.employeeId === activeEmpId || (currentEmployeeId && e.employeeId === currentEmployeeId)) : true);
                  
                  if (visibleExpenses.length === 0) {
                    return <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-4">No expense claims logged yet.</p>;
                  }

                  return visibleExpenses.map(claim => (
                    <div key={claim.id} className="p-3 bg-slate-50/50 dark:bg-[#0a0a0a]/40 border border-slate-100/50 dark:border-[#1a1a1a]/50 rounded-xl flex items-center justify-between text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-700 dark:text-gray-300">{claim.employeeName}</span>
                          <span className="text-[10px] text-slate-400">• {claim.category}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-gray-400 italic">"{claim.description}"</p>
                        <p className="font-mono text-[10px] text-slate-400 dark:text-gray-500">Amount: <b className="text-slate-700 dark:text-gray-300">₹{claim.amount.toLocaleString()}</b> • Filed: {claim.date}</p>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${
                        claim.status === "Approved" 
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : claim.status === "Pending"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 animate-pulse"
                          : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                      }`}>
                        {claim.status}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>

          </div>

          {/* Right column sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow space-y-4">
              <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md border-b border-slate-50 dark:border-[#1a1a1a] pb-3">Corporate Allowances FAQ</h3>
              
              <div className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <p className="font-bold text-slate-700 dark:text-gray-300">Client Meetings & Audits</p>
                  <p className="text-slate-400 leading-normal text-[11px]">Relationship managers can file flat food & entertainment allowances up to ₹2,500 per customer dinner.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-700 dark:text-gray-300">Fuel & Toll Tariffs</p>
                  <p className="text-slate-400 leading-normal text-[11px]">Field loan officers qualify for flat distance fuel reimbursement logs evaluated at ₹8.5/km. Submit logs detailing warehouse destinations.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-700 dark:text-gray-300">Broadband Subsidy</p>
                  <p className="text-slate-400 leading-normal text-[11px]">A flat broadband subsidy up to ₹1,000/month is cleared automatically upon submitting the ISP bill.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
