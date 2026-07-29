import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { capitalizeName } from "@/src/types";

export async function POST(request: Request) {
  try {
    const { type, value } = await request.json();
    const capitalizedValue = capitalizeName(value);
    const db = loadDatabase();
    if (type === "leave") {
      if (!db.customLeaveTypes.includes(capitalizedValue)) db.customLeaveTypes.push(capitalizedValue);
    } else if (type === "department") {
      if (!db.customDepartments.includes(capitalizedValue)) db.customDepartments.push(capitalizedValue);
    } else if (type === "branch") {
      if (!db.customBranches.includes(capitalizedValue)) db.customBranches.push(capitalizedValue);
    }
    saveDatabase(db);
    return NextResponse.json({ success: true, type, value: capitalizedValue });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update custom config" }, { status: 500 });
  }
}
