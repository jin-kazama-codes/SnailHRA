"use client";

import React, { useState, useEffect } from "react";
import {
  Briefcase, Landmark, Calendar, MapPin, Plus, Trash2, HelpCircle, Edit3, Save, X, Star,
  Monitor, Presentation, Wifi, Coffee, Zap, Tv, Cable, Cpu, Volume2, Shield,
  Snowflake, Phone, Lightbulb, Mic, Router, ToggleLeft, ToggleRight, Globe, Locate, CheckCircle2
} from "lucide-react";
import { Designation, ExpenseCategory, CorporateAllowanceFaq } from "../types";

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  "Monitor": <Monitor className="w-3.5 h-3.5 text-slate-400" />,
  "Presentation": <Presentation className="w-3.5 h-3.5 text-slate-400" />,
  "Wifi": <Wifi className="w-3.5 h-3.5 text-slate-400" />,
  "Coffee": <Coffee className="w-3.5 h-3.5 text-slate-400" />,
  "Zap": <Zap className="w-3.5 h-3.5 text-slate-400" />,
  "Tv": <Tv className="w-3.5 h-3.5 text-slate-400" />,
  "Cable": <Cable className="w-3.5 h-3.5 text-slate-400" />,
  "Cpu": <Cpu className="w-3.5 h-3.5 text-slate-400" />,
  "Volume": <Volume2 className="w-3.5 h-3.5 text-slate-400" />,
  "Shield": <Shield className="w-3.5 h-3.5 text-slate-400" />,
  "Star": <Star className="w-3.5 h-3.5 text-slate-400" />,
  "Snowflake": <Snowflake className="w-3.5 h-3.5 text-slate-400" />,
  "Phone": <Phone className="w-3.5 h-3.5 text-slate-400" />,
  "Lightbulb": <Lightbulb className="w-3.5 h-3.5 text-slate-400" />,
  "Mic": <Mic className="w-3.5 h-3.5 text-slate-400" />,
};

const ICON_OPTIONS = [
  { name: "Monitor", icon: <Monitor className="w-4 h-4" /> },
  { name: "Presentation", icon: <Presentation className="w-4 h-4" /> },
  { name: "Wifi", icon: <Wifi className="w-4 h-4" /> },
  { name: "Coffee", icon: <Coffee className="w-4 h-4" /> },
  { name: "Zap", icon: <Zap className="w-4 h-4" /> },
  { name: "Tv", icon: <Tv className="w-4 h-4" /> },
  { name: "Cable", icon: <Cable className="w-4 h-4" /> },
  { name: "Cpu", icon: <Cpu className="w-4 h-4" /> },
  { name: "Volume", icon: <Volume2 className="w-4 h-4" /> },
  { name: "Shield", icon: <Shield className="w-4 h-4" /> },
  { name: "Snowflake", icon: <Snowflake className="w-4 h-4" /> },
  { name: "Phone", icon: <Phone className="w-4 h-4" /> },
  { name: "Lightbulb", icon: <Lightbulb className="w-4 h-4" /> },
  { name: "Mic", icon: <Mic className="w-4 h-4" /> },
  { name: "Star", icon: <Star className="w-4 h-4" /> },
];

interface ConfigurationViewProps {
  designations: Designation[];
  customLeaveTypes: string[];
  customDepartments: string[];
  customBranches: string[];
  customAmenities: string[];
  expenseCategories: ExpenseCategory[];
  corporateAllowancesFaqs?: CorporateAllowanceFaq[];
  supabaseStatus: {
    connected: boolean;
    synced: boolean;
    error?: string;
  };
  subscriptionModel?: number;
  onAddDesignation: (title: string, department: string) => void;
  onRemoveDesignation: (id: string) => void;
  onUpdateCollection: (
    type: "leaveTypes" | "departments" | "branches" | "amenities",
    updatedList: string[],
    action?: "add" | "remove",
    item?: string
  ) => void;
  onAddExpenseCategory: (name: string, description: string) => void;
  onRemoveExpenseCategory: (id: string) => void;
  onAddCorporateAllowanceFaq?: (title: string, description: string, id?: string) => void;
  onRemoveCorporateAllowanceFaq?: (id: string) => void;
  wifiRestrictionSettings?: {
    enabled: boolean;
    allowedIp?: string;
    allowedIps?: string[];
    companyId?: string;
  };
  onSaveWifiSettings?: (settings: { enabled: boolean; allowedIp?: string; allowedIps: string[] }) => void;
}

export default function ConfigurationView({
  designations,
  customLeaveTypes,
  customDepartments,
  customBranches,
  customAmenities = [],
  expenseCategories,
  corporateAllowancesFaqs = [],
  supabaseStatus,
  subscriptionModel = 1,
  onAddDesignation,
  onRemoveDesignation,
  onUpdateCollection,
  onAddExpenseCategory,
  onRemoveExpenseCategory,
  onAddCorporateAllowanceFaq,
  onRemoveCorporateAllowanceFaq,
  wifiRestrictionSettings,
  onSaveWifiSettings
}: ConfigurationViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"general" | "designations" | "expenses" | "allowancesFaq">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("snailhr_configSubTab") as any) || "general";
    }
    return "general";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("snailhr_configSubTab", activeSubTab);
    }
  }, [activeSubTab]);

  // Local Form States
  const [newDesignationTitle, setNewDesignationTitle] = useState("");
  const [newDesignationDept, setNewDesignationDept] = useState("");

  const [newLeaveType, setNewLeaveType] = useState("");
  const [newLeaveDays, setNewLeaveDays] = useState("12");
  const [newDepartment, setNewDepartment] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [newAmenity, setNewAmenity] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("Star");

  // Expense Categories Form State
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  const handleSubmitExpenseCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddExpenseCategory(newCatName.trim(), newCatDesc.trim());
    setNewCatName("");
    setNewCatDesc("");
  };

  // Corporate Allowance FAQ Form State
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [newFaqTitle, setNewFaqTitle] = useState("");
  const [newFaqDescription, setNewFaqDescription] = useState("");

  const handleSubmitFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaqTitle.trim() || !onAddCorporateAllowanceFaq) return;
    onAddCorporateAllowanceFaq(newFaqTitle.trim(), newFaqDescription.trim(), editingFaqId || undefined);
    setNewFaqTitle("");
    setNewFaqDescription("");
    setEditingFaqId(null);
  };

  const handleEditFaq = (faq: CorporateAllowanceFaq) => {
    setEditingFaqId(faq.id);
    setNewFaqTitle(faq.title);
    setNewFaqDescription(faq.description);
  };

  const handleCancelFaqEdit = () => {
    setEditingFaqId(null);
    setNewFaqTitle("");
    setNewFaqDescription("");
  };

  // WiFi Restriction Settings Local State
  const [wifiEnabled, setWifiEnabled] = useState(wifiRestrictionSettings?.enabled ?? false);
  const [wifiIpList, setWifiIpList] = useState<string[]>(() => {
    if (wifiRestrictionSettings?.allowedIps && wifiRestrictionSettings.allowedIps.length > 0) {
      return wifiRestrictionSettings.allowedIps;
    }
    if (wifiRestrictionSettings?.allowedIp) {
      const parsed = wifiRestrictionSettings.allowedIp.split(",").map(s => s.trim()).filter(Boolean);
      return parsed.length > 0 ? parsed : [""];
    }
    return [""];
  });
  const [wifiSaving, setWifiSaving] = useState(false);

  // IP Fetching State
  const [fetchingIp, setFetchingIp] = useState(false);
  const [detectedIp, setDetectedIp] = useState<string | null>(null);
  const [ipNotice, setIpNotice] = useState<string | null>(null);

  const handleUseDetectedIp = (ipToAdd: string) => {
    setWifiIpList(prev => {
      // If list currently has 1 empty input, replace it
      if (prev.length === 1 && (!prev[0] || !prev[0].trim())) {
        return [ipToAdd];
      }
      // If already in list, notify and don't duplicate
      if (prev.some(item => item.trim() === ipToAdd)) {
        setIpNotice(`IP ${ipToAdd} is already in the list.`);
        return prev;
      }
      setIpNotice(`Added IP ${ipToAdd} to allowed list!`);
      return [...prev.filter(i => i.trim()), ipToAdd];
    });
  };

  const handleFetchMyIp = async () => {
    setFetchingIp(true);
    setIpNotice(null);
    try {
      let foundIp = "";
      // 1. Fetch from our API endpoint
      const res = await fetch("/api/get-my-ip");
      if (res.ok) {
        const data = await res.json();
        if (data.ip && data.ip !== "127.0.0.1") {
          foundIp = data.ip;
        }
      }

      // 2. Fallback to public IP service if local or loopback
      if (!foundIp || foundIp === "127.0.0.1") {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          const pubRes = await fetch("https://api.ipify.org?format=json", { signal: controller.signal });
          clearTimeout(timeoutId);
          if (pubRes.ok) {
            const pubData = await pubRes.json();
            if (pubData.ip) foundIp = pubData.ip;
          }
        } catch (e) {
          // Ignore public lookup failure
        }
      }

      if (foundIp) {
        setDetectedIp(foundIp);
        handleUseDetectedIp(foundIp);
      } else {
        setIpNotice("Could not detect IP automatically. Please enter your IP manually.");
      }
    } catch (err: any) {
      setIpNotice("Failed to fetch IP address.");
    } finally {
      setFetchingIp(false);
    }
  };

  useEffect(() => {
    if (wifiRestrictionSettings) {
      setWifiEnabled(wifiRestrictionSettings.enabled);
      if (wifiRestrictionSettings.allowedIps && wifiRestrictionSettings.allowedIps.length > 0) {
        setWifiIpList(wifiRestrictionSettings.allowedIps);
      } else if (wifiRestrictionSettings.allowedIp) {
        const parsed = wifiRestrictionSettings.allowedIp.split(",").map(s => s.trim()).filter(Boolean);
        setWifiIpList(parsed.length > 0 ? parsed : [""]);
      } else {
        setWifiIpList([""]);
      }
    }
  }, [wifiRestrictionSettings]);

  const handleAddIpField = () => {
    setWifiIpList(prev => [...prev, ""]);
  };

  const handleRemoveIpField = (index: number) => {
    setWifiIpList(prev => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
  };

  const handleIpChange = (index: number, val: string) => {
    setWifiIpList(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleSaveWifi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveWifiSettings) return;
    setWifiSaving(true);
    try {
      const cleanedIps = wifiIpList.map(ip => ip.trim()).filter(Boolean);
      await onSaveWifiSettings({
        enabled: wifiEnabled,
        allowedIps: cleanedIps,
        allowedIp: cleanedIps.join(", ")
      });
    } finally {
      setWifiSaving(false);
    }
  };

  const [localQuotas, setLocalQuotas] = useState<Record<string, string>>({});

  const parseLeaveType = (leaveStr: string) => {
    if (leaveStr.includes("|")) {
      const [name, quotaStr] = leaveStr.split("|");
      const quota = parseInt(quotaStr, 10);
      return { name: name.trim(), quota: isNaN(quota) ? 0 : quota };
    }
    return { name: leaveStr.trim(), quota: 12 };
  };

  const handleAddLeaveType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeaveType.trim()) return;
    const trimmed = newLeaveType.trim();
    const quota = newLeaveDays ? parseInt(newLeaveDays, 10) : 12;
    const itemStr = `${trimmed}|${isNaN(quota) ? 12 : quota}`;

    const map = new Map<string, string>();
    customLeaveTypes.forEach(l => {
      const name = (l.includes("|") ? l.split("|")[0] : l).trim().toLowerCase();
      map.set(name, l);
    });
    map.set(trimmed.toLowerCase(), itemStr);
    const newList = Array.from(map.values());

    onUpdateCollection("leaveTypes", newList, "add", itemStr);
    setNewLeaveType("");
    setNewLeaveDays("12");
  };

  const handleUpdateLeaveQuota = (targetItemStr: string, newQuotaVal: number) => {
    const targetName = targetItemStr.includes("|") ? targetItemStr.split("|")[0].trim() : targetItemStr.trim();
    const updatedItemStr = `${targetName}|${newQuotaVal}`;
    const map = new Map<string, string>();
    customLeaveTypes.forEach(l => {
      const name = (l.includes("|") ? l.split("|")[0] : l).trim().toLowerCase();
      map.set(name, l);
    });
    map.set(targetName.toLowerCase(), updatedItemStr);
    const newList = Array.from(map.values());
    onUpdateCollection("leaveTypes", newList);
  };

  const handleRemoveLeaveType = (leave: string) => {
    const targetName = (leave.includes("|") ? leave.split("|")[0] : leave).trim().toLowerCase();
    if (confirm(`Are you sure you want to delete "${leave.includes("|") ? leave.split("|")[0] : leave}"?`)) {
      const filtered = customLeaveTypes.filter(l => {
        const name = (l.includes("|") ? l.split("|")[0] : l).trim().toLowerCase();
        return name !== targetName;
      });
      onUpdateCollection("leaveTypes", filtered, "remove", leave);
    }
  };

  const handleAddDesignation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesignationTitle.trim() || !newDesignationDept.trim()) return;
    onAddDesignation(newDesignationTitle.trim(), newDesignationDept.trim());
    setNewDesignationTitle("");
    setNewDesignationDept("");
  };

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartment.trim()) return;
    const trimmed = newDepartment.trim();
    const newList = customDepartments.some(d => d.toLowerCase() === trimmed.toLowerCase())
      ? customDepartments
      : [...customDepartments, trimmed];
    onUpdateCollection("departments", newList, "add", trimmed);
    setNewDepartment("");
  };

  const handleRemoveDepartment = (dept: string) => {
    if (confirm(`Are you sure you want to delete the "${dept}" department?`)) {
      onUpdateCollection("departments", customDepartments.filter(d => d !== dept), "remove", dept);
    }
  };

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranch.trim()) return;
    const trimmed = newBranch.trim();
    const newList = customBranches.some(b => b.toLowerCase() === trimmed.toLowerCase())
      ? customBranches
      : [...customBranches, trimmed];
    onUpdateCollection("branches", newList, "add", trimmed);
    setNewBranch("");
  };

  const handleRemoveBranch = (branch: string) => {
    if (confirm(`Are you sure you want to remove the "${branch}" branch office?`)) {
      onUpdateCollection("branches", customBranches.filter(b => b !== branch), "remove", branch);
    }
  };

  const handleAddAmenity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmenity.trim()) return;
    const trimmed = newAmenity.trim();
    const itemString = `${trimmed}|${selectedIcon}`;
    // Check if duplicate name
    const isDuplicate = customAmenities.some(a => a.split("|")[0].toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      alert("An amenity with this name already exists.");
      return;
    }
    const newList = [...customAmenities, itemString];
    onUpdateCollection("amenities", newList, "add", itemString);
    setNewAmenity("");
    setSelectedIcon("Star");
  };

  const handleRemoveAmenity = (amenity: string) => {
    if (confirm(`Are you sure you want to remove the "${amenity.split("|")[0]}" room amenity?`)) {
      onUpdateCollection("amenities", customAmenities.filter(a => a !== amenity), "remove", amenity);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Sub Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#1a1a1a] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 dark:text-white">System Configuration</h2>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${subscriptionModel === 4 ? "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900/50" :
                subscriptionModel === 3 ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50" :
                  subscriptionModel === 2 ? "bg-green-50 text-green-600 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/50" :
                    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
              }`}>
              {subscriptionModel === 4 ? "Full Suite Plan" :
                subscriptionModel === 3 ? "Chatbot Only Plan" :
                  subscriptionModel === 2 ? "WhatsApp Only Plan" :
                    "Basic Plan"}
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-gray-400">Configure corporate offices, custom designations, departments, and leave policies</p>
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-[#0f0f0f] p-1 rounded-xl border border-slate-200/50 dark:border-[#1a1a1a] text-xs font-semibold overflow-x-auto scrollbar-none max-w-full">
          <button
            onClick={() => setActiveSubTab("general")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeSubTab === "general" ? "bg-white dark:bg-[#1a1a1a] shadow-xs text-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
          >
            General Variables
          </button>
          <button
            onClick={() => setActiveSubTab("designations")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeSubTab === "designations" ? "bg-white dark:bg-[#1a1a1a] shadow-xs text-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
          >
            Designations Matrix
          </button>
          <button
            onClick={() => setActiveSubTab("expenses")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeSubTab === "expenses" ? "bg-white dark:bg-[#1a1a1a] shadow-xs text-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
          >
            Expense Categories
          </button>
          <button
            onClick={() => setActiveSubTab("allowancesFaq")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeSubTab === "allowancesFaq" ? "bg-white dark:bg-[#1a1a1a] shadow-xs text-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
          >
            Corporate Allowances FAQ
          </button>
        </div>
      </div>

      {/* Sub Tab 1: General (Departments, Branches, Leave Types) */}
      {activeSubTab === "general" && (
        <div className="space-y-6">
          {/* WiFi Attendance Restriction — Prominent Top Card */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-50 dark:border-[#1a1a1a] mb-4">
              <div className="p-2 bg-violet-50 dark:bg-violet-950/30 rounded-xl">
                <Router className="w-4.5 h-4.5 text-violet-500" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm">WiFi Attendance Restriction</h3>
                <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">Restrict punch-in/out to employees connected to the designated office WiFi network only</p>
              </div>
              {/* Live status badge */}
              <div className="ml-auto shrink-0">
                {wifiEnabled ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                    Disabled
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveWifi} className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
              {/* Toggle */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enable WiFi Restriction</label>
                <button
                  type="button"
                  onClick={() => setWifiEnabled(prev => !prev)}
                  className={`flex items-center gap-3 w-full p-3 rounded-xl border transition-all cursor-pointer ${
                    wifiEnabled
                      ? "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800/50"
                      : "bg-slate-50 dark:bg-[#0a0a0a] border-slate-100 dark:border-[#2a2a2a]"
                  }`}
                >
                  {wifiEnabled ? (
                    <ToggleRight className="w-8 h-8 text-violet-500 shrink-0" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-400 shrink-0" />
                  )}
                  <div className="text-left">
                    <p className={`text-xs font-bold ${wifiEnabled ? "text-violet-600 dark:text-violet-400" : "text-slate-500 dark:text-gray-400"}`}>
                      {wifiEnabled ? "Restriction Enabled" : "Restriction Disabled"}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">
                      {wifiEnabled ? "Employees must be on office WiFi to punch" : "All IPs allowed for attendance punch"}
                    </p>
                  </div>
                </button>
              </div>

              {/* Multi IP Address List Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Allowed Office WiFi IP Addresses ({wifiIpList.filter(ip => ip.trim()).length})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFetchMyIp}
                      disabled={fetchingIp}
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-2 py-1 rounded-lg border border-emerald-200/70 dark:border-emerald-800/60 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-60"
                      title="Automatically detect your current IP address and add it to the allowed list"
                    >
                      {fetchingIp ? (
                        <span className="w-3.5 h-3.5 border-2 border-emerald-600/40 border-t-emerald-600 rounded-full animate-spin" />
                      ) : (
                        <Globe className="w-3.5 h-3.5" />
                      )}
                      <span>{fetchingIp ? "Fetching..." : "Fetch My IP"}</span>
                    </button>
                    {wifiEnabled && (
                      <button
                        type="button"
                        onClick={handleAddIpField}
                        className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add IP</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                  {wifiIpList.map((ip, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="e.g. 192.168.1.11"
                          value={ip}
                          onChange={(e) => handleIpChange(idx, e.target.value)}
                          disabled={!wifiEnabled}
                          className={`w-full bg-slate-50 dark:bg-[#0a0a0a] border rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono transition-all focus:outline-hidden ${
                            wifiEnabled
                              ? "border-slate-200 dark:border-[#2a2a2a] text-slate-800 dark:text-white focus:border-violet-400 dark:focus:border-violet-600"
                              : "border-slate-100 dark:border-[#1a1a1a] text-slate-400 cursor-not-allowed opacity-60"
                          }`}
                        />
                      </div>
                      {wifiIpList.length > 1 && wifiEnabled && (
                        <button
                          type="button"
                          onClick={() => handleRemoveIpField(idx)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Remove IP"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Detected IP Banner & Notifications */}
                {detectedIp && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 text-xs">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Your Current IP: <strong className="font-mono text-emerald-800 dark:text-emerald-200">{detectedIp}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUseDetectedIp(detectedIp)}
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer bg-white dark:bg-[#1a1a1a] px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 shadow-xs"
                    >
                      + Put in List
                    </button>
                  </div>
                )}

                {ipNotice && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{ipNotice}</span>
                  </p>
                )}

                <p className="text-[10px] text-slate-400 dark:text-gray-500 font-mono">
                  Add multiple IPs (e.g. main office, branch router, VPN gateway)
                </p>
              </div>

              {/* Save Button & Active Badges */}
              <div className="flex flex-col gap-2.5">
                <button
                  type="submit"
                  disabled={wifiSaving || !onSaveWifiSettings}
                  className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  {wifiSaving ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{wifiSaving ? "Saving..." : "Save WiFi Settings"}</span>
                </button>

                {wifiEnabled && wifiIpList.filter(ip => ip.trim()).length > 0 && (
                  <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider">
                        Active Allowed Networks ({wifiIpList.filter(ip => ip.trim()).length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {wifiIpList.filter(ip => ip.trim()).map((ip, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-white dark:bg-[#1a1a1a] border border-violet-200 dark:border-violet-800 text-[10px] font-mono text-violet-600 dark:text-violet-400 font-bold">
                          {ip.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Departments block */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-50 dark:border-[#1a1a1a] mb-3">
                <Landmark className="w-4.5 h-4.5 text-emerald-500" />
                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm">Company Departments</h3>
              </div>

              <form onSubmit={handleAddDepartment} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="e.g. Legal, Marketing"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl cursor-pointer transition-all"
                  title="Add Department"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              <div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                {customDepartments.map((dept) => (
                  <div key={dept} className="flex items-center justify-between text-xs p-2.5 bg-slate-50/50 dark:bg-[#1a1a1a]/30 border border-slate-100/30 dark:border-transparent rounded-xl">
                    <span className="font-semibold text-slate-700 dark:text-gray-300">{dept}</span>
                    <button
                      onClick={() => handleRemoveDepartment(dept)}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-gray-500 font-mono italic">Currently {customDepartments.length} Departments active</p>
          </div>

          {/* Office Branches block */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-50 dark:border-[#1a1a1a] mb-3">
                <MapPin className="w-4.5 h-4.5 text-blue-500" />
                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm">Corporate Branches</h3>
              </div>

              <form onSubmit={handleAddBranch} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="e.g. Bangalore Hub"
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl cursor-pointer transition-all"
                  title="Add Office Branch"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              <div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                {customBranches.map((branch) => (
                  <div key={branch} className="flex items-center justify-between text-xs p-2.5 bg-slate-50/50 dark:bg-[#1a1a1a]/30 border border-slate-100/30 dark:border-transparent rounded-xl">
                    <span className="font-semibold text-slate-700 dark:text-gray-300">{branch}</span>
                    <button
                      onClick={() => handleRemoveBranch(branch)}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-gray-500 font-mono italic">Currently {customBranches.length} Branches active</p>
          </div>

          {/* Leave Types block */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-50 dark:border-[#1a1a1a] mb-3">
                <Calendar className="w-4.5 h-4.5 text-indigo-500" />
                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm">Leave Policies</h3>
              </div>

              <form onSubmit={handleAddLeaveType} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Policy Name (e.g. Sabbatical)"
                  value={newLeaveType}
                  onChange={(e) => setNewLeaveType(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-hidden"
                  required
                />
                <input
                  type="number"
                  min="0"
                  max="365"
                  placeholder="Days"
                  value={newLeaveDays}
                  onChange={(e) => setNewLeaveDays(e.target.value)}
                  className="w-16 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#2a2a2a] rounded-xl px-2 py-2 text-xs text-slate-800 dark:text-white focus:outline-hidden font-mono text-center"
                  title="Annual Days Quota"
                  required
                />
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl cursor-pointer transition-all shrink-0"
                  title="Add Leave Policy Type"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              <div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                {customLeaveTypes.map((leave) => {
                  const parsed = parseLeaveType(leave);
                  return (
                    <div key={leave} className="flex items-center justify-between text-xs p-2 bg-slate-50/50 dark:bg-[#1a1a1a]/30 border border-slate-100/30 dark:border-transparent rounded-xl gap-2">
                      <span className="font-semibold text-slate-700 dark:text-gray-300 truncate flex-1">{parsed.name}</span>
                      <div className="flex items-center space-x-1 shrink-0">
                        <input
                          type="number"
                          min="0"
                          max="365"
                          value={localQuotas[leave] !== undefined ? localQuotas[leave] : parsed.quota}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalQuotas(prev => ({ ...prev, [leave]: val }));
                          }}
                          onBlur={() => {
                            const raw = localQuotas[leave];
                            if (raw !== undefined) {
                              const val = parseInt(raw, 10);
                              handleUpdateLeaveQuota(leave, isNaN(val) ? 0 : val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const raw = localQuotas[leave];
                              if (raw !== undefined) {
                                const val = parseInt(raw, 10);
                                handleUpdateLeaveQuota(leave, isNaN(val) ? 0 : val);
                              }
                            }
                          }}
                          className="w-12 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#2a2a2a] rounded-lg px-1.5 py-0.5 text-[11px] font-mono text-center text-indigo-600 dark:text-indigo-400 font-bold focus:outline-hidden"
                          title="Click to edit annual quota days (Press Enter or click away to save)"
                        />
                        <span className="text-[10px] text-slate-400 font-mono">Days</span>
                        <button
                          onClick={() => handleRemoveLeaveType(leave)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer ml-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-gray-500 font-mono italic">Currently {customLeaveTypes.length} Leave types configured</p>
          </div>

          {/* Room Amenities block */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-50 dark:border-[#1a1a1a] mb-3">
                <Star className="w-4.5 h-4.5 text-amber-500" />
                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm">Room Amenities</h3>
              </div>

              <form onSubmit={handleAddAmenity} className="space-y-3 mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Smart TV, HDMI Cable"
                    value={newAmenity}
                    onChange={(e) => setNewAmenity(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#2a2a2a] rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="bg-amber-600 hover:bg-amber-500 text-white p-2.5 rounded-xl cursor-pointer transition-all"
                    title="Add Room Amenity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Icon</label>
                  <div className="flex flex-wrap gap-1.5 bg-slate-50/50 dark:bg-[#1a1a1a]/20 p-2 rounded-xl border border-slate-100/50 dark:border-[#2a2a2a]">
                    {ICON_OPTIONS.map(opt => (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => setSelectedIcon(opt.name)}
                        className={`p-2 rounded-lg cursor-pointer transition-all border ${selectedIcon === opt.name
                            ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                            : "bg-white dark:bg-[#0f0f0f] text-slate-500 border-slate-100 dark:border-[#1a1a1a] hover:border-amber-300"
                          }`}
                        title={opt.name}
                      >
                        {opt.icon}
                      </button>
                    ))}
                  </div>
                </div>
              </form>

              <div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                {customAmenities.map((amenity) => {
                  const [name, iconName] = amenity.split("|");
                  return (
                    <div key={amenity} className="flex items-center justify-between text-xs p-2.5 bg-slate-50/50 dark:bg-[#1a1a1a]/30 border border-slate-100/30 dark:border-transparent rounded-xl">
                      <div className="flex items-center space-x-2">
                        {AMENITY_ICONS[iconName || "Star"] || <Star className="w-3.5 h-3.5 text-slate-400" />}
                        <span className="font-semibold text-slate-700 dark:text-gray-300">{name}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveAmenity(amenity)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-gray-500 font-mono italic">Currently {customAmenities.length} Room amenities active</p>
          </div>
        </div>
      </div>
      )}

      {/* Sub Tab 2: Designations */}
      {activeSubTab === "designations" && (
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-50 dark:border-[#1a1a1a] pb-3">
            <div>
              <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm">Designations Directory</h3>
              <p className="text-xs text-slate-400 dark:text-gray-400">Map precise job titles and their reporting departments</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add Designation form */}
            <div className="lg:col-span-1 p-4 bg-slate-50 dark:bg-[#0a0a0a]/50 border border-slate-100/50 dark:border-[#1a1a1a] rounded-xl space-y-4 h-fit">
              <h4 className="font-display font-semibold text-slate-700 dark:text-gray-300 text-xs">Register New Designation</h4>

              <form onSubmit={handleAddDesignation} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Job Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Underwriter"
                    value={newDesignationTitle}
                    onChange={(e) => setNewDesignationTitle(e.target.value)}
                    className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department Mapping</label>
                  <select
                    value={newDesignationDept}
                    onChange={(e) => setNewDesignationDept(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-hidden"
                  >
                    <option value="">-- Select Department --</option>
                    {customDepartments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Designation</span>
                </button>
              </form>
            </div>

            {/* Designations list table */}
            <div className="lg:col-span-2 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#1a1a1a] text-slate-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                    <th className="py-2 px-3">Designation ID</th>
                    <th className="py-2 px-3">Job Title</th>
                    <th className="py-2 px-3">Department</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-[#1a1a1a]/50">
                  {designations.map(des => (
                    <tr key={des.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a]/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400 dark:text-gray-500">{des.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-gray-300">{des.title}</td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-gray-400 font-medium">{des.department}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove the designation "${des.title}"?`)) {
                              onRemoveDesignation(des.id);
                            }
                          }}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab 3: Expense Categories */}
      {activeSubTab === "expenses" && (
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-50 dark:border-[#1a1a1a] pb-3">
            <div>
              <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm">Corporate Expense Categories</h3>
              <p className="text-xs text-slate-400 dark:text-gray-400">Configure business filing categories visible to employee portals</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add Category form */}
            <div className="lg:col-span-1 p-4 bg-slate-50 dark:bg-[#0a0a0a]/50 border border-slate-100/50 dark:border-[#1a1a1a] rounded-xl space-y-4 h-fit">
              <h4 className="font-display font-semibold text-slate-700 dark:text-gray-300 text-xs">Register Expense Category</h4>

              <form onSubmit={handleSubmitExpenseCat} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Category Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Travel & Accommodation"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Brief Description</label>
                  <textarea
                    placeholder="e.g. Client meetings travel, hotel bookings"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    rows={2}
                    className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Category</span>
                </button>
              </form>
            </div>

            {/* Categories list table */}
            <div className="lg:col-span-2 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#1a1a1a] text-slate-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                    <th className="py-2 px-3">Category Name</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-[#1a1a1a]/50">
                  {expenseCategories.map(cat => (
                    <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a]/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-gray-300">{cat.name}</td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-gray-400 font-medium">{cat.description || "-"}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove category "${cat.name}"?`)) {
                              onRemoveExpenseCategory(cat.id);
                            }
                          }}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {expenseCategories.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-slate-400">No expense categories registered.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab 4: Corporate Allowances FAQ */}
      {activeSubTab === "allowancesFaq" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl p-5 shadow-xs dark:neon-glow space-y-6">
            <div className="flex items-center justify-between border-b border-slate-50 dark:border-[#1a1a1a] pb-3">
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-emerald-500" />
                <div>
                  <h3 className="font-display font-semibold text-slate-800 dark:text-white text-base">Corporate Allowances FAQ Management</h3>
                  <p className="text-xs text-slate-400">Configure guidelines and claim limits displayed to employees in Expense & Claims view</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Block */}
              <div className="bg-slate-50/50 dark:bg-[#1a1a1a]/30 p-4 border border-slate-100 dark:border-[#1a1a1a] rounded-xl space-y-4 h-fit">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-semibold text-slate-700 dark:text-gray-200 text-xs uppercase tracking-wider">
                    {editingFaqId ? "Edit Allowance FAQ" : "Add Allowance FAQ"}
                  </h4>
                  {editingFaqId && (
                    <button
                      onClick={handleCancelFaqEdit}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmitFaq} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Title / Allowance Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Outstation Travel Allowance"
                      value={newFaqTitle}
                      onChange={(e) => setNewFaqTitle(e.target.value)}
                      required
                      className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Detailed FAQ Description *</label>
                    <textarea
                      placeholder="e.g. Relationship managers qualify for flat outstation lodging and travel allowances up to ₹3,000 per day."
                      value={newFaqDescription}
                      onChange={(e) => setNewFaqDescription(e.target.value)}
                      required
                      rows={4}
                      className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    {editingFaqId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{editingFaqId ? "Update Allowance FAQ" : "Add Allowance FAQ"}</span>
                  </button>
                </form>
              </div>

              {/* FAQs List Table / Cards */}
              <div className="lg:col-span-2 space-y-3">
                {corporateAllowancesFaqs.map((faq) => (
                  <div key={faq.id} className="p-4 bg-white dark:bg-[#1a1a1a]/40 border border-slate-100 dark:border-[#1a1a1a] rounded-xl flex items-start justify-between gap-4 hover:border-emerald-500/30 transition-all">
                    <div className="space-y-1 flex-1">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-gray-200">{faq.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">{faq.description}</p>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleEditFaq(faq)}
                        className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors cursor-pointer"
                        title="Edit FAQ"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${faq.title}"?`)) {
                            onRemoveCorporateAllowanceFaq?.(faq.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                        title="Delete FAQ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {corporateAllowancesFaqs.length === 0 && (
                  <div className="text-center py-10 bg-slate-50/50 dark:bg-[#1a1a1a]/20 rounded-xl border border-dashed border-slate-200 dark:border-[#1a1a1a]">
                    <HelpCircle className="w-8 h-8 text-slate-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">No Corporate Allowance FAQs configured for this company yet.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Use the form on the left to add allowance policies & claim guidelines.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
