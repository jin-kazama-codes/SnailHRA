import { supabase } from "./supabase";
import { supabaseAdmin } from "./supabase-admin";

/**
 * Normalizes a phone number to E.164 format.
 * Defaults to India country code (+91) if it's a 10-digit number.
 */
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, "").trim();
  if (!cleaned.startsWith("+")) {
    if (cleaned.length === 10) {
      cleaned = "+91" + cleaned;
    } else if (cleaned.length === 12 && cleaned.startsWith("91")) {
      cleaned = "+" + cleaned;
    }
  }
  return cleaned;
}

/**
 * Sends a WhatsApp message using Twilio's Message JSON API.
 * Uses native fetch to align with next.js environment and star-health-rag's functionality.
 */
export async function sendWhatsAppMessage(to: string, body: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";

  let targetTo = normalizePhone(to);
  if (!targetTo.startsWith("whatsapp:")) {
    targetTo = `whatsapp:${targetTo}`;
  }

  if (!accountSid || !authToken || accountSid.includes("your_twilio_account_sid") || authToken.includes("your_twilio_auth_token")) {
    console.warn("[MOCK TWILIO] Credentials missing/placeholder in .env.local. Logging message payload:");
    console.warn(`[MOCK TWILIO] FROM: ${fromWhatsApp} -> TO: ${targetTo}`);
    console.warn(`[MOCK TWILIO] BODY:\n${body}\n`);
    return true; // Simulate success
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const params = new URLSearchParams();
  params.append("From", fromWhatsApp);
  params.append("To", targetTo);
  params.append("Body", body);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (res.ok) {
      const resData = await res.json();
      console.log(`[WhatsApp Service] Message sent successfully. SID=${resData.sid}`);
      return true;
    } else {
      const errText = await res.text();
      console.error(`[WhatsApp Service] Twilio API Error (Status ${res.status}): ${errText}`);
      return false;
    }
  } catch (error) {
    console.error("[WhatsApp Service] Exception calling Twilio API:", error);
    return false;
  }
}

/**
 * Compiles a structured daily attendance summary report.
 * Queries Supabase for active employees and matches today's attendance.
 */
export async function getAttendanceSummaryMessage(todayStr: string, companyId: string, companyName?: string): Promise<string> {
  const dbClient = supabaseAdmin || supabase;
  if (!dbClient) {
    throw new Error("No database client available");
  }

  // 1. Fetch active employees for company
  const { data: employees, error: empError } = await dbClient
    .from("employees")
    .select("id, full_name, role")
    .eq("status", "Active")
    .eq("company_id", companyId);

  if (empError) {
    throw new Error(`Failed to fetch employees: ${empError.message}`);
  }

  // 2. Fetch today's attendance records for company
  const { data: attendance, error: attError } = await dbClient
    .from("attendance")
    .select("employee_id, clock_in, clock_out, status")
    .eq("date", todayStr)
    .eq("company_id", companyId);

  if (attError) {
    throw new Error(`Failed to fetch attendance: ${attError.message}`);
  }

  const employeeMap = new Map<string, any>();
  employees?.forEach(e => {
    employeeMap.set(e.id, { ...e, present: false, late: false, clockIn: null });
  });

  let presentCount = 0;
  let lateCount = 0;

  attendance?.forEach(a => {
    const emp = employeeMap.get(a.employee_id);
    if (emp) {
      emp.present = true;
      if (a.status === "Late") {
        emp.late = true;
        lateCount++;
      } else {
        presentCount++;
      }
      if (a.clock_in) {
        try {
          const clockInDate = new Date(a.clock_in);
          emp.clockIn = clockInDate.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata",
          });
        } catch {
          emp.clockIn = a.clock_in;
        }
      }
    }
  });

  const totalActive = employees?.length || 0;
  const totalPresent = presentCount + lateCount;
  const totalAbsent = totalActive - totalPresent;

  const todayDate = new Date(todayStr);
  const formattedDate = todayDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const dispName = companyName || "SnailHR Tenant";
  let body = `📊 *${dispName} - Daily Attendance Summary* 📊\n`;
  body += `📅 Date: ${formattedDate}\n\n`;
  body += `📈 *Summary:*\n`;
  body += `• Total Active Employees: ${totalActive}\n`;
  body += `• Total Present Today: ${totalPresent}\n`;
  body += `  - Present (On Time): ${presentCount}\n`;
  body += `  - Present (Late): ${lateCount}\n`;
  body += `• Total Absent Today: ${totalAbsent}\n\n`;

  body += `👥 *Present Employees Roster:*\n`;
  
  const presentEmployeesList = Array.from(employeeMap.values()).filter(emp => emp.present);
  if (presentEmployeesList.length > 0) {
    presentEmployeesList.forEach(emp => {
      const statusText = emp.late ? "Late" : "On Time";
      const timeText = emp.clockIn ? ` at ${emp.clockIn}` : "";
      body += `• ${emp.full_name} (${emp.id}) - Clocked In (${statusText})${timeText}\n`;
    });
  } else {
    body += `No employees clocked in yet today.\n`;
  }

  return body;
}
