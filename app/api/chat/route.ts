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

    const systemInstruction = `
You are SnailHR AI Assistant, a helpful and highly professional human resources companion built for SnailHR (a modern NBFC HR tech platform).
Your primary job is to assist HR managers, Admins, and Employees with their queries in a concise, warm, objective, and extremely polite tone.

Context Guidelines:
- Today's date is strictly Monday, July 20, 2026. SnailHR is based in India.
- You have live access to the SnailHR database. Use the database context below to answer queries exactly.
- Keep answers structured with simple bullet points where applicable.

--- LIVE DATABASE CONTEXT ---
${statsContext}

--- LOGGED-IN USER PROFILE ---
${userProfileContext}

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
      return NextResponse.json({ 
        text: "My Gemini AI Core is not configured (missing GEMINI_API_KEY). SnailHR is fully ready to sync once configured!" 
      });
    }

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
  } catch (err: any) {
    console.error("Gemini Chat Error:", err);
    return NextResponse.json(
      { error: "SnailHR Assistant core encountered an error." },
      { status: 500 }
    );
  }
}
