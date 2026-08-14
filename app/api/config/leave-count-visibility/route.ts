import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { MGM_COMPANY_ID } from "@/src/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = loadDatabase();
    const currentVal = db.showLeaveCount !== undefined ? db.showLeaveCount : true;

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || MGM_COMPANY_ID;
    const dbClient = supabaseAdmin || supabase;

    if (dbClient) {
      try {
        const { data, error } = await dbClient
          .from("wifi_restriction_settings")
          .select("show_leave_count")
          .or(`company_id.eq.${companyId},id.eq.default`)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data && data.show_leave_count !== null && data.show_leave_count !== undefined) {
          db.showLeaveCount = data.show_leave_count;
          saveDatabase(db);
          return NextResponse.json({ showLeaveCount: data.show_leave_count });
        }
      } catch (err) {
        console.warn("Supabase show_leave_count GET fallback to local DB:", err);
      }
    }

    return NextResponse.json({ showLeaveCount: currentVal });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch setting" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { showLeaveCount, companyId = MGM_COMPANY_ID } = body;

    if (typeof showLeaveCount !== "boolean") {
      return NextResponse.json({ error: "showLeaveCount must be a boolean" }, { status: 400 });
    }

    // 1. Save to local JSON DB immediately
    const db = loadDatabase();
    db.showLeaveCount = showLeaveCount;
    saveDatabase(db);

    // 2. Sync to Supabase (update both default and company records)
    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        const targets = ["default"];
        if (companyId && companyId !== "default" && companyId.length === 36) {
          targets.push(companyId);
        }

        for (const targetId of targets) {
          const { error } = await dbClient
            .from("wifi_restriction_settings")
            .upsert(
              {
                id: targetId,
                company_id: targetId === "default" ? null : targetId,
                show_leave_count: showLeaveCount,
                updated_at: new Date().toISOString()
              },
              { onConflict: "id" }
            );

          if (error) {
            console.warn(`Supabase show_leave_count upsert warning for target ${targetId}:`, error.message);
          }
        }
      } catch (err) {
        console.warn("Supabase show_leave_count POST error:", err);
      }
    }

    return NextResponse.json({ success: true, showLeaveCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save setting" }, { status: 500 });
  }
}
