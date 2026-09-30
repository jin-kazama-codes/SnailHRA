import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { toBranchId, toBranchName } from "@/src/lib/branchUtils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = loadDatabase();
    const { searchParams } = new URL(request.url);
    const branch = searchParams.get("branch");

    const branchEmployeeSelfEdit = db.branchEmployeeSelfEdit || {};
    const globalDefault = db.employeeSelfEdit ?? false;

    if (branch && branch !== "All Branches") {
      const bName = toBranchName(branch);
      const bId = toBranchId(branch);
      const val = branchEmployeeSelfEdit[branch] !== undefined
        ? branchEmployeeSelfEdit[branch]
        : (branchEmployeeSelfEdit[bName] !== undefined
            ? branchEmployeeSelfEdit[bName]
            : (branchEmployeeSelfEdit[bId] !== undefined ? branchEmployeeSelfEdit[bId] : globalDefault));

      return NextResponse.json({
        employeeSelfEdit: val,
        branch,
        branchEmployeeSelfEdit
      });
    }

    return NextResponse.json({
      employeeSelfEdit: globalDefault,
      branchEmployeeSelfEdit
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch employee self-edit setting" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeSelfEdit, branch } = body;

    if (typeof employeeSelfEdit !== "boolean") {
      return NextResponse.json({ error: "employeeSelfEdit boolean is required" }, { status: 400 });
    }

    const db = loadDatabase();

    const branchName = (branch && branch !== "All Branches") ? branch : "";
    if (branchName) {
      if (!db.branchEmployeeSelfEdit) db.branchEmployeeSelfEdit = {};
      const val = Boolean(employeeSelfEdit);
      db.branchEmployeeSelfEdit[branchName] = val;
      const bName = toBranchName(branchName);
      const bId = toBranchId(branchName);
      if (bName) db.branchEmployeeSelfEdit[bName] = val;
      if (bId) db.branchEmployeeSelfEdit[bId] = val;
    } else {
      db.employeeSelfEdit = Boolean(employeeSelfEdit);
    }

    saveDatabase(db);

    return NextResponse.json({
      success: true,
      employeeSelfEdit: Boolean(employeeSelfEdit),
      branch: branchName || "global",
      branchEmployeeSelfEdit: db.branchEmployeeSelfEdit || {}
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save employee self-edit setting" }, { status: 500 });
  }
}
