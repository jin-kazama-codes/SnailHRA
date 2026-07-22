import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Starting seed script...");
  
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync("Nawaz123#", salt);
  console.log(`Generated bcrypt hash for 'Nawaz123#': ${hashedPassword}`);

  // 1. Fetch and update Supabase employees
  console.log("Fetching employees from Supabase...");
  const { data: employees, error } = await supabase.from("employees").select("*");
  if (error) {
    console.error("Error fetching employees from Supabase:", error);
  } else if (employees && employees.length > 0) {
    console.log(`Fetched ${employees.length} employees from Supabase. Updating passwords...`);
    for (const emp of employees) {
      console.log(`Updating Supabase record for ${emp.full_name || emp.fullName} (${emp.id})...`);
      const { error: updateErr } = await supabase
        .from("employees")
        .update({ password: hashedPassword })
        .eq("id", emp.id);
        
      if (updateErr) {
        console.error(`Failed to update ${emp.full_name}:`, updateErr.message);
      } else {
        console.log(`Updated ${emp.full_name} in Supabase successfully.`);
      }
    }
  } else {
    console.log("No employees found in Supabase.");
  }

  // 2. Update local db_snailhr.json if it exists
  const localDbPath = path.join(__dirname, "db_snailhr.json");
  if (fs.existsSync(localDbPath)) {
    console.log("Seeding local db_snailhr.json...");
    try {
      const fileData = fs.readFileSync(localDbPath, "utf-8");
      const db = JSON.parse(fileData);
      if (db.employees && Array.isArray(db.employees)) {
        db.employees = db.employees.map(emp => ({
          ...emp,
          password: hashedPassword
        }));
        fs.writeFileSync(localDbPath, JSON.stringify(db, null, 2), "utf-8");
        console.log(`Local db_snailhr.json updated for ${db.employees.length} employees.`);
      }
    } catch (err) {
      console.error("Failed to seed local db:", err);
    }
  }

  console.log("Seeding process completed!");
}

run().catch(console.error);
