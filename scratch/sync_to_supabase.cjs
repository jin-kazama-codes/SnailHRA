/**
 * sync_to_supabase.cjs
 * Step 1: Fetch valid designation IDs from Supabase
 * Step 2: Insert designations if needed
 * Step 3: Delete old employees for company from Supabase
 * Step 4: Insert 35 employees from local db_snailhr.json
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const TARGET_COMPANY_ID = 'a1b2c3d4-0001-0001-0001-000000000001';

const db = JSON.parse(fs.readFileSync(path.join(__dirname, '../db_snailhr.json'), 'utf8'));
const employees = db.employees.filter(e => e.companyId === TARGET_COMPANY_ID);

console.log(`\nFound ${employees.length} employees to sync...\n`);

async function main() {

  // ── Step 1: Check existing designations in Supabase ──────────────────────
  console.log('🔍 Fetching existing designations from Supabase...');
  const { data: existingDesigs, error: desigFetchErr } = await supabase
    .from('designations')
    .select('id, title')
    .eq('company_id', TARGET_COMPANY_ID);

  if (desigFetchErr) {
    console.warn('⚠️  Could not fetch designations:', desigFetchErr.message);
  }

  const existingDesigIds = (existingDesigs || []).map(d => d.id);
  console.log('Existing designation IDs:', existingDesigIds);

  // ── Step 2: Upsert required designations ─────────────────────────────────
  const requiredDesignations = [
    { id: 'des-field-agent', title: 'Field Sales Agent',  department: 'Sales',     company_id: TARGET_COMPANY_ID },
    { id: 'des-admin',       title: 'Managing Director',  department: 'Executive', company_id: TARGET_COMPANY_ID },
    { id: 'des-hr-mgr',      title: 'HR Manager',         department: 'HR',        company_id: TARGET_COMPANY_ID },
  ];

  console.log('\n📋 Upserting designations...');
  for (const desig of requiredDesignations) {
    const { error } = await supabase.from('designations').upsert(desig, { onConflict: 'id' });
    if (error) {
      console.warn(`  ⚠️  Designation upsert warning for ${desig.id}:`, error.message);
    } else {
      console.log(`  ✅ Designation ready: ${desig.id} - ${desig.title}`);
    }
  }

  // ── Step 3: Delete old employees for this company from Supabase ───────────
  console.log('\n🗑️  Deleting old employees from Supabase for company:', TARGET_COMPANY_ID);
  const { error: delErr } = await supabase
    .from('employees')
    .delete()
    .eq('company_id', TARGET_COMPANY_ID);

  if (delErr) {
    console.warn('⚠️  Delete warning:', delErr.message);
  } else {
    console.log('✅ Old employees cleared from Supabase\n');
  }

  // ── Step 4: Insert all 35 employees ──────────────────────────────────────
  let successCount = 0;
  let failCount = 0;

  for (const emp of employees) {
    const record = {
      id: emp.id,
      company_id: emp.companyId,
      full_name: emp.fullName,
      email: emp.email,
      phone: emp.phone || '',
      role: emp.role || 'employee',
      designation_id: emp.designationId || 'des-field-agent',
      department: emp.department || 'Sales',
      branch: emp.branch || 'Ludhiana Branch',
      joining_date: emp.joiningDate,
      date_of_birth: emp.dateOfBirth || null,
      status: emp.status || 'Active',
      address: emp.address || '',
      emergency_contact_name: emp.emergencyContact?.name || '',
      emergency_contact_relation: emp.emergencyContact?.relation || '',
      emergency_contact_phone: emp.emergencyContact?.phone || '',
      avatar_url: emp.avatarUrl || null,
      bio: emp.bio || '',
      salary_basic: emp.salary?.basic || 0,
      salary_hra: emp.salary?.hra || 0,
      salary_allowances: emp.salary?.allowances || 0,
      salary_pf_deduction: emp.salary?.pfDeduction || 0,
      salary_tds_deduction: emp.salary?.tdsDeduction || 0,
      bank_account_number: emp.bankDetails?.accountNumber || '',
      bank_name: emp.bankDetails?.bankName || '',
      bank_ifsc: emp.bankDetails?.ifsc || '',
      password: emp.password || '',
    };

    const { error } = await supabase.from('employees').upsert(record, { onConflict: 'id' });

    if (error) {
      console.error(`  ❌ Failed: ${emp.id} - ${emp.fullName} → ${error.message}`);
      failCount++;
    } else {
      console.log(`  ✅ Synced: ${emp.id} - ${emp.fullName} (${emp.branch})`);
      successCount++;
    }
  }

  console.log('\n========================================');
  console.log(`✅ Synced:  ${successCount} / ${employees.length}`);
  console.log(`❌ Failed:  ${failCount}`);
  console.log('========================================\n');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
