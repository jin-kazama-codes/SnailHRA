import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function run() {
  const { data, error } = await supabase.from("employees").select("*").limit(1);
  if (error) {
    console.error("Error reading employees:", error.message, error.details);
  } else {
    console.log("Success! Columns of employees table:");
    console.log(Object.keys(data[0] || {}));
  }
}
run();
