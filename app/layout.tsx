import React from "react";
import "@/src/index.css";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SnailHRA - Dynamic Workforce & HR Tech Platform",
  description: "Next-gen enterprise HR platform for attendance, payroll, leaves, expenses, and AI automation.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
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
