"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  "TV / Display": <Tv className="w-3.5 h-3.5" />,
  "HDMI Cables": <Cable className="w-3.5 h-3.5" />,
  "Speakerphone": <Volume2 className="w-3.5 h-3.5" />,
  "Coffee Machine": <Coffee className="w-3.5 h-3.5" />,
  "Air Conditioning": <Snowflake className="w-3.5 h-3.5" />,
  "Microphone": <Mic className="w-3.5 h-3.5" />,
  "Conference Phone": <Phone className="w-3.5 h-3.5" />,
  "Smart Board": <Presentation className="w-3.5 h-3.5" />,
};

const ALL_AMENITIES = ["Projector", "Whiteboard", "Video Conferencing", "WiFi", "Coffee", "AC"];

// ─── Section Colors ────────────────────────────────────────────────────────────

const SECTION_COLORS = [
  { label: "Emerald", value: "#10b981" },
  { label: "Sky Blue", value: "#0ea5e9" },
  { label: "Purple", value: "#a855f7" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Slate", value: "#64748b" },
];

// ─── Seat Chair SVG ───────────────────────────────────────────────────────────

function ChairIcon({ color = "#6b7280", size = 40 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* backrest */}
      <rect x="8" y="4" width="24" height="14" rx="4" fill={color} opacity="0.9" />
      {/* seat */}
      <rect x="6" y="18" width="28" height="12" rx="3" fill={color} opacity="0.85" />
      {/* legs */}
      <rect x="10" y="30" width="4" height="8" rx="2" fill={color} opacity="0.6" />
      <rect x="26" y="30" width="4" height="8" rx="2" fill={color} opacity="0.6" />
    </svg>
  );
}

// ─── DEFAULT LAYOUT BUILDER ───────────────────────────────────────────────────

// ─── DEFAULT & CUSTOM LAYOUT BUILDERS ───────────────────────────────────────────

function buildBlankLayout(
  companyId: string,
  name: string,
  initialSectionName: string = "General Workspace",
  initialDesksCount: number = 8,
  initialColor: string = "#10b981"
): SeatLayout {
  const secId = `sec-${Date.now()}`;
  const sections: SeatSection[] = initialSectionName.trim()
    ? [{ id: secId, name: initialSectionName.trim(), color: initialColor }]
    : [];

  const seats: Seat[] = [];
  for (let i = 1; i <= initialDesksCount; i++) {
    seats.push({
      id: `seat-${Date.now()}-${i}`,
      seatNumber: String(i),
      sectionId: secId,
      x: (i - 1) % 6,
      y: Math.floor((i - 1) / 6),
      type: "desk",
    });
  }

  return {
    id: `layout-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    companyId,
    name: name.trim() || "Main Office Layout",
    sections,
    seats,
    updatedAt: new Date().toISOString(),
  };
}

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
    id: `layout-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    companyId,
    name: companyName ? `${companyName}` : "Main Office",
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
  const currentEmployee = employees.find(e => e.id === currentEmployeeId);
  const effectiveCompanyId = companyId || currentEmployee?.companyId || (typeof window !== "undefined" ? localStorage.getItem("snailhr_companyId") || "" : "");

  // Use layouts for this company
  const companyLayouts = seatLayouts.filter(l => !effectiveCompanyId || l.companyId === effectiveCompanyId);
  const effectiveLayouts = companyLayouts.length > 0 ? companyLayouts : [];

  const [selectedLayoutId, setSelectedLayoutId] = useState<string>(effectiveLayouts[0]?.id || "");

  useEffect(() => {
    if (effectiveLayouts.length > 0) {
      if (!selectedLayoutId || !effectiveLayouts.some(l => l.id === selectedLayoutId)) {
        setSelectedLayoutId(effectiveLayouts[0].id);
      }
    }
  }, [effectiveLayouts, selectedLayoutId]);

  const activeLayout = effectiveLayouts.find(l => l.id === selectedLayoutId) || effectiveLayouts[0] || null;

  const [editMode, setEditMode] = useState(false);
  const [draftLayout, setDraftLayout] = useState<SeatLayout | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Modals
  const [addSectionModal, setAddSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionColor, setNewSectionColor] = useState(SECTION_COLORS[0].value);
  const [newSectionDesks, setNewSectionDesks] = useState(6);

  const [editSectionModal, setEditSectionModal] = useState<SeatSection | null>(null);
  const [editSectionName, setEditSectionName] = useState("");
  const [editSectionColor, setEditSectionColor] = useState(SECTION_COLORS[0].value);

  const [selectedSeatModal, setSelectedSeatModal] = useState<{ seat: Seat; isViewingOnly?: boolean } | null>(null);
  const [showNewLayoutModal, setShowNewLayoutModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamedLayoutName, setRenamedLayoutName] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterAvailability, setFilterAvailability] = useState<"all" | "available" | "occupied" | "my">("all");
  const [filterSectionId, setFilterSectionId] = useState<string>("all");
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);

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
    const resolvedCompanyId = draftLayout.companyId || effectiveCompanyId || companyId || "";
    const ok = await onSaveSeatLayout({ ...draftLayout, companyId: resolvedCompanyId });
    if (ok) {
      setEditMode(false);
      setDraftLayout(null);
    }
    setSaving(false);
  };

  const createNewLayout = async (
    name: string,
    mode: "blank" | "custom" | "template",
    customSectionName?: string,
    customDesks?: number,
    customColor?: string
  ) => {
    if (!name.trim()) return;
    const resolvedCompanyId = effectiveCompanyId || companyId || "";
    let newLayout: SeatLayout;

    if (mode === "template") {
      newLayout = buildDefaultLayout(resolvedCompanyId, name.trim());
    } else if (mode === "custom") {
      newLayout = buildBlankLayout(
        resolvedCompanyId,
        name.trim(),
        customSectionName || "General Workspace",
        customDesks || 8,
        customColor || "#10b981"
      );
    } else {
      // blank
      newLayout = buildBlankLayout(resolvedCompanyId, name.trim(), "", 0);
    }

    setSaving(true);
    const ok = await onSaveSeatLayout(newLayout);
    if (ok) {
      setSelectedLayoutId(newLayout.id);
      setShowNewLayoutModal(false);
      // Automatically open in edit mode if blank or custom
      if (mode === "blank" || mode === "custom") {
        setDraftLayout(JSON.parse(JSON.stringify(newLayout)));
        setEditMode(true);
      }
    }
    setSaving(false);
  };

  const handleDeleteCurrentLayout = async () => {
    if (!activeLayout) return;
    if (window.confirm(`Are you sure you want to delete layout "${activeLayout.name}"? This action cannot be undone.`)) {
      await onDeleteSeatLayout(activeLayout.id);
    }
  };

  const handleRenameCurrentLayout = async () => {
    if (!activeLayout || !renamedLayoutName.trim()) return;
    setSaving(true);
    const resolvedCompanyId = activeLayout.companyId || effectiveCompanyId || companyId || "";
    const ok = await onSaveSeatLayout({
      ...activeLayout,
      name: renamedLayoutName.trim(),
      companyId: resolvedCompanyId,
    });
    if (ok) {
      setShowRenameModal(false);
      setRenamedLayoutName("");
    }
    setSaving(false);
  };

  // Section actions
  const addSection = () => {
    if (!draftLayout || !newSectionName.trim()) return;
    const newSectionId = `sec-${Date.now()}`;
    const newSection: SeatSection = {
      id: newSectionId,
      name: newSectionName.trim(),
      color: newSectionColor,
    };

    const newSeats: Seat[] = [];
    const currentMaxSeatNum = draftLayout.seats.reduce((max, s) => {
      const n = parseInt(s.seatNumber);
      return !isNaN(n) ? Math.max(max, n) : max;
    }, draftLayout.seats.length);

    for (let i = 1; i <= newSectionDesks; i++) {
      newSeats.push({
        id: `seat-${Date.now()}-${i}`,
        seatNumber: String(currentMaxSeatNum + i),
        sectionId: newSectionId,
        x: (i - 1) % 6,
        y: Math.floor((i - 1) / 6),
        type: "desk",
      });
    }

    setDraftLayout({
      ...draftLayout,
      sections: [...draftLayout.sections, newSection],
      seats: [...draftLayout.seats, ...newSeats],
    });
    setNewSectionName("");
    setNewSectionDesks(6);
    setAddSectionModal(false);
  };

  const saveEditSection = () => {
    if (!draftLayout || !editSectionModal || !editSectionName.trim()) return;
    setDraftLayout({
      ...draftLayout,
      sections: draftLayout.sections.map(s =>
        s.id === editSectionModal.id
          ? { ...s, name: editSectionName.trim(), color: editSectionColor }
          : s
      ),
    });
    setEditSectionModal(null);
  };

  const deleteSection = (sectionId: string) => {
    if (!draftLayout) return;
    if (window.confirm("Are you sure you want to remove this section and all its desks?")) {
      setDraftLayout({
        ...draftLayout,
        sections: draftLayout.sections.filter(s => s.id !== sectionId),
        seats: draftLayout.seats.filter(s => s.sectionId !== sectionId),
      });
    }
  };

  // Seat actions
  const addSingleSeat = (sectionId: string) => {
    if (!draftLayout) return;
    const currentMax = draftLayout.seats.reduce((max, s) => {
      const n = parseInt(s.seatNumber);
      return !isNaN(n) ? Math.max(max, n) : max;
    }, draftLayout.seats.length);

    const sectionSeats = draftLayout.seats.filter(s => s.sectionId === sectionId);
    const newSeat: Seat = {
      id: `seat-${Date.now()}`,
      seatNumber: String(currentMax + 1),
      sectionId,
      x: sectionSeats.length % 6,
      y: Math.floor(sectionSeats.length / 6),
      type: "desk",
    };
    setDraftLayout({ ...draftLayout, seats: [...draftLayout.seats, newSeat] });
    // Reset filters so the new desk is immediately visible
    setFilterAvailability("all");
    setFilterSectionId("all");
  };

  const bulkAddSeats = (sectionId: string, count: number) => {
    if (!draftLayout || count <= 0) return;
    const currentMax = draftLayout.seats.reduce((max, s) => {
      const n = parseInt(s.seatNumber);
      return !isNaN(n) ? Math.max(max, n) : max;
    }, draftLayout.seats.length);

    const sectionSeats = draftLayout.seats.filter(s => s.sectionId === sectionId);
    const newSeats: Seat[] = [];
    for (let i = 1; i <= count; i++) {
      newSeats.push({
        id: `seat-${Date.now()}-${i}`,
        seatNumber: String(currentMax + i),
        sectionId,
        x: (sectionSeats.length + i - 1) % 6,
        y: Math.floor((sectionSeats.length + i - 1) / 6),
        type: "desk",
      });
    }
    setDraftLayout({ ...draftLayout, seats: [...draftLayout.seats, ...newSeats] });
    // Reset filters so new desks are immediately visible
    setFilterAvailability("all");
    setFilterSectionId("all");
  };

  const deleteSeat = (seatId: string) => {
    if (!draftLayout) return;
    setDraftLayout({ ...draftLayout, seats: draftLayout.seats.filter(s => s.id !== seatId) });
    if (selectedSeatModal?.seat.id === seatId) {
      setSelectedSeatModal(null);
    }
  };

  const saveSeatDetails = (
    seatId: string,
    seatNumber: string,
    label: string,
    type: Seat["type"],
    sectionId: string,
    assignedEmployeeId: string | null
  ) => {
    if (!draftLayout) return;
    // Unassign this employee if already assigned to another seat
    const updatedSeats = draftLayout.seats.map(s => {
      if (s.id === seatId) {
        return {
          ...s,
          seatNumber: seatNumber.trim() || s.seatNumber,
          label: label.trim() || undefined,
          type,
          sectionId,
          assignedEmployeeId,
        };
      }
      if (assignedEmployeeId && s.assignedEmployeeId === assignedEmployeeId) {
        return { ...s, assignedEmployeeId: null };
      }
      return s;
    });

    setDraftLayout({ ...draftLayout, seats: updatedSeats });
    setSelectedSeatModal(null);
  };

  const getEmployeeForSeat = (seat: Seat): Employee | undefined => {
    return employees.find(e => e.id === seat.assignedEmployeeId);
  };

  const getSectionColor = (sectionId: string): string => {
    return layout?.sections.find(s => s.id === sectionId)?.color || "#6b7280";
  };

  const getSectionName = (sectionId: string): string => {
    return layout?.sections.find(s => s.id === sectionId)?.name || "General";
  };

  const mySeats = layout?.seats.filter(s => s.assignedEmployeeId === currentEmployeeId) || [];

  // Group seats by section for rendering
  const allSections = layout?.sections || [];
  const allSeats = layout?.seats || [];

  // KPI calculations
  const totalDesksCount = allSeats.length;
  const occupiedDesksCount = allSeats.filter(s => !!s.assignedEmployeeId).length;
  const availableDesksCount = totalDesksCount - occupiedDesksCount;
  const cabinsCount = allSeats.filter(s => s.type === "cabin" || s.type === "reserved").length;
  const occupancyPercent = totalDesksCount > 0 ? Math.round((occupiedDesksCount / totalDesksCount) * 100) : 0;

  const seatsBySection = allSections.map(section => ({
    section,
    seats: allSeats
      .filter(s => s.sectionId === section.id)
      .sort((a, b) => {
        const numA = parseInt(a.seatNumber);
        const numB = parseInt(b.seatNumber);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.seatNumber.localeCompare(b.seatNumber);
      })
  }));

  // Filtered seats — in edit mode, always show all seats in sections (ignore availability filter)
  // so that newly added desks are always visible to the editor
  const filteredSeatsBySection = seatsBySection
    .filter(({ section }) => filterSectionId === "all" || section.id === filterSectionId)
    .map(({ section, seats }) => {
      let result = seats;

      // Only apply availability filter in view mode (not edit mode)
      if (!editMode) {
        if (filterAvailability === "available") {
          result = result.filter(s => !s.assignedEmployeeId);
        } else if (filterAvailability === "occupied") {
          result = result.filter(s => !!s.assignedEmployeeId);
        } else if (filterAvailability === "my") {
          result = result.filter(s => s.assignedEmployeeId === currentEmployeeId);
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        result = result.filter(s => {
          const emp = getEmployeeForSeat(s);
          return (
            s.seatNumber.toLowerCase().includes(q) ||
            (s.label && s.label.toLowerCase().includes(q)) ||
            (emp && emp.fullName.toLowerCase().includes(q)) ||
            (emp && emp.department.toLowerCase().includes(q)) ||
            section.name.toLowerCase().includes(q)
          );
        });
      }

      return { section, seats: result };
    });

  if (effectiveLayouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center shadow-lg shadow-emerald-500/10">
          <Armchair className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="text-center max-w-md">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Create Your Seating Plan</h3>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-2 leading-relaxed">
            {canEdit
              ? "Start managing office floors, custom department bays, cabins, and dynamic employee seat allocations."
              : "No seating plans configured yet for this organization."}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowNewLayoutModal(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-xl shadow-emerald-600/25"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Seating Layout</span>
          </button>
        )}
        {showNewLayoutModal && (
          <NewLayoutModal
            onConfirm={createNewLayout}
            onClose={() => setShowNewLayoutModal(false)}
            saving={saving}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0f0f0f] border border-slate-200/80 dark:border-[#222] p-3.5 rounded-2xl shadow-sm">
        {/* Left: Layout Selection & Rename */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-1.5">
            <Layers className="w-4 h-4 text-emerald-500" />
            <select
              value={selectedLayoutId}
              onChange={e => { setSelectedLayoutId(e.target.value); cancelEditMode(); }}
              className="text-sm font-bold bg-transparent text-slate-800 dark:text-gray-200 focus:outline-none cursor-pointer pr-2"
            >
              {effectiveLayouts.map(l => (
                <option key={l.id} value={l.id} className="bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-white">
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {canEdit && !editMode && (
            <button
              onClick={() => {
                setRenamedLayoutName(activeLayout?.name || "");
                setShowRenameModal(true);
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a1a1a] transition-all"
              title="Rename Layout"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Center: Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search desk #, employee, dept..."
            className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a] rounded-xl pl-9 pr-3 py-2 text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {canEdit && !editMode && (
            <>
              <button
                onClick={() => setShowNewLayoutModal(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 dark:bg-[#1a1a1a] hover:bg-slate-200 dark:hover:bg-[#252525] text-slate-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-500" />
                <span>New Layout</span>
              </button>
              {effectiveLayouts.length > 1 && (
                <button
                  onClick={handleDeleteCurrentLayout}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-all"
                  title="Delete this layout"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
              <button
                onClick={enterEditMode}
                className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Layout</span>
              </button>
            </>
          )}

          {editMode && (
            <>
              <button
                onClick={cancelEditMode}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 dark:bg-[#1a1a1a] text-slate-600 dark:text-gray-300 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
              <button
                onClick={() => setAddSectionModal(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Section</span>
              </button>
              <button
                onClick={saveLayout}
                disabled={saving}
                className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-60"
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

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200/80 dark:border-[#222] p-3.5 rounded-2xl">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Desks</p>
          <p className="text-xl font-extrabold text-slate-800 dark:text-white mt-0.5">{totalDesksCount}</p>
        </div>
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200/80 dark:border-[#222] p-3.5 rounded-2xl">
          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Occupied</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{occupiedDesksCount}</p>
            <span className="text-xs text-slate-400 font-bold">({occupancyPercent}%)</span>
          </div>
        </div>
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200/80 dark:border-[#222] p-3.5 rounded-2xl">
          <p className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Available</p>
          <p className="text-xl font-extrabold text-sky-600 dark:text-sky-400 mt-0.5">{availableDesksCount}</p>
        </div>
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200/80 dark:border-[#222] p-3.5 rounded-2xl">
          <p className="text-[11px] font-semibold text-rose-500 uppercase tracking-wider">Cabins & Private</p>
          <p className="text-xl font-extrabold text-rose-500 mt-0.5">{cabinsCount}</p>
        </div>
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200/80 dark:border-[#222] p-3.5 rounded-2xl">
          <p className="text-[11px] font-semibold text-purple-500 uppercase tracking-wider">Sections</p>
          <p className="text-xl font-extrabold text-purple-500 mt-0.5">{allSections.length}</p>
        </div>
      </div>

      {/* Edit Mode Instructions Banner */}
      {editMode && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-transparent border border-amber-300 dark:border-amber-700/50 rounded-2xl text-xs font-semibold text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Dynamic Builder Active:</strong> Click on any desk to customize its name, label, type, or assign an employee. Use the section controls to add desks or sections.
            </span>
          </div>
          <button
            onClick={() => setAddSectionModal(true)}
            className="shrink-0 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold"
          >
            + Add New Section
          </button>
        </div>
      )}

      {/* Filter Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Availability Filters */}
        <div className="flex gap-1 bg-slate-100 dark:bg-[#1a1a1a] p-1 rounded-xl w-fit">
          {[
            { id: "all", label: `All (${totalDesksCount})` },
            { id: "available", label: `Available (${availableDesksCount})` },
            { id: "occupied", label: `Occupied (${occupiedDesksCount})` },
            ...(mySeats.length > 0 ? [{ id: "my", label: `My Seat (${mySeats.length})` }] : []),
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterAvailability(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterAvailability === tab.id
                  ? "bg-white dark:bg-[#0f0f0f] text-slate-800 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Section Pill Filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Section:</span>
          <button
            onClick={() => setFilterSectionId("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              filterSectionId === "all"
                ? "bg-slate-800 dark:bg-white text-white dark:text-slate-900"
                : "bg-slate-100 dark:bg-[#1a1a1a] text-slate-600 dark:text-gray-400"
            }`}
          >
            All Sections
          </button>
          {allSections.map(s => (
            <button
              key={s.id}
              onClick={() => setFilterSectionId(s.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                filterSectionId === s.id
                  ? "ring-2 ring-emerald-500/50"
                  : "opacity-80 hover:opacity-100"
              }`}
              style={{ backgroundColor: s.color + "15", color: s.color, borderColor: s.color + "30" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Seating Workspace Grid */}
      <div className="space-y-5">
        {filteredSeatsBySection.length === 0 || allSections.length === 0 ? (
          <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-dashed border-slate-200 dark:border-[#222] p-12 text-center space-y-3">
            <Armchair className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-700 dark:text-gray-300">No Desks Match Your Filter</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {allSections.length === 0
                ? "This layout has no sections yet. Click 'Edit Layout' and '+ Add Section' to start building your floor plan."
                : "Try resetting your search query or selecting 'All' filters."}
            </p>
            {editMode && allSections.length === 0 && (
              <button
                onClick={() => setAddSectionModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
              >
                + Add Your First Section
              </button>
            )}
          </div>
        ) : (
          filteredSeatsBySection.map(({ section, seats }) => {
            const sectionTotal = seats.length;
            const sectionOccupied = seats.filter(s => !!s.assignedEmployeeId).length;

            return (
              <div
                key={section.id}
                className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-slate-200/80 dark:border-[#222] p-4.5 space-y-4 shadow-sm"
              >
                {/* Section Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-[#1a1a1a] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3.5 h-3.5 rounded-md shadow-sm" style={{ backgroundColor: section.color }} />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">{section.name}</h3>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 dark:text-gray-400">
                      {sectionOccupied} / {sectionTotal} Desks Occupied
                    </span>
                  </div>

                  {/* Section Edit Buttons in Edit Mode */}
                  {editMode && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => addSingleSeat(section.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm"
                        style={{ backgroundColor: section.color }}
                        title="Add 1 desk"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+1 Desk</span>
                      </button>
                      <button
                        onClick={() => bulkAddSeats(section.id, 4)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-[#1a1a1a] hover:bg-slate-200 text-slate-700 dark:text-gray-300 transition-all"
                        title="Quick add 4 desks"
                      >
                        <span>+4 Desks</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditSectionModal(section);
                          setEditSectionName(section.name);
                          setEditSectionColor(section.color);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a1a1a]"
                        title="Rename/Edit Section"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteSection(section.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        title="Delete Section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Seats Grid */}
                {seats.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-slate-200 dark:border-[#222] rounded-xl">
                    <p className="text-xs font-semibold text-slate-400">No desks in this section yet.</p>
                    {editMode && (
                      <button
                        onClick={() => addSingleSeat(section.id)}
                        className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        + Add a desk to {section.name}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {seats.map(seat => {
                      const emp = getEmployeeForSeat(seat);
                      const isMySeat = seat.assignedEmployeeId === currentEmployeeId;
                      const isOccupied = !!emp;

                      return (
                        <div
                          key={seat.id}
                          onClick={() => setSelectedSeatModal({ seat, isViewingOnly: !editMode })}
                          className={`relative group rounded-2xl p-3 flex flex-col items-center justify-between text-center transition-all cursor-pointer border ${
                            isMySeat
                              ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-400 ring-2 ring-emerald-500/20 shadow-md shadow-emerald-500/10"
                              : isOccupied
                              ? "bg-slate-50 dark:bg-[#141414] border-slate-200 dark:border-[#262626] hover:border-slate-300 dark:hover:border-[#3a3a3a]"
                              : "bg-white dark:bg-[#0c0c0c] border-dashed border-slate-200 dark:border-[#262626] hover:border-emerald-400/80 hover:bg-emerald-50/30"
                          } hover:shadow-lg hover:-translate-y-0.5`}
                        >
                          {/* Seat Header Tag */}
                          <div className="w-full flex items-center justify-between gap-1 mb-1.5">
                            <span
                              className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md"
                              style={{ backgroundColor: section.color + "20", color: section.color }}
                            >
                              #{seat.seatNumber}
                            </span>
                            {seat.type === "cabin" && (
                              <span className="text-[9px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1 rounded">
                                Cabin
                              </span>
                            )}
                            {seat.type === "reserved" && (
                              <span className="text-[9px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-1 rounded">
                                Resv
                              </span>
                            )}
                          </div>

                          {/* Chair / Desk Visual */}
                          <div className="py-1">
                            <ChairIcon
                              color={isMySeat ? "#10b981" : isOccupied ? section.color : "#cbd5e1"}
                              size={34}
                            />
                          </div>

                          {/* Occupant / Status Info */}
                          <div className="w-full mt-1.5">
                            {emp ? (
                              <div className="space-y-0.5">
                                <p className="text-[11px] font-bold text-slate-800 dark:text-gray-200 truncate leading-tight">
                                  {emp.fullName}
                                </p>
                                <p className="text-[9px] text-slate-400 truncate leading-none">
                                  {seat.label || emp.department}
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600">
                                  Vacant
                                </span>
                                {seat.label && (
                                  <p className="text-[9px] text-slate-400 truncate leading-none">{seat.label}</p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Quick Delete in Edit Mode */}
                          {editMode && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                deleteSeat(seat.id);
                              }}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-rose-600 z-10"
                              title="Delete Seat"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ─── MODALS ───────────────────────────────────────────────────────────── */}

      {/* 1. Interactive Seat Details & Assignment Modal */}
      {selectedSeatModal && (
        <SeatDetailsModal
          seat={selectedSeatModal.seat}
          sections={allSections}
          employees={employees}
          canEdit={canEdit}
          isEditMode={editMode}
          onSave={saveSeatDetails}
          onDelete={deleteSeat}
          onClose={() => setSelectedSeatModal(null)}
        />
      )}

      {/* 2. Add Section Modal */}
      {addSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-slate-100 dark:border-[#1a1a1a] p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Add New Section</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Section Name</label>
                <input
                  value={newSectionName}
                  onChange={e => setNewSectionName(e.target.value)}
                  placeholder="e.g. Frontend Engineering, Executive Bay"
                  className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2.5 text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Initial Desks Count</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={newSectionDesks}
                  onChange={e => setNewSectionDesks(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Section Color</label>
                <div className="flex flex-wrap gap-2">
                  {SECTION_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setNewSectionColor(c.value)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${newSectionColor === c.value ? "border-slate-800 dark:border-white scale-110 shadow-md" : "border-transparent"}`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setAddSectionModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2a2a2a] text-slate-500 text-xs font-bold hover:bg-slate-50 dark:hover:bg-[#181818]"
                >
                  Cancel
                </button>
                <button
                  onClick={addSection}
                  disabled={!newSectionName.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  Add Section
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Edit Section Modal */}
      {editSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-slate-100 dark:border-[#1a1a1a] p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Edit Section</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Section Name</label>
                <input
                  value={editSectionName}
                  onChange={e => setEditSectionName(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2.5 text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Section Color</label>
                <div className="flex flex-wrap gap-2">
                  {SECTION_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setEditSectionColor(c.value)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${editSectionColor === c.value ? "border-slate-800 dark:border-white scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditSectionModal(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2a2a2a] text-slate-500 text-xs font-bold hover:bg-slate-50 dark:hover:bg-[#181818]"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditSection}
                  disabled={!editSectionName.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  Update Section
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Rename Layout Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-slate-100 dark:border-[#1a1a1a] p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Rename Seating Layout</h3>
            <input
              value={renamedLayoutName}
              onChange={e => setRenamedLayoutName(e.target.value)}
              placeholder="e.g. Floor 2 - Engineering Hub"
              className="w-full text-sm bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2.5 text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              onKeyDown={e => e.key === "Enter" && handleRenameCurrentLayout()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowRenameModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2a2a2a] text-slate-500 text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameCurrentLayout}
                disabled={!renamedLayoutName.trim() || saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Name"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. New Layout Modal */}
      {showNewLayoutModal && (
        <NewLayoutModal
          onConfirm={createNewLayout}
          onClose={() => setShowNewLayoutModal(false)}
          saving={saving}
        />
      )}
    </div>
  );
}

// ─── COMPONENT: INTERACTIVE SEAT DETAILS MODAL ─────────────────────────────────

function SeatDetailsModal({
  seat,
  sections,
  employees,
  canEdit,
  isEditMode,
  onSave,
  onDelete,
  onClose,
}: {
  seat: Seat;
  sections: SeatSection[];
  employees: Employee[];
  canEdit: boolean;
  isEditMode: boolean;
  onSave: (seatId: string, seatNumber: string, label: string, type: Seat["type"], sectionId: string, assignedEmpId: string | null) => void;
  onDelete: (seatId: string) => void;
  onClose: () => void;
}) {
  const [seatNumber, setSeatNumber] = useState(seat.seatNumber || "");
  const [label, setLabel] = useState(seat.label || "");
  const [seatType, setSeatType] = useState<Seat["type"]>(seat.type || "desk");
  const [sectionId, setSectionId] = useState(seat.sectionId);
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<string | null>(seat.assignedEmployeeId || null);
  const [empSearch, setEmpSearch] = useState("");

  const assignedEmp = employees.find(e => e.id === assignedEmployeeId);

  const filteredEmployees = employees.filter(e =>
    !empSearch.trim() ||
    e.fullName.toLowerCase().includes(empSearch.toLowerCase()) ||
    e.department.toLowerCase().includes(empSearch.toLowerCase()) ||
    e.email.toLowerCase().includes(empSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0f0f0f] rounded-3xl border border-slate-200 dark:border-[#222] p-6 w-full max-w-lg shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1a1a1a] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-black text-sm">
              #{seatNumber || seat.seatNumber}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                {isEditMode ? `Configure Seat #${seatNumber || seat.seatNumber}` : `Seat #${seat.seatNumber} Details`}
              </h3>
              <p className="text-[11px] text-slate-400">
                {sections.find(s => s.id === sectionId)?.name || "General"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1a1a1a] text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Edit fields (in Edit mode) */}
        {isEditMode && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Seat Number / Code</label>
              <input
                value={seatNumber}
                onChange={e => setSeatNumber(e.target.value)}
                placeholder="e.g. 101, A-1"
                className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Custom Label (Optional)</label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. Team Lead, Reception"
                className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Seat Type</label>
              <select
                value={seatType}
                onChange={e => setSeatType(e.target.value as any)}
                className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-slate-700 dark:text-gray-300 focus:outline-none cursor-pointer"
              >
                <option value="desk">Standard Desk</option>
                <option value="cabin">Executive Cabin</option>
                <option value="reserved">Reserved / Conference</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Move to Section</label>
              <select
                value={sectionId}
                onChange={e => setSectionId(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-slate-700 dark:text-gray-300 focus:outline-none cursor-pointer"
              >
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Assigned Employee Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isEditMode ? "Assign Employee" : "Currently Assigned"}
            </label>
            {assignedEmp && isEditMode && (
              <button
                onClick={() => setAssignedEmployeeId(null)}
                className="text-[11px] font-bold text-rose-500 hover:underline"
              >
                Unassign Seat
              </button>
            )}
          </div>

          {isEditMode && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={empSearch}
                onChange={e => setEmpSearch(e.target.value)}
                placeholder="Search employee by name, department..."
                className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a] rounded-xl pl-9 pr-3 py-2 text-slate-700 dark:text-gray-300 focus:outline-none"
              />
            </div>
          )}

          {/* Employee list / active card */}
          <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {isEditMode ? (
              <>
                <button
                  type="button"
                  onClick={() => setAssignedEmployeeId(null)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left border transition-all text-xs font-semibold ${
                    !assignedEmployeeId
                      ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
                      : "border-dashed border-slate-200 dark:border-[#2a2a2a] text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  <XCircle className="w-4 h-4 text-slate-400" />
                  <span>Unassigned (Keep Desk Empty)</span>
                </button>

                {filteredEmployees.map(emp => {
                  const isSelected = assignedEmployeeId === emp.id;
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => setAssignedEmployeeId(emp.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left border transition-all ${
                        isSelected
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 ring-1 ring-emerald-500/20"
                          : "border-transparent hover:bg-slate-50 dark:hover:bg-[#181818]"
                      }`}
                    >
                      <img
                        src={emp.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=40&auto=format&fit=crop"}
                        alt={emp.fullName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-gray-200 truncate">{emp.fullName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{emp.department} · {emp.role.toUpperCase()}</p>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
              </>
            ) : (
              <div>
                {assignedEmp ? (
                  <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a]">
                    <img
                      src={assignedEmp.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=60&auto=format&fit=crop"}
                      alt={assignedEmp.fullName}
                      className="w-12 h-12 rounded-2xl object-cover"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white">{assignedEmp.fullName}</h4>
                      <p className="text-xs text-slate-500 dark:text-gray-400">{assignedEmp.department} · {assignedEmp.role.toUpperCase()}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{assignedEmp.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-slate-200 dark:border-[#2a2a2a] rounded-2xl">
                    <p className="text-xs font-bold text-slate-400">This desk is currently unoccupied.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-[#1a1a1a]">
          {isEditMode && (
            <button
              onClick={() => onDelete(seat.id)}
              className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
            >
              Delete Desk
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] rounded-xl transition-all"
            >
              {isEditMode ? "Cancel" : "Close"}
            </button>
            {isEditMode && (
              <button
                onClick={() =>
                  onSave(
                    seat.id,
                    seatNumber,
                    label,
                    seatType,
                    sectionId,
                    assignedEmployeeId
                  )
                }
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-md shadow-emerald-600/20"
              >
                Apply Changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENT: DYNAMIC NEW LAYOUT CREATION MODAL ──────────────────────────────

function NewLayoutModal({
  onConfirm,
  onClose,
  saving,
}: {
  onConfirm: (
    name: string,
    mode: "blank" | "custom" | "template",
    customSectionName?: string,
    customDesks?: number,
    customColor?: string
  ) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [creationMode, setCreationMode] = useState<"blank" | "custom" | "template">("blank");
  const [sectionName, setSectionName] = useState("Main Workspace");
  const [desksCount, setDesksCount] = useState(12);
  const [selectedColor, setSelectedColor] = useState(SECTION_COLORS[0].value);

  const handleSubmit = () => {
    if (!name.trim() || saving) return;
    onConfirm(name.trim(), creationMode, sectionName, desksCount, selectedColor);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0f0f0f] rounded-3xl border border-slate-200 dark:border-[#222] p-6 w-full max-w-md shadow-2xl space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">Create New Seating Plan</h3>
          <p className="text-xs text-slate-400 mt-0.5">Design a flexible workspace floor plan for your organization.</p>
        </div>

        <div className="space-y-4">
          {/* Layout Name */}
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-gray-300 mb-1 block">
              Layout / Floor Name *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Floor 2 – Tech Bay, Marketing Wing"
              className="w-full text-xs bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2.5 text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {/* Creation Mode Chooser */}
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-gray-300 mb-2 block">
              Choose Layout Starter
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "blank", title: "Blank Canvas", desc: "Build dynamically from scratch" },
                { id: "custom", title: "Quick Bay", desc: "Start with a custom section" },
                { id: "template", title: "Office Demo", desc: "5 departments pre-filled" },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCreationMode(opt.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    creationMode === opt.id
                      ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 shadow-sm"
                      : "border-slate-200 dark:border-[#2a2a2a] text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-[#181818]"
                  }`}
                >
                  <p className="text-xs font-bold">{opt.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Section Options if "custom" selected */}
          {creationMode === "custom" && (
            <div className="p-3.5 bg-slate-50 dark:bg-[#181818] rounded-2xl border border-slate-200 dark:border-[#2a2a2a] space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">Initial Section</label>
                  <input
                    value={sectionName}
                    onChange={e => setSectionName(e.target.value)}
                    placeholder="e.g. Sales Team"
                    className="w-full text-xs bg-white dark:bg-[#101010] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">Desks Count</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={desksCount}
                    onChange={e => setDesksCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-xs bg-white dark:bg-[#101010] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-gray-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 block">Section Color</label>
                <div className="flex gap-1.5 flex-wrap">
                  {SECTION_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setSelectedColor(c.value)}
                      className={`w-6 h-6 rounded-md border transition-all ${selectedColor === c.value ? "border-slate-800 dark:border-white scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2a2a2a] text-slate-500 text-xs font-bold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!name.trim() || saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Layout"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const getLocalDateString = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dateVal = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dateVal}`;
};

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

  const currentEmployee = employees.find(e => e.id === currentEmployeeId);
  const effectiveCompanyId = companyId || currentEmployee?.companyId || (typeof window !== "undefined" ? localStorage.getItem("snailhr_companyId") || "" : "");
  const companyRooms = rooms.filter(r => (!effectiveCompanyId || r.companyId === effectiveCompanyId) && r.isActive);
  const companyBookings = roomBookings.filter(b => !effectiveCompanyId || b.companyId === effectiveCompanyId);
  const todayBookings = companyBookings.filter(b => b.date === selectedDate && b.status === "Approved");
  const pendingBookings = companyBookings.filter(b => b.status === "Pending");

  const isRoomBusy = (room: Room, date: string) => {
    const now = new Date();
    const todayStr = getLocalDateString(now);
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
    const todayStr = getLocalDateString(now);

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
    const resolvedCompanyId = effectiveCompanyId || companyId || "";
    const ok = await onBookRoom({
      companyId: resolvedCompanyId,
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
    const resolvedCompanyId = effectiveCompanyId || companyId || "";
    const roomData: Room = {
      id: roomModal?.room?.id || `room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      companyId: resolvedCompanyId,
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
