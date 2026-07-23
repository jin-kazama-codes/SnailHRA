import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { loadDatabase } from "@/src/lib/db";

export async function POST(request: Request) {
  try {
    const { message, chatHistory, employeeId } = await request.json();

    const dbState = loadDatabase();
    const employee = dbState.employees.find(e => e.id === employeeId);

    const activeEmpCount = dbState.employees.filter(e => e.status === "Active").length;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDayName = daysOfWeek[now.getDay()];
    const formattedToday = `${currentDayName}, ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    const presentToday = dbState.attendance.filter(a => a.date === todayStr && a.status === "Present").length;
    const onLeaveToday = dbState.leaves.filter(l => l.status === "Approved" && l.startDate <= todayStr && l.endDate >= todayStr).length;

    const statsContext = `
Live SnailHR Database Summary:
- Total Employees Registered: ${dbState.employees.length} (${activeEmpCount} Active)
- Attendance Today (${todayStr}): ${presentToday} Present, ${onLeaveToday} Approved On Leave
- Total Active Policies: ${dbState.policies.length}
- Total Inventory Items: ${dbState.inventory.length}
`;

    const holidaysContext = dbState.holidays
      .slice(0, 5)
      .map(h => `- ${h.name} (${h.date}) [${h.type}]`)
      .join("\n");

    const policiesContext = dbState.policies
      .map(p => `### Policy: ${p.title} (${p.category})\n${p.content}`)
      .join("\n\n");

    let userProfileContext = "User Role: Anonymous Guest\n";
    if (employee) {
      const userLeaves = dbState.leaves.filter(l => l.employeeId === employee.id);
      const approvedCasual = userLeaves.filter(l => l.status === "Approved" && l.leaveType === "Casual Leave").length;
      const approvedMedical = userLeaves.filter(l => l.status === "Approved" && l.leaveType === "Medical Leave").length;
      
      userProfileContext = `
Logged-in Employee Context:
- ID: ${employee.id}
- Full Name: ${employee.fullName}
- Role: ${employee.role}
- Department: ${employee.department}
- Bio: ${employee.bio || "None"}
- Remaining Leave Balance (Annual quota is 18 Casual, 12 Medical):
  * Casual Leaves Remaining: ${18 - approvedCasual} Days (Approved: ${approvedCasual})
  * Medical Leaves Remaining: ${12 - approvedMedical} Days (Approved: ${approvedMedical})
`;
    }

    const userRole = employee ? employee.role : "employee";

    // 1. Employees data
    let employeesContext = "";
    if (userRole === "admin" || userRole === "hr") {
      employeesContext = dbState.employees.map(e => {
        const salary = e.salary || { basic: 0, hra: 0, allowances: 0, pfDeduction: 0 };
        return `- ID: ${e.id}, Name: ${e.fullName}, Role: ${e.role}, Department: ${e.department || "N/A"}, Branch: ${e.branch || "N/A"}, Email: ${e.email}, Phone: ${e.phone || "N/A"}, Status: ${e.status}, Joining Date: ${e.joiningDate}, Salary: { Basic: ${salary.basic}, HRA: ${salary.hra}, Allowances: ${salary.allowances}, PF: ${salary.pfDeduction} }`;
      }).join("\n");
    } else if (employee) {
      const salary = employee.salary || { basic: 0, hra: 0, allowances: 0, pfDeduction: 0 };
      employeesContext = `- ID: ${employee.id}, Name: ${employee.fullName}, Role: ${employee.role}, Department: ${employee.department || "N/A"}, Branch: ${employee.branch || "N/A"}, Email: ${employee.email}, Phone: ${employee.phone || "N/A"}, Status: ${employee.status}, Joining Date: ${employee.joiningDate}, Salary: { Basic: ${salary.basic}, HRA: ${salary.hra}, Allowances: ${salary.allowances}, PF: ${salary.pfDeduction} }`;
    }

    // 2. Attendance data
    let attendanceContext = "";
    const attendanceFilter = (userRole === "admin" || userRole === "hr")
      ? dbState.attendance
      : dbState.attendance.filter(a => a.employeeId === employeeId);
    attendanceContext = attendanceFilter.map(a => {
      const emp = dbState.employees.find(e => e.id === a.employeeId);
      const name = emp ? emp.fullName : a.employeeId;
      return `- Date: ${a.date}, Employee: ${name} (${a.employeeId}), ClockIn: ${a.clockIn || "N/A"}, ClockOut: ${a.clockOut || "N/A"}, Status: ${a.status}, WFH: ${a.workFromHome ? "Yes" : "No"}, Break Duration: ${a.totalBreakDuration || "N/A"}`;
    }).join("\n");

    // 3. Leaves data
    let leavesContext = "";
    const leavesFilter = (userRole === "admin" || userRole === "hr")
      ? dbState.leaves
      : dbState.leaves.filter(l => l.employeeId === employeeId);
    leavesContext = leavesFilter.map(l => {
      return `- Leave ID: ${l.id}, Employee: ${l.employeeName} (${l.employeeId}), Type: ${l.leaveType}, Dates: ${l.startDate} to ${l.endDate}, Reason: "${l.reason}", Status: ${l.status}, Applied: ${l.appliedDate}`;
    }).join("\n");

    // 4. Expenses data
    let expensesContext = "";
    const expensesFilter = (userRole === "admin" || userRole === "hr")
      ? dbState.expenses
      : dbState.expenses.filter(e => e.employeeId === employeeId);
    expensesContext = expensesFilter.map(e => {
      return `- Expense ID: ${e.id}, Employee: ${e.employeeName} (${e.employeeId}), Category: ${e.category}, Amount: INR ${e.amount}, Date: ${e.date}, Description: "${e.description}", Status: ${e.status}`;
    }).join("\n");

    // 5. Fines data
    let finesContext = "";
    const finesFilter = (userRole === "admin" || userRole === "hr")
      ? dbState.fines
      : dbState.fines.filter(f => f.employeeId === employeeId);
    finesContext = finesFilter.map(f => {
      return `- Fine ID: ${f.id}, Employee: ${f.employeeName} (${f.employeeId}), Reason: ${f.reason}, Amount: INR ${f.amount}, Date: ${f.date}, Status: ${f.status}`;
    }).join("\n");

    // 6. Payslips data
    let payslipsContext = "";
    const payslipsFilter = (userRole === "admin" || userRole === "hr")
      ? dbState.payslips
      : dbState.payslips.filter(p => p.employeeId === employeeId);
    payslipsContext = payslipsFilter.map(p => {
      const emp = dbState.employees.find(e => e.id === p.employeeId);
      const name = emp ? emp.fullName : p.employeeId;
      return `- Payslip ID: ${p.id}, Employee: ${name} (${p.employeeId}), Month: ${p.month}, Basic: ${p.basic}, HRA: ${p.hra}, Allowances: ${p.allowances}, Fines Deducted: ${p.finesDeducted}, PF Deduction: ${p.pfDeduction}, Tax Deduction: ${p.taxDeduction}, Net Pay: INR ${p.netPay}, Status: ${p.status}, Generated: ${p.generatedAt}`;
    }).join("\n");

    // 7. Inventory Requests data
    let inventoryContext = "";
    const inventoryFilter = (userRole === "admin" || userRole === "hr")
      ? dbState.inventoryRequests
      : dbState.inventoryRequests.filter(i => i.employeeId === employeeId);
    inventoryContext = inventoryFilter.map(i => {
      return `- Request ID: ${i.id}, Employee: ${i.employeeName} (${i.employeeId}), Item: ${i.itemName} (${i.category}), Requested: ${i.requestDate}, Reason: "${i.reason}", Status: ${i.status}`;
    }).join("\n");

    const systemInstruction = `
You are SnailHR AI Assistant, a helpful and highly professional human resources companion built for SnailHR (a modern NBFC HR tech platform).
Your primary job is to assist HR managers, Admins, and Employees with their queries in a concise, warm, objective, and extremely polite tone.

Context Guidelines:
- Today's date is strictly ${formattedToday} (${todayStr}). SnailHR is based in India.
- You have live access to the SnailHR database. Use the database context below to answer queries exactly.
- Keep answers structured with simple bullet points where applicable.
- Data Privacy Constraint:
  * Logged-in user's role is "${userRole}".
  * If the role is "employee", they can ONLY query and see information related to themselves (their own attendance, leaves, payslips, expenses, and profile). If they ask about other employees' salaries, payslips, or personal info, politely state that you do not have permission to show other employees' data.
  * If the role is "admin" or "hr", they have full permission to view all employees' attendance, leaves, payslips, expenses, fines, and profile details.

--- LIVE DATABASE CONTEXT ---
${statsContext}

--- EMPLOYEES DIRECTORY & SALARIES ---
${employeesContext || "No access to other employees' profiles"}

--- ATTENDANCE LOGS ---
${attendanceContext || "No attendance records available"}

--- LEAVE REQUESTS ---
${leavesContext || "No leave requests available"}

--- EXPENSE CLAIMS ---
${expensesContext || "No expense claims available"}

--- FINES ISSUED ---
${finesContext || "No fines available"}

--- PAYSLIPS ---
${payslipsContext || "No payslips available"}

--- INVENTORY REQUESTS ---
${inventoryContext || "No inventory requests available"}

--- UPCOMING HOLIDAYS ---
${holidaysContext}

--- COMPANY POLICIES ---
${policiesContext}
---------------------------------
`;

    const contents: any[] = [];
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach((ch: any) => {
        contents.push({
          role: ch.role === "user" ? "user" : "model",
          parts: [{ text: ch.text }]
        });
      });
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const fallbackText = getSmartRuleResponse(message, dbState, employee);
      return NextResponse.json({ text: fallbackText });
    }

    try {
      const aiClient = new GoogleGenAI({ apiKey });
      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      return NextResponse.json({ text: response.text });
    } catch (apiErr: any) {
      console.warn("Gemini API call failed, using smart DB fallback:", apiErr?.message || apiErr);
      const fallbackText = getSmartRuleResponse(message, dbState, employee);
      return NextResponse.json({ text: fallbackText });
    }
  } catch (err: any) {
    console.error("Gemini Chat Error:", err);
    return NextResponse.json({ 
      text: "I am currently processing your query. Please rephrase or check system status." 
    });
  }
}

function getSmartRuleResponse(message: string, dbState: any, employee: any): string {
  const msgLower = message.toLowerCase();
  const userRole = employee ? employee.role : "employee";

  // 1. Upcoming Holidays
  if (msgLower.includes("holiday") || msgLower.includes("festival") || msgLower.includes("vacation")) {
    if (!dbState.holidays || dbState.holidays.length === 0) {
      return "There are no upcoming company holidays configured at this time.";
    }
    const holidayList = dbState.holidays
      .map((h: any) => `• **${h.name}**: ${h.date} (${h.type || "Holiday"})`)
      .join("\n");
    return `### 📅 Upcoming Company Holidays\n\n${holidayList}\n\n*Plan your leave requests in advance via the Leaves tab!*`;
  }

  // 2. Who is present today / How many present today
  if (msgLower.includes("present") || msgLower.includes("attendance today") || msgLower.includes("clocked in")) {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayAttendance = (dbState.attendance || []).filter((a: any) => a.date === todayStr && (a.status === "Present" || a.status === "Late"));
    
    if (userRole === "admin" || userRole === "hr") {
      const presentEmps = todayAttendance.map((a: any) => {
        const emp = (dbState.employees || []).find((e: any) => e.id === a.employeeId);
        return `• ${emp ? emp.fullName : a.employeeId} (${a.status}${a.workFromHome ? ' - WFH' : ''})`;
      });
      return `### 📊 Today's Attendance Overview (${todayStr})\n\n**Total Present:** ${todayAttendance.length} employee(s)\n\n${presentEmps.length > 0 ? presentEmps.join('\n') : "No employees have clocked in yet today."}`;
    } else {
      return `### 📊 Today's Attendance\n\n**Total Employees Present Today:** ${todayAttendance.length}\n(Detailed attendance rosters are restricted to HR & Admins).`;
    }
  }

  // 3. Who is on leave today
  if (msgLower.includes("leave today") || msgLower.includes("who is on leave") || msgLower.includes("absent today")) {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const activeLeaves = (dbState.leaves || []).filter((l: any) => l.status === "Approved" && todayStr >= l.startDate && todayStr <= l.endDate);

    if (activeLeaves.length === 0) {
      return `### 🌴 On Leave Today (${todayStr})\n\nNo employees are currently on approved leave today. All rostered staff are scheduled.`;
    }

    if (userRole === "admin" || userRole === "hr") {
      const leaveList = activeLeaves.map((l: any) => `• **${l.employeeName}**: ${l.leaveType} (${l.startDate} to ${l.endDate})`).join('\n');
      return `### 🌴 Employees On Approved Leave Today (${todayStr})\n\n${leaveList}`;
    } else {
      return `### 🌴 On Leave Today\n\nThere are **${activeLeaves.length} employee(s)** on approved leave today.`;
    }
  }

  // 4. Leave balance
  if (msgLower.includes("leave balance") || msgLower.includes("my leaves") || msgLower.includes("remaining leave")) {
    if (!employee) {
      return "Please log in to view your personalized leave balance details.";
    }
    const userLeaves = (dbState.leaves || []).filter((l: any) => l.employeeId === employee.id && l.status === "Approved");
    const casualUsed = userLeaves.filter((l: any) => l.leaveType === "Casual Leave").length;
    const medicalUsed = userLeaves.filter((l: any) => l.leaveType === "Medical Leave").length;

    return `### 🗓️ Your Leave Balance Summary (${employee.fullName})\n\n` +
      `• **Casual Leaves**: ${18 - casualUsed} Days Remaining (18 Total Quota)\n` +
      `• **Medical Leaves**: ${12 - medicalUsed} Days Remaining (12 Total Quota)\n` +
      `• **Earned Leaves**: Accrued monthly according to corporate policy\n\n` +
      `*You can submit a new leave request under the Leaves tab.*`;
  }

  // 5. WFH or fine policies
  if (msgLower.includes("policy") || msgLower.includes("wfh") || msgLower.includes("work from home") || msgLower.includes("fine") || msgLower.includes("late") || msgLower.includes("secure")) {
    const matchedPolicies = (dbState.policies || []).filter((p: any) => 
      p.title.toLowerCase().includes("wfh") || 
      p.title.toLowerCase().includes("fine") || 
      p.title.toLowerCase().includes("late") ||
      p.content.toLowerCase().includes("work from home") ||
      p.content.toLowerCase().includes("late") ||
      p.content.toLowerCase().includes("secure") ||
      p.title.toLowerCase().includes("security")
    );

    if (matchedPolicies.length > 0) {
      const polText = matchedPolicies.map((p: any) => `#### 📜 ${p.title} (${p.category})\n${p.content}`).join("\n\n");
      return `### 📖 Relevant Corporate Policies\n\n${polText}`;
    }

    const allPolicies = (dbState.policies || []).map((p: any) => `• **${p.title}** (${p.category})`).join("\n");
    return `### 📖 Company Policies Overview\n\n${allPolicies || "Standard SnailHR compliance rules apply."}`;
  }

  // 6. General query fallback
  return `Hello! I am your SnailHR AI Assistant.\n\n` +
    `Live status summary:\n` +
    `• **Active Employees**: ${(dbState.employees || []).length}\n` +
    `• **Upcoming Holidays**: ${(dbState.holidays || []).length} scheduled\n` +
    `• **Published Policies**: ${(dbState.policies || []).length} active\n\n` +
    `How can I assist you with attendance, leaves, company policies, or payroll information?`;
}
