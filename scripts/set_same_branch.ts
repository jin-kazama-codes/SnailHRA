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
const TARGET_BRANCH = "Noida Field Hub";

async function run() {
  // 1. Update Supabase
  console.log(`Updating all employees in Supabase to branch "${TARGET_BRANCH}"...`);
  const { error } = await supabase
    .from("employees")
    .update({ branch: TARGET_BRANCH })
    .neq("id", "is_null_check_placeholder_dummy"); // Updates all rows

  if (error) {
    console.error("Error updating Supabase:", error.message);
  } else {
    console.log("Successfully updated all employees in Supabase!");
  }

  // 2. Update local db_snailhr.json
  const jsonPath = path.resolve(process.cwd(), "db_snailhr.json");
  if (fs.existsSync(jsonPath)) {
    console.log(`Updating all employees in db_snailhr.json to branch "${TARGET_BRANCH}"...`);
    const dbData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    if (dbData.employees) {
      dbData.employees = dbData.employees.map((emp: any) => ({
        ...emp,
        branch: TARGET_BRANCH
      }));
      fs.writeFileSync(jsonPath, JSON.stringify(dbData, null, 2), "utf8");
      console.log("Successfully updated db_snailhr.json!");
    }
  }
}

run().catch((err) => {
  console.error("Execution failed:", err);
});
