import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

import { supabase } from "../src/lib/supabase";
import { supabaseAdmin } from "../src/lib/supabase-admin";

const client = supabaseAdmin || supabase;

if (!client) {
  console.error("FATAL: Supabase client is not available.");
  process.exit(1);
}

const ID_UPDATES: { oldId: string; newId: string; name: string }[] = [
  { oldId: "EMP-2119", newId: "MGMDIR003", name: "Ratul Mohindra" },
  { oldId: "EMP-2120", newId: "MGMLDH004", name: "Sunny Kumar" },
  { oldId: "EMP-2121", newId: "MGMLDH005", name: "Samarjit Singh" },
  { oldId: "EMP-2122", newId: "MGMDIR001", name: "Kushinder Paul Mohindra" },
  { oldId: "EMP-2123", newId: "MGMDIR002", name: "Anchal Sood" },
  { oldId: "EMP-2124", newId: "MGMDIR004", name: "Monika Sood" },
  { oldId: "CODE-2125", newId: "MGMDIR007", name: "Akriti Goyal Mohindra" },
  { oldId: "CODE-2126", newId: "MGMDIR0008", name: "Anubhav Goyal" },
  { oldId: "EMP-2127", newId: "MGMJHL024", name: "Satyendra Singh Sengar" },
  { oldId: "EMP-2131", newId: "MGMLDH006", name: "Vikram Choudhary" }
];

const RELATED_TABLES = [
  "attendance",
  "leaves",
  "expenses",
  "fines",
  "payslips",
  "grievance_tickets",
  "performance_records",
  "reimbursements",
  "inventory_requests",
  "resignation_requests"
];

async function updateEmployeeIds() {
  console.log("=== STARTING CLONE & CASCADE EMPLOYEE ID UPDATES (WITH UNIQUE EMAIL HANDLING) ===");

  for (const item of ID_UPDATES) {
    console.log(`\nProcessing ${item.name}: ${item.oldId} -> ${item.newId}`);

    // Check if newId already exists
    const { data: alreadyNew } = await client
      .from("employees")
      .select("id")
      .eq("id", item.newId)
      .maybeSingle();

    // Check if oldId still exists
    const { data: oldEmp } = await client
      .from("employees")
      .select("*")
      .eq("id", item.oldId)
      .maybeSingle();

    if (!oldEmp) {
      if (alreadyNew) {
        console.log(`[Already Complete] ${item.name} is already using ID ${item.newId}.`);
      } else {
        console.warn(`[Warning] Neither ${item.oldId} nor ${item.newId} found for ${item.name}.`);
      }
      continue;
    }

    const originalEmail = oldEmp.email;
    const tempEmail = originalEmail ? `${originalEmail}.migrating-${Date.now()}` : `temp-${Date.now()}@migration.local`;

    // Step 0: Temporarily rename oldEmp.email to avoid unique email constraint collision
    if (originalEmail) {
      const { error: tempEmailErr } = await client
        .from("employees")
        .update({ email: tempEmail })
        .eq("id", item.oldId);

      if (tempEmailErr) {
        console.error(`Failed to assign temporary email for ${item.oldId}:`, tempEmailErr.message);
        continue;
      }
    }

    // Step 1: Insert newEmp with newId and original email
    const cloneData = {
      ...oldEmp,
      id: item.newId,
      email: originalEmail
    };

    const { error: insErr } = await client.from("employees").insert(cloneData);
    if (insErr) {
      console.error(`Failed to insert ${item.newId}:`, insErr.message);
      // Revert temp email
      if (originalEmail) {
        await client.from("employees").update({ email: originalEmail }).eq("id", item.oldId);
      }
      continue;
    }
    console.log(`[Step 1 OK] Cloned ${item.oldId} to new record ${item.newId} with email ${originalEmail}`);

    // Step 2: Cascade update all related tables from oldId to newId
    for (const table of RELATED_TABLES) {
      try {
        const { data: matches, error: selectErr } = await client
          .from(table)
          .select("id")
          .eq("employee_id", item.oldId);

        if (!selectErr && matches && matches.length > 0) {
          const { error: cascadeErr } = await client
            .from(table)
            .update({ employee_id: item.newId })
            .eq("employee_id", item.oldId);

          if (cascadeErr) {
            console.warn(`Warning updating table ${table} for ${item.oldId}:`, cascadeErr.message);
          } else {
            console.log(`  [Step 2 OK] Cascaded ${matches.length} record(s) in '${table}' from ${item.oldId} to ${item.newId}`);
          }
        }
      } catch (err: any) {
        console.warn(`Exception updating table ${table}:`, err?.message || err);
      }
    }

    // Step 3: Delete oldId now that no FK references point to it
    const { error: delErr } = await client
      .from("employees")
      .delete()
      .eq("id", item.oldId);

    if (delErr) {
      console.error(`Failed to remove old record ${item.oldId}:`, delErr.message);
    } else {
      console.log(`[Step 3 OK] Removed obsolete record ${item.oldId}`);
    }
  }

  // Verification step
  console.log("\n=== FINAL VERIFICATION ACROSS ALL TARGET IDS ===");
  const targetIds = ID_UPDATES.map(u => u.newId).concat(["EMP-2132"]);
  const { data: verifiedEmps, error: verErr } = await client
    .from("employees")
    .select("id, full_name, email, role, salary_basic")
    .in("id", targetIds);

  if (verErr) {
    console.error("Verification query error:", verErr);
  } else {
    console.log(`Successfully verified all ${verifiedEmps?.length} updated employees:`);
    verifiedEmps?.forEach(e => {
      console.log(`- [${e.id}] ${e.full_name} (${e.email}) | Basic: ₹${e.salary_basic}`);
    });
  }

  // Check total employees for MGM Financiers
  const { data: mgmAll } = await client
    .from("employees")
    .select("id")
    .eq("company_id", "a1b2c3d4-0001-0001-0001-000000000001");
  console.log(`\nTotal employees under MGM Financiers Pvt Ltd: ${mgmAll?.length} (Should be 52)`);

  process.exit(0);
}

updateEmployeeIds().catch(err => {
  console.error("Update process fatal error:", err);
  process.exit(1);
});
