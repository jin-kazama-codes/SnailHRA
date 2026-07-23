import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { updateFineStatusInSupabase, syncPayslipToSupabase, supabase } from "@/src/lib/supabase";
import { Payslip, SimulatedEmail } from "@/src/types";

export async function POST(request: Request) {
  try {
    const { employeeId, month } = await request.json();
    if (!employeeId || !month) {
      return NextResponse.json({ error: "Employee ID and Month are required" }, { status: 400 });
    }

    const db = loadDatabase();
    let employee = db.employees.find(e => e.id === employeeId);

    if (!employee && supabase) {
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
              allowances: Number(row.salary_allowances ?? salaryFromRow?.allowances ?? 10000),
              pfDeduction: Number(row.salary_pf_deduction ?? salaryFromRow?.pfDeduction ?? 3200)
            },
            bankDetails: {
              accountNumber: String(row.bank_account_number ?? bankDetailsFromRow?.accountNumber ?? ""),
              bankName: String(row.bank_name ?? bankDetailsFromRow?.bankName ?? "State Bank of India"),
              ifsc: String(row.bank_ifsc ?? bankDetailsFromRow?.ifsc ?? "")
            },
            address: row.address || "",
            emergencyContact: { name: "", relation: "", phone: "" },
            documents: [],
            onboardingTasks: [],
            avatarUrl: row.avatar_url || "",
            bio: row.bio || "",
            password: row.password || ""
          };
        });
        employee = db.employees.find(e => e.id === employeeId);
      }
    }

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Check if already exists for this employee + month
    const exists = db.payslips.find(p => p.employeeId === employeeId && p.month === month);
    if (exists) {
      return NextResponse.json({ error: `Payslip already generated for ${employee.fullName} for ${month}` }, { status: 400 });
    }

    // Calculate deductions
    const pf = employee.salary.pfDeduction || Math.round(employee.salary.basic * 0.08);
    
    // Find pending fines for this employee to deduct
    const pendingFines = db.fines.filter(f => f.employeeId === employeeId && f.status === "Pending");
    const finesDeduction = pendingFines.reduce((sum, f) => sum + f.amount, 0);

    // Calculate Professional Tax + TDS roughly
    const tax = Math.round((employee.salary.basic + employee.salary.hra + employee.salary.allowances) * 0.05);

    const netPay = (employee.salary.basic + employee.salary.hra + employee.salary.allowances) - pf - finesDeduction - tax;

    const newPayslip: Payslip = {
      id: "pay-" + Date.now(),
      employeeId,
      month,
      basic: employee.salary.basic,
      hra: employee.salary.hra,
      allowances: employee.salary.allowances,
      finesDeducted: finesDeduction,
      pfDeduction: pf,
      taxDeduction: tax,
      netPay,
      status: "Generated",
      generatedAt: new Date().toISOString(),
      sentToEmail: employee.email
    };

    // Mark pending fines as deducted
    pendingFines.forEach(f => {
      f.status = "Deducted From Payroll";
    });

    // Create Simulated Sent Email record!
    const emailSubject = `Payslip Generated for ${month} - SnailHR Admin`;
    const emailBody = `Dear ${employee.fullName},\n\nYour salary payslip for the month of ${month} has been successfully compiled and processed by the SnailHR automation pipeline.\n\nSummary of Earnings & Deductions:\n------------------------------------------------\n- Basic Salary: Rs. ${employee.salary.basic.toLocaleString()}\n- HRA: Rs. ${employee.salary.hra.toLocaleString()}\n- Special Allowances: Rs. ${employee.salary.allowances.toLocaleString()}\n- PF Deduction: Rs. ${pf.toLocaleString()}\n- Corporate Fines Deducted: Rs. ${finesDeduction.toLocaleString()}\n- Tax Deduction (TDS/PT): Rs. ${tax.toLocaleString()}\n------------------------------------------------\n- Net Disbursed Pay: Rs. ${netPay.toLocaleString()}\n------------------------------------------------\n\nYour salary will be disbursed directly to your registered bank account (${employee.bankDetails.bankName}, A/C: ****${employee.bankDetails.accountNumber.slice(-4)}) within the next 48 hours.\n\nYou can access your SnailHR dashboard to download a detailed tabular break-up.\n\nWarm Regards,\nSnailHR Payroll Automation Portal`;

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
      await updateFineStatusInSupabase(fine.id, "Deducted From Payroll");
    }

    return NextResponse.json({ payslip: newPayslip, email: newEmail }, { status: 201 });
  } catch (error) {
    console.error("Failed to generate payslip:", error);
    return NextResponse.json({ error: "Failed to generate payslip" }, { status: 500 });
  }
}
