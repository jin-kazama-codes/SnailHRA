import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { supabase } from "@/src/lib/supabase";

export async function POST() {
  const dbClient = supabaseAdmin || supabase;
  if (!dbClient) {
    return NextResponse.json({ error: "No Supabase client" }, { status: 500 });
  }

  const results: { column: string; status: string; error?: string }[] = [];

  // Columns to add to employees
  const employeeColumns = [
    { name: "salary_pf_mode", sql: "ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS salary_pf_mode TEXT DEFAULT 'percentage'" },
    { name: "salary_tds_opt_in", sql: "ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS salary_tds_opt_in BOOLEAN DEFAULT true" },
    { name: "salary_tds_mode", sql: "ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS salary_tds_mode TEXT DEFAULT 'slab'" },
    { name: "salary_esi_opt_in", sql: "ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS salary_esi_opt_in BOOLEAN DEFAULT true" },
    { name: "salary_esi_deduction", sql: "ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS salary_esi_deduction NUMERIC DEFAULT 0" },
    { name: "salary (JSONB)", sql: "ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS salary JSONB" },
  ];

  // Columns to add to payslips
  const payslipColumns = [
    { name: "esi_deduction (payslips)", sql: "ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS esi_deduction NUMERIC DEFAULT 0" },
  ];

  const allColumns = [...employeeColumns, ...payslipColumns];

  for (const col of allColumns) {
    try {
      const { error } = await (dbClient as any).rpc("exec_raw_sql", { query: col.sql });
      if (error) {
        // Try alternative approach using from().select() to test existence
        results.push({ column: col.name, status: "rpc_failed", error: error.message });
      } else {
        results.push({ column: col.name, status: "added" });
      }
    } catch (err: any) {
      results.push({ column: col.name, status: "error", error: err?.message });
    }
  }

  return NextResponse.json({ results, message: "Migration attempted" });
}
