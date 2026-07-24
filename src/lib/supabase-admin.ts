import { createClient } from "@supabase/supabase-js";

/**
 * Server-side only Supabase admin client.
 * Uses the SERVICE ROLE KEY which bypasses Row Level Security (RLS).
 * ⚠️ NEVER expose this client or key to the browser/client side.
 * Only import this in Next.js API routes (app/api/...).
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

if (!supabaseAdmin) {
  console.warn(
    "⚠️  Supabase Admin client not configured. " +
    "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to enable server-side reads that bypass RLS. " +
    "Without this, policies and other tables protected by RLS will not load on page refresh."
  );
}
