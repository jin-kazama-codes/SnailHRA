"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Users, Clock, Calendar, IndianRupee,
  ReceiptText, Package, ShieldAlert, Sun, Moon, RefreshCw,
  Menu, X, ChevronRight, User, CircleCheck, Sparkles, AlertCircle, Scale, Settings, LogOut, Video, LayoutGrid, Lock,
  MessageSquareWarning, TrendingUp
} from "lucide-react";

import {
  Employee, Designation, AttendancePunch, LeaveRequest,
  Holiday, Policy, ExpenseClaim, ExpenseCategory, InventoryItem,
  InventoryRequest, Fine, Reimbursement, Payslip, SimulatedEmail, UserRole, Meeting, CorporateAllowanceFaq,
  SeatLayout, Room, RoomBooking, InfractionType, ChecklistItemTemplate,
  GrievanceTicket, PerformanceRecord
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
import SuperAdminLoginView from "./components/SuperAdminLoginView";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import MeetingsView from "./components/MeetingsView";
import WorkspaceView from "./components/WorkspaceView";
import PasswordUpdateView from "./components/PasswordUpdateView";
import EditEmployeeModal from "./components/EditEmployeeModal";
import GrievanceView from "./components/GrievanceView";
import PerformanceView from "./components/PerformanceView";

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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showMyProfileModal, setShowMyProfileModal] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Active RBAC Persona Simulation (Persisted across refreshes)
  const [activeRole, setActiveRole] = useState<"admin" | "hr" | "employee">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("snailhr_activeRole") as "admin" | "hr" | "employee") || "admin";
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

  const [isSuperAdminMode, setIsSuperAdminMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.location.pathname === "/superadmin" || localStorage.getItem("snailhr_superadmin_mode") === "true";
    }
    return false;
  });

  const [isSuperAdminLoggedIn, setIsSuperAdminLoggedIn] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("snailhr_sa_isLoggedIn") === "true";
    }
    return false;
  });

  const [companyId, setCompanyId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("snailhr_companyId") || "";
    }
    return "";
  });

  const [companyName, setCompanyName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("snailhr_companyName") || "";
    }
    return "";
  });

  const [companyLogoUrl, setCompanyLogoUrl] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("snailhr_companyLogoUrl") || "";
    }
    return "";
  });

  // Employee Code Prefix — configured by admin in System Settings, stored in localStorage
  const [empCodePrefix, setEmpCodePrefix] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("snailhr_empCodePrefix") || "EMP";
    }
    return "EMP";
  });

  // Listen for storage events so prefix updates from ConfigurationView propagate
  React.useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "snailhr_empCodePrefix" && e.newValue) {
        setEmpCodePrefix(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const [subscriptionModel, setSubscriptionModel] = useState<1 | 2 | 3 | 4>(() => {
    if (typeof window !== "undefined") {
      return (Number(localStorage.getItem("snailhr_subscriptionModel")) as 1 | 2 | 3 | 4) || 1; // Default Basic
    }
    return 1;
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
        localStorage.removeItem("snailhr_companyId");
        localStorage.removeItem("snailhr_companyName");
        localStorage.removeItem("snailhr_companyLogoUrl");
        localStorage.removeItem("snailhr_subscriptionModel");
      }
    }
  }, [isLoggedIn]);

  // Dynamically update document title based on logged in user's company
  useEffect(() => {
    if (typeof document !== "undefined") {
      if (isLoggedIn && companyName && companyName.trim()) {
        document.title = `${companyName} - SnailHRA`;
      } else {
        document.title = "SnailHRA - Dynamic Workforce & HR Tech Platform";
      }
    }
  }, [companyName, isLoggedIn]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (isSuperAdminLoggedIn) {
        localStorage.setItem("snailhr_sa_isLoggedIn", "true");
      } else {
        localStorage.removeItem("snailhr_sa_isLoggedIn");
      }
    }
  }, [isSuperAdminLoggedIn]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("snailhr_superadmin_mode", String(isSuperAdminMode));
      // update path in browser dynamically without router if possible
      if (isSuperAdminMode) {
        window.history.pushState(null, "", "/superadmin");
      } else {
        window.history.pushState(null, "", "/");
      }
    }
  }, [isSuperAdminMode]);

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
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [seatLayouts, setSeatLayouts] = useState<SeatLayout[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomBookings, setRoomBookings] = useState<RoomBooking[]>([]);
  const [grievanceTickets, setGrievanceTickets] = useState<GrievanceTicket[]>([]);
  const [performanceRecords, setPerformanceRecords] = useState<PerformanceRecord[]>([]);

  // Organization Config States
  const [customLeaveTypes, setCustomLeaveTypes] = useState<string[]>([]);
  const [customDepartments, setCustomDepartments] = useState<string[]>([]);
  const [customBranches, setCustomBranches] = useState<string[]>([]);
  const [customAmenities, setCustomAmenities] = useState<string[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [infractionTypes, setInfractionTypes] = useState<InfractionType[]>([]);
  const [corporateAllowancesFaqs, setCorporateAllowancesFaqs] = useState<CorporateAllowanceFaq[]>([]);
  const [onboardingChecklistTemplates, setOnboardingChecklistTemplates] = useState<ChecklistItemTemplate[]>([]);
  const [exitChecklistTemplates, setExitChecklistTemplates] = useState<ChecklistItemTemplate[]>([]);
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

  const [wifiRestrictionSettings, setWifiRestrictionSettings] = useState<{
    enabled: boolean;
    allowedIp?: string;
    allowedIps: string[];
    companyId?: string;
  }>({
    enabled: false,
    allowedIp: "",
    allowedIps: []
  });

  const [showLeaveCount, setShowLeaveCount] = useState<boolean>(true);

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

  // Re-fetch showLeaveCount from server each time user navigates to leaves
  // This ensures employees always reflect admin's latest setting
  useEffect(() => {
    if (currentView === "leaves" && isLoggedIn) {
      fetch(`/api/config/leave-count-visibility?companyId=${companyId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && typeof data.showLeaveCount === "boolean") {
            setShowLeaveCount(data.showLeaveCount);
          }
        })
        .catch(() => {}); // silent fail — state stays as is
    }
  }, [currentView, isLoggedIn, companyId]);

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
      const activeCompanyId = localStorage.getItem("snailhr_companyId") || "";
      const res = await fetch(`/api/data?companyId=${activeCompanyId}`, {
        cache: "no-store",
        headers: {
          "Pragma": "no-cache",
          "Cache-Control": "no-cache"
        }
      });
      if (!res.ok) throw new Error("Failed to fetch SnailHR tenant database.");
      const data = await res.json();

      const fetchedEmployees = (data.employees || []).sort((a: any, b: any) => {
        const numA = parseInt((a.id || "").replace(/\D/g, ""), 10) || 0;
        const numB = parseInt((b.id || "").replace(/\D/g, ""), 10) || 0;
        return numA - numB;
      });
      setEmployees(fetchedEmployees);
      setDesignations(data.designations || []);
      setOnboardingChecklistTemplates(data.onboardingChecklistTemplates || []);
      setExitChecklistTemplates(data.exitChecklistTemplates || []);
      if (data.timingSettings) {
        setTimingSettings(data.timingSettings);
      }
      setAttendance(prev => {
        const attMap = new Map<string, any>();
        const getKey = (item: any) => `${item.employeeId}_${item.date}`;

        (data.attendance || []).forEach((fetched: any) => {
          if (fetched && fetched.employeeId && fetched.date) {
            attMap.set(getKey(fetched), fetched);
          }
        });

        (prev || []).forEach((p: any) => {
          if (p && p.employeeId && p.date) {
            const key = getKey(p);
            if (attMap.has(key)) {
              const fetched = attMap.get(key);
              const fetchedBreaks = fetched.breaks || [];
              const prevBreaks = p.breaks || [];

              const endedF = fetchedBreaks.filter((b: any) => b && (b.end || b.break_end)).length;
              const endedP = prevBreaks.filter((b: any) => b && (b.end || b.break_end)).length;

              let mergedBreaks = prevBreaks;
              if (endedF > endedP) {
                mergedBreaks = fetchedBreaks;
              } else if (endedP > endedF) {
                mergedBreaks = prevBreaks;
              } else if (fetchedBreaks.length > prevBreaks.length) {
                mergedBreaks = fetchedBreaks;
              } else if (prevBreaks.length > fetchedBreaks.length) {
                mergedBreaks = prevBreaks;
              } else if (fetchedBreaks.length > 0 && prevBreaks.length > 0) {
                const lastF = fetchedBreaks[fetchedBreaks.length - 1];
                const lastP = prevBreaks[prevBreaks.length - 1];
                mergedBreaks = (lastP?.end && !lastF?.end) ? prevBreaks : fetchedBreaks;
              }

              attMap.set(key, {
                ...fetched,
                id: p.id || fetched.id,
                clockOut: fetched.clockOut || p.clockOut,
                breaks: mergedBreaks
              });
            } else {
              attMap.set(key, p);
            }
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
      setPolicies(data.policies || []);
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
      setFines(data.fines || []);
      setReimbursements(prev => {
        const reimMap = new Map();
        (prev || []).forEach((r: any) => { if (r && r.id) reimMap.set(r.id, r); });
        (data.reimbursements || []).forEach((r: any) => { if (r && r.id) reimMap.set(r.id, r); });
        return Array.from(reimMap.values());
      });
      setPayslips(data.payslips || []);
      setEmails(data.simulatedEmails || []);
      setMeetings(data.meetings || []);
      setSeatLayouts(data.seatLayouts || []);
      setRooms(data.rooms || []);
      setRoomBookings(prev => {
        const bookingMap = new Map();
        (prev || []).forEach((b: any) => { if (b.id) bookingMap.set(b.id, b); });
        (data.roomBookings || []).forEach((b: any) => { if (b.id) bookingMap.set(b.id, b); });
        return Array.from(bookingMap.values());
      });
      // Grievances & Performance — fetched from dedicated endpoints
      if (data.grievanceTickets) setGrievanceTickets(data.grievanceTickets);
      if (data.performanceRecords) setPerformanceRecords(data.performanceRecords);

      setCustomLeaveTypes(data.customLeaveTypes || []);
      setCustomDepartments(data.customDepartments || []);
      setCustomBranches(data.customBranches || []);
      setCustomAmenities(data.customAmenities || []);
      setExpenseCategories(data.expenseCategories || []);
      setInfractionTypes(data.infractionTypes || []);
      setCorporateAllowancesFaqs(data.corporateAllowancesFaqs || []);
      if (data.wifiRestrictionSettings) {
        setWifiRestrictionSettings(data.wifiRestrictionSettings);
      }
      // Load server-side showLeaveCount so all users see the same setting
      if (data.showLeaveCount !== undefined) {
        setShowLeaveCount(data.showLeaveCount);
      }

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

      setError(null);
    } catch (err: any) {
      console.error("refreshDatabase error:", err);
      setError(`Could not establish a connection to the ${companyName} full-stack service.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDatabase();
  }, []);

  // Sync role switch with defaults
  const handleRoleChange = (role: UserRole) => {
    if (role !== "super_admin") {
      setActiveRole(role);
    }
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
    if (emp && emp.role !== "super_admin") {
      setActiveRole(emp.role);
    }
  };

  const handleLoginSuccess = (employee: Employee) => {
    setIsLoggedIn(true);
    setCurrentEmployeeId(employee.id);
    if (employee.role !== "super_admin") {
      setActiveRole(employee.role);
    }
    setCurrentView("dashboard");
    // Sync freshly-written localStorage tenant values into React state
    if (typeof window !== "undefined") {
      const newCompanyName = localStorage.getItem("snailhr_companyName") || "";
      const newCompanyId = localStorage.getItem("snailhr_companyId") || "";
      const newSubModel = parseInt(localStorage.getItem("snailhr_subscriptionModel") || "1") as 1 | 2 | 3 | 4;
      const newLogoUrl = localStorage.getItem("snailhr_companyLogoUrl") || "";
      setCompanyName(newCompanyName);
      setCompanyId(newCompanyId);
      setSubscriptionModel(newSubModel);
      setCompanyLogoUrl(newLogoUrl);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentEmployeeId("");
    setActiveRole("employee");
    setCurrentView("dashboard");
    setCompanyName("");
    setCompanyId("");
    setCompanyLogoUrl("");

    // Clear all tenant-scoped database states to prevent data leakage
    setEmployees([]);
    setDesignations([]);
    setAttendance([]);
    setLeaves([]);
    setHolidays([]);
    setPolicies([]);
    setExpenses([]);
    setInventory([]);
    setInventoryRequests([]);
    setFines([]);
    setReimbursements([]);
    setPayslips([]);
    setEmails([]);
    setMeetings([]);
    setCustomLeaveTypes([]);
    setCustomDepartments([]);
    setCustomBranches([]);
    setCustomAmenities([]);
    setSeatLayouts([]);
    setRooms([]);
    setRoomBookings([]);
    setGrievanceTickets([]);
    setPerformanceRecords([]);

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
    showToast("Onboarding new employee, please wait...", "info");
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(empData)
      });
      if (res.ok) {
        await refreshDatabase();
        showToast("Employee onboarded successfully! Credential campaign sent.", "success");
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(`Failed to onboard employee: ${errData.error || "Server error"}`, "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Error onboarding employee: ${err?.message || err}`, "error");
    }
  };

  // 1b. Bulk Onboard employees with upload history tracking
  const handleBulkOnboardEmployee = async (payload: { employees: any[]; filename?: string; fileData?: string } | any[]) => {
    try {
      const employeesList = Array.isArray(payload) ? payload : payload.employees;
      const filename = Array.isArray(payload) ? undefined : payload.filename;
      const fileData = Array.isArray(payload) ? undefined : payload.fileData;

      showToast(`Processing bulk upload of ${employeesList.length} employees...`, "info");
      const res = await fetch("/api/employees/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employees: employeesList,
          filename: filename || `Employees_Import_${new Date().toISOString().slice(0, 10)}.xlsx`,
          fileData: fileData || "",
          uploadedByName: currentEmployee?.fullName || "Admin User",
          uploadedById: currentEmployee?.id || "",
          companyId
        })
      });
      if (res.ok) {
        const json = await res.json();
        await refreshDatabase();
        showToast(`Successfully onboarded ${json.count || employeesList.length} employees and archived upload record!`, "success");
      } else {
        const errJson = await res.json();
        showToast(`Bulk upload failed: ${errJson.error || "Server error"}`, "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Error uploading bulk employees: ${err?.message || err}`, "error");
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

  // 3. Upload document
  const handleAddDocument = async (empId: string, docData: any) => {
    try {
      const res = await fetch(`/api/employees/${empId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(docData)
      });
      if (res.ok) {
        const resData = await res.json();
        const addedDoc = resData.document || { id: "doc-" + Date.now(), ...docData };
        setEmployees(prev =>
          (prev || []).map(e => {
            if (e.id === empId) {
              const existing = e.documents || [];
              const exists = existing.some((d: any) => d.id === addedDoc.id || d.name === addedDoc.name);
              return {
                ...e,
                documents: exists ? existing : [...existing, addedDoc]
              };
            }
            return e;
          })
        );
        showToast("Document uploaded successfully to Vault!", "success");
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to upload document", "error");
    }
  };

  // 4. Delete document
  const handleDeleteDocument = async (empId: string, docId: string) => {
    try {
      setEmployees(prev =>
        (prev || []).map(e => {
          if (e.id === empId) {
            return {
              ...e,
              documents: (e.documents || []).filter((d: any) => d.id !== docId && d.name !== docId)
            };
          }
          return e;
        })
      );
      const res = await fetch(`/api/employees/${empId}/documents/${encodeURIComponent(docId)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showToast("Document removed from Vault.", "info");
        await refreshDatabase();
      } else {
        const errorData = await res.json().catch(() => ({}));
        showToast(errorData.error || "Failed to delete document", "error");
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to delete document", "error");
    }
  };

  // 4b. Add Holiday (Admin / HR)
  const handleAddHoliday = async (newHoliday: { name: string; date: string; type: "National" | "Regional" | "Restricted" }) => {
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newHoliday, companyId })
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
        body: JSON.stringify({ ...policyObj, companyId })
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
      const getLocalDateString = (d: Date = new Date()) => {
        try {
          return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        } catch {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      };

      const clientDate = getLocalDateString(new Date());
      const res = await fetch("/api/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, type, date: clientDate })
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (parseErr) {
        console.error("Failed to parse punch response JSON:", parseErr);
      }

      if (!res.ok) {
        // Special handling for WiFi restriction (403)
        if (res.status === 403 && data?.wifiRestricted) {
          showToast(data?.error || "📶 WiFi Restriction: You must be connected to the office WiFi to punch attendance.", "error");
        } else {
          showToast(data?.error || `Punch action failed (HTTP ${res.status})`, "error");
        }
        return;
      }

      // For break actions, apply the API response immediately so the live timer
      // starts/stops without waiting for refreshDatabase (which may have stale Supabase data)
      if (data && data.id) {
        setAttendance(prev => {
          const next = prev.filter(a => a.id !== data.id && !(a.employeeId === data.employeeId && a.date === data.date));
          return [data, ...next];
        });
      }

      // Refresh from server (runs in background, does not overwrite break state for active punches
      // because refreshDatabase prefers longer breaks arrays for open punches)
      refreshDatabase().catch(e => console.warn("refreshDatabase after punch:", e));

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
      const activeCompanyId = localStorage.getItem("snailhr_companyId") || companyId || "";
      const payloadData = {
        ...leaveData,
        companyId: activeCompanyId
      };
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadData)
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
        companyId: companyId || emp?.companyId || (emp as any)?.company_id || "a1b2c3d4-0001-0001-0001-000000000001",
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
        showToast("Expense claim logged. Supervisor review pending.", "success");
        const resData = await res.json();
        if (resData.claim) {
          setExpenses(prev => [resData.claim, ...(prev || []).filter(e => e.id !== resData.claim.id && e.id !== tempId)]);
        }
        await refreshDatabase();
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
        showToast(`Expense claim ${status.toLowerCase()} successfully.`, status === "Approved" ? "success" : "info");
        const resData = await res.json();
        if (resData.expense) {
          setExpenses(prev => prev.map(e => e.id === id ? resData.expense : e));
        }
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
        branch: assetData.branch,
        companyId: companyId
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

  // 11b. Delete hardware asset
  const handleDeleteAsset = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset? This action cannot be undone.")) return;
    try {
      // Optimistic update
      setInventory(prev => prev.filter(i => i.id !== id));
      const res = await fetch(`/api/inventory?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await refreshDatabase();
        showToast("Asset deleted from inventory.", "info");
      } else {
        await refreshDatabase();
        showToast("Failed to delete asset.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error deleting asset.", "error");
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

  const handleDeleteFine = async (id: string) => {
    try {
      setFines(prev => (prev || []).filter(f => f.id !== id));
      const res = await fetch(`/api/fines/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await refreshDatabase();
        showToast("Fine record deleted/revoked successfully.", "info");
      } else {
        showToast("Failed to delete fine record.", "error");
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
      showToast("Error deleting fine record.", "error");
      await refreshDatabase();
    }
  };

  // 16. Admin create designation
  const handleAddDesignation = async (title: string, department: string) => {
    try {
      const res = await fetch("/api/designations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, department, companyId })
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

  // 17b. Checklist Template Management & Document Submission Handlers
  const handleAddChecklistTemplate = async (template: Omit<ChecklistItemTemplate, "id">) => {
    try {
      const res = await fetch("/api/checklist-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...template, companyId })
      });
      const data = await res.json();
      if (res.ok && data.template) {
        if (template.type === "onboarding") {
          setOnboardingChecklistTemplates(prev => [...prev, data.template]);
        } else {
          setExitChecklistTemplates(prev => [...prev, data.template]);
        }
        showToast(`${template.type === "onboarding" ? "Onboarding" : "Exit"} checklist item created!`, "success");
        await refreshDatabase();
      } else {
        showToast(data.error || "Failed to add checklist item", "error");
      }
    } catch (err) {
      showToast("Failed to add checklist item", "error");
    }
  };

  const handleRemoveChecklistTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/checklist-templates?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setOnboardingChecklistTemplates(prev => prev.filter(t => t.id !== id));
        setExitChecklistTemplates(prev => prev.filter(t => t.id !== id));
        showToast("Checklist item removed", "success");
        await refreshDatabase();
      } else {
        showToast("Failed to remove checklist item", "error");
      }
    } catch (err) {
      showToast("Failed to remove checklist item", "error");
    }
  };

  const handleUploadChecklistDocument = async (employeeId: string, itemId: string, file: File, category?: string) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "employee-documents");
      formData.append("folder", "onboarding-checklist-documents");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || "File upload failed");
      }

      const isExit = itemId.startsWith("exit") || exitChecklistTemplates.some(t => t.id === itemId);
      const type = isExit ? "exit" : "onboarding";

      const res = await fetch(`/api/employees/${employeeId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          type,
          fileUrl: uploadData.url,
          fileName: file.name,
          category: category || (type === "onboarding" ? "ID Proof" : "Contract")
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.item || json.checklist) {
          const itemToPut = json.item;
          setEmployees(prev => prev.map(emp => {
            const matchesEmp = emp.id === employeeId || emp.id.toLowerCase().replace(/[-_]/g, "") === employeeId.toLowerCase().replace(/[-_]/g, "");
            if (matchesEmp) {
              const listKey = type === "onboarding" ? "onboardingChecklist" : "exitChecklist";
              const currentList = emp[listKey] || [];
              let updatedList = json.checklist;
              if (!updatedList && itemToPut) {
                const idx = currentList.findIndex(i =>
                  i.id === itemToPut.id ||
                  (i.templateId && itemToPut.templateId && i.templateId === itemToPut.templateId) ||
                  (i.title && itemToPut.title && i.title.trim().toLowerCase() === itemToPut.title.trim().toLowerCase())
                );
                if (idx >= 0) {
                  updatedList = [...currentList];
                  updatedList[idx] = { ...updatedList[idx], ...itemToPut };
                } else {
                  updatedList = [...currentList, itemToPut];
                }
              }
              return {
                ...emp,
                [listKey]: updatedList || currentList
              };
            }
            return emp;
          }));
        }
        showToast("Checklist document uploaded successfully!", "success");
        await refreshDatabase();
      } else {
        showToast("Failed to record checklist document", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to upload document", "error");
    }
  };

  const handleReviewChecklistItem = async (employeeId: string, itemId: string, action: "approve" | "reject", comments?: string) => {
    try {
      const isExit = itemId.startsWith("exit") || exitChecklistTemplates.some(t => t.id === itemId);
      const type = isExit ? "exit" : "onboarding";
      const currentEmp = employees.find(e => e.id === currentEmployeeId);
      const reviewerName = currentEmp ? currentEmp.fullName : (activeRole === "admin" ? "Administrator" : "HR Manager");

      const res = await fetch(`/api/employees/${employeeId}/checklist`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          type,
          action,
          comments,
          reviewerName
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.item || json.checklist) {
          setEmployees(prev => prev.map(emp => {
            const matchesEmp = emp.id === employeeId || emp.id.toLowerCase().replace(/[-_]/g, "") === employeeId.toLowerCase().replace(/[-_]/g, "");
            if (matchesEmp) {
              const listKey = type === "onboarding" ? "onboardingChecklist" : "exitChecklist";
              const currentList = emp[listKey] || [];
              const itemToPut = json.item;
              const exists = itemToPut ? currentList.some(i => i.id === itemToPut.id || i.templateId === itemToPut.templateId || (i.title && itemToPut.title && i.title.trim().toLowerCase() === itemToPut.title.trim().toLowerCase())) : false;
              const updatedList = json.checklist || (exists
                ? currentList.map(i => (i.id === itemToPut.id || i.templateId === itemToPut.templateId || (i.title && itemToPut.title && i.title.trim().toLowerCase() === itemToPut.title.trim().toLowerCase())) ? itemToPut : i)
                : [...currentList, itemToPut]);
              return {
                ...emp,
                [listKey]: updatedList,
                documents: json.employee?.documents || emp.documents
              };
            }
            return emp;
          }));
        }
        showToast(`Document ${action === "approve" ? "approved" : "rejected"} successfully`, "success");
        await refreshDatabase();
      } else {
        showToast("Failed to review document", "error");
      }
    } catch (err) {
      showToast("Failed to review document", "error");
    }
  };

  const handleGrantExitClearance = async (employeeId: string) => {
    try {
      const currentEmp = employees.find(e => e.id === currentEmployeeId);
      const reviewerName = currentEmp ? currentEmp.fullName : (activeRole === "admin" ? "Administrator" : "HR Manager");

      const res = await fetch(`/api/employees/${employeeId}/checklist`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant_clearance",
          reviewerName
        })
      });

      if (res.ok) {
        showToast("Final Exit Clearance granted successfully!", "success");
        await refreshDatabase();
      } else {
        showToast("Failed to grant exit clearance", "error");
      }
    } catch (err) {
      showToast("Failed to grant exit clearance", "error");
    }
  };

  const handleInitiateResignation = async (employeeId: string) => {
    try {
      const targetEmp = employees.find(e => e.id === employeeId);
      if (!targetEmp) return;
      const updatedEmp = {
        ...targetEmp,
        status: "Resigned" as const
      };
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedEmp)
      });
      if (res.ok) {
        showToast("Resignation status updated! Exit document clearance checklist is now active.", "info");
        await refreshDatabase();
      } else {
        showToast("Failed to update status to Resigned", "error");
      }
    } catch (err) {
      showToast("Failed to submit resignation", "error");
    }
  };

  const handleCreateChecklistTemplate = async (template: { title: string; description: string; category: string; required: boolean; type: "onboarding" | "exit" }) => {
    try {
      const res = await fetch("/api/checklist-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...template, companyId })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.template) {
          if (data.template.type === "onboarding") {
            setOnboardingChecklistTemplates(prev => [...(prev || []).filter(t => t.id !== data.template.id), data.template]);
          } else {
            setExitChecklistTemplates(prev => [...(prev || []).filter(t => t.id !== data.template.id), data.template]);
          }
        }
        showToast(`Added "${template.title}" to ${template.type} checklist templates!`, "success");
        await refreshDatabase();
      } else {
        showToast("Failed to create checklist requirement", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to create requirement", "error");
    }
  };

  const handleDeleteChecklistTemplate = async (templateId: string) => {
    try {
      setOnboardingChecklistTemplates(prev => (prev || []).filter(t => t.id !== templateId));
      setExitChecklistTemplates(prev => (prev || []).filter(t => t.id !== templateId));
      const res = await fetch(`/api/checklist-templates?id=${templateId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Checklist requirement template removed", "info");
        await refreshDatabase();
      } else {
        showToast("Failed to delete checklist requirement", "error");
        await refreshDatabase();
      }
    } catch (err) {
      showToast("Failed to delete requirement", "error");
    }
  };

  // 18. Generate payslip (and automatically trigger welcome sequence email)
  const handleGeneratePayslip = async (employeeId: string, month: string) => {
    try {
      const res = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, month, companyId })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Payslip generation failed", "error");
        return;
      }

      // INSTANT OPTIMISTIC STATE UPDATE: Immediately update payslips, emails, and fines in React state!
      if (data.payslip) {
        setPayslips(prev => [data.payslip, ...(prev || []).filter(p => !(p.employeeId === employeeId && p.month === month))]);
      }
      if (data.email) {
        setEmails(prev => [data.email, ...(prev || []).filter(e => e.id !== data.email.id)]);
      }
      setFines(prev => (prev || []).map(f => f.employeeId === employeeId && (f.status === "Pending" || f.status === "Deducted From Payroll") ? { ...f, status: "Deducted" } : f));

      showToast("Payslip Generated & Dispatched to employee email inbox successfully!", "success");
      await refreshDatabase();
    } catch (err) {
      console.error(err);
      showToast("Payslip generation error", "error");
    }
  };

  const handleResetPayslip = async (employeeId: string, month: string, payslipId?: string) => {
    try {
      // INSTANT OPTIMISTIC STATE UPDATE: Immediately clear payslip from state!
      setPayslips(prev => (prev || []).filter(p => {
        if (payslipId && p.id === payslipId) return false;
        if (employeeId && month && p.employeeId === employeeId && p.month === month) return false;
        return true;
      }));

      const res = await fetch("/api/payroll/generate", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, month, id: payslipId })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Payslip has been reset successfully.", "success");
        await refreshDatabase();
      } else {
        showToast(data.error || "Failed to reset payslip", "error");
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
      showToast("Error resetting payslip", "error");
    }
  };

  // 19. Disburse payslips
  const handlePayAllPayslips = async (month: string) => {
    try {
      setPayslips(prev => (prev || []).map(p => p.month === month ? { ...p, status: "Paid" } : p));
      const res = await fetch("/api/payroll/pay-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month })
      });
      if (res.ok) {
        showToast("All monthly salary payouts finalized and marked as Paid.", "success");
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 20. Update custom collections (Departments, Branches, Leave Policies)
  const handleUpdateCollection = async (
    type: "leaveTypes" | "departments" | "branches" | "amenities",
    updatedList: string[],
    action?: "add" | "remove",
    item?: string
  ) => {
    // 1. INSTANT OPTIMISTIC UI UPDATE: Immediate display updates in state
    if (type === "leaveTypes") {
      const map = new Map<string, string>();
      updatedList.forEach(item => {
        const name = (item.includes("|") ? item.split("|")[0] : item).trim().toLowerCase();
        map.set(name, item);
      });
      setCustomLeaveTypes(Array.from(map.values()));
    }
    if (type === "departments") setCustomDepartments(updatedList);
    if (type === "branches") setCustomBranches(updatedList);
    if (type === "amenities") setCustomAmenities(updatedList);

    try {
      const res = await fetch("/api/config-collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          updatedList,
          addedItem: action === "add" ? item : undefined,
          removedItem: action === "remove" ? item : undefined,
          companyId
        })
      });

      if (res.ok) {
        const typeLabel = type === "leaveTypes" ? "Leave Policy" : type === "departments" ? "Department" : type === "branches" ? "Branch" : "Room Amenity";
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
        body: JSON.stringify({ ...settings, changedBy, companyId })
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

  const handleSaveWifiSettings = async (settings: { enabled: boolean; allowedIp?: string; allowedIps: string[] }) => {
    try {
      const changedBy = currentEmployee ? `${currentEmployee.fullName} (${currentEmployee.id})` : "Admin";
      const res = await fetch("/api/attendance/wifi-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, changedBy, companyId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.wifiRestrictionSettings) {
          setWifiRestrictionSettings(data.wifiRestrictionSettings);
        }
        showToast("WiFi restriction settings saved successfully!", "success");
        await refreshDatabase();
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(`Failed to save WiFi settings: ${errData.error || "Unknown error"}`, "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error saving WiFi restriction settings.", "error");
    }
  };

  const handleToggleLeaveCount = async (val: boolean) => {
    setShowLeaveCount(val); // optimistic update
    try {
      const activeCompanyId = (typeof window !== "undefined" && localStorage.getItem("snailhr_companyId")) || companyId;
      const res = await fetch("/api/config/leave-count-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showLeaveCount: val, companyId: activeCompanyId })
      });
      if (res.ok) {
        showToast(val ? "Leave counts are now VISIBLE to all employees" : "Leave counts are now HIDDEN from all employees", "success");
      } else {
        showToast("Failed to update leave count visibility setting.", "error");
      }
    } catch (err) {
      console.error("Failed to save leave count visibility setting:", err);
      showToast("Failed to save leave count visibility setting.", "error");
    }
  };

  const handleAddInfractionType = async (name: string, description: string, defaultAmount: number = 0) => {
    try {
      const tempId = `infr-${Date.now()}`;
      const newType: InfractionType = { id: tempId, name, companyId, description, defaultAmount };
      setInfractionTypes(prev => [newType, ...prev]);

      const res = await fetch("/api/infraction-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newType)
      });
      if (res.ok) {
        await refreshDatabase();
        showToast("Infraction Type created successfully!", "success");
      } else {
        showToast("Failed to create infraction type.", "error");
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
      showToast("Error creating infraction type.", "error");
      await refreshDatabase();
    }
  };

  const handleUpdateInfractionType = async (id: string, name: string, description: string, defaultAmount: number) => {
    try {
      const updated: InfractionType = { id, name, description, defaultAmount, companyId };
      setInfractionTypes(prev => prev.map(t => t.id === id ? updated : t));

      const res = await fetch("/api/infraction-types", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        await refreshDatabase();
        showToast("Infraction Type updated successfully!", "success");
      } else {
        showToast("Failed to update infraction type.", "error");
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
      showToast("Error updating infraction type.", "error");
      await refreshDatabase();
    }
  };

  const handleRemoveInfractionType = async (id: string) => {
    try {
      setInfractionTypes(prev => prev.filter(t => t.id !== id));
      const res = await fetch(`/api/infraction-types?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await refreshDatabase();
        showToast("Infraction Type deleted.", "info");
      } else {
        showToast("Failed to delete infraction type.", "error");
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
      showToast("Error deleting infraction type.", "error");
      await refreshDatabase();
    }
  };

  const handleAddExpenseCategory = async (name: string, description: string) => {
    try {
      const tempId = `expcat-${Date.now()}`;
      const newCat: ExpenseCategory = {
        id: tempId,
        name,
        companyId,
        description
      };
      setExpenseCategories(prev => [newCat, ...prev]);

      const res = await fetch("/api/expense-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCat)
      });
      if (res.ok) {
        await refreshDatabase();
        showToast("Expense Category created successfully!", "success");
      } else {
        showToast("Failed to create expense category.", "error");
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
      showToast("Error creating expense category.", "error");
      await refreshDatabase();
    }
  };

  const handleRemoveExpenseCategory = async (id: string) => {
    try {
      setExpenseCategories(prev => prev.filter(c => c.id !== id));
      const res = await fetch(`/api/expense-categories?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await refreshDatabase();
        showToast("Expense Category deleted successfully.", "info");
      } else {
        showToast("Failed to delete expense category.", "error");
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
      showToast("Error deleting expense category.", "error");
      await refreshDatabase();
    }
  };

  const handleAddCorporateAllowanceFaq = async (title: string, description: string, id?: string) => {
    try {
      const faqId = id || `faq-${Date.now()}`;
      const newFaq: CorporateAllowanceFaq = {
        id: faqId,
        title,
        description,
        companyId
      };
      setCorporateAllowancesFaqs(prev => [newFaq, ...prev.filter(f => f.id !== faqId)]);

      const res = await fetch("/api/corporate-allowances-faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFaq)
      });
      if (res.ok) {
        await refreshDatabase();
        showToast("Corporate Allowance FAQ saved successfully!", "success");
      } else {
        showToast("Failed to save corporate allowance FAQ.", "error");
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
      showToast("Error saving corporate allowance FAQ.", "error");
      await refreshDatabase();
    }
  };

  const handleRemoveCorporateAllowanceFaq = async (id: string) => {
    try {
      setCorporateAllowancesFaqs(prev => prev.filter(f => f.id !== id));
      const res = await fetch(`/api/corporate-allowances-faq?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await refreshDatabase();
        showToast("Corporate Allowance FAQ deleted successfully.", "info");
      } else {
        showToast("Failed to delete corporate allowance FAQ.", "error");
        await refreshDatabase();
      }
    } catch (err) {
      console.error(err);
      showToast("Error deleting corporate allowance FAQ.", "error");
      await refreshDatabase();
    }
  };

  const handleAddMeeting = async (meetingData: any) => {
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meetingData)
      });
      if (res.ok) {
        await refreshDatabase();
        showToast("Meeting scheduled successfully!", "success");
        return true;
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(`Failed to schedule meeting: ${errData.error || "Server error"}`, "error");
        return false;
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Error scheduling meeting: ${err?.message || err}`, "error");
      return false;
    }
  };

  const handleCancelMeeting = async (id: string) => {
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await refreshDatabase();
        showToast("Meeting cancelled successfully.", "info");
        return true;
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(`Failed to cancel meeting: ${errData.error || "Server error"}`, "error");
        return false;
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Error cancelling meeting: ${err?.message || err}`, "error");
      return false;
    }
  };

  const handleEditMeeting = async (id: string, updateData: any) => {
    try {
      // Find the existing meeting in client state to build a full upsert body
      const existingMeeting = meetings.find(m => m.id === id);
      const fullPayload = existingMeeting
        ? { ...existingMeeting, ...updateData }
        : updateData;

      const res = await fetch(`/api/meetings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullPayload)
      });
      if (res.ok) {
        await refreshDatabase();
        showToast("Meeting updated successfully!", "success");
        return true;
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(`Failed to update meeting: ${errData.error || "Server error"}`, "error");
        return false;
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Error updating meeting: ${err?.message || err}`, "error");
      return false;
    }
  };

  // Workspace: Save seat layout
  const handleSaveSeatLayout = async (layout: SeatLayout): Promise<boolean> => {
    try {
      const changer = currentEmployee ? `${currentEmployee.fullName} (${currentEmployee.id})` : "Admin";
      const res = await fetch("/api/seating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...layout, updatedBy: changer })
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.success && resData.layout) {
          setSeatLayouts(prev => [resData.layout, ...prev.filter(l => l.id !== resData.layout.id)]);
        }
        await refreshDatabase();
        showToast("Seating layout saved successfully!", "success");
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(`Failed to save layout: ${err.error || "Server error"}`, "error");
        return false;
      }
    } catch (err: any) {
      showToast(`Error saving layout: ${err?.message || err}`, "error");
      return false;
    }
  };

  // Workspace: Delete seat layout
  const handleDeleteSeatLayout = async (id: string) => {
    try {
      const res = await fetch(`/api/seating?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSeatLayouts(prev => prev.filter(l => l.id !== id));
        await refreshDatabase();
        showToast("Layout deleted.", "info");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Workspace: Save room
  const handleSaveRoom = async (room: Room): Promise<boolean> => {
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(room)
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.success && resData.room) {
          setRooms(prev => [resData.room, ...prev.filter(r => r.id !== resData.room.id)]);
        }
        await refreshDatabase();
        showToast("Room saved successfully!", "success");
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(`Failed to save room: ${err.error || "Server error"}`, "error");
        return false;
      }
    } catch (err: any) {
      showToast(`Error saving room: ${err?.message || err}`, "error");
      return false;
    }
  };

  // Workspace: Delete room
  const handleDeleteRoom = async (id: string) => {
    try {
      const res = await fetch(`/api/rooms?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setRooms(prev => prev.filter(r => r.id !== id));
        await refreshDatabase();
        showToast("Room deleted.", "info");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Workspace: Request room booking
  const handleBookRoom = async (bookingData: any): Promise<boolean> => {
    try {
      const res = await fetch("/api/room-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData)
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.success && resData.booking) {
          setRoomBookings(prev => [resData.booking, ...prev.filter(b => b.id !== resData.booking.id)]);
        }
        showToast("Room booking request submitted! Awaiting admin approval.", "success");
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(`Failed to request booking: ${err.error || "Server error"}`, "error");
        return false;
      }
    } catch (err: any) {
      showToast(`Error requesting booking: ${err?.message || err}`, "error");
      return false;
    }
  };

  // Workspace: Update booking status (approve/reject/cancel)
  const handleUpdateBooking = async (id: string, status: "Approved" | "Rejected" | "Cancelled", approvedBy?: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/room-bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, approvedBy })
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.success && resData.booking) {
          setRoomBookings(prev => [resData.booking, ...prev.filter(b => b.id !== id)]);
        }
        showToast(`Booking ${status.toLowerCase()} successfully.`, "success");
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(`Failed to update booking: ${err.error || "Server error"}`, "error");
        return false;
      }
    } catch (err: any) {
      showToast(`Error updating booking: ${err?.message || err}`, "error");
      return false;
    }
  };

  // Super Admin view routing
  if (isSuperAdminMode) {
    if (!isSuperAdminLoggedIn) {
      return (
        <SuperAdminLoginView
          onLoginSuccess={(sa) => {
            setIsSuperAdminLoggedIn(true);
          }}
          onBackToEmployeeLogin={() => {
            setIsSuperAdminMode(false);
          }}
        />
      );
    }
    return (
      <SuperAdminDashboard
        onLogout={() => {
          setIsSuperAdminLoggedIn(false);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0a0a0a] text-slate-800 dark:text-gray-100">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-xs font-semibold mt-4 tracking-widest uppercase text-slate-400 dark:text-gray-500">Booting SnailHR Cloud Core...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <LoginView
        onLoginSuccess={(emp) => {
          handleLoginSuccess(emp);
          setLoading(true);
          // reload DB so it gets company-scoped data
          refreshDatabase();
        }}
        onSuperAdminLink={() => {
          setIsSuperAdminMode(true);
        }}
      />
    );
  }

  if (error || employees.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0a0a0a] text-slate-800 dark:text-gray-100 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold font-display">Database Sync Timeout</h2>
        <p className="text-xs text-slate-400 mt-2 max-w-sm">{error || "Could not load employee catalog roster."}</p>
        <button
          onClick={() => {
            setLoading(true);
            refreshDatabase();
          }}
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
    ...((activeRole === "admin" || activeRole === "hr") ? [
      { id: "directory", label: "Employee Directory", icon: <Users className="w-4.5 h-4.5" /> }
    ] : []),
    { id: "attendance", label: "Attendance Punches", icon: <Clock className="w-4.5 h-4.5" /> },
    { id: "leaves", label: "Leaves & Holidays", icon: <Calendar className="w-4.5 h-4.5" /> },
    { id: "meetings", label: "Scheduled Meetings", icon: <Video className="w-4.5 h-4.5" /> },
    { id: "workspace", label: "Seating & Rooms", icon: <LayoutGrid className="w-4.5 h-4.5" /> },
    { id: "payroll", label: "Payroll & Payslips", icon: <IndianRupee className="w-4.5 h-4.5" /> },
    { id: "expenses", label: "Expense & Claims", icon: <ReceiptText className="w-4.5 h-4.5" /> },
    { id: "inventory", label: "Asset Inventory", icon: <Package className="w-4.5 h-4.5" /> },
    { id: "policies", label: "Policies Handbook", icon: <ShieldAlert className="w-4.5 h-4.5" /> },
    { id: "fines", label: "Disciplinary Fines", icon: <Scale className="w-4.5 h-4.5" /> },
    { id: "grievance", label: "Support & Grievance", icon: <MessageSquareWarning className="w-4.5 h-4.5" /> },
    ...((activeRole === "admin" || activeRole === "hr") ? [
      { id: "performance", label: "Performance", icon: <TrendingUp className="w-4.5 h-4.5" /> }
    ] : []),
    { id: "password-update", label: "Password Update", icon: <Lock className="w-4.5 h-4.5" /> },
    ...((activeRole === "admin" || activeRole === "hr") ? [
      { id: "configurations", label: "System Settings", icon: <Settings className="w-4.5 h-4.5" /> }
    ] : [])
  ];

  return (
    <div id="snailhr-panel" className="min-h-screen flex flex-col font-sans text-slate-700 dark:text-gray-200 antialiased">

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-md border-b border-slate-100 dark:border-[#1a1a1a]/80 px-3 sm:px-4 py-2.5 sm:py-3 shadow-xs flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] rounded-lg text-slate-500 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center space-x-2.5">
            {companyLogoUrl ? (
              <img
                src={companyLogoUrl}
                alt={companyName || "Company Logo"}
                className="w-11 h-11 rounded-xl object-contain bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] shadow-md"
              />
            ) : (
              <div className="w-11 h-11 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl flex items-center justify-center text-white font-black text-[11px] tracking-tight shadow-md shadow-emerald-600/20">
                {companyName ? companyName.substring(0, 3).toUpperCase() : "HR"}
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-sm sm:text-base text-slate-800 dark:text-white tracking-tight leading-none">
                <span className="text-emerald-500">{companyName || "SnailHR"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Global Access Controls - Top Right Corner */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 min-w-0">

          {/* Quick Theme Switcher */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center justify-center p-2 bg-slate-50 dark:bg-[#0f0f0f] text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-emerald-400 rounded-xl border border-slate-100 dark:border-[#1a1a1a] transition-colors cursor-pointer"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5" />}
          </button>

          {/* Top Right User Profile Avatar Dropdown Menu */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="relative p-0.5 rounded-full hover:ring-2 hover:ring-emerald-500/50 transition-all cursor-pointer focus:outline-none shrink-0"
              title={`${currentEmployee?.fullName} (${activeRole.toUpperCase()})`}
            >
              <img
                src={currentEmployee?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop"}
                alt={currentEmployee?.fullName}
                className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 dark:border-slate-800 shadow-xs"
              />
              <span className="w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0f0f0f] absolute bottom-0 right-0 shadow-xs" />
            </button>

            {/* Dropdown Modal */}
            {profileMenuOpen && (
              <div className="absolute right-0 top-12 z-50 w-64 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl shadow-2xl p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User Info Header */}
                <div className="flex items-center space-x-3 p-2 bg-slate-50 dark:bg-[#141414] rounded-xl border border-slate-100 dark:border-[#1a1a1a]">
                  <img
                    src={currentEmployee?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop"}
                    alt={currentEmployee?.fullName}
                    className="w-10 h-10 rounded-full object-cover border border-emerald-500/30 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-xs text-slate-800 dark:text-white truncate">{currentEmployee?.fullName}</p>
                    <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {activeRole === "hr" ? "HR" : activeRole === "admin" ? "Admin" : "Employee"}
                    </p>
                  </div>
                </div>

                {/* Dropdown Navigation Menu */}
                <div className="space-y-1 pt-1 text-xs font-semibold text-slate-600 dark:text-gray-300">
                  {/* My Profile */}
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setShowMyProfileModal(true);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1a1a1a] hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4 text-emerald-500" />
                    <span>My Profile</span>
                  </button>

                  {/* Password Update */}
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setCurrentView("password-update");
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1a1a1a] hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <Lock className="w-4 h-4 text-amber-500" />
                    <span>Password Update</span>
                  </button>
                </div>

                {/* Logout Button */}
                <div className="pt-2 border-t border-slate-100 dark:border-[#1a1a1a]">
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-rose-500/20 cursor-pointer"
                  >
                    <span>Logout</span>
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Structural Layout */}
      <div className="flex-1 flex flex-col lg:flex-row">

        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col justify-between w-64 bg-white dark:bg-[#0f0f0f] border-r border-slate-100 dark:border-[#1a1a1a]/80 p-4 shrink-0 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto custom-scrollbar space-y-6">

          <div className="space-y-4">
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
            <nav className="space-y-1 text-xs font-semibold">
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
                className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 transition-all cursor-pointer font-bold mt-2"
              >
                <LogOut className="w-4.5 h-4.5" />
                <span>Sign Out</span>
              </button>
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-[#1a1a1a]/80 text-[10px] text-slate-400 dark:text-gray-500 shrink-0">
            <p className="font-bold font-display text-slate-800 dark:text-white">{companyName} Platform Suite</p>
            <p className="mt-0.5">HR Management Suite v2.4</p>
            <p className="font-mono mt-1 text-[9px]">UTC: {new Date().toISOString().split('T')[0]}</p>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 lg:hidden flex">
            <div className="bg-white dark:bg-[#0f0f0f] border-r border-slate-100 dark:border-[#1a1a1a] w-64 p-4 flex flex-col justify-between h-full animate-in slide-in-from-left duration-200">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1a1a1a] pb-3">
                  <div className="flex items-center space-x-2">
                    {companyLogoUrl ? (
                      <img
                        src={companyLogoUrl}
                        alt={companyName || "Company Logo"}
                        className="w-7 h-7 rounded-lg object-contain bg-white dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#1a1a1a] shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-lg flex items-center justify-center text-white font-black text-[9px] shrink-0">
                        {companyName ? companyName.substring(0, 2).toUpperCase() : "HR"}
                      </div>
                    )}
                    <span className="font-display font-extrabold text-sm tracking-tight text-slate-800 dark:text-white">{companyName} Menu</span>
                  </div>
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
                <p className="font-bold text-slate-800 dark:text-white">{companyName} Platform Suite</p>
                <p className="font-mono mt-1">v2.4 - Mobile Secured</p>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
          </div>
        )}

        {/* Content Viewer viewport */}
        <main className="flex-1 bg-slate-50 dark:bg-[#0a0a0a] p-3 sm:p-4 md:p-6 overflow-y-auto custom-scrollbar min-w-0 max-w-full overflow-x-hidden">

          {/* Active View Router */}
          {currentView === "dashboard" && (
            <DashboardView
              currentEmployee={currentEmployee}
              employees={employees}
              designations={designations}
              holidays={holidays}
              leaves={leaves}
              payslips={payslips}
              attendance={attendance}
              expenses={expenses}
              inventory={inventory}
              fines={fines}
              role={activeRole}
              companyName={companyName}
              onboardingChecklistTemplates={onboardingChecklistTemplates}
              exitChecklistTemplates={exitChecklistTemplates}
              onPunchAction={handlePunchAction}
              onUploadChecklistDocument={handleUploadChecklistDocument}
              onReviewChecklistItem={handleReviewChecklistItem}
              onCreateChecklistTemplate={handleCreateChecklistTemplate}
              onDeleteChecklistTemplate={handleDeleteChecklistTemplate}
              onGrantExitClearance={handleGrantExitClearance}
              onInitiateResignation={handleInitiateResignation}
              setCurrentView={setCurrentView}
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
              companyId={companyId}
              companyName={companyName}
              subscriptionModel={subscriptionModel}
              onboardingChecklistTemplates={onboardingChecklistTemplates}
              exitChecklistTemplates={exitChecklistTemplates}
              onOnboardEmployee={handleOnboardEmployee}
              onBulkOnboardEmployee={handleBulkOnboardEmployee}
              onUpdateEmployee={async (id, updatedData) => {
                showToast("Saving employee information...", "info");
                try {
                  const res = await fetch(`/api/employees/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatedData)
                  });
                  if (res.ok) {
                    await refreshDatabase();
                    showToast("Employee details updated successfully!", "success");
                  } else {
                    showToast("Failed to update employee information", "error");
                  }
                } catch (err) {
                  console.error(err);
                  showToast("Error updating employee information", "error");
                }
              }}
              onAddDocument={handleAddDocument}
              onDeleteDocument={handleDeleteDocument}
              onToggleOnboardingTask={handleToggleOnboardingTask}
              onUploadChecklistDocument={handleUploadChecklistDocument}
              onReviewChecklistItem={handleReviewChecklistItem}
              onCreateChecklistTemplate={handleCreateChecklistTemplate}
              onDeleteChecklistTemplate={handleDeleteChecklistTemplate}
              onGrantExitClearance={handleGrantExitClearance}
              onInitiateResignation={handleInitiateResignation}
              onUpdateCollection={handleUpdateCollection}
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
              companyName={companyName}
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
              showLeaveCount={showLeaveCount}
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
              fines={fines}
              role={activeRole}
              currentEmployeeId={currentEmployeeId}
              companyName={companyName}
              companyId={companyId}
              companyLogoUrl={companyLogoUrl}
              empCodePrefix={empCodePrefix}
              onAddDesignation={handleAddDesignation}
              onRemoveDesignation={handleRemoveDesignation}
              onGeneratePayslip={handleGeneratePayslip}
              onPayAllPayslips={handlePayAllPayslips}
              onResetPayslip={handleResetPayslip}
              onUpdateEmployee={async (id, updatedData) => {
                showToast("Saving employee allowances...", "info");
                try {
                  const res = await fetch(`/api/employees/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatedData)
                  });
                  if (res.ok) {
                    await refreshDatabase();
                    showToast("Allowances updated successfully!", "success");
                  } else {
                    showToast("Failed to update employee allowances", "error");
                  }
                } catch (err) {
                  console.error(err);
                  showToast("Error updating employee allowances", "error");
                }
              }}
            />
          )}

          {currentView === "expenses" && (
            <ExpensesView
              expenses={expenses}
              expenseCategories={expenseCategories}
              corporateAllowancesFaqs={corporateAllowancesFaqs}
              employees={employees}
              role={activeRole}
              currentEmployeeId={currentEmployeeId}
              onSubmitExpense={handleSubmitExpense}
              onReviewExpense={handleReviewExpense}
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
              onDeleteAsset={handleDeleteAsset}
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
              companyName={companyName}
              infractionTypes={infractionTypes}
              onAddFine={handleAddFine}
              onUpdateFineStatus={handleUpdateFineStatus}
              onDeleteFine={handleDeleteFine}
            />
          )}

          {currentView === "meetings" && (
            <MeetingsView
              meetings={meetings}
              employees={employees}
              role={activeRole}
              currentEmployeeId={currentEmployeeId}
              customDepartments={customDepartments}
              onAddMeeting={handleAddMeeting}
              onCancelMeeting={handleCancelMeeting}
              onEditMeeting={handleEditMeeting}
              companyName={companyName}
            />
          )}

          {currentView === "workspace" && (
            <WorkspaceView
              role={activeRole}
              companyId={companyId}
              companyName={companyName}
              currentEmployeeId={currentEmployeeId}
              employees={employees}
              seatLayouts={seatLayouts}
              rooms={rooms}
              roomBookings={roomBookings}
              customAmenities={customAmenities}
              onSaveSeatLayout={handleSaveSeatLayout}
              onDeleteSeatLayout={handleDeleteSeatLayout}
              onSaveRoom={handleSaveRoom}
              onDeleteRoom={handleDeleteRoom}
              onBookRoom={handleBookRoom}
              onUpdateBooking={handleUpdateBooking}
            />
          )}

          {currentView === "password-update" && (
            <PasswordUpdateView
              currentEmployee={currentEmployee}
              employees={employees}
              role={activeRole}
              companyId={companyId}
              showToast={showToast}
            />
          )}

          {currentView === "grievance" && (
            <GrievanceView
              role={activeRole}
              currentEmployee={currentEmployee}
              companyId={companyId}
              employees={employees}
              showToast={showToast}
            />
          )}

          {currentView === "performance" && (activeRole === "admin" || activeRole === "hr") && (
            <PerformanceView
              role={activeRole}
              currentEmployee={currentEmployee}
              companyId={companyId}
              employees={employees}
              fines={fines}
              showToast={showToast}
            />
          )}

          {currentView === "configurations" && (activeRole === "admin" || activeRole === "hr") && (
            <ConfigurationView
              designations={designations}
              customLeaveTypes={customLeaveTypes}
              customDepartments={customDepartments}
              customBranches={customBranches}
              customAmenities={customAmenities}
              expenseCategories={expenseCategories}
              infractionTypes={infractionTypes}
              corporateAllowancesFaqs={corporateAllowancesFaqs}
              supabaseStatus={supabaseStatus}
              subscriptionModel={subscriptionModel}
              wifiRestrictionSettings={wifiRestrictionSettings}
              onAddDesignation={handleAddDesignation}
              onRemoveDesignation={handleRemoveDesignation}
              onUpdateCollection={handleUpdateCollection}
              onAddExpenseCategory={handleAddExpenseCategory}
              onRemoveExpenseCategory={handleRemoveExpenseCategory}
              onAddInfractionType={handleAddInfractionType}
              onRemoveInfractionType={handleRemoveInfractionType}
              onUpdateInfractionType={handleUpdateInfractionType}
              onAddCorporateAllowanceFaq={handleAddCorporateAllowanceFaq}
              onRemoveCorporateAllowanceFaq={handleRemoveCorporateAllowanceFaq}
              onSaveWifiSettings={handleSaveWifiSettings}
              showLeaveCount={showLeaveCount}
              onToggleLeaveCount={handleToggleLeaveCount}
              onboardingChecklistTemplates={onboardingChecklistTemplates}
              exitChecklistTemplates={exitChecklistTemplates}
              onAddChecklistTemplate={handleAddChecklistTemplate}
              onRemoveChecklistTemplate={handleRemoveChecklistTemplate}
            />
          )}

        </main>
      </div>

      {/* Floating Dynamic AI Chatbot Assistant */}
      {[3, 4].includes(subscriptionModel) && (
        <ChatbotWidget currentEmployeeId={currentEmployeeId} role={activeRole} companyId={companyId} companyName={companyName} />
      )}

      {/* Floating Global Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center space-x-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md transition-all ${toast.type === "success"
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
      {/* Edit Employee Information Full-Screen Modal (Triggered via My Profile) */}
      {showMyProfileModal && currentEmployee && (
        <EditEmployeeModal
          employee={currentEmployee}
          designations={designations}
          customDepartments={customDepartments}
          customBranches={customBranches}
          role={activeRole}
          onClose={() => setShowMyProfileModal(false)}
          onSave={async (id, updatedData) => {
            showToast("Saving profile information...", "info");
            try {
              const res = await fetch(`/api/employees/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedData)
              });
              if (res.ok) {
                await refreshDatabase();
                showToast("Profile details updated successfully!", "success");
              } else {
                showToast("Failed to update profile information", "error");
              }
            } catch (err) {
              console.error(err);
              showToast("Error updating profile information", "error");
            }
          }}
        />
      )}
    </div>
  );
}
