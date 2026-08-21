import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { capitalizeName } from "@/src/types";
import { 
  syncDepartmentToSupabase, deleteDepartmentFromSupabase,
  syncBranchToSupabase, deleteBranchFromSupabase,
  syncLeaveTypeToSupabase, deleteLeaveTypeFromSupabase,
  syncAmenityToSupabase, deleteAmenityFromSupabase
} from "@/src/lib/supabase";
import { toBranchId, toBranchName } from "@/src/lib/branchUtils";

export async function POST(request: Request) {
  try {
    const { type, updatedList, addedItem, removedItem, companyId, branch } = await request.json();
    if (!type || !Array.isArray(updatedList)) {
      return NextResponse.json({ error: "Type and updatedList array are required." }, { status: 400 });
    }

    const safeCapitalize = (str: string) => {
      if (str.includes("|")) {
        const [name, icon] = str.split("|");
        return `${capitalizeName(name)}|${icon}`;
      }
      return capitalizeName(str);
    };
    const capitalizedList = updatedList.map((item: string) => safeCapitalize(item));
    const capitalizedAdded = addedItem ? safeCapitalize(addedItem) : undefined;

    const db = loadDatabase();
    const rawBranch = (branch && branch !== "All Branches") ? branch : "";
    const bName = rawBranch ? toBranchName(rawBranch) : "";
    const bId = rawBranch ? toBranchId(rawBranch) : "";

    let previousList: string[] = [];
    if (type === "leaveTypes") {
      if (rawBranch) {
        if (!db.branchLeaveTypes) db.branchLeaveTypes = {};
        previousList = db.branchLeaveTypes[rawBranch] || db.branchLeaveTypes[bName] || db.branchLeaveTypes[bId] || [];
      } else {
        previousList = db.customLeaveTypes || [];
      }
      const map = new Map<string, string>();
      capitalizedList.forEach((item: string) => {
        const name = (item.includes("|") ? item.split("|")[0] : item).trim().toLowerCase();
        map.set(name, item);
      });
      if (capitalizedAdded) {
        const addedName = (capitalizedAdded.includes("|") ? capitalizedAdded.split("|")[0] : capitalizedAdded).trim().toLowerCase();
        map.set(addedName, capitalizedAdded);
      }
      const processedList = Array.from(map.values());
      if (rawBranch) {
        if (!db.branchLeaveTypes) db.branchLeaveTypes = {};
        db.branchLeaveTypes[rawBranch] = processedList;
        if (bName) db.branchLeaveTypes[bName] = processedList;
        if (bId) db.branchLeaveTypes[bId] = processedList;
      } else {
        db.customLeaveTypes = processedList;
      }
    } else if (type === "departments") {
      if (rawBranch) {
        if (!db.branchDepartments) db.branchDepartments = {};
        previousList = db.branchDepartments[rawBranch] || db.branchDepartments[bName] || db.branchDepartments[bId] || [];
      } else {
        previousList = db.customDepartments || [];
      }
      if (capitalizedAdded && !capitalizedList.includes(capitalizedAdded)) capitalizedList.push(capitalizedAdded);
      if (rawBranch) {
        if (!db.branchDepartments) db.branchDepartments = {};
        db.branchDepartments[rawBranch] = capitalizedList;
        if (bName) db.branchDepartments[bName] = capitalizedList;
        if (bId) db.branchDepartments[bId] = capitalizedList;
      } else {
        db.customDepartments = capitalizedList;
      }
    } else if (type === "branches") {
      previousList = db.customBranches || [];
      if (capitalizedAdded && !capitalizedList.includes(capitalizedAdded)) capitalizedList.push(capitalizedAdded);
      db.customBranches = capitalizedList;
    } else if (type === "amenities") {
      if (rawBranch) {
        if (!db.branchAmenities) db.branchAmenities = {};
        previousList = db.branchAmenities[rawBranch] || db.branchAmenities[bName] || db.branchAmenities[bId] || [];
      } else {
        previousList = db.customAmenities || [];
      }
      if (capitalizedAdded && !capitalizedList.includes(capitalizedAdded)) capitalizedList.push(capitalizedAdded);
      if (rawBranch) {
        if (!db.branchAmenities) db.branchAmenities = {};
        db.branchAmenities[rawBranch] = capitalizedList;
        if (bName) db.branchAmenities[bName] = capitalizedList;
        if (bId) db.branchAmenities[bId] = capitalizedList;
      } else {
        db.customAmenities = capitalizedList;
      }
    } else {
      return NextResponse.json({ error: "Invalid collection type." }, { status: 400 });
    }

    saveDatabase(db);

    // Identify added and removed items
    const added = capitalizedAdded || capitalizedList.find((item: string) => !previousList.includes(item));
    const getCleanName = (s: string) => (s.includes("|") ? s.split("|")[0] : s).trim().toLowerCase();
    const currentCleanNames = new Set(capitalizedList.map(getCleanName));
    const removed = removedItem || previousList.find((item: string) => !currentCleanNames.has(getCleanName(item)));

    // Sync changes to Supabase database tables asynchronously
    if (type === "departments") {
      if (added) await syncDepartmentToSupabase(added, companyId, bName || undefined);
      if (removed) await deleteDepartmentFromSupabase(removed, companyId, bName || undefined);
    } else if (type === "branches") {
      if (added) await syncBranchToSupabase(added, companyId);
      if (removed) await deleteBranchFromSupabase(removed, companyId);
    } else if (type === "leaveTypes") {
      if (added) {
        await syncLeaveTypeToSupabase(added, companyId, bName);
      } else {
        // Sync all items in list
        for (const item of capitalizedList) {
          await syncLeaveTypeToSupabase(item, companyId, bName);
        }
      }
      if (removed) await deleteLeaveTypeFromSupabase(removed, companyId, bName);
    } else if (type === "amenities") {
      if (added) {
        await syncAmenityToSupabase(added, companyId, bName);
      } else {
        for (const item of capitalizedList) {
          await syncAmenityToSupabase(item, companyId, bName);
        }
      }
      if (removed) await deleteAmenityFromSupabase(removed, companyId, bName);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Configuration for ${type} updated successfully.` 
    });
  } catch (error) {
    console.error("Error updating config collection:", error);
    return NextResponse.json({ error: "Failed to update dynamic configuration." }, { status: 500 });
  }
}
