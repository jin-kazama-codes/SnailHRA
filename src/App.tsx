"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, Clock, Calendar, DollarSign,
  Receipt, Package, ShieldAlert, Sun, Moon, RefreshCw,
  Menu, X, ChevronRight, User, CircleCheck, Sparkles, AlertCircle, Scale, Settings, LogOut
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
import LoginView from "./components/LoginView";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("snailhr_theme") === "dark";
    }
    return false;
  });

  // Current active view (Persisted across refreshes)
  const [currentView, setCurrentView] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("snailhr_currentView") || "dashboard";
    }
    return "dashboard";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active RBAC Persona Simulation (Persisted across refreshes)
  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("snailhr_activeRole") as UserRole) || "admin";
    }
    return "admin";
  });
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("snailhr_currentEmployeeId") || "";
    }
    return "";
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("snailhr_isLoggedIn") === "true";
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (isLoggedIn) {
        localStorage.setItem("snailhr_isLoggedIn", "true");
      } else {
        localStorage.removeItem("snailhr_isLoggedIn");
        localStorage.removeItem("snailhr_currentEmployeeId");
        localStorage.removeItem("snailhr_activeRole");
        localStorage.removeItem("snailhr_currentView");
      }
    }
  }, [isLoggedIn]);

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

  const [timingSettings, setTimingSettings] = useState<{
    clockInTime: string;
    clockOutTime: string;
    lateThreshold: string;
    breakStartTime: string;
    breakEndTime: string;
  }>({
    clockInTime: "09:00",
    clockOutTime: "18:00",
    lateThreshold: "09:30",
    breakStartTime: "13:00",
    breakEndTime: "14:00"
  });

  // Global Toast State
  const [toast, setToast] = useState<{ id: string; message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ id: String(Date.now()), message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Persist view, role, and selected user in localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && isLoggedIn) {
      localStorage.setItem("snailhr_currentView", currentView);
    }
  }, [currentView, isLoggedIn]);

  useEffect(() => {
    if (typeof window !== "undefined" && isLoggedIn) {
      localStorage.setItem("snailhr_activeRole", activeRole);
    }
  }, [activeRole, isLoggedIn]);

  useEffect(() => {
    if (typeof window !== "undefined" && isLoggedIn) {
      localStorage.setItem("snailhr_currentEmployeeId", currentEmployeeId);
    }
  }, [currentEmployeeId, isLoggedIn]);

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

      setEmployees(data.employees || []);
      setDesignations(data.designations || []);
      if (data.timingSettings) {
        setTimingSettings(data.timingSettings);
      }
      setAttendance(prev => {
        const attMap = new Map();
        (data.attendance || []).forEach((a: any) => { if (a.id) attMap.set(a.id, a); });
        (prev || []).forEach((p: any) => {
          if (p.id && attMap.has(p.id)) {
            const fetched = attMap.get(p.id);
            attMap.set(p.id, {
              ...fetched,
              clockOut: fetched.clockOut || p.clockOut
            });
          } else if (p.id) {
            attMap.set(p.id, p);
          }
        });
        return Array.from(attMap.values());
      });
      setLeaves(prev => {
        const leaveMap = new Map();
        (data.leaves || []).forEach((l: any) => { if (l.id) leaveMap.set(l.id, l); });
        (prev || []).forEach((l: any) => { if (l.id) leaveMap.set(l.id, l); });
        return Array.from(leaveMap.values());
      });
      setHolidays(data.holidays || []);
      setExpenses(prev => {
        const expMap = new Map();
        (data.expenses || []).forEach((e: any) => { if (e.id) expMap.set(e.id, e); });
        (prev || []).forEach((e: any) => { if (e.id) expMap.set(e.id, e); });
        return Array.from(expMap.values());
      });
      setInventory(prev => {
        const invMap = new Map();
        (data.inventory || []).forEach((i: any) => { if (i.id) invMap.set(i.id, i); });
        (prev || []).forEach((i: any) => {
          if (i.id) {
            const fetched = invMap.get(i.id);
            invMap.set(i.id, {
              ...fetched,
              ...i,
              branch: i.branch || fetched?.branch
            });
          }
        });
        return Array.from(invMap.values());
      });
      setInventoryRequests(prev => {
        if (!data.inventoryRequests) return prev || [];
        const prevMap = new Map((prev || []).map((r: any) => [r.id, r]));
        const updated = (data.inventoryRequests || []).map((serverReq: any) => {
          const localReq = prevMap.get(serverReq.id);
          if (localReq && localReq.status !== "Pending" && serverReq.status === "Pending") {
            return { ...serverReq, status: localReq.status };
          }
          return serverReq;
        });
        const serverIds = new Set((data.inventoryRequests || []).map((r: any) => r.id));
        (prev || []).forEach((r: any) => {
          if (r.id && !serverIds.has(r.id)) {
            updated.push(r);
          }
        });
        return updated;
      });
      setFines(data.fines);
      setReimbursements(prev => {
        const reimMap = new Map();
        (prev || []).forEach((r: any) => { if (r.id) reimMap.set(r.id, r); });
        (data.reimbursements || []).forEach((r: any) => { if (r.id) reimMap.set(r.id, r); });
        return Array.from(reimMap.values());
      });
      setPayslips(data.payslips);
      setEmails(data.simulatedEmails);

      setCustomLeaveTypes(prev => Array.from(new Set([...(prev || []), ...(data.customLeaveTypes || [])])));
      setCustomDepartments(prev => Array.from(new Set([...(prev || []), ...(data.customDepartments || [])])));
      setCustomBranches(prev => Array.from(new Set([...(prev || []), ...(data.customBranches || [])])));

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
    if (role === "employee" && currentView === "directory") {
      setCurrentView("dashboard");
    }
    const matchingEmp = employees.find(e => e.role === role);
    if (matchingEmp) {
      setCurrentEmployeeId(matchingEmp.id);
    } else if (employees.length > 0) {
      setCurrentEmployeeId(employees[0].id);
    }
  };

  const handleEmployeeIdChange = (id: string) => {
    setCurrentEmployeeId(id);
    const emp = employees.find(e => e.id === id);
    if (emp) {
      setActiveRole(emp.role);
    }
  };

  const handleLoginSuccess = (employee: Employee) => {
    setIsLoggedIn(true);
    setCurrentEmployeeId(employee.id);
    setActiveRole(employee.role);
    setCurrentView("dashboard");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentEmployeeId("");
    setActiveRole("employee");
    setCurrentView("dashboard");
    if (typeof window !== "undefined") {
      localStorage.removeItem("snailhr_isLoggedIn");
      localStorage.removeItem("snailhr_currentEmployeeId");
      localStorage.removeItem("snailhr_activeRole");
      localStorage.removeItem("snailhr_currentView");
    }
    showToast("Signed out successfully.", "info");
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
        showToast("Employee onboarded successfully! Credential campaign sent.", "success");
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

  // 4b. Add Holiday (Admin / HR)
  const handleAddHoliday = async (newHoliday: { name: string; date: string; type: "National" | "Regional" | "Restricted" }) => {
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newHoliday)
      });
      const data = await res.json();
      if (res.ok && data.holiday) {
        setHolidays(prev => [...prev, data.holiday].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        await refreshDatabase();
        showToast("Holiday added successfully!", "success");
        return true;
      } else {
        showToast(data.error || "Failed to add holiday", "error");
        return false;
      }
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // 4c. Delete Holiday (Admin / HR)
  const handleDeleteHoliday = async (id: string) => {
    try {
      setHolidays(prev => prev.filter(h => h.id !== id));
      const res = await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 4d. Add Policy (Admin / HR)
  const handleAddPolicy = async (newPolicy: { title: string; category: Policy["category"]; content: string }) => {
    try {
      const policyObj: Policy = {
        id: `pol-${Date.now()}`,
        title: newPolicy.title,
        category: newPolicy.category,
        content: newPolicy.content,
        lastUpdated: new Date().toISOString().split("T")[0]
      };
      const res = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policyObj)
      });
      const data = await res.json();
      if (res.ok && data.policy) {
        setPolicies(prev => [data.policy, ...prev.filter(p => p.id !== data.policy.id)]);
        await refreshDatabase();
        showToast("Policy added successfully!", "success");
        return true;
      } else {
        showToast(data.error || "Failed to add policy", "error");
        return false;
      }
    } catch (err) {
      console.error(err);
      showToast("Error creating policy", "error");
      return false;
    }
  };

  // 4e. Delete Policy (Admin / HR)
  const handleDeletePolicy = async (id: string) => {
    if (!confirm("Are you sure you want to delete this policy?")) return;
    try {
      setPolicies(prev => prev.filter(p => p.id !== id));
      const res = await fetch(`/api/policies?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await refreshDatabase();
        showToast("Policy deleted successfully", "info");
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
      
      let data: any = {};
      try {
        data = await res.json();
      } catch (parseErr) {
        console.error("Failed to parse punch response JSON:", parseErr);
      }

      if (!res.ok) {
        showToast(data?.error || `Punch action failed (HTTP ${res.status})`, "error");
        return;
      }
      if (data && data.id) {
        setAttendance(prev => {
          const next = prev.filter(a => a.id !== data.id && !(a.employeeId === data.employeeId && a.date === data.date));
          return [data, ...next];
        });
      }
      await refreshDatabase();
      showToast("Attendance punch recorded successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Could not connect to attendance service", "error");
    }
  };

  // 5b. Update attendance punch details (WFH, status, timings)
  const handleUpdatePunch = async (punchId: string, updatedFields: any) => {
    try {
      setAttendance(prev => prev.map(a => a.id === punchId ? { ...a, ...updatedFields } : a));
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

  // 5c. Delete attendance punch
  const handleDeletePunch = async (punchId: string) => {
    try {
      setAttendance(prev => prev.filter(a => a.id !== punchId));
      const res = await fetch(`/api/attendance/${punchId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 5d. Save / Upsert full day attendance punch
  const handleSaveDayPunch = async (punchData: any) => {
    try {
      const res = await fetch("/api/attendance/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(punchData)
      });
      const data = await res.json();
      if (res.ok) {
        setAttendance(prev => {
          const next = prev.filter(a => a.id !== data.id && !(a.employeeId === data.employeeId && a.date === data.date));
          return [data, ...next];
        });
        await refreshDatabase();
        showToast("Attendance punch logged successfully!", "success");
      } else {
        showToast(data.error || "Failed to save attendance log.", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 5e. Clear all attendance punches
  const handleClearAllAttendance = async () => {
    if (!confirm("Are you sure you want to clear all attendance records for everyone? This action cannot be undone.")) return;
    try {
      setAttendance([]);
      const res = await fetch("/api/attendance", {
        method: "DELETE"
      });
      if (res.ok) {
        await refreshDatabase();
        showToast("All attendance punch records cleared.", "info");
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
        const resData = await res.json();
        if (resData.leave) {
          setLeaves(prev => [resData.leave, ...prev.filter(l => l.id !== resData.leave.id)]);
        }
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 7. Approve/Reject leaves
  const handleReviewLeave = async (id: string, status: "Approved" | "Rejected") => {
    try {
      setLeaves(prev => prev.map(l => l.id === id ? { ...l, status } : l));
      const res = await fetch("/api/leaves", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
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
      const empId = expenseData.employeeId || currentEmployeeId || (employees.find(e => e.role === activeRole)?.id || employees[0]?.id || "EMP-1003");
      const emp = employees.find(e => e.id === empId);
      const empName = expenseData.employeeName || emp?.fullName || `Employee ${empId}`;

      const tempId = `exp-${Date.now()}`;
      const newClaim: ExpenseClaim = {
        id: tempId,
        employeeId: empId,
        employeeName: empName,
        category: expenseData.category || "Others",
        amount: Number(expenseData.amount) || 0,
        date: expenseData.date || new Date().toISOString().split("T")[0],
        description: expenseData.description || "",
        status: "Pending"
      };

      // 1. INSTANT OPTIMISTIC UPDATE: Visible immediately without page reload!
      setExpenses(prev => [newClaim, ...(prev || []).filter(e => e.id !== tempId)]);

      // 2. Dispatch to API & Supabase in background
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClaim)
      });

      if (res.ok) {
        const resData = await res.json();
        if (resData.claim) {
          setExpenses(prev => [resData.claim, ...(prev || []).filter(e => e.id !== resData.claim.id && e.id !== tempId)]);
        }
        await refreshDatabase();
        showToast("Expense claim logged. Supervisor review pending.", "success");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 9. Approve/reject expense
  const handleReviewExpense = async (id: string, status: "Approved" | "Rejected") => {
    try {
      // 1. INSTANT OPTIMISTIC STATE UPDATE: Update status immediately in React state (0ms latency, zero reload needed!)
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, status } : e));

      if (status === "Approved") {
        setReimbursements(prev => {
          const targetExp = expenses.find(e => e.id === id);
          if (!targetExp) return prev;
          const existing = (prev || []).find(r => r.claimId === id);
          if (existing) return prev;
          const newReim: Reimbursement = {
            id: `reim-${Date.now()}`,
            employeeId: targetExp.employeeId,
            employeeName: targetExp.employeeName,
            category: targetExp.category,
            amount: targetExp.amount,
            claimId: targetExp.id,
            status: "Pending",
            processedDate: null
          };
          return [newReim, ...(prev || [])];
        });
      }

      // 2. Dispatch to backend API & Supabase
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        const resData = await res.json();
        if (resData.expense) {
          setExpenses(prev => prev.map(e => e.id === id ? resData.expense : e));
        }
        await refreshDatabase();
        showToast(`Expense claim ${status.toLowerCase()} successfully.`, status === "Approved" ? "success" : "info");
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
        showToast("Reimbursement disbursed to employee bank account.", "success");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 11. Create hardware asset
  const handleAddAsset = async (assetData: any) => {
    try {
      const newAsset: InventoryItem = {
        id: assetData.id || `inv-${Date.now()}`,
        name: assetData.name,
        serialNumber: assetData.serialNumber,
        category: assetData.category,
        status: assetData.status || "Available",
        assignedToEmployeeId: assetData.assignedToEmployeeId || null,
        assignedDate: assetData.assignedDate || null,
        branch: assetData.branch
      };

      // Optimistically add to state instantly so it appears on screen without refresh!
      setInventory(prev => [newAsset, ...prev.filter(i => i.id !== newAsset.id)]);

      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAsset)
      });
      if (res.ok) {
        const resData = await res.json();
        const createdItem = resData.item || newAsset;
        setInventory(prev => [createdItem, ...prev.filter(i => i.id !== createdItem.id)]);
        await refreshDatabase();
        showToast("New hardware asset registered and saved to database.", "success");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 12. Submit asset request
  const handleApplyAssetRequest = async (reqData: any) => {
    try {
      const empId = reqData.employeeId || currentEmployeeId || (employees.find(e => e.role === activeRole)?.id || employees[0]?.id || "EMP-1003");
      const emp = employees.find(e => e.id === empId);
      const empName = reqData.employeeName || emp?.fullName || `Employee ${empId}`;

      const tempId = `invreq-${Date.now()}`;
      const newReq: InventoryRequest = {
        id: reqData.id || tempId,
        employeeId: empId,
        employeeName: empName,
        itemName: reqData.itemName,
        category: reqData.category || "Laptop",
        requestDate: reqData.requestDate || new Date().toISOString().split("T")[0],
        reason: reqData.reason || "",
        status: "Pending"
      };

      // 1. INSTANT OPTIMISTIC UPDATE: Appears in UI immediately!
      setInventoryRequests(prev => [newReq, ...(prev || []).filter(r => r.id !== newReq.id)]);

      // 2. Dispatch to API & Supabase inventory_requests table
      const res = await fetch("/api/inventory-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReq)
      });

      if (res.ok) {
        const resData = await res.json();
        if (resData.request) {
          setInventoryRequests(prev => [resData.request, ...(prev || []).filter(r => r.id !== resData.request.id && r.id !== tempId)]);
        }
        await refreshDatabase();
        showToast("Hardware request ticket logged and saved to database.", "success");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 13. Approve asset request and allocate asset
  const handleReviewAssetRequest = async (id: string, status: "Approved" | "Rejected", assetId?: string) => {
    try {
      // 1. INSTANT OPTIMISTIC UPDATE (0ms delay): Update ticket status immediately in React state!
      setInventoryRequests(prev => (prev || []).map(r => r.id === id ? { ...r, status } : r));

      if (status === "Approved" && assetId) {
        const targetReq = (inventoryRequests || []).find(r => r.id === id);
        const empId = targetReq?.employeeId || currentEmployeeId;
        const today = new Date().toISOString().split("T")[0];
        setInventory(prev => (prev || []).map(item => item.id === assetId ? { ...item, status: "Assigned", assignedToEmployeeId: empId, assignedDate: today } : item));
      }

      // 2. SHOW TOAST IMMEDIATELY: Feedback shown right away without requiring refresh!
      showToast(`Asset requisition ticket ${status.toLowerCase()}.${assetId ? " Hardware asset allocated successfully." : ""}`, status === "Approved" ? "success" : "info");

      // 3. Dispatch to API & Supabase database in background
      const res = await fetch("/api/inventory-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, assetId })
      });

      if (res.ok) {
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 14. Log corporate fine
  const handleAddFine = async (fineData: any) => {
    try {
      const empId = fineData.employeeId || currentEmployeeId;
      const emp = employees.find(e => e.id === empId);
      const empName = fineData.employeeName || emp?.fullName || `Employee ${empId}`;

      const tempId = fineData.id || `fin-${Date.now()}`;
      const newFine: Fine = {
        id: tempId,
        employeeId: empId,
        employeeName: empName,
        reason: fineData.reason || "Late Coming",
        amount: Number(fineData.amount) || 0,
        date: fineData.date || new Date().toISOString().split("T")[0],
        status: fineData.status || "Pending"
      };

      // 1. Instant optimistic state update (0ms delay)
      setFines(prev => [newFine, ...(prev || []).filter(f => f.id !== tempId)]);

      // 2. Dispatch to API & Supabase fines table
      const res = await fetch("/api/fines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFine)
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.fine) {
          setFines(prev => [resData.fine, ...(prev || []).filter(f => f.id !== resData.fine.id && f.id !== tempId)]);
        }
        await refreshDatabase();
        showToast("Violation infraction penalty logged and saved to database.", "success");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 15. Pay fine or deduct from payroll
  const handleUpdateFineStatus = async (id: string, status: "Paid" | "Deducted From Payroll") => {
    try {
      // 1. Instant optimistic state update
      setFines(prev => (prev || []).map(f => f.id === id ? { ...f, status } : f));

      // 2. Dispatch to API & Supabase fines table
      const res = await fetch(`/api/fines/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        await refreshDatabase();
        showToast(`Fine status updated to ${status}.`, "success");
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
        showToast("Registered new designation for recruitment onboarding!", "success");
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
        showToast(data.error || "Payslip generation failed", "error");
        return;
      }
      await refreshDatabase();
      showToast("Payslip Generated & Dispatched to employee email inbox successfully!", "success");
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
        showToast("All monthly salary payouts finalized and marked as Paid.", "success");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 20. Update custom collections (Departments, Branches, Leave Policies)
  const handleUpdateCollection = async (
    type: "leaveTypes" | "departments" | "branches", 
    updatedList: string[],
    action?: "add" | "remove",
    item?: string
  ) => {
    // 1. INSTANT OPTIMISTIC UI UPDATE: Immediate display updates in state
    if (type === "leaveTypes") setCustomLeaveTypes(updatedList);
    if (type === "departments") setCustomDepartments(updatedList);
    if (type === "branches") setCustomBranches(updatedList);

    try {
      const res = await fetch("/api/config-collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type, 
          updatedList,
          addedItem: action === "add" ? item : undefined,
          removedItem: action === "remove" ? item : undefined
        })
      });

      if (res.ok) {
        const typeLabel = type === "leaveTypes" ? "Leave Policy" : type === "departments" ? "Department" : "Branch";
        if (action === "add") {
          showToast(`Added "${item}" to ${typeLabel}s successfully!`, "success");
        } else if (action === "remove") {
          showToast(`Removed "${item}" from ${typeLabel}s.`, "info");
        } else {
          showToast(`Updated ${typeLabel}s successfully.`, "success");
        }
        await refreshDatabase();
      } else {
        showToast("Failed to update database configuration.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error updating system configuration.", "error");
    }
  };

  const handleSaveTimingSettings = async (settings: any) => {
    try {
      const changedBy = currentEmployee ? `${currentEmployee.fullName} (${currentEmployee.id})` : "Admin";
      const res = await fetch("/api/attendance/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, changedBy })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.timingSettings) {
          setTimingSettings(data.timingSettings);
        }
        showToast("Timing settings updated successfully!", "success");
        await refreshDatabase();
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(`Failed to update timing settings: ${errData.error || "Unknown server error"}`, "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error updating timing settings.", "error");
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

  if (!isLoggedIn) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Navigation Links definition
  const navigationLinks = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4.5 h-4.5" /> },
    ...((activeRole === "admin" || activeRole === "hr") ? [
      { id: "directory", label: "Agent Directory", icon: <Users className="w-4.5 h-4.5" /> }
    ] : []),
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

          {/* Active Logged In User Badge */}
          <div className="flex items-center bg-slate-50 dark:bg-[#0f0f0f] px-3.5 py-2 rounded-xl border border-slate-100 dark:border-[#1a1a1a] text-xs gap-2 shadow-xs">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-slate-400 font-semibold hidden md:inline">Logged In:</span>
            <span className="text-slate-800 dark:text-gray-200 font-bold">
              {currentEmployee?.fullName} ({currentEmployee?.role.toUpperCase()})
            </span>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            className="hidden lg:flex items-center space-x-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-bold text-xs rounded-xl border border-rose-100/50 dark:border-rose-900/20 transition-all cursor-pointer shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>

          {/* Quick Theme Switcher */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="hidden lg:flex items-center justify-center p-2 bg-slate-50 dark:bg-[#0f0f0f] text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-emerald-400 rounded-xl border border-slate-100 dark:border-[#1a1a1a] transition-colors cursor-pointer"
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
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${isActive
                      ? "bg-emerald-600 text-white font-bold shadow-xs shadow-emerald-600/10 dark:neon-glow dark:bg-emerald-500"
                      : "text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-[#1a1a1a]/50"
                    }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </button>
              );
            })}

            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 transition-all cursor-pointer font-bold mt-4"
            >
              <LogOut className="w-4.5 h-4.5" />
              <span>Sign Out</span>
            </button>
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
                        className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all ${isActive
                            ? "bg-emerald-600 text-white font-bold"
                            : "text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-[#1a1a1a]"
                          }`}
                      >
                        {link.icon}
                        <span>{link.label}</span>
                      </button>
                    );
                  })}

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all font-bold mt-4 cursor-pointer"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                    <span>Sign Out</span>
                  </button>

                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 dark:text-gray-400 dark:hover:text-emerald-400 transition-all font-bold mt-2 cursor-pointer"
                  >
                    {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
                    <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
                  </button>
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
              attendance={attendance}
              expenses={expenses}
              inventory={inventory}
              fines={fines}
              role={activeRole}
            />
          )}

          {currentView === "directory" && (
            <DirectoryView
              employees={employees}
              designations={designations}
              role={activeRole}
              currentUserId={currentEmployeeId}
              customDepartments={customDepartments}
              customBranches={customBranches}
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
              timingSettings={timingSettings}
              onPunchAction={handlePunchAction}
              onUpdatePunch={handleUpdatePunch}
              onDeletePunch={handleDeletePunch}
              onSaveDayPunch={handleSaveDayPunch}
              onClearAllAttendance={handleClearAllAttendance}
              onSaveTimingSettings={handleSaveTimingSettings}
            />
          )}

          {currentView === "leaves" && (
            <LeavesView
              leaves={leaves}
              holidays={holidays}
              employees={employees}
              role={activeRole}
              currentEmployeeId={currentEmployeeId}
              customLeaveTypes={customLeaveTypes}
              onApplyLeave={handleApplyLeave}
              onReviewLeave={handleReviewLeave}
              onAddHoliday={handleAddHoliday}
              onDeleteHoliday={handleDeleteHoliday}
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
              customBranches={customBranches}
              onAddAsset={handleAddAsset}
              onApplyAssetRequest={handleApplyAssetRequest}
              onReviewAssetRequest={handleReviewAssetRequest}
            />
          )}

          {currentView === "policies" && (
            <PoliciesView
              policies={policies}
              role={activeRole}
              onAddPolicy={handleAddPolicy}
              onDeletePolicy={handleDeletePolicy}
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

      {/* Floating Global Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center space-x-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md transition-all ${
            toast.type === "success" 
              ? "bg-emerald-900/95 text-emerald-100 border-emerald-500/40 shadow-emerald-900/30" 
              : toast.type === "error"
              ? "bg-rose-900/95 text-rose-100 border-rose-500/40 shadow-rose-900/30"
              : "bg-slate-900/95 text-slate-100 border-slate-700/40 shadow-slate-900/30"
          }`}>
            {toast.type === "success" && <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === "error" && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === "info" && <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />}
            <span className="font-semibold text-xs">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
