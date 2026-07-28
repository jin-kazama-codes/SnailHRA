"use client";

import React, { useState, useEffect } from "react";
import { Lock, Mail, Eye, EyeOff, RefreshCw, AlertCircle, Shield, Sun, Moon } from "lucide-react";

interface SuperAdminLoginViewProps {
  onLoginSuccess: (saUser: { id: string; email: string; fullName: string }) => void;
  onBackToEmployeeLogin: () => void;
}

export default function SuperAdminLoginView({ onLoginSuccess, onBackToEmployeeLogin }: SuperAdminLoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dark mode — reads and mirrors the same snailhr_theme key as the main app
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("snailhr_theme") === "dark" ||
        document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("snailhr_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("snailhr_theme", "light");
    }
  }, [darkMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/superadmin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed. Please check your credentials.");
      }

      if (data.success && data.superAdmin) {
        onLoginSuccess(data.superAdmin);
      } else {
        throw new Error("Authentication failed.");
      }
    } catch (err: any) {
      setError(err?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-slate-50 dark:bg-[#0a0a0a] text-slate-800 dark:text-gray-100 transition-colors">

      {/* Dark Mode Toggle — top right */}
      <div className="fixed top-4 right-4">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2.5 rounded-xl bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] text-slate-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-sm transition-all cursor-pointer"
          title="Toggle dark mode"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
        {/* Top accent — violet for super admin distinction */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 via-purple-500 to-violet-600" />

        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-600/20 mb-3.5">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="font-display font-extrabold text-xl tracking-tight text-slate-800 dark:text-white text-center">
            SnailHR <span className="text-violet-500">Control Panel</span>
          </h2>
          <p className="text-[10px] text-slate-400 dark:text-gray-500 font-bold tracking-widest uppercase mt-0.5">
            Super Administrator Authority
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-center space-x-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-3.5 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Super Admin Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superadmin@snailhr.com"
                className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 pl-11 pr-4 py-3 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-none focus:border-violet-500 font-medium transition-colors"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Security Key
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 pl-11 pr-11 py-3 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-none focus:border-violet-500 font-medium transition-colors font-mono"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-violet-400 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-md shadow-violet-600/10 dark:shadow-violet-500/20 flex items-center justify-center space-x-2 mt-6 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <span>Verify and Enter Dashboard</span>
            )}
          </button>
        </form>

        {/* Back link */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#1a1a1a] text-center">
          <button
            type="button"
            onClick={onBackToEmployeeLogin}
            className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline font-bold transition-all cursor-pointer"
          >
            Return to Employee &amp; Admin Sign In
          </button>
        </div>
      </div>

      <div className="mt-8 text-center text-[10px] text-slate-400 dark:text-gray-500">
        <p className="font-bold">SnailHR Platform Architecture Suite</p>
        <p className="mt-0.5">Global System Administrator Console • v2.4</p>
      </div>
    </div>
  );
}
