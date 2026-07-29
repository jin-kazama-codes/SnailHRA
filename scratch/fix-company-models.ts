import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!url || !key) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: companies, error } = await supabase
  .from("companies")
  .select("id, name, subscription_model");

if (error) { console.error(error.message); process.exit(1); }

console.log("\nCurrent subscription_model values in Supabase companies table:");
console.table(companies?.map(c => ({ name: c.name, subscription_model: c.subscription_model })));
