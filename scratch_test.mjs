import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Test the snailhr_state upsert that might be causing 500
console.log("Testing snailhr_state upsert...");
const smallPayload = { key: "app_state", value: { test: true } };
const { data, error } = await supabase.from("snailhr_state").upsert(smallPayload, { onConflict: "key" });
console.log("snailhr_state result data:", data);
console.log("snailhr_state result error:", error);
