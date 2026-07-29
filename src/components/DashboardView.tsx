"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, Gift, Heart, CloudSun, ShieldAlert, Sparkles, Clock, Play, Square,
  CheckCircle2, Users, FileText, AlertCircle, IndianRupee, Package, Briefcase, Home,
  Award, ChevronRight, Activity, TrendingUp, Cake
} from "lucide-react";
import { Employee, Holiday, LeaveRequest, Payslip, AttendancePunch, ExpenseClaim, InventoryItem, Fine } from "../types";

interface DashboardViewProps {
  currentEmployee: Employee;
  employees: Employee[];
  holidays: Holiday[];
  leaves: LeaveRequest[];
  payslips: Payslip[];
  attendance?: AttendancePunch[];
  expenses?: ExpenseClaim[];
  inventory?: InventoryItem[];
  fines?: Fine[];
  role: "admin" | "hr" | "employee";
  companyName?: string;
  onPunchAction?: (employeeId: string, type: "clockin" | "clockout" | "breakstart" | "breakend") => Promise<void> | void;
  setCurrentView?: (view: string) => void;
}

export default function DashboardView({
  currentEmployee,
  employees,
  holidays,
  leaves,
  payslips,
  attendance = [],
  expenses = [],
  inventory = [],
  fines = [],
  role,
  companyName = "Your Company",
  onPunchAction,
  setCurrentView
}: DashboardViewProps) {
  const [time, setTime] = useState(new Date());

  // Keep digital clock ticking
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

  const userBranch = currentEmployee?.branch || "Mumbai Branch";

  // Filter employees according to role
  const branchEmployees = employees.filter(e => (e.branch || "Mumbai Branch") === userBranch);

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

  // 2. HR Metrics (Branch specific)
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
  const myLeaves = currentEmployee ? leaves.filter(l => l.employeeId === currentEmployee.id) : [];
  const myPendingLeaves = myLeaves.filter(l => l.status === "Pending").length;
  const myPayslip = currentEmployee ? (payslips.find(p => p.employeeId === currentEmployee.id) || payslips[0]) : undefined;
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
    const map: Record<string, string> = {
      "des-1": "Managing Director",
      "des-2": "Head of Credit & Risk",
      "des-3": "HR Business Partner",
      "des-4": "Senior Loan Officer",
      "des-5": "Insurance Underwriter",
      "des-6": "Sales Relationship Manager",
      "des-7": "Collections Specialist",
      "des-8": "Compliance Officer"
    };
    return (id && map[id]) || "Specialist";
  };

  const getMilestoneIcon = (years: number) => {
    if (years >= 5) return "🥇";
    if (years >= 3) return "🏆";
    return "⭐";
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
            <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full w-fit">
              <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider uppercase text-emerald-100">
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

            <div className="flex flex-wrap gap-4 pt-2">
              <div className="bg-white/10 backdrop-blur-xs px-4 py-2 rounded-xl text-xs">
                <span className="block text-emerald-200">Designation</span>
                <span className="font-semibold">{currentEmployee?.department || "General"} Specialist</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs px-4 py-2 rounded-xl text-xs">
                <span className="block text-emerald-200">Clearance & Role</span>
                <span className="font-semibold uppercase tracking-wider text-emerald-300 font-mono">{role}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs px-4 py-2 rounded-xl text-xs">
                <span className="block text-emerald-200">Branch Office</span>
                <span className="font-semibold">{userBranch}</span>
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
                <span className={`font-bold px-2.5 py-0.5 rounded-full uppercase text-[10px] ${
                  myTodayPunch?.clockOut ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" :
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
            
            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider">Company Roster</span>
                <Users className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-3xl font-extrabold text-slate-800 dark:text-white font-mono">{adminTotalUsers}</p>
              <p className="text-xs text-slate-400 mt-1">{adminTotalHrs} HR Staff • {adminTotalEmps} Employees</p>
            </div>

            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider">Attendance Today</span>
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{adminTodayPresent}</p>
              <p className="text-xs text-slate-400 mt-1">{adminTodayWfh} Work From Home</p>
            </div>

            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider">Pending Approvals</span>
                <ShieldAlert className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-3xl font-extrabold text-amber-500 font-mono">{adminPendingLeaves + adminPendingExpenses}</p>
              <p className="text-xs text-slate-400 mt-1">{adminPendingLeaves} Leaves • {adminPendingExpenses} Expenses</p>
            </div>

            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider">Allocated Assets</span>
                <Package className="w-4 h-4 text-indigo-500" />
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
            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider">Branch Staff</span>
                <Users className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-3xl font-extrabold text-slate-800 dark:text-white font-mono">{hrBranchUsers}</p>
              <p className="text-xs text-slate-400 mt-1">{userBranch} Employees</p>
            </div>

            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider">Branch Present</span>
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{hrBranchPresentToday}</p>
              <p className="text-xs text-slate-400 mt-1">{hrBranchWfhToday} WFH Logs</p>
            </div>

            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider">Pending Branch Leaves</span>
                <ShieldAlert className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-3xl font-extrabold text-amber-500 font-mono">{hrBranchPendingLeaves}</p>
              <p className="text-xs text-slate-400 mt-1">Awaiting HR review</p>
            </div>

            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider">Branch Expense Claims</span>
                <IndianRupee className="w-4 h-4 text-teal-500" />
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
            
            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider">My Present Days</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{myPresentDays}</p>
              <p className="text-xs text-slate-400 mt-1">{myWfhDays} Work From Home (WFH)</p>
            </div>

            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider">My Late Logins</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-3xl font-extrabold text-amber-500 font-mono">{myLateLogins}</p>
              <p className="text-xs text-slate-400 mt-1">Logins after 09:30 AM</p>
            </div>

            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider">Leave Balance</span>
                <Calendar className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-3xl font-extrabold text-indigo-500 font-mono">14 Days</p>
              <p className="text-xs text-slate-400 mt-1">{myPendingLeaves} leave request pending</p>
            </div>

            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider">Net Monthly Pay</span>
                <IndianRupee className="w-4 h-4 text-teal-500" />
              </div>
              <p className="text-2xl font-extrabold text-slate-800 dark:text-white font-mono">
                ₹ {myPayslip ? myPayslip.netPay.toLocaleString('en-IN') : "65,000"}
              </p>
              <p className="text-xs text-emerald-600 mt-1 font-semibold">July 2026 Payslip Issued</p>
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

      {/* Leave Status Monitoring Row (Filtered by Role) */}
      <div id="leaves-summary-row" className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">
          <div>
            <h4 className="font-display font-semibold text-slate-800 dark:text-white text-md">
              {role === "admin" ? "Company Leave Tracker" : role === "hr" ? `Branch Leave Tracker (${userBranch})` : "My Leave Requests"}
            </h4>
            <p className="text-xs text-slate-400 dark:text-gray-400">
              {role === "employee" ? "Track your submitted casual and medical leave requests" : "Review status of submitted employee leave applications"}
            </p>
          </div>
          {role !== "employee" && (
            <span className="text-xs bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 font-bold px-3 py-1 rounded-full flex items-center">
              <ShieldAlert className="w-3.5 h-3.5 mr-1" />
              {role === "admin" ? adminPendingLeaves : hrBranchPendingLeaves} Pending
            </span>
          )}
        </div>

        <div className="overflow-x-auto custom-scrollbar">
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
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                        statusVal === "Approved" 
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
