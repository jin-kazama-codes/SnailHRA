import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Supabase environment variables are missing in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const jsonPath = path.resolve(process.cwd(), "db_snailhr.json");
  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: File ${jsonPath} not found.`);
    process.exit(1);
  }

  const dbData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const employees = dbData.employees || [];

  console.log(`Found ${employees.length} employees in db_snailhr.json. Updating Supabase...`);

  for (const emp of employees) {
    if (!emp.branch) continue;
    console.log(`Updating ${emp.fullName} (${emp.id}) -> Branch: ${emp.branch}`);
    const { error } = await supabase
      .from("employees")
      .update({ branch: emp.branch })
      .eq("id", emp.id);

    if (error) {
      console.error(`Error updating employee ${emp.id}:`, error.message);
    }
  }

  console.log("Database update completed successfully!");
}

run().catch((err) => {
  console.error("Execution failed:", err);
});
