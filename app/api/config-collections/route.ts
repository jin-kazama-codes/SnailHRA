import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { 
  syncDepartmentToSupabase, deleteDepartmentFromSupabase,
  syncBranchToSupabase, deleteBranchFromSupabase,
  syncLeaveTypeToSupabase, deleteLeaveTypeFromSupabase
} from "@/src/lib/supabase";

export async function POST(request: Request) {
  try {
    const { type, updatedList, addedItem, removedItem } = await request.json();
    if (!type || !Array.isArray(updatedList)) {
      return NextResponse.json({ error: "Type and updatedList array are required." }, { status: 400 });
    }

    const db = loadDatabase();

    let previousList: string[] = [];
    if (type === "leaveTypes") {
      previousList = db.customLeaveTypes || [];
      if (addedItem && !updatedList.includes(addedItem)) updatedList.push(addedItem);
      db.customLeaveTypes = updatedList;
    } else if (type === "departments") {
      previousList = db.customDepartments || [];
      if (addedItem && !updatedList.includes(addedItem)) updatedList.push(addedItem);
      db.customDepartments = updatedList;
    } else if (type === "branches") {
      previousList = db.customBranches || [];
      if (addedItem && !updatedList.includes(addedItem)) updatedList.push(addedItem);
      db.customBranches = updatedList;
    } else {
      return NextResponse.json({ error: "Invalid collection type." }, { status: 400 });
    }

    saveDatabase(db);

    // Identify added and removed items
    const added = addedItem || updatedList.find((item: string) => !previousList.includes(item));
    const removed = removedItem || previousList.find((item: string) => !updatedList.includes(item));

    // Sync changes to Supabase database tables asynchronously
    if (type === "departments") {
      if (added) await syncDepartmentToSupabase(added);
      if (removed) await deleteDepartmentFromSupabase(removed);
    } else if (type === "branches") {
      if (added) await syncBranchToSupabase(added);
      if (removed) await deleteBranchFromSupabase(removed);
    } else if (type === "leaveTypes") {
      if (added) await syncLeaveTypeToSupabase(added);
      if (removed) await deleteLeaveTypeFromSupabase(removed);
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
