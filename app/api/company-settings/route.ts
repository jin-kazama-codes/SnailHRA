import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId") || "";
  const db = loadDatabase();
  const dbClient = supabaseAdmin || supabase;

  let companyData: any = (db as any).companySettings?.[companyId] || {};

  if (dbClient && companyId) {
    try {
      // 1. Try reading from companies table
      const { data: compRow } = await dbClient
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .maybeSingle();

      if (compRow) {
        companyData = {
          ...companyData,
          companyId: compRow.id,
          name: compRow.name || "",
          logoUrl: compRow.logo_url || "",
          pan: compRow.pan || companyData.pan || "",
          tan: compRow.tan || companyData.tan || "",
          gstin: compRow.gstin || companyData.gstin || "",
          address: compRow.address || companyData.address || "",
          signatoryName: compRow.signatory_name || companyData.signatoryName || "",
          signatoryDesignation: compRow.signatory_designation || companyData.signatoryDesignation || "",
        };
      }

      // 2. Try reading from company_settings table if exists
      const { data: settingsRow } = await dbClient
        .from("company_settings")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      if (settingsRow) {
        companyData = {
          ...companyData,
          pan: settingsRow.pan || companyData.pan || "",
          tan: settingsRow.tan || companyData.tan || "",
          gstin: settingsRow.gstin || companyData.gstin || "",
          address: settingsRow.address || companyData.address || "",
          signatoryName: settingsRow.signatory_name || companyData.signatoryName || "",
          signatoryDesignation: settingsRow.signatory_designation || companyData.signatoryDesignation || "",
        };
      }
    } catch (err) {
      console.warn("Error fetching company settings from Supabase:", err);
    }
  }

  return NextResponse.json({ success: true, companySettings: companyData });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { companyId, pan, tan, gstin, address, signatoryName, signatoryDesignation, name, logoUrl } = body;

    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    const db = loadDatabase();
    if (!(db as any).companySettings) {
      (db as any).companySettings = {};
    }

    const updatedSetting = {
      companyId,
      name: name !== undefined ? name : ((db as any).companySettings[companyId]?.name || ""),
      logoUrl: logoUrl !== undefined ? logoUrl : ((db as any).companySettings[companyId]?.logoUrl || ""),
      pan: (pan || "").trim().toUpperCase(),
      tan: (tan || "").trim().toUpperCase(),
      gstin: (gstin || "").trim().toUpperCase(),
      address: (address || "").trim(),
      signatoryName: (signatoryName || "").trim(),
      signatoryDesignation: (signatoryDesignation || "").trim(),
      updatedAt: new Date().toISOString()
    };

    (db as any).companySettings[companyId] = updatedSetting;
    saveDatabase(db);

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        // Try updating companies table
        const updatePayload: any = {
          pan: updatedSetting.pan,
          tan: updatedSetting.tan,
          gstin: updatedSetting.gstin,
          address: updatedSetting.address,
          signatory_name: updatedSetting.signatoryName,
          signatory_designation: updatedSetting.signatoryDesignation,
        };
        if (name) updatePayload.name = name;
        if (logoUrl) updatePayload.logo_url = logoUrl;

        await dbClient.from("companies").update(updatePayload).eq("id", companyId);

        // Try upserting to company_settings table
        await dbClient.from("company_settings").upsert({
          company_id: companyId,
          company_name: name || undefined,
          pan: updatedSetting.pan,
          tan: updatedSetting.tan,
          gstin: updatedSetting.gstin,
          address: updatedSetting.address,
          signatory_name: updatedSetting.signatoryName,
          signatory_designation: updatedSetting.signatoryDesignation,
          logo_url: logoUrl || undefined,
          updated_at: new Date().toISOString()
        }, { onConflict: "company_id" });
      } catch (sbErr) {
        console.warn("Supabase company_settings sync warning:", sbErr);
      }
    }

    return NextResponse.json({ success: true, companySettings: updatedSetting });
  } catch (error: any) {
    console.error("Error updating company settings:", error);
    return NextResponse.json({ error: error.message || "Failed to update company settings" }, { status: 500 });
  }
}
