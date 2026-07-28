import { NextResponse } from "next/server";
import { loadDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { message, chatHistory, employeeId } = await request.json();

    const dbState = loadDatabase();
    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      try {
        const [
          empRes, attRes, leavesRes, polRes, invRes, invReqRes, finesRes, slipsRes, holRes
        ] = await Promise.all([
          dbClient.from("employees").select("*"),
          dbClient.from("attendance").select("*"),
          dbClient.from("leaves").select("*"),
          dbClient.from("policies").select("*"),
          dbClient.from("inventory").select("*"),
          dbClient.from("inventory_requests").select("*"),
          dbClient.from("fines").select("*"),
          dbClient.from("payslips").select("*"),
          dbClient.from("holidays").select("*")
        ]);

        if (empRes.data && empRes.data.length > 0) {
          dbState.employees = empRes.data.map((row: any) => {
            const bankDetailsFromRow = typeof row.bank_details === "string" ? JSON.parse(row.bank_details) : row.bank_details;
            const salaryFromRow = typeof row.salary === "string" ? JSON.parse(row.salary) : row.salary;
            const emergencyFromRow = typeof row.emergency_contact === "string" ? JSON.parse(row.emergency_contact) : row.emergency_contact;
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
                pfDeduction: Number(row.salary_pf_deduction ?? salaryFromRow?.pfDeduction ?? 3200),
                tdsDeduction: Number(row.salary_tds_deduction ?? salaryFromRow?.tdsDeduction ?? 0)
              },
              bankDetails: {
                accountNumber: String(row.bank_account_number ?? bankDetailsFromRow?.accountNumber ?? ""),
                bankName: String(row.bank_name ?? bankDetailsFromRow?.bankName ?? "State Bank of India"),
                ifsc: String(row.bank_ifsc ?? bankDetailsFromRow?.ifsc ?? "")
              },
              address: row.address || "",
              emergencyContact: {
                name: row.emergency_contact_name || emergencyFromRow?.name || "",
                relation: row.emergency_contact_relation || emergencyFromRow?.relation || "",
                phone: row.emergency_contact_phone || emergencyFromRow?.phone || ""
              },
              documents: [],
              onboardingTasks: [],
              avatarUrl: row.avatar_url || row.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop",
              bio: row.bio || "",
              password: row.password || ""
            };
          }).sort((a: any, b: any) => {
            const numA = parseInt((a.id || "").replace(/\D/g, ""), 10) || 0;
            const numB = parseInt((b.id || "").replace(/\D/g, ""), 10) || 0;
            return numA - numB;
          });
        }

        if (attRes.data && attRes.data.length > 0) {
          dbState.attendance = attRes.data.map((row: any) => ({
            id: row.id,
            employeeId: row.employee_id || row.employeeId || "",
            date: row.date,
            clockIn: row.clock_in || row.clockIn,
            clockOut: row.clock_out || row.clockOut,
            status: row.status || "Present",
            workFromHome: row.work_from_home ?? row.workFromHome ?? false,
            notes: row.notes || "",
            breaks: []
          }));
        }

        if (leavesRes.data && leavesRes.data.length > 0) {
          dbState.leaves = leavesRes.data.map((row: any) => ({
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
        }

        if (polRes.data && polRes.data.length > 0) {
          dbState.policies = polRes.data.map((row: any) => ({
            id: row.id,
            title: row.title || "",
            category: row.category || "Conduct & Ethics",
            content: row.content || "",
            lastUpdated: row.last_updated || row.lastUpdated || ""
          }));
        }

        if (invRes.data && invRes.data.length > 0) {
          dbState.inventory = invRes.data.map((row: any) => ({
            id: row.id,
            name: row.name || "",
            serialNumber: row.serial_number || row.serialNumber || "",
            category: row.category || "Laptop",
            status: row.status || "Available",
            assignedToEmployeeId: row.assigned_to_employee_id || row.assignedToEmployeeId || null,
            assignedDate: row.assigned_date || row.assignedDate || null
          }));
        }

        if (invReqRes.data && invReqRes.data.length > 0) {
          dbState.inventoryRequests = invReqRes.data.map((row: any) => ({
            id: row.id,
            employeeId: row.employee_id || row.employeeId || "",
            employeeName: row.employee_name || row.employeeName || "",
            itemName: row.item_name || row.itemName || "",
            category: row.category || "Laptop",
            requestDate: row.request_date || row.requestDate || "",
            reason: row.reason || "",
            status: row.status || "Pending"
          }));
        }

        if (finesRes.data && finesRes.data.length > 0) {
          dbState.fines = finesRes.data.map((row: any) => ({
            id: row.id,
            employeeId: row.employee_id || row.employeeId || "",
            employeeName: row.employee_name || row.employeeName || "",
            reason: row.reason || "Late Coming",
            amount: Number(row.amount) || 0,
            date: row.date || "",
            status: row.status || "Pending"
          }));
        }

        if (slipsRes.data && slipsRes.data.length > 0) {
          dbState.payslips = slipsRes.data.map((row: any) => ({
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

        if (holRes.data && holRes.data.length > 0) {
          dbState.holidays = holRes.data.map((row: any) => ({
            id: row.id,
            name: row.name,
            date: row.date,
            type: row.type || "National"
          }));
        }
      } catch (sbErr) {
        console.warn("Failed to load live database from Supabase for chatbot, using local fallback:", sbErr);
      }
    }
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
Live MGM FINANCIERS PRIV LIMITED Database Summary:
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
    const employeesContext = dbState.employees.map(e => {
      const salary = e.salary || { basic: 0, hra: 0, allowances: 0, pfDeduction: 0, tdsDeduction: 0 };
      return `- ID: ${e.id}, Name: ${e.fullName}, Role: ${e.role}, Department: ${e.department || "N/A"}, Branch: ${e.branch || "N/A"}, Email: ${e.email}, Phone: ${e.phone || "N/A"}, Status: ${e.status}, Joining Date: ${e.joiningDate}, Salary: { Basic: ${salary.basic}, HRA: ${salary.hra}, Allowances: ${salary.allowances}, PF: ${salary.pfDeduction}, TDS/PT: ${salary.tdsDeduction || 0} }`;
    }).join("\n");

    // 2. Attendance data
    const attendanceContext = dbState.attendance.map(a => {
      const emp = dbState.employees.find(e => e.id === a.employeeId);
      const name = emp ? emp.fullName : a.employeeId;
      return `- Date: ${a.date}, Employee: ${name} (${a.employeeId}), ClockIn: ${a.clockIn || "N/A"}, ClockOut: ${a.clockOut || "N/A"}, Status: ${a.status}, WFH: ${a.workFromHome ? "Yes" : "No"}, Break Duration: ${a.totalBreakDuration || "N/A"}`;
    }).join("\n");

    // 3. Leaves data
    const leavesContext = dbState.leaves.map(l => {
      return `- Leave ID: ${l.id}, Employee: ${l.employeeName} (${l.employeeId}), Type: ${l.leaveType}, Dates: ${l.startDate} to ${l.endDate}, Reason: "${l.reason}", Status: ${l.status}, Applied: ${l.appliedDate}`;
    }).join("\n");

    // 4. Expenses data
    const expensesContext = dbState.expenses.map(e => {
      return `- Expense ID: ${e.id}, Employee: ${e.employeeName} (${e.employeeId}), Category: ${e.category}, Amount: INR ${e.amount}, Date: ${e.date}, Description: "${e.description}", Status: ${e.status}`;
    }).join("\n");

    // 5. Fines data
    const finesContext = dbState.fines.map(f => {
      return `- Fine ID: ${f.id}, Employee: ${f.employeeName} (${f.employeeId}), Reason: ${f.reason}, Amount: INR ${f.amount}, Date: ${f.date}, Status: ${f.status}`;
    }).join("\n");

    // 6. Payslips data
    const payslipsContext = dbState.payslips.map(p => {
      const emp = dbState.employees.find(e => e.id === p.employeeId);
      const name = emp ? emp.fullName : p.employeeId;
      return `- Payslip ID: ${p.id}, Employee: ${name} (${p.employeeId}), Month: ${p.month}, Basic: ${p.basic}, HRA: ${p.hra}, Allowances: ${p.allowances}, Fines Deducted: ${p.finesDeducted}, PF Deduction: ${p.pfDeduction}, Tax Deduction: ${p.taxDeduction}, Net Pay: INR ${p.netPay}, Status: ${p.status}, Generated: ${p.generatedAt}`;
    }).join("\n");

    // 7. Inventory Requests data
    const inventoryContext = dbState.inventoryRequests.map(i => {
      return `- Request ID: ${i.id}, Employee: ${i.employeeName} (${i.employeeId}), Item: ${i.itemName} (${i.category}), Requested: ${i.requestDate}, Reason: "${i.reason}", Status: ${i.status}`;
    }).join("\n");

    const systemInstruction = `
You are MGM FINANCIERS PRIV LIMITED AI Assistant, a helpful and highly professional human resources companion built for MGM FINANCIERS PRIV LIMITED (a modern NBFC HR tech platform).
Your primary job is to assist HR managers, Admins, and Employees with their queries in a concise, warm, objective, and extremely polite tone.

Scope and Safety Guidelines (CRITICAL):
- You have full access and the right to read the entire database. You can query and display information, salary details, and personal/professional records of any employee when asked.
- You must ONLY answer questions directly related to MGM FINANCIERS PRIV LIMITED, SnailHR, or the provided database context (e.g. employee details, policies, holidays, company metrics, etc.).
- If the user asks general knowledge questions, coding/technical help, personal questions, creative writing, or anything unrelated to the MGM FINANCIERS PRIV LIMITED company, policies, or database context, you MUST politely refuse to answer and return ONLY this exact message, and ABSOLUTELY NOTHING ELSE (do not add any greetings, intro, follow-up help, or extra text):
  "I am only authorized to answer questions related to MGM FINANCIERS PRIV LIMITED company, policies, and its HR database. Please keep your queries relevant to the company."

Context Guidelines:
- Today's date is strictly ${formattedToday} (${todayStr}). MGM FINANCIERS PRIV LIMITED is based in India.
- You have live access to the MGM FINANCIERS PRIV LIMITED database. Use the database context below to answer queries exactly.
- Keep answers structured with simple bullet points where applicable.

--- LIVE DATABASE CONTEXT ---
${statsContext}

--- EMPLOYEES DIRECTORY & SALARIES ---
${employeesContext || "No employees registered"}

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

    const messagesList: any[] = [
      {
        role: "system",
        content: systemInstruction
      }
    ];
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach((ch: any) => {
        messagesList.push({
          role: ch.role === "user" ? "user" : "assistant",
          content: ch.text
        });
      });
    }
    messagesList.push({ role: "user", content: message });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      const fallbackText = getSmartRuleResponse(message, dbState, employee);
      return NextResponse.json({ text: fallbackText });
    }

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: messagesList,
          temperature: 0.7,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Groq API responded with status ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      return NextResponse.json({ text });
    } catch (apiErr: any) {
      console.error("Groq API call failed error details:", apiErr);
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
    return `### 📖 Company Policies Overview\n\n${allPolicies || "Standard MGM FINANCIERS PRIV LIMITED compliance rules apply."}`;
  }

  // 6. General query fallback
  return `Hello! I am your MGM FINANCIERS PRIV LIMITED AI Assistant.\n\n` +
    `Live status summary:\n` +
    `• **Active Employees**: ${(dbState.employees || []).length}\n` +
    `• **Upcoming Holidays**: ${(dbState.holidays || []).length} scheduled\n` +
    `• **Published Policies**: ${(dbState.policies || []).length} active\n\n` +
    `How can I assist you with attendance, leaves, company policies, or payroll information?`;
}
