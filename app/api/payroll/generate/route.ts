import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { updateFineStatusInSupabase } from "@/src/lib/supabase";
import { Payslip, SimulatedEmail } from "@/src/types";

export async function POST(request: Request) {
  try {
    const { employeeId, month } = await request.json();
    if (!employeeId || !month) {
      return NextResponse.json({ error: "Employee ID and Month are required" }, { status: 400 });
    }

    const db = loadDatabase();
    const employee = db.employees.find(e => e.id === employeeId);
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
