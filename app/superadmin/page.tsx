"use client";

import React, { useState, useEffect } from "react";
import SuperAdminLoginView from "@/src/components/SuperAdminLoginView";
import SuperAdminDashboard from "@/src/components/SuperAdminDashboard";
import { useRouter } from "next/navigation";

interface SAUser {
  id: string;
  email: string;
  fullName: string;
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [saUser, setSAUser] = useState<SAUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Load from local storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("snailhr_superadmin_user");
      if (stored) {
        try {
          setSAUser(JSON.parse(stored));
        } catch (e) {
          localStorage.removeItem("snailhr_superadmin_user");
        }
      }
      setLoading(false);
    }
  }, []);

  const handleLoginSuccess = (user: SAUser) => {
    setSAUser(user);
    if (typeof window !== "undefined") {
      localStorage.setItem("snailhr_superadmin_user", JSON.stringify(user));
    }
  };

  const handleLogout = () => {
    setSAUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("snailhr_superadmin_user");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  if (!saUser) {
    return (
      <SuperAdminLoginView
        onLoginSuccess={handleLoginSuccess}
        onBackToEmployeeLogin={() => router.push("/")}
      />
    );
  }

  return <SuperAdminDashboard onLogout={handleLogout} />;
}
