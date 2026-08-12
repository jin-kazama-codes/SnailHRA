import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { Employee } from "@/src/types";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawEmployees = Array.isArray(body) ? body : (body.employees || []);

    if (!rawEmployees.length) {
      return NextResponse.json({ error: "No employee data provided" }, { status: 400 });
    }

    const resolvedCompanyId = (!Array.isArray(body) && (body.companyId || body.company_id)) || "a1b2c3d4-0001-0001-0001-000000000001";
    let resolvedCompanyName = "Company";

    // Resolve company name dynamically for onboarding task details
    const dbClient = supabaseAdmin || supabase;
    if (dbClient && resolvedCompanyId) {
      try {
        const { data: compData } = await dbClient
          .from("companies")
          .select("name")
          .eq("id", resolvedCompanyId)
          .maybeSingle();
        if (compData && compData.name) {
          resolvedCompanyName = compData.name;
        }
      } catch (err) {
        console.warn("Failed to fetch company name for bulk onboard task:", err);
      }
    }

    const db = loadDatabase();
    if (!db.employees) db.employees = [];



    const createdEmployees: Employee[] = [];
    const todayStr = new Date().toISOString().split("T")[0];
    const defaultPasswordHash = bcrypt.hashSync("Pass@1234", bcrypt.genSaltSync(10));

    // Determine highest existing ID number
    let maxNum = 1000;
    db.employees.forEach(e => {
      const match = e.id?.match(/EMP-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    for (let index = 0; index < rawEmployees.length; index++) {
      const item = rawEmployees[index];
      maxNum++;
      let empId = item.id;
      if (!empId || db.employees.some(e => e.id === empId)) {
        empId = `EMP-${maxNum}`;
      }

      // Custom fields (all keys that are not standard properties)
      const customFields = item.customFields || {};

      // Determine password hash
      const passwordHash = item.password
        ? bcrypt.hashSync(item.password, bcrypt.genSaltSync(10))
        : defaultPasswordHash;

      // Extract & format designation
      let desgId = item.designationId || "des-4";
      if (!item.designationId && item.designationTitle) {
        const MGM_COMPANY_ID = "a1b2c3d4-0001-0001-0001-000000000001";
        const matchedDesg = db.designations?.find(
          d => d.title.toLowerCase() === String(item.designationTitle).toLowerCase() &&
               (d.companyId || (d as any).company_id || MGM_COMPANY_ID) === resolvedCompanyId
        );
        if (matchedDesg) desgId = matchedDesg.id;
      }

      const newEmp: Employee = {
        id: empId,
        companyId: resolvedCompanyId,
        prefix: item.prefix || undefined,
        fullName: item.fullName || item.name || `Employee ${maxNum}`,
        gender: item.gender || undefined,
        email: item.email || `emp_${maxNum}_${Date.now().toString().slice(-4)}@company.com`,
        phone: item.phone || "+91 99999 00000",
        role: item.role === "admin" || item.role === "hr" ? item.role : "employee",
        designationId: desgId,
        department: item.department || "Loans",
        joiningDate: item.joiningDate || todayStr,
        dateOfBirth: item.dateOfBirth || item.date_of_birth || item.dob || undefined,
        status: item.status === "Probation" || item.status === "Suspended" ? item.status : "Active",
        salary: {
          basic: Number(item.salary?.basic ?? item.salaryBasic ?? 40000),
          hra: Number(item.salary?.hra ?? item.salaryHra ?? 16000),
          allowances: Number(item.salary?.allowances ?? item.salaryAllowances ?? 8000),
          pfDeduction: Number(item.salary?.pfDeduction ?? item.salaryPf ?? 3600),
          tdsDeduction: Number(item.salary?.tdsDeduction ?? item.salaryTds ?? 0)
        },
        bankDetails: {
          accountNumber: String(item.bankDetails?.accountNumber ?? item.bankAccount ?? `999${Math.floor(10000000 + Math.random() * 90000000)}`),
          bankName: String(item.bankDetails?.bankName ?? item.bankName ?? "State Bank of India"),
          ifsc: String(item.bankDetails?.ifsc ?? item.bankIfsc ?? "SBIN0001234")
        },
        address: item.address || "N/A",
        emergencyContact: {
          name: item.emergencyContact?.name ?? item.emergencyName ?? "Guardian",
          relation: item.emergencyContact?.relation ?? item.emergencyRelation ?? "Spouse",
          phone: item.emergencyContact?.phone ?? item.emergencyPhone ?? "+91 99999 88888"
        },
        documents: item.documents || [],
        onboardingTasks: item.onboardingTasks || [
          { id: `tsk-auto-${empId}-1`, taskName: "Verify KYC and Identity proof", completed: false, dueDate: todayStr },
          { id: `tsk-auto-${empId}-2`, taskName: "Collect Bank Account proof & PAN card", completed: false, dueDate: todayStr },
          { id: `tsk-auto-${empId}-3`, taskName: `Allocate ${resolvedCompanyName} Credentials & Assets`, completed: false, dueDate: todayStr }
        ],
        avatarUrl: item.avatarUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop`,
        bio: item.bio || "",
        branch: item.branch || "Mumbai Branch",
        password: passwordHash,
        customFields: customFields
      };

      db.employees.push(newEmp);
      createdEmployees.push(newEmp);

      if (supabase) {
        try {
          await supabase.from("employees").upsert({
            id: newEmp.id,
            company_id: newEmp.companyId,
            prefix: newEmp.prefix || null,
            full_name: newEmp.fullName,
            gender: newEmp.gender || null,
            email: newEmp.email,
            phone: newEmp.phone,
            role: newEmp.role,
            designation_id: newEmp.designationId,
            department: newEmp.department,
            branch: newEmp.branch,
            joining_date: newEmp.joiningDate,
            date_of_birth: newEmp.dateOfBirth || null,
            status: newEmp.status,
            address: newEmp.address,
            emergency_contact_name: newEmp.emergencyContact?.name,
            emergency_contact_relation: newEmp.emergencyContact?.relation,
            emergency_contact_phone: newEmp.emergencyContact?.phone,
            avatar_url: newEmp.avatarUrl,
            bio: newEmp.bio,
            salary_basic: newEmp.salary?.basic,
            salary_hra: newEmp.salary?.hra,
            salary_allowances: newEmp.salary?.allowances,
            salary_pf_deduction: newEmp.salary?.pfDeduction,
            salary_tds_deduction: newEmp.salary?.tdsDeduction,
            bank_account_number: newEmp.bankDetails?.accountNumber,
            bank_name: newEmp.bankDetails?.bankName,
            bank_ifsc: newEmp.bankDetails?.ifsc,
            password: newEmp.password
          });
        } catch (sbErr) {
          console.warn("Supabase bulk insert warning for emp " + newEmp.id, sbErr);
        }
      }
    }

    // Record Excel Upload Audit History (Date-wise, newest on top)
    if (!db.excelUploads) db.excelUploads = [];
    const filename = body.filename || `Employee_Import_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const uploadedByName = body.uploadedByName || "Admin User";
    const uploadedById = body.uploadedById || "";

    // Extract unique detected custom field headers across all rows
    const detectedFieldsSet = new Set<string>();
    createdEmployees.forEach(emp => {
      if (emp.customFields) {
        Object.keys(emp.customFields).forEach(k => detectedFieldsSet.add(k));
      }
    });
    const detectedCustomFields = Array.from(detectedFieldsSet);

    const uploadRecord = {
      id: `IMP-${Date.now()}`,
      filename,
      uploadedAt: new Date().toISOString(),
      uploadedByName,
      uploadedById,
      recordCount: createdEmployees.length,
      detectedCustomFields,
      status: "Success" as const,
      fileData: body.fileData || ""
    };

    // Prepend so newest is at index 0
    db.excelUploads.unshift(uploadRecord);

    if (supabase) {
      try {
        await supabase.from("excel_uploads").insert({
          id: uploadRecord.id,
          filename: uploadRecord.filename,
          uploaded_at: uploadRecord.uploadedAt,
          uploaded_by_name: uploadRecord.uploadedByName,
          uploaded_by_id: uploadRecord.uploadedById,
          record_count: uploadRecord.recordCount,
          detected_custom_fields: uploadRecord.detectedCustomFields,
          status: uploadRecord.status,
          file_data: uploadRecord.fileData
        });
      } catch (sbErr) {
        console.warn("Supabase excel_uploads insert warning:", sbErr);
      }
    }

    saveDatabase(db);
    return NextResponse.json({
      success: true,
      count: createdEmployees.length,
      employees: createdEmployees,
      uploadRecord
    });
  } catch (error: any) {
    console.error("Bulk employee onboarding error:", error);
    return NextResponse.json({ error: "Failed to add bulk employees: " + (error?.message || String(error)) }, { status: 500 });
  }
}
