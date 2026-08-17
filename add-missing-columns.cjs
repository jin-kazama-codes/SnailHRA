// Script to add missing columns to Supabase
// Run with: node add-missing-columns.cjs

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Use the Supabase Management API to run SQL
// The project ref is extracted from the URL
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

async function runSQL(sql, description) {
  console.log(`Running: ${description}...`);
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  
  const text = await response.text();
  if (response.ok) {
    console.log(`✓ Success: ${description}`);
    return true;
  } else {
    console.log(`✗ Failed (${response.status}): ${description}`, text.substring(0, 200));
    return false;
  }
}

async function addMissingColumns() {
  console.log(`Project: ${projectRef}`);
  console.log('Adding missing columns to Supabase...\n');

  const queries = [
    {
      sql: `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS salary_pf_mode TEXT DEFAULT 'percentage'`,
      desc: 'Add salary_pf_mode to employees'
    },
    {
      sql: `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS salary_tds_opt_in BOOLEAN DEFAULT true`,
      desc: 'Add salary_tds_opt_in to employees'
    },
    {
      sql: `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS salary_tds_mode TEXT DEFAULT 'slab'`,
      desc: 'Add salary_tds_mode to employees'
    },
    {
      sql: `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS salary_esi_opt_in BOOLEAN DEFAULT true`,
      desc: 'Add salary_esi_opt_in to employees'
    },
    {
      sql: `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS salary_esi_deduction NUMERIC DEFAULT 0`,
      desc: 'Add salary_esi_deduction to employees'
    },
    {
      sql: `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS salary JSONB`,
      desc: 'Add salary JSONB column to employees'
    },
    {
      sql: `ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS esi_deduction NUMERIC DEFAULT 0`,
      desc: 'Add esi_deduction to payslips'
    }
  ];

  for (const q of queries) {
    await runSQL(q.sql, q.desc);
  }
  
  console.log('\nDone!');
}

addMissingColumns().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
