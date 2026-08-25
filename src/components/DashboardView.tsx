"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar, Gift, Heart, CloudSun, ShieldAlert, Sparkles, Clock, Play, Square,
  CheckCircle2, Users, FileText, AlertCircle, IndianRupee, Package, Briefcase, Home,
  Award, ChevronRight, Activity, TrendingUp, Cake, LogOut, ShieldCheck, Eye, EyeOff
} from "lucide-react";
import { Employee, Designation, Holiday, LeaveRequest, Payslip, AttendancePunch, ExpenseClaim, InventoryItem, Fine, ChecklistItemTemplate } from "../types";
import ChecklistCard from "./ChecklistCard";
import { toBranchName, toBranchId } from "../lib/branchUtils";

interface DashboardViewProps {
  currentEmployee: Employee;
  employees: Employee[];
  designations?: Designation[];
  holidays: Holiday[];
  leaves: LeaveRequest[];
  payslips: Payslip[];
  attendance?: AttendancePunch[];
  expenses?: ExpenseClaim[];
  inventory?: InventoryItem[];
  fines?: Fine[];
  role: "admin" | "hr" | "employee";
  companyName?: string;
  selectedBranch?: string;
  customLeaveTypes?: string[];
  showLeaveCount?: boolean;
  timingSettings?: {
    clockInTime?: string;
    clockOutTime?: string;
    lateThreshold?: string;
    breakStartTime?: string;
    breakEndTime?: string;
  };
  branchTimingSettings?: Record<string, {
    clockInTime?: string;
    clockOutTime?: string;
    lateThreshold?: string;
    breakStartTime?: string;
    breakEndTime?: string;
  }>;
  onboardingChecklistTemplates?: ChecklistItemTemplate[];
  exitChecklistTemplates?: ChecklistItemTemplate[];
  onPunchAction?: (employeeId: string, type: "clockin" | "clockout" | "breakstart" | "breakend") => Promise<void> | void;
  onUploadChecklistDocument?: (employeeId: string, itemId: string, file: File, category?: string) => Promise<void> | void;
  onReviewChecklistItem?: (employeeId: string, itemId: string, action: "approve" | "reject", comments?: string) => Promise<void> | void;
  onCreateChecklistTemplate?: (template: { title: string; description: string; category: string; required: boolean; type: "onboarding" | "exit" }) => Promise<void> | void;
  onDeleteChecklistTemplate?: (templateId: string) => Promise<void> | void;
  onGrantExitClearance?: (employeeId: string) => Promise<void> | void;
  onInitiateResignation?: (employeeId: string) => Promise<void> | void;
  setCurrentView?: (view: string) => void;
}

export default function DashboardView({
  currentEmployee,
  employees,
  designations = [],
  holidays,
  leaves,
  payslips,
  attendance = [],
  expenses = [],
  inventory = [],
  fines = [],
  role,
  companyName = "Your Company",
  selectedBranch = "All Branches",
  customLeaveTypes,
  showLeaveCount = true,
  timingSettings,
  branchTimingSettings,
  onboardingChecklistTemplates = [],
  exitChecklistTemplates = [],
  onPunchAction,
  onUploadChecklistDocument,
  onReviewChecklistItem,
  onCreateChecklistTemplate,
  onDeleteChecklistTemplate,
  onGrantExitClearance,
  onInitiateResignation,
  setCurrentView
}: DashboardViewProps) {
  const [time, setTime] = useState<Date | null>(null);
  const [dashboardChecklistTab, setDashboardChecklistTab] = useState<"onboarding" | "exit">("onboarding");
  const [showNetPay, setShowNetPay] = useState<boolean>(false);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) {
    return null;
  }

  const formatClock = (d: Date) => {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };
  const formattedDate = time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  const formatTimeStr = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "";
    }
  };
  const todayStr = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`;
  const currentMonthStr = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}`;

  const userBranch = currentEmployee?.branch || "Main Branch";
  const activeBranchLabel = (selectedBranch && selectedBranch !== "All Branches")
    ? selectedBranch
    : (role === "hr" ? userBranch : "All Branches");

  // Filter employees according to role and branch selection
  const branchEmployees = (selectedBranch && selectedBranch !== "All Branches")
    ? employees.filter(e => (e.branch || "Main Branch") === selectedBranch)
    : (role === "hr" ? employees.filter(e => (e.branch || userBranch) === userBranch) : employees);

  // Dynamic calculations based on role
  // 1. Admin Metrics
  const adminTotalUsers = employees.length;
  const adminTotalHrs = employees.filter(e => e.role === "hr").length;
  const adminTotalEmps = employees.filter(e => e.role === "employee").length;
  const adminTodayPresent = attendance.filter(a => a.date === todayStr && (a.status === "Present" || a.status === "Late")).length;
  const adminTodayWfh = attendance.filter(a => a.date === todayStr && a.workFromHome).length;
  const adminPendingLeaves = leaves.filter(l => l.status === "Pending").length;
  const adminPendingExpenses = expenses.filter(e => e.status === "Pending").length;
  const adminTotalAssetsAssigned = inventory.filter(i => i.status === "Assigned").length;

  // 2. HR Metrics (Branch specific or Global filter)
  const hrBranchUsers = branchEmployees.length;
  const hrBranchPresentToday = attendance.filter(a => a.date === todayStr && (a.status === "Present" || a.status === "Late") && branchEmployees.some(e => e.id === a.employeeId)).length;
  const hrBranchWfhToday = attendance.filter(a => a.date === todayStr && a.workFromHome && branchEmployees.some(e => e.id === a.employeeId)).length;
  const hrBranchPendingLeaves = leaves.filter(l => l.status === "Pending" && branchEmployees.some(e => e.id === l.employeeId)).length;
  const hrBranchPendingExpenses = expenses.filter(exp => exp.status === "Pending" && branchEmployees.some(emp => emp.id === exp.employeeId)).length;

  // 3. Employee Metrics (Personal only)
  const myTodayPunch = currentEmployee ? attendance.find(a => a.employeeId === currentEmployee.id && a.date === todayStr) : undefined;
  const myPunchesThisMonth = currentEmployee ? attendance.filter(a => a.employeeId === currentEmployee.id && a.date.startsWith(currentMonthStr)) : [];
  const myPresentDays = myPunchesThisMonth.filter(p => p.status === "Present" || p.status === "Late").length;
  const myWfhDays = myPunchesThisMonth.filter(p => p.workFromHome).length;
  const myLateLogins = myPunchesThisMonth.filter(p => p.status === "Late").length;
  const myLeaves = currentEmployee ? leaves.filter(l => {
    return l.employeeId?.toLowerCase() === currentEmployee.id?.toLowerCase() ||
           (currentEmployee.code && l.employeeId?.toLowerCase() === currentEmployee.code.toLowerCase());
  }) : [];
  const myPendingLeaves = myLeaves.filter(l => l.status === "Pending").length;
  const myApprovedLeaves = myLeaves.filter(l => l.status === "Approved").length;

  // Dynamic leave balance computation matching company/branch policy
  const availableTypes = (customLeaveTypes && customLeaveTypes.length > 0)
    ? customLeaveTypes
    : ["Casual Leave|18", "Medical Leave|12", "Earned Leave|15", "Maternity/Paternity|30", "Loss of Pay|0"];

  const getConsumedLeaveDays = (typeStr: string) => {
    const cleanType = typeStr.toLowerCase().replace(/s$/, "");
    return myLeaves.filter(l => {
      if (l.status !== "Approved") return false;
      const lType = (l.leaveType || "").toLowerCase().replace(/s$/, "");
      return lType === cleanType || lType.includes(cleanType) || cleanType.includes(lType);
    }).length;
  };

  const totalAvailableLeaves = availableTypes.reduce((acc, typeStr) => {
    const name = typeStr.includes("|") ? typeStr.split("|")[0].trim() : typeStr.trim();
    let allocated = 12;
    if (typeStr.includes("|")) {
      const parsed = parseInt(typeStr.split("|")[1], 10);
      allocated = !isNaN(parsed) ? parsed : 12;
    }
    if (allocated <= 0) return acc;
    const consumed = getConsumedLeaveDays(name);
    return acc + Math.max(0, allocated - consumed);
  }, 0);

  const formatTime12h = (time24?: string) => {
    if (!time24) return "09:30 AM";
    const parts = time24.split(":");
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h)) return "09:30 AM";
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, "0")}:${String(isNaN(m) ? 0 : m).padStart(2, "0")} ${period}`;
  };

  const getBranchTiming = (branchNameOrId?: string) => {
    if (!branchNameOrId || branchNameOrId === "All Branches" || !branchTimingSettings) return null;
    return branchTimingSettings[branchNameOrId]
      || branchTimingSettings[toBranchName(branchNameOrId)]
      || branchTimingSettings[toBranchId(branchNameOrId)]
      || null;
  };

  const activeTiming = getBranchTiming(currentEmployee?.branch)
    || (selectedBranch !== "All Branches" ? getBranchTiming(selectedBranch) : null)
    || timingSettings;

  const lateThresholdDisplay = formatTime12h(activeTiming?.lateThreshold || "09:30");

  const myPayslips = (currentEmployee && payslips && payslips.length > 0)
    ? payslips.filter(p => (p.employeeId === currentEmployee.id || (currentEmployee.code && p.employeeId === currentEmployee.code)) && p.status !== "Draft")
    : [];
  const myPayslip = myPayslips.length > 0 ? myPayslips[myPayslips.length - 1] : undefined;
  const displaySalary = myPayslip ? myPayslip.netPay : null;
  const displaySalarySubtitle = myPayslip
    ? `${myPayslip.month} Payslip Issued`
    : "No payslip issued yet";
  const myAssets = currentEmployee ? inventory.filter(i => i.assignedToEmployeeId === currentEmployee.id) : [];

  // Helper to calculate days until the next occurrence of a month and day
  const getDaysUntilNextOccurrence = (dateStr: string) => {
    if (!dateStr) return null;
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const month = parseInt(match[2], 10) - 1; // 0-indexed month
    const day = parseInt(match[3], 10);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentYear = today.getFullYear();
    let nextOccur = new Date(currentYear, month, day);

    if (nextOccur < today) {
      nextOccur = new Date(currentYear + 1, month, day);
    }

    const diffTime = nextOccur.getTime() - today.getTime();
    const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      daysDiff,
      nextOccurDate: nextOccur,
      month,
      day
    };
  };

  const computedBirthdays = employees
    .filter(e => e.dateOfBirth)
    .map(emp => {
      const occurrence = getDaysUntilNextOccurrence(emp.dateOfBirth!);
      if (!occurrence) return null;

      const birthYear = new Date(emp.dateOfBirth!).getFullYear();
      const nextAge = occurrence.nextOccurDate.getFullYear() - birthYear;

      return {
        emp,
        daysDiff: occurrence.daysDiff,
        dateStr: occurrence.nextOccurDate.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        label: `Turning ${nextAge}`,
        birthYear
      };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null)
    .sort((a, b) => a.daysDiff - b.daysDiff);

  const computedAnniversaries = employees
    .filter(e => e.joiningDate)
    .map(emp => {
      const occurrence = getDaysUntilNextOccurrence(emp.joiningDate);
      if (!occurrence) return null;

      const joinYear = new Date(emp.joiningDate).getFullYear();
      const nextAnniversaryYears = occurrence.nextOccurDate.getFullYear() - joinYear;

      if (nextAnniversaryYears <= 0) return null;

      const getOrdinal = (n: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };

      return {
        emp,
        daysDiff: occurrence.daysDiff,
        dateStr: occurrence.nextOccurDate.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        label: `${getOrdinal(nextAnniversaryYears)} Anniversary`,
        years: nextAnniversaryYears
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)
    .sort((a, b) => a.daysDiff - b.daysDiff);

  const getDesignationTitle = (id?: string) => {
    if (!id) return "";
    const found = designations?.find(d => d.id === id);
    return found ? found.title : "";
  };

  const getMilestoneIcon = (years: number) => {
    if (years >= 5) return "🥇";
    if (years >= 3) return "🏆";
    return "⭐";
  };

  const getBranchFilteredTemplates = (tmpls: ChecklistItemTemplate[] = []) => {
    const targetBranch = currentEmployee?.branch || selectedBranch;
    if (!targetBranch || targetBranch === "All Branches" || targetBranch === "All") return tmpls;
    const bName = toBranchName(targetBranch).toLowerCase();
    const bId = toBranchId(targetBranch);
    return tmpls.filter(t => {
      if (!t.branch || t.branch === "All Branches") return true;
      const tName = toBranchName(t.branch).toLowerCase();
      const tId = toBranchId(t.branch);
      return tName === bName || tId === bId || t.branch.toLowerCase() === targetBranch.toLowerCase();
    });
  };

  return (
    <div className="space-y-6">

      {/* Welcome & Clock Header Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Customized Banner based on Role */}
        <div id="welcome-banner" className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-linear-to-r from-emerald-600 via-emerald-700 to-teal-800 p-6 text-white shadow-md dark:shadow-emerald-950/40 dark:neon-glow">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-emerald-400/20 rounded-full blur-xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
            <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full w-fit max-w-full overflow-hidden">
              <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse shrink-0" />
              <span className="text-xs font-semibold tracking-wider uppercase text-emerald-100 truncate">
                {role === "admin" ? `${companyName} System Administrator Portal` : role === "hr" ? `${companyName} Branch Management Desk (${userBranch})` : `${companyName} Employee Workspace`}
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight leading-none mb-2">
                Welcome back, {currentEmployee?.fullName || "User"}!
              </h1>
              <p className="text-emerald-100 text-sm max-w-lg leading-relaxed">
                {role === "admin" && "Executive Overview: Monitoring company-wide attendance, HR rosters, payroll metrics, and infrastructure security."}
                {role === "hr" && `Branch HR Overview: Managing talent, branch attendance, onboarding, and leaves for ${userBranch}.`}
                {role === "employee" && "Personal Overview: Access your shift punches, monthly attendance metrics, leave balances, and payslips."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-4 pt-2">
              <div className="bg-white/10 backdrop-blur-xs px-3 sm:px-4 py-2 rounded-xl text-xs min-w-0">
                <span className="block text-emerald-200">Designation</span>
                <span className="font-semibold truncate block max-w-[120px] sm:max-w-none">{getDesignationTitle(currentEmployee?.designationId)}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs px-3 sm:px-4 py-2 rounded-xl text-xs">
                <span className="block text-emerald-200">Clearance &amp; Role</span>
                <span className="font-semibold uppercase tracking-wider text-emerald-300 font-mono">{role}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs px-3 sm:px-4 py-2 rounded-xl text-xs min-w-0">
                <span className="block text-emerald-200">Branch Office</span>
                <span className="font-semibold truncate block max-w-[120px] sm:max-w-none">{userBranch}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Desk Widget */}
        <div id="weather-card" className="rounded-2xl bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] p-5 flex flex-col justify-between shadow-xs dark:neon-glow">
          <div className="flex items-center justify-between mb-3">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-gray-300">{userBranch} Desk</h2>
              <p className="text-xs text-slate-400 dark:text-gray-500">{formattedDate}</p>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider">
              {role === "admin" ? "Admin" : role === "hr" ? "HR" : "Employee"}
            </span>
          </div>

          <div className="border-t border-slate-100 dark:border-[#1a1a1a] pt-3">
            {/* Clock In / Clock Out Section visible for all roles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-gray-400">Shift Status:</span>
                <span className={`font-bold px-2.5 py-0.5 rounded-full uppercase text-[10px] ${myTodayPunch?.clockOut ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" :
                  myTodayPunch ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 animate-pulse" :
                    "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                  }`}>
                  {myTodayPunch?.clockOut ? "Completed" : myTodayPunch ? "Clocked In" : "Not Clocked In"}
                </span>
              </div>

              {myTodayPunch && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-gray-400 font-mono bg-slate-50 dark:bg-[#0a0a0a] px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-[#1a1a1a]">
                  <span>In: <strong className="text-slate-700 dark:text-gray-200">{formatTimeStr(myTodayPunch.clockIn)}</strong></span>
                  {myTodayPunch.clockOut && (
                    <span>Out: <strong className="text-slate-700 dark:text-gray-205">{formatTimeStr(myTodayPunch.clockOut)}</strong></span>
                  )}
                </div>
              )}

              {onPunchAction && currentEmployee && (
                <div>
                  {!myTodayPunch ? (
                    <button
                      onClick={() => onPunchAction(currentEmployee.id, "clockin")}
                      className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Clock In Now</span>
                    </button>
                  ) : !myTodayPunch.clockOut ? (
                    <button
                      onClick={() => onPunchAction(currentEmployee.id, "clockout")}
                      className="w-full flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all shadow-md shadow-rose-600/10 cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Clock Out Shift</span>
                    </button>
                  ) : (
                    <div className="text-center text-[11px] text-emerald-600 dark:text-emerald-400 font-medium py-1">
                      ✓ Excellent! Shift completed for today.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ROLE-BASED DASHBOARD CONTENT BENTO */}

      {/* 1. ADMIN DASHBOARD VIEW */}
      {role === "admin" && (
        <div className="space-y-6">
          {/* Top Dynamic Stat Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <div
              onClick={() => setCurrentView?.("directory")}
              className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Company Roster</span>
                <Users className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-3xl font-extrabold text-slate-800 dark:text-white font-mono">{adminTotalUsers}</p>
              <p className="text-xs text-slate-400 mt-1">{adminTotalHrs} HR Staff • {adminTotalEmps} Employees</p>
            </div>

            <div
              onClick={() => setCurrentView?.("attendance")}
              className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Attendance Today</span>
                <Clock className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{adminTodayPresent}</p>
              <p className="text-xs text-slate-400 mt-1">{adminTodayWfh} Work From Home</p>
            </div>

            <div
              onClick={() => setCurrentView?.("leaves")}
              className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow cursor-pointer hover:border-amber-500 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Pending Approvals</span>
                <ShieldAlert className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-3xl font-extrabold text-amber-500 font-mono">{adminPendingLeaves + adminPendingExpenses}</p>
              <p className="text-xs text-slate-400 mt-1">{adminPendingLeaves} Leaves • {adminPendingExpenses} Expenses</p>
            </div>

            <div
              onClick={() => setCurrentView?.("inventory")}
              className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Allocated Assets</span>
                <Package className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-3xl font-extrabold text-indigo-500 font-mono">{adminTotalAssetsAssigned}</p>
              <p className="text-xs text-slate-400 mt-1">Hardware inventory items</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. HR DASHBOARD VIEW */}
      {role === "hr" && (
        <div className="space-y-6">
          {/* HR Branch Stat Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => setCurrentView?.("directory")}
              className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Branch Staff</span>
                <Users className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-3xl font-extrabold text-slate-800 dark:text-white font-mono">{hrBranchUsers}</p>
              <p className="text-xs text-slate-400 mt-1">{userBranch} Employees</p>
            </div>

            <div
              onClick={() => setCurrentView?.("attendance")}
              className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Branch Present</span>
                <Clock className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{hrBranchPresentToday}</p>
              <p className="text-xs text-slate-400 mt-1">{hrBranchWfhToday} WFH Logs</p>
            </div>

            <div
              onClick={() => setCurrentView?.("leaves")}
              className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow cursor-pointer hover:border-amber-500 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Pending Branch Leaves</span>
                <ShieldAlert className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-3xl font-extrabold text-amber-500 font-mono">{hrBranchPendingLeaves}</p>
              <p className="text-xs text-slate-400 mt-1">Awaiting HR review</p>
            </div>

            <div
              onClick={() => setCurrentView?.("expenses")}
              className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow cursor-pointer hover:border-teal-500 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">Branch Expense Claims</span>
                <IndianRupee className="w-4 h-4 text-teal-500 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-3xl font-extrabold text-teal-600 font-mono">{hrBranchPendingExpenses}</p>
              <p className="text-xs text-slate-400 mt-1">Claims submitted</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. EMPLOYEE PERSONAL DASHBOARD VIEW */}
      {role === "employee" && (
        <div className="space-y-6">
          {/* Employee Personal Bento Stat Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <div
              onClick={() => setCurrentView?.("attendance")}
              className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">My Present Days</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{myPresentDays}</p>
              <p className="text-xs text-slate-400 mt-1">{myWfhDays} Work From Home (WFH)</p>
            </div>

            <div
              onClick={() => setCurrentView?.("attendance")}
              className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow cursor-pointer hover:border-amber-500 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">My Late Logins</span>
                <Clock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-3xl font-extrabold text-amber-500 font-mono">{myLateLogins}</p>
              <p className="text-xs text-slate-400 mt-1">Logins after {lateThresholdDisplay}</p>
            </div>

            <div
              onClick={() => setCurrentView?.("leaves")}
              className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {showLeaveCount ? "Leave Balance" : "Pending Leaves"}
                </span>
                <Calendar className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-3xl font-extrabold text-indigo-500 font-mono">
                {showLeaveCount ? `${totalAvailableLeaves} Days` : `${myPendingLeaves} Req`}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{myApprovedLeaves} approved</span>
                <span className="mx-1.5 text-slate-300 dark:text-slate-600">•</span>
                <span>{myPendingLeaves} pending</span>
              </p>
            </div>

            <div
              className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow hover:border-teal-500 hover:shadow-md transition-all group select-none flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                  <span className="font-bold uppercase tracking-wider group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">Net Monthly Pay</span>
                  <div className="flex items-center space-x-1.5">
                    {displaySalary !== null && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowNetPay(!showNetPay);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] transition-all cursor-pointer"
                        title={showNetPay ? "Hide Amount" : "Click to view Amount"}
                      >
                        {showNetPay ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-teal-500" />}
                      </button>
                    )}
                    <IndianRupee className="w-4 h-4 text-teal-500 group-hover:scale-110 transition-transform" />
                  </div>
                </div>

                <div
                  onClick={() => {
                    if (displaySalary !== null) {
                      setShowNetPay(!showNetPay);
                    }
                  }}
                  className="cursor-pointer flex items-center justify-between py-0.5"
                  title={displaySalary !== null ? (showNetPay ? "Click to mask amount" : "Click to reveal amount") : undefined}
                >
                  <p className="text-2xl font-extrabold text-slate-800 dark:text-white font-mono tracking-tight flex items-center gap-1">
                    {displaySalary !== null ? (
                      showNetPay ? (
                        `₹ ${displaySalary.toLocaleString('en-IN')}`
                      ) : (
                        <span className="font-mono tracking-widest text-slate-400 dark:text-gray-400 flex items-center text-xl">
                          ₹ <span className="tracking-widest ml-1 font-bold">••••••</span>
                        </span>
                      )
                    ) : (
                      "—"
                    )}
                  </p>
                  {displaySalary !== null && (
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800/40">
                      {showNetPay ? "Visible" : "Click to reveal"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-50 dark:border-[#161616]">
                <p className={`text-xs font-semibold ${displaySalary !== null ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-gray-500"}`}>
                  {displaySalarySubtitle}
                </p>
                {displaySalary !== null && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentView?.("payroll");
                    }}
                    className="text-[11px] text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 font-medium underline underline-offset-2 cursor-pointer"
                  >
                    View Slip
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Upper Insights Grid: Holidays & Assets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* Upcoming Holidays Card */}
        <div id="holidays-card" className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow flex flex-col justify-between min-h-[220px]">
          <div className="flex items-center justify-between mb-2 border-b border-slate-50 dark:border-[#1a1a1a] pb-2">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <h4 className="font-display font-semibold text-slate-800 dark:text-white">Upcoming Holidays</h4>
            </div>
            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">2026</span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
            {holidays
              .filter(h => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return new Date(h.date) >= today;
              })
              .slice(0, 3)
              .map(holiday => (
                <div key={holiday.id} className="flex items-center justify-between text-xs p-1 hover:bg-slate-50 dark:hover:bg-[#1a1a1a]/50 rounded-lg transition-colors">
                  <div>
                    <p className="font-semibold text-slate-700 dark:text-gray-300">{holiday.name}</p>
                    <p className="text-[10px] text-slate-400 dark:text-gray-500">{holiday.type} Holiday</p>
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-[#1a1a1a] px-2 py-0.5 rounded-md">
                    {new Date(holiday.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Assets / Onboarding Summary */}
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow flex flex-col justify-between min-h-[220px]">
          <div className="flex items-center justify-between mb-2 border-b border-slate-50 dark:border-[#1a1a1a] pb-2">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-teal-500" />
              <h4 className="font-display font-semibold text-slate-800 dark:text-white">
                {role === "employee" ? "My Hardware Assets" : "Corporate Assets"}
              </h4>
            </div>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
            {(role === "employee" ? myAssets : inventory).slice(0, 2).map((item) => (
              <div key={item.id} className="flex items-center justify-between text-xs p-1.5 bg-slate-50/50 dark:bg-[#0a0a0a]/50 rounded-xl">
                <div>
                  <p className="font-bold text-slate-700 dark:text-gray-300">{item.name}</p>
                  <p className="text-[10px] font-mono text-slate-400">{item.serialNumber}</p>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-md">
                  {item.status}
                </span>
              </div>
            ))}
            {(role === "employee" ? myAssets : inventory).length === 0 && (
              <p className="text-xs text-slate-400 italic">No assigned assets.</p>
            )}
          </div>
        </div>

      </div>

      {/* Lower Insights Grid: Birthdays & Anniversaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
        {/* Upcoming Birthdays Card */}
        <div id="birthdays-card" className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl shadow-xs dark:neon-glow flex flex-col overflow-hidden min-h-[460px]">
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 text-center text-white relative flex flex-col items-center justify-center select-none shrink-0 min-h-[260px] h-[260px]">
            <h4 className="font-display font-black text-lg tracking-wide uppercase text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 to-teal-50">
              Upcoming Birthday
            </h4>

            {computedBirthdays.length > 0 ? (
              <>
                <p className="text-[11px] font-bold text-amber-300 mt-1">
                  Coming up on {computedBirthdays[0].dateStr}!
                </p>
                <div className="flex flex-col items-center mt-4">
                  <img
                    src={computedBirthdays[0].emp.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop"}
                    alt={computedBirthdays[0].emp.fullName}
                    className="w-14 h-14 rounded-full border-2 border-emerald-400/80 object-cover shadow-md"
                  />
                  <p className="text-[12px] font-extrabold mt-2 text-emerald-50">
                    {computedBirthdays[0].emp.fullName}
                  </p>
                  <p className="text-[9px] text-emerald-200/80 mt-0.5">
                    {getDesignationTitle(computedBirthdays[0].emp.designationId)}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-xs text-emerald-300 mt-2 italic">No upcoming birthdays.</p>
            )}
          </div>

          {/* List Section */}
          <div className="bg-white dark:bg-[#0f0f0f] p-4 flex-1 flex flex-col justify-between rounded-b-2xl">
            <div>
              <div className="flex items-center space-x-1.5 text-slate-500 dark:text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-2 pb-1.5 border-b border-slate-50 dark:border-[#1a1a1a]">
                <Gift className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
                <span>Other Upcoming Birthdays</span>
              </div>

              <div className="space-y-2 max-h-[190px] overflow-y-auto custom-scrollbar pr-1">
                {computedBirthdays.slice(1, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1.5 hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a]/30 rounded-xl px-1.5 transition-all">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <img
                        src={item.emp.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop"}
                        alt={item.emp.fullName}
                        className="w-8 h-8 rounded-full border border-slate-100 dark:border-gray-800 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-700 dark:text-gray-250 truncate">
                          {item.emp.fullName}
                        </p>
                        <p className="text-[9px] text-slate-400 dark:text-gray-500 truncate mt-0.5">
                          {item.dateStr} • {item.label}
                        </p>
                        <p className="text-[9px] text-pink-650 dark:text-pink-400 font-medium truncate mt-0.5">
                          {getDesignationTitle(item.emp.designationId)}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <Cake className="w-3.5 h-3.5 text-pink-500/80" />
                    </div>
                  </div>
                ))}
                {computedBirthdays.length <= 1 && (
                  <p className="text-[10px] text-slate-400 dark:text-gray-500 italic py-2 text-center">No other upcoming birthdays.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Anniversaries Card */}
        <div id="anniversaries-card" className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl shadow-xs dark:neon-glow flex flex-col overflow-hidden min-h-[460px]">
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 text-center text-white relative flex flex-col items-center select-none shrink-0 min-h-[260px] h-[260px]">
            {/* Legend */}
            <div className="flex items-center justify-center space-x-3 text-[9px] font-bold text-emerald-250 bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-800/30 mb-3">
              <span className="flex items-center"><span className="mr-0.5">⭐</span> 1-3 Years</span>
              <span className="flex items-center"><span className="mr-0.5">🏆</span> 3-5 Years</span>
              <span className="flex items-center"><span className="mr-0.5">🥇</span> 5+ Years</span>
            </div>

            <h4 className="font-display font-black text-lg tracking-wide uppercase text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 to-teal-50">
              Upcoming Work Anniversaries
            </h4>
            <p className="text-[10px] text-emerald-200/95 mt-1 max-w-[280px] leading-relaxed">
              🌟 A milestone is approaching as we prepare to celebrate a work anniversary at <span className="font-bold text-amber-300">{companyName || 'CodeVamp'}</span>. 🌟
            </p>

            {/* Featured Anniversaries (Top 2 closest) */}
            <div className="flex justify-center items-center space-x-8 mt-4 w-full">
              {computedAnniversaries.slice(0, 2).map((item, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className="relative">
                    <img
                      src={item.emp.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop"}
                      alt={item.emp.fullName}
                      className="w-14 h-14 rounded-full border-2 border-emerald-400/80 object-cover shadow-md"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-950 border border-emerald-800/60 rounded-full flex items-center justify-center text-[10px]">
                      {getMilestoneIcon(item.years)}
                    </div>
                  </div>
                  <p className="text-[11px] font-extrabold mt-2 text-emerald-50 flex items-center">
                    {item.emp.fullName.split(" ")[0]} {getMilestoneIcon(item.years)}
                  </p>
                  <p className="text-[9px] text-emerald-200/80 font-medium mt-0.5">
                    {item.dateStr} • Completing {item.years} year{item.years > 1 ? 's' : ''}
                  </p>
                </div>
              ))}
              {computedAnniversaries.length === 0 && (
                <div className="py-4 text-center text-emerald-300/80 text-xs italic">
                  No upcoming milestones.
                </div>
              )}
            </div>
          </div>

          {/* List Section */}
          <div className="bg-white dark:bg-[#0f0f0f] p-4 flex-1 flex flex-col justify-between rounded-b-2xl">
            <div>
              <div className="flex items-center space-x-1.5 text-slate-500 dark:text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-2 pb-1.5 border-b border-slate-50 dark:border-[#1a1a1a]">
                <Briefcase className="w-3.5 h-3.5 text-violet-500" />
                <span>Other Work Anniversaries</span>
              </div>

              <div className="space-y-2 max-h-[190px] overflow-y-auto custom-scrollbar pr-1">
                {computedAnniversaries.slice(2, 6).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1.5 hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a]/30 rounded-xl px-1.5 transition-all">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <img
                        src={item.emp.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop"}
                        alt={item.emp.fullName}
                        className="w-8 h-8 rounded-full border border-slate-100 dark:border-gray-800 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-700 dark:text-gray-200 truncate flex items-center">
                          {item.emp.fullName}
                          <span className="ml-1 text-[9px]">{getMilestoneIcon(item.years)}</span>
                        </p>
                        <p className="text-[9px] text-slate-400 dark:text-gray-500 truncate mt-0.5">
                          {item.emp.joiningDate && new Date(item.emp.joiningDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • Completing {item.years} year{item.years > 1 ? 's' : ''}
                        </p>
                        <p className="text-[9px] text-violet-600 dark:text-violet-400 font-medium truncate mt-0.5">
                          {getDesignationTitle(item.emp.designationId)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {computedAnniversaries.length <= 2 && (
                  <p className="text-[10px] text-slate-400 dark:text-gray-500 italic py-2 text-center">No other upcoming anniversaries.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding & Exit Document Checklists Section with Toggle Switch */}
      {currentEmployee && (() => {
        const isExitDoc = (doc: any) => {
          const cat = (doc.category || "").toLowerCase();
          const name = (doc.name || "").toLowerCase();
          return (
            cat.includes("exit") ||
            cat.includes("resignation") ||
            cat.includes("separation") ||
            cat.includes("no dues") ||
            cat.includes("asset handover") ||
            name.includes("(exit)") ||
            name.includes("resignation") ||
            name.includes("no dues") ||
            name.includes("exit clearance") ||
            name.includes("clearance")
          );
        };

        const getDynamicVaultDocs = (emp: any, isExit: boolean) => {
          const checklist = isExit ? (emp?.exitChecklist || []) : (emp?.onboardingChecklist || []);
          const templates = isExit ? exitChecklistTemplates : onboardingChecklistTemplates;
          const rawDocs = (emp?.documents || []).filter((doc: any) => isExit ? isExitDoc(doc) : !isExitDoc(doc));
          
          const map = new Map<string, any>();

          // 1. Add strictly APPROVED checklist items
          checklist.forEach((item: any) => {
            if (item.fileUrl && item.status === "Approved") {
              const tmpl = (templates || []).find((t: any) => t.id === item.templateId || t.id === item.id);
              let cleanName = tmpl?.title || item.title || "Document";
              if (cleanName.startsWith("onb-tmpl-") || cleanName.startsWith("exit-tmpl-")) {
                cleanName = tmpl?.title || (isExit ? "Exit Clearance Document" : "Onboarding Document");
              }
              cleanName = cleanName.replace(/\s*\(Onboarding\)/gi, "").replace(/\s*\(Exit\)/gi, "");

              const key = cleanName.trim().toLowerCase();
              map.set(key, {
                id: `chk-${item.id}`,
                name: cleanName,
                category: isExit ? "Employee Exit & Separation Clearance Checklist" : "Onboarding Document Checklist",
                uploadedAt: item.uploadedAt || new Date().toISOString().split("T")[0],
                approvedAt: item.reviewedAt || new Date().toISOString().split("T")[0],
                reviewedBy: item.reviewedBy || "HR Manager",
                size: "1.2 MB",
                fileUrl: item.fileUrl
              });
            }
          });

          // 2. Add raw documents ONLY if they have explicit HR approval AND no pending checklist item
          rawDocs.forEach((d: any) => {
            const isApprovedDoc = Boolean(d.approvedAt || d.status === "Approved");
            if (!isApprovedDoc) return; // Exclude unapproved raw documents!

            const docName = (d.name || "").trim().toLowerCase();
            const matchingChecklistItem = checklist.find((item: any) => {
              const itemTitle = (item.title || "").trim().toLowerCase();
              const tmpl = (templates || []).find((t: any) => t.id === item.templateId || t.id === item.id);
              const tmplTitle = (tmpl?.title || "").trim().toLowerCase();
              return docName.includes(itemTitle) || itemTitle.includes(docName) || (tmplTitle && (docName.includes(tmplTitle) || tmplTitle.includes(docName)));
            });

            // If there's a checklist item for this requirement and it's NOT approved, DO NOT show in vault!
            if (matchingChecklistItem && matchingChecklistItem.status !== "Approved") {
              return;
            }

            // If not already in map from an approved checklist item, add it
            const matchingApprovedInMap = Array.from(map.keys()).some(k => docName.includes(k) || k.includes(docName));
            if (!matchingApprovedInMap) {
              map.set(docName, d);
            }
          });

          return Array.from(map.values());
        };

        const onboardingDocs = getDynamicVaultDocs(currentEmployee, false);
        const exitDocs = getDynamicVaultDocs(currentEmployee, true);

        const dynamicOnboardingSubtitle = onboardingChecklistTemplates && onboardingChecklistTemplates.length > 0
          ? onboardingChecklistTemplates.map(t => t.title).join(", ")
          : "Aadhaar, PAN, contracts, tax forms & clearance logs";

        const dynamicExitSubtitle = exitChecklistTemplates && exitChecklistTemplates.length > 0
          ? exitChecklistTemplates.map(t => t.title).join(", ")
          : "Resignation copy, no-dues certificate, asset handover & exit logs";

        return (
          <div className="space-y-4 w-full">
            {/* Header & Toggle Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f0f0f] p-4 rounded-2xl border border-slate-200 dark:border-[#222] shadow-xs">
              <div className="flex items-center space-x-3 min-w-0">
                <div className={`p-2.5 rounded-xl text-white font-bold shrink-0 ${dashboardChecklistTab === "exit" ? "bg-gradient-to-r from-amber-500 to-orange-600" : "bg-gradient-to-r from-emerald-500 to-teal-600"}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-extrabold text-slate-800 dark:text-white text-sm sm:text-base lg:text-lg leading-tight">
                    {dashboardChecklistTab === "exit" ? "Exit & Separation Checklist" : "Onboarding Document Checklist"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 hidden sm:block">
                    {dashboardChecklistTab === "exit"
                      ? "Exit separation requirements paired with approved exit document vault"
                      : "Mandatory employee KYC requirements paired with approved onboarding document vault"}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-[#2a2a2a] shrink-0 w-full sm:w-auto sm:flex sm:items-center">
                <button
                  type="button"
                  onClick={() => setDashboardChecklistTab("onboarding")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center ${
                    dashboardChecklistTab === "onboarding"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Onboarding
                </button>
                <button
                  type="button"
                  onClick={() => setDashboardChecklistTab("exit")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center ${
                    dashboardChecklistTab === "exit"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Exit Clearance
                </button>
              </div>
            </div>

            {/* 2-Column Paired Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
              {dashboardChecklistTab === "onboarding" ? (
                <>
                  <ChecklistCard
                    type="onboarding"
                    employee={currentEmployee}
                    templates={getBranchFilteredTemplates(onboardingChecklistTemplates)}
                    currentUserRole={role}
                    currentUserId={currentEmployee.id}
                    onCreateTemplate={onCreateChecklistTemplate}
                    onDeleteTemplate={onDeleteChecklistTemplate}
                    onUploadDocument={async (empId, itemId, file, category) => {
                      if (onUploadChecklistDocument) await onUploadChecklistDocument(empId, itemId, file, category);
                    }}
                    onReviewItem={async (empId, itemId, action, comments) => {
                      if (onReviewChecklistItem) await onReviewChecklistItem(empId, itemId, action, comments);
                    }}
                  />

                  {/* Onboarding Vault Card */}
                  <div className="bg-gradient-to-br from-emerald-500/5 via-white to-teal-500/5 dark:from-[#081b14] dark:via-[#0f0f0f] dark:to-[#091618] border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl p-5 shadow-md dark:shadow-black/40 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4 border-b border-emerald-100 dark:border-emerald-950/60 pb-3 gap-2">
                        <div className="flex items-start space-x-3 min-w-0 flex-1">
                          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 rounded-xl shrink-0 mt-0.5 shadow-2xs">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-base truncate">
                              Onboarding Document Checklist
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-gray-400 truncate" title={dynamicOnboardingSubtitle}>
                              {dynamicOnboardingSubtitle}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="max-h-[500px] overflow-y-auto pr-1.5 custom-scrollbar">
                        <div className="grid grid-cols-1 gap-3">
                          {onboardingDocs.map((doc: any) => {
                            const cleanName = (doc.name || "").replace(/\s*\(Onboarding\)/gi, "").replace(/\s*\(Exit\)/gi, "");
                            const matchingItem = ((currentEmployee?.onboardingChecklist as any[]) || [])
                              .concat((currentEmployee?.exitChecklist as any[]) || [])
                              .find(i => (i.title && i.title.trim().toLowerCase() === cleanName.trim().toLowerCase()) || i.id === doc.id);
                            const uploadDate = doc.uploadedAt || matchingItem?.uploadedAt;
                            const approveDate = doc.approvedAt || matchingItem?.reviewedAt;

                            return (
                              <div key={doc.id} className="p-3.5 bg-white/90 dark:bg-[#0a0a0a]/90 border border-emerald-100 dark:border-[#1a1a1a] rounded-2xl flex items-center justify-between text-xs space-x-3 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-800 transition-all hover:shadow-xs">
                                <div className="flex items-center space-x-3 min-w-0 flex-1">
                                  <div className="p-2.5 bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 rounded-xl shrink-0">
                                    <FileText className="w-4.5 h-4.5" />
                                  </div>
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <p className="font-extrabold text-slate-800 dark:text-gray-200 truncate text-xs sm:text-sm" title={cleanName}>
                                      {cleanName}
                                    </p>
                                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 inline-block whitespace-nowrap">
                                        Approved Vault Document
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2.5 flex-wrap gap-y-1 text-[11px] font-medium text-slate-500 dark:text-gray-400 pt-0.5">
                                      {uploadDate && (
                                        <span className="inline-flex items-center space-x-1 text-slate-600 dark:text-gray-300">
                                          <Clock className="w-3 h-3 text-blue-500 shrink-0" />
                                          <span>Uploaded: {uploadDate.includes("T") ? new Date(uploadDate).toLocaleDateString() : uploadDate}</span>
                                        </span>
                                      )}
                                      {approveDate && (
                                        <span className="inline-flex items-center space-x-1 text-emerald-700 dark:text-emerald-400 font-bold">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                          <span>Approved: {approveDate.includes("T") ? new Date(approveDate).toLocaleDateString() : approveDate}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {onboardingDocs.length === 0 && (
                            <p className="col-span-full text-xs text-slate-400 dark:text-gray-500 text-center py-8 bg-white/40 dark:bg-[#0a0a0a]/30 rounded-2xl border border-dashed border-emerald-200/60 dark:border-emerald-950">
                              No approved onboarding compliance documents in vault yet.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <ChecklistCard
                    type="exit"
                    employee={currentEmployee}
                    templates={getBranchFilteredTemplates(exitChecklistTemplates)}
                    currentUserRole={role}
                    currentUserId={currentEmployee.id}
                    onCreateTemplate={onCreateChecklistTemplate}
                    onDeleteTemplate={onDeleteChecklistTemplate}
                    onUploadDocument={async (empId, itemId, file, category) => {
                      if (onUploadChecklistDocument) await onUploadChecklistDocument(empId, itemId, file, category);
                    }}
                    onReviewItem={async (empId, itemId, action, comments) => {
                      if (onReviewChecklistItem) await onReviewChecklistItem(empId, itemId, action, comments);
                    }}
                    onGrantExitClearance={async (empId) => {
                      if (onGrantExitClearance) await onGrantExitClearance(empId);
                    }}
                    onInitiateResignation={async (empId) => {
                      if (onInitiateResignation) await onInitiateResignation(empId);
                    }}
                  />

                  {/* Exit Vault Card */}
                  <div className="bg-gradient-to-br from-amber-500/10 via-white to-orange-500/10 dark:from-[#1f1508] dark:via-[#0f0f0f] dark:to-[#1a0f05] border border-amber-300/80 dark:border-amber-900/60 rounded-2xl p-5 shadow-md dark:shadow-black/40 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4 border-b border-amber-100 dark:border-amber-950/60 pb-3 gap-2">
                        <div className="flex items-start space-x-3 min-w-0 flex-1">
                          <div className="p-2.5 bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 rounded-xl shrink-0 mt-0.5 shadow-2xs">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-base truncate">
                              Employee Exit &amp; Separation Clearance Checklist
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                              Resignation copy, no-dues certificate, asset handover &amp; exit logs
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="max-h-[500px] overflow-y-auto pr-1.5 custom-scrollbar">
                        <div className="grid grid-cols-1 gap-3">
                          {exitDocs.map((doc: any) => {
                            const cleanName = (doc.name || "").replace(/\s*\(Onboarding\)/gi, "").replace(/\s*\(Exit\)/gi, "");
                            const matchingItem = ((currentEmployee?.onboardingChecklist as any[]) || [])
                              .concat((currentEmployee?.exitChecklist as any[]) || [])
                              .find(i => (i.title && i.title.trim().toLowerCase() === cleanName.trim().toLowerCase()) || i.id === doc.id);
                            const uploadDate = doc.uploadedAt || matchingItem?.uploadedAt;
                            const approveDate = doc.approvedAt || matchingItem?.reviewedAt;

                            return (
                              <div key={doc.id} className="p-3.5 bg-white/90 dark:bg-[#0a0a0a]/90 border border-amber-100 dark:border-[#1a1a1a] rounded-2xl flex items-center justify-between text-xs space-x-3 shadow-2xs hover:border-amber-300 dark:hover:border-amber-800 transition-all hover:shadow-xs">
                                <div className="flex items-center space-x-3 min-w-0 flex-1">
                                  <div className="p-2.5 bg-amber-100/80 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 rounded-xl shrink-0">
                                    <FileText className="w-4.5 h-4.5" />
                                  </div>
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <p className="font-extrabold text-slate-800 dark:text-gray-200 truncate text-xs sm:text-sm" title={cleanName}>
                                      {cleanName}
                                    </p>
                                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 inline-block whitespace-nowrap">
                                        Approved Exit Clearance
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2.5 flex-wrap gap-y-1 text-[11px] font-medium text-slate-500 dark:text-gray-400 pt-0.5">
                                      {uploadDate && (
                                        <span className="inline-flex items-center space-x-1 text-slate-600 dark:text-gray-300">
                                          <Clock className="w-3 h-3 text-blue-500 shrink-0" />
                                          <span>Uploaded: {uploadDate.includes("T") ? new Date(uploadDate).toLocaleDateString() : uploadDate}</span>
                                        </span>
                                      )}
                                      {approveDate && (
                                        <span className="inline-flex items-center space-x-1 text-emerald-700 dark:text-emerald-400 font-bold">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                          <span>Approved: {approveDate.includes("T") ? new Date(approveDate).toLocaleDateString() : approveDate}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {exitDocs.length === 0 && (
                            <p className="col-span-full text-xs text-slate-400 dark:text-gray-500 text-center py-8 bg-white/40 dark:bg-[#0a0a0a]/30 rounded-2xl border border-dashed border-amber-200/60 dark:border-amber-950">
                              No uploaded exit &amp; separation clearance documents yet.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Leave Status Monitoring Row (Filtered by Role) */}
      <div id="leaves-summary-row" className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 sm:p-5 shadow-xs dark:neon-glow">
        <div className="flex items-start sm:items-center justify-between mb-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a] gap-2">
          <div className="min-w-0">
            <h4 className="font-display font-semibold text-slate-800 dark:text-white text-sm sm:text-md">
              {role === "admin" ? "Company Leave Tracker" : role === "hr" ? `Branch Leave Tracker (${userBranch})` : "My Leave Requests"}
            </h4>
            <p className="text-xs text-slate-400 dark:text-gray-400 hidden sm:block">
              {role === "employee" ? "Track your submitted casual and medical leave requests" : "Review status of submitted employee leave applications"}
            </p>
          </div>
          {role !== "employee" && (
            <span className="text-xs bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 font-bold px-2.5 py-1 rounded-full flex items-center shrink-0">
              <ShieldAlert className="w-3.5 h-3.5 mr-1" />
              {role === "admin" ? adminPendingLeaves : hrBranchPendingLeaves} Pending
            </span>
          )}
        </div>

        {/* Mobile card view */}
        <div className="sm:hidden space-y-3">
          {(role === "admin"
            ? leaves
            : role === "hr"
              ? leaves.filter(l => branchEmployees.some(e => e.id === l.employeeId))
              : myLeaves
          )
            .slice()
            .sort((a, b) => {
              const dateA = new Date(a.appliedDate || a.startDate || 0).getTime();
              const dateB = new Date(b.appliedDate || b.startDate || 0).getTime();
              if (dateB !== dateA) return dateB - dateA;
              return (b.id || "").localeCompare(a.id || "");
            })
            .slice(0, 5).map(leave => {
              const matchedEmp = employees.find(e => e.id === leave.employeeId);
              const empName = (matchedEmp && matchedEmp.fullName)
                ? matchedEmp.fullName
                : (leave.employeeName && !leave.employeeName.startsWith("Employee EMP-") && !leave.employeeName.startsWith("Employee "))
                  ? leave.employeeName
                  : (matchedEmp?.fullName || leave.employeeId || "Employee");
              const statusVal = leave.status || "Pending";
              return (
                <div key={leave.id || `lvr-mob-${Math.random()}`} className="bg-slate-50 dark:bg-[#0a0a0a] rounded-xl p-3 border border-slate-100 dark:border-[#1a1a1a] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-[#1a1a1a] flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                        {empName.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-700 dark:text-gray-300 text-xs truncate">{empName}</span>
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase shrink-0 ml-1 ${statusVal === "Approved"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : statusVal === "Pending"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 animate-pulse"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                      }`}>
                      {statusVal}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-gray-400">
                    <span className="font-medium">{leave.leaveType || "Leave"}</span>
                    <span className="font-mono">{leave.startDate} → {leave.endDate}</span>
                  </div>
                  {leave.reason && (
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 truncate">{leave.reason}</p>
                  )}
                </div>
              );
            })}
          {(role === "employee" ? myLeaves : leaves).length === 0 && (
            <p className="text-center text-xs text-slate-400 italic py-4">No leave records found.</p>
          )}
        </div>

        {/* Desktop table view */}
        <div className="hidden sm:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#1a1a1a] text-slate-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Employee Name</th>
                <th className="py-2.5 px-3">Leave Category</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Applied Date</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3 text-right">Approval Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-[#1a1a1a]/50">
              {(role === "admin"
                ? leaves
                : role === "hr"
                  ? leaves.filter(l => branchEmployees.some(e => e.id === l.employeeId))
                  : myLeaves
              )
                .slice()
                .sort((a, b) => {
                  const dateA = new Date(a.appliedDate || a.startDate || 0).getTime();
                  const dateB = new Date(b.appliedDate || b.startDate || 0).getTime();
                  if (dateB !== dateA) return dateB - dateA;
                  return (b.id || "").localeCompare(a.id || "");
                })
                .slice(0, 5).map(leave => {
                  const matchedEmp = employees.find(e => e.id === leave.employeeId);
                  const empName = (matchedEmp && matchedEmp.fullName)
                    ? matchedEmp.fullName
                    : (leave.employeeName && !leave.employeeName.startsWith("Employee EMP-") && !leave.employeeName.startsWith("Employee "))
                      ? leave.employeeName
                      : (matchedEmp?.fullName || leave.employeeId || "Employee");

                  const statusVal = leave.status || "Pending";
                  return (
                    <tr key={leave.id || `lvr-${Math.random()}`} className="hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a]/30 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-700 dark:text-gray-300 flex items-center space-x-2">
                        <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center font-bold text-[9px] uppercase">
                          {empName.charAt(0)}
                        </div>
                        <span>{empName}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-gray-400 font-medium">{leave.leaveType || "Leave"}</td>
                      <td className="py-3 px-3 font-mono text-slate-500 dark:text-gray-400">
                        {leave.startDate} to {leave.endDate}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400 dark:text-gray-500">{leave.appliedDate}</td>
                      <td className="py-3 px-3 text-slate-400 dark:text-gray-500 max-w-[200px] truncate">{leave.reason}</td>
                      <td className="py-3 px-3 text-right">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${statusVal === "Approved"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : statusVal === "Pending"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 animate-pulse"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                          }`}>
                          {statusVal}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              {(role === "employee" ? myLeaves : leaves).length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400 italic">No leave records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
