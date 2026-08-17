import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase, MGM_COMPANY_ID } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { PayrollConfig } from "@/src/types";

export const DEFAULT_PAYROLL_CONFIG: Omit<PayrollConfig, "companyId"> = {
  hraType: "percentage",
  hraValue: 40,
  pfType: "percentage",
  pfValue: 12,
  pfModeDefault: "percentage",
  pfExemptEmployeeIds: [],
  allowancesType: "percentage",
  allowancesValue: 20,
  taxType: "percentage",
  taxValue: 5,
  tdsOptInDefault: true,
  tdsModeDefault: "slab",
  esiEnabled: true,
  esiRatePercentage: 0.75,
  esiGrossCeiling: 21000,
  esiExemptEmployeeIds: [],
  ltaValue: 0,
  ltaType: "percentage",
  telephoneValue: 0,
  telephoneType: "percentage",
  fuelValue: 0,
  fuelType: "percentage",
  professionalDevValue: 0,
  professionalDevType: "percentage",
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

    // Try fetching from Supabase if configured (bypassing RLS with admin client)
    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        const { data, error } = await dbClient
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

          const rawEsiExempt = data.esi_exempt_employee_ids;
          const esiExemptEmployeeIds = Array.isArray(rawEsiExempt)
            ? rawEsiExempt
            : typeof rawEsiExempt === "string"
            ? JSON.parse(rawEsiExempt)
            : [];

          config = {
            companyId: data.company_id,
            hraType: data.hra_type || "percentage",
            hraValue: Number(data.hra_value) ?? 40,
            pfType: data.pf_type || "percentage",
            pfValue: Number(data.pf_value) ?? 12,
            pfModeDefault: data.pf_mode_default || "percentage",
            pfExemptEmployeeIds: pfExemptEmployeeIds.length > 0 ? pfExemptEmployeeIds : (config.pfExemptEmployeeIds || []),
            allowancesType: data.allowances_type || "percentage",
            allowancesValue: Number(data.allowances_value) ?? 20,
            taxType: data.tax_type || "percentage",
            taxValue: Number(data.tax_value) ?? 5,
            tdsOptInDefault: data.tds_opt_in_default !== false,
            tdsModeDefault: data.tds_mode_default || "slab",
            esiEnabled: data.esi_enabled !== false,
            esiRatePercentage: Number(data.esi_rate_percentage) ?? 0.75,
            esiGrossCeiling: Number(data.esi_gross_ceiling) ?? 21000,
            esiExemptEmployeeIds: esiExemptEmployeeIds.length > 0 ? esiExemptEmployeeIds : (config.esiExemptEmployeeIds || []),
            ltaValue: Number(data.lta_value) ?? 0,
            ltaType: data.lta_type || "percentage",
            telephoneValue: Number(data.telephone_value) ?? 0,
            telephoneType: data.telephone_type || "percentage",
            fuelValue: Number(data.fuel_value) ?? 0,
            fuelType: data.fuel_type || "percentage",
            professionalDevValue: Number(data.professional_dev_value) ?? 0,
            professionalDevType: data.professional_dev_type || "percentage",
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
      pfModeDefault: body.pfModeDefault || "percentage",
      pfExemptEmployeeIds: Array.isArray(body.pfExemptEmployeeIds) ? body.pfExemptEmployeeIds : [],
      allowancesType: body.allowancesType || "percentage",
      allowancesValue: Number(body.allowancesValue) ?? 20,
      taxType: body.taxType || "percentage",
      taxValue: Number(body.taxValue) ?? 5,
      tdsOptInDefault: body.tdsOptInDefault !== false,
      tdsModeDefault: body.tdsModeDefault || "slab",
      esiEnabled: body.esiEnabled !== false,
      esiRatePercentage: Number(body.esiRatePercentage) ?? 0.75,
      esiGrossCeiling: Number(body.esiGrossCeiling) ?? 21000,
      esiExemptEmployeeIds: Array.isArray(body.esiExemptEmployeeIds) ? body.esiExemptEmployeeIds : [],
      ltaValue: Number(body.ltaValue) ?? 0,
      ltaType: body.ltaType || "percentage",
      telephoneValue: Number(body.telephoneValue) ?? 0,
      telephoneType: body.telephoneType || "percentage",
      fuelValue: Number(body.fuelValue) ?? 0,
      fuelType: body.fuelType || "percentage",
      professionalDevValue: Number(body.professionalDevValue) ?? 0,
      professionalDevType: body.professionalDevType || "percentage",
      updatedAt: new Date().toISOString(),
    };

    // Save to local JSON database
    const db = loadDatabase();
    if (!db.payrollConfigs) db.payrollConfigs = {};
    db.payrollConfigs[companyId] = config;
    saveDatabase(db);

    // Save to Supabase using Admin Client (bypassing RLS)
    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        const payload = {
          company_id: config.companyId,
          hra_type: config.hraType,
          hra_value: config.hraValue,
          pf_type: config.pfType,
          pf_value: config.pfValue,
          pf_mode_default: config.pfModeDefault,
          pf_exempt_employee_ids: config.pfExemptEmployeeIds,
          esi_enabled: config.esiEnabled !== false,
          esi_rate_percentage: config.esiRatePercentage,
          esi_gross_ceiling: config.esiGrossCeiling,
          esi_exempt_employee_ids: config.esiExemptEmployeeIds,
          allowances_type: config.allowancesType,
          allowances_value: config.allowancesValue,
          telephone_type: config.telephoneType || "percentage",
          telephone_value: config.telephoneValue ?? 0,
          fuel_type: config.fuelType || "percentage",
          fuel_value: config.fuelValue ?? 0,
          professional_dev_type: config.professionalDevType || "percentage",
          professional_dev_value: config.professionalDevValue ?? 0,
          lta_type: config.ltaType || "percentage",
          lta_value: config.ltaValue ?? 0,
          tax_type: config.taxType,
          tax_value: config.taxValue,
          tds_opt_in_default: config.tdsOptInDefault !== false,
          tds_mode_default: config.tdsModeDefault || "slab",
          updated_at: config.updatedAt,
        };

        const { error } = await dbClient
          .from("payroll_configurations")
          .upsert(payload, { onConflict: "company_id" });

        if (error) {
          console.error("Supabase upsert payroll_configurations error:", error.message, error.details);
        } else {
          console.log("Successfully upserted payroll config to Supabase 'payroll_configurations' table for company:", config.companyId);
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
