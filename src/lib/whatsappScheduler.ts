import { supabase } from "./supabase";
import { supabaseAdmin } from "./supabase-admin";
import { sendWhatsAppMessage, getAttendanceSummaryMessage } from "./whatsapp";

// Helper to get local date string YYYY-MM-DD
function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Triggers the attendance report sending process.
 * Fetches active admins and sends them today's attendance summary report.
 */async function sendAttendanceReport(todayStr: string, companyId: string, companyName: string) {
  console.log(`[WhatsApp Scheduler] Triggered attendance report sending for company ${companyName} (${companyId}) on date: ${todayStr}`);
  try {
    const dbClient = supabaseAdmin || supabase;
    if (!dbClient) {
      console.warn("[WhatsApp Scheduler] Supabase database client not initialized. Cannot send report.");
      return;
    }

    // 1. Fetch active admin phone numbers for this company from database
    const { data: admins, error: adminErr } = await dbClient
      .from("employees")
      .select("phone, full_name")
      .eq("role", "admin")
      .eq("status", "Active")
      .eq("company_id", companyId);

    if (adminErr || !admins) {
      console.error(`[WhatsApp Scheduler] Failed to fetch admins for company ${companyId}:`, adminErr?.message);
      return;
    }

    const adminsWithPhones = admins.filter(admin => admin.phone && admin.phone.trim().length > 0);
    if (adminsWithPhones.length === 0) {
      console.warn(`[WhatsApp Scheduler] No active admins with phone numbers found for company ${companyId}`);
      return;
    }

    // 2. Generate the company-specific report message
    const messageBody = await getAttendanceSummaryMessage(todayStr, companyId, companyName);

    // 3. Dispatch to all active admins of this company
    for (const admin of adminsWithPhones) {
      console.log(`[WhatsApp Scheduler] Dispatching report to admin ${admin.full_name} (${admin.phone})...`);
      const success = await sendWhatsAppMessage(admin.phone, messageBody);
      if (success) {
        console.log(`[WhatsApp Scheduler] Successfully sent report to ${admin.full_name}`);
      } else {
        console.error(`[WhatsApp Scheduler] Failed to send report to ${admin.full_name}`);
      }
    }
  } catch (error) {
    console.error(`[WhatsApp Scheduler] Exception in sendAttendanceReport for company ${companyId}:`, error);
  }
}

/**
 * Periodically checks the time and triggers WhatsApp notifications 1 hour after the late threshold.
 * Checks per-company settings and filters by subscription model.
 */
async function checkAndSendReport() {
  try {
    const dbClient = supabaseAdmin || supabase;
    if (!dbClient) return;

    // 1. Fetch all active companies with WhatsApp subscription enabled (Models 2 and 4)
    const { data: companies, error: compErr } = await dbClient
      .from("companies")
      .select("id, name, subscription_model")
      .eq("is_active", true)
      .in("subscription_model", [2, 4]);

    if (compErr || !companies) {
      console.error("[WhatsApp Scheduler] Failed to fetch companies for scheduler:", compErr?.message);
      return;
    }

    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const todayStr = getLocalDateString(now);

    for (const company of companies) {
      // 2. Fetch timing settings for this company or fallback to default
      let lateThreshold = "09:30"; // default fallback
      try {
        const { data, error } = await dbClient
          .from("timing_settings")
          .select("late_threshold")
          .eq("company_id", company.id)
          .maybeSingle();

        if (!error && data && data.late_threshold) {
          lateThreshold = data.late_threshold;
        } else {
          // fallback to default timing setting if company-specific not found
          const { data: defaultData } = await dbClient
            .from("timing_settings")
            .select("late_threshold")
            .eq("id", "default")
            .maybeSingle();
          if (defaultData && defaultData.late_threshold) {
            lateThreshold = defaultData.late_threshold;
          }
        }
      } catch (dbErr) {
        console.warn(`[WhatsApp Scheduler] Could not fetch timing settings for company ${company.name}, using 09:30:`, dbErr);
      }

      // 3. Parse hours and minutes
      const [hours, minutes] = lateThreshold.split(":").map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        continue;
      }

      // 4. Calculate target trigger time (1 hour after Late Buffer)
      const triggerHours = (hours + 1) % 24;
      const triggerMinutes = minutes;

      if (currentHours === triggerHours && currentMinutes === triggerMinutes) {
        const globalRef = global as any;
        if (!globalRef.whatsappLastSentDates) {
          globalRef.whatsappLastSentDates = {};
        }

        // Company-specific guard to prevent sending duplicate notifications
        if (globalRef.whatsappLastSentDates[company.id] !== todayStr) {
          globalRef.whatsappLastSentDates[company.id] = todayStr;
          await sendAttendanceReport(todayStr, company.id, company.name);
        }
      }
    }
  } catch (error) {
    console.error("[WhatsApp Scheduler] Error in checkAndSendReport interval:", error);
  }
}
/**
 * Initializes the background WhatsApp scheduler.
 * Runs check loop every 30 seconds.
 */
export function initWhatsappScheduler() {
  console.log("[WhatsApp Scheduler] Initializing background task loop (30s interval)...");
  
  // Run initial check after 5 seconds to not block startup
  setTimeout(() => {
    checkAndSendReport();
  }, 5000);

  // Set periodic check every 30 seconds
  setInterval(() => {
    checkAndSendReport();
  }, 30000);
}
