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
 */
async function sendAttendanceReport(todayStr: string) {
  console.log(`[WhatsApp Scheduler] Triggered attendance report sending for date: ${todayStr}`);
  try {
    const dbClient = supabaseAdmin || supabase;
    if (!dbClient) {
      console.warn("[WhatsApp Scheduler] Supabase database client not initialized. Cannot send report.");
      return;
    }

    // 1. Fetch active admin phone numbers from database
    const { data: admins, error: adminErr } = await dbClient
      .from("employees")
      .select("phone, full_name")
      .eq("role", "admin")
      .eq("status", "Active");

    if (adminErr || !admins) {
      console.error("[WhatsApp Scheduler] Failed to fetch admins from database:", adminErr?.message);
      return;
    }

    const adminsWithPhones = admins.filter(admin => admin.phone && admin.phone.trim().length > 0);
    if (adminsWithPhones.length === 0) {
      console.warn("[WhatsApp Scheduler] No active admins with phone numbers found in the database.");
      return;
    }

    // 2. Generate the report message
    const messageBody = await getAttendanceSummaryMessage(todayStr);

    // 3. Dispatch to all active admins
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
    console.error("[WhatsApp Scheduler] Exception in sendAttendanceReport:", error);
  }
}

/**
 * Periodically checks the time and triggers WhatsApp notifications 1 hour after the late threshold.
 */
async function checkAndSendReport() {
  try {
    const dbClient = supabaseAdmin || supabase;
    if (!dbClient) return;

    // 1. Fetch current late_threshold dynamically from database
    let lateThreshold = "09:30"; // default fallback
    try {
      const { data, error } = await dbClient
        .from("timing_settings")
        .select("late_threshold")
        .eq("id", "default")
        .maybeSingle();

      if (!error && data && data.late_threshold) {
        lateThreshold = data.late_threshold;
      }
    } catch (dbErr) {
      console.warn("[WhatsApp Scheduler] Could not fetch timing settings from DB, using fallback 09:30:", dbErr);
    }

    // 2. Parse hours and minutes
    const [hours, minutes] = lateThreshold.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      console.warn(`[WhatsApp Scheduler] Invalid late_threshold format: "${lateThreshold}". Using default 09:30.`);
      return;
    }

    // 3. Calculate target trigger time (1 hour after Late Buffer)
    const triggerHours = (hours + 1) % 24;
    const triggerMinutes = minutes;

    // 4. Compare with current local time
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    if (currentHours === triggerHours && currentMinutes === triggerMinutes) {
      const todayStr = getLocalDateString(now);
      const globalRef = global as any;

      if (globalRef.whatsappLastSentDate !== todayStr) {
        // Guard to prevent sending duplicate notifications within the same minute or day
        globalRef.whatsappLastSentDate = todayStr;
        await sendAttendanceReport(todayStr);
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
