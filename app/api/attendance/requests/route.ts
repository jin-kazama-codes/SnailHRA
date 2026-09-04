import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { AttendanceRequest, AttendancePunch } from "@/src/types";
import { supabase, syncPunchToSupabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = loadDatabase();
    const dbClient = supabaseAdmin || supabase;

    if (dbClient) {
      try {
        const { data, error } = await dbClient.from("attendance_requests").select("*");
        if (!error && Array.isArray(data)) {
          db.attendanceRequests = data.map((row: any) => ({
            id: row.id,
            employeeId: row.employee_id || row.employeeId,
            employeeName: row.employee_name || row.employeeName,
            companyId: row.company_id || row.companyId,
            branch: row.branch,
            department: row.department,
            date: row.date,
            requestType: row.request_type || row.requestType || "Travel",
            clockInTime: row.clock_in_time || row.clockInTime,
            clockOutTime: row.clock_out_time || row.clockOutTime,
            location: row.location,
            reason: row.reason,
            status: row.status,
            appliedAt: row.applied_at || row.appliedAt,
            reviewedBy: row.reviewed_by || row.reviewedBy,
            reviewedById: row.reviewed_by_id || row.reviewedById,
            reviewedAt: row.reviewed_at || row.reviewedAt,
            reviewRemarks: row.review_remarks || row.reviewRemarks,
          }));
          saveDatabase(db);
        }
      } catch (err) {
        console.warn("Supabase attendance_requests fetch warning:", err);
      }
    }

    let requests: AttendanceRequest[] = db.attendanceRequests || [];

    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");
    const status = url.searchParams.get("status");
    const branch = url.searchParams.get("branch");

    if (employeeId) {
      requests = requests.filter(r => r.employeeId === employeeId);
    }
    if (status && status !== "all") {
      requests = requests.filter(r => r.status.toLowerCase() === status.toLowerCase());
    }
    if (branch && branch !== "All Branches") {
      requests = requests.filter(r => r.branch === branch);
    }

    // Sort newest first
    requests.sort((a, b) => new Date(b.appliedAt || b.date).getTime() - new Date(a.appliedAt || a.date).getTime());

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Failed to fetch attendance requests:", error);
    return NextResponse.json({ error: "Failed to fetch attendance requests" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employeeId,
      employeeName,
      companyId,
      branch,
      department,
      date,
      requestType,
      clockInTime,
      clockOutTime,
      location,
      reason
    } = body;

    if (!employeeId || !date || !clockInTime || !location || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: employeeId, date, clockInTime, location, and reason are required." },
        { status: 400 }
      );
    }

    const db = loadDatabase();
    if (!db.attendanceRequests) db.attendanceRequests = [];

    // Lookup employee details if missing
    const emp = db.employees?.find(e => e.id === employeeId);
    const resolvedName = employeeName || emp?.fullName || employeeId;
    const resolvedBranch = branch || emp?.branch || "";
    const resolvedDept = department || emp?.department || "";
    const resolvedCompanyId = companyId || emp?.companyId || (emp as any)?.company_id || null;

    const newRequest: AttendanceRequest = {
      id: "att-req-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      employeeId,
      employeeName: resolvedName,
      companyId: resolvedCompanyId || undefined,
      branch: resolvedBranch,
      department: resolvedDept,
      date,
      requestType: requestType || "Travel",
      clockInTime,
      clockOutTime: clockOutTime || undefined,
      location,
      reason,
      status: "Pending",
      appliedAt: new Date().toISOString()
    };

    db.attendanceRequests.unshift(newRequest);
    saveDatabase(db);

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        const payload: any = {
          id: newRequest.id,
          employee_id: newRequest.employeeId,
          employee_name: newRequest.employeeName,
          company_id: resolvedCompanyId || null,
          branch: newRequest.branch || null,
          department: newRequest.department || null,
          date: newRequest.date,
          request_type: newRequest.requestType,
          clock_in_time: newRequest.clockInTime,
          clock_out_time: newRequest.clockOutTime || null,
          location: newRequest.location,
          reason: newRequest.reason,
          status: newRequest.status,
          applied_at: newRequest.appliedAt
        };

        const { error } = await dbClient.from("attendance_requests").upsert(payload, { onConflict: "id" });
        if (error) {
          console.error("❌ Supabase attendance_requests upsert error:", error.message, error.details);
        } else {
          console.log("✅ Supabase attendance_requests saved successfully:", newRequest.id);
        }
      } catch (err) {
        console.warn("Supabase attendance_requests sync note:", err);
      }
    }

    return NextResponse.json({ success: true, request: newRequest });
  } catch (error) {
    console.error("Failed to create attendance request:", error);
    return NextResponse.json({ error: "Failed to submit attendance request" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { requestId, status, reviewedBy, reviewedById, reviewRemarks } = body;

    if (!requestId || !status) {
      return NextResponse.json({ error: "requestId and status are required." }, { status: 400 });
    }

    if (status !== "Approved" && status !== "Rejected") {
      return NextResponse.json({ error: "Status must be either 'Approved' or 'Rejected'." }, { status: 400 });
    }

    const db = loadDatabase();
    if (!db.attendanceRequests) db.attendanceRequests = [];
    if (!db.attendance) db.attendance = [];

    const reqIndex = db.attendanceRequests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) {
      return NextResponse.json({ error: "Attendance request not found." }, { status: 404 });
    }

    const targetReq = db.attendanceRequests[reqIndex];
    targetReq.status = status;
    targetReq.reviewedBy = reviewedBy || "HR / Admin";
    targetReq.reviewedById = reviewedById || "";
    targetReq.reviewedAt = new Date().toISOString();
    if (reviewRemarks) {
      targetReq.reviewRemarks = reviewRemarks;
    }

    let createdOrUpdatedPunch: AttendancePunch | null = null;

    // CRITICAL REQUIREMENT:
    // If HR or Admin accepts it, ONLY THEN should attendance get saved.
    if (status === "Approved") {
      // Build ISO strings for clockIn and clockOut based on the requested date and time
      const buildIso = (dateStr: string, timeStr: string) => {
        try {
          const [hh, mm] = timeStr.split(":").map(s => s.trim().padStart(2, "0"));
          const d = new Date(`${dateStr}T${hh || "09"}:${mm || "00"}:00`);
          return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
        } catch {
          return new Date().toISOString();
        }
      };

      const clockInIso = buildIso(targetReq.date, targetReq.clockInTime);
      const clockOutIso = targetReq.clockOutTime ? buildIso(targetReq.date, targetReq.clockOutTime) : null;

      // Check if a punch record already exists for this employee on this date
      const existingPunchIdx = db.attendance.findIndex(
        a => a.employeeId === targetReq.employeeId && a.date === targetReq.date
      );

      const travelNote = `[${targetReq.requestType} Approved by ${targetReq.reviewedBy}] Loc: ${targetReq.location} - ${targetReq.reason}${targetReq.reviewRemarks ? ` (Note: ${targetReq.reviewRemarks})` : ""}`;

      if (existingPunchIdx >= 0) {
        db.attendance[existingPunchIdx] = {
          ...db.attendance[existingPunchIdx],
          clockIn: clockInIso,
          clockOut: clockOutIso ?? db.attendance[existingPunchIdx].clockOut,
          status: "Present",
          workFromHome: true,
          notes: travelNote
        };
        createdOrUpdatedPunch = db.attendance[existingPunchIdx];
      } else {
        const newPunch: AttendancePunch = {
          id: "punch-trv-" + Date.now(),
          employeeId: targetReq.employeeId,
          date: targetReq.date,
          clockIn: clockInIso,
          clockOut: clockOutIso,
          breaks: [],
          status: "Present",
          workFromHome: true,
          notes: travelNote,
          totalBreakDuration: "00h 00m"
        };
        db.attendance.push(newPunch);
        createdOrUpdatedPunch = newPunch;
      }
    }

    saveDatabase(db);

    if (status === "Approved" && createdOrUpdatedPunch) {
      syncPunchToSupabase(createdOrUpdatedPunch).catch(e => console.warn("Supabase punch sync warning:", e));
    }

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        const { error } = await dbClient.from("attendance_requests").update({
          status: targetReq.status,
          reviewed_by: targetReq.reviewedBy || null,
          reviewed_by_id: targetReq.reviewedById || null,
          reviewed_at: targetReq.reviewedAt,
          review_remarks: targetReq.reviewRemarks || null
        }).eq("id", targetReq.id);
        if (error) {
          console.error("❌ Supabase attendance_requests update error:", error.message, error.details);
        }
      } catch (err) {
        console.warn("Supabase attendance_requests update note:", err);
      }
    }

    return NextResponse.json({
      success: true,
      request: targetReq,
      punch: createdOrUpdatedPunch
    });
  } catch (error) {
    console.error("Failed to review attendance request:", error);
    return NextResponse.json({ error: "Failed to process review" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id parameter is required." }, { status: 400 });
    }

    const db = loadDatabase();
    if (!db.attendanceRequests) db.attendanceRequests = [];

    db.attendanceRequests = db.attendanceRequests.filter(r => r.id !== id);
    saveDatabase(db);

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        const { error } = await dbClient.from("attendance_requests").delete().eq("id", id);
        if (error) {
          console.error("❌ Supabase attendance_requests delete error:", error.message);
        }
      } catch (err) {
        console.warn("Supabase attendance_requests delete note:", err);
      }
    }

    return NextResponse.json({ success: true, message: "Attendance request deleted." });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete request" }, { status: 500 });
  }
}
