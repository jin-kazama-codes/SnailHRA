"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
        <div className="max-w-md w-full bg-slate-800 p-6 rounded-2xl border border-slate-700 text-center space-y-4">
          <h2 className="text-xl font-bold text-rose-400">Something went wrong!</h2>
          <p className="text-xs text-slate-300 font-mono break-all">{error.message || "An unexpected error occurred."}</p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
