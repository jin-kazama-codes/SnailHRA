"use client";

import React, { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0a0a] text-slate-800 dark:text-white p-6">
      <div className="max-w-md w-full bg-white dark:bg-[#111] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-lg">
        <h2 className="text-lg font-bold text-rose-500">Something went wrong!</h2>
        <p className="text-xs text-slate-500 dark:text-gray-400 font-mono break-all">{error.message || "An unexpected error occurred."}</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
