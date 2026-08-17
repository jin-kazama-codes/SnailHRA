// Script to add missing columns using supabase-js with service role key
// This uses the pg extension via supabase rpc 
// Run with: node add-missing-columns-v2.cjs

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

// Try using the existing Supabase connection with raw SQL via the pg_net or exec approach
// We try a different method: use upsert with the new columns and see if it works as a migration trick
async function tryAddColumn(tableName, columnName, columnType, defaultValue) {
  // Try fetching the column - if it fails it's missing, try adding it
  const { error } = await supabase.from(tableName).select(columnName).limit(1);
  
  if (error && (error.message.includes(columnName) || error.message.includes('column'))) {
    console.log(`Column ${columnName} missing from ${tableName}. SQL needed:`)
    console.log(`  ALTER TABLE public.${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnType}${defaultValue ? ` DEFAULT ${defaultValue}` : ''};`)
    return false;
  } else {
    console.log(`Column ${columnName} already exists in ${tableName}`);
    return true;
  }
}

async function main() {
  console.log('Checking all columns...\n');
  
  const allExist = await Promise.all([
    tryAddColumn('employees', 'salary_pf_mode', 'TEXT', "'percentage'"),
    tryAddColumn('employees', 'salary_tds_opt_in', 'BOOLEAN', 'true'),
    tryAddColumn('employees', 'salary_tds_mode', 'TEXT', "'slab'"),
    tryAddColumn('employees', 'salary_esi_opt_in', 'BOOLEAN', 'true'),
    tryAddColumn('employees', 'salary_esi_deduction', 'NUMERIC', '0'),
    tryAddColumn('employees', 'salary', 'JSONB', null),
    tryAddColumn('payslips', 'esi_deduction', 'NUMERIC', '0'),
  ]);
  
  const missing = allExist.filter(e => !e).length;
  if (missing > 0) {
    console.log(`\n⚠️  ${missing} column(s) are MISSING. Copy the SQL above and run it in Supabase SQL Editor.`);
    console.log('URL: https://supabase.com/dashboard/project/zbpyoklhtuwjkdmrmpdj/sql/new');
  } else {
    console.log('\n✓ All columns exist!');
  }
}

main().catch(console.error);
