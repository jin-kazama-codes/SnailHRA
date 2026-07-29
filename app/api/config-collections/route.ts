import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { capitalizeName } from "@/src/types";
import { 
  syncDepartmentToSupabase, deleteDepartmentFromSupabase,
  syncBranchToSupabase, deleteBranchFromSupabase,
  syncLeaveTypeToSupabase, deleteLeaveTypeFromSupabase
} from "@/src/lib/supabase";

export async function POST(request: Request) {
  try {
    const { type, updatedList, addedItem, removedItem, companyId } = await request.json();
    if (!type || !Array.isArray(updatedList)) {
      return NextResponse.json({ error: "Type and updatedList array are required." }, { status: 400 });
    }

    const capitalizedList = updatedList.map((item: string) => capitalizeName(item));
    const capitalizedAdded = addedItem ? capitalizeName(addedItem) : undefined;

    const db = loadDatabase();

    let previousList: string[] = [];
    if (type === "leaveTypes") {
      previousList = db.customLeaveTypes || [];
      if (capitalizedAdded && !capitalizedList.includes(capitalizedAdded)) capitalizedList.push(capitalizedAdded);
      db.customLeaveTypes = capitalizedList;
    } else if (type === "departments") {
      previousList = db.customDepartments || [];
      if (capitalizedAdded && !capitalizedList.includes(capitalizedAdded)) capitalizedList.push(capitalizedAdded);
      db.customDepartments = capitalizedList;
    } else if (type === "branches") {
      previousList = db.customBranches || [];
      if (capitalizedAdded && !capitalizedList.includes(capitalizedAdded)) capitalizedList.push(capitalizedAdded);
      db.customBranches = capitalizedList;
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
