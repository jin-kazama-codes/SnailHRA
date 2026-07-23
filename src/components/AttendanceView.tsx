"use client";

import React, { useState, useEffect } from "react";
import { 
  Play, Square, Pause, RotateCcw, Clock, Calendar as CalendarIcon, CheckCircle2, 
  AlertTriangle, Eye, Sparkles, Coffee, AlertCircle, RefreshCw, Sliders,
  Home, Briefcase, Plus, ChevronRight, ChevronLeft, UserCheck, Check, Edit2, Info,
  Trash2, X, FileText, User
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
  onDeletePunch?: (punchId: string) => void;
  onSaveDayPunch?: (punchData: any) => void;
  onClearAllAttendance?: () => void;
  timingSettings?: {
    clockInTime: string;
    clockOutTime: string;
    lateThreshold: string;
    breakStartTime: string;
    breakEndTime: string;
  };
  onSaveTimingSettings?: (settings: any) => void;
}

export default function AttendanceView({
  attendance,
  employees,
  leaves = [],
  holidays = [],
  role,
  currentEmployeeId,
  onPunchAction,
  onUpdatePunch,
  onDeletePunch,
  onSaveDayPunch,
  onClearAllAttendance,
  timingSettings,
  onSaveTimingSettings
}: AttendanceViewProps) {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<"personal" | "roster" | "monthly-view">(
    role === "employee" ? "personal" : "roster"
  );
  const [currentTime, setCurrentTime] = useState(new Date());
  const [punchLoading, setPunchLoading] = useState(false);
  const [expandedBreaksRowId, setExpandedBreaksRowId] = useState<string | null>(null);

  const calculateTotalBreakMinutes = (punch: AttendancePunch) => {
    let breakMs = 0;
    (punch.breaks || []).forEach(b => {
      const bStart = new Date(b.start);
      const bEnd = b.end ? new Date(b.end) : (punch.clockOut ? new Date(b.start) : currentTime);
      breakMs += (bEnd.getTime() - bStart.getTime());
    });
    return Math.round(breakMs / 60000);
  };

  const formatBreakDuration = (punch: AttendancePunch) => {
    const mins = calculateTotalBreakMinutes(punch);
    if (mins <= 0) return "0m";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };

  const getEditBreaksTotalDuration = () => {
    let totalMins = 0;
    (editBreaks || []).forEach(b => {
      if (!b.start || !b.end) return;
      const [startH, startM] = b.start.split(":").map(Number);
      const [endH, endM] = b.end.split(":").map(Number);
      
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      
      let diff = endMinutes - startMinutes;
      if (diff < 0) {
        diff += 24 * 60;
      }
      totalMins += diff;
    });
    
    if (totalMins <= 0) return "00h 00m";
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs.toString().padStart(2, "0")}h ${mins.toString().padStart(2, "0")}m`;
  };

  const handlePunchClick = async (type: "clockin" | "clockout" | "breakstart" | "breakend") => {
    if (punchLoading) return;
    try {
      setPunchLoading(true);
      await onPunchAction(currentEmployeeId, type);
    } catch (err) {
      console.error(err);
    } finally {
      setPunchLoading(false);
    }
  };

  // Filter States for Monthly View
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }); // YYYY-MM

  // Find logged in user object
  const loggedInUser = employees.find(e => e.id === currentEmployeeId) || employees[0];
  const userBranch = loggedInUser?.branch || "Mumbai Branch";

  // Role & Branch Filtering logic for accessible employees list
  const accessibleEmployees = React.useMemo(() => {
    if (role === "admin") {
      // Admin sees everyone (all HRs and Employees across all branches)
      return employees;
    } else if (role === "hr") {
      // HR sees only employees within their branch (cannot access HRs/Admins from other branches)
      return employees.filter(e => (e.branch || "Mumbai Branch") === userBranch && e.role !== "admin");
    } else {
      // 1 Employee sees ONLY data related to himself
      return employees.filter(e => e.id === currentEmployeeId);
    }
  }, [employees, role, userBranch, currentEmployeeId]);

  // Group accessibleEmployees by branch and sort within each branch: Admin, HR, Employee
  const groupedEmployees = React.useMemo(() => {
    const groups: { [branch: string]: Employee[] } = {};
    
    accessibleEmployees.forEach(emp => {
      const branchName = emp.branch || "Mumbai Branch";
      if (!groups[branchName]) {
        groups[branchName] = [];
      }
      groups[branchName].push(emp);
    });

    const rolePriority: { [key: string]: number } = {
      admin: 1,
      hr: 2,
      employee: 3
    };

    const sortedBranchNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));

    return sortedBranchNames.map(branch => {
      const branchEmps = [...groups[branch]].sort((a, b) => {
        const priorityA = rolePriority[a.role] || 4;
        const priorityB = rolePriority[b.role] || 4;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return a.fullName.localeCompare(b.fullName);
      });
      return { branch, employees: branchEmps };
    });
  }, [accessibleEmployees]);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    role === "employee" ? currentEmployeeId : (accessibleEmployees[0]?.id || currentEmployeeId)
  );

  // Sync selected employee when accessible list updates
  useEffect(() => {
    if (role === "employee") {
      setSelectedEmployeeId(currentEmployeeId);
    } else if (!accessibleEmployees.some(e => e.id === selectedEmployeeId)) {
      setSelectedEmployeeId(accessibleEmployees[0]?.id || currentEmployeeId);
    }
  }, [role, currentEmployeeId, accessibleEmployees]);

  // Day Details Modal state
  const [selectedDayModal, setSelectedDayModal] = useState<{
    date: string;
    employeeId: string;
  } | null>(null);

  const [editStatus, setEditStatus] = useState<"Present" | "Late" | "Half Day" | "Absent" | "On Leave">("Present");
  const [editClockInTime, setEditClockInTime] = useState(timingSettings?.clockInTime || "09:00");
  const [editClockOutTime, setEditClockOutTime] = useState(timingSettings?.clockOutTime || "18:00");
  const [editWfh, setEditWfh] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editBreaks, setEditBreaks] = useState<{ start: string; end: string }[]>([]);

  // Manual Punch Form Modal state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualEmpId, setManualEmpId] = useState("");
  const [manualDate, setManualDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [manualClockIn, setManualClockIn] = useState(timingSettings?.clockInTime || "09:00");
  const [manualClockOut, setManualClockOut] = useState(timingSettings?.clockOutTime || "18:00");
  const [manualStatus, setManualStatus] = useState<"Present" | "Late" | "Half Day">("Present");
  const [manualWfh, setManualWfh] = useState(false);

  // Timing Settings Modal state
  const [showTimingSettingsModal, setShowTimingSettingsModal] = useState(false);
  const [settingsClockIn, setSettingsClockIn] = useState(timingSettings?.clockInTime || "09:00");
  const [settingsClockOut, setSettingsClockOut] = useState(timingSettings?.clockOutTime || "18:00");
  const [settingsLateThreshold, setSettingsLateThreshold] = useState(timingSettings?.lateThreshold || "09:30");
  const [settingsBreakStart, setSettingsBreakStart] = useState(timingSettings?.breakStartTime || "13:00");
  const [settingsBreakEnd, setSettingsBreakEnd] = useState(timingSettings?.breakEndTime || "14:00");

  useEffect(() => {
    if (timingSettings) {
      setManualClockIn(timingSettings.clockInTime || "09:00");
      setManualClockOut(timingSettings.clockOutTime || "18:00");
      setSettingsClockIn(timingSettings.clockInTime || "09:00");
      setSettingsClockOut(timingSettings.clockOutTime || "18:00");
      setSettingsLateThreshold(timingSettings.lateThreshold || "09:30");
      setSettingsBreakStart(timingSettings.breakStartTime || "13:00");
      setSettingsBreakEnd(timingSettings.breakEndTime || "14:00");
    }
  }, [timingSettings]);

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString(currentTime);
  const todayLocalStr = todayStr;

  const todayPunches = attendance.filter(a => 
    a.employeeId === currentEmployeeId && (a.date === todayStr || a.date === todayLocalStr)
  );
  const todayPunch = todayPunches.length > 0
    ? todayPunches.reduce((latest, current) => 
        new Date(current.clockIn).getTime() > new Date(latest.clockIn).getTime() ? current : latest
      )
    : undefined;

  // Live duration calculations
  const getLiveDuration = () => {
    if (!todayPunch) return "00h 00m 00s";
    const start = new Date(todayPunch.clockIn);
    const end = todayPunch.clockOut ? new Date(todayPunch.clockOut) : currentTime;
    
    let breakMs = 0;
    todayPunch.breaks.forEach(b => {
      const bStart = new Date(b.start);
      const bEnd = b.end ? new Date(b.end) : currentTime;
      breakMs += (bEnd.getTime() - bStart.getTime());
    });

    const diffMs = end.getTime() - start.getTime() - breakMs;
    if (diffMs < 0) return "00h 00m 00s";

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
  };

  const getLiveBreakDuration = () => {
    if (!todayPunch || todayPunch.breaks.length === 0) return "00h 00m 00s";
    
    let totalMs = 0;
    todayPunch.breaks.forEach(b => {
      const bStart = new Date(b.start);
      const bEnd = b.end ? new Date(b.end) : currentTime;
      totalMs += (bEnd.getTime() - bStart.getTime());
    });

    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
  };

  const hasActiveBreak = todayPunch?.breaks.some(b => b.end === null) || false;

  const getPunchStatusText = () => {
    if (!todayPunch) return "Not Clocked In";
    if (todayPunch.clockOut) return "Completed for Today";
    if (hasActiveBreak) return "On a Break";
    return "Clocked In & Working";
  };

  // Helper getters
  const getEmployeeName = (empId: string) => {
    return employees.find(e => e.id === empId)?.fullName || "Unknown Employee";
  };

  const getEmployeeDept = (empId: string) => {
    return employees.find(e => e.id === empId)?.department || "Loans";
  };

  const getEmployeeBranch = (empId: string) => {
    return employees.find(e => e.id === empId)?.branch || "Mumbai Branch";
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

    if (!punch.clockOut) {
      if (punch.date === todayStr) {
        const diffMs = currentTime.getTime() - start.getTime() - breakMs;
        return diffMs > 0 ? parseFloat((diffMs / (1000 * 60 * 60)).toFixed(1)) : 8.0;
      }
      return 8.0;
    }

    const diffMs = end.getTime() - start.getTime() - breakMs;
    if (diffMs <= 0) return 0;
    return parseFloat((diffMs / (1000 * 60 * 60)).toFixed(1));
  };

  // Helper to format exact working duration in hours and minutes (e.g. 0h 5m)
  const formatPunchDuration = (punch: AttendancePunch) => {
    const start = new Date(punch.clockIn);
    const end = punch.clockOut 
      ? new Date(punch.clockOut) 
      : (punch.date === todayStr ? currentTime : new Date(punch.clockIn));
    
    let breakMs = 0;
    (punch.breaks || []).forEach(b => {
      const bStart = new Date(b.start);
      const bEnd = b.end ? new Date(b.end) : (punch.clockOut ? new Date(b.start) : currentTime);
      breakMs += (bEnd.getTime() - bStart.getTime());
    });

    const diffMs = end.getTime() - start.getTime() - breakMs;
    if (diffMs <= 0) return "0h 0m";

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  // Approved leave lookup
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

  const getHolidayOnDate = (dateStr: string) => {
    return holidays.find(h => h.date === dateStr);
  };

  // Days in selected month
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

  // Compute monthly stats
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
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
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
        // weekend or holiday
      } else {
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

  // Open Day Details Modal & populate form state
  const openDayDetailsModal = (dateStr: string, empId: string) => {
    const existingPunch = attendance.find(a => a.employeeId === empId && a.date === dateStr);
    
    setSelectedDayModal({ date: dateStr, employeeId: empId });

    if (existingPunch) {
      setEditStatus(existingPunch.status);
      setEditWfh(!!existingPunch.workFromHome);
      setEditNotes(existingPunch.notes || "");

      if (existingPunch.clockIn) {
        const inDate = new Date(existingPunch.clockIn);
        setEditClockInTime(`${inDate.getHours().toString().padStart(2, '0')}:${inDate.getMinutes().toString().padStart(2, '0')}`);
      } else {
        setEditClockInTime("09:00");
      }

      if (existingPunch.clockOut) {
        const outDate = new Date(existingPunch.clockOut);
        setEditClockOutTime(`${outDate.getHours().toString().padStart(2, '0')}:${outDate.getMinutes().toString().padStart(2, '0')}`);
      } else {
        setEditClockOutTime("18:00");
      }

      const formattedBreaks = existingPunch.breaks.map(b => {
        const bStart = new Date(b.start);
        const bEnd = b.end ? new Date(b.end) : new Date(b.start);
        return {
          start: `${bStart.getHours().toString().padStart(2, '0')}:${bStart.getMinutes().toString().padStart(2, '0')}`,
          end: `${bEnd.getHours().toString().padStart(2, '0')}:${bEnd.getMinutes().toString().padStart(2, '0')}`
        };
      });
      setEditBreaks(formattedBreaks);
    } else {
      setEditStatus("Present");
      setEditWfh(false);
      setEditNotes("");
      setEditClockInTime(timingSettings?.clockInTime || "09:00");
      setEditClockOutTime(timingSettings?.clockOutTime || "18:00");
      setEditBreaks([]);
    }
  };

  // Save Day Details (Admin / HR)
  const handleSaveDayDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDayModal) return;

    const { date, employeeId } = selectedDayModal;
    const existingPunch = attendance.find(a => a.employeeId === employeeId && a.date === date);

    const clockInISO = new Date(`${date}T${editClockInTime}:00`).toISOString();
    const clockOutISO = editClockOutTime ? new Date(`${date}T${editClockOutTime}:00`).toISOString() : null;

    const breakObjects = editBreaks.map(b => ({
      start: new Date(`${date}T${b.start}:00`).toISOString(),
      end: b.end ? new Date(`${date}T${b.end}:00`).toISOString() : null
    }));

    if (onSaveDayPunch) {
      await onSaveDayPunch({
        id: existingPunch?.id,
        employeeId,
        date,
        status: editStatus,
        clockIn: clockInISO,
        clockOut: clockOutISO,
        breaks: breakObjects,
        workFromHome: editWfh,
        notes: editNotes
      });
    }

    setSelectedDayModal(null);
  };

  // Delete Punch (Admin / HR)
  const handleDeleteDayPunch = async () => {
    if (!selectedDayModal) return;
    const existingPunch = attendance.find(a => a.employeeId === selectedDayModal.employeeId && a.date === selectedDayModal.date);
    if (!existingPunch) return;

    if (confirm(`Are you sure you want to delete the attendance punch for ${getEmployeeName(selectedDayModal.employeeId)} on ${selectedDayModal.date}?`)) {
      if (onDeletePunch) {
        await onDeletePunch(existingPunch.id);
      }
      setSelectedDayModal(null);
    }
  };

  const handleAddBreakRow = () => {
    setEditBreaks([...editBreaks, { start: "13:00", end: "13:30" }]);
  };

  const handleRemoveBreakRow = (index: number) => {
    setEditBreaks(editBreaks.filter((_, i) => i !== index));
  };

  const handleUpdateBreakRow = (index: number, field: "start" | "end", val: string) => {
    const updated = [...editBreaks];
    updated[index][field] = val;
    setEditBreaks(updated);
  };

  const handleManualPunchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmpId || !manualDate || !manualClockIn) {
      return;
    }

    const startISO = new Date(`${manualDate}T${manualClockIn}:00`).toISOString();
    const endISO = manualClockOut ? new Date(`${manualDate}T${manualClockOut}:00`).toISOString() : null;

    if (onSaveDayPunch) {
      await onSaveDayPunch({
        employeeId: manualEmpId,
        date: manualDate,
        status: manualStatus,
        clockIn: startISO,
        clockOut: endISO,
        workFromHome: manualWfh,
        breaks: []
      });
    }

    setShowManualForm(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: My Punch Station & Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive Punch Station Card */}
        <div id="punch-terminal" className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-6 shadow-xs dark:neon-glow flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 dark:border-[#1a1a1a] pb-3">
            <div>
              <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">My Punch Station</h3>
              <p className="text-[11px] text-slate-400 dark:text-gray-500 font-mono">ID: {currentEmployeeId} • {userBranch}</p>
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

          <div 
            onClick={() => openDayDetailsModal(todayStr, currentEmployeeId)}
            className="text-center py-4 bg-slate-50/60 dark:bg-[#0a0a0a]/50 rounded-2xl border border-slate-100/50 dark:border-[#1a1a1a] cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-800 transition-all group"
            title="Click to view today's detailed log modal"
          >
            <p className="text-xs font-semibold text-slate-400 dark:text-gray-500 flex items-center justify-center gap-1">
              <span>Today's Shift Duration ({todayStr})</span>
              <Eye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-emerald-500 transition-opacity" />
            </p>
            <p className="text-3xl font-bold font-mono text-slate-800 dark:text-emerald-400 mt-1.5 tracking-wider neon-text-glow">{getLiveDuration()}</p>
            
            {todayPunch && todayPunch.breaks.length > 0 && (
              <div className="flex items-center justify-center space-x-1 text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                <Coffee className="w-3.5 h-3.5" />
                <span>Total Break Time: <b>{getLiveBreakDuration()}</b></span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {!todayPunch ? (
              <button
                disabled={punchLoading}
                onClick={() => handlePunchClick("clockin")}
                className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-3 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-xs cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {punchLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Recording Clock In...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Clock In (Shift Start)</span>
                  </>
                )}
              </button>
            ) : todayPunch.clockOut ? (
              <div className="col-span-2 bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 dark:text-gray-400 text-xs py-3 rounded-xl font-semibold flex items-center justify-center space-x-1.5">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                <span>Shift Completed Successfully</span>
              </div>
            ) : (
              <>
                {hasActiveBreak ? (
                  <button
                    disabled={punchLoading}
                    onClick={() => handlePunchClick("breakend")}
                    className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 hover:bg-emerald-100/50 font-semibold text-xs py-3 rounded-xl flex items-center justify-center space-x-1.5 transition-colors border border-emerald-200/50 dark:border-emerald-800/40 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {punchLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                    ) : (
                      <Play className="w-4 h-4 fill-emerald-600" />
                    )}
                    <span>{punchLoading ? "Updating..." : "Resume Work"}</span>
                  </button>
                ) : (
                  <button
                    disabled={punchLoading}
                    onClick={() => handlePunchClick("breakstart")}
                    className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 hover:bg-amber-100/50 font-semibold text-xs py-3 rounded-xl flex items-center justify-center space-x-1.5 transition-colors border border-amber-200/50 dark:border-amber-800/40 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {punchLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-700" />
                    ) : (
                      <Pause className="w-4 h-4 fill-amber-700" />
                    )}
                    <span>{punchLoading ? "Updating..." : "Take Break"}</span>
                  </button>
                )}

                <button
                  disabled={punchLoading}
                  onClick={async () => {
                    if (confirm("Are you sure you want to clock out? This will finalize your shift log for today.")) {
                      await handlePunchClick("clockout");
                    }
                  }}
                  className="bg-rose-50 text-rose-700 hover:bg-rose-100/50 font-semibold text-xs py-3 rounded-xl flex items-center justify-center space-x-1.5 transition-colors border border-rose-200/50 dark:border-rose-800/40 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {punchLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-rose-700" />
                  ) : (
                    <Square className="w-3.5 h-3.5 fill-rose-700" />
                  )}
                  <span>{punchLoading ? "Clocking Out..." : "Clock Out"}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* My Attendance Statistics Panel */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-6 shadow-xs dark:neon-glow flex flex-col justify-between">
          <div>
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md mb-4 pb-3 border-b border-slate-50 dark:border-[#1a1a1a]">
              My Attendance Statistics ({selectedMonth})
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-[#0a0a0a]/50 rounded-xl border border-slate-100/50 dark:border-[#1a1a1a] text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Present Days</span>
                <span className="text-2xl font-bold text-slate-800 dark:text-white font-mono mt-1 block">
                  {attendance.filter(a => a.employeeId === currentEmployeeId && a.status === "Present").length}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium mt-0.5 inline-block">SLA Compliant</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#0a0a0a]/50 rounded-xl border border-slate-100/50 dark:border-[#1a1a1a] text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Late Logins</span>
                <span className="text-2xl font-bold text-amber-600 font-mono mt-1 block">
                  {attendance.filter(a => a.employeeId === currentEmployeeId && a.status === "Late").length}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5 inline-block">After {timingSettings?.lateThreshold || "09:30"} AM</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#0a0a0a]/50 rounded-xl border border-slate-100/50 dark:border-[#1a1a1a] text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Work Mode</span>
                <span className="text-base font-bold text-blue-600 dark:text-blue-400 font-mono mt-2 block">
                  {attendance.filter(a => a.employeeId === currentEmployeeId && a.workFromHome).length} WFH
                </span>
                <span className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 inline-block">{userBranch}</span>
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
              <p className="font-semibold">SnailHR Attendance & Security Policy ({userBranch})</p>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                {role === "admin" && "Admin clearance level: Access to all branches and full edit rights across the entire company."}
                {role === "hr" && `HR clearance level: Restricted to branch (${userBranch}). Cannot view or modify records of other branches or senior admins.`}
                {role === "employee" && "Employee clearance level: Confidential read-only attendance matrix. Self punch-in/out and break tracking enabled."}
              </p>
              <div className="mt-3 pt-3 border-t border-emerald-200/40 dark:border-emerald-800/40 text-[10px] font-mono grid grid-cols-1 sm:grid-cols-3 gap-2 text-emerald-800 dark:text-emerald-300">
                <div>Shift Window: <b>{timingSettings?.clockInTime || "09:00"} - {timingSettings?.clockOutTime || "18:00"}</b></div>
                <div>Late Buffer: <b>{timingSettings?.lateThreshold || "09:30"}</b></div>
                <div>Standard Break: <b>{timingSettings?.breakStartTime || "13:00"} - {timingSettings?.breakEndTime || "14:00"}</b></div>
              </div>
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

        <div className="flex items-center gap-3">
          {(role === "admin" || role === "hr") && (
            <button
              onClick={() => setShowTimingSettingsModal(true)}
              className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#1a1a1a] text-slate-700 dark:text-gray-300 font-semibold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all hover:bg-slate-50 dark:hover:bg-[#1a1a1a] shadow-xs cursor-pointer group"
              title="Configure company-wide standard shift and break times"
            >
              <Sliders className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span>Timing Settings</span>
            </button>
          )}

          <div className="flex flex-wrap gap-2 bg-slate-100 dark:bg-[#0f0f0f] p-1.5 rounded-2xl border border-slate-200/50 dark:border-[#1a1a1a] text-xs font-semibold">
          <button 
            onClick={() => setActiveTab("personal")}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${activeTab === "personal" ? "bg-white dark:bg-[#1a1a1a] shadow-xs text-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
          >
            My Punches
          </button>

          {/* Roster Tab: Visible ONLY to Admin and HR */}
          {role !== "employee" && (
            <button 
              onClick={() => setActiveTab("roster")}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${activeTab === "roster" ? "bg-white dark:bg-[#1a1a1a] shadow-xs text-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
            >
              Branch Roster ({userBranch})
            </button>
          )}

          {/* Monthly Matrix Tab: Accessible to ALL roles */}
          <button 
            onClick={() => setActiveTab("monthly-view")}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${activeTab === "monthly-view" ? "bg-white dark:bg-[#1a1a1a] shadow-xs text-slate-800 dark:text-white dark:text-emerald-400" : "text-slate-400 hover:text-slate-600"}`}
          >
            {role === "employee" ? "My Monthly Attendance Matrix" : "Monthly Analytics Matrix"}
          </button>
        </div>
      </div>
    </div>

      {/* TAB 1: My Punches (Current Employee Only) */}
      {activeTab === "personal" && (
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">My Punches History</h3>
            <span className="text-xs text-slate-400">Click any row to view full day details</span>
          </div>
          
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
                      <tr 
                        key={punch.id} 
                        onClick={() => openDayDetailsModal(punch.date, currentEmployeeId)}
                        className="hover:bg-slate-50/80 dark:hover:bg-[#1a1a1a]/60 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-3 font-mono font-medium text-slate-700 dark:text-gray-300">{punch.date}</td>
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
                        <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-gray-300">{formatPunchDuration(punch)}</td>
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

      {/* TAB 2: Branch Roster (Admin & HR Only) */}
      {activeTab === "roster" && role !== "employee" && (
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">
                Live Branch Roster {role === "hr" ? `(${userBranch})` : "(All Branches)"}
              </h3>
              <p className="text-xs text-slate-400 dark:text-gray-400">
                {role === "hr" 
                  ? `Displaying attendance for employees in ${userBranch}` 
                  : "Displaying attendance records for all HR and Employee staff nationwide"}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {onClearAllAttendance && (
                <button
                  onClick={onClearAllAttendance}
                  className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-semibold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all border border-rose-200 dark:border-rose-900/60 cursor-pointer"
                  title="Clear all attendance punch records"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Attendance</span>
                </button>
              )}

              <button
                onClick={() => {
                  setManualEmpId(accessibleEmployees[0]?.id || "");
                  setShowManualForm(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Log Manual Attendance</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#1a1a1a] text-slate-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Agent ID</th>
                  <th className="py-2.5 px-3">Agent Name</th>
                  <th className="py-2.5 px-3">Branch / Dept</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Clock In</th>
                  <th className="py-2.5 px-3">Clock Out</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Breaks</th>
                  <th className="py-2.5 px-3">Hours</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-[#1a1a1a]/50">
                {attendance
                  .filter(punch => accessibleEmployees.some(e => e.id === punch.employeeId))
                  .sort((a, b) => {
                    const dateCompare = b.date.localeCompare(a.date);
                    if (dateCompare !== 0) return dateCompare;
                    return new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime();
                  })
                  .map(punch => {
                    const hrs = calculatePunchHours(punch);
                    const isExpanded = expandedBreaksRowId === punch.id;
                    const breakCount = punch.breaks?.length || 0;
                    
                    return (
                      <React.Fragment key={punch.id}>
                        <tr className="hover:bg-slate-50/80 dark:hover:bg-[#1a1a1a]/60 transition-colors">
                          <td className="py-3 px-3 font-mono font-medium text-slate-400 dark:text-gray-500">{punch.employeeId}</td>
                          <td className="py-3 px-3 font-semibold text-slate-700 dark:text-gray-300">
                            {getEmployeeName(punch.employeeId)}
                          </td>
                          <td className="py-3 px-3 text-slate-500 dark:text-gray-400 font-medium">
                            {getEmployeeBranch(punch.employeeId)} ({getEmployeeDept(punch.employeeId)})
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500 dark:text-gray-400">{punch.date}</td>
                          <td className="py-3 px-3 font-mono text-slate-600 dark:text-gray-400">
                            {new Date(punch.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600 dark:text-gray-400">
                            {punch.clockOut 
                              ? new Date(punch.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : <span className="text-emerald-500 animate-pulse font-semibold">Working...</span>
                            }
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                              punch.workFromHome 
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400" 
                                : "bg-slate-100 text-slate-600 dark:bg-[#1a1a1a] dark:text-gray-400"
                            }`}>
                              {punch.workFromHome ? <Home className="w-3 h-3 text-blue-500" /> : <Briefcase className="w-3 h-3 text-slate-400" />}
                              {punch.workFromHome ? "WFH" : "Office"}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {breakCount > 0 ? (
                              <button
                                type="button"
                                onClick={() => setExpandedBreaksRowId(isExpanded ? null : punch.id)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                                  breakCount > 1
                                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40 hover:scale-105"
                                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40 hover:bg-amber-100/50"
                                }`}
                              >
                                <Coffee className="w-3.5 h-3.5" />
                                <span>
                                  {breakCount > 1 ? `⚠️ ${breakCount} Breaks (${formatBreakDuration(punch)})` : `1 Break (${formatBreakDuration(punch)})`}
                                </span>
                              </button>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 font-semibold bg-slate-50 dark:bg-[#1a1a1a]/50 px-2.5 py-1 rounded-xl border border-slate-100 dark:border-[#222]/30 text-[10px] select-none">No Breaks</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-gray-300">{formatPunchDuration(punch)}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => openDayDetailsModal(punch.date, punch.employeeId)}
                              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all border border-emerald-200/50 dark:border-emerald-800/40 cursor-pointer"
                            >
                              Edit / Details
                            </button>
                          </td>
                        </tr>
                        {isExpanded && breakCount > 0 && (
                          <tr className="bg-slate-50/50 dark:bg-[#0a0a0a]/30">
                            <td colSpan={10} className="p-3 border-t border-b border-slate-100/50 dark:border-[#1a1a1a]/50">
                              <div className="pl-8 pr-4 py-2 space-y-1.5">
                                <h5 className="font-semibold text-[10px] uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                  <Coffee className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                                  <span>Break Log Details ({punch.date})</span>
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                  {punch.breaks.map((b, idx) => {
                                    const bStart = new Date(b.start);
                                    const bEnd = b.end ? new Date(b.end) : null;
                                    const diff = bEnd ? Math.round((bEnd.getTime() - bStart.getTime()) / 60000) : null;
                                    return (
                                      <div key={idx} className="bg-white dark:bg-[#121212] p-2.5 rounded-xl border border-slate-100 dark:border-[#1e1e1e] flex justify-between items-center text-[11px] font-mono shadow-xs">
                                        <div>
                                          <span className="text-slate-400 text-[10px] block uppercase font-bold">Break {idx + 1}</span>
                                          <span className="text-slate-700 dark:text-gray-300 font-semibold mt-0.5 inline-block">
                                            {bStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {bEnd ? bEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Active"}
                                          </span>
                                        </div>
                                        <span className={`font-bold ${bEnd ? "text-amber-600" : "text-rose-500 animate-pulse font-semibold"}`}>
                                          {bEnd ? `${diff} mins` : "Active"}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Monthly Analytics Matrix (Calendar View) */}
      {activeTab === "monthly-view" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs dark:neon-glow flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Employee Selector (Hidden/Locked for regular Employees, filtered by branch for HR) */}
              {role !== "employee" ? (
                <div className="flex flex-col gap-1 min-w-[220px]">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Inspect Employee {role === "hr" && `(${userBranch})`}
                  </label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] text-xs font-bold p-2 rounded-xl text-slate-800 dark:text-white focus:outline-hidden"
                  >
                    {groupedEmployees.map(group => (
                      <optgroup key={group.branch} label={group.branch}>
                        {group.employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.fullName} ({emp.id}) - {emp.role.toUpperCase()}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#1a1a1a] px-3 py-2 rounded-xl border border-slate-100 dark:border-[#2a2a2a]">
                  <User className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    {loggedInUser?.fullName} ({loggedInUser?.id})
                  </span>
                </div>
              )}

              {/* Month Selector */}
              <div className="flex flex-col gap-1 min-w-[140px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] text-xs font-bold p-2 rounded-xl text-slate-800 dark:text-white focus:outline-hidden"
                >
                  {Array.from({ length: 6 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(1);
                    d.setMonth(d.getMonth() - i);
                    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    return <option key={val} value={val}>{label}</option>;
                  })}
                </select>
              </div>
            </div>

            {/* Action buttons (Log Missed Attendance available for Admin & HR) */}
            {role !== "employee" && (
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
            )}
          </div>

          {/* Monthly Stats Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs text-center flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Present (Office)</span>
              <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono my-2 block">
                {currentEmployeeStats.presentDays - currentEmployeeStats.wfhDays}
              </span>
              <span className="text-[10px] text-slate-400">Regular entries</span>
            </div>

            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs text-center flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Work From Home (WFH)</span>
              <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono my-2 block">
                {currentEmployeeStats.wfhDays}
              </span>
              <span className="text-[10px] text-slate-400">VPN sessions</span>
            </div>

            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs text-center flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Half Day</span>
              <span className="text-3xl font-extrabold text-amber-500 font-mono my-2 block">
                {currentEmployeeStats.halfDays}
              </span>
              <span className="text-[10px] text-slate-400">Half shift logs</span>
            </div>

            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs text-center flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Leaves & Holidays</span>
              <span className="text-3xl font-extrabold text-indigo-500 font-mono my-2 block">
                {currentEmployeeStats.leaveDays}
              </span>
              <span className="text-[10px] text-slate-400">Approved leaves</span>
            </div>

            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs text-center col-span-2 md:col-span-1 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hours Worked</span>
              <span className="text-2xl font-extrabold text-slate-800 dark:text-white font-mono my-2 block">
                {currentEmployeeStats.totalHours} hrs
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">
                Avg {currentEmployeeStats.presentDays ? (currentEmployeeStats.totalHours / currentEmployeeStats.presentDays).toFixed(1) : 0}h/day
              </span>
            </div>
          </div>

          {/* Interactive Weekly Attendance Calendar Matrix */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50 dark:border-[#1a1a1a]">
              <div>
                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-md">
                  Weekly Attendance Matrix Calendar ({selectedMonth})
                </h3>
                <p className="text-xs text-slate-400">
                  {role === "employee" 
                    ? "Click any day cell to view your full punch details, break duration, and shift logs" 
                    : "Click any day cell to inspect and edit employee attendance details"}
                </p>
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
              {/* Day Labels */}
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, idx) => (
                <div key={idx} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-1 border-b border-slate-100 dark:border-[#1a1a1a]">{label}</div>
              ))}

              {/* Generate Calendar Days */}
              {(() => {
                const days = selectedMonthDays;
                if (days.length === 0) return null;
                
                let startDay = days[0].getDay() - 1; 
                if (startDay === -1) startDay = 6;

                const spacerCells = [];
                for (let i = 0; i < startDay; i++) {
                  spacerCells.push(<div key={`spacer-${i}`} className="bg-slate-50/20 dark:bg-transparent rounded-xl border border-dashed border-slate-100 dark:border-transparent p-4 min-h-[95px]"></div>);
                }

                const dayCells = days.map((day, idx) => {
                  const dStr = day.toISOString().split("T")[0];
                  const punch = attendance.find(p => p.employeeId === selectedEmployeeId && p.date === dStr);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const holiday = getHolidayOnDate(dStr);
                  const approvedLeave = getApprovedLeaveOnDate(selectedEmployeeId, dStr);

                  let cellBg = "bg-slate-50/40 dark:bg-[#0a0a0a]/20 hover:bg-slate-100/60 dark:hover:bg-[#1a1a1a]";
                  let cellBorder = "border-slate-100 dark:border-[#1a1a1a]/50";
                  let dayType = "";

                  if (punch) {
                    dayType = "punch";
                    if (punch.status === "Present") {
                      cellBg = "bg-emerald-50/40 dark:bg-emerald-950/10 hover:bg-emerald-100/40 dark:hover:bg-emerald-950/25";
                      cellBorder = "border-emerald-100 dark:border-emerald-950/30";
                    } else if (punch.status === "Late") {
                      cellBg = "bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-100/40 dark:hover:bg-amber-950/25";
                      cellBorder = "border-amber-100 dark:border-amber-950/30";
                    } else if (punch.status === "Half Day") {
                      cellBg = "bg-yellow-50/40 dark:bg-yellow-950/10 hover:bg-yellow-100/40 dark:hover:bg-yellow-950/25";
                      cellBorder = "border-yellow-100 dark:border-yellow-950/30";
                    }
                  } else if (approvedLeave) {
                    dayType = "leave";
                    cellBg = "bg-indigo-50/40 dark:bg-indigo-950/10 hover:bg-indigo-100/40 dark:hover:bg-indigo-950/25";
                    cellBorder = "border-indigo-100 dark:border-indigo-950/30";
                  } else if (holiday) {
                    dayType = "holiday";
                    cellBg = "bg-sky-50/40 dark:bg-sky-950/10 hover:bg-sky-100/40 dark:hover:bg-sky-950/25";
                    cellBorder = "border-sky-100 dark:border-sky-950/30";
                  } else if (isWeekend) {
                    dayType = "weekend";
                    cellBg = "bg-slate-100/50 dark:bg-[#101010]/30 hover:bg-slate-100 dark:hover:bg-[#181818]";
                    cellBorder = "border-slate-100 dark:border-[#1a1a1a]/30";
                  } else {
                    if (dStr <= todayStr) {
                      dayType = "absent";
                      cellBg = "bg-rose-50/30 dark:bg-rose-950/10 hover:bg-rose-100/30 dark:hover:bg-rose-950/25";
                      cellBorder = "border-rose-100 dark:border-rose-950/30 text-rose-500";
                    } else {
                      dayType = "future";
                    }
                  }

                  return (
                    <div 
                      key={idx} 
                      onClick={() => openDayDetailsModal(dStr, selectedEmployeeId)}
                      className={`rounded-2xl border ${cellBorder} ${cellBg} p-3 min-h-[105px] flex flex-col justify-between transition-all cursor-pointer hover:shadow-xs group`}
                    >
                      {/* Day Header */}
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-bold text-xs text-slate-600 dark:text-gray-300 group-hover:text-emerald-600">{day.getDate()}</span>
                        
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

                      {/* Day Specific Content */}
                      <div className="my-1 text-center">
                        {punch ? (
                          <div className="space-y-1">
                            <p className="text-[9px] font-mono text-slate-400 dark:text-gray-500">
                              {new Date(punch.clockIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              {punch.clockOut && ` - ${new Date(punch.clockOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                            </p>
                            <p className="text-[10px] font-bold text-slate-700 dark:text-gray-300 font-mono">
                              {calculatePunchHours(punch)} hrs
                            </p>
                            {punch.breaks && punch.breaks.length > 0 && (
                              <p className="text-[9px] text-amber-600 dark:text-amber-500 font-mono font-medium mt-0.5">
                                Break: {formatBreakDuration(punch)}
                              </p>
                            )}
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
                          <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">Weekend Rest</p>
                        ) : dayType === "absent" ? (
                          <p className="text-[9px] font-semibold text-rose-500 dark:text-rose-400">Absent</p>
                        ) : (
                          <p className="text-[9px] text-slate-300 dark:text-slate-700 font-mono">-</p>
                        )}
                      </div>

                      {/* WFH Badge */}
                      <div className="mt-1 pt-1 border-t border-slate-100/50 dark:border-slate-800/40 flex justify-center items-center">
                        {punch?.workFromHome ? (
                          <span className="text-[8px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                            <Home className="w-2.5 h-2.5" /> WFH
                          </span>
                        ) : punch ? (
                          <span className="text-[8px] font-bold text-slate-400 flex items-center gap-0.5">
                            <Briefcase className="w-2.5 h-2.5" /> Office
                          </span>
                        ) : (
                          <span className="text-[8px] text-transparent">-</span>
                        )}
                      </div>
                    </div>
                  );
                });

                return [...spacerCells, ...dayCells];
              })()}
            </div>
          </div>
        </div>
      )}

      {/* DAY DETAILS & EDIT MODAL */}
      {selectedDayModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-xl animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-[#1a1a1a] pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-600">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-semibold text-slate-800 dark:text-white text-base">
                    Day Log Details ({selectedDayModal.date})
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">
                    {getEmployeeName(selectedDayModal.employeeId)} ({selectedDayModal.employeeId}) • {getEmployeeBranch(selectedDayModal.employeeId)}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDayModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Employee Mode (Read Only) */}
            {role === "employee" ? (
              <div className="space-y-4 text-xs">
                {(() => {
                  const punch = attendance.find(a => a.employeeId === selectedDayModal.employeeId && a.date === selectedDayModal.date);
                  const leave = getApprovedLeaveOnDate(selectedDayModal.employeeId, selectedDayModal.date);
                  const holiday = getHolidayOnDate(selectedDayModal.date);
                  const dayObj = new Date(selectedDayModal.date);
                  const isWeekend = dayObj.getDay() === 0 || dayObj.getDay() === 6;

                  return (
                    <>
                      {/* Status Summary Banner */}
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attendance Status</span>
                          <span className="text-sm font-bold text-slate-800 dark:text-white mt-0.5 block">
                            {punch ? punch.status : leave ? `Leave (${leave.leaveType})` : holiday ? `Holiday (${holiday.name})` : isWeekend ? "Weekend Rest Day" : "Absent"}
                          </span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          punch?.status === "Present" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400" :
                          punch?.status === "Late" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400" :
                          leave ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-400" :
                          isWeekend ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300" :
                          "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400"
                        }`}>
                          {punch ? punch.status : leave ? "ON LEAVE" : holiday ? "HOLIDAY" : isWeekend ? "REST DAY" : "ABSENT"}
                        </span>
                      </div>

                      {/* Timings Bento */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-[#1a1a1a] rounded-xl border border-slate-100 dark:border-[#2a2a2a]">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Clock In</span>
                          <span className="text-base font-bold text-slate-800 dark:text-white font-mono mt-1 block">
                            {punch ? new Date(punch.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-[#1a1a1a] rounded-xl border border-slate-100 dark:border-[#2a2a2a]">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Clock Out</span>
                          <span className="text-base font-bold text-slate-800 dark:text-white font-mono mt-1 block">
                            {punch?.clockOut ? new Date(punch.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : punch ? "Shift Active" : "--:--"}
                          </span>
                        </div>
                      </div>

                      {/* Work Hours & Mode */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-[#1a1a1a] rounded-xl border border-slate-100 dark:border-[#2a2a2a]">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
                          <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
                            {punch ? `${calculatePunchHours(punch)} hrs` : "0 hrs"}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-[#1a1a1a] rounded-xl border border-slate-100 dark:border-[#2a2a2a]">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Work Location</span>
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-1">
                            {punch?.workFromHome ? <Home className="w-3.5 h-3.5" /> : <Briefcase className="w-3.5 h-3.5" />}
                            {punch?.workFromHome ? "Work From Home (WFH)" : "In-Office Physical"}
                          </span>
                        </div>
                      </div>

                      {/* Breaks Breakdown */}
                      <div className="p-3 bg-slate-50 dark:bg-[#1a1a1a] rounded-xl border border-slate-100 dark:border-[#2a2a2a] space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1 justify-between w-full">
                          <span className="flex items-center gap-1">
                            <Coffee className="w-3.5 h-3.5 text-amber-500" />
                            <span>Breaks Taken ({punch?.breaks.length || 0})</span>
                          </span>
                          {punch && (
                            <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">
                              Total: {formatBreakDuration(punch)}
                            </span>
                          )}
                        </span>
                        {punch && punch.breaks.length > 0 ? (
                          <div className="space-y-1 pt-1">
                            {punch.breaks.map((b, idx) => {
                              const bStart = new Date(b.start);
                              const bEnd = b.end ? new Date(b.end) : null;
                              const diffMins = bEnd ? Math.round((bEnd.getTime() - bStart.getTime()) / 60000) : 0;

                              return (
                                <div key={idx} className="flex justify-between items-center text-[11px] font-mono text-slate-600 dark:text-gray-300 py-1 border-b border-slate-100/50 dark:border-[#2a2a2a] last:border-none">
                                  <span>Break {idx + 1}: {bStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {bEnd ? bEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Active"}</span>
                                  <span className="font-bold text-amber-600">{bEnd ? `${diffMins} mins` : "In Progress"}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-slate-400 text-[11px] italic">No break intervals recorded for this day.</p>
                        )}
                      </div>

                      {/* Notes / Remarks */}
                      {punch?.notes && (
                        <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                          <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">Admin Remarks</span>
                          <p className="text-xs text-indigo-900 dark:text-indigo-200 mt-1">{punch.notes}</p>
                        </div>
                      )}
                    </>
                  );
                })()}

                <div className="pt-3 border-t border-slate-100 dark:border-[#1a1a1a] flex justify-end">
                  <button
                    onClick={() => setSelectedDayModal(null)}
                    className="bg-slate-100 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-300 font-semibold px-5 py-2 rounded-xl hover:bg-slate-200 dark:hover:bg-[#252525] transition-all cursor-pointer"
                  >
                    Close Log View
                  </button>
                </div>
              </div>
            ) : (
              /* Modal Body: Admin & HR Editable Form */
              <form onSubmit={handleSaveDayDetails} className="space-y-4 text-xs font-semibold">
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Attendance Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] p-2.5 rounded-xl text-slate-800 dark:text-white focus:outline-hidden"
                    >
                      <option value="Present">Present (On Time)</option>
                      <option value="Late">Late Entry</option>
                      <option value="Half Day">Half Day Shift</option>
                      <option value="Absent">Absent</option>
                      <option value="On Leave">On Leave</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Work Location Mode</label>
                    <div className="flex items-center space-x-2 pt-2">
                      <input
                        type="checkbox"
                        id="editWfh"
                        checked={editWfh}
                        onChange={(e) => setEditWfh(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="editWfh" className="text-slate-700 dark:text-gray-300 cursor-pointer flex items-center gap-1 text-xs">
                        <Home className="w-3.5 h-3.5 text-blue-500 inline" />
                        <span>Work From Home (WFH)</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Clock In Time</label>
                    <input
                      type="time"
                      value={editClockInTime}
                      onChange={(e) => setEditClockInTime(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] p-2.5 rounded-xl text-slate-800 dark:text-white focus:outline-hidden font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Clock Out Time</label>
                    <input
                      type="time"
                      value={editClockOutTime}
                      onChange={(e) => setEditClockOutTime(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] p-2.5 rounded-xl text-slate-800 dark:text-white focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                {/* Breaks Manager */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-[#1a1a1a]">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                      <Coffee className="w-3.5 h-3.5 text-amber-500" />
                      <span>Break Intervals ({editBreaks.length}) • Total: <b className="text-amber-600 dark:text-amber-400">{getEditBreaksTotalDuration()}</b></span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddBreakRow}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Break</span>
                    </button>
                  </div>

                  {editBreaks.length > 0 ? (
                    <div className="space-y-2">
                      {editBreaks.map((b, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-[#1a1a1a] p-2 rounded-xl border border-slate-100 dark:border-[#2a2a2a]">
                          <span className="text-[10px] font-mono font-bold text-slate-400 w-12">Break {idx + 1}</span>
                          <input
                            type="time"
                            value={b.start}
                            onChange={(e) => handleUpdateBreakRow(idx, "start", e.target.value)}
                            className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#3a3a3a] text-xs p-1.5 rounded-lg font-mono text-slate-800 dark:text-white"
                          />
                          <span className="text-slate-400 text-xs">to</span>
                          <input
                            type="time"
                            value={b.end}
                            onChange={(e) => handleUpdateBreakRow(idx, "end", e.target.value)}
                            className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#3a3a3a] text-xs p-1.5 rounded-lg font-mono text-slate-800 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveBreakRow(idx)}
                            className="text-rose-500 hover:text-rose-700 ml-auto p-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No breaks configured for this shift.</p>
                  )}
                </div>

                {/* Admin Notes */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Admin Remarks / Exception Notes</label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Enter reason for manual override or status approval..."
                    className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] p-2.5 rounded-xl text-slate-800 dark:text-white focus:outline-hidden text-xs"
                  />
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-[#1a1a1a] flex items-center justify-between">
                  {attendance.some(a => a.employeeId === selectedDayModal.employeeId && a.date === selectedDayModal.date) ? (
                    <button
                      type="button"
                      onClick={handleDeleteDayPunch}
                      className="bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold px-3.5 py-2 rounded-xl transition-all border border-rose-200/60 dark:bg-rose-950/30 dark:border-rose-900/40 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Punch</span>
                    </button>
                  ) : (
                    <div></div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDayModal(null)}
                      className="bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 hover:text-slate-800 hover:dark:text-white px-4 py-2 rounded-xl transition-all border border-slate-100 dark:border-[#2a2a2a] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
            {/* MANUAL PUNCH FORM MODAL (Admin & HR) */}
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
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleManualPunchSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Select Employee</label>
                <select
                  value={manualEmpId}
                  onChange={(e) => setManualEmpId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] p-2.5 rounded-xl text-slate-800 dark:text-white focus:outline-hidden"
                >
                  {groupedEmployees.map(group => (
                    <optgroup key={group.branch} label={group.branch}>
                      {group.employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName} ({emp.id}) - {emp.role.toUpperCase()}
                        </option>
                      ))}
                    </optgroup>
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
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Status</label>
                  <select
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] p-2.5 rounded-xl text-slate-800 dark:text-white focus:outline-hidden"
                  >
                    <option value="Present">Present</option>
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
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
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

      {/* TIMING SETTINGS CONFIGURATION MODAL (Admin & HR) */}
      {showTimingSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] w-full max-w-md rounded-2xl p-6 space-y-4 shadow-xl animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-[#1a1a1a] pb-3">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-emerald-500" />
                <h4 className="font-display font-semibold text-slate-800 dark:text-white">Configure Roster Timings</h4>
              </div>
              <button 
                onClick={() => setShowTimingSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (onSaveTimingSettings) {
                  onSaveTimingSettings({
                    clockInTime: settingsClockIn,
                    clockOutTime: settingsClockOut,
                    lateThreshold: settingsLateThreshold,
                    breakStartTime: settingsBreakStart,
                    breakEndTime: settingsBreakEnd
                  });
                }
                setShowTimingSettingsModal(false);
              }} 
              className="space-y-4 text-xs font-semibold"
            >
              <div className="bg-slate-50/50 dark:bg-[#0a0a0a]/30 p-3.5 rounded-xl border border-slate-100/50 dark:border-[#1a1a1a] space-y-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Shift Start / End & Late Policy</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400">Standard Clock-In</label>
                    <input
                      type="time"
                      value={settingsClockIn}
                      onChange={(e) => setSettingsClockIn(e.target.value)}
                      className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] p-2.5 rounded-xl text-slate-800 dark:text-white focus:outline-hidden font-mono"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400">Late Login Threshold</label>
                    <input
                      type="time"
                      value={settingsLateThreshold}
                      onChange={(e) => setSettingsLateThreshold(e.target.value)}
                      className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] p-2.5 rounded-xl text-slate-800 dark:text-white focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] text-slate-400">Standard Clock-Out</label>
                  <input
                    type="time"
                    value={settingsClockOut}
                    onChange={(e) => setSettingsClockOut(e.target.value)}
                    className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] p-2.5 rounded-xl text-slate-800 dark:text-white focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="bg-slate-50/50 dark:bg-[#0a0a0a]/30 p-3.5 rounded-xl border border-slate-100/50 dark:border-[#1a1a1a] space-y-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Standard Break Window</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400">Break Start Time</label>
                    <input
                      type="time"
                      value={settingsBreakStart}
                      onChange={(e) => setSettingsBreakStart(e.target.value)}
                      className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] p-2.5 rounded-xl text-slate-800 dark:text-white focus:outline-hidden font-mono"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400">Break End Time</label>
                    <input
                      type="time"
                      value={settingsBreakEnd}
                      onChange={(e) => setSettingsBreakEnd(e.target.value)}
                      className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] p-2.5 rounded-xl text-slate-800 dark:text-white focus:outline-hidden font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-50 dark:border-[#1a1a1a] flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowTimingSettingsModal(false)}
                  className="bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 hover:text-slate-800 hover:dark:text-white px-4 py-2.5 rounded-xl transition-all border border-slate-100 dark:border-[#2a2a2a] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Save Timing Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
