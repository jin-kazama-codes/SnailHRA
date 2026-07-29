"use client";

import React, { useState, useMemo } from "react";
import { 
  Video, Calendar, Clock, Plus, Search, Users, Check, X, 
  Trash2, MapPin, Link2, UserCheck, Sparkles, Filter, Info, ShieldAlert
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
  companyName = "SnailHR"
}: MeetingsViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("Upcoming"); // 'Upcoming', 'Today', 'Past', 'All'
  
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
  
  const todayStr = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("10:30");
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

    setIsSubmitting(true);
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

        <button
          onClick={() => {
            setShowForm(!showForm);
            // Pre-fill generated link immediately when clicking create
            if (!showForm) {
              const generatedLink = generateJitsiLink("Team Sync");
              setMeetingLink(generatedLink);
            }
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showForm ? "Close Panel" : "Schedule New Meeting"}</span>
        </button>
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

      {/* 3. Scheduling Form Panel */}
      {showForm && (
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow animate-in fade-in slide-in-from-top-4 duration-200">
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
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2 rounded-xl border border-slate-100 dark:border-[#2a2a2a] outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-slate-500 dark:text-gray-400">Start Time <span className="text-rose-500">*</span></label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-200 p-2 rounded-xl border border-slate-100 dark:border-[#2a2a2a] outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-slate-500 dark:text-gray-400">End Time <span className="text-rose-500">*</span></label>
                    <input
                      type="time"
                      required
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
                  <label className="block text-slate-500 dark:text-gray-400">
                    Attending Participants <span className="text-rose-500">*</span> ({selectedParticipants.length} selected)
                  </label>
                  
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
                        return (
                          <div 
                            key={emp.id}
                            onClick={() => toggleParticipant(emp.id)}
                            className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                              isChecked 
                                ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400" 
                                : "hover:bg-slate-100 dark:hover:bg-[#222]"
                            }`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <img 
                                src={emp.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop"} 
                                alt={emp.fullName}
                                className="w-5.5 h-5.5 rounded-full object-cover"
                              />
                              <div>
                                <p className="font-bold text-[11px] leading-none">{emp.fullName}</p>
                                <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-0.5">{emp.department} • {emp.id}</p>
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                              isChecked 
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

      {/* 5. Meetings List Desk */}
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
                  className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow hover:border-slate-200 dark:hover:border-emerald-500/20 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Date, Priority badge */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] tracking-wide uppercase px-2.5 py-1 rounded-lg">
                          {meet.date}
                        </span>
                        <span className="text-slate-400 dark:text-gray-500 text-[10px] font-bold">
                          {meet.startTime} - {meet.endTime} ({meet.duration})
                        </span>
                      </div>

                      <span className={`border font-bold text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-md ${
                        priorityStyles[meet.priority || "Medium"]
                      }`}>
                        {meet.priority || "Medium"}
                      </span>
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
                          disabled={isPast}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join In-App Jitsi</span>
                        </button>
                        <a
                          href={meet.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] rounded-lg transition-colors border border-slate-100 dark:border-[#1a1a1a]"
                          title="Open Jitsi in new window"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </a>
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

      {/* 6. Embedded Jitsi Video Call Modal Iframe Overlay */}
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
