import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase, MGM_COMPANY_ID } from "@/src/lib/supabase";
import { PayrollConfig } from "@/src/types";

export const DEFAULT_PAYROLL_CONFIG: Omit<PayrollConfig, "companyId"> = {
  hraType: "percentage",
  hraValue: 40,
  pfType: "percentage",
  pfValue: 12,
  pfExemptEmployeeIds: [],
  allowancesType: "percentage",
  allowancesValue: 20,
  taxType: "percentage",
  taxValue: 5,
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || MGM_COMPANY_ID;

    const db = loadDatabase();
    if (!db.payrollConfigs) {
      db.payrollConfigs = {};
    }

    let config: PayrollConfig = db.payrollConfigs[companyId] || {
      companyId,
      ...DEFAULT_PAYROLL_CONFIG,
    };

    // Try fetching from Supabase if configured
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("payroll_configurations")
          .select("*")
          .eq("company_id", companyId)
          .single();

        if (data && !error) {
          const rawExempt = data.pf_exempt_employee_ids;
          const pfExemptEmployeeIds = Array.isArray(rawExempt)
            ? rawExempt
            : typeof rawExempt === "string"
            ? JSON.parse(rawExempt)
            : [];

          config = {
            companyId: data.company_id,
            hraType: data.hra_type || "percentage",
            hraValue: Number(data.hra_value) ?? 40,
            pfType: data.pf_type || "percentage",
            pfValue: Number(data.pf_value) ?? 12,
            pfExemptEmployeeIds: pfExemptEmployeeIds.length > 0 ? pfExemptEmployeeIds : (config.pfExemptEmployeeIds || []),
            allowancesType: data.allowances_type || "percentage",
            allowancesValue: Number(data.allowances_value) ?? 20,
            taxType: data.tax_type || "percentage",
            taxValue: Number(data.tax_value) ?? 5,
            updatedAt: data.updated_at,
          };
          db.payrollConfigs[companyId] = config;
          saveDatabase(db);
        }
      } catch (sbErr) {
        console.warn("Supabase fetch payroll_configurations warning:", sbErr);
      }
    }


    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("GET /api/payroll/config error:", error);
    return NextResponse.json({ error: "Failed to fetch payroll configuration" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const companyId = body.companyId || MGM_COMPANY_ID;

    const config: PayrollConfig = {
      companyId,
      hraType: body.hraType || "percentage",
      hraValue: Number(body.hraValue) ?? 40,
      pfType: body.pfType || "percentage",
      pfValue: Number(body.pfValue) ?? 12,
      pfExemptEmployeeIds: Array.isArray(body.pfExemptEmployeeIds) ? body.pfExemptEmployeeIds : [],
      allowancesType: body.allowancesType || "percentage",
      allowancesValue: Number(body.allowancesValue) ?? 20,
      taxType: body.taxType || "percentage",
      taxValue: Number(body.taxValue) ?? 5,
      updatedAt: new Date().toISOString(),
    };

    // Save to local JSON database
    const db = loadDatabase();
    if (!db.payrollConfigs) db.payrollConfigs = {};
    db.payrollConfigs[companyId] = config;
    saveDatabase(db);

    // Save to Supabase if available
    if (supabase) {
      try {
        const payload = {
          company_id: config.companyId,
          hra_type: config.hraType,
          hra_value: config.hraValue,
          pf_type: config.pfType,
          pf_value: config.pfValue,
          pf_exempt_employee_ids: config.pfExemptEmployeeIds,
          allowances_type: config.allowancesType,
          allowances_value: config.allowancesValue,
          tax_type: config.taxType,
          tax_value: config.taxValue,
          updated_at: config.updatedAt,
        };

        const { error } = await supabase
          .from("payroll_configurations")
          .upsert(payload, { onConflict: "company_id" });

        if (error) {
          console.warn("Supabase upsert payroll_configurations warning:", error.message);
        }
      } catch (sbErr) {
        console.warn("Failed to sync payroll config to Supabase:", sbErr);
      }
    }

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("POST /api/payroll/config error:", error);
    return NextResponse.json({ error: "Failed to save payroll configuration" }, { status: 500 });
  }
}
