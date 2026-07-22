import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";

export async function POST(request: Request) {
  try {
    const { type, value } = await request.json();
    const db = loadDatabase();
    if (type === "leave") {
      if (!db.customLeaveTypes.includes(value)) db.customLeaveTypes.push(value);
    } else if (type === "department") {
      if (!db.customDepartments.includes(value)) db.customDepartments.push(value);
    } else if (type === "branch") {
      if (!db.customBranches.includes(value)) db.customBranches.push(value);
    }
    saveDatabase(db);
    return NextResponse.json({ success: true, type, value });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update custom config" }, { status: 500 });
  }
}
