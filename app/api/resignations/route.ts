import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { ResignationRequest, ResignationStatus, Employee } from "@/src/types";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { toBranchName } from "@/src/lib/branchUtils";

const MGM_COMPANY_ID = "a1b2c3d4-0001-0001-0001-000000000001";

// Helper to query Supabase safely
async function syncResignationToSupabase(reqItem: ResignationRequest) {
  const client = supabaseAdmin || supabase;
  if (!client) return;
  try {
    const payload = {
      id: reqItem.id,
      company_id: reqItem.companyId || MGM_COMPANY_ID,
      employee_id: reqItem.employeeId,
      employee_name: reqItem.employeeName,
      employee_code: reqItem.employeeCode || null,
      department: reqItem.department || null,
      designation: reqItem.designation || null,
      branch: reqItem.branch || null,
      resignation_date: reqItem.resignationDate,
      last_working_date: reqItem.lastWorkingDate,
      notice_period_days: reqItem.noticePeriodDays || 30,
      reason: reqItem.reason,
      remarks: reqItem.remarks,
      status: reqItem.status,
      applied_at: reqItem.appliedAt,
      reviewed_by: reqItem.reviewedBy || null,
      reviewed_by_id: reqItem.reviewedById || null,
      reviewed_at: reqItem.reviewedAt || null,
      review_remarks: reqItem.reviewRemarks || null,
      approved_last_working_date: reqItem.approvedLastWorkingDate || null,
    };
    const { error } = await client.from("resignation_requests").upsert(payload, { onConflict: "id" });
    if (error) {
      console.warn("Supabase resignation_requests upsert warning (will rely on in-memory/state):", error.message);
    }
  } catch (err) {
    console.warn("Exception syncing resignation to Supabase:", err);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId") || MGM_COMPANY_ID;
  const branch = searchParams.get("branch");
  const employeeId = searchParams.get("employeeId");
  const status = searchParams.get("status");

  const db = loadDatabase();
  const client = supabaseAdmin || supabase;

  // Hydrate from Supabase if table exists
  if (client) {
    try {
      let query = client.from("resignation_requests").select("*");
      if (companyId) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      }
      const { data: rows, error } = await query;
      if (rows && Array.isArray(rows) && !error && rows.length > 0) {
        const fetchedList: ResignationRequest[] = rows.map((r: any) => ({
          id: r.id,
          companyId: r.company_id || r.companyId || companyId,
          employeeId: r.employee_id || r.employeeId,
          employeeName: r.employee_name || r.employeeName || "",
          employeeCode: r.employee_code || r.employeeCode || undefined,
          department: r.department || undefined,
          designation: r.designation || undefined,
          branch: toBranchName(r.branch || "Mumbai Branch"),
          resignationDate: r.resignation_date || r.resignationDate || "",
          lastWorkingDate: r.last_working_date || r.lastWorkingDate || "",
          noticePeriodDays: r.notice_period_days ?? r.noticePeriodDays ?? 30,
          reason: r.reason || "",
          remarks: r.remarks || "",
          status: (r.status || "Pending") as ResignationStatus,
          appliedAt: r.applied_at || r.appliedAt || new Date().toISOString(),
          reviewedBy: r.reviewed_by || r.reviewedBy || undefined,
          reviewedById: r.reviewed_by_id || r.reviewedById || undefined,
          reviewedAt: r.reviewed_at || r.reviewedAt || undefined,
          reviewRemarks: r.review_remarks || r.reviewRemarks || undefined,
          approvedLastWorkingDate: r.approved_last_working_date || r.approvedLastWorkingDate || undefined,
        }));

        // Merge with existing in-memory to prevent state clobbering
        const map = new Map<string, ResignationRequest>();
        (db.resignationRequests || []).forEach(item => map.set(item.id, item));
        fetchedList.forEach(item => map.set(item.id, item));
        db.resignationRequests = Array.from(map.values());
        saveDatabase(db);
      }
    } catch (e) {
      console.warn("Failed to fetch resignation_requests from Supabase (using in-memory):", e);
    }
  }

  let list = db.resignationRequests || [];

  if (companyId) {
    list = list.filter(r => !r.companyId || r.companyId === companyId);
  }
  if (employeeId) {
    list = list.filter(r => r.employeeId === employeeId);
  }
  if (branch && branch !== "All Branches") {
    const targetBranch = toBranchName(branch).toLowerCase();
    list = list.filter(r => toBranchName(r.branch).toLowerCase() === targetBranch);
  }
  if (status && status !== "All") {
    list = list.filter(r => r.status === status);
  }

  // Sort newest submissions first
  list.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());

  return NextResponse.json({ resignations: list });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, resignationDate, lastWorkingDate, noticePeriodDays, reason, remarks, branch: reqBranch } = body;

    if (!employeeId || !resignationDate || !lastWorkingDate || !reason) {
      return NextResponse.json(
        { error: "Employee ID, resignation date, last working date, and reason are required" },
        { status: 400 }
      );
    }

    const db = loadDatabase();
    const emp = (db.employees || []).find(e => e.id === employeeId);
    const empName = emp?.fullName || `Employee ${employeeId}`;
    const empCode = emp?.code || emp?.id || "";
    const department = emp?.department || "";
    const des = (db.designations || []).find(d => d.id === emp?.designationId);
    const designation = des?.title || "";
    const finalBranch = reqBranch || emp?.branch || "Mumbai Branch";
    const companyId = emp?.companyId || MGM_COMPANY_ID;

    // Check if employee already has an active pending resignation
    const existingPending = (db.resignationRequests || []).find(
      r => r.employeeId === employeeId && r.status === "Pending"
    );
    if (existingPending) {
      return NextResponse.json(
        { error: "You already have a pending resignation request under review by HR." },
        { status: 400 }
      );
    }

    const newResignation: ResignationRequest = {
      id: `resig-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      companyId,
      employeeId,
      employeeName: empName,
      employeeCode: empCode,
      department,
      designation,
      branch: toBranchName(finalBranch),
      resignationDate: resignationDate.split("T")[0],
      lastWorkingDate: lastWorkingDate.split("T")[0],
      noticePeriodDays: Number(noticePeriodDays) || 30,
      reason: String(reason).trim(),
      remarks: remarks ? String(remarks).trim() : "",
      status: "Pending",
      appliedAt: new Date().toISOString(),
    };

    if (!db.resignationRequests) db.resignationRequests = [];
    db.resignationRequests.unshift(newResignation);
    saveDatabase(db);

    // Sync to Supabase
    await syncResignationToSupabase(newResignation);

    return NextResponse.json({ success: true, resignation: newResignation }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating resignation request:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, reviewRemarks, approvedLastWorkingDate, reviewedBy, reviewedById } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Resignation ID and status are required" }, { status: 400 });
    }

    const validStatuses: ResignationStatus[] = ["Pending", "Approved", "Rejected", "Withdrawn"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid resignation status" }, { status: 400 });
    }

    const db = loadDatabase();
    if (!db.resignationRequests) db.resignationRequests = [];

    const index = db.resignationRequests.findIndex(r => r.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Resignation request not found" }, { status: 404 });
    }

    const current = db.resignationRequests[index];
    const nowIso = new Date().toISOString();

    const updated: ResignationRequest = {
      ...current,
      status,
      ...(reviewRemarks !== undefined ? { reviewRemarks: String(reviewRemarks).trim() } : {}),
      ...(approvedLastWorkingDate ? { approvedLastWorkingDate: approvedLastWorkingDate.split("T")[0] } : {}),
      ...(reviewedBy ? { reviewedBy } : {}),
      ...(reviewedById ? { reviewedById } : {}),
      reviewedAt: nowIso,
    };

    db.resignationRequests[index] = updated;

    // If status is Approved: Mark employee status as "Resigned" to initiate Exit Clearance!
    let updatedEmployee: Employee | undefined = undefined;
    if (status === "Approved") {
      const empIndex = (db.employees || []).findIndex(e => e.id === current.employeeId);
      if (empIndex !== -1) {
        db.employees[empIndex] = {
          ...db.employees[empIndex],
          status: "Resigned",
        };
        updatedEmployee = db.employees[empIndex];

        // Sync employee status to Supabase
        const client = supabaseAdmin || supabase;
        if (client) {
          try {
            await client.from("employees").update({ status: "Resigned" }).eq("id", current.employeeId);
          } catch (e) {
            console.warn("Failed to update employee status in Supabase:", e);
          }
        }
      }
    } else if (status === "Withdrawn" || status === "Rejected") {
      // If previously pending and rejected or withdrawn, ensure employee is Active if currently marked Resigned
      const empIndex = (db.employees || []).findIndex(e => e.id === current.employeeId);
      if (empIndex !== -1 && db.employees[empIndex].status === "Resigned") {
        db.employees[empIndex] = {
          ...db.employees[empIndex],
          status: "Active",
        };
        updatedEmployee = db.employees[empIndex];

        const client = supabaseAdmin || supabase;
        if (client) {
          try {
            await client.from("employees").update({ status: "Active" }).eq("id", current.employeeId);
          } catch (e) {
            console.warn("Failed to revert employee status in Supabase:", e);
          }
        }
      }
    }

    saveDatabase(db);

    // Sync resignation request to Supabase
    await syncResignationToSupabase(updated);

    return NextResponse.json({
      success: true,
      resignation: updated,
      employee: updatedEmployee,
    });
  } catch (error: any) {
    console.error("Error updating resignation request:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Resignation ID is required" }, { status: 400 });
    }

    const db = loadDatabase();
    if (!db.resignationRequests) db.resignationRequests = [];
    db.resignationRequests = db.resignationRequests.filter(r => r.id !== id);
    saveDatabase(db);

    const client = supabaseAdmin || supabase;
    if (client) {
      try {
        await client.from("resignation_requests").delete().eq("id", id);
      } catch (e) {
        console.warn("Failed to delete resignation from Supabase:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete resignation" }, { status: 500 });
  }
}
