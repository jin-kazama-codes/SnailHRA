import React, { useState, useEffect } from "react";
import { 
  Calendar, Gift, Heart, CloudSun, ShieldAlert, Sparkles
} from "lucide-react";
import { Employee, Holiday, LeaveRequest, Payslip } from "../types";

interface DashboardViewProps {
  currentEmployee: Employee;
  employees: Employee[];
  holidays: Holiday[];
  leaves: LeaveRequest[];
  payslips: Payslip[];
  role: "admin" | "hr" | "employee";
}

export default function DashboardView({
  currentEmployee,
  employees,
  holidays,
  leaves,
  payslips,
  role
}: DashboardViewProps) {
  const [time, setTime] = useState(new Date());
  const [weatherTemp, setWeatherTemp] = useState(28);
  const [weatherCondition, setWeatherCondition] = useState("Partly Cloudy");

  // Keep digital clock live
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time beautifully
  const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  // Get upcoming birthdays (next 30 days) and work anniversaries
  const upcomingBirthdays = [
    { name: "Rahul Verma", role: "Senior Loan Officer", date: "July 24", age: 29 },
    { name: "Priya Patel", role: "HR Business Partner", date: "August 02", age: 31 },
    { name: "Vikram Malhotra", role: "Relationship Manager", date: "August 11", age: 26 }
  ];

  const workAnniversaries = [
    { name: "Amit Sharma", role: "Head of Credit & Risk", tenure: "2 Years", date: "August 15" },
    { name: "Sneha Iyer", role: "Insurance Underwriter", tenure: "1 Year", date: "August 20" }
  ];

  // NBFC-specific Sales metrics calculations for Admin/HR
  const totalEmployeesCount = employees.length;
  const activeLoansValue = "₹ 12.4 Cr";
  const insurancePoliciesSold = 420;
  const averageLoanDisbursalTime = "4.2 Days";

  // Pending leaves counts
  const pendingLeavesCount = leaves.filter(l => l.status === "Pending").length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Welcome Message */}
        <div id="welcome-banner" className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-linear-to-r from-emerald-600 via-emerald-700 to-teal-800 p-6 text-white shadow-md dark:shadow-emerald-950/40 dark:neon-glow">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-emerald-400/20 rounded-full blur-xl pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
            <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full w-fit">
              <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider uppercase text-emerald-100">NBFC Lending & Insurance Hub</span>
            </div>
            
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight leading-none mb-2">
                Welcome back, {currentEmployee.fullName}!
              </h1>
              <p className="text-emerald-100 text-sm max-w-lg leading-relaxed">
                Empowering SnailHR agents with unified onboarding, payroll, directory access, and instant leave logs. Stay connected and manage your workspace efficiently today.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <div className="bg-white/10 backdrop-blur-xs px-4 py-2 rounded-xl text-xs">
                <span className="block text-emerald-200">Designation</span>
                <span className="font-semibold">{employees.find(e => e.id === currentEmployee.id)?.role === "admin" ? "Systems Administrator" : "Financial Associate"}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs px-4 py-2 rounded-xl text-xs">
                <span className="block text-emerald-200">Security Clearance</span>
                <span className="font-semibold uppercase tracking-wider text-emerald-300 font-mono">{role}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs px-4 py-2 rounded-xl text-xs">
                <span className="block text-emerald-200">Corporate Branch</span>
                <span className="font-semibold">Mumbai Corporate Office</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Digital Clock & Smart Weather Widget */}
        <div id="weather-card" className="rounded-2xl bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] p-6 flex flex-col justify-between shadow-xs dark:neon-glow">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-gray-400">Mumbai HQ Desk</h2>
              <p className="text-xs text-slate-400 dark:text-gray-500">{formattedDate}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/50 p-2.5 rounded-xl border border-emerald-100/50 dark:border-emerald-900/50">
              <CloudSun className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>

          <div className="my-4">
            <p className="text-3xl font-bold font-mono text-slate-800 dark:text-emerald-400 tracking-wider neon-text-glow">
              {formattedTime}
            </p>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">Automatic Attendance Geo-locked Time</p>
          </div>

          <div className="flex items-center justify-between border-t border-slate-50 dark:border-[#1a1a1a] pt-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-slate-800 dark:text-white">{weatherTemp}°C</span>
              <span className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">Warm</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">{weatherCondition}</span>
          </div>
        </div>
      </div>

      {/* Corporate Metadata & HR Metrics Calculations */}
      {(() => {
        const totalEmployeesCount = employees.length;
        return null;
      })()}

      {/* Dashboard Key HR Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Agent Pool */}
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow flex flex-col justify-between min-h-[220px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 dark:text-gray-400 uppercase tracking-wider">Active Agent Pool</span>
            <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center">
              No attrition
            </span>
          </div>
          <div className="my-4">
            <p className="text-3xl font-bold font-display text-slate-800 dark:text-white">{employees.length} Users</p>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">Active registered agents in system</p>
          </div>
          <div className="bg-slate-50 dark:bg-[#0a0a0a]/50 p-3 rounded-xl text-xs text-slate-500 dark:text-gray-400">
            <span>👥 <b>Structure</b>: 3 Departments, 8 designations across Snail Mumbai HQ.</span>
          </div>
        </div>

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
              .filter(h => new Date(h.date) >= new Date("2026-07-20"))
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
            {holidays.filter(h => new Date(h.date) >= new Date("2026-07-20")).length === 0 && (
              <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-2">No upcoming holidays this season.</p>
            )}
          </div>
        </div>

        {/* Birthdays & Work Anniversaries Panel */}
        <div id="celebrations-card" className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow flex flex-col justify-between min-h-[220px]">
          <div className="flex items-center justify-between mb-2 border-b border-slate-50 dark:border-[#1a1a1a] pb-2">
            <div className="flex items-center space-x-2">
              <Gift className="w-4 h-4 text-pink-500" />
              <h4 className="font-display font-semibold text-slate-800 dark:text-white">Anniversaries & Birthdays</h4>
            </div>
            <span className="text-[10px] bg-pink-50 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400 px-2 py-0.5 rounded-full font-bold">This Month</span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
            {/* Birthdays & Milestones list */}
            {upcomingBirthdays.slice(0, 1).map((b, idx) => (
              <div key={idx} className="flex items-center space-x-2.5 text-xs bg-slate-50/50 dark:bg-[#0a0a0a]/50 p-1.5 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-pink-100 dark:bg-pink-950/50 flex items-center justify-center text-pink-600 dark:text-pink-400 font-bold text-xs">
                  {b.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-700 dark:text-gray-300 truncate">{b.name}</p>
                  <p className="text-[10px] text-slate-400 dark:text-gray-500 truncate">Birthday • {b.date}</p>
                </div>
              </div>
            ))}
            {workAnniversaries.slice(0, 1).map((a, idx) => (
              <div key={idx} className="flex items-center space-x-2.5 text-xs bg-slate-50/50 dark:bg-[#0a0a0a]/50 p-1.5 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
                  <Heart className="w-3.5 h-3.5 fill-amber-500 stroke-none" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-700 dark:text-gray-300 truncate">{a.name}</p>
                  <p className="text-[10px] text-slate-400 dark:text-gray-500 truncate">Anniversary ({a.tenure}) • {a.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leave Status Monitoring Row */}
      <div id="leaves-summary-row" className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">
          <div>
            <h4 className="font-display font-semibold text-slate-800 dark:text-white text-md">Lending Agents Leave Tracker & Status</h4>
            <p className="text-xs text-slate-400 dark:text-gray-400">Review status of submitted medical, casual or earned leave requests</p>
          </div>
          {role !== "employee" && (
            <span className="text-xs bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 font-bold px-3 py-1 rounded-full flex items-center">
              <ShieldAlert className="w-3.5 h-3.5 mr-1" /> {pendingLeavesCount} Pending
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
              {leaves.slice(0, 4).map(leave => (
                <tr key={leave.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a]/30 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-700 dark:text-gray-300 flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center font-bold text-[9px] uppercase">
                      {leave.employeeName.charAt(0)}
                    </div>
                    <span>{leave.employeeName}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-gray-400 font-medium">{leave.leaveType}</td>
                  <td className="py-3 px-3 font-mono text-slate-500 dark:text-gray-400">
                    {leave.startDate} to {leave.endDate}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400 dark:text-gray-500">{leave.appliedDate}</td>
                  <td className="py-3 px-3 text-slate-400 dark:text-gray-500 max-w-[200px] truncate">{leave.reason}</td>
                  <td className="py-3 px-3 text-right">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                      leave.status === "Approved" 
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : leave.status === "Pending"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 animate-pulse"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                    }`}>
                      {leave.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
