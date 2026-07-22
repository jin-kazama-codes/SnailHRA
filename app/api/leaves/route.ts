import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { LeaveRequest } from "@/src/types";
import { supabase } from "@/src/lib/supabase";

export async function GET() {
  const db = loadDatabase();
  if (supabase) {
    try {
      const { data } = await supabase.from("leaves").select("*");
      if (data && data.length > 0) {
        const mappedLeaves: LeaveRequest[] = data.map((row: any) => ({
          id: row.id,
          employeeId: row.employee_id || row.employeeId || "",
          employeeName: row.employee_name || row.employeeName || "",
          leaveType: row.leave_type || row.leaveType || "Casual Leave",
          startDate: row.start_date || row.startDate || "",
          endDate: row.end_date || row.endDate || "",
          reason: row.reason || "",
          status: row.status || "Pending",
          appliedDate: row.applied_date || row.appliedDate || ""
        }));
        const leaveMap = new Map();
        (db.leaves || []).forEach((l: any) => { if (l.id) leaveMap.set(l.id, l); });
        mappedLeaves.forEach((l: any) => { leaveMap.set(l.id, l); });
        const mergedLeaves = Array.from(leaveMap.values());
        db.leaves = mergedLeaves;
        return NextResponse.json(mergedLeaves);
      }
    } catch (err) {
      console.warn("Supabase fetch leaves error:", err);
    }
  }
  return NextResponse.json(db.leaves || []);
}

export async function POST(request: Request) {
  try {
    const leaveData = await request.json();
    const leaveId = leaveData.id || "lv-" + Date.now();
    const status = leaveData.status || "Pending";
    const appliedDate = leaveData.appliedDate || new Date().toISOString().split('T')[0];

    const db = loadDatabase();
    const emp = db.employees.find(e => e.id === leaveData.employeeId);
    const empName = leaveData.employeeName || emp?.fullName || "Employee " + leaveData.employeeId;

    const newLeave: LeaveRequest = {
      id: leaveId,
      employeeId: leaveData.employeeId,
      employeeName: empName,
      leaveType: leaveData.leaveType || "Casual Leave",
      startDate: leaveData.startDate,
      endDate: leaveData.endDate,
      reason: leaveData.reason,
      status: status,
      appliedDate: appliedDate
    };

    db.leaves = [newLeave, ...(db.leaves || []).filter(l => l.id !== leaveId)];
    saveDatabase(db);

    if (supabase) {
      const payload = {
        id: leaveId,
        employee_id: newLeave.employeeId,
        employee_name: newLeave.employeeName,
        leave_type: newLeave.leaveType,
        start_date: newLeave.startDate,
        end_date: newLeave.endDate,
        reason: newLeave.reason,
        status: newLeave.status,
        applied_date: newLeave.appliedDate
      };
      const { error } = await supabase.from("leaves").upsert(payload, { onConflict: "id" });
      if (error) {
        console.warn("Supabase 'leaves' table upsert warning:", error.message);
      } else {
        console.log(`Successfully synced leave ${leaveId} (${empName}) directly to Supabase PostgreSQL table.`);
      }
    }

    return NextResponse.json({ success: true, leave: newLeave });
  } catch (error) {
    return NextResponse.json({ error: "Failed to apply for leave" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, status } = await request.json();
    const db = loadDatabase();
    db.leaves = db.leaves.map(l => l.id === id ? { ...l, status } : l);
    saveDatabase(db);

    if (supabase) {
      const targetLeave = db.leaves.find(l => l.id === id);
      if (targetLeave) {
        await supabase.from("leaves").update({ status }).eq("id", id);
      }
    }

    return NextResponse.json({ success: true, id, status });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update leave status" }, { status: 500 });
  }
}
