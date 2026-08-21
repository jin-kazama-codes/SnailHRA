import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { Employee, capitalizeName } from "@/src/types";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { generateGuaranteedUniqueEmployeeId } from "@/src/lib/idGenerator";
import { toBranchId, toBranchName } from "@/src/lib/branchUtils";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = loadDatabase();
    const dbClient = supabaseAdmin || supabase;

    const resolvedCompanyId = body.companyId || body.company_id || "a1b2c3d4-0001-0001-0001-000000000001";
    let resolvedCompanyName = "Company";

    // Resolve company name and branch code prefixes dynamically
    if (dbClient && resolvedCompanyId) {
      try {
        const { data: compData } = await dbClient
          .from("companies")
          .select("name, branch_code_prefixes")
          .eq("id", resolvedCompanyId)
          .maybeSingle();
        if (compData) {
          if (compData.name) resolvedCompanyName = compData.name;
          if (compData.branch_code_prefixes && typeof compData.branch_code_prefixes === "object") {
            if (!db.branchCodePrefixes) db.branchCodePrefixes = {};
            Object.assign(db.branchCodePrefixes, compData.branch_code_prefixes);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch company info for onboard task:", err);
      }
    }

    const empBranch = body.branch || "";
    const bName = empBranch ? toBranchName(empBranch) : "";
    const bId = empBranch ? toBranchId(empBranch) : "";
    const branchPrefix = (db.branchCodePrefixes && (db.branchCodePrefixes[empBranch] || db.branchCodePrefixes[bName] || db.branchCodePrefixes[bId])) || db.empCodePrefix;
    const codePrefix = (body.empCodePrefix || branchPrefix || body.emp_code_prefix || "EMP").trim().toUpperCase();
    const generatedId = await generateGuaranteedUniqueEmployeeId(db.employees || [], dbClient, codePrefix);
    const empId = body.id || generatedId;

    const rawPassword = body.password || "Nawaz123#";
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(rawPassword, salt);

    const isPfExemptOnboard = Boolean(body.onboardIsPfExempt || body.isPfExempt || body.salaryPfMode === "exempt" || body.pfMode === "exempt");
    const isEsiExemptOnboard = Boolean(body.onboardIsEsiExempt || body.isEsiExempt || body.salaryEsiOptIn === false || body.esiOptIn === false);

    const pfModeVal = isPfExemptOnboard ? "exempt" : (body.salaryPfMode || body.pfMode || "percentage");
    const pfDeductionVal = isPfExemptOnboard ? 0 : (Number(body.salaryPf) || 0);

    const esiOptInVal = isEsiExemptOnboard ? false : (body.salaryEsiOptIn !== undefined ? Boolean(body.salaryEsiOptIn) : (body.esiOptIn !== undefined ? Boolean(body.esiOptIn) : true));
    const esiDeductionVal = isEsiExemptOnboard ? 0 : (Number(body.salaryEsi) || 0);

    const newEmp: Employee = {
      id: empId,
      companyId: resolvedCompanyId,
      prefix: body.prefix || "Mr",
      fullName: capitalizeName(body.fullName || "New Agent"),
      gender: body.gender || "Male",
      email: body.email || "",
      phone: body.phone || "+91 99999 88888",
      role: body.role || "employee",
      designationId: body.designationId || "des-4",
      department: body.department || "Information Technology",
      joiningDate: body.joiningDate || new Date().toISOString().split("T")[0],
      dateOfBirth: body.dateOfBirth || undefined,
      status: body.status || "Active",
      salary: body.salary || {
        basic: Number(body.salaryBasic) || 40000,
        hra: Number(body.salaryHra) || 16000,
        telephone: Number(body.salaryTelephone) || 0,
        fuel: Number(body.salaryFuel) || 0,
        professionalDev: Number(body.salaryProfDev) || 0,
        lta: Number(body.salaryLta) || 0,
        allowances: Number(body.salaryAllowances) || 8000,
        pfDeduction: pfDeductionVal,
        pfMode: pfModeVal,
        tdsDeduction: Number(body.salaryTds) || 0,
        tdsMode: body.salaryTdsMode || body.tdsMode || "slab",
        tdsOptIn: body.salaryTdsOptIn !== undefined ? Boolean(body.salaryTdsOptIn) : (body.tdsOptIn !== undefined ? Boolean(body.tdsOptIn) : true),
        esiOptIn: esiOptInVal,
        esiDeduction: esiDeductionVal
      },
      bankDetails: body.bankDetails || {
        accountNumber: body.bankAccount || "",
        bankName: body.bankName || "",
        ifsc: body.bankIfsc || ""
      },
      address: (body.address || "").trim() ? ((body.address || "").trim().charAt(0).toUpperCase() + (body.address || "").trim().slice(1)) : "",
      emergencyContact: body.emergencyContact || {
        name: body.emergencyName || "Guardian",
        relation: body.emergencyRelation || "Spouse",
        phone: body.emergencyPhone || "+91 99999 88888"
      },
      documents: body.documents || [],
      customFields: body.customFields || {
        pan: (body.pan || "").trim().toUpperCase(),
        uan: (body.uan || "").trim()
      },
      onboardingTasks: body.onboardingTasks || [
        { id: `tsk-auto-${empId}-1`, taskName: "Verify KYC and Identity proof", completed: false, dueDate: body.joiningDate || "2026-07-25" },
        { id: `tsk-auto-${empId}-2`, taskName: "Collect Bank Account proof & PAN card", completed: false, dueDate: body.joiningDate || "2026-07-27" },
        { id: `tsk-auto-${empId}-3`, taskName: `Allocate ${resolvedCompanyName} Credentials & Assets`, completed: false, dueDate: body.joiningDate || "2026-07-28" }
      ],
      avatarUrl: body.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop",
      bio: (body.bio || "").trim() ? ((body.bio || "").trim().charAt(0).toUpperCase() + (body.bio || "").trim().slice(1)) : "",
      branch: bName || (body.branch ? toBranchName(body.branch) : "Shashtri Nagar"),
      employmentType: body.employmentType || body.employment_type || "",
      password: hashedPassword
    };

    db.employees.push(newEmp);

    // Sync PF & ESI exemptions with tenant payroll_configurations
    if (isPfExemptOnboard || isEsiExemptOnboard) {
      const existingCfg = db.payrollConfigs[resolvedCompanyId];
      const cfg = existingCfg
        ? { ...existingCfg }
        : { companyId: resolvedCompanyId, hraType: "percentage" as const, hraValue: 40, pfType: "percentage" as const, pfValue: 12, pfModeDefault: "percentage" as const, pfExemptEmployeeIds: [], allowancesType: "percentage" as const, allowancesValue: 20, taxType: "percentage" as const, taxValue: 5, tdsOptInDefault: true, tdsModeDefault: "slab" as const, esiEnabled: true, esiRatePercentage: 0.75, esiGrossCeiling: 21000, esiExemptEmployeeIds: [], ltaValue: 0, ltaType: "percentage" as const, telephoneValue: 0, telephoneType: "percentage" as const, fuelValue: 0, fuelType: "percentage" as const, professionalDevValue: 0, professionalDevType: "percentage" as const };
      let pfExempts = cfg.pfExemptEmployeeIds || [];
      if (isPfExemptOnboard && !pfExempts.includes(empId)) {
        pfExempts = [...pfExempts, empId];
      }
      let esiExempts = cfg.esiExemptEmployeeIds || [];
      if (isEsiExemptOnboard && !esiExempts.includes(empId)) {
        esiExempts = [...esiExempts, empId];
      }
      cfg.pfExemptEmployeeIds = pfExempts;
      cfg.esiExemptEmployeeIds = esiExempts;
      db.payrollConfigs[resolvedCompanyId] = cfg;

      if (dbClient) {
        try {
          const { error: updateErr } = await dbClient
            .from("payroll_configurations")
            .update({
              pf_exempt_employee_ids: pfExempts,
              esi_exempt_employee_ids: esiExempts,
              updated_at: new Date().toISOString()
            })
            .eq("company_id", resolvedCompanyId);

          if (updateErr) {
            console.warn("Failed to update tenant exemption config on employee onboard:", updateErr);
          }
        } catch (cfgErr) {
          console.warn("Failed to sync tenant exemption config on employee onboard:", cfgErr);
        }
      }
    }

    saveDatabase(db);

    if (dbClient) {
      try {
        const postUpsertData: any = {
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
          branch: toBranchName(newEmp.branch),
          employment_type: newEmp.employmentType || null,
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
          salary_telephone: newEmp.salary?.telephone || 0,
          salary_fuel: newEmp.salary?.fuel || 0,
          salary_professional_dev: newEmp.salary?.professionalDev || 0,
          salary_lta: newEmp.salary?.lta || 0,
          salary_allowances: newEmp.salary?.allowances,
          salary_pf_deduction: newEmp.salary?.pfDeduction,
          salary_pf_mode: newEmp.salary?.pfMode || null,
          salary_tds_deduction: newEmp.salary?.tdsDeduction ?? 0,
          salary_tds_opt_in: newEmp.salary?.tdsOptIn !== undefined ? newEmp.salary.tdsOptIn : null,
          salary_tds_mode: newEmp.salary?.tdsMode || "slab",
          salary_esi_opt_in: newEmp.salary?.esiOptIn !== undefined ? newEmp.salary.esiOptIn : null,
          salary_esi_deduction: newEmp.salary?.esiDeduction ?? 0,
          bank_account_number: newEmp.bankDetails?.accountNumber,
          bank_name: newEmp.bankDetails?.bankName,
          bank_ifsc: newEmp.bankDetails?.ifsc,
          password: newEmp.password,
          pan: (newEmp.customFields?.pan as string) || (newEmp as any).pan || null,
          uan: (newEmp.customFields?.uan as string) || (newEmp as any).uan || null,
          custom_fields: newEmp.customFields || {
            pan: (newEmp.customFields?.pan as string) || (newEmp as any).pan || "",
            uan: (newEmp.customFields?.uan as string) || (newEmp as any).uan || ""
          }
        };

        const { error: upsertErr } = await dbClient.from("employees").upsert(postUpsertData);
        if (upsertErr) {
          console.warn("Supabase POST full upsert error, trying fallback without new columns:", upsertErr.message);
          const { salary_pf_mode, salary_tds_opt_in, salary_tds_mode, salary_esi_opt_in, salary_esi_deduction, ...fallbackRecord } = postUpsertData;
          const { error: fbErr } = await dbClient.from("employees").upsert(fallbackRecord);
          if (fbErr) {
            console.warn("Supabase fallback POST upsert error:", fbErr.message);
          }
        }
      } catch (sbErr) {
        console.warn("Supabase sync warning:", sbErr);
      }
    }

    return NextResponse.json({ success: true, employee: newEmp });
  } catch (error) {
    console.error("Failed to onboard employee:", error);
    return NextResponse.json({ error: "Failed to add employee" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const updatedEmp: Employee = await request.json();
    updatedEmp.fullName = capitalizeName(updatedEmp.fullName);
    if (updatedEmp.password) {
      const isAlreadyHashed = typeof updatedEmp.password === "string" && /^\$2[aby]\$/.test(updatedEmp.password);
      if (!isAlreadyHashed) {
        const salt = bcrypt.genSaltSync(10);
        updatedEmp.password = bcrypt.hashSync(updatedEmp.password, salt);
      }
    }
    const db = loadDatabase();
    if (!db.employees) db.employees = [];
    const index = db.employees.findIndex(e => e.id === updatedEmp.id);
    if (index >= 0) {
      db.employees[index] = updatedEmp;
    } else {
      db.employees.push(updatedEmp);
    }
    saveDatabase(db);

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        const upsertRecord: any = {
          id: updatedEmp.id,
          company_id: updatedEmp.companyId,
          prefix: updatedEmp.prefix || null,
          full_name: updatedEmp.fullName,
          gender: updatedEmp.gender || null,
          email: updatedEmp.email,
          phone: updatedEmp.phone,
          role: updatedEmp.role,
          designation_id: updatedEmp.designationId,
          department: updatedEmp.department,
          branch: toBranchName(updatedEmp.branch),
          employment_type: updatedEmp.employmentType || null,
          joining_date: updatedEmp.joiningDate,
          date_of_birth: updatedEmp.dateOfBirth || null,
          status: updatedEmp.status,
          address: updatedEmp.address,
          emergency_contact_name: updatedEmp.emergencyContact?.name,
          emergency_contact_relation: updatedEmp.emergencyContact?.relation,
          emergency_contact_phone: updatedEmp.emergencyContact?.phone,
          avatar_url: updatedEmp.avatarUrl,
          bio: updatedEmp.bio,
          salary_basic: updatedEmp.salary?.basic,
          salary_hra: updatedEmp.salary?.hra,
          salary_telephone: updatedEmp.salary?.telephone || 0,
          salary_fuel: updatedEmp.salary?.fuel || 0,
          salary_professional_dev: updatedEmp.salary?.professionalDev || 0,
          salary_lta: updatedEmp.salary?.lta || 0,
          salary_allowances: updatedEmp.salary?.allowances,
          salary_pf_deduction: updatedEmp.salary?.pfDeduction,
          salary_pf_mode: updatedEmp.salary?.pfMode || null,
          salary_tds_deduction: updatedEmp.salary?.tdsDeduction ?? 0,
          salary_tds_opt_in: updatedEmp.salary?.tdsOptIn !== undefined ? updatedEmp.salary.tdsOptIn : null,
          salary_tds_mode: updatedEmp.salary?.tdsMode || "slab",
          salary_esi_opt_in: updatedEmp.salary?.esiOptIn !== undefined ? updatedEmp.salary.esiOptIn : null,
          salary_esi_deduction: updatedEmp.salary?.esiDeduction ?? 0,
          bank_account_number: updatedEmp.bankDetails?.accountNumber,
          bank_name: updatedEmp.bankDetails?.bankName,
          bank_ifsc: updatedEmp.bankDetails?.ifsc,
          password: updatedEmp.password,
          pan: (updatedEmp.customFields?.pan as string) || (updatedEmp as any).pan || null,
          uan: (updatedEmp.customFields?.uan as string) || (updatedEmp as any).uan || null,
          custom_fields: updatedEmp.customFields || {
            pan: (updatedEmp.customFields?.pan as string) || (updatedEmp as any).pan || "",
            uan: (updatedEmp.customFields?.uan as string) || (updatedEmp as any).uan || ""
          }
        };
        const { error: upsertErr } = await dbClient.from("employees").upsert(upsertRecord);
        if (upsertErr) {
          console.warn("Supabase full upsert error, trying fallback without new columns:", upsertErr.message);
          const { salary_pf_mode, salary_tds_opt_in, salary_tds_mode, salary_esi_opt_in, salary_esi_deduction, ...fallbackRecord } = upsertRecord;
          const { error: fbErr } = await dbClient.from("employees").upsert(fallbackRecord);
          if (fbErr) {
            console.warn("Supabase fallback upsert error:", fbErr.message);
          }
        }
      } catch (sbErr) {
        console.warn("Supabase PUT sync warning:", sbErr);
      }
    }

    return NextResponse.json({ success: true, employee: updatedEmp });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const db = loadDatabase();
    db.employees = db.employees.filter(e => e.id !== id);
    saveDatabase(db);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
  }
}

