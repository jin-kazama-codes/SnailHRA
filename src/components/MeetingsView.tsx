"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Video, Calendar, Clock, Plus, Search, Users, Check, X,
  Trash2, MapPin, Link2, UserCheck, Sparkles, Filter, Info, ShieldAlert,
  ChevronLeft, ChevronRight, List, Pencil, Lock
} from "lucide-react";
import { Meeting, Employee, UserRole } from "../types";

interface MeetingsViewProps {
  meetings: Meeting[];
  employees: Employee[];
  role: UserRole;
  currentEmployeeId: string;
  customDepartments: string[];
  onAddMeeting: (meetingData: any) => Promise<boolean>;
  onCancelMeeting: (id: string) => Promise<boolean>;
  onEditMeeting?: (id: string, updateData: any) => Promise<boolean>;
  companyName?: string;
}

export default function MeetingsView({
  meetings = [],
  employees = [],
  role,
  currentEmployeeId,
  customDepartments = [],
  onAddMeeting,
  onCancelMeeting,
  onEditMeeting,
  companyName = "SnailHR"
}: MeetingsViewProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  // Live clock tick — updates every second for countdown timers
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("Upcoming"); // 'Upcoming', 'Today', 'Past', 'All'

  // Calendar View states
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(todayStr + "T00:00:00"));
  const [miniMonth, setMiniMonth] = useState<Date>(() => new Date(todayStr + "T00:00:00"));
  const [calendarView, setCalendarView] = useState<"month" | "workweek" | "week" | "day">("workweek");
  const [selectedDetailMeeting, setSelectedDetailMeeting] = useState<Meeting | null>(null);

  // Edit Meeting Modal state
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Active Jitsi Meeting Call room state
  const [activeCallRoom, setActiveCallRoom] = useState<{ id: string; title: string; link: string } | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reasonDropdown, setReasonDropdown] = useState("General");
  const [reason, setReason] = useState("General");
  const [meetingType, setMeetingType] = useState<"Online" | "Offline" | "Hybrid">("Online");
  const [organizerId, setOrganizerId] = useState(currentEmployeeId);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [meetingDepartment, setMeetingDepartment] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Urgent">("Medium");
  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [endTime, setEndTime] = useState(() => {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 60000);
    return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  });
  const [timezone, setTimezone] = useState("IST (UTC+5:30)");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");

  // Participant search query inside form
  const [participantSearch, setParticipantSearch] = useState("");

  const currentEmployee = useMemo(() => {
    return employees.find(e => e.id === currentEmployeeId);
  }, [employees, currentEmployeeId]);

  // Helper to calculate duration automatically
  const durationText = useMemo(() => {
    if (!startTime || !endTime) return "";
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return "";

    let diffMins = (eh * 60 + em) - (sh * 60 + sm);
    if (diffMins < 0) return "Invalid End Time";

    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h`;
    return `${diffMins}m`;
  }, [startTime, endTime]);

  // Generate unique Jitsi link based on title
  const generateJitsiLink = (meetingTitle: string) => {
    const slug = meetingTitle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const uniqueRoom = `${slug || "meeting"}-${randomSuffix}`;
    return `https://meet.jit.si/SnailHRA-${uniqueRoom}`;
  };

  // Prefill Jitsi link if Online or Hybrid is selected
  const handleMeetingTypeChange = (type: "Online" | "Offline" | "Hybrid") => {
    setMeetingType(type);
    if (type === "Online" || type === "Hybrid") {
      const generatedLink = generateJitsiLink(title || "Call");
      setMeetingLink(generatedLink);
    } else {
      setMeetingLink("");
    }
  };

  const handleTitleBlur = () => {
    if ((meetingType === "Online" || meetingType === "Hybrid") && !meetingLink && title) {
      setMeetingLink(generateJitsiLink(title));
    }
  };

  // Helper to check if a meeting is closed (end time has passed)
  // Parses date parts explicitly to avoid UTC vs local time ambiguity
  const isMeetingClosed = (meet: Meeting): boolean => {
    try {
      const [year, month, day] = meet.date.split("-").map(Number);
      const [hours, minutes] = meet.endTime.split(":").map(Number);
      const endDateTime = new Date(year, month - 1, day, hours, minutes, 0);
      return endDateTime < new Date();
    } catch {
      return false;
    }
  };

  // Helper to check if a meeting is currently live (started but not ended)
  const isMeetingLive = (meet: Meeting): boolean => {
    try {
      const [year, month, day] = meet.date.split("-").map(Number);
      const [sh, sm] = meet.startTime.split(":").map(Number);
      const [eh, em] = meet.endTime.split(":").map(Number);
      const startDateTime = new Date(year, month - 1, day, sh, sm, 0);
      const endDateTime = new Date(year, month - 1, day, eh, em, 0);
      const now = new Date();
      return now >= startDateTime && now < endDateTime;
    } catch {
      return false;
    }
  };

  // Returns a live HH:MM:SS countdown string for upcoming/live meetings
  const getTimeRemaining = (meet: Meeting): string | null => {
    try {
      const [year, month, day] = meet.date.split("-").map(Number);
      const [sh, sm] = meet.startTime.split(":").map(Number);
      const [eh, em] = meet.endTime.split(":").map(Number);
      const startDt = new Date(year, month - 1, day, sh, sm, 0);
      const endDt = new Date(year, month - 1, day, eh, em, 0);
      if (now >= endDt) return null; // closed

      const targetDt = now >= startDt ? endDt : startDt;
      const prefix = now >= startDt ? "Ends in" : "Starts in";

      const diffMs = targetDt.getTime() - now.getTime();
      const totalSecs = Math.max(0, Math.floor(diffMs / 1000));
      const d = Math.floor(totalSecs / 86400);
      const h = Math.floor((totalSecs % 86400) / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;

      const pad = (n: number) => String(n).padStart(2, "0");

      if (d > 0) {
        return `${prefix} ${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
      }
      return `${prefix} ${pad(h)}:${pad(m)}:${pad(s)}`;
    } catch {
      return null;
    }
  };


  // Open edit modal for a meeting
  const openEditModal = (meet: Meeting) => {
    setEditingMeeting(meet);
    setEditDate(meet.date);
    setEditStartTime(meet.startTime);
    setEditEndTime(meet.endTime);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting || !onEditMeeting) return;
    if (!editDate || !editStartTime || !editEndTime) return;

    const [sh, sm] = editStartTime.split(":").map(Number);
    const [eh, em] = editEndTime.split(":").map(Number);
    const diffMins = (eh * 60 + em) - (sh * 60 + sm);
    if (diffMins <= 0) return;

    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const newDuration = hrs > 0 && mins > 0 ? `${hrs}h ${mins}m` : hrs > 0 ? `${hrs}h` : `${diffMins}m`;

    setIsEditSubmitting(true);
    try {
      const success = await onEditMeeting(editingMeeting.id, {
        date: editDate,
        startTime: editStartTime,
        endTime: editEndTime,
        duration: newDuration
      });
      if (success) {
        setEditingMeeting(null);
        setSelectedDetailMeeting(null);
      }
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const toggleParticipant = (empId: string) => {
    if (selectedParticipants.includes(empId)) {
      setSelectedParticipants(selectedParticipants.filter(id => id !== empId));
    } else {
      setSelectedParticipants([...selectedParticipants, empId]);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !reason || !date || !startTime || !endTime) return;

    // Guard: prevent scheduling in the past
    const startDateTime = new Date(`${date}T${startTime}:00`);
    if (startDateTime < new Date()) {
      alert("Cannot schedule a meeting in the past. Please select a future date and time.");
      return;
    }

    try {
      const finalOrganizerId = role === "admin" || role === "hr" ? organizerId : currentEmployeeId;

      const payload = {
        title,
        description,
        reason,
        type: meetingType,
        organizerId: finalOrganizerId,
        participantIds: selectedParticipants,
        department: meetingDepartment || undefined,
        priority,
        date,
        startTime,
        endTime,
        duration: durationText,
        timezone,
        location: meetingType !== "Online" ? location : undefined,
        link: meetingType !== "Offline" ? meetingLink : undefined,
        companyId: currentEmployee?.companyId || "a1b2c3d4-0001-0001-0001-000000000001"
      };

      const success = await onAddMeeting(payload);
      if (success) {
        // Reset form states
        setTitle("");
        setDescription("");
        setReasonDropdown("General");
        setReason("General");
        setMeetingType("Online");
        setSelectedParticipants([]);
        setMeetingDepartment("");
        setPriority("Medium");
        setDate(todayStr);
        setStartTime("10:00");
        setEndTime("10:30");
        setLocation("");
        setMeetingLink("");
        setShowForm(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered employees listing for participants picker
  const filteredEmployeesList = useMemo(() => {
    return employees.filter(emp => {
      // Exclude organizer from participant candidates
      if (emp.id === (role === "admin" || role === "hr" ? organizerId : currentEmployeeId)) return false;

      const searchLower = participantSearch.toLowerCase();
      return (
        emp.fullName.toLowerCase().includes(searchLower) ||
        emp.id.toLowerCase().includes(searchLower) ||
        emp.department.toLowerCase().includes(searchLower)
      );
    }).sort((a, b) => {
      const rolePriority = { admin: 0, hr: 1, employee: 2, super_admin: 3 };
      const pa = rolePriority[a.role] ?? 2;
      const pb = rolePriority[b.role] ?? 2;
      if (pa !== pb) return pa - pb;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [employees, participantSearch, organizerId, currentEmployeeId, role]);

  // Main meetings filtering
  const filteredMeetings = useMemo(() => {
    return meetings.filter(meet => {
      // 1. Text Search matching title or description
      const query = searchQuery.toLowerCase();
      const textMatch =
        meet.title.toLowerCase().includes(query) ||
        meet.description.toLowerCase().includes(query) ||
        meet.reason.toLowerCase().includes(query);

      if (!textMatch) return false;

      // 2. Role based accessibility filtering: 
      // Employees should only see meetings they organize or participate in
      if (role === "employee") {
        const isOrganizer = meet.organizerId === currentEmployeeId;
        const isParticipant = meet.participantIds?.includes(currentEmployeeId);
        if (!isOrganizer && !isParticipant) return false;
      }

      // 3. Dropdown filtering
      if (typeFilter !== "All" && meet.type !== typeFilter) return false;
      if (priorityFilter !== "All" && meet.priority !== priorityFilter) return false;

      // 4. Date filtering
      const meetDateVal = new Date(meet.date + "T00:00:00");
      const todayVal = new Date(todayStr + "T00:00:00");
      if (dateFilter === "Today" && meet.date !== todayStr) return false;
      if (dateFilter === "Upcoming" && meetDateVal < todayVal) return false;
      if (dateFilter === "Past" && meetDateVal >= todayVal) return false;

      return true;
    }).sort((a, b) => {
      // Sort upcoming meetings closest first, and past meetings reverse chronological
      const dateA = new Date(a.date + "T" + a.startTime).getTime();
      const dateB = new Date(b.date + "T" + b.startTime).getTime();
      if (dateFilter === "Past") {
        return dateB - dateA;
      }
      return dateA - dateB;
    });
  }, [meetings, searchQuery, typeFilter, priorityFilter, dateFilter, role, currentEmployeeId, todayStr]);

  // Calendar meetings: filtered except by dateFilter, sorted chronologically
  const calendarMeetings = useMemo(() => {
    return meetings.filter(meet => {
      // 1. Text Search matching title or description
      const query = searchQuery.toLowerCase();
      const textMatch =
        meet.title.toLowerCase().includes(query) ||
        meet.description.toLowerCase().includes(query) ||
        meet.reason.toLowerCase().includes(query);

      if (!textMatch) return false;

      // 2. Role based accessibility filtering
      if (role === "employee") {
        const isOrganizer = meet.organizerId === currentEmployeeId;
        const isParticipant = meet.participantIds?.includes(currentEmployeeId);
        if (!isOrganizer && !isParticipant) return false;
      }

      // 3. Dropdown filtering
      if (typeFilter !== "All" && meet.type !== typeFilter) return false;
      if (priorityFilter !== "All" && meet.priority !== priorityFilter) return false;

      return true;
    }).sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });
  }, [meetings, searchQuery, typeFilter, priorityFilter, role, currentEmployeeId]);

  // Generate mini monthly calendar grid dates (42 days, Sun-Sat columns)
  const miniCalendarDays = useMemo(() => {
    const year = miniMonth.getFullYear();
    const month = miniMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 (Sunday) to 6 (Saturday)
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - startDayOfWeek);
    
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  }, [miniMonth]);

  // Generate main weekly grid columns (Mon-Fri or Mon-Sun or 1 day)
  const mainCalendarDays = useMemo(() => {
    if (calendarView === "day") {
      return [new Date(selectedDate)];
    }
    const days: Date[] = [];
    const currentDay = selectedDate.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    const monday = new Date(selectedDate);
    monday.setDate(selectedDate.getDate() + distanceToMonday);
    
    const limit = calendarView === "workweek" ? 5 : 7;
    for (let i = 0; i < limit; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [selectedDate, calendarView]);

  // Generate month days matrix for Month View in main panel
  const monthDaysForMain = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: (Date | null)[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [selectedDate]);

  // Generate date range label for main calendar header (e.g. "July 2026" or "27–31 July, 2026")
  const mainCalendarRangeLabel = useMemo(() => {
    if (calendarView === "month") {
      return selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (calendarView === "day") {
      return selectedDate.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
    }
    if (mainCalendarDays.length === 0) return "";
    const first = mainCalendarDays[0];
    const last = mainCalendarDays[mainCalendarDays.length - 1];
    
    const firstYear = first.getFullYear();
    const lastYear = last.getFullYear();
    
    const firstMonthStr = first.toLocaleDateString("en-US", { month: "short" });
    const lastMonthStr = last.toLocaleDateString("en-US", { month: "short" });
    
    const firstDayNum = first.getDate();
    const lastDayNum = last.getDate();
    
    if (firstYear !== lastYear) {
      return `${firstDayNum} ${firstMonthStr}, ${firstYear} – ${lastDayNum} ${lastMonthStr}, ${lastYear}`;
    }
    if (firstMonthStr !== lastMonthStr) {
      return `${firstDayNum} ${firstMonthStr} – ${lastDayNum} ${lastMonthStr}, ${firstYear}`;
    }
    return `${firstDayNum}–${lastDayNum} ${first.toLocaleDateString("en-US", { month: "long" })}, ${firstYear}`;
  }, [mainCalendarDays, calendarView, selectedDate]);

  const getLocalDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dateVal = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dateVal}`;
  };

  const HOUR_HEIGHT = 64; // height in px of 1 hour row
  const START_HOUR = 8; // start calendar hour (8 AM)
  const hoursRange = Array.from({ length: 15 }, (_, i) => START_HOUR + i); // 8, 9, 10, ..., 22

  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  // Position resolver for overlapping meetings in a single day column
  const getPositionedMeetings = (dayMeetings: Meeting[]) => {
    const sorted = dayMeetings.map(m => {
      const startMin = timeToMinutes(m.startTime);
      const endMin = timeToMinutes(m.endTime);
      return {
        ...m,
        startMin,
        endMin,
        top: Math.max(0, ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT),
        height: Math.max(24, ((endMin - startMin) / 60) * HOUR_HEIGHT)
      };
    }).sort((a, b) => a.startMin - b.startMin);

    const columns: typeof sorted[] = [];
    
    for (const meet of sorted) {
      let placed = false;
      for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        const col = columns[colIdx];
        const lastInCol = col[col.length - 1];
        if (meet.startMin >= lastInCol.endMin) {
          col.push(meet);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([meet]);
      }
    }

    const result: (Meeting & { top: number; height: number; left: number; width: number })[] = [];
    const totalCols = columns.length;
    
    columns.forEach((col, colIdx) => {
      col.forEach(meet => {
        result.push({
          ...meet,
          left: (colIdx / totalCols) * 100,
          width: (1 / totalCols) * 100 - 2
        });
      });
    });

    return result;
  };

  // Metrics calculators
  const stats = useMemo(() => {
    // Standard filtering applies for the metrics
    const accessible = meetings.filter(meet => {
      if (role === "employee") {
        return meet.organizerId === currentEmployeeId || meet.participantIds?.includes(currentEmployeeId);
      }
      return true;
    });

    const todayCount = accessible.filter(m => m.date === todayStr).length;
    const upcomingCount = accessible.filter(m => new Date(m.date + "T00:00:00") >= new Date(todayStr + "T00:00:00")).length;
    const jitsiCount = accessible.filter(m => (m.type === "Online" || m.type === "Hybrid") && m.link?.includes("jit.si")).length;

    return {
      total: accessible.length,
      today: todayCount,
      upcoming: upcomingCount,
      jitsi: jitsiCount
    };
  }, [meetings, role, currentEmployeeId, todayStr]);

  const getEmployeeName = (empId: string) => {
    return employees.find(e => e.id === empId)?.fullName || empId;
  };

  const getEmployeeAvatar = (empId: string) => {
    return employees.find(e => e.id === empId)?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop";
  };

  return (
    <div className="space-y-6">

      {/* 1. Header Desk */}
      <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
            <Video className="w-5.5 h-5.5 text-emerald-500" />
            <span>Calendar & Meeting Scheduler</span>
          </h2>
          <p className="text-xs text-slate-400 dark:text-gray-400">Coordinate and launch sync-ups, board reviews, and hiring interviews with Jitsi video calling</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Calendar / List View switcher tabs */}
          <div className="bg-slate-50 dark:bg-[#151515] p-1 rounded-xl flex items-center border border-slate-200/40 dark:border-[#222]">
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1 text-[11px] font-bold transition-all cursor-pointer flex-1 sm:flex-none ${
                viewMode === "calendar"
                  ? "bg-white dark:bg-[#252525] text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar View</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1 text-[11px] font-bold transition-all cursor-pointer flex-1 sm:flex-none ${
                viewMode === "list"
                  ? "bg-white dark:bg-[#252525] text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Metric Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 flex items-center space-x-3.5 shadow-xs">
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#151515] text-slate-500 dark:text-gray-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">Total Scheduled</p>
            <p className="text-lg font-extrabold font-display text-slate-700 dark:text-gray-200 mt-0.5">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 flex items-center space-x-3.5 shadow-xs">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">Meetings Today</p>
            <p className="text-lg font-extrabold font-display text-slate-700 dark:text-gray-200 mt-0.5">{stats.today}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 flex items-center space-x-3.5 shadow-xs">
          <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">Upcoming Events</p>
            <p className="text-lg font-extrabold font-display text-slate-700 dark:text-gray-200 mt-0.5">{stats.upcoming}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 flex items-center space-x-3.5 shadow-xs">
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">Jitsi Rooms Ready</p>
            <p className="text-lg font-extrabold font-display text-slate-700 dark:text-gray-200 mt-0.5">{stats.jitsi}</p>
          </div>
        </div>
      </div>

      {/* 3. Scheduling Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-6 shadow-2xl dark:neon-glow animate-in zoom-in-95 duration-200 max-w-3xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center pb-3 border-b border-slate-50 dark:border-[#1a1a1a] mb-5">
              <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>Schedule Corporate Meeting</span>
              </h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-base cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Title & Description */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 dark:text-gray-400">Meeting Title <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={handleTitleBlur}
                      placeholder="e.g. Monthly HR Performance Review"
                      className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a] focus:border-emerald-500 outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-slate-500 dark:text-gray-400">Agenda / Description <span className="text-rose-500">*</span></label>
                    <textarea
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Detailed agenda or purpose of the call..."
                      className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a] focus:border-emerald-500 outline-none transition-colors resize-none"
                    />
                  </div>

                  {/* Reason/Category block */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 dark:text-gray-400">Reason / Category <span className="text-rose-500">*</span></label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select
                        value={reasonDropdown}
                        onChange={(e) => {
                          const val = e.target.value;
                          setReasonDropdown(val);
                          if (val !== "Other") {
                            setReason(val);
                          }
                        }}
                        className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a] outline-none"
                      >
                        <option value="General">General Sync</option>
                        <option value="Monthly HR Review">Monthly HR Review</option>
                        <option value="Performance Appraisal">Performance Appraisal</option>
                        <option value="Technical Interview">Technical Interview</option>
                        <option value="Employee Onboarding">Employee Onboarding</option>
                        <option value="NBFC Credit Audits">NBFC Credit Audits</option>
                        <option value="Sales & Commissions Sync">Sales & Commissions Sync</option>
                        <option value="Disciplinary Resolution">Disciplinary Resolution</option>
                        <option value="Other">Other (Write Custom)...</option>
                      </select>

                      <input
                        type="text"
                        required
                        value={reason}
                        onChange={(e) => {
                          const val = e.target.value;
                          setReason(val);
                          const presets = [
                            "General", "Monthly HR Review", "Performance Appraisal",
                            "Technical Interview", "Employee Onboarding", "NBFC Credit Audits",
                            "Sales & Commissions Sync", "Disciplinary Resolution"
                          ];
                          if (!presets.includes(val)) {
                            setReasonDropdown("Other");
                          } else {
                            setReasonDropdown(val);
                          }
                        }}
                        placeholder="Or write custom reason..."
                        className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a] focus:border-emerald-500 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 dark:text-gray-400">Meeting Type <span className="text-rose-500">*</span></label>
                      <select
                        value={meetingType}
                        onChange={(e) => handleMeetingTypeChange(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a] outline-none"
                      >
                        <option value="Online">Online (Jitsi Meet)</option>
                        <option value="Offline">Offline (Physical Room)</option>
                        <option value="Hybrid">Hybrid (Room + Video Link)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-slate-500 dark:text-gray-400">Priority</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a] outline-none"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-slate-500 dark:text-gray-400">Associated Department</label>
                    <select
                      value={meetingDepartment}
                      onChange={(e) => setMeetingDepartment(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a] outline-none"
                    >
                      <option value="">None / Company-wide</option>
                      {customDepartments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Time, Location & Participants */}
                <div className="space-y-4">

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 dark:text-gray-400">Date <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        required
                        min={todayStr}
                        value={date}
                        onChange={(e) => {
                          const newDate = e.target.value;
                          setDate(newDate);
                          if (newDate === todayStr) {
                            // Switch to today — set start to current time, end to +30m
                            const now = new Date();
                            const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
                            const endD = new Date(now.getTime() + 30 * 60000);
                            const endStr = `${String(endD.getHours()).padStart(2, "0")}:${String(endD.getMinutes()).padStart(2, "0")}`;
                            setStartTime(nowStr);
                            setEndTime(endStr);
                          } else if (newDate > todayStr) {
                            // Future date — reset to sensible morning defaults
                            setStartTime("09:00");
                            setEndTime("09:30");
                          }
                        }}
                        className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2 rounded-xl border border-slate-100 dark:border-[#2a2a2a] outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-slate-500 dark:text-gray-400">Start Time <span className="text-rose-500">*</span></label>
                      <input
                        type="time"
                        required
                        min={date === todayStr ? new Date().toTimeString().slice(0, 5) : undefined}
                        value={startTime}
                        onChange={(e) => {
                          setStartTime(e.target.value);
                          // Auto-push end time if it's now before or equal to start time
                          const [sh, sm] = e.target.value.split(":").map(Number);
                          const [eh, em] = endTime.split(":").map(Number);
                          if (!isNaN(sh) && !isNaN(eh) && (eh * 60 + em) <= (sh * 60 + sm)) {
                            const newEnd = new Date(0, 0, 0, sh, sm + 30);
                            setEndTime(`${String(newEnd.getHours()).padStart(2, "0")}:${String(newEnd.getMinutes()).padStart(2, "0")}`);
                          }
                        }}
                        className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2 rounded-xl border border-slate-100 dark:border-[#2a2a2a] outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-slate-500 dark:text-gray-400">End Time <span className="text-rose-500">*</span></label>
                      <input
                        type="time"
                        required
                        min={startTime || undefined}
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2 rounded-xl border border-slate-100 dark:border-[#2a2a2a] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 dark:text-gray-400">Calculated Duration</label>
                      <input
                        type="text"
                        disabled
                        value={durationText}
                        className="w-full bg-slate-100 dark:bg-[#111] text-slate-500 dark:text-gray-400 p-2.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a] font-bold outline-none cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-slate-500 dark:text-gray-400">Time Zone</label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a] outline-none"
                      >
                        <option value="IST (UTC+5:30)">IST (UTC+5:30)</option>
                        <option value="UTC">UTC (Universal)</option>
                        <option value="GMT (UTC+0)">GMT (London)</option>
                        <option value="EST (UTC-5)">EST (New York)</option>
                        <option value="PST (UTC-8)">PST (Los Angeles)</option>
                      </select>
                    </div>
                  </div>

                  {/* Organizer (Admin/HR only) */}
                  {(role === "admin" || role === "hr") && (
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 dark:text-gray-400">Organizer / Host</label>
                      <select
                        value={organizerId}
                        onChange={(e) => setOrganizerId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a] outline-none"
                      >
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.id})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Conditional Fields based on Meeting Type */}
                  {meetingType !== "Online" && (
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 dark:text-gray-400">Physical Location <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Conference Room A, 3rd Floor"
                        className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a] outline-none"
                      />
                    </div>
                  )}

                  {meetingType !== "Offline" && (
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 dark:text-gray-400">Jitsi Call Video URL <span className="text-rose-500">*</span></label>
                      <input
                        type="url"
                        required
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                        placeholder="e.g. https://meet.jit.si/your-room"
                        className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a] outline-none"
                      />
                    </div>
                  )}

                  {/* Participants Picker */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-slate-500 dark:text-gray-400">
                        Attending Participants <span className="text-rose-500">*</span>{" "}
                        <span className="text-slate-400 dark:text-gray-500">({selectedParticipants.length} selected)</span>
                      </label>
                      {filteredEmployeesList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const allIds = filteredEmployeesList.map(e => e.id);
                            const allSelected = allIds.every(id => selectedParticipants.includes(id));
                            if (allSelected) {
                              setSelectedParticipants(prev => prev.filter(id => !allIds.includes(id)));
                            } else {
                              setSelectedParticipants(prev => [...new Set([...prev, ...allIds])]);
                            }
                          }}
                          className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40 transition-colors cursor-pointer"
                        >
                          {filteredEmployeesList.every(e => selectedParticipants.includes(e.id))
                            ? "✓ Deselect All"
                            : "+ Select All"}
                        </button>
                      )}
                    </div>

                    {/* Search inside picker */}
                    <div className="relative mb-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search employees to invite..."
                        value={participantSearch}
                        onChange={(e) => setParticipantSearch(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 pl-8 pr-3 py-1.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a] outline-none text-[11px]"
                      />
                    </div>

                    {/* Multi-select box */}
                    <div className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] rounded-xl p-2.5 max-h-40 overflow-y-auto custom-scrollbar space-y-1.5">
                      {filteredEmployeesList.length === 0 ? (
                        <p className="text-slate-400 text-center py-2">No employee matches search filter</p>
                      ) : (
                        filteredEmployeesList.map(emp => {
                          const isChecked = selectedParticipants.includes(emp.id);
                          const roleLabel = emp.role === "admin" ? "Admin" : emp.role === "hr" ? "HR" : "Employee";
                          const roleBadgeClass =
                            emp.role === "admin"
                              ? "bg-purple-50 text-purple-600 border-purple-200/60 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/40"
                              : emp.role === "hr"
                              ? "bg-sky-50 text-sky-600 border-sky-200/60 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/40"
                              : "bg-slate-100 text-slate-500 border-slate-200/60 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700/40";
                          return (
                            <div
                              key={emp.id}
                              onClick={() => toggleParticipant(emp.id)}
                              className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${isChecked
                                  ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                                  : "hover:bg-slate-100 dark:hover:bg-[#222]"
                                }`}
                            >
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <img
                                  src={emp.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop"}
                                  alt={emp.fullName}
                                  className="w-7 h-7 rounded-full object-cover shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-bold text-[11px] leading-none">{emp.fullName}</p>
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border leading-none ${roleBadgeClass}`}>
                                      {roleLabel}
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-0.5 truncate">{emp.department} • {emp.id}</p>
                                </div>
                              </div>
                              <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ml-2 ${isChecked
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : "border-slate-300 dark:border-[#333]"
                                }`}>
                                {isChecked && <Check className="w-3 h-3" />}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>

              </div>

              {/* Submit Block */}
              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-50 dark:border-[#1a1a1a]">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-[#2a2a2a] text-slate-600 dark:text-gray-300 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1a1a1a] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title || !description || selectedParticipants.length === 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-1.5 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      <span>Confirm Scheduling</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Filter Desk */}
      <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 shadow-xs flex flex-col md:flex-row justify-between gap-3 text-xs font-semibold">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search meetings by title, description or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 pl-10 pr-4 py-2.5 rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:border-emerald-500 outline-none transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">

          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-[#1a1a1a] px-3 py-1.5 rounded-xl border border-slate-100 dark:border-[#1a1a1a]">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mr-1">Status</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-gray-200 outline-none text-xs border-0 py-0 pr-6 pl-0"
            >
              <option value="Upcoming">Upcoming</option>
              <option value="Today">Today Only</option>
              <option value="Past">Past History</option>
              <option value="All">All</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-[#1a1a1a] px-3 py-1.5 rounded-xl border border-slate-100 dark:border-[#1a1a1a]">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mr-1">Type</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-gray-200 outline-none text-xs border-0 py-0 pr-6 pl-0"
            >
              <option value="All">All Types</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-[#1a1a1a] px-3 py-1.5 rounded-xl border border-slate-100 dark:border-[#1a1a1a]">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mr-1">Priority</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-gray-200 outline-none text-xs border-0 py-0 pr-6 pl-0"
            >
              <option value="All">All Priority</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
            </select>
          </div>

        </div>
      </div>

      {/* 5. Meetings View Content (Calendar View or List View) */}
      {viewMode === "calendar" ? (
        <div className="flex flex-col lg:flex-row gap-5 items-stretch">
          {/* Left Sidebar Panel */}
          <div className="w-full lg:w-64 shrink-0 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-4 space-y-5 flex flex-col shadow-xs">
            {/* Calendar Header with Mini navigation */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
                  {miniMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const prev = new Date(miniMonth);
                      prev.setMonth(prev.getMonth() - 1);
                      setMiniMonth(prev);
                    }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] text-slate-500 dark:text-gray-400 rounded-md cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Date(miniMonth);
                      next.setMonth(next.getMonth() + 1);
                      setMiniMonth(next);
                    }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] text-slate-500 dark:text-gray-400 rounded-md cursor-pointer transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Mini Month Grid */}
              <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-bold text-slate-400">
                {["S", "M", "T", "W", "T", "F", "S"].map((dayName, idx) => (
                  <div key={idx} className="py-1">{dayName}</div>
                ))}

                {miniCalendarDays.map((day, idx) => {
                  const isCurrentMonth = day.getMonth() === miniMonth.getMonth();
                  const isSel = getLocalDateString(day) === getLocalDateString(selectedDate);
                  const isToday = getLocalDateString(day) === todayStr;
                  const hasMeetings = calendarMeetings.some(m => m.date === getLocalDateString(day));

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedDate(day);
                        if (day.getMonth() !== miniMonth.getMonth()) {
                          setMiniMonth(new Date(day.getFullYear(), day.getMonth(), 1));
                        }
                      }}
                      className={`py-1.5 rounded-md text-[9px] font-bold flex flex-col items-center justify-center relative transition-colors cursor-pointer ${
                        !isCurrentMonth
                          ? "text-slate-300 dark:text-gray-700 hover:bg-slate-50 dark:hover:bg-[#1a1a1a]/40"
                          : "text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-[#1e1e1e]"
                      } ${
                        isSel
                          ? "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 font-extrabold"
                          : ""
                      } ${
                        isToday && !isSel
                          ? "ring-1 ring-emerald-500 text-emerald-600 dark:text-emerald-400"
                          : ""
                      }`}
                    >
                      <span>{day.getDate()}</span>
                      {hasMeetings && (
                        <span className={`w-1 h-1 rounded-full absolute bottom-0.5 ${isSel ? "bg-white" : "bg-emerald-500"}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Calendar Panel */}
          <div className="flex-1 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl shadow-xs flex flex-col overflow-hidden min-w-0">
            {/* Header Controls Bar */}
            <div className="p-4 border-b border-slate-100 dark:border-[#1a1a1a] flex flex-wrap items-center justify-between gap-3 text-xs font-semibold shrink-0">
              <div className="flex items-center gap-3">
                {/* Today Button */}
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date(todayStr + "T00:00:00");
                    setSelectedDate(today);
                    setMiniMonth(today);
                  }}
                  className="px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] border border-slate-200/50 dark:border-[#222] text-slate-700 dark:text-gray-300 rounded-lg cursor-pointer transition-colors font-bold shadow-2xs"
                >
                  Today
                </button>

                {/* Prev / Next controls */}
                <div className="flex items-center border border-slate-200/50 dark:border-[#222] rounded-lg overflow-hidden bg-slate-50/50 dark:bg-transparent">
                  <button
                    type="button"
                    onClick={() => {
                      const prev = new Date(selectedDate);
                      if (calendarView === "month") {
                        prev.setMonth(prev.getMonth() - 1);
                      } else if (calendarView === "day") {
                        prev.setDate(prev.getDate() - 1);
                      } else {
                        prev.setDate(prev.getDate() - 7);
                      }
                      setSelectedDate(prev);
                      setMiniMonth(prev);
                    }}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] text-slate-500 dark:text-gray-400 cursor-pointer border-r border-slate-200/40 dark:border-[#222] transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Date(selectedDate);
                      if (calendarView === "month") {
                        next.setMonth(next.getMonth() + 1);
                      } else if (calendarView === "day") {
                        next.setDate(next.getDate() + 1);
                      } else {
                        next.setDate(next.getDate() + 7);
                      }
                      setSelectedDate(next);
                      setMiniMonth(next);
                    }}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] text-slate-500 dark:text-gray-400 cursor-pointer transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Range Label */}
                <h3 className="font-display font-extrabold text-slate-800 dark:text-white text-xs sm:text-sm tracking-wide">
                  {mainCalendarRangeLabel}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {/* View Dropdown */}
                <select
                  value={calendarView}
                  onChange={(e) => setCalendarView(e.target.value as any)}
                  className="bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200/50 dark:border-[#2a2a2a] text-xs font-bold px-3 py-1.5 rounded-xl text-slate-700 dark:text-gray-300 outline-none cursor-pointer"
                >
                  <option value="month">Month</option>
                  <option value="workweek">Work week</option>
                  <option value="week">Week</option>
                  <option value="day">Day</option>
                </select>

                {/* Meet Now Button */}
                <button
                  type="button"
                  onClick={() => {
                    const instantLink = generateJitsiLink("Instant Call");
                    setActiveCallRoom({
                      id: "instant-call",
                      title: "Instant Meeting Call Room",
                      link: instantLink
                    });
                  }}
                  className="bg-slate-50 hover:bg-slate-100 dark:bg-[#151515] dark:hover:bg-[#1e1e1e] border border-slate-200/40 dark:border-[#222] text-slate-700 dark:text-gray-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer font-bold shadow-2xs"
                >
                  <Video className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Meet now</span>
                </button>

                {/* New Meeting Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(true);
                    const generatedLink = generateJitsiLink("Team Sync");
                    setMeetingLink(generatedLink);
                    // Default date to today, start time to now, end time to now+30m
                    setDate(todayStr);
                    const now = new Date();
                    const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
                    const endD = new Date(now.getTime() + 30 * 60000);
                    const endStr = `${String(endD.getHours()).padStart(2, "0")}:${String(endD.getMinutes()).padStart(2, "0")}`;
                    setStartTime(nowStr);
                    setEndTime(endStr);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New meeting</span>
                </button>
              </div>
            </div>

            {/* View Rendering: Month Grid vs Hourly Schedule Grid */}
            {calendarView === "month" ? (
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="grid grid-cols-7 gap-1.5">
                  {/* Weekday headers */}
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, idx) => (
                    <div
                      key={idx}
                      className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider text-center py-1.5 border-b border-slate-100 dark:border-[#1a1a1a]"
                    >
                      {label}
                    </div>
                  ))}

                  {/* Days grid */}
                  {monthDaysForMain.map((day, cellIdx) => {
                    if (!day) {
                      return (
                        <div
                          key={`spacer-${cellIdx}`}
                          className="min-h-[85px] bg-slate-50/10 dark:bg-transparent rounded-xl border border-dashed border-slate-100/50 dark:border-transparent opacity-20"
                        />
                      );
                    }

                    const dateStr = getLocalDateString(day);
                    const dayMeetings = calendarMeetings.filter(m => m.date === dateStr);
                    const isToday = dateStr === todayStr;
                    const isSel = dateStr === getLocalDateString(selectedDate);

                    return (
                      <div
                        key={`day-${dateStr}`}
                        onClick={() => setSelectedDate(day)}
                        className={`min-h-[85px] p-2 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                          isToday
                            ? "bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-500/40 dark:border-emerald-500/30 shadow-xs"
                            : isSel
                            ? "bg-slate-100/50 dark:bg-[#1a1a1a]/80 border-emerald-500/20"
                            : "bg-slate-50/30 dark:bg-[#0b0b0b]/20 border-slate-100 dark:border-[#1a1a1a]/60 hover:border-slate-200 dark:hover:border-emerald-500/10 hover:bg-slate-50 dark:hover:bg-[#0e0e0e]/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-bold w-5.5 h-5.5 flex items-center justify-center rounded-full leading-none ${
                              isToday
                                ? "bg-emerald-600 text-white font-extrabold shadow-sm shadow-emerald-500/20"
                                : "text-slate-700 dark:text-gray-300"
                            }`}
                          >
                            {day.getDate()}
                          </span>

                          {dayMeetings.length > 0 && (
                            <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-bold">
                              {dayMeetings.length}
                            </span>
                          )}
                        </div>

                        {/* Meetings list in cell */}
                        <div className="flex-1 space-y-1 overflow-y-auto max-h-[60px] custom-scrollbar pr-0.5 mt-1">
                          {dayMeetings.map(meet => {
                            const monthIsClosed = isMeetingClosed(meet);
                            let priorityPill = monthIsClosed
                              ? "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-900/30 dark:text-slate-500 dark:border-slate-800 opacity-70"
                              : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800";
                            let dotColor = "bg-slate-400";

                            if (!monthIsClosed) {
                              if (meet.priority === "Low") {
                                priorityPill = "bg-slate-50 text-slate-600 border-slate-200/50 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800/60";
                                dotColor = "bg-slate-400";
                              } else if (meet.priority === "Medium") {
                                priorityPill = "bg-blue-50 text-blue-700 border-blue-100/50 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/30";
                                dotColor = "bg-blue-500";
                              } else if (meet.priority === "High") {
                                priorityPill = "bg-amber-50 text-amber-700 border-amber-100/50 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/30";
                                dotColor = "bg-amber-500";
                              } else if (meet.priority === "Urgent") {
                                priorityPill = "bg-rose-50 text-rose-700 border-rose-100/50 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900/30";
                                dotColor = "bg-rose-500";
                              }
                            }

                            return (
                              <button
                                key={meet.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDetailMeeting(meet);
                                }}
                                className={`w-full text-left p-1 rounded-md text-[9px] font-bold border transition-all flex items-center space-x-1 hover:brightness-105 active:scale-98 cursor-pointer truncate ${priorityPill}`}
                              >
                                {monthIsClosed
                                  ? <Lock className="w-2 h-2 shrink-0 opacity-60" />
                                  : <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                                }
                                <span className="shrink-0 text-[8px] font-semibold opacity-75">{meet.startTime}</span>
                                <span className="truncate">{monthIsClosed ? `[Closed] ${meet.title}` : meet.title}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {/* Column Headers Grid (e.g. Mon 27) */}
                <div className="flex border-b border-slate-100 dark:border-[#1a1a1a]/80 bg-slate-50/20 dark:bg-[#0c0c0c]/10 text-xs font-semibold select-none shrink-0">
                  {/* Left spacer column for hour labels */}
                  <div className="w-16 shrink-0 border-r border-slate-100 dark:border-[#1a1a1a]/80 py-2.5 text-center text-[9px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">Time</div>
                  {/* Day columns headers */}
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${mainCalendarDays.length}, minmax(0, 1fr))` }}>
                    {mainCalendarDays.map((day, idx) => {
                      const isSelected = getLocalDateString(day) === getLocalDateString(selectedDate);
                      const isToday = getLocalDateString(day) === todayStr;

                      return (
                        <div
                          key={idx}
                          className={`text-center py-2 border-r last:border-r-0 border-slate-100 dark:border-[#1a1a1a]/80 flex flex-col items-center justify-center gap-0.5 ${
                            isSelected ? "bg-emerald-500/[0.02]" : ""
                          }`}
                        >
                          <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">
                            {day.toLocaleDateString("en-US", { weekday: "short" })}
                          </span>
                          <span
                            className={`text-xs font-extrabold w-6 h-6 flex items-center justify-center rounded-full leading-none ${
                              isToday
                                ? "bg-emerald-600 text-white font-extrabold shadow-sm shadow-emerald-500/30"
                                : isSelected
                                ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                                : "text-slate-700 dark:text-gray-300"
                            }`}
                          >
                            {day.getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Time & Cards Main Grid (Scrollable) */}
                <div className="flex-1 overflow-y-auto relative min-h-[450px]">
                  <div className="flex relative" style={{ height: `${hoursRange.length * HOUR_HEIGHT}px` }}>
                    {/* Hours column on left */}
                    <div className="w-16 shrink-0 border-r border-slate-100 dark:border-[#1a1a1a]/80 bg-slate-50/10 dark:bg-transparent relative select-none">
                      {hoursRange.map((hr, idx) => (
                        <div
                          key={idx}
                          className="absolute w-full text-right pr-3 text-[10px] font-extrabold text-slate-400 dark:text-gray-500"
                          style={{ top: `${idx * HOUR_HEIGHT - 6}px` }}
                        >
                          {String(hr).padStart(2, "0")}:00
                        </div>
                      ))}
                    </div>

                    {/* Hourly grid layout lines and positioned meetings */}
                    <div className="flex-1 grid relative h-full" style={{ gridTemplateColumns: `repeat(${mainCalendarDays.length}, minmax(0, 1fr))` }}>
                      {/* Grid Lines */}
                      {hoursRange.map((_, idx) => (
                        <div
                          key={idx}
                          className="absolute w-full border-b border-dashed border-slate-100 dark:border-[#1a1a1a]/40"
                          style={{ top: `${idx * HOUR_HEIGHT}px`, height: "0px", left: 0 }}
                        />
                      ))}

                      {/* Day Columns containing absolute cards */}
                      {mainCalendarDays.map((day, dayIdx) => {
                        const dateStr = getLocalDateString(day);
                        const dayMeetings = calendarMeetings.filter(m => m.date === dateStr);
                        const positioned = getPositionedMeetings(dayMeetings);
                        const isSelected = dateStr === getLocalDateString(selectedDate);

                        return (
                          <div
                            key={dayIdx}
                            className={`border-r last:border-r-0 border-slate-100 dark:border-[#1a1a1a]/80 h-full relative ${
                              isSelected ? "bg-emerald-500/[0.005]" : ""
                            }`}
                          >
                            {positioned.map(meet => {
                              let priorityColor = "border-slate-500";
                              let priorityBg = "bg-slate-50 dark:bg-[#131313]/90 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] text-slate-700 dark:text-gray-300";
                              if (meet.priority === "Low") {
                                priorityColor = "border-slate-400";
                                priorityBg = "bg-slate-50/90 dark:bg-[#131313]/95 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] text-slate-600 dark:text-gray-400";
                              } else if (meet.priority === "Medium") {
                                priorityColor = "border-blue-500";
                                priorityBg = "bg-blue-50/80 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-300";
                              } else if (meet.priority === "High") {
                                priorityColor = "border-amber-500";
                                priorityBg = "bg-amber-50/80 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-300";
                              } else if (meet.priority === "Urgent") {
                                priorityColor = "border-rose-500";
                                priorityBg = "bg-rose-50/80 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-300";
                              }

                              const hasLink = meet.type !== "Offline" && meet.link;
                              const calIsClosed = isMeetingClosed(meet);
                              const calIsLive = isMeetingLive(meet);

                              // Override colors for closed meetings to look muted/greyed out
                              if (calIsClosed) {
                                priorityColor = "border-slate-400";
                                priorityBg = "bg-slate-100/80 dark:bg-[#111]/80 text-slate-400 dark:text-gray-500 opacity-70";
                              } else if (calIsLive) {
                                priorityColor = "border-emerald-500";
                              }

                              return (
                                <div
                                  key={meet.id}
                                  style={{
                                    position: "absolute",
                                    top: `${meet.top}px`,
                                    height: `${meet.height}px`,
                                    left: `${meet.left}%`,
                                    width: `${meet.width}%`,
                                    zIndex: 10
                                  }}
                                  className={`border-l-4 rounded-r-lg p-2 text-xs flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-xs cursor-pointer select-none transition-all active:scale-98 border-t border-r border-b border-t-slate-100/50 dark:border-t-[#1a1a1a]/50 ${priorityColor} ${priorityBg}`}
                                  onClick={() => setSelectedDetailMeeting(meet)}
                                  title={`${meet.title}\n${meet.startTime} - ${meet.endTime}\n${meet.description}${calIsClosed ? "\n[MEETING CLOSED]" : calIsLive ? "\n[LIVE NOW]" : ""}`}
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      {calIsClosed
                                        ? <Lock className="w-3 h-3 shrink-0 opacity-60" />
                                        : (calIsLive
                                          ? <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                                          : (hasLink && <Video className="w-3 h-3 shrink-0 text-emerald-500 opacity-80" />)
                                        )
                                      }
                                      <h4 className="font-extrabold text-[10px] leading-tight truncate">{meet.title}</h4>
                                    </div>
                                    <p className="text-[8px] opacity-75 font-bold mt-0.5 truncate">{meet.startTime} - {meet.endTime}</p>
                                  </div>
                                  <div className="flex items-center justify-between text-[8px] opacity-70 font-semibold pt-1 border-t border-current/10 shrink-0">
                                    {calIsClosed
                                      ? <span className="font-bold opacity-80">Meeting Closed</span>
                                      : calIsLive
                                      ? <span className="font-bold text-emerald-600 dark:text-emerald-400">● Live Now · {getTimeRemaining(meet)}</span>
                                      : <span className="truncate opacity-90 font-bold">{getTimeRemaining(meet) ?? meet.reason}</span>
                                    }
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Original Meetings List Desk code */
        <div className="space-y-4">
          {filteredMeetings.length === 0 ? (
            <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-10 text-center shadow-xs">
              <Video className="w-10 h-10 text-slate-300 dark:text-gray-600 mx-auto mb-3" />
              <h3 className="font-display font-bold text-slate-700 dark:text-gray-300 text-sm">No Scheduled Meetings</h3>
              <p className="text-xs text-slate-400 dark:text-gray-500 mt-1 max-w-sm mx-auto">
                {searchQuery || typeFilter !== "All" || priorityFilter !== "All"
                  ? "No meetings match your selected search query or filtering parameters."
                  : "You don't have any meetings scheduled at this time. Invite colleagues or sync up by creating one above."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMeetings.map(meet => {
                const isOrganizer = meet.organizerId === currentEmployeeId;
                const isPast = new Date(meet.date + "T00:00:00") < new Date(todayStr + "T00:00:00");
                const canCancel = role === "admin" || role === "hr" || isOrganizer;
                const canEdit = (role === "admin" || role === "hr") && !!onEditMeeting;
                const isClosed = isMeetingClosed(meet);
                const isLive = isMeetingLive(meet);

                // Priority Styling
                const priorityStyles = {
                  Low: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800",
                  Medium: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40",
                  High: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40",
                  Urgent: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40"
                };

                // Type Icon
                const typeLabels = {
                  Online: "Online Video Call",
                  Offline: "Physical Office Room",
                  Hybrid: "Hybrid Call & Room"
                };

                return (
                  <div
                    key={meet.id}
                    className={`bg-white dark:bg-[#0f0f0f] border rounded-2xl p-5 shadow-xs dark:neon-glow transition-all flex flex-col justify-between ${
                      isClosed
                        ? "border-slate-200 dark:border-[#222] opacity-80"
                        : isLive
                        ? "border-emerald-400 dark:border-emerald-500/50 ring-1 ring-emerald-400/30 hover:border-emerald-500 dark:hover:border-emerald-500/70"
                        : "border-slate-100 dark:border-[#1a1a1a] hover:border-slate-200 dark:hover:border-emerald-500/20"
                    }`}
                  >
                    <div>
                      {/* Header: Date, Priority badge, Status badge */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] tracking-wide uppercase px-2.5 py-1 rounded-lg">
                            {meet.date}
                          </span>
                          <span className="text-slate-400 dark:text-gray-500 text-[10px] font-bold">
                            {meet.startTime} - {meet.endTime} {meet.duration ? `(${meet.duration})` : ""}
                          </span>
                          {isClosed && (
                            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 font-bold text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                              <Lock className="w-2.5 h-2.5" />
                              Meeting Closed
                            </span>
                          )}
                          {isLive && !isClosed && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Live Now
                            </span>
                          )}
                          {!isClosed && (() => {
                            const remaining = getTimeRemaining(meet);
                            if (!remaining) return null;
                            const isLiveRemaining = isLive;
                            return (
                              <span className={`inline-flex items-center gap-1 font-bold text-[9px] px-2 py-0.5 rounded-md border ${
                                isLiveRemaining
                                  ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
                                  : "bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 border-sky-200/60 dark:border-sky-900/40"
                              }`}>
                                <Clock className="w-2.5 h-2.5" />
                                {remaining}
                              </span>
                            );
                          })()}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(meet)}
                              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors cursor-pointer"
                              title="Edit Meeting"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span className={`border font-bold text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-md ${priorityStyles[meet.priority || "Medium"]}`}>
                            {meet.priority || "Medium"}
                          </span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h4 className="font-display font-bold text-slate-800 dark:text-white text-sm leading-snug">{meet.title}</h4>
                      <p className="text-[11px] text-slate-400 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">{meet.description}</p>

                      {/* Details Table */}
                      <div className="mt-4 pt-3 border-t border-slate-50 dark:border-[#1a1a1a]/80 space-y-2 text-[10px]">
                        <div className="flex items-center text-slate-500 dark:text-gray-400">
                          <span className="font-bold w-16">Reason:</span>
                          <span className="text-slate-700 dark:text-gray-300 font-semibold">{meet.reason}</span>
                        </div>

                        <div className="flex items-center text-slate-500 dark:text-gray-400">
                          <span className="font-bold w-16">Type:</span>
                          <span className="text-slate-700 dark:text-gray-300 font-semibold">{typeLabels[meet.type]}</span>
                        </div>

                        {meet.department && (
                          <div className="flex items-center text-slate-500 dark:text-gray-400">
                            <span className="font-bold w-16">Dept:</span>
                            <span className="text-slate-700 dark:text-gray-300 font-semibold">{meet.department}</span>
                          </div>
                        )}

                        {meet.type !== "Online" && meet.location && (
                          <div className="flex items-start text-slate-500 dark:text-gray-400">
                            <span className="font-bold w-16 shrink-0 mt-0.5">Location:</span>
                            <span className="text-slate-700 dark:text-gray-300 font-semibold flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span>{meet.location}</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Organizer & Invitees list */}
                      <div className="mt-4 flex items-center justify-between gap-4">
                        {/* Host */}
                        <div className="flex items-center space-x-2 min-w-0">
                          <img
                            src={getEmployeeAvatar(meet.organizerId)}
                            alt="Organizer"
                            className="w-6 h-6 rounded-full object-cover ring-2 ring-emerald-500/20"
                          />
                          <div className="min-w-0">
                            <p className="text-[8px] text-slate-400 font-bold uppercase leading-none">Host</p>
                            <p className="text-[10px] font-bold text-slate-700 dark:text-gray-300 truncate mt-0.5">{getEmployeeName(meet.organizerId)}</p>
                          </div>
                        </div>

                        {/* Participants */}
                        <div className="flex items-center space-x-1 shrink-0">
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {meet.participantIds?.slice(0, 3).map(id => (
                              <img
                                key={id}
                                src={getEmployeeAvatar(id)}
                                alt="Invitee"
                                title={getEmployeeName(id)}
                                className="inline-block h-5 w-5 rounded-full object-cover ring-2 ring-white dark:ring-[#0f0f0f]"
                              />
                            ))}
                          </div>
                          {meet.participantIds && meet.participantIds.length > 3 && (
                            <span className="text-[9px] text-slate-400 dark:text-gray-500 font-bold">
                              +{meet.participantIds.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Block */}
                    <div className="mt-5 pt-3 border-t border-slate-50 dark:border-[#1a1a1a]/80 flex items-center justify-between gap-2">

                      {/* Launch Jitsi Call */}
                      {meet.type !== "Offline" && meet.link ? (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setActiveCallRoom({
                              id: meet.id,
                              title: meet.title,
                              link: meet.link!
                            })}
                            disabled={isClosed}
                            className={`text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              isClosed
                                ? "bg-slate-400 dark:bg-slate-700"
                                : "bg-emerald-600 hover:bg-emerald-500"
                            }`}
                          >
                            {isClosed ? <Lock className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                            <span>{isClosed ? "Meeting Closed" : "Join Meeting"}</span>
                          </button>
                          {!isClosed && (
                            <a
                              href={meet.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] rounded-lg transition-colors border border-slate-100 dark:border-[#1a1a1a]"
                              title="Open Jitsi in new window"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center text-slate-400 text-[10px] font-bold">
                          <Info className="w-3.5 h-3.5 mr-1 text-slate-300" />
                          <span>Offline Meeting Room</span>
                        </div>
                      )}

                      {/* Cancel Meeting */}
                      {canCancel && (
                        <button
                          onClick={() => {
                            if (confirm("Are you sure you want to cancel and delete this scheduled meeting? This action notifies invitees.")) {
                              onCancelMeeting(meet.id);
                            }
                          }}
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Cancel Meeting"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Selected Meeting Details Dialog Modal (for Calendar View) */}
      {selectedDetailMeeting && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-xs">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] tracking-wide uppercase px-2.5 py-1 rounded-lg">
                    {selectedDetailMeeting.date}
                  </span>
                  {isMeetingClosed(selectedDetailMeeting) && (
                    <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 font-bold text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                      <Lock className="w-2.5 h-2.5" />
                      Meeting Closed
                    </span>
                  )}
                  {isMeetingLive(selectedDetailMeeting) && !isMeetingClosed(selectedDetailMeeting) && (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Live Now
                    </span>
                  )}
                </div>
                <h3 className="font-display font-extrabold text-slate-800 dark:text-white text-sm sm:text-base mt-2">
                  {selectedDetailMeeting.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailMeeting(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold p-1 cursor-pointer leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 font-semibold text-slate-700 dark:text-gray-300">
              <div className="p-3 bg-slate-50 dark:bg-[#151515] rounded-xl text-slate-500 dark:text-gray-400 italic font-medium">
                {selectedDetailMeeting.description}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase block font-bold tracking-wider">Time</span>
                  <span className="font-bold text-slate-700 dark:text-gray-200 mt-0.5 block flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-sky-500" />
                    <span>{selectedDetailMeeting.startTime} - {selectedDetailMeeting.endTime}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase block font-bold tracking-wider">Duration</span>
                  <span className="font-bold text-slate-700 dark:text-gray-200 mt-0.5 block">{selectedDetailMeeting.duration || "N/A"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase block font-bold tracking-wider">Priority</span>
                  <span className={`inline-block border font-bold text-[8px] tracking-wider uppercase px-2 py-0.5 rounded-md mt-1 ${
                    selectedDetailMeeting.priority === "Low" ? "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800" :
                    selectedDetailMeeting.priority === "Medium" ? "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40" :
                    selectedDetailMeeting.priority === "High" ? "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40" :
                    "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40"
                  }`}>
                    {selectedDetailMeeting.priority || "Medium"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase block font-bold tracking-wider">Category</span>
                  <span className="font-bold text-slate-700 dark:text-gray-200 mt-0.5 block">{selectedDetailMeeting.reason}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-[#1a1a1a]/80">
                <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase block font-bold tracking-wider mb-1.5">Host & Invitees</span>
                <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-[#151515] px-2 py-1 rounded-lg border border-slate-200/40 dark:border-[#222]">
                    <img
                      src={getEmployeeAvatar(selectedDetailMeeting.organizerId)}
                      alt="Host"
                      className="w-4 h-4 rounded-full object-cover ring-1 ring-emerald-500"
                    />
                    <span className="text-[9px] font-bold text-slate-700 dark:text-gray-300">Host: {getEmployeeName(selectedDetailMeeting.organizerId)}</span>
                  </div>

                  {selectedDetailMeeting.participantIds?.map(id => (
                    <div key={id} className="flex items-center space-x-1.5 bg-slate-50 dark:bg-[#151515] px-2 py-1 rounded-lg border border-slate-200/40 dark:border-[#222]">
                      <img
                        src={getEmployeeAvatar(id)}
                        alt="Participant"
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <span className="text-[9px] font-bold text-slate-700 dark:text-gray-300">{getEmployeeName(id)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedDetailMeeting.type !== "Online" && selectedDetailMeeting.location && (
                <div className="pt-2 border-t border-slate-100 dark:border-[#1a1a1a]/80">
                  <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase block font-bold tracking-wider">Physical Location</span>
                  <span className="font-bold text-slate-700 dark:text-gray-200 mt-0.5 block flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>{selectedDetailMeeting.location}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-[#1a1a1a]/80 flex justify-between items-center gap-2">
              <div>
                {/* Launch Meeting Option */}
                {selectedDetailMeeting.type !== "Offline" && selectedDetailMeeting.link ? (
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      disabled={isMeetingClosed(selectedDetailMeeting)}
                      onClick={() => {
                        setActiveCallRoom({
                          id: selectedDetailMeeting.id,
                          title: selectedDetailMeeting.title,
                          link: selectedDetailMeeting.link!
                        });
                        setSelectedDetailMeeting(null);
                      }}
                      className={`text-white text-[11px] font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
                        isMeetingClosed(selectedDetailMeeting)
                          ? "bg-slate-400 dark:bg-slate-700"
                          : "bg-emerald-600 hover:bg-emerald-500"
                      }`}
                    >
                      {isMeetingClosed(selectedDetailMeeting) ? <Lock className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                      <span>{isMeetingClosed(selectedDetailMeeting) ? "Meeting Closed" : "Join Meeting"}</span>
                    </button>

                    {!isMeetingClosed(selectedDetailMeeting) && (
                      <a
                        href={selectedDetailMeeting.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] rounded-lg transition-colors border border-slate-200/50 dark:border-[#222]"
                        title="Open Jitsi in new window"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center text-slate-400 text-[10px] font-bold">
                    <Info className="w-3.5 h-3.5 mr-1 text-slate-300" />
                    <span>Physical Room Only</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* Edit meeting button (admin/hr only) */}
                {(role === "admin" || role === "hr") && onEditMeeting && (
                  <button
                    type="button"
                    onClick={() => {
                      openEditModal(selectedDetailMeeting);
                    }}
                    className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                    title="Edit Meeting"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}

                {/* Cancel meeting button */}
                {(role === "admin" || role === "hr" || selectedDetailMeeting.organizerId === currentEmployeeId) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Are you sure you want to cancel and delete this scheduled meeting? This action notifies invitees.")) {
                        onCancelMeeting(selectedDetailMeeting.id);
                        setSelectedDetailMeeting(null);
                      }
                    }}
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                    title="Cancel Meeting"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedDetailMeeting(null)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-[#2a2a2a] text-slate-600 dark:text-gray-300 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1a1a1a] font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Edit Meeting Modal (Admin / HR only) */}
      {editingMeeting && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 dark:neon-glow">
            <div className="flex justify-between items-center pb-3 border-b border-slate-50 dark:border-[#1a1a1a] mb-5">
              <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm flex items-center gap-1.5">
                <Pencil className="w-4 h-4 text-blue-500" />
                <span>Edit Meeting Schedule</span>
              </h3>
              <button
                onClick={() => setEditingMeeting(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-base cursor-pointer"
              >&times;</button>
            </div>

            <div className="mb-4 p-3 bg-slate-50 dark:bg-[#151515] rounded-xl border border-slate-100 dark:border-[#2a2a2a]">
              <p className="text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider mb-0.5">Meeting</p>
              <p className="text-xs font-bold text-slate-700 dark:text-gray-200 truncate">{editingMeeting.title}</p>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="block text-slate-500 dark:text-gray-400">Date <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a] focus:border-blue-500 outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-500 dark:text-gray-400">Start Time <span className="text-rose-500">*</span></label>
                  <input
                    type="time"
                    required
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a] focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-500 dark:text-gray-400">End Time <span className="text-rose-500">*</span></label>
                  <input
                    type="time"
                    required
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2.5 rounded-xl border border-slate-100 dark:border-[#2a2a2a] focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Duration Preview */}
              {editStartTime && editEndTime && (() => {
                const [sh, sm] = editStartTime.split(":").map(Number);
                const [eh, em] = editEndTime.split(":").map(Number);
                const diff = (eh * 60 + em) - (sh * 60 + sm);
                if (diff <= 0) return (
                  <p className="text-rose-500 text-[10px] font-bold">⚠ End time must be after start time</p>
                );
                const h = Math.floor(diff / 60), m = diff % 60;
                const dur = h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${diff}m`;
                return (
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-gray-400 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Duration: <strong className="text-slate-700 dark:text-gray-200">{dur}</strong></span>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-50 dark:border-[#1a1a1a]">
                <button
                  type="button"
                  disabled={isEditSubmitting}
                  onClick={() => setEditingMeeting(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-[#2a2a2a] text-slate-600 dark:text-gray-300 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1a1a1a] cursor-pointer disabled:opacity-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting || !editDate || !editStartTime || !editEndTime}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1.5 font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEditSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Pencil className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Embedded Jitsi Video Call Modal Iframe Overlay */}
      {activeCallRoom && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex flex-col p-4 md:p-6 animate-in fade-in duration-300">
          {/* Header Panel */}
          <div className="flex justify-between items-center mb-4 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white animate-pulse">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-white font-display font-bold text-sm leading-none">{activeCallRoom.title}</h3>
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Jitsi Call Session Active • Please grant camera & microphone permissions when prompted.</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveCallRoom(null)}
              className="bg-white/10 hover:bg-white/20 text-white rounded-xl p-2 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Leave Room</span>
            </button>
          </div>

          {/* Jitsi Meet iframe element */}
          <div className="flex-1 bg-[#1e1e1e] rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl">
            <iframe
              src={`${activeCallRoom.link}#config.prejoinPageEnabled=false&userInfo.displayName="${encodeURIComponent(
                currentEmployee?.fullName || "Colleague"
              )}"`}
              className="w-full h-full border-0"
              allow="camera; microphone; fullscreen; display-capture; autoplay"
            />
          </div>
        </div>
      )}

    </div>
  );
}
