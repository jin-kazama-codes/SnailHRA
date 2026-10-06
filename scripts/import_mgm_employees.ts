import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

import { supabase } from "../src/lib/supabase";
import { supabaseAdmin } from "../src/lib/supabase-admin";
import bcrypt from "bcryptjs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const MGM_COMPANY_ID = "a1b2c3d4-0001-0001-0001-000000000001";
const DEFAULT_RAW_PASSWORD = "MGM@2026";

const client = supabaseAdmin || supabase;

if (!client) {
  console.error("FATAL: Supabase client is not available.");
  process.exit(1);
}

// Department mapping based on designation title
function inferDepartment(desig: string): string {
  const d = desig.toLowerCase();
  if (d.includes("ceo") || d.includes("director") || d.includes("chro") || d.includes("cto") || d.includes("cbo") || d.includes("cfo")) {
    return "Executive";
  }
  if (d.includes("sales") || d.includes("marketing") || d.includes("relationship")) {
    return "Sales";
  }
  if (d.includes("credit") || d.includes("risk") || d.includes("underwriter")) {
    return "Risk";
  }
  if (d.includes("finance") || d.includes("account")) {
    return "Finance";
  }
  if (d.includes("collection") || d.includes("operation") || d.includes("cluster") || d.includes("house keeping")) {
    return "Operations";
  }
  if (d.includes("hr")) {
    return "HR";
  }
  return "Operations";
}

// Branch inference based on code or branch text
function inferBranch(branchRaw: string, code: string): string {
  if (branchRaw && branchRaw.trim()) {
    return branchRaw.trim();
  }
  const c = (code || "").toUpperCase();
  if (c.startsWith("MGMJHL")) return "Jhalawar Branch";
  if (c.startsWith("MGMBKN")) return "Bikaner Branch";
  if (c.startsWith("MGMLDH")) return "Ludhiana Branch";
  if (c.startsWith("MGMSGN")) return "Sri Ganganagar Branch";
  if (c.startsWith("MGMVEM")) return "Ludhiana Branch";
  if (c.startsWith("MGMDIR")) return "Ludhiana Branch";
  return "Ludhiana Branch";
}

async function runImport() {
  console.log("=== STARTING MGM FINANCIERS EMPLOYEE IMPORT ===");
  console.log(`Company ID: ${MGM_COMPANY_ID}`);

  // 1. Fetch current existing employees for MGM Financiers
  const { data: existingEmps, error: existingErr } = await client
    .from("employees")
    .select("id, full_name, email, phone, role, branch, designation_id, department, salary_basic")
    .eq("company_id", MGM_COMPANY_ID);

  if (existingErr) {
    console.error("Error fetching existing employees:", existingErr);
    process.exit(1);
  }

  console.log(`Found ${existingEmps?.length || 0} existing employees in MGM Financiers.`);
  
  // Track existing identifiers to ensure zero modifications
  const existingEmailSet = new Set((existingEmps || []).map(e => (e.email || "").toLowerCase().trim()).filter(Boolean));
  const existingNameSet = new Set((existingEmps || []).map(e => (e.full_name || "").toLowerCase().trim()).filter(Boolean));
  const existingIdSet = new Set((existingEmps || []).map(e => (e.id || "").toUpperCase().trim()).filter(Boolean));

  // Also fetch all employee IDs across all companies to avoid primary key collisions
  const { data: allDbEmps } = await client.from("employees").select("id");
  const allDbIds = new Set((allDbEmps || []).map(e => (e.id || "").toUpperCase().trim()));

  // 2. Fetch existing designations
  const { data: dbDesignations, error: desErr } = await client.from("designations").select("*");
  if (desErr) {
    console.error("Error fetching designations:", desErr);
    process.exit(1);
  }

  const desMap = new Map<string, string>(); // lowercase title -> id
  (dbDesignations || []).forEach(d => {
    desMap.set(d.title.toLowerCase().trim(), d.id);
  });

  // 3. Read Excel file
  const excelPath = path.resolve(process.cwd(), "assets", "Employee_Import_Data_Completed.xlsx");
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);
  console.log(`Read ${rows.length} total rows from Excel file.`);

  // 4. Ensure all designations from Excel exist in DB
  const missingDesignations = new Set<string>();
  rows.forEach(r => {
    const des = (r["Designation"] || "").trim();
    if (des && !desMap.has(des.toLowerCase())) {
      missingDesignations.add(des);
    }
  });

  if (missingDesignations.size > 0) {
    console.log(`Creating ${missingDesignations.size} new designations in database...`);
    for (const title of missingDesignations) {
      const newDesId = `des-mgm-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const department = inferDepartment(title);
      const { error: insertDesErr } = await client.from("designations").insert({
        id: newDesId,
        title: title,
        department: department,
        company_id: MGM_COMPANY_ID
      });
      if (insertDesErr) {
        console.warn(`Warning creating designation "${title}":`, insertDesErr.message);
      } else {
        console.log(`Created designation: "${title}" -> ${newDesId} (${department})`);
        desMap.set(title.toLowerCase(), newDesId);
      }
    }
  }

  // 5. Hash default password
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(DEFAULT_RAW_PASSWORD, salt);

  // 6. Find highest numeric ID among EMP-XXXX for auto-generating IDs
  let maxEmpNum = 2132;
  allDbIds.forEach(id => {
    const m = id.match(/EMP-(\d+)/i);
    if (m && m[1]) {
      const num = parseInt(m[1], 10);
      if (!isNaN(num) && num > maxEmpNum) maxEmpNum = num;
    }
  });

  // 7. Process rows: Skip existing, prepare new inserts
  const skippedList: any[] = [];
  const employeesToInsert: any[] = [];

  rows.forEach((r, idx) => {
    const rawName = (r["Full Name"] || "").trim();
    const rawEmail = (r["Email"] || "").trim().toLowerCase();
    const rawCode = (r["Employee ID"] || "").trim();

    // Check if this employee matches an existing record
    const matchByEmail = rawEmail && existingEmailSet.has(rawEmail);
    const matchByName = rawName && existingNameSet.has(rawName.toLowerCase());
    const isKpMohindra = rawName.toLowerCase().includes("k.p mohindra") && existingNameSet.has("kushinder paul mohindra");

    if (matchByEmail || matchByName || isKpMohindra) {
      skippedList.push({
        row: idx + 1,
        name: rawName,
        email: rawEmail,
        code: rawCode,
        reason: matchByEmail ? "Email match with existing record" : "Name match with existing record"
      });
      return;
    }

    // Determine unique ID for the employee
    let empId = rawCode;
    if (!empId || allDbIds.has(empId.toUpperCase())) {
      maxEmpNum++;
      empId = `EMP-${maxEmpNum}`;
      while (allDbIds.has(empId.toUpperCase())) {
        maxEmpNum++;
        empId = `EMP-${maxEmpNum}`;
      }
    }
    allDbIds.add(empId.toUpperCase());

    // Determine Email
    let email = rawEmail;
    if (!email) {
      const cleanCode = (rawCode || empId).toLowerCase().replace(/[^a-z0-9]/g, "");
      email = `${cleanCode}@mgmfinanciers.com`;
    }

    // Determine Designation and Department
    const desTitle = (r["Designation"] || "").trim();
    const desId = desMap.get(desTitle.toLowerCase()) || null;
    const department = desTitle ? inferDepartment(desTitle) : "Operations";

    // Determine Branch
    const branch = inferBranch(r["Branch"], rawCode);

    // Bank Details
    const bankAccount = r["Account Number"] ? String(r["Account Number"]).trim() : "";
    const bankIfsc = r["IFSC Code"] ? String(r["IFSC Code"]).trim() : "";

    // Address & Phone
    const address = r["Address"] ? String(r["Address"]).trim() : "";
    const phone = r["Phone"] ? String(r["Phone"]).trim() : "";
    const bio = r["Bio"] ? String(r["Bio"]).trim() : "";

    const newEmpRecord = {
      id: empId,
      company_id: MGM_COMPANY_ID,
      full_name: rawName,
      email: email,
      phone: phone,
      role: "employee",
      designation_id: desId,
      department: department,
      branch: branch,
      joining_date: "2026-04-01",
      status: "Active",
      address: address,
      bio: bio,
      salary_basic: 0,
      salary_hra: 0,
      salary_allowances: 0,
      salary_pf_deduction: 0,
      salary_tds_deduction: 0,
      bank_account_number: bankAccount,
      bank_name: "",
      bank_ifsc: bankIfsc,
      password: hashedPassword,
      avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop"
    };

    employeesToInsert.push(newEmpRecord);
  });

  console.log(`\n=== IMPORT SUMMARY BEFORE WRITING ===`);
  console.log(`Total Excel Rows: ${rows.length}`);
  console.log(`Existing Rows Skipped (NO CHANGE): ${skippedList.length}`);
  console.log(`New Employees to Insert: ${employeesToInsert.length}`);

  console.log("\nSkipped Existing Employees:");
  skippedList.forEach(s => console.log(`- Row ${s.row}: "${s.name}" (${s.email || 'no email'}) -> ${s.reason}`));

  console.log(`\nInserting ${employeesToInsert.length} employees into Supabase...`);
  
  // Insert in batches of 10 to ensure stability
  const batchSize = 10;
  for (let i = 0; i < employeesToInsert.length; i += batchSize) {
    const batch = employeesToInsert.slice(i, i + batchSize);
    const { data: inserted, error: insertErr } = await client.from("employees").insert(batch);
    if (insertErr) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, insertErr);
      process.exit(1);
    }
    console.log(`Successfully inserted batch ${i / batchSize + 1} (${batch.length} employees).`);
  }

  // 8. Post-verification
  const { data: finalEmps, error: finalErr } = await client
    .from("employees")
    .select("id, full_name, email, phone, role, branch, designation_id, department, salary_basic")
    .eq("company_id", MGM_COMPANY_ID);

  if (finalErr) {
    console.error("Error verifying final employee count:", finalErr);
  } else {
    console.log(`\n=== VERIFICATION COMPLETE ===`);
    console.log(`Total employees now under MGM Financiers Pvt Ltd: ${finalEmps?.length}`);
    
    // Verify untouched status of original 11
    let untouchedCount = 0;
    existingEmps?.forEach(orig => {
      const curr = finalEmps?.find(f => f.id === orig.id);
      if (curr && curr.salary_basic === orig.salary_basic && curr.full_name === orig.full_name && curr.email === orig.email) {
        untouchedCount++;
      }
    });
    console.log(`Original employees fully verified untouched: ${untouchedCount}/${existingEmps?.length}`);
  }

  process.exit(0);
}

runImport().catch(err => {
  console.error("Import error:", err);
  process.exit(1);
});
