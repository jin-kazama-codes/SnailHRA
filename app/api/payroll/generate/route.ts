import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { updateFineStatusInSupabase, syncPayslipToSupabase, supabase } from "@/src/lib/supabase";
import { Payslip, SimulatedEmail } from "@/src/types";
async function syncLocalDbWithSupabase(db: any) {
  if (!supabase) return;
  try {
    const { data: empRows } = await supabase.from("employees").select("*");
    if (empRows && empRows.length > 0) {
      db.employees = empRows.map((row: any) => {
        const bankDetailsFromRow = typeof row.bank_details === "string" ? JSON.parse(row.bank_details) : row.bank_details;
        const salaryFromRow = typeof row.salary === "string" ? JSON.parse(row.salary) : row.salary;
        return {
          id: row.id,
          fullName: row.full_name || row.fullName || "",
          email: row.email || "",
          phone: row.phone || "",
          role: row.role || "employee",
          designationId: row.designation_id || row.designationId || "des-4",
          department: row.department || "Loans",
          branch: row.branch || row.branch_name || "Mumbai Branch",
          joiningDate: row.joining_date || row.joiningDate || "2024-03-15",
          status: row.status || "Active",
          salary: {
            basic: Number(row.salary_basic ?? salaryFromRow?.basic ?? 45000),
            hra: Number(row.salary_hra ?? salaryFromRow?.hra ?? 18000),
            allowances: Number(row.salary_allowances ?? salaryFromRow?.allowances ?? 0),
            telephone: Number(salaryFromRow?.telephone ?? 0),
            fuel: Number(salaryFromRow?.fuel ?? 0),
            professionalDev: Number(salaryFromRow?.professionalDev ?? 0),
            lta: Number(salaryFromRow?.lta ?? 0),
            pfDeduction: Number(row.salary_pf_deduction ?? salaryFromRow?.pfDeduction ?? 0),
            pfMode: salaryFromRow?.pfMode || undefined,
            tdsDeduction: Number(row.salary_tds_deduction ?? salaryFromRow?.tdsDeduction ?? 0),
            tdsOptIn: salaryFromRow?.tdsOptIn !== undefined ? salaryFromRow.tdsOptIn : true,
            tdsMode: salaryFromRow?.tdsMode || "slab",
            esiOptIn: salaryFromRow?.esiOptIn !== undefined ? salaryFromRow.esiOptIn : true,
            esiDeduction: Number(salaryFromRow?.esiDeduction ?? 0),
          },
          bankDetails: {
            accountNumber: String(row.bank_account_number ?? bankDetailsFromRow?.accountNumber ?? ""),
            bankName: String(row.bank_name ?? bankDetailsFromRow?.bankName ?? ""),
            ifsc: String(row.bank_ifsc ?? bankDetailsFromRow?.ifsc ?? "")
          },
          companyId: row.company_id || row.companyId || "a1b2c3d4-0001-0001-0001-000000000001",
          address: row.address || "",

          emergencyContact: { name: "", relation: "", phone: "" },
          documents: [],
          onboardingTasks: [],
          avatarUrl: row.avatar_url || "",
          bio: row.bio || "",
          password: row.password || ""
        };
      });
    }

    const { data: fineRows } = await supabase.from("fines").select("*");
    if (fineRows) {
      db.fines = fineRows.map((row: any) => ({
        id: row.id,
        employeeId: row.employee_id || row.employeeId || "",
        employeeName: row.employee_name || row.employeeName || "",
        reason: row.reason || "Late Coming",
        amount: Number(row.amount) || 0,
        date: row.date || "",
        status: row.status || "Pending"
      }));
    }

    const { data: slipsRows } = await supabase.from("payslips").select("*");
    if (slipsRows) {
      db.payslips = slipsRows.map((row: any) => ({
        id: row.id,
        employeeId: row.employee_id || row.employeeId || "",
        month: row.month || "",
        basic: Number(row.basic) || 0,
        hra: Number(row.hra) || 0,
        allowances: Number(row.allowances) || 0,
        finesDeducted: Number(row.fines_deducted ?? row.finesDeducted ?? 0),
        pfDeduction: Number(row.pf_deduction ?? row.pfDeduction ?? 0),
        taxDeduction: Number(row.tax_deduction ?? row.taxDeduction ?? 0),
        netPay: Number(row.net_pay ?? row.netPay ?? 0),
        status: row.status || "Generated",
        generatedAt: row.generated_at || row.generatedAt || "",
        sentToEmail: row.sent_to_email || row.sentToEmail || ""
      }));
    }
  } catch (err) {
    console.warn("Failed to sync local DB state from Supabase:", err);
  }
}

export async function POST(request: Request) {
  try {
    const { employeeId, month, companyId: reqCompanyId } = await request.json();
    if (!employeeId || !month) {
      return NextResponse.json({ error: "Employee ID and Month are required" }, { status: 400 });
    }

    const db = loadDatabase();
    await syncLocalDbWithSupabase(db);

    const employee = db.employees.find(e => e.id === employeeId);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Check if already exists for this employee + month
    const exists = db.payslips.find(p => p.employeeId === employeeId && p.month === month);
    if (exists) {
      return NextResponse.json({ error: `Payslip already generated for ${employee.fullName} for ${month}` }, { status: 400 });
    }

    // Smart resolution for tenant PayrollConfig
    const empCompanyId = (employee as any).companyId || (employee as any).company_id;
    let config: any = null;

    if (reqCompanyId && db.payrollConfigs?.[reqCompanyId]) {
      config = db.payrollConfigs[reqCompanyId];
    } else if (empCompanyId && db.payrollConfigs?.[empCompanyId]) {
      config = db.payrollConfigs[empCompanyId];
    } else {
      // Look for any tenant config that contains this employeeId in pfExemptEmployeeIds
      const exemptConfigKey = Object.keys(db.payrollConfigs || {}).find(k => 
        Array.isArray(db.payrollConfigs[k]?.pfExemptEmployeeIds) && db.payrollConfigs[k].pfExemptEmployeeIds.includes(employeeId)
      );
      if (exemptConfigKey) {
        config = db.payrollConfigs[exemptConfigKey];
      } else {
        const firstKey = Object.keys(db.payrollConfigs || {})[0];
        config = firstKey ? db.payrollConfigs[firstKey] : null;
      }
    }

    if (!config) {
      config = {
        hraType: "percentage",
        hraValue: 40,
        pfType: "percentage",
        pfValue: 12,
        pfExemptEmployeeIds: [],
        allowancesType: "percentage",
        allowancesValue: 20,
        taxType: "percentage",
        taxValue: 5,
      };
    }


    const basic = Number(employee.salary?.basic) || 45000;

    // Calculate HRA & Allowances based on config rules
    const hra = config.hraType === "percentage"
      ? Math.round(basic * (config.hraValue / 100))
      : config.hraValue;

    // For each allowance component: use employee's individually-set value first (from "Adjust Allowances" modal save),
    // if not set fall back to the tenant config formula (same as the Live Salary Simulator)
    const storedTel = Number(employee.salary?.telephone);
    const storedFuel = Number(employee.salary?.fuel);
    const storedProfDev = Number(employee.salary?.professionalDev);
    const storedLta = Number(employee.salary?.lta);

    const configTelephone = config.telephoneType === "percentage"
      ? Math.round(basic * ((config.telephoneValue || 0) / 100))
      : (config.telephoneValue || 0);
    const configFuel = config.fuelType === "percentage"
      ? Math.round(basic * ((config.fuelValue || 0) / 100))
      : (config.fuelValue || 0);
    const configProfDev = config.professionalDevType === "percentage"
      ? Math.round(basic * ((config.professionalDevValue || 0) / 100))
      : (config.professionalDevValue || 0);
    const configLta = config.ltaType === "percentage"
      ? Math.round(basic * ((config.ltaValue || 0) / 100))
      : (config.ltaValue || 0);

    const telephone = storedTel > 0 ? storedTel : configTelephone;
    const fuel = storedFuel > 0 ? storedFuel : configFuel;
    const professionalDev = storedProfDev > 0 ? storedProfDev : configProfDev;
    const lta = storedLta > 0 ? storedLta : configLta;

    // Special/general allowances: use employee's stored value, or compute from config
    const storedAllowances = Number(employee.salary?.allowances);
    const allowances = storedAllowances > 0
      ? storedAllowances
      : (config.allowancesType === "percentage"
          ? Math.round(basic * (config.allowancesValue / 100))
          : config.allowancesValue);

    const gross = basic + hra + telephone + fuel + professionalDev + lta + allowances;

    // Calculate PF Deduction
    const isPfExempt = (
      (Array.isArray(config?.pfExemptEmployeeIds) && config.pfExemptEmployeeIds.includes(employeeId)) ||
      Object.values(db.payrollConfigs || {}).some((c: any) =>
        Array.isArray(c?.pfExemptEmployeeIds) && c.pfExemptEmployeeIds.includes(employeeId)
      )
    );

    let pf = 0;
    if (isPfExempt) {
      pf = 0;
    } else if (employee.salary?.pfMode === "fixed_1800") {
      pf = 1800;
    } else if (employee.salary?.pfMode === "custom" && employee.salary.pfDeduction !== undefined) {
      pf = employee.salary.pfDeduction;
    } else if (config.pfModeDefault === "fixed_1800") {
      pf = 1800;
    } else {
      pf = employee.salary?.pfDeduction || (
        config.pfType === "percentage"
          ? Math.round(basic * (config.pfValue / 100))
          : config.pfValue
      );
    }

    // Find pending fines for this employee to deduct
    const pendingFines = db.fines.filter(f => f.employeeId === employeeId && f.status === "Deducted From Payroll");
    const finesDeduction = pendingFines.reduce((sum, f) => sum + f.amount, 0);

    // Calculate Tax/TDS
    let tax = 0;
    if (employee.salary?.tdsOptIn === false) {
      tax = 0;
    } else if (employee.salary?.tdsMode === "custom" && employee.salary.tdsDeduction !== undefined) {
      tax = employee.salary.tdsDeduction;
    } else if (employee.salary?.tdsDeduction !== undefined && employee.salary.tdsDeduction > 0) {
      tax = employee.salary.tdsDeduction;
    } else {
      tax = config.taxType === "percentage"
        ? Math.round(gross * (config.taxValue / 100))
        : config.taxValue;
    }

    // Calculate ESI Deduction
    let esi = 0;
    if (employee.salary?.esiOptIn === false) {
      esi = 0;
    } else if (employee.salary?.esiDeduction !== undefined && employee.salary.esiDeduction > 0) {
      esi = employee.salary.esiDeduction;
    } else if (config.esiEnabled !== false && gross <= (config.esiGrossCeiling || 21000)) {
      esi = Math.round(gross * ((config.esiRatePercentage || 0.75) / 100));
    } else {
      esi = 0;
    }

    const netPay = gross - pf - finesDeduction - tax - esi;

    const newPayslip: Payslip = {
      id: "pay-" + Date.now(),
      employeeId,
      month,
      basic,
      hra,
      telephone,
      fuel,
      professionalDev,
      lta,
      allowances,
      finesDeducted: finesDeduction,
      pfDeduction: pf,
      taxDeduction: tax,
      esiDeduction: esi,
      netPay,
      status: "Generated",
      generatedAt: new Date().toISOString(),
      sentToEmail: employee.email
    };


    // Mark pending fines as deducted
    pendingFines.forEach(f => {
      f.status = "Deducted";
    });

    // Create Simulated Sent Email record!
    const emailSubject = `Payslip Generated for ${month} - Corporate Payroll Admin`;
    const emailBody = `Dear ${employee.fullName},\n\nYour salary payslip for the month of ${month} has been successfully compiled and processed by the Payroll Automation Pipeline.\n\nSummary of Earnings & Deductions:\n------------------------------------------------\n- Basic Salary: Rs. ${employee.salary.basic.toLocaleString()}\n- HRA: Rs. ${employee.salary.hra.toLocaleString()}\n- Special Allowances: Rs. ${employee.salary.allowances.toLocaleString()}\n- PF Deduction: Rs. ${pf.toLocaleString()}\n- Corporate Fines Deducted: Rs. ${finesDeduction.toLocaleString()}\n- Tax Deduction (TDS/PT): Rs. ${tax.toLocaleString()}\n------------------------------------------------\n- Net Disbursed Pay: Rs. ${netPay.toLocaleString()}\n------------------------------------------------\n\nYour salary will be disbursed directly to your registered bank account (${employee.bankDetails.bankName}, A/C: ****${employee.bankDetails.accountNumber.slice(-4)}) within the next 48 hours.\n\nYou can access your employee HR dashboard to download a detailed tabular break-up.\n\nWarm Regards,\nPayroll Automation Portal`;

    const newEmail: SimulatedEmail = {
      id: "em-" + Date.now(),
      recipientEmail: employee.email,
      recipientName: employee.fullName,
      subject: emailSubject,
      body: emailBody,
      sentAt: new Date().toISOString()
    };

    db.payslips.push(newPayslip);
    db.simulatedEmails.push(newEmail);
    saveDatabase(db);

    await syncPayslipToSupabase(newPayslip);

    // Sync fine updates to Supabase
    for (const fine of pendingFines) {
      await updateFineStatusInSupabase(fine.id, "Deducted");
    }

    return NextResponse.json({ payslip: newPayslip, email: newEmail }, { status: 201 });
  } catch (error) {
    console.error("Failed to generate payslip:", error);
    return NextResponse.json({ error: "Failed to generate payslip" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { employeeId, month } = await request.json();
    if (!employeeId || !month) {
      return NextResponse.json({ error: "Employee ID and Month are required" }, { status: 400 });
    }

    const db = loadDatabase();
    const payslip = db.payslips.find(p => p.employeeId === employeeId && p.month === month);
    if (!payslip) {
      return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
    }

    // Remove the payslip
    db.payslips = db.payslips.filter(p => p.id !== payslip.id);

    // Revert "Deducted" fines for this employee back to "Deducted From Payroll"
    const employeeFines = (db.fines || []).filter(f => f.employeeId === employeeId && f.status === "Deducted");
    employeeFines.forEach(f => {
      f.status = "Deducted From Payroll";
    });

    saveDatabase(db);

    if (supabase) {
      await supabase.from("payslips").delete().eq("id", payslip.id);
      for (const fine of employeeFines) {
        await updateFineStatusInSupabase(fine.id, "Deducted From Payroll");
      }
    }

    return NextResponse.json({ success: true, message: "Payslip deleted successfully." });
  } catch (error: any) {
    console.error("Failed to delete payslip:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete payslip" }, { status: 500 });
  }
}
