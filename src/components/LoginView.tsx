"use client";

import React, { useState } from "react";
import { Lock, Mail, Eye, EyeOff, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { Employee } from "../types";

interface LoginViewProps {
  onLoginSuccess: (employee: Employee) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed. Please check your credentials.");
      }

      if (data.success && data.employee) {
        onLoginSuccess(data.employee);
      } else {
        throw new Error("Authentication failed.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-slate-50 dark:bg-[#0a0a0a] text-slate-800 dark:text-gray-100 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"></div>

        {/* Branding & Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 rounded-2xl flex items-center justify-center text-white font-black text-base tracking-tight shadow-lg shadow-emerald-600/20 mb-3.5">
            MGM
          </div>
          <h2 className="font-display font-extrabold text-xl tracking-tight text-slate-800 dark:text-white text-center">
            MGM <span className="text-emerald-500">FINANCIERS</span>
          </h2>
          <p className="text-[10px] text-slate-400 dark:text-gray-500 font-bold tracking-widest uppercase mt-0.5">
            PRIV LIMITED • ENTERPRISE HRMS
          </p>
        </div>

        {/* Form Error Message */}
        {error && (
          <div className="mb-5 flex items-center space-x-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-3.5 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-xs font-semibold animate-shake">
            <AlertCircle className="w-4.5 h-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Corporate Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. amit.sharma@mgmfinanciers.com"
                className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 pl-11 pr-4 py-3 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium transition-colors"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Access Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-gray-200 pl-11 pr-11 py-3 text-xs rounded-xl border border-slate-100 dark:border-[#1a1a1a] focus:outline-hidden focus:border-emerald-500 font-medium transition-colors font-mono"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-emerald-400 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-600/10 dark:shadow-emerald-500/20 flex items-center justify-center space-x-2 mt-6"
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Authenticating Credentials...</span>
              </>
            ) : (
              <span>Secure Sign In</span>
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 text-center text-[10px] text-slate-400 dark:text-gray-500">
        <p className="font-bold">MGM FINANCIERS PRIV LIMITED Platform Suite</p>
        <p className="mt-0.5">Licensed NBFC Workforce Technology • v2.4</p>
      </div>
    </div>
  );
}
