import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, Users, Clock, Calendar, DollarSign, 
  Receipt, Package, ShieldAlert, Sun, Moon, RefreshCw, 
  Menu, X, ChevronRight, User, CircleCheck, Sparkles, AlertCircle, Scale, Settings
} from "lucide-react";

import { 
  Employee, Designation, AttendancePunch, LeaveRequest, 
  Holiday, Policy, ExpenseClaim, InventoryItem, 
  InventoryRequest, Fine, Reimbursement, Payslip, SimulatedEmail, UserRole 
} from "./types";

// Import Modular Views
import DashboardView from "./components/DashboardView";
import DirectoryView from "./components/DirectoryView";
import AttendanceView from "./components/AttendanceView";
import LeavesView from "./components/LeavesView";
import PayrollView from "./components/PayrollView";
import ExpensesView from "./components/ExpensesView";
import InventoryView from "./components/InventoryView";
import PoliciesView from "./components/PoliciesView";
import FinesView from "./components/FinesView";
import ConfigurationView from "./components/ConfigurationView";
import ChatbotWidget from "./components/ChatbotWidget";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("snailhr_theme") === "dark";
  });

  // Current active view
  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active RBAC Persona Simulation
  const [activeRole, setActiveRole] = useState<UserRole>("admin");
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>("EMP-1001");

  // App Database State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [attendance, setAttendance] = useState<AttendancePunch[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [expenses, setExpenses] = useState<ExpenseClaim[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryRequests, setInventoryRequests] = useState<InventoryRequest[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [emails, setEmails] = useState<SimulatedEmail[]>([]);

  // Organization Config States
  const [customLeaveTypes, setCustomLeaveTypes] = useState<string[]>([]);
  const [customDepartments, setCustomDepartments] = useState<string[]>([]);
  const [customBranches, setCustomBranches] = useState<string[]>([]);
  const [supabaseStatus, setSupabaseStatus] = useState<{ connected: boolean; synced: boolean; error?: string }>({
    connected: false,
    synced: false
  });

  // Toggle Theme helper
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("snailhr_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("snailhr_theme", "light");
    }
  }, [darkMode]);

  // Fetch all database records from backend
  const refreshDatabase = async () => {
    try {
      const res = await fetch("/api/data");
      if (!res.ok) throw new Error("Failed to fetch SnailHR database.");
      const data = await res.json();
      
      setEmployees(data.employees);
      setDesignations(data.designations);
      setAttendance(data.attendance);
      setLeaves(data.leaves);
      setHolidays(data.holidays);
      setPolicies(data.policies);
      setExpenses(data.expenses);
      setInventory(data.inventory);
      setInventoryRequests(data.inventoryRequests);
      setFines(data.fines);
      setReimbursements(data.reimbursements);
      setPayslips(data.payslips);
      setEmails(data.simulatedEmails);

      setCustomLeaveTypes(data.customLeaveTypes || []);
      setCustomDepartments(data.customDepartments || []);
      setCustomBranches(data.customBranches || []);

      // Check Supabase Synchronization Status
      try {
        const statusRes = await fetch("/api/supabase-status");
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setSupabaseStatus(statusData);
        }
      } catch (subErr) {
        console.warn("Could not check Supabase sync status:", subErr);
      }
      
      setLoading(false);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError("Could not establish a connection to the SnailHR full-stack service.");
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDatabase();
  }, []);

  // Sync role switch with defaults
  const handleRoleChange = (role: UserRole) => {
    setActiveRole(role);
    if (role === "admin") {
      setCurrentEmployeeId("EMP-1001"); // Amit Sharma
    } else if (role === "hr") {
      setCurrentEmployeeId("EMP-1002"); // Priya Patel
    } else {
      setCurrentEmployeeId("EMP-1003"); // Rahul Verma
    }
  };

  const handleEmployeeIdChange = (id: string) => {
    setCurrentEmployeeId(id);
    const emp = employees.find(e => e.id === id);
    if (emp) {
      setActiveRole(emp.role);
    }
  };

  // Get active employee structure
  const currentEmployee = employees.find(e => e.id === currentEmployeeId) || employees[0];

  // API Mutator Helpers (Syncing with Express routes)

  // 1. Onboard employee
  const handleOnboardEmployee = async (empData: any) => {
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(empData)
      });
      if (res.ok) {
        await refreshDatabase();
        alert("Employee Onboarded successfully! Dispatched welcome credential campaign.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Toggle onboarding tasks
  const handleToggleOnboardingTask = async (empId: string, taskId: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/employees/${empId}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed })
      });
      if (res.ok) {
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Upload simulated document
  const handleAddDocument = async (empId: string, docData: any) => {
    try {
      const res = await fetch(`/api/employees/${empId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(docData)
      });
      if (res.ok) {
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Delete document
  const handleDeleteDocument = async (empId: string, docId: string) => {
    try {
      const res = await fetch(`/api/employees/${empId}/documents/${docId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 5. Attendance punch clock-in/out
  const handlePunchAction = async (employeeId: string, type: "clockin" | "clockout" | "breakstart" | "breakend") => {
    try {
      const res = await fetch("/api/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, type })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Punch action failed");
        return;
      }
      await refreshDatabase();
    } catch (err) {
      console.error(err);
    }
  };

  // 5b. Update attendance punch details (WFH, status, timings)
  const handleUpdatePunch = async (punchId: string, updatedFields: any) => {
    try {
      const res = await fetch(`/api/attendance/${punchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 6. Submit leave request
  const handleApplyLeave = async (leaveData: any) => {
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leaveData)
      });
      if (res.ok) {
        await refreshDatabase();
        alert("Leave request logged into supervisor pending desk.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 7. Approve/Reject leaves
  const handleReviewLeave = async (id: string, status: "Approved" | "Rejected") => {
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 8. Submit expense claim
  const handleSubmitExpense = async (expenseData: any) => {
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseData)
      });
      if (res.ok) {
        await refreshDatabase();
        alert("Expense claim logged. supervisor review pending.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 9. Approve/reject expense
  const handleReviewExpense = async (id: string, status: "Approved" | "Rejected") => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 10. Process reimbursement payment
  const handlePayReimbursement = async (id: string) => {
    try {
      const res = await fetch(`/api/reimbursements/${id}/pay`, {
        method: "PUT"
      });
      if (res.ok) {
        await refreshDatabase();
        alert("Disbursed reimbursement amount successfully to employee bank details.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 11. Create hardware asset
  const handleAddAsset = async (assetData: any) => {
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assetData)
      });
      if (res.ok) {
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 12. Submit asset request
  const handleApplyAssetRequest = async (reqData: any) => {
    try {
      const res = await fetch("/api/inventory/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqData)
      });
      if (res.ok) {
        await refreshDatabase();
        alert("Hardware request ticket logged successfully.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 13. Approve asset request and allocate asset
  const handleReviewAssetRequest = async (id: string, status: "Approved" | "Rejected", assetId?: string) => {
    try {
      const res = await fetch(`/api/inventory/request/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, assetId })
      });
      if (res.ok) {
        await refreshDatabase();
        alert("Asset requisition ticket solved. Serial code allocated to agent.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 14. Log corporate fine
  const handleAddFine = async (fineData: any) => {
    try {
      const res = await fetch("/api/fines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fineData)
      });
      if (res.ok) {
        await refreshDatabase();
        alert("Violation infraction penalty logged.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 15. Pay fine or deduct from payroll
  const handleUpdateFineStatus = async (id: string, status: "Paid" | "Deducted From Payroll") => {
    try {
      const res = await fetch(`/api/fines/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 16. Admin create designation
  const handleAddDesignation = async (title: string, department: string) => {
    try {
      const res = await fetch("/api/designations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, department })
      });
      if (res.ok) {
        await refreshDatabase();
        alert("Registered new designation for recruitment onboarding!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 17. Delete designation
  const handleRemoveDesignation = async (id: string) => {
    try {
      const res = await fetch(`/api/designations/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 18. Generate payslip (and automatically trigger welcome sequence email)
  const handleGeneratePayslip = async (employeeId: string, month: string) => {
    try {
      const res = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, month })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Payslip generation failed");
        return;
      }
      await refreshDatabase();
      alert("Payslip Generated & Dispatched to employee email inbox successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  // 19. Disburse payslips
  const handlePayAllPayslips = async (month: string) => {
    try {
      const res = await fetch("/api/payroll/pay-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month })
      });
      if (res.ok) {
        await refreshDatabase();
        alert("All monthly salary payouts finalized and marked as Paid.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 20. Update custom collections
  const handleUpdateCollection = async (type: "leaveTypes" | "departments" | "branches", updatedList: string[]) => {
    try {
      const res = await fetch("/api/config-collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, updatedList })
      });
      if (res.ok) {
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0a0a0a] text-slate-800 dark:text-gray-100">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-xs font-semibold mt-4 tracking-widest uppercase text-slate-400 dark:text-gray-500">Booting SnailHR Cloud Core...</p>
      </div>
    );
  }

  if (error || employees.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0a0a0a] text-slate-800 dark:text-gray-100 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold font-display">Database Sync Timeout</h2>
        <p className="text-xs text-slate-400 mt-2 max-w-sm">{error || "Could not load employee catalog roster."}</p>
        <button 
          onClick={refreshDatabase}
          className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl flex items-center space-x-1 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reconnect Database</span>
        </button>
      </div>
    );
  }

  // Navigation Links definition
  const navigationLinks = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4.5 h-4.5" /> },
    { id: "directory", label: "Agent Directory", icon: <Users className="w-4.5 h-4.5" /> },
    { id: "attendance", label: "Attendance Punches", icon: <Clock className="w-4.5 h-4.5" /> },
    { id: "leaves", label: "Leaves & Holidays", icon: <Calendar className="w-4.5 h-4.5" /> },
    { id: "payroll", label: "Payroll & Payslips", icon: <DollarSign className="w-4.5 h-4.5" /> },
    { id: "expenses", label: "Expense & Claims", icon: <Receipt className="w-4.5 h-4.5" /> },
    { id: "inventory", label: "Asset Inventory", icon: <Package className="w-4.5 h-4.5" /> },
    { id: "policies", label: "Policies Handbook", icon: <ShieldAlert className="w-4.5 h-4.5" /> },
    { id: "fines", label: "Disciplinary Fines", icon: <Scale className="w-4.5 h-4.5" /> },
    ...((activeRole === "admin" || activeRole === "hr") ? [
      { id: "configurations", label: "System Settings", icon: <Settings className="w-4.5 h-4.5" /> }
    ] : [])
  ];

  return (
    <div id="snailhr-panel" className="min-h-screen flex flex-col font-sans text-slate-700 dark:text-gray-200 antialiased">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-md border-b border-slate-100 dark:border-[#1a1a1a]/80 px-4 py-3 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Mobile hamburger */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] rounded-lg text-slate-500"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-black text-sm tracking-tighter">
              S
            </div>
            <span className="font-display font-extrabold text-lg text-slate-800 dark:text-white tracking-tight">Snail<span className="text-emerald-500">HR</span></span>
          </div>
        </div>

        {/* Global Access Controls (Role Toggler and Simulation bar) */}
        <div className="flex items-center space-x-3 flex-wrap">
          
          {/* Active login / Persona selector */}
          <div className="flex items-center bg-slate-50 dark:bg-[#0f0f0f] px-3 py-1.5 rounded-xl border border-slate-100 dark:border-[#1a1a1a] text-xs gap-2">
            <span className="text-slate-400 font-semibold hidden md:inline">Logged In User:</span>
            <select
              value={currentEmployeeId}
              onChange={(e) => handleEmployeeIdChange(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-gray-200 font-bold focus:outline-hidden"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id} className="dark:bg-[#0f0f0f]">{emp.fullName} ({emp.role.toUpperCase()})</option>
              ))}
            </select>
          </div>

          {/* Quick Theme Switcher */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 bg-slate-50 dark:bg-[#0f0f0f] text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-emerald-400 rounded-xl border border-slate-100 dark:border-[#1a1a1a] transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Structural Layout */}
      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-white dark:bg-[#0f0f0f] border-r border-slate-100 dark:border-[#1a1a1a]/80 p-4 shrink-0 space-y-6">
          
          {/* Current Profile details card */}
          {currentEmployee && (
            <div className="bg-slate-50 dark:bg-[#0a0a0a]/50 p-3 rounded-2xl border border-slate-100/50 dark:border-[#1a1a1a] flex items-center space-x-3">
              <img 
                src={currentEmployee.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop"} 
                alt={currentEmployee.fullName}
                className="w-9 h-9 rounded-full object-cover border border-emerald-500/20"
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-700 dark:text-gray-300 text-xs truncate leading-tight">{currentEmployee.fullName}</p>
                <p className="text-[10px] text-slate-400 dark:text-gray-500 truncate leading-tight mt-1">
                  {designations.find(d => d.id === currentEmployee.designationId)?.title || "Specialist"}
                </p>
              </div>
            </div>
          )}

          {/* Sidebar Menu Links */}
          <nav className="space-y-1.5 text-xs font-semibold">
            {navigationLinks.map(link => {
              const isActive = currentView === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => setCurrentView(link.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                    isActive 
                      ? "bg-emerald-600 text-white font-bold shadow-xs shadow-emerald-600/10 dark:neon-glow dark:bg-emerald-500" 
                      : "text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-[#1a1a1a]/50"
                  }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-slate-50 dark:border-[#1a1a1a]/80 text-[10px] text-slate-400 dark:text-gray-500">
            <p className="font-bold font-display text-slate-800 dark:text-white">SnailHR Platform Suite</p>
            <p className="mt-1">NBFC Licensed Broker Edition v2.4</p>
            <p className="font-mono mt-2">UTC: {new Date().toISOString().split('T')[0]}</p>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 lg:hidden flex">
            <div className="bg-white dark:bg-[#0f0f0f] border-r border-slate-100 dark:border-[#1a1a1a] w-64 p-4 flex flex-col justify-between h-full animate-in slide-in-from-left duration-200">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1a1a1a] pb-3">
                  <span className="font-display font-extrabold text-sm tracking-tight text-slate-800 dark:text-white">SnailHR Menu</span>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1.5 text-xs font-semibold">
                  {navigationLinks.map(link => {
                    const isActive = currentView === link.id;
                    return (
                      <button
                        key={link.id}
                        onClick={() => {
                          setCurrentView(link.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all ${
                          isActive 
                            ? "bg-emerald-600 text-white font-bold" 
                            : "text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-[#1a1a1a]"
                        }`}
                      >
                        {link.icon}
                        <span>{link.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="text-[10px] text-slate-400 dark:text-gray-500 pt-4 border-t border-slate-100 dark:border-[#1a1a1a]">
                <p className="font-bold text-slate-800 dark:text-white">SnailHR Platform Suite</p>
                <p className="font-mono mt-1">v2.4 - Mobile Secured</p>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
          </div>
        )}

        {/* Content Viewer viewport */}
        <main className="flex-1 bg-slate-50 dark:bg-[#0a0a0a] p-4 md:p-6 overflow-y-auto custom-scrollbar">
          
          {/* Active View Router */}
          {currentView === "dashboard" && (
            <DashboardView 
              currentEmployee={currentEmployee}
              employees={employees}
              holidays={holidays}
              leaves={leaves}
              payslips={payslips}
              role={activeRole}
            />
          )}

          {currentView === "directory" && (
            <DirectoryView 
              employees={employees}
              designations={designations}
              role={activeRole}
              currentUserId={currentEmployeeId}
              onOnboardEmployee={handleOnboardEmployee}
              onUpdateEmployee={async (id, updatedData) => {
                await fetch(`/api/employees/${id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(updatedData)
                });
                await refreshDatabase();
              }}
              onAddDocument={handleAddDocument}
              onDeleteDocument={handleDeleteDocument}
              onToggleOnboardingTask={handleToggleOnboardingTask}
            />
          )}

          {currentView === "attendance" && (
            <AttendanceView 
              attendance={attendance}
              employees={employees}
              leaves={leaves}
              holidays={holidays}
              role={activeRole}
              currentEmployeeId={currentEmployeeId}
              onPunchAction={handlePunchAction}
              onUpdatePunch={handleUpdatePunch}
            />
          )}

          {currentView === "leaves" && (
            <LeavesView 
              leaves={leaves}
              holidays={holidays}
              employees={employees}
              role={activeRole}
              currentEmployeeId={currentEmployeeId}
              onApplyLeave={handleApplyLeave}
              onReviewLeave={handleReviewLeave}
            />
          )}

          {currentView === "payroll" && (
            <PayrollView 
              employees={employees}
              designations={designations}
              payslips={payslips}
              emails={emails}
              role={activeRole}
              currentEmployeeId={currentEmployeeId}
              onAddDesignation={handleAddDesignation}
              onRemoveDesignation={handleRemoveDesignation}
              onGeneratePayslip={handleGeneratePayslip}
              onPayAllPayslips={handlePayAllPayslips}
            />
          )}

          {currentView === "expenses" && (
            <ExpensesView 
              expenses={expenses}
              reimbursements={reimbursements}
              employees={employees}
              role={activeRole}
              currentEmployeeId={currentEmployeeId}
              onSubmitExpense={handleSubmitExpense}
              onReviewExpense={handleReviewExpense}
              onPayReimbursement={handlePayReimbursement}
            />
          )}

          {currentView === "inventory" && (
            <InventoryView 
              inventory={inventory}
              inventoryRequests={inventoryRequests}
              employees={employees}
              role={activeRole}
              currentEmployeeId={currentEmployeeId}
              onAddAsset={handleAddAsset}
              onApplyAssetRequest={handleApplyAssetRequest}
              onReviewAssetRequest={handleReviewAssetRequest}
            />
          )}

          {currentView === "policies" && (
            <PoliciesView 
              policies={policies}
              role={activeRole}
            />
          )}

          {currentView === "fines" && (
            <FinesView 
              fines={fines}
              employees={employees}
              role={activeRole}
              currentEmployeeId={currentEmployeeId}
              onAddFine={handleAddFine}
              onUpdateFineStatus={handleUpdateFineStatus}
            />
          )}

          {currentView === "configurations" && (activeRole === "admin" || activeRole === "hr") && (
            <ConfigurationView 
              designations={designations}
              customLeaveTypes={customLeaveTypes}
              customDepartments={customDepartments}
              customBranches={customBranches}
              supabaseStatus={supabaseStatus}
              onAddDesignation={handleAddDesignation}
              onRemoveDesignation={handleRemoveDesignation}
              onUpdateCollection={handleUpdateCollection}
            />
          )}

        </main>
      </div>

      {/* Floating Dynamic AI Chatbot Assistant */}
      <ChatbotWidget currentEmployeeId={currentEmployeeId} role={activeRole} />
    </div>
  );
}
