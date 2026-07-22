import React from "react";
import "@/src/index.css";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SnailHR - NBFC Workforce & HR Tech Platform",
  description: "Next-gen enterprise HR platform for attendance, payroll, leaves, expenses, and AI automation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
