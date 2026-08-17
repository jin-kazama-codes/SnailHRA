// Script to add missing columns to Supabase using the admin REST API
// Run with: node add-missing-columns.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function runSQL(sql) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.log('RPC failed, trying direct query approach...', text);
    return false;
  }
  return true;
}

async function addColumnsViaUpsert() {
  // Try using supabase-js admin to run raw postgres via pg
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
  
  console.log('Checking employees table columns...');
  
  // Test if salary_esi_opt_in exists by querying with select
  const { data: testData, error: testErr } = await supabase
    .from('employees')
    .select('salary_esi_opt_in')
    .limit(1);
    
  if (testErr && testErr.message?.includes('salary_esi_opt_in')) {
    console.log('Column salary_esi_opt_in MISSING from employees table');
  } else {
    console.log('Column salary_esi_opt_in EXISTS in employees table');
  }
  
  const { data: testData2, error: testErr2 } = await supabase
    .from('employees')
    .select('salary_esi_deduction')
    .limit(1);
    
  if (testErr2 && testErr2.message?.includes('salary_esi_deduction')) {
    console.log('Column salary_esi_deduction MISSING from employees table');
  } else {
    console.log('Column salary_esi_deduction EXISTS in employees table');
  }
  
  const { data: testData3, error: testErr3 } = await supabase
    .from('employees')
    .select('salary_pf_mode')
    .limit(1);
    
  if (testErr3 && testErr3.message?.includes('salary_pf_mode')) {
    console.log('Column salary_pf_mode MISSING from employees table');
  } else {
    console.log('Column salary_pf_mode EXISTS in employees table');
  }
  
  const { data: testData4, error: testErr4 } = await supabase
    .from('employees')
    .select('salary_tds_opt_in')
    .limit(1);
    
  if (testErr4 && testErr4.message?.includes('salary_tds_opt_in')) {
    console.log('Column salary_tds_opt_in MISSING from employees table');
  } else {
    console.log('Column salary_tds_opt_in EXISTS in employees table');
  }
  
  // Check payslips
  const { data: slipData, error: slipErr } = await supabase
    .from('payslips')
    .select('esi_deduction')
    .limit(1);
    
  if (slipErr && slipErr.message?.includes('esi_deduction')) {
    console.log('Column esi_deduction MISSING from payslips table');
  } else {
    console.log('Column esi_deduction EXISTS in payslips table');
  }
}

addColumnsViaUpsert().catch(console.error);
