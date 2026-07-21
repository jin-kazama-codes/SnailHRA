import React, { useState, useEffect } from "react";
import { 
  Play, Square, Pause, RotateCcw, Clock, Calendar as CalendarIcon, CheckCircle2, 
  AlertTriangle, Eye, Sparkles, Coffee, AlertCircle, RefreshCw, Sliders,
  Home, Briefcase, Plus, ChevronRight, ChevronLeft, UserCheck, Check, Edit2, Info
} from "lucide-react";
import { AttendancePunch, Employee, UserRole, LeaveRequest, Holiday } from "../types";

interface AttendanceViewProps {
  attendance: AttendancePunch[];
  employees: Employee[];
  leaves?: LeaveRequest[];
  holidays?: Holiday[];
  role: UserRole;
  currentEmployeeId: string;
  onPunchAction: (employeeId: string, type: "clockin" | "clockout" | "breakstart" | "breakend") => void;
  onUpdatePunch?: (punchId: string, updatedFields: any) => void;
}

export default function AttendanceView({
  attendance,
  employees,
  leaves = [],
  holidays = [],
  role,
  currentEmployeeId,
  onPunchAction,
  onUpdatePunch
}: AttendanceViewProps) {
  const [activeTab, setActiveTab] = useState<"personal" | "roster" | "monthly-view">(
    role === "employee" ? "personal" : "monthly-view"
  );
  const [currentTime, setCurrentTime] = useState(new Date());

  // Filter States for Monthly View
  const [selectedMonth, setSelectedMonth] = useState("2026-07"); // YYYY-MM
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    role === "employee" ? currentEmployeeId : (employees[0]?.id || "")
  );

  // Manual Punch Form State
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualEmpId, setManualEmpId] = useState("");
  const [manualDate, setManualDate] = useState("2026-07-20");
  const [manualClockIn, setManualClockIn] = useState("09:00");
  const [manualClockOut, setManualClockOut] = useState("18:00");
  const [manualStatus, setManualStatus] = useState<"Present" | "Late" | "Half Day">("Present");
  const [manualWfh, setManualWfh] = useState(false);

  // Keep live time ticking for duration calculations
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Today's Date String YYYY-MM-DD
  const todayStr = currentTime.toISOString().split("T")[0];

  // Find active employee's punch for today
  const todayPunch = attendance.find(a => a.employeeId === currentEmployeeId && a.date === todayStr);

  // Calculate live clock-in duration
  const getLiveDuration = () => {
    if (!todayPunch) return "00h 00m";
    const start = new Date(todayPunch.clockIn);
    const end = todayPunch.clockOut ? new Date(todayPunch.clockOut) : currentTime;
    
    // Subtract breaks if ended, or subtract active breaks
    let breakMs = 0;
    todayPunch.breaks.forEach(b => {
      const bStart = new Date(b.start);
      const bEnd = b.end ? new Date(b.end) : currentTime;
      breakMs += (bEnd.getTime() - bStart.getTime());
    });

    const diffMs = end.getTime() - start.getTime() - breakMs;
    if (diffMs < 0) return "00h 00m";

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
  };

  const getLiveBreakDuration = () => {
    if (!todayPunch || todayPunch.breaks.length === 0) return "00m 00s";
    
    let totalMs = 0;
    todayPunch.breaks.forEach(b => {
      const bStart = new Date(b.start);
      const bEnd = b.end ? new Date(b.end) : currentTime;
      totalMs += (bEnd.getTime() - bStart.getTime());
    });

    const minutes = Math.floor(totalMs / (1000 * 60));
    const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);
    return `${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
  };

  const hasActiveBreak = todayPunch?.breaks.some(b => b.end === null) || false;

  // Punch Status Label
  const getPunchStatusText = () => {
    if (!todayPunch) return "Not Clocked In";
    if (todayPunch.clockOut) return "Completed for Today";
    if (hasActiveBreak) return "On a Break";
    return "Clocked In & Working";
  };

  // Stats Calculations
  const personalPunches = attendance.filter(a => a.employeeId === currentEmployeeId);
  const totalPresent = personalPunches.length;
  const totalLate = personalPunches.filter(a => a.status === "Late").length;
  
  // Average check-in calculation
  const getAverageCheckIn = () => {
    if (personalPunches.length === 0) return "09:00 AM";
    let totalMinutes = 0;
    personalPunches.forEach(p => {
      const checkInDate = new Date(p.clockIn);
      totalMinutes += (checkInDate.getHours() * 60 + checkInDate.getMinutes());
    });
    const avgMinutes = Math.round(totalMinutes / personalPunches.length);
    const hrs = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;
    const ampm = hrs >= 12 ? "PM" : "AM";
    const displayHrs = hrs % 12 === 0 ? 12 : hrs % 12;
    return `${displayHrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")} ${ampm}`;
  };

  const getEmployeeName = (empId: string) => {
    return employees.find(e => e.id === empId)?.fullName || "Unknown Employee";
  };

  const getEmployeeDept = (empId: string) => {
    return employees.find(e => e.id === empId)?.department || "Loans";
  };

  // WFH toggle helper
  const handleToggleWfh = async (punchId: string, currentVal: boolean) => {
    if (onUpdatePunch) {
      onUpdatePunch(punchId, { workFromHome: !currentVal });
    }
  };

  // Helper to calculate total hours for any attendance punch
  const calculatePunchHours = (punch: AttendancePunch) => {
    const start = new Date(punch.clockIn);
    const end = punch.clockOut ? new Date(punch.clockOut) : new Date(punch.clockIn);
    
    let breakMs = 0;
    punch.breaks.forEach(b => {
      const bStart = new Date(b.start);
      const bEnd = b.end ? new Date(b.end) : new Date(b.start);
      breakMs += (bEnd.getTime() - bStart.getTime());
    });

    // If clock out is missing, assume standard 8.0 hours or live duration if today
    if (!punch.clockOut) {
      if (punch.date === todayStr) {
        const liveEnd = currentTime;
        const diffMs = liveEnd.getTime() - start.getTime() - breakMs;
        return diffMs > 0 ? parseFloat((diffMs / (1000 * 60 * 60)).toFixed(1)) : 8.0;
      }
      return 8.0; // Assume standard shift completed
    }

    const diffMs = end.getTime() - start.getTime() - breakMs;
    if (diffMs <= 0) return 0;
    return parseFloat((diffMs / (1000 * 60 * 60)).toFixed(1));
  };

  // Helper to find if there is an approved leave request on a specific date for an employee
  const getApprovedLeaveOnDate = (empId: string, dateStr: string) => {
    return leaves.find(l => {
      if (l.employeeId !== empId || l.status !== "Approved") return false;
      const d = new Date(dateStr);
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      d.setHours(12,0,0,0);
      return d >= start && d <= end;
    });
  };

  // Helper to find if there is a registered holiday on a date
  const getHolidayOnDate = (dateStr: string) => {
    return holidays.find(h => h.date === dateStr);
  };

  // Generate All Days of selected month
  const getDaysInMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    const days = [];
    while (date.getMonth() === month - 1) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const selectedMonthDays = getDaysInMonth(selectedMonth);

  // Compute stats for selected employee in the selected month
  const computeEmployeeMonthlyStats = (empId: string) => {
    const punches = attendance.filter(a => a.employeeId === empId && a.date.startsWith(selectedMonth));
    
    let presentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let wfhDays = 0;
    let leaveDays = 0;
    let absentDays = 0;
    let totalHours = 0;

    selectedMonthDays.forEach(day => {
      const dStr = day.toISOString().split("T")[0];
      const punch = punches.find(p => p.date === dStr);
      const isWeekend = day.getDay() === 0 || day.getDay() === 6; // Sunday or Saturday
      const holiday = getHolidayOnDate(dStr);
      const leave = getApprovedLeaveOnDate(empId, dStr);

      if (punch) {
        if (punch.status === "Present") presentDays++;
        else if (punch.status === "Late") {
          presentDays++;
          lateDays++;
        } else if (punch.status === "Half Day") halfDays++;
        
        if (punch.workFromHome) wfhDays++;
        totalHours += calculatePunchHours(punch);
      } else if (leave) {
        leaveDays++;
      } else if (isWeekend || holiday) {
        // Weekend or Holiday - not counted as absent
      } else {
        // Weekday with no punch or leave is absent
        // Skip dates in the future for current month
        if (dStr <= todayStr) {
          absentDays++;
        }
      }
    });

    return {
      presentDays,
      lateDays,
      halfDays,
      wfhDays,
      leaveDays,
      absentDays,
      totalHours: parseFloat(totalHours.toFixed(1))
    };
  };

  const currentEmployeeStats = computeEmployeeMonthlyStats(selectedEmployeeId);

  // Handle Manual Punch Submission
  const handleManualPunchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmpId || !manualDate || !manualClockIn) {
      alert("Please fill out all fields.");
      return;
    }

    try {
      // Format manual inputs into full ISO timestamps
      const startTimestamp = `${manualDate}T${manualClockIn}:00`;
      const endTimestamp = manualClockOut ? `${manualDate}T${manualClockOut}:00` : null;

      // Make post request to backend, then use manual update for WFH
      const res = await fetch("/api/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: manualEmpId,
          type: "clockin"
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || "A punch already exists for this date. Delete or modify existing record first.");
        return;
      }

      const newPunch = await res.json();

      // Trigger PUT update to finalize timing parameters, status and WFH configuration
      if (onUpdatePunch) {
        await onUpdatePunch(newPunch.id, {
          status: manualStatus,
          workFromHome: manualWfh,
          clockIn: new Date(startTimestamp).toISOString(),
          clockOut: endTimestamp ? new Date(endTimestamp).toISOString() : null
        });
      }

      alert(`Manual attendance successfully recorded for ${getEmployeeName(manualEmpId)}!`);
      setShowManualForm(false);
    } catch (err) {
      console.error(err);
      alert("Manual log sync error.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Attendance Metrics Bento Block (My Attendance Area) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Clock In/Out card */}
        <div id="punch-terminal" className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-6 shadow-xs dark:neon-glow flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 dark:border-[#1a1a1a] pb-3">
            <div>
              <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">My Punch Station</h3>
              <p className="text-[11px] text-slate-400 dark:text-gray-500 font-mono">ID: {currentEmployeeId}</p>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${
              !todayPunch 
                ? "bg-slate-100 text-slate-600 dark:bg-[#1a1a1a] dark:text-gray-400"
                : todayPunch.clockOut
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400"
                : hasActiveBreak
                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 animate-pulse"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
            }`}>
              {getPunchStatusText()}
            </span>
          </div>

          <div className="text-center py-4 bg-slate-50/50 dark:bg-[#0a0a0a]/50 rounded-2xl border border-slate-100/30 dark:border-[#1a1a1a]">
            <p className="text-sm font-semibold text-slate-400 dark:text-gray-500">Today's Shift Duration</p>
            <p className="text-3xl font-bold font-mono text-slate-800 dark:text-emerald-400 mt-1.5 tracking-wider neon-text-glow">{getLiveDuration()}</p>
            
            {todayPunch && todayPunch.breaks.length > 0 && (
              <div className="flex items-center justify-center space-x-1 text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                <Coffee className="w-3.5 h-3.5" />
                <span>Total Break Time: <b>{getLiveBreakDuration()}</b></span>
              </div>
            )}
          </div>

          {/* Core Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {!todayPunch ? (
              <button
                onClick={() => onPunchAction(currentEmployeeId, "clockin")}
                className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-3 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-xs cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Clock In (Shift Start)</span>
              </button>
            ) : todayPunch.clockOut ? (
              <div className="col-span-2 bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 dark:text-gray-400 text-xs py-3 rounded-xl font-semibold flex items-center justify-center space-x-1.5">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                <span>Shift Completed Successfully</span>
              </div>
            ) : (
              <>
                {/* Break Controls */}
                {hasActiveBreak ? (
                  <button
                    onClick={() => onPunchAction(currentEmployeeId, "breakend")}
                    className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 hover:bg-emerald-100/50 font-semibold text-xs py-3 rounded-xl flex items-center justify-center space-x-1.5 transition-colors border border-emerald-200/50 dark:border-emerald-800/40 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-emerald-600" />
                    <span>Resume Work</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onPunchAction(currentEmployeeId, "breakstart")}
                    className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 hover:bg-amber-100/50 font-semibold text-xs py-3 rounded-xl flex items-center justify-center space-x-1.5 transition-colors border border-amber-200/50 dark:border-amber-800/40 cursor-pointer"
                  >
                    <Pause className="w-4 h-4 fill-amber-700" />
                    <span>Take Break</span>
                  </button>
                )}

                {/* Clock Out */}
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to clock out? This will finalize your shift log for today.")) {
                      onPunchAction(currentEmployeeId, "clockout");
                    }
                  }}
                  className="bg-rose-50 text-rose-700 hover:bg-rose-100/50 font-semibold text-xs py-3 rounded-xl flex items-center justify-center space-x-1.5 transition-colors border border-rose-200/50 dark:border-rose-800/40 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-rose-700" />
                  <span>Clock Out</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Attendance Statistics Panel */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-6 shadow-xs dark:neon-glow flex flex-col justify-between">
          <div>
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md mb-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">My Attendance Statistics (Current Month)</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-[#0a0a0a]/50 rounded-xl border border-slate-100/50 dark:border-[#1a1a1a] text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Present Days</span>
                <span className="text-2xl font-bold text-slate-800 dark:text-white font-mono mt-1 block">{totalPresent}</span>
                <span className="text-[10px] text-emerald-600 font-medium mt-0.5 inline-block">SLA Compliant</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#0a0a0a]/50 rounded-xl border border-slate-100/50 dark:border-[#1a1a1a] text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Late Logins</span>
                <span className="text-2xl font-bold text-amber-600 font-mono mt-1 block">{totalLate}</span>
                <span className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5 inline-block">After 09:30 AM</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#0a0a0a]/50 rounded-xl border border-slate-100/50 dark:border-[#1a1a1a] text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Check-In</span>
                <span className="text-base font-bold text-slate-700 dark:text-gray-300 font-mono mt-2 block">{getAverageCheckIn()}</span>
                <span className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 inline-block">Snail Mumbai HQ</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#0a0a0a]/50 rounded-xl border border-slate-100/50 dark:border-[#1a1a1a] text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Remaining Leaves</span>
                <span className="text-2xl font-bold text-teal-600 font-mono mt-1 block">14 Days</span>
                <span className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5 inline-block">Of 30 Total</span>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-emerald-50/50 dark:bg-emerald-950/10 p-3.5 rounded-xl border border-emerald-100/50 dark:border-emerald-900/30 flex items-start space-x-2.5 text-xs text-emerald-800 dark:text-emerald-400 leading-normal">
            <AlertCircle className="w-5.5 h-5.5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">SnailHR Buffer & WFH Policy</p>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                Shift logging cutoff is strict. Clocking in after 09:30 AM is registered as <b>Late</b>. Work from Home (WFH) logs are tracked explicitly via IP/geo check-in. Work From Home days are marked with 🏡 on the matrix.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-[#1a1a1a] pb-4">
        <div>
          <h2 className="text-lg font-bold font-display text-slate-800 dark:text-white">Attendance Control Desk</h2>
          <p className="text-xs text-slate-400 dark:text-gray-400">Roster calendars, real-time metrics, and monthly tracking records</p>
        </div>

        <div className="flex flex-wrap gap-2 bg-slate-100 dark:bg-[#0f0f0f] p-1.5 rounded-2xl border border-slate-200/50 dark:border-[#1a1a1a] text-xs font-semibold">
          <button 
            onClick={() => setActiveTab("personal")}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${activeTab === "personal" ? "bg-white dark:bg-[#1a1a1a] shadow-xs text-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
          >
            My Punches
          </button>
          
          {role !== "employee" && (
            <>
              <button 
                onClick={() => setActiveTab("roster")}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${activeTab === "roster" ? "bg-white dark:bg-[#1a1a1a] shadow-xs text-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
              >
                Branch Roster
              </button>
              <button 
                onClick={() => setActiveTab("monthly-view")}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${activeTab === "monthly-view" ? "bg-white dark:bg-[#1a1a1a] shadow-xs text-slate-800 dark:text-white dark:text-emerald-400" : "text-slate-400 hover:text-slate-600"}`}
              >
                Monthly Analytics Matrix
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Content 1: My Punches */}
      {activeTab === "personal" && (
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow space-y-4">
          <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">My Punches History</h3>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#1a1a1a] text-slate-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Clock In</th>
                  <th className="py-2.5 px-3">Clock Out</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-[#1a1a1a]/50">
                {attendance
                  .filter(a => a.employeeId === currentEmployeeId)
                  .map(punch => {
                    const hrs = calculatePunchHours(punch);
                    return (
                      <tr key={punch.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a]/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-medium text-slate-600 dark:text-gray-300">{punch.date}</td>
                        <td className="py-3 px-3 font-mono text-slate-500 dark:text-gray-400">
                          {new Date(punch.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500 dark:text-gray-400">
                          {punch.clockOut 
                            ? new Date(punch.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            : <span className="text-emerald-500 animate-pulse font-semibold">Working...</span>
                          }
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-gray-400">
                          {punch.workFromHome ? (
                            <span className="flex items-center text-blue-600 dark:text-blue-400 font-semibold gap-1">
                              <Home className="w-3.5 h-3.5" /> WFH
                            </span>
                          ) : (
                            <span className="flex items-center text-slate-500 dark:text-gray-400 gap-1">
                              <Briefcase className="w-3.5 h-3.5" /> Office
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-gray-300">{hrs} hrs</td>
                        <td className="py-3 px-3 text-right">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                            punch.status === "Present" 
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : punch.status === "Late"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                          }`}>
                            {punch.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 2: Branch Roster */}
      {activeTab === "roster" && role !== "employee" && (
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">Live Branch Roster</h3>
              <p className="text-xs text-slate-400 dark:text-gray-400">Real-time attendance logs across departments with supervisor administration</p>
            </div>
            
            {/* Manual Adjustments Trigger */}
            <button
              onClick={() => {
                setManualEmpId(employees[0]?.id || "");
                setShowManualForm(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Manual Attendance</span>
            </button>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#1a1a1a] text-slate-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Agent ID</th>
                  <th className="py-2.5 px-3">Agent Name</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Clock In</th>
                  <th className="py-2.5 px-3">Clock Out</th>
                  <th className="py-2.5 px-3">Office/WFH Mode</th>
                  <th className="py-2.5 px-3">Hours</th>
                  <th className="py-2.5 px-3 text-right">Day Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-[#1a1a1a]/50">
                {attendance.map(punch => {
                  const hrs = calculatePunchHours(punch);
                  return (
                    <tr key={punch.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a]/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-medium text-slate-400 dark:text-gray-500">{punch.employeeId}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700 dark:text-gray-300">
                        {getEmployeeName(punch.employeeId)}
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-gray-400 font-medium">{getEmployeeDept(punch.employeeId)}</td>
                      <td className="py-3 px-3 font-mono text-slate-500 dark:text-gray-400">{punch.date}</td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-gray-400">
                        {new Date(punch.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-gray-400">
                        {punch.clockOut 
                          ? new Date(punch.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : <span className="text-emerald-500 animate-pulse font-semibold">Working...</span>
                        }
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleToggleWfh(punch.id, !!punch.workFromHome)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                            punch.workFromHome 
                              ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-400" 
                              : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-[#1a1a1a] dark:border-[#2a2a2a] dark:text-gray-400"
                          }`}
                          title="Click to toggle Work from Home"
                        >
                          {punch.workFromHome ? (
                            <>
                              <Home className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <span>WFH</span>
                            </>
                          ) : (
                            <>
                              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                              <span>Office</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-gray-300">{hrs} hrs</td>
                      <td className="py-3 px-3 text-right">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                          punch.status === "Present" 
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : punch.status === "Late"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                        }`}>
                          {punch.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 3: Employee Monthly Analytics View */}
      {activeTab === "monthly-view" && role !== "employee" && (
        <div className="space-y-6">
          {/* Filters & Selector Bar */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs dark:neon-glow flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Select Employee */}
              <div className="flex flex-col gap-1 min-w-[200px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inspect Agent</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] text-xs font-bold p-2 rounded-xl text-slate-800 dark:text-white focus:outline-hidden"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.id})</option>
                  ))}
                </select>
              </div>

              {/* Select Month */}
              <div className="flex flex-col gap-1 min-w-[140px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] text-xs font-bold p-2 rounded-xl text-slate-800 dark:text-white focus:outline-hidden"
                >
                  <option value="2026-07">July 2026</option>
                  <option value="2026-06">June 2026</option>
                  <option value="2026-05">May 2026</option>
                </select>
              </div>
            </div>

            {/* Manual Action / Summary Header info */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setManualEmpId(selectedEmployeeId);
                  setShowManualForm(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Log Missed Attendance</span>
              </button>
            </div>
          </div>

          {/* Employee Monthly Stats Bento Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            
            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs dark:neon-glow text-center flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Present (Office)</span>
              <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono my-2 block">
                {currentEmployeeStats.presentDays - currentEmployeeStats.wfhDays}
              </span>
              <span className="text-[10px] text-slate-400">Regular physical entries</span>
            </div>

            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs dark:neon-glow text-center flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Work From Home (WFH)</span>
              <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono my-2 block">
                {currentEmployeeStats.wfhDays}
              </span>
              <span className="text-[10px] text-slate-400">Secured VPN logs</span>
            </div>

            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs dark:neon-glow text-center flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Half Day</span>
              <span className="text-3xl font-extrabold text-amber-500 font-mono my-2 block">
                {currentEmployeeStats.halfDays}
              </span>
              <span className="text-[10px] text-slate-400">4-hour shift logs</span>
            </div>

            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs dark:neon-glow text-center flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Leaves & Holidays</span>
              <span className="text-3xl font-extrabold text-indigo-500 font-mono my-2 block">
                {currentEmployeeStats.leaveDays}
              </span>
              <span className="text-[10px] text-slate-400">Approved leave balances</span>
            </div>

            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs dark:neon-glow text-center col-span-2 md:col-span-1 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hours Worked</span>
              <span className="text-2xl font-extrabold text-slate-800 dark:text-white font-mono my-2 block">
                {currentEmployeeStats.totalHours} hrs
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">Avg {currentEmployeeStats.presentDays ? (currentEmployeeStats.totalHours / currentEmployeeStats.presentDays).toFixed(1) : 0}h/day</span>
            </div>

          </div>

          {/* Interactive Weekly Attendance Calendar Matrix */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50 dark:border-[#1a1a1a]">
              <div>
                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">Weekly Attendance Matrix Calendar</h3>
                <p className="text-xs text-slate-400">Inspect check-ins, approved leaves, and toggle work-from-home parameters day-by-day</p>
              </div>
              <div className="flex gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span> Present</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></span> WFH</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></span> Half Day</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-sm"></span> Leave</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span> Absent</span>
              </div>
            </div>

            {/* Calendar Days Matrix Grid */}
            <div className="grid grid-cols-7 gap-3 text-center">
              {/* Day of Week Labels */}
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, idx) => (
                <div key={idx} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-1 border-b border-slate-100 dark:border-[#1a1a1a]">{label}</div>
              ))}

              {/* Generate Calendar Days */}
              {(() => {
                const days = selectedMonthDays;
                if (days.length === 0) return null;
                
                // Adjust starting offset to align correctly with Mon-Sun labels
                // JS getDay() returns 0 for Sunday, 1 for Monday, etc.
                // We want Mon (1) to be first, so we map Mon=0, Tue=1 ... Sun=6
                let startDay = days[0].getDay() - 1; 
                if (startDay === -1) startDay = 6; // Sunday is index 6

                const spacerCells = [];
                for (let i = 0; i < startDay; i++) {
                  spacerCells.push(<div key={`spacer-${i}`} className="bg-slate-50/20 dark:bg-transparent rounded-xl border border-dashed border-slate-100 dark:border-transparent p-4 min-h-[90px]"></div>);
                }

                const dayCells = days.map((day, idx) => {
                  const dStr = day.toISOString().split("T")[0];
                  const punch = attendance.find(p => p.employeeId === selectedEmployeeId && p.date === dStr);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const holiday = getHolidayOnDate(dStr);
                  const approvedLeave = getApprovedLeaveOnDate(selectedEmployeeId, dStr);

                  let cellBg = "bg-slate-50/40 dark:bg-[#0a0a0a]/20 hover:bg-slate-50 dark:hover:bg-[#1a1a1a]";
                  let badgeColor = "bg-slate-100 text-slate-500";
                  let cellBorder = "border-slate-100 dark:border-[#1a1a1a]/50";
                  let dayType = "";

                  if (punch) {
                    dayType = "punch";
                    if (punch.status === "Present") {
                      cellBg = "bg-emerald-50/40 dark:bg-emerald-950/5 hover:bg-emerald-100/30 dark:hover:bg-emerald-950/15";
                      cellBorder = "border-emerald-100 dark:border-emerald-950/20";
                    } else if (punch.status === "Late") {
                      cellBg = "bg-amber-50/40 dark:bg-amber-950/5 hover:bg-amber-100/30 dark:hover:bg-amber-950/15";
                      cellBorder = "border-amber-100 dark:border-amber-950/20";
                    } else if (punch.status === "Half Day") {
                      cellBg = "bg-yellow-50/40 dark:bg-yellow-950/5 hover:bg-yellow-100/30 dark:hover:bg-yellow-950/15";
                      cellBorder = "border-yellow-100 dark:border-yellow-950/20";
                    }
                  } else if (approvedLeave) {
                    dayType = "leave";
                    cellBg = "bg-indigo-50/40 dark:bg-indigo-950/5 hover:bg-indigo-100/30 dark:hover:bg-indigo-950/15";
                    cellBorder = "border-indigo-100 dark:border-indigo-950/20";
                  } else if (holiday) {
                    dayType = "holiday";
                    cellBg = "bg-sky-50/40 dark:bg-sky-950/5 hover:bg-sky-100/30 dark:hover:bg-sky-950/15";
                    cellBorder = "border-sky-100 dark:border-sky-950/20";
                  } else if (isWeekend) {
                    dayType = "weekend";
                    cellBg = "bg-slate-100/50 dark:bg-[#101010]/30";
                    cellBorder = "border-slate-100 dark:border-[#1a1a1a]/30";
                  } else {
                    // Weekday with no logs & past or equal to today
                    if (dStr <= todayStr) {
                      dayType = "absent";
                      cellBg = "bg-rose-50/30 dark:bg-rose-950/5 hover:bg-rose-100/20 dark:hover:bg-rose-950/15";
                      cellBorder = "border-rose-100 dark:border-rose-950/20 text-rose-500";
                    } else {
                      dayType = "future";
                    }
                  }

                  return (
                    <div 
                      key={idx} 
                      className={`rounded-2xl border ${cellBorder} ${cellBg} p-3 min-h-[105px] flex flex-col justify-between transition-all`}
                    >
                      {/* Day Number and Type badge */}
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-bold text-xs text-slate-500 dark:text-gray-400">{day.getDate()}</span>
                        
                        {/* Day indicator badge */}
                        {dayType === "punch" && (
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                            punch?.status === "Present" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400" :
                            punch?.status === "Late" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400" :
                            "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-400"
                          }`}>{punch?.status}</span>
                        )}
                        {dayType === "leave" && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-400">LEAVE</span>
                        )}
                        {dayType === "holiday" && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-400" title={holiday?.name}>HOLIDAY</span>
                        )}
                        {dayType === "weekend" && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-slate-200/50 text-slate-600 dark:bg-slate-800 dark:text-slate-400">REST</span>
                        )}
                        {dayType === "absent" && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400">ABSENT</span>
                        )}
                      </div>

                      {/* Day Specific Data */}
                      <div className="my-1.5 text-center">
                        {punch ? (
                          <div className="space-y-1">
                            <p className="text-[9px] font-mono text-slate-400 dark:text-gray-500">
                              {new Date(punch.clockIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              {punch.clockOut && ` - ${new Date(punch.clockOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                            </p>
                            <p className="text-[10px] font-bold text-slate-700 dark:text-gray-300 font-mono">
                              {calculatePunchHours(punch)} hrs
                            </p>
                          </div>
                        ) : approvedLeave ? (
                          <p className="text-[9px] font-medium text-indigo-600 dark:text-indigo-400 line-clamp-1" title={approvedLeave.reason}>
                            {approvedLeave.leaveType}
                          </p>
                        ) : holiday ? (
                          <p className="text-[9px] font-medium text-sky-600 dark:text-sky-400 truncate" title={holiday.name}>
                            {holiday.name}
                          </p>
                        ) : isWeekend ? (
                          <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">Weekend</p>
                        ) : dayType === "absent" ? (
                          <p className="text-[9px] font-semibold text-rose-500 dark:text-rose-400">Absent / Leave</p>
                        ) : (
                          <p className="text-[9px] text-slate-300 dark:text-slate-700 font-mono">-</p>
                        )}
                      </div>

                      {/* Interactive Work Mode controls for punches */}
                      {punch ? (
                        <div className="mt-1 pt-1.5 border-t border-slate-100/50 dark:border-slate-800/40 flex justify-center">
                          <button
                            onClick={() => handleToggleWfh(punch.id, !!punch.workFromHome)}
                            className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md border transition-all cursor-pointer ${
                              punch.workFromHome 
                                ? "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-400" 
                                : "bg-slate-50 border-slate-100 text-slate-600 dark:bg-[#1a1a1a] dark:border-[#2a2a2a] dark:text-gray-400"
                            }`}
                            title="Click to toggle Work from Home"
                          >
                            {punch.workFromHome ? (
                              <>
                                <Home className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                                <span>WFH</span>
                              </>
                            ) : (
                              <>
                                <Briefcase className="w-2.5 h-2.5 text-slate-400" />
                                <span>Office</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="h-4"></div>
                      )}
                    </div>
                  );
                });

                return [...spacerCells, ...dayCells];
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Manual Attendance Entry Modal */}
      {showManualForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] w-full max-w-md rounded-2xl p-6 space-y-4 shadow-xl animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-[#1a1a1a] pb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-emerald-500" />
                <h4 className="font-display font-semibold text-slate-800 dark:text-white">Log Missed Attendance Punch</h4>
              </div>
              <button 
                onClick={() => setShowManualForm(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleManualPunchSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Select SnailHR Employee</label>
                <select
                  value={manualEmpId}
                  onChange={(e) => setManualEmpId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] p-2.5 rounded-xl text-slate-800 dark:text-white focus:outline-hidden"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.id})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Date</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] p-2.5 rounded-xl text-slate-800 dark:text-white focus:outline-hidden font-mono"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Log Type (Classification)</label>
                  <select
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] p-2.5 rounded-xl text-slate-800 dark:text-white focus:outline-hidden"
                  >
                    <option value="Present">Present (Standard)</option>
                    <option value="Late">Late Entry</option>
                    <option value="Half Day">Half Day</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Clock In Time</label>
                  <input
                    type="time"
                    value={manualClockIn}
                    onChange={(e) => setManualClockIn(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] p-2.5 rounded-xl text-slate-800 dark:text-white focus:outline-hidden font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Clock Out Time</label>
                  <input
                    type="time"
                    value={manualClockOut}
                    onChange={(e) => setManualClockOut(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] p-2.5 rounded-xl text-slate-800 dark:text-white focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="manualWfh"
                  checked={manualWfh}
                  onChange={(e) => setManualWfh(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <label htmlFor="manualWfh" className="text-slate-700 dark:text-gray-300 cursor-pointer flex items-center gap-1">
                  <Home className="w-3.5 h-3.5 text-blue-500 inline" />
                  <span>Mark Session as <b>Work from Home (WFH)</b></span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-50 dark:border-[#1a1a1a] flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  className="bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 hover:text-slate-800 hover:dark:text-white px-4 py-2.5 rounded-xl transition-all border border-slate-100 dark:border-[#2a2a2a] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Confirm & Sync Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
