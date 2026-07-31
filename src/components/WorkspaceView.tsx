"use client";

import React, { useState, useCallback } from "react";
import {
  Map, DoorOpen, Plus, Trash2, Edit3, Save, X, Check, Clock,
  Users, Wifi, Monitor, Presentation, ChevronDown, Search,
  Building2, CheckCircle2, XCircle, AlertCircle, CalendarDays,
  Armchair, Layers, Eye, EyeOff, Coffee, Star, Zap, Settings2,
  ChevronRight, UserCheck, BadgeCheck, Ban, RotateCcw, Info,
  PlusCircle, Pencil, LayoutGrid, Grid3x3, Tv, Cable, Cpu, Volume2, Shield,
  Snowflake, Phone, Lightbulb, Mic
} from "lucide-react";
import {
  Employee, SeatLayout, SeatSection, Seat, Room, RoomBooking
} from "../types";

// ─── Helper Types ─────────────────────────────────────────────────────────────

type ActiveRole = "admin" | "hr" | "employee";

interface WorkspaceViewProps {
  role: ActiveRole;
  companyId: string;
  companyName: string;
  currentEmployeeId: string;
  employees: Employee[];
  seatLayouts: SeatLayout[];
  rooms: Room[];
  roomBookings: RoomBooking[];
  customAmenities: string[];
  onSaveSeatLayout: (layout: SeatLayout) => Promise<boolean>;
  onDeleteSeatLayout: (id: string) => Promise<void>;
  onSaveRoom: (room: Room) => Promise<boolean>;
  onDeleteRoom: (id: string) => Promise<void>;
  onBookRoom: (booking: Omit<RoomBooking, "id" | "status" | "createdAt">) => Promise<boolean>;
  onUpdateBooking: (id: string, status: "Approved" | "Rejected" | "Cancelled", approvedBy?: string) => Promise<boolean>;
}

// ─── Amenity Icons ────────────────────────────────────────────────────────────

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  "Projector": <Monitor className="w-3.5 h-3.5" />,
  "Whiteboard": <Presentation className="w-3.5 h-3.5" />,
  "Video Conferencing": <Monitor className="w-3.5 h-3.5" />,
  "WiFi": <Wifi className="w-3.5 h-3.5" />,
  "Coffee": <Coffee className="w-3.5 h-3.5" />,
  "AC": <Zap className="w-3.5 h-3.5" />,
  "Monitor": <Monitor className="w-3.5 h-3.5" />,
  "Presentation": <Presentation className="w-3.5 h-3.5" />,
  "Wifi": <Wifi className="w-3.5 h-3.5" />,
  "Tv": <Tv className="w-3.5 h-3.5" />,
  "Cable": <Cable className="w-3.5 h-3.5" />,
  "Cpu": <Cpu className="w-3.5 h-3.5" />,
  "Volume": <Volume2 className="w-3.5 h-3.5" />,
  "Shield": <Shield className="w-3.5 h-3.5" />,
  "Star": <Star className="w-3.5 h-3.5" />,
  "Snowflake": <Snowflake className="w-3.5 h-3.5" />,
  "Phone": <Phone className="w-3.5 h-3.5" />,
  "Lightbulb": <Lightbulb className="w-3.5 h-3.5" />,
  "Mic": <Mic className="w-3.5 h-3.5" />,
};

const ALL_AMENITIES = ["Projector", "Whiteboard", "Video Conferencing", "WiFi", "Coffee", "AC"];

// ─── Section Colors ────────────────────────────────────────────────────────────

const SECTION_COLORS = [
  { label: "Emerald", value: "#10b981", dark: "#064e3b" },
  { label: "Sky", value: "#0ea5e9", dark: "#0c4a6e" },
  { label: "Purple", value: "#a855f7", dark: "#3b0764" },
  { label: "Rose", value: "#f43f5e", dark: "#4c0519" },
  { label: "Amber", value: "#f59e0b", dark: "#451a03" },
  { label: "Indigo", value: "#6366f1", dark: "#1e1b4b" },
  { label: "Teal", value: "#14b8a6", dark: "#042f2e" },
  { label: "Orange", value: "#f97316", dark: "#431407" },
];

// ─── Seat Chair SVG ───────────────────────────────────────────────────────────

function ChairIcon({ color, size = 36 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* backrest */}
      <rect x="8" y="4" width="24" height="14" rx="4" fill={color} />
      {/* seat */}
      <rect x="6" y="18" width="28" height="12" rx="3" fill={color} opacity="0.85" />
      {/* legs */}
      <rect x="10" y="30" width="4" height="8" rx="2" fill={color} opacity="0.6" />
      <rect x="26" y="30" width="4" height="8" rx="2" fill={color} opacity="0.6" />
      <rect x="8" y="17" width="24" height="4" rx="2" fill={color} opacity="0.5" />
    </svg>
  );
}

// ─── DEFAULT LAYOUT BUILDER ───────────────────────────────────────────────────

function buildDefaultLayout(companyId: string, companyName: string): SeatLayout {
  const sections: SeatSection[] = [
    { id: "sec-it", name: "IT Workspaces", color: "#10b981" },
    { id: "sec-row1", name: "Desk Row 1", color: "#0ea5e9" },
    { id: "sec-row2", name: "Desk Row 2", color: "#a855f7" },
    { id: "sec-row3", name: "Desk Row 3", color: "#f59e0b" },
    { id: "sec-reserved", name: "Reserved / Cabin", color: "#f43f5e" },
  ];

  const seats: Seat[] = [];
  let seatNum = 1;

  // IT section — row 0
  for (let c = 0; c < 5; c++) {
    seats.push({ id: `seat-${seatNum}`, seatNumber: String(seatNum), sectionId: "sec-it", x: c, y: 0, type: "desk" });
    seatNum++;
  }
  // Row 1 — rows 2-3
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 9; c++) {
      seats.push({ id: `seat-${seatNum}`, seatNumber: String(seatNum), sectionId: "sec-row1", x: c, y: 2 + r, type: "desk" });
      seatNum++;
    }
  }
  // Row 2 — rows 5-6
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 9; c++) {
      seats.push({ id: `seat-${seatNum}`, seatNumber: String(seatNum), sectionId: "sec-row2", x: c, y: 5 + r, type: "desk" });
      seatNum++;
    }
  }
  // Row 3 — rows 8-9
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 9; c++) {
      seats.push({ id: `seat-${seatNum}`, seatNumber: String(seatNum), sectionId: "sec-row3", x: c, y: 8 + r, type: "desk" });
      seatNum++;
    }
  }
  // Reserved — column 11-12
  const reservedNames = ["Director A", "Director B", "Conference 1", "Conference 2", "Conference 3", "HR Cabin"];
  for (let r = 0; r < reservedNames.length; r++) {
    seats.push({
      id: `seat-${seatNum}`,
      seatNumber: String(seatNum),
      sectionId: "sec-reserved",
      x: 11,
      y: r,
      type: r < 2 ? "cabin" : "reserved",
      label: reservedNames[r],
    });
    seatNum++;
  }

  return {
    id: `layout-default-${companyId}`,
    companyId,
    name: `${companyName} — Main Office`,
    sections,
    seats,
    updatedAt: new Date().toISOString(),
  };
}

// ─── SEATING PLAN COMPONENT ────────────────────────────────────────────────────

function SeatingPlan({
  role, companyId, companyName, employees, currentEmployeeId,
  seatLayouts, onSaveSeatLayout, onDeleteSeatLayout
}: Pick<WorkspaceViewProps, "role"|"companyId"|"companyName"|"employees"|"currentEmployeeId"|"seatLayouts"|"onSaveSeatLayout"|"onDeleteSeatLayout">) {

  const canEdit = role === "admin" || role === "hr";

  // Use first layout if available, else show empty state
  const companyLayouts = seatLayouts.filter(l => l.companyId === companyId);
  const effectiveLayouts = companyLayouts.length > 0 ? companyLayouts : [];

  const [selectedLayoutId, setSelectedLayoutId] = useState<string>(effectiveLayouts[0]?.id || "");
  const activeLayout = effectiveLayouts.find(l => l.id === selectedLayoutId) || null;

  const [editMode, setEditMode] = useState(false);
  const [draftLayout, setDraftLayout] = useState<SeatLayout | null>(null);
  const [saving, setSaving] = useState(false);
  const [assignModal, setAssignModal] = useState<{ seat: Seat } | null>(null);
  const [addSectionModal, setAddSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionColor, setNewSectionColor] = useState(SECTION_COLORS[0].value);
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewLayoutModal, setShowNewLayoutModal] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState("");

  const layout = editMode && draftLayout ? draftLayout : activeLayout;

  const enterEditMode = () => {
    if (!activeLayout) return;
    setDraftLayout(JSON.parse(JSON.stringify(activeLayout)));
    setEditMode(true);
  };

  const cancelEditMode = () => {
    setDraftLayout(null);
    setEditMode(false);
  };

  const saveLayout = async () => {
    if (!draftLayout) return;
    setSaving(true);
    const ok = await onSaveSeatLayout(draftLayout);
    if (ok) {
      setEditMode(false);
      setDraftLayout(null);
    }
    setSaving(false);
  };

  const createNewLayout = async () => {
    if (!newLayoutName.trim()) return;
    const newLayout = buildDefaultLayout(companyId, newLayoutName.trim());
    newLayout.name = newLayoutName.trim();
    setSaving(true);
    const ok = await onSaveSeatLayout(newLayout);
    if (ok) {
      setSelectedLayoutId(newLayout.id);
      setShowNewLayoutModal(false);
      setNewLayoutName("");
    }
    setSaving(false);
  };

  const updateDraftSeat = (seatId: string, changes: Partial<Seat>) => {
    if (!draftLayout) return;
    setDraftLayout({
      ...draftLayout,
      seats: draftLayout.seats.map(s => s.id === seatId ? { ...s, ...changes } : s)
    });
  };

  const deleteSeat = (seatId: string) => {
    if (!draftLayout) return;
    setDraftLayout({ ...draftLayout, seats: draftLayout.seats.filter(s => s.id !== seatId) });
  };

  const addSeat = (sectionId: string) => {
    if (!draftLayout) return;
    const sectionSeats = draftLayout.seats.filter(s => s.sectionId === sectionId);
    const maxX = sectionSeats.reduce((m, s) => Math.max(m, s.x), -1);
    const y = sectionSeats.length > 0 ? sectionSeats[sectionSeats.length - 1].y : 0;
    const newNum = draftLayout.seats.length + 1;
    const newSeat: Seat = {
      id: `seat-${Date.now()}`,
      seatNumber: String(newNum),
      sectionId,
      x: maxX + 1,
      y,
      type: "desk"
    };
    setDraftLayout({ ...draftLayout, seats: [...draftLayout.seats, newSeat] });
  };

  const addSection = () => {
    if (!draftLayout || !newSectionName.trim()) return;
    const newSection: SeatSection = {
      id: `sec-${Date.now()}`,
      name: newSectionName.trim(),
      color: newSectionColor,
    };
    setDraftLayout({ ...draftLayout, sections: [...draftLayout.sections, newSection] });
    setNewSectionName("");
    setAddSectionModal(false);
  };

  const deleteSection = (sectionId: string) => {
    if (!draftLayout) return;
    setDraftLayout({
      ...draftLayout,
      sections: draftLayout.sections.filter(s => s.id !== sectionId),
      seats: draftLayout.seats.filter(s => s.sectionId !== sectionId),
    });
  };

  const assignEmployee = (seatId: string, empId: string | null) => {
    if (!draftLayout) return;
    // Unassign from any other seat first
    const updated = draftLayout.seats.map(s => {
      if (s.id === seatId) return { ...s, assignedEmployeeId: empId };
      if (empId && s.assignedEmployeeId === empId) return { ...s, assignedEmployeeId: null };
      return s;
    });
    setDraftLayout({ ...draftLayout, seats: updated });
    setAssignModal(null);
  };

  const getEmployeeForSeat = (seat: Seat): Employee | undefined => {
    return employees.find(e => e.id === seat.assignedEmployeeId);
  };

  const getSectionColor = (sectionId: string): string => {
    const section = layout?.sections.find(s => s.id === sectionId);
    return section?.color || "#6b7280";
  };

  const getSectionName = (sectionId: string): string => {
    return layout?.sections.find(s => s.id === sectionId)?.name || "Unknown";
  };

  const currentEmployee = employees.find(e => e.id === currentEmployeeId);
  const mySeats = layout?.seats.filter(s => s.assignedEmployeeId === currentEmployeeId) || [];

  // Group seats by section for rendering
  const seatsBySection = layout?.sections.map(section => ({
    section,
    seats: (layout?.seats || [])
      .filter(s => s.sectionId === section.id)
      .sort((a, b) => a.y === b.y ? a.x - b.x : a.y - b.y)
  })) || [];

  const filteredSeatsBySection = searchQuery
    ? seatsBySection.map(({ section, seats }) => ({
        section,
        seats: seats.filter(s => {
          const emp = getEmployeeForSeat(s);
          return s.seatNumber.includes(searchQuery) ||
            emp?.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.label?.toLowerCase().includes(searchQuery.toLowerCase());
        })
      })).filter(({ seats }) => seats.length > 0)
    : seatsBySection;

  if (effectiveLayouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-5">
        <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
          <Armchair className="w-10 h-10 text-emerald-500" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">No Seating Plan Yet</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-xs">
            {canEdit ? "Create your first seating layout to start managing seat assignments." : "No seating plan has been configured yet."}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowNewLayoutModal(true)}
            className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Seating Plan</span>
          </button>
        )}
        {showNewLayoutModal && (
          <NewLayoutModal
            name={newLayoutName}
            setName={setNewLayoutName}
            onConfirm={createNewLayout}
            onClose={() => setShowNewLayoutModal(false)}
            saving={saving}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Layout selector */}
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <select
            value={selectedLayoutId}
            onChange={e => { setSelectedLayoutId(e.target.value); cancelEditMode(); }}
            className="text-sm font-semibold bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
          >
            {effectiveLayouts.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search seat, name..."
            className="w-full text-sm bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#2a2a2a] rounded-xl pl-9 pr-3 py-2 text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {canEdit && !editMode && (
            <>
              <button
                onClick={() => setShowNewLayoutModal(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 dark:bg-[#1a1a1a] hover:bg-slate-200 dark:hover:bg-[#252525] text-slate-600 dark:text-gray-300 rounded-xl text-xs font-semibold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Layout</span>
              </button>
              <button
                onClick={enterEditMode}
                className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-emerald-600/20"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Layout</span>
              </button>
            </>
          )}
          {editMode && (
            <>
              <button onClick={cancelEditMode} className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-all">
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
              <button
                onClick={saveLayout}
                disabled={saving}
                className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-60"
              >
                {saving ? (
                  <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{saving ? "Saving..." : "Save Layout"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit mode notice */}
      {editMode && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-xl text-xs text-amber-700 dark:text-amber-400 font-semibold">
          <Edit3 className="w-3.5 h-3.5 shrink-0" />
          <span>Edit mode: click seats to assign employees, manage sections below the map</span>
        </div>
      )}

      {/* My Seat Badge */}
      {mySeats.length > 0 && !editMode && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
          <Star className="w-3.5 h-3.5 shrink-0" />
          <span>Your seat: <span className="font-black">#{mySeats.map(s => s.seatNumber).join(", ")}</span> — {getSectionName(mySeats[0].sectionId)}</span>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sections:</span>
        {layout?.sections.map(s => (
          <div key={s.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
            style={{ backgroundColor: s.color + "20", color: s.color, border: `1px solid ${s.color}30` }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </div>
        ))}
      </div>

      {/* Seat Map */}
      <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-slate-100 dark:border-[#1a1a1a] overflow-hidden">
        <div className="p-4 space-y-5">
          {filteredSeatsBySection.map(({ section, seats }) => {
            // Group seats by row (y)
            const byRow: Record<number, Seat[]> = {};
            seats.forEach(s => {
              if (!byRow[s.y]) byRow[s.y] = [];
              byRow[s.y].push(s);
            });

            return (
              <div key={section.id} className="rounded-xl p-4 space-y-2"
                style={{ backgroundColor: section.color + "08", border: `1px solid ${section.color}20` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: section.color }} />
                    <span className="text-sm font-bold" style={{ color: section.color }}>{section.name}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{seats.length} seats</span>
                  </div>
                  {editMode && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => addSeat(section.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-white transition-all"
                        style={{ backgroundColor: section.color }}
                      >
                        <Plus className="w-3 h-3" />Add Seat
                      </button>
                      <button
                        onClick={() => deleteSection(section.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />Remove
                      </button>
                    </div>
                  )}
                </div>

                {Object.entries(byRow).sort(([a], [b]) => Number(a) - Number(b)).map(([rowKey, rowSeats]) => (
                  <div key={rowKey} className="flex flex-wrap gap-2">
                    {rowSeats.sort((a, b) => b.x - a.x).map(seat => {
                      const emp = getEmployeeForSeat(seat);
                      const isMySeats = seat.assignedEmployeeId === currentEmployeeId;
                      const isHovered = hoveredSeat === seat.id;

                      return (
                        <div
                          key={seat.id}
                          className="relative group"
                          onMouseEnter={() => setHoveredSeat(seat.id)}
                          onMouseLeave={() => setHoveredSeat(null)}
                        >
                          <button
                            onClick={() => editMode && setAssignModal({ seat })}
                            className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all border ${
                              isMySeats
                                ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 shadow-md shadow-emerald-500/20"
                                : emp
                                ? "border-slate-200 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#1a1a1a]"
                                : "border-dashed border-slate-200 dark:border-[#2a2a2a] bg-transparent hover:bg-slate-50 dark:hover:bg-[#1a1a1a]"
                            } ${editMode ? "cursor-pointer hover:border-emerald-400 hover:shadow-md" : "cursor-default"}`}
                          >
                            <ChairIcon
                              color={isMySeats ? "#10b981" : emp ? section.color : "#cbd5e1"}
                              size={32}
                            />
                            <span className={`text-[9px] font-bold leading-none ${
                              isMySeats ? "text-emerald-600 dark:text-emerald-400"
                                : emp ? "text-slate-600 dark:text-gray-300"
                                : "text-slate-300 dark:text-slate-600"
                            }`}>
                              {seat.label || `#${seat.seatNumber}`}
                            </span>
                          </button>

                          {/* Hover tooltip */}
                          {isHovered && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none">
                              <div className="bg-slate-900 dark:bg-white/10 backdrop-blur-md text-white dark:text-gray-100 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl border border-white/10">
                                {emp ? (
                                  <>
                                    <div className="font-bold">{emp.fullName}</div>
                                    <div className="text-slate-400">{emp.department} · Seat #{seat.seatNumber}</div>
                                  </>
                                ) : (
                                  <span className="text-slate-400">Seat #{seat.seatNumber} — Unoccupied</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Delete seat in edit mode */}
                          {editMode && (
                            <button
                              onClick={e => { e.stopPropagation(); deleteSeat(seat.id); }}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit mode: section manager */}
      {editMode && (
        <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-slate-100 dark:border-[#1a1a1a] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 dark:text-gray-300">Section Manager</h3>
            <button
              onClick={() => setAddSectionModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Section
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {draftLayout?.sections.map(sec => (
              <div key={sec.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold"
                style={{ backgroundColor: sec.color + "15", borderColor: sec.color + "30", color: sec.color }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sec.color }} />
                {sec.name}
                <button onClick={() => deleteSection(sec.id)} className="ml-1 opacity-60 hover:opacity-100">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assign Employee Modal */}
      {assignModal && editMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-slate-100 dark:border-[#1a1a1a] p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Assign Seat #{assignModal.seat.seatNumber}
              </h3>
              <button onClick={() => setAssignModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1a1a1a] text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
              <button
                onClick={() => assignEmployee(assignModal.seat.id, null)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1a1a1a] text-left transition-all border border-dashed border-slate-200 dark:border-[#2a2a2a] text-slate-400 text-sm font-semibold"
              >
                <XCircle className="w-4 h-4" />
                Unassign (Leave Empty)
              </button>
              {employees.map(emp => {
                const isAssigned = assignModal.seat.assignedEmployeeId === emp.id;
                return (
                  <button
                    key={emp.id}
                    onClick={() => assignEmployee(assignModal.seat.id, emp.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${
                      isAssigned
                        ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/50"
                        : "border-transparent hover:bg-slate-50 dark:hover:bg-[#1a1a1a]"
                    }`}
                  >
                    <img src={emp.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=40&auto=format&fit=crop"} alt={emp.fullName} className="w-8 h-8 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-gray-300 truncate">{emp.fullName}</p>
                      <p className="text-[10px] text-slate-400">{emp.department} · {emp.role.toUpperCase()}</p>
                    </div>
                    {isAssigned && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      {addSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-slate-100 dark:border-[#1a1a1a] p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Add New Section</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Section Name</label>
                <input
                  value={newSectionName}
                  onChange={e => setNewSectionName(e.target.value)}
                  placeholder="e.g. Marketing Team"
                  className="w-full text-sm bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2.5 text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Section Color</label>
                <div className="flex flex-wrap gap-2">
                  {SECTION_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setNewSectionColor(c.value)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${newSectionColor === c.value ? "border-slate-700 dark:border-white scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setAddSectionModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2a2a2a] text-slate-500 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-[#1a1a1a]">Cancel</button>
                <button
                  onClick={addSection}
                  disabled={!newSectionName.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all disabled:opacity-50"
                >
                  Add Section
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Layout Modal */}
      {showNewLayoutModal && (
        <NewLayoutModal
          name={newLayoutName}
          setName={setNewLayoutName}
          onConfirm={createNewLayout}
          onClose={() => setShowNewLayoutModal(false)}
          saving={saving}
        />
      )}
    </div>
  );
}

function NewLayoutModal({ name, setName, onConfirm, onClose, saving }: {
  name: string; setName: (v: string) => void; onConfirm: () => void; onClose: () => void; saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-slate-100 dark:border-[#1a1a1a] p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Create New Layout</h3>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Floor 2 – Marketing Wing"
          className="w-full text-sm bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2.5 text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 mb-4"
          onKeyDown={e => e.key === "Enter" && onConfirm()}
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2a2a2a] text-slate-500 text-sm font-semibold hover:bg-slate-50">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={!name.trim() || saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Layout"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ROOM BOOKING COMPONENT ────────────────────────────────────────────────────

function RoomBookingView({
  role, companyId, companyName, employees, currentEmployeeId,
  rooms, roomBookings, customAmenities, onSaveRoom, onDeleteRoom, onBookRoom, onUpdateBooking
}: Pick<WorkspaceViewProps, "role"|"companyId"|"companyName"|"employees"|"currentEmployeeId"|"rooms"|"roomBookings"|"customAmenities"|"onSaveRoom"|"onDeleteRoom"|"onBookRoom"|"onUpdateBooking">) {

  const canManageRooms = role === "admin" || role === "hr";
  const canApprove = role === "admin" || role === "hr";
  const activeAmenities = customAmenities || [];

  const [activeRoomTab, setActiveRoomTab] = useState<"rooms" | "bookings" | "manage">("rooms");
  const currentTab = (activeRoomTab === "manage" && !canManageRooms) ? "rooms" : activeRoomTab;
  const [bookingModal, setBookingModal] = useState<{ room: Room } | null>(null);
  const [roomModal, setRoomModal] = useState<{ room?: Room } | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Booking form state
  const [bTitle, setBTitle] = useState("");
  const [bDate, setBDate] = useState(new Date().toISOString().split("T")[0]);
  const [bStart, setBStart] = useState("09:00");
  const [bEnd, setBEnd] = useState("10:00");
  const [bPurpose, setBPurpose] = useState("");
  const [bAttendees, setBAttendees] = useState<string[]>([]);

  // Room form state
  const [rName, setRName] = useState("");
  const [rCapacity, setRCapacity] = useState(6);
  const [rFloor, setRFloor] = useState("");
  const [rBranch, setRBranch] = useState("");
  const [rAmenities, setRAmenities] = useState<string[]>([]);

  const companyRooms = rooms.filter(r => r.companyId === companyId && r.isActive);
  const companyBookings = roomBookings.filter(b => b.companyId === companyId);
  const todayBookings = companyBookings.filter(b => b.date === selectedDate && b.status === "Approved");
  const pendingBookings = companyBookings.filter(b => b.status === "Pending");
  const currentEmployee = employees.find(e => e.id === currentEmployeeId);

  const isRoomBusy = (room: Room, date: string) => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    if (date !== todayStr) return false;

    const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return companyBookings.some(b =>
      b.roomId === room.id &&
      b.date === date &&
      b.status === "Approved" &&
      nowTime >= b.startTime &&
      nowTime < b.endTime
    );
  };

  const getRoomBookingsForDay = (roomId: string, date: string) =>
    companyBookings.filter(b => b.roomId === roomId && b.date === date && (b.status === "Approved" || b.status === "Pending"));

  const openBookingModal = (room: Room) => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const nextHours = String((now.getHours() + 1) % 24).padStart(2, "0");

    setBTitle("");
    setBDate(selectedDate);
    setBStart(`${hours}:${minutes}`);
    setBEnd(`${nextHours}:${minutes}`);
    setBPurpose("");
    setBAttendees([]);
    setBookingModal({ room });
  };

  const submitBooking = async () => {
    if (!bookingModal || !bTitle.trim()) return;

    // 1. Validation: date and time must not be in the past
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (bDate < todayStr) {
      alert("You cannot book a room for a past date.");
      return;
    }

    if (bDate === todayStr) {
      const currentHourMin = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (bStart < currentHourMin) {
        alert("The start time cannot be in the past.");
        return;
      }
    }

    if (bEnd <= bStart) {
      alert("The end time must be after the start time.");
      return;
    }

    // 2. Overlap Check: ensure no existing active booking overlaps with [bStart, bEnd]
    const overlapping = companyBookings.find(b =>
      b.roomId === bookingModal.room.id &&
      b.date === bDate &&
      (b.status === "Approved" || b.status === "Pending") &&
      bStart < b.endTime &&
      bEnd > b.startTime
    );

    if (overlapping) {
      alert(`Room "${bookingModal.room.name}" is already booked/requested for slot ${overlapping.startTime}–${overlapping.endTime} ("${overlapping.title}"). Please select a different time slot or room.`);
      return;
    }

    setSaving(true);
    const ok = await onBookRoom({
      companyId,
      roomId: bookingModal.room.id,
      roomName: bookingModal.room.name,
      requestedBy: currentEmployeeId,
      requestedByName: currentEmployee?.fullName || "Unknown",
      title: bTitle.trim(),
      date: bDate,
      startTime: bStart,
      endTime: bEnd,
      purpose: bPurpose.trim(),
      attendees: bAttendees,
    });
    if (ok) setBookingModal(null);
    setSaving(false);
  };

  const handleStartTimeChange = (val: string) => {
    setBStart(val);
    if (val.includes(":")) {
      const [h, m] = val.split(":").map(Number);
      const nextH = (h + 1) % 24;
      const formattedNextH = String(nextH).padStart(2, "0");
      const formattedM = String(m).padStart(2, "0");
      setBEnd(`${formattedNextH}:${formattedM}`);
    }
  };

  const openRoomModal = (room?: Room) => {
    setRName(room?.name || "");
    setRCapacity(room?.capacity || 6);
    setRFloor(room?.floor || "");
    setRBranch(room?.branch || "");
    setRAmenities(room?.amenities || []);
    setRoomModal({ room });
  };

  const saveRoom = async () => {
    if (!rName.trim()) return;
    setSaving(true);
    const roomData: Room = {
      id: roomModal?.room?.id || `room-${Date.now()}`,
      companyId,
      name: rName.trim(),
      capacity: rCapacity,
      amenities: rAmenities,
      floor: rFloor || undefined,
      branch: rBranch || undefined,
      isActive: true,
      createdAt: roomModal?.room?.createdAt || new Date().toISOString(),
    };
    const ok = await onSaveRoom(roomData);
    if (ok) setRoomModal(null);
    setSaving(false);
  };

  const handleApprove = async (bookingId: string) => {
    setActionLoadingId(bookingId);
    await onUpdateBooking(bookingId, "Approved", currentEmployee?.fullName);
    setActionLoadingId(null);
  };
  const handleReject = async (bookingId: string) => {
    setActionLoadingId(bookingId);
    await onUpdateBooking(bookingId, "Rejected", currentEmployee?.fullName);
    setActionLoadingId(null);
  };
  const handleCancel = async (bookingId: string) => {
    setActionLoadingId(bookingId);
    await onUpdateBooking(bookingId, "Cancelled");
    setActionLoadingId(null);
  };

  const displayedBookings = role === "employee"
    ? companyBookings.filter(b => b.requestedBy === currentEmployeeId)
    : companyBookings;

  const filteredBookings = filterStatus === "all" ? displayedBookings : displayedBookings.filter(b => b.status === filterStatus);

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-[#1a1a1a] p-1 rounded-xl w-fit">
        {[
          { id: "rooms", label: "Available Rooms", icon: <Building2 className="w-3.5 h-3.5" /> },
          role === "employee"
            ? { id: "bookings", label: "My Bookings", icon: <CalendarDays className="w-3.5 h-3.5" /> }
            : { id: "bookings", label: "All Bookings", icon: <CalendarDays className="w-3.5 h-3.5" /> },
          ...(canManageRooms ? [{ id: "manage", label: "Manage Rooms", icon: <Settings2 className="w-3.5 h-3.5" /> }] : []),
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveRoomTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              currentTab === tab.id
                ? "bg-white dark:bg-[#0f0f0f] text-slate-800 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === "bookings" && pendingBookings.length > 0 && canApprove && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                {pendingBookings.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB: Rooms */}
      {currentTab === "rooms" && (
        <div className="space-y-4">
          {/* Date picker */}
          <div className="flex items-center gap-3">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="text-sm bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <span className="text-xs text-slate-400 font-semibold">
              {todayBookings.length} booking{todayBookings.length !== 1 ? "s" : ""} on this date
            </span>
          </div>

          {companyRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/30 flex items-center justify-center">
                <DoorOpen className="w-8 h-8 text-sky-500" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-700 dark:text-gray-300">No Rooms Configured</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {canManageRooms ? "Go to 'Manage Rooms' to add meeting rooms." : "No rooms have been set up yet."}
                </p>
              </div>
              {canManageRooms && (
                <button onClick={() => setActiveRoomTab("manage")} className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold rounded-xl transition-all">
                  <Settings2 className="w-4 h-4" />Manage Rooms
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {companyRooms.map(room => {
                const isBusy = isRoomBusy(room, selectedDate);
                const dayBookings = getRoomBookingsForDay(room.id, selectedDate);

                return (
                  <div key={room.id} className={`relative bg-white dark:bg-[#0f0f0f] rounded-2xl border overflow-hidden transition-all hover:shadow-lg ${
                    isBusy
                      ? "border-rose-200 dark:border-rose-800/40"
                      : "border-slate-100 dark:border-[#1a1a1a] hover:border-emerald-300 dark:hover:border-emerald-700/50"
                  }`}>
                    {/* Status ribbon */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${isBusy ? "bg-rose-500" : "bg-emerald-500"}`} />

                    <div className="p-5 pt-6 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isBusy ? "bg-rose-500" : "bg-emerald-500"}`} />
                            <span className={`text-[10px] font-black uppercase tracking-wider ${isBusy ? "text-rose-500" : "text-emerald-500"}`}>
                              {isBusy ? "Occupied" : "Vacant"}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-800 dark:text-white mt-1">{room.name}</h3>
                          {room.floor && <p className="text-[11px] text-slate-400">Floor: {room.floor}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1a1a1a] px-2.5 py-1 rounded-xl">
                            <Users className="w-3 h-3 text-slate-500" />
                            <span className="text-xs font-bold text-slate-600 dark:text-gray-300">{room.capacity}</span>
                          </div>
                        </div>
                      </div>

                      {/* Amenities */}
                      {room.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {room.amenities.map(am => {
                            const [name, iconName] = am.split("|");
                            const icon = iconName ? (AMENITY_ICONS[iconName] || <Star className="w-3 h-3" />) : (AMENITY_ICONS[am] || <Star className="w-3 h-3" />);
                            return (
                              <div key={am} className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-[#1a1a1a] rounded-lg text-[10px] font-semibold text-slate-500 dark:text-gray-400">
                                {icon}
                                {name}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Today's bookings */}
                      {dayBookings.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Booked slots:</p>
                          {dayBookings.map(b => (
                            <div key={b.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-100 dark:border-rose-800/20">
                              <Clock className="w-3 h-3 text-rose-500 shrink-0" />
                              <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">{b.startTime}–{b.endTime}</span>
                              <span className="text-[10px] text-slate-500 dark:text-gray-400 truncate">{b.title}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Book button */}
                      <button
                        onClick={() => openBookingModal(room)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                      >
                        <CalendarDays className="w-4 h-4" />
                        Book This Room
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: All Bookings / My Bookings */}
      {currentTab === "bookings" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            {canApprove && pendingBookings.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-xl text-xs text-amber-700 dark:text-amber-400 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{pendingBookings.length} booking{pendingBookings.length !== 1 ? "s" : ""} pending your approval</span>
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Filter:</span>
              {["all", "Pending", "Approved", "Rejected", "Cancelled"].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filterStatus === s
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-[#252525]"
                  }`}
                >
                  {s === "all" ? "All" : s}
                </button>
              ))}
            </div>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">No bookings found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map(booking => {
                  const requester = employees.find(e => e.id === booking.requestedBy);
                  const statusConfig = {
                    Pending: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800/30", icon: <Clock className="w-3.5 h-3.5" /> },
                    Approved: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800/30", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                    Rejected: { color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/20", border: "border-rose-200 dark:border-rose-800/30", icon: <XCircle className="w-3.5 h-3.5" /> },
                    Cancelled: { color: "text-slate-500 dark:text-gray-400", bg: "bg-slate-50 dark:bg-[#1a1a1a]", border: "border-slate-200 dark:border-[#2a2a2a]", icon: <Ban className="w-3.5 h-3.5" /> },
                  }[booking.status];

                  return (
                    <div key={booking.id} className={`rounded-2xl border p-4 transition-all ${statusConfig.bg} ${statusConfig.border}`}>
                      <div className="flex items-start gap-3">
                        <img
                          src={requester?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=40&auto=format&fit=crop"}
                          alt={booking.requestedByName}
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-white">{booking.title}</h4>
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${statusConfig.color} ${statusConfig.bg} border ${statusConfig.border}`}>
                              {statusConfig.icon}
                              {booking.status}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                            <span className="font-semibold">{booking.roomName}</span> · {booking.date} · {booking.startTime}–{booking.endTime}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Requested by <span className="font-semibold">{booking.requestedByName}</span>
                            {booking.purpose && ` — ${booking.purpose}`}
                          </p>
                          {booking.approvedBy && (
                            <p className="text-[10px] text-slate-400 mt-1">
                              {booking.status === "Approved" ? "✓ Approved" : "✗ Reviewed"} by {booking.approvedBy}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 mt-3 ml-13">
                        {canApprove && booking.status === "Pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(booking.id)}
                              disabled={actionLoadingId === booking.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-60"
                            >
                              {actionLoadingId === booking.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(booking.id)}
                              disabled={actionLoadingId === booking.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 dark:bg-rose-950/30 hover:bg-rose-200 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl transition-all disabled:opacity-60"
                            >
                              {actionLoadingId === booking.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-rose-600 dark:border-rose-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <X className="w-3 h-3" />
                              )}
                              Reject
                            </button>
                          </>
                        )}
                        {(booking.requestedBy === currentEmployeeId || canManageRooms) && booking.status === "Approved" && (
                          <button
                            onClick={() => handleCancel(booking.id)}
                            disabled={actionLoadingId === booking.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 text-xs font-bold rounded-xl transition-all hover:bg-slate-200 disabled:opacity-60"
                          >
                            {actionLoadingId === booking.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Ban className="w-3 h-3" />
                            )}
                            Cancel
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

      {/* TAB: Manage Rooms */}
      {currentTab === "manage" && canManageRooms && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 dark:text-gray-300">Room Management</h3>
            <button
              onClick={() => openRoomModal()}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-3.5 h-3.5" />Add Room
            </button>
          </div>

          {rooms.filter(r => r.companyId === companyId).length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <DoorOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">No rooms added yet</p>
              <p className="text-xs mt-1">Add your first meeting room to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rooms.filter(r => r.companyId === companyId).map(room => (
                <div key={room.id} className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-slate-100 dark:border-[#1a1a1a] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white">{room.name}</h4>
                      <p className="text-xs text-slate-400">
                        {room.floor && `Floor: ${room.floor} · `}Capacity: {room.capacity}
                        {!room.isActive && " · ⚠️ Inactive"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openRoomModal(room)} className="p-2 rounded-xl bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 hover:bg-slate-200 transition-all">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDeleteRoom(room.id)} className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {room.amenities.map(am => {
                      const [name, iconName] = am.split("|");
                      const icon = iconName ? (AMENITY_ICONS[iconName] || <Star className="w-3 h-3" />) : (AMENITY_ICONS[am] || <Star className="w-3 h-3" />);
                      return (
                        <span key={am} className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-[#1a1a1a] rounded-lg text-[10px] font-semibold text-slate-500">
                          {icon}
                          {name}
                        </span>
                      );
                    })}
                    {room.amenities.length === 0 && <span className="text-xs text-slate-400">No amenities listed</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Booking Modal */}
      {bookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-slate-100 dark:border-[#1a1a1a] p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Book Room</h3>
                <p className="text-xs text-slate-400 mt-0.5">{bookingModal.room.name} · Cap: {bookingModal.room.capacity}</p>
              </div>
              <button onClick={() => setBookingModal(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1a1a1a] text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Meeting Title *</label>
                <input value={bTitle} onChange={e => setBTitle(e.target.value)} placeholder="e.g. Q3 Strategy Review" className="w-full text-sm bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2.5 text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Date</label>
                  <input type="date" value={bDate} onChange={e => setBDate(e.target.value)} className="w-full text-sm bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2.5 text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Start Time</label>
                  <input type="time" value={bStart} onChange={e => handleStartTimeChange(e.target.value)} className="w-full text-sm bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2.5 text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">End Time</label>
                <input type="time" value={bEnd} onChange={e => setBEnd(e.target.value)} className="w-full text-sm bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2.5 text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Purpose / Agenda</label>
                <textarea value={bPurpose} onChange={e => setBPurpose(e.target.value)} rows={2} placeholder="Brief agenda or purpose of booking..." className="w-full text-sm bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2.5 text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Attendees</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                  {employees.filter(e => e.id !== currentEmployeeId).map(emp => (
                    <label key={emp.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1a1a1a] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bAttendees.includes(emp.id)}
                        onChange={e => setBAttendees(prev => e.target.checked ? [...prev, emp.id] : prev.filter(id => id !== emp.id))}
                        className="w-4 h-4 rounded accent-emerald-600"
                      />
                      <img src={emp.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=40&auto=format&fit=crop"} alt={emp.fullName} className="w-7 h-7 rounded-full object-cover" />
                      <span className="text-sm text-slate-700 dark:text-gray-300 font-semibold flex-1 truncate">{emp.fullName}</span>
                      <span className="text-[10px] text-slate-400">{emp.department}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-1 flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-xl">
                <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                  Booking requests require admin approval before the room is confirmed.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setBookingModal(null)} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2a2a2a] text-slate-500 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-[#1a1a1a] disabled:opacity-50">Cancel</button>
                <button
                  onClick={submitBooking}
                  disabled={!bTitle.trim() || saving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all disabled:opacity-50 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    "Submit Booking Request"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room Add/Edit Modal */}
      {roomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-slate-100 dark:border-[#1a1a1a] p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                {roomModal.room ? "Edit Room" : "Add New Room"}
              </h3>
              <button onClick={() => setRoomModal(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1a1a1a] text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Room Name *</label>
                <input value={rName} onChange={e => setRName(e.target.value)} placeholder="e.g. Board Room A" className="w-full text-sm bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2.5 text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Capacity</label>
                  <input type="number" value={rCapacity} min={1} onChange={e => setRCapacity(Number(e.target.value))} className="w-full text-sm bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2.5 text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Floor</label>
                  <input value={rFloor} onChange={e => setRFloor(e.target.value)} placeholder="e.g. 3rd Floor" className="w-full text-sm bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2.5 text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {activeAmenities.map(am => {
                    const [name, iconName] = am.split("|");
                    const isSelected = rAmenities.includes(am);
                    const icon = iconName ? (AMENITY_ICONS[iconName] || <Star className="w-3 h-3" />) : (AMENITY_ICONS[am] || <Star className="w-3 h-3" />);
                    return (
                      <button
                        key={am}
                        type="button"
                        onClick={() => setRAmenities(prev => prev.includes(am) ? prev.filter(a => a !== am) : [...prev, am])}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 border-slate-200 dark:border-[#2a2a2a] hover:border-emerald-300"
                        }`}
                      >
                        {icon}
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setRoomModal(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2a2a2a] text-slate-500 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-[#1a1a1a]">Cancel</button>
                <button
                  onClick={saveRoom}
                  disabled={!rName.trim() || saving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all disabled:opacity-50"
                >
                  {saving ? "Saving..." : roomModal.room ? "Save Changes" : "Add Room"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN WORKSPACE VIEW ───────────────────────────────────────────────────────

export default function WorkspaceView(props: WorkspaceViewProps) {
  const [activeTab, setActiveTab] = useState<"seating" | "rooms">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("snailhr_workspace_activeTab") as "seating" | "rooms") || "seating";
    }
    return "seating";
  });

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("snailhr_workspace_activeTab", activeTab);
    }
  }, [activeTab]);

  const pendingCount = props.roomBookings.filter(
    b => b.companyId === props.companyId && b.status === "Pending"
  ).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-black text-slate-800 dark:text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <LayoutGrid className="w-4 h-4" />
            </span>
            Seating & Rooms
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 font-semibold">
            {props.companyName} · Workspace Management
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-[#1a1a1a] p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("seating")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "seating"
              ? "bg-white dark:bg-[#0f0f0f] text-slate-800 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"
          }`}
        >
          <Armchair className="w-4 h-4" />
          Seating Plan
        </button>
        <button
          onClick={() => setActiveTab("rooms")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "rooms"
              ? "bg-white dark:bg-[#0f0f0f] text-slate-800 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"
          }`}
        >
          <DoorOpen className="w-4 h-4" />
          Room Booking
          {pendingCount > 0 && (props.role === "admin" || props.role === "hr") && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "seating" && (
        <SeatingPlan
          role={props.role}
          companyId={props.companyId}
          companyName={props.companyName}
          employees={props.employees}
          currentEmployeeId={props.currentEmployeeId}
          seatLayouts={props.seatLayouts}
          onSaveSeatLayout={props.onSaveSeatLayout}
          onDeleteSeatLayout={props.onDeleteSeatLayout}
        />
      )}

      {activeTab === "rooms" && (
        <RoomBookingView
          role={props.role}
          companyId={props.companyId}
          companyName={props.companyName}
          employees={props.employees}
          currentEmployeeId={props.currentEmployeeId}
          rooms={props.rooms}
          roomBookings={props.roomBookings}
          customAmenities={props.customAmenities}
          onSaveRoom={props.onSaveRoom}
          onDeleteRoom={props.onDeleteRoom}
          onBookRoom={props.onBookRoom}
          onUpdateBooking={props.onUpdateBooking}
        />
      )}
    </div>
  );
}
