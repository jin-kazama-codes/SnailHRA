import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { toBranchId, toBranchName } from "@/src/lib/branchUtils";

function parseIps(ipInput: string | string[] | undefined | null): string[] {
  if (!ipInput) return [];
  const raw: string[] = Array.isArray(ipInput)
    ? ipInput.map(i => String(i).trim())
    : String(ipInput).split(",").map(i => i.trim());
  // Allow plain IPs and CIDR notation (e.g. 192.168.1.0/24 or 10.0.0.0/8)
  return raw.filter(entry => {
    if (!entry) return false;
    // CIDR format: x.x.x.x/prefix
    if (entry.includes("/")) {
      const [ip, prefix] = entry.split("/");
      const num = parseInt(prefix, 10);
      return ip && !isNaN(num) && num >= 0 && num <= 32;
    }
    // Plain IP: basic format check
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(entry);
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || "";
    const branch = searchParams.get("branch") || "";
    const db = loadDatabase();
    const dbClient = supabaseAdmin || supabase;

    // If branch-specific request, fetch per-branch row
    if (dbClient && branch && branch !== "All Branches" && companyId) {
      try {
        const bName = toBranchName(branch);
        const bId = toBranchId(branch);
        // Query by branch column (try both name and id)
        const { data: branchRow } = await dbClient
          .from("wifi_restriction_settings")
          .select("*")
          .eq("company_id", companyId)
          .or(`branch.eq.${bName},branch.eq.${bId},branch.eq.${branch}`)
          .not("branch", "is", null)
          .maybeSingle();
        if (branchRow) {
          const parsedIps = parseIps(branchRow.allowed_ip);
          return NextResponse.json({
            enabled: branchRow.enabled ?? false,
            allowedIp: branchRow.allowed_ip || "",
            allowedIps: parsedIps,
            companyId: branchRow.company_id || companyId,
            branch: bName
          });
        }
      } catch (err) {
        console.warn("Supabase per-branch wifi GET error:", err);
      }
    }

    // Prefer Supabase as source of truth for company-level
    if (dbClient) {
      try {
        if (companyId) {
          // Get company-level row (where branch IS NULL)
          const { data } = await dbClient
            .from("wifi_restriction_settings")
            .select("*")
            .eq("company_id", companyId)
            .is("branch", null)
            .maybeSingle();
          if (data) {
            const parsedIps = parseIps(data.allowed_ip);
            return NextResponse.json({
              enabled: data.enabled ?? false,
              allowedIp: data.allowed_ip || "",
              allowedIps: parsedIps,
              companyId: data.company_id || companyId
            });
          }
        }
        // Try default row
        const { data: defaultData } = await dbClient
          .from("wifi_restriction_settings")
          .select("*")
          .eq("id", "default")
          .maybeSingle();
        if (defaultData) {
          const parsedIps = parseIps(defaultData.allowed_ip);
          return NextResponse.json({
            enabled: defaultData.enabled ?? false,
            allowedIp: defaultData.allowed_ip || "",
            allowedIps: parsedIps,
            companyId: defaultData.company_id || ""
          });
        }
      } catch (err) {
        console.warn("Supabase wifi_restriction_settings GET error:", err);
      }
    }

    // Fallback to local DB
    const settings = db.wifiRestrictionSettings || { enabled: false, allowedIp: "", allowedIps: [] };
    const parsedIps = parseIps(settings.allowedIps || settings.allowedIp);
    return NextResponse.json({
      ...settings,
      allowedIps: parsedIps
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch WiFi settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { enabled, companyId = "", branch } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
    }

    const rawIps = body.allowedIps ?? body.allowedIp;
    const allowedIps = parseIps(rawIps);
    const allowedIpString = allowedIps.join(", ");

    const db = loadDatabase();
    const dbClient = supabaseAdmin || supabase;
    const rawBranch = (branch && branch !== "All Branches") ? branch : "";
    const bName = rawBranch ? toBranchName(rawBranch) : "";

    if (rawBranch && bName) {
      // Save per-branch WiFi settings
      if (!db.branchWifiSettings) db.branchWifiSettings = {};
      const setting = { enabled, allowedIp: allowedIpString, allowedIps, companyId: companyId || undefined };
      db.branchWifiSettings[bName] = setting;
      db.branchWifiSettings[toBranchId(bName)] = setting;
      saveDatabase(db);

      // Persist to Supabase with branch column
      if (dbClient && companyId) {
        try {
          const recordId = `${companyId}-${toBranchId(bName)}`;
          const validCompanyId = (companyId && companyId.length === 36) ? companyId : null;
          const payload: any = {
            id: recordId,
            company_id: validCompanyId,
            branch: bName,
            enabled,
            allowed_ip: allowedIpString,
            updated_at: new Date().toISOString()
          };
          const { error } = await dbClient
            .from("wifi_restriction_settings")
            .upsert(payload, { onConflict: "id" });
          if (error) {
            console.error("Supabase per-branch wifi_restriction_settings upsert error:", error);
            return NextResponse.json({ error: error.message || "Supabase save failed" }, { status: 500 });
          }
        } catch (err) {
          console.error("Error saving per-branch wifi settings to Supabase:", err);
        }
      }

      return NextResponse.json({
        success: true,
        branch: bName,
        wifiRestrictionSettings: db.branchWifiSettings[bName]
      });
    }

    // Global / company-level save
    db.wifiRestrictionSettings = {
      enabled,
      allowedIp: allowedIpString,
      allowedIps,
      companyId: companyId || undefined
    };
    saveDatabase(db);

    if (dbClient) {
      const recordId = companyId || "default";
      const validCompanyId = (companyId && companyId.length === 36) ? companyId : null;
      const payload: any = {
        id: recordId,
        company_id: validCompanyId,
        branch: null,
        enabled,
        allowed_ip: allowedIpString,
        updated_at: new Date().toISOString()
      };
      const { error } = await dbClient.from("wifi_restriction_settings").upsert(payload, { onConflict: "id" });
      if (error) {
        console.error("Supabase wifi_restriction_settings upsert error:", error);
        return NextResponse.json({ error: error.message || "Supabase database save failed" }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      wifiRestrictionSettings: db.wifiRestrictionSettings
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save WiFi settings" }, { status: 500 });
  }
}
