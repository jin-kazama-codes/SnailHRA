import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { capitalizeName } from "@/src/types";
import { 
  syncDepartmentToSupabase, deleteDepartmentFromSupabase,
  syncBranchToSupabase, deleteBranchFromSupabase,
  syncLeaveTypeToSupabase, deleteLeaveTypeFromSupabase,
  syncAmenityToSupabase, deleteAmenityFromSupabase
} from "@/src/lib/supabase";

export async function POST(request: Request) {
  try {
    const { type, updatedList, addedItem, removedItem, companyId } = await request.json();
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

    let previousList: string[] = [];
    if (type === "leaveTypes") {
      previousList = db.customLeaveTypes || [];
      const map = new Map<string, string>();
      capitalizedList.forEach((item: string) => {
        const name = (item.includes("|") ? item.split("|")[0] : item).trim().toLowerCase();
        map.set(name, item);
      });
      if (capitalizedAdded) {
        const addedName = (capitalizedAdded.includes("|") ? capitalizedAdded.split("|")[0] : capitalizedAdded).trim().toLowerCase();
        map.set(addedName, capitalizedAdded);
      }
      db.customLeaveTypes = Array.from(map.values());
    } else if (type === "departments") {
      previousList = db.customDepartments || [];
      if (capitalizedAdded && !capitalizedList.includes(capitalizedAdded)) capitalizedList.push(capitalizedAdded);
      db.customDepartments = capitalizedList;
    } else if (type === "branches") {
      previousList = db.customBranches || [];
      if (capitalizedAdded && !capitalizedList.includes(capitalizedAdded)) capitalizedList.push(capitalizedAdded);
      db.customBranches = capitalizedList;
    } else if (type === "amenities") {
      previousList = db.customAmenities || [];
      if (capitalizedAdded && !capitalizedList.includes(capitalizedAdded)) capitalizedList.push(capitalizedAdded);
      db.customAmenities = capitalizedList;
    } else {
      return NextResponse.json({ error: "Invalid collection type." }, { status: 400 });
    }

    saveDatabase(db);

    // Identify added and removed items
    const added = capitalizedAdded || capitalizedList.find((item: string) => !previousList.includes(item));
    const removed = removedItem || previousList.find((item: string) => !capitalizedList.includes(item));

    // Sync changes to Supabase database tables asynchronously
    if (type === "departments") {
      if (added) await syncDepartmentToSupabase(added, companyId);
      if (removed) await deleteDepartmentFromSupabase(removed, companyId);
    } else if (type === "branches") {
      if (added) await syncBranchToSupabase(added, companyId);
      if (removed) await deleteBranchFromSupabase(removed, companyId);
    } else if (type === "leaveTypes") {
      if (added) await syncLeaveTypeToSupabase(added, companyId);
      if (removed) await deleteLeaveTypeFromSupabase(removed, companyId);
    } else if (type === "amenities") {
      if (added) await syncAmenityToSupabase(added, companyId);
      if (removed) await deleteAmenityFromSupabase(removed, companyId);
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
