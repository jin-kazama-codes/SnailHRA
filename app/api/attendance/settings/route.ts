import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { toBranchId, toBranchName } from "@/src/lib/branchUtils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branch = searchParams.get("branch") || "";
    const companyId = searchParams.get("companyId") || "";
    const db = loadDatabase();

    if (branch && branch !== "All Branches") {
      const bName = toBranchName(branch);
      const bId = toBranchId(branch);
      const bTiming = db.branchTimingSettings?.[branch] 
        || db.branchTimingSettings?.[bName] 
        || db.branchTimingSettings?.[bId]
        || (db.branchTimingSettings ? Object.entries(db.branchTimingSettings).find(([k]) => 
            k.toLowerCase() === branch.toLowerCase() || 
            toBranchName(k).toLowerCase() === bName.toLowerCase() ||
            toBranchId(k) === bId
          )?.[1] : null);

      if (bTiming) {
        return NextResponse.json({
          success: true,
          timingSettings: bTiming,
          branch,
          companyId
        });
      }
    }

    if (companyId && db.companyTimingSettings?.[companyId]) {
      return NextResponse.json({
        success: true,
        timingSettings: db.companyTimingSettings[companyId],
        companyId
      });
    }

    return NextResponse.json({
      success: true,
      timingSettings: db.timingSettings || {
        clockInTime: "09:00",
        clockOutTime: "18:00",
        lateThreshold: "09:30",
        breakStartTime: "13:00",
        breakEndTime: "14:00"
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch timing settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const settings = await request.json();
    const db = loadDatabase();

    const timingSettings = {
      clockInTime: settings.clockInTime || "09:00",
      clockOutTime: settings.clockOutTime || "18:00",
      lateThreshold: settings.lateThreshold || "09:30",
      breakStartTime: settings.breakStartTime || "13:00",
      breakEndTime: settings.breakEndTime || "14:00"
    };

    const companyId = settings.companyId || "";
    const rawBranch = (settings.branch && settings.branch !== "All Branches") ? settings.branch : "";
    const bName = rawBranch ? toBranchName(rawBranch) : "";
    const bId = rawBranch ? toBranchId(rawBranch) : "";
    const recordId = rawBranch ? `branch-${bId || bName}` : (companyId || "default");

    if (rawBranch) {
      if (!db.branchTimingSettings) {
        db.branchTimingSettings = {};
      }
      db.branchTimingSettings[rawBranch] = timingSettings;
      if (bName) db.branchTimingSettings[bName] = timingSettings;
      if (bId) db.branchTimingSettings[bId] = timingSettings;
    } else if (companyId) {
      if (!db.companyTimingSettings) {
        db.companyTimingSettings = {};
      }
      db.companyTimingSettings[companyId] = timingSettings;
    }
    db.timingSettings = timingSettings;
    saveDatabase(db);

    if (supabase) {
      try {
        const payload: any = {
          id: recordId,
          company_id: companyId || null,
          branch: bName || rawBranch || null,
          clock_in_time: timingSettings.clockInTime,
          clock_out_time: timingSettings.clockOutTime,
          late_threshold: timingSettings.lateThreshold,
          break_start_time: timingSettings.breakStartTime,
          break_end_time: timingSettings.breakEndTime,
          changed_by: settings.changedBy || "System"
        };
        const { error } = await supabase.from("timing_settings").upsert(payload, { onConflict: "id" });
        if (error) {
          console.warn("Supabase timing_settings upsert warning:", error);
        }

        // Also clean up or sync alternate ID to prevent duplicate conflicting rows
        if (rawBranch && bName && bId && `branch-${bName}` !== `branch-${bId}`) {
          const alternateId = `branch-${bName}`;
          if (alternateId !== recordId) {
            await supabase.from("timing_settings").upsert({ ...payload, id: alternateId }, { onConflict: "id" });
          }
        }
      } catch (err) {
        console.warn("Supabase settings sync warning:", err);
      }
    }

    return NextResponse.json({
      success: true,
      timingSettings,
      branch: rawBranch || undefined,
      companyId: companyId || undefined
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update timing settings" }, { status: 500 });
  }
}
