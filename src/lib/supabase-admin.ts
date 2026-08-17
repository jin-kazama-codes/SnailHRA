import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

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
