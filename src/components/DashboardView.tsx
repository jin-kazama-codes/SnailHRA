"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, Gift, Heart, CloudSun, ShieldAlert, Sparkles, Clock, Play, Square,
  CheckCircle2, Users, FileText, AlertCircle, IndianRupee, Package, Briefcase, Home,
  Award, ChevronRight, Activity, TrendingUp
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

  // Dynamic celebrations derived from employees database catalog
  const upcomingBirthdays = employees.map(emp => {
    const joinYear = new Date(emp.joiningDate).getFullYear();
    const currentYear = time.getFullYear();
    const tenureYears = Math.max(1, currentYear - joinYear);
    return {
      name: emp.fullName,
      role: `${emp.department} • ${tenureYears} Year${tenureYears > 1 ? 's' : ''} Work Anniversary`,
      date: new Date(emp.joiningDate).toLocaleDateString([], { month: 'short', day: 'numeric' })
    };
  });

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
                {role === "admin" ? "MGM FINANCIERS PRIV LIMITED System Administrator Portal" : role === "hr" ? `MGM FINANCIERS PRIV LIMITED Branch Management Desk (${userBranch})` : "MGM FINANCIERS PRIV LIMITED Employee Workspace"}
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
            {role === "employee" && (
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
                      <span>Out: <strong className="text-slate-700 dark:text-gray-200">{formatTimeStr(myTodayPunch.clockOut)}</strong></span>
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
            )}

            {role === "hr" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold">
                  <div className="bg-slate-50 dark:bg-[#0a0a0a] p-2 rounded-xl border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="block text-slate-400">Leaves Pending</span>
                    <span className="text-xs font-bold text-amber-500 font-mono">{hrBranchPendingLeaves} Requests</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#0a0a0a] p-2 rounded-xl border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="block text-slate-400">Expenses Pending</span>
                    <span className="text-xs font-bold text-teal-500 font-mono">{hrBranchPendingExpenses} Claims</span>
                  </div>
                </div>

                {setCurrentView && (
                  <div className="space-y-1.5">
                    <button
                      onClick={() => setCurrentView("leaves")}
                      className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 dark:bg-[#1a1a1a] dark:hover:bg-[#222] text-slate-700 dark:text-gray-300 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-2 text-amber-500" /> Review Branch Leaves</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button
                      onClick={() => setCurrentView("directory")}
                      className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 dark:bg-[#1a1a1a] dark:hover:bg-[#222] text-slate-700 dark:text-gray-300 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      <span className="flex items-center"><Users className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Employee Directory</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {role === "admin" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold">
                  <div className="bg-slate-50 dark:bg-[#0a0a0a] p-2 rounded-xl border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="block text-slate-400">Total Personnel</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-gray-200 font-mono">{adminTotalUsers} Members</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#0a0a0a] p-2 rounded-xl border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="block text-slate-400">System Approvals</span>
                    <span className="text-xs font-bold text-amber-500 font-mono">{adminPendingLeaves + adminPendingExpenses} Items</span>
                  </div>
                </div>

                {setCurrentView && (
                  <div className="space-y-1.5">
                    <button
                      onClick={() => setCurrentView("configurations")}
                      className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 dark:bg-[#1a1a1a] dark:hover:bg-[#222] text-slate-700 dark:text-gray-300 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      <span className="flex items-center"><Activity className="w-3.5 h-3.5 mr-2 text-indigo-500" /> System Settings</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button
                      onClick={() => setCurrentView("inventory")}
                      className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 dark:bg-[#1a1a1a] dark:hover:bg-[#222] text-slate-700 dark:text-gray-300 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      <span className="flex items-center"><Package className="w-3.5 h-3.5 mr-2 text-indigo-500" /> Corporate Assets</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button
                      onClick={() => setCurrentView("leaves")}
                      className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 dark:bg-[#1a1a1a] dark:hover:bg-[#222] text-slate-700 dark:text-gray-300 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Leave Approvals</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                )}
              </div>
            )}
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

      {/* Lower Insights Grid: Holidays & Leave Tracker */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        
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

        {/* Celebrations */}
        <div id="celebrations-card" className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow flex flex-col justify-between min-h-[220px]">
          <div className="flex items-center justify-between mb-2 border-b border-slate-50 dark:border-[#1a1a1a] pb-2">
            <div className="flex items-center space-x-2">
              <Gift className="w-4 h-4 text-pink-500" />
              <h4 className="font-display font-semibold text-slate-800 dark:text-white">Birthdays & Anniversaries</h4>
            </div>
            <span className="text-[10px] bg-pink-50 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400 px-2 py-0.5 rounded-full font-bold">This Month</span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
            {upcomingBirthdays.slice(0, 2).map((b, idx) => (
              <div key={idx} className="flex items-center space-x-2.5 text-xs bg-slate-50/50 dark:bg-[#0a0a0a]/50 p-1.5 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-pink-100 dark:bg-pink-950/50 flex items-center justify-center text-pink-600 dark:text-pink-400 font-bold text-xs">
                  {b.name ? b.name.charAt(0) : "A"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-700 dark:text-gray-300 truncate">{b.name}</p>
                  <p className="text-[10px] text-slate-400 dark:text-gray-500 truncate">{b.role} • {b.date}</p>
                </div>
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
            <span className="text-[10px] bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400 px-2 py-0.5 rounded-full font-bold">Assigned</span>
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
                <th className="py-2.5 px-3">Agent Name</th>
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
                  : (matchedEmp?.fullName || leave.employeeId || "Agent");

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
