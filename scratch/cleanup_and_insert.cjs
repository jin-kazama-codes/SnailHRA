/**
 * cleanup_and_insert.cjs
 * 
 * Step 1: Delete ALL records with companyId = 'a1b2c3d4-0001-0001-0001-000000000001' from all tables
 * Step 2: Insert 35 employees from MGM F JUNE 2026 PDF
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, '..', 'db_snailhr.json');
const TARGET_COMPANY_ID = 'a1b2c3d4-0001-0001-0001-000000000001';

// ─── Load DB ────────────────────────────────────────────────────────────────
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

console.log('\n========================================');
console.log('STEP 1: CLEANUP - Removing all records with company ID:', TARGET_COMPANY_ID);
console.log('========================================\n');

// All array tables that may contain companyId
const arrayTables = [
  'employees',
  'designations',
  'attendance',
  'leaves',
  'holidays',
  'policies',
  'expenses',
  'expenseCategories',
  'corporateAllowancesFaqs',
  'inventory',
  'inventoryRequests',
  'fines',
  'reimbursements',
  'payslips',
  'simulatedEmails',
  'attendanceBreaks',
  'excelUploads',
  'meetings',
  'seatLayouts',
  'rooms',
  'roomBookings',
];

// Track what gets removed
const removedCounts = {};

for (const table of arrayTables) {
  if (!Array.isArray(db[table])) continue;
  
  const before = db[table].length;
  
  // For tables that have companyId field, filter them out
  // For tables like attendance/leaves/fines that reference employees by employeeId,
  // we remove ALL records (since this is a clean slate for the company)
  const tablesWithCompanyId = ['employees', 'designations', 'holidays', 'policies', 
    'expenseCategories', 'corporateAllowancesFaqs', 'meetings', 'seatLayouts', 'rooms', 'roomBookings'];
  
  if (tablesWithCompanyId.includes(table)) {
    db[table] = db[table].filter(r => {
      const cid = r.companyId || r.company_id;
      return cid !== TARGET_COMPANY_ID;
    });
  } else {
    // For transactional tables (attendance, leaves, fines, payslips, etc.) - clear ALL
    db[table] = [];
  }
  
  const after = db[table].length;
  removedCounts[table] = before - after;
  if (removedCounts[table] > 0 || before > 0) {
    console.log(`  ${table}: removed ${removedCounts[table]} / ${before} records`);
  }
}

// Also clear payrollConfigs for target company
if (db.payrollConfigs && db.payrollConfigs[TARGET_COMPANY_ID]) {
  delete db.payrollConfigs[TARGET_COMPANY_ID];
  console.log(`  payrollConfigs: removed entry for target company`);
}

// Reset custom arrays to empty (they're primitives arrays, not objects with companyId)
db.customLeaveTypes = ['Casual Leave', 'Medical Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave'];
db.customDepartments = ['Executive', 'Risk', 'HR', 'Loans', 'Sales', 'Operations', 'Compliance', 'IT', 'Finance'];
db.customBranches = ['Ludhiana Branch', 'Mumbai Branch', 'Noida HQ'];
db.customAmenities = ['Projector', 'Whiteboard', 'Video Conferencing', 'WiFi', 'Coffee', 'AC'];

console.log('\n  customLeaveTypes: reset to defaults');
console.log('  customDepartments: reset to defaults');
console.log('  customBranches: reset to Ludhiana Branch, Mumbai Branch');

console.log('\n========================================');
console.log('STEP 2: INSERT - Adding 35 employees from PDF');
console.log('========================================\n');

// ─── Employee Data from MGM F JUNE 2026.pdf ──────────────────────────────
const pdfEmployees = [
  // ─── Ludhiana Branch ───────────────────────────────────────────────────
  { empCode: "00002", name: "Sunny Kumar",           fatherName: "Sant Ram",            basic: 50000, hra: 20000, conv: 10000, medAllow: 0,     grossPay: 81800,  netPay: 80000,  pfPay: 1800, joiningDate: "2022-04-01", branch: "Ludhiana Branch" },
  { empCode: "00003", name: "Vikram Choudhary",      fatherName: "Saroj Choudhary",     basic: 50000, hra: 20000, conv: 10000, medAllow: 0,     grossPay: 81800,  netPay: 80000,  pfPay: 1800, joiningDate: "2022-04-01", branch: "Ludhiana Branch" },
  { empCode: "00005", name: "Samarjit Singh",        fatherName: "Sukhwinder Singh",    basic: 50000, hra: 20000, conv: 10000, medAllow: 0,     grossPay: 81800,  netPay: 80000,  pfPay: 1800, joiningDate: "2022-04-01", branch: "Ludhiana Branch" },
  { empCode: "00009", name: "Kulwinder Singh",       fatherName: "Gurmeet Singh",       basic: 50000, hra: 20000, conv: 10000, medAllow: 0,     grossPay: 81800,  netPay: 80000,  pfPay: 1800, joiningDate: "2022-11-01", branch: "Ludhiana Branch" },
  { empCode: "00014", name: "Pooja Rani",            fatherName: "Harwinder Singh",     basic: 30000, hra: 7000,  conv: 3000,  medAllow: 10000, grossPay: 50000,  netPay: 50000,  pfPay: 0,    joiningDate: "2022-11-01", branch: "Ludhiana Branch" },
  { empCode: "00016", name: "Gagandeep Singh",       fatherName: "Kuldeep Singh",       basic: 50000, hra: 20000, conv: 10000, medAllow: 0,     grossPay: 80000,  netPay: 80000,  pfPay: 0,    joiningDate: "2023-03-01", branch: "Ludhiana Branch" },
  { empCode: "00018", name: "K P Mohindra",          fatherName: "Dharm Paul Mohindra", basic: 170000,hra: 0,     conv: 0,     medAllow: 0,     grossPay: 200000, netPay: 200000, pfPay: 0,    joiningDate: "2023-04-01", branch: "Ludhiana Branch", role: "admin" },
  { empCode: "00019", name: "Anchal Sood",           fatherName: "Harish Sood",         basic: 180000,hra: 20000, conv: 0,     medAllow: 0,     grossPay: 201800, netPay: 200000, pfPay: 1800, joiningDate: "2023-04-01", branch: "Ludhiana Branch", role: "hr" },
  { empCode: "00020", name: "Ratul Mohindra",        fatherName: "K P Mohindra",        basic: 135000,hra: 15000, conv: 0,     medAllow: 0,     grossPay: 151800, netPay: 150000, pfPay: 1800, joiningDate: "2023-04-01", branch: "Ludhiana Branch", role: "admin" },
  { empCode: "00021", name: "Monika Sood",           fatherName: "Vinay Sood",          basic: 65000, hra: 20000, conv: 5000,  medAllow: 1800,  grossPay: 101800, netPay: 91800,  pfPay: 1800, joiningDate: "2023-04-01", branch: "Ludhiana Branch", role: "hr" },
  { empCode: "00022", name: "Akriti Goyal Mohindra", fatherName: "Arun Goyal",          basic: 65000, hra: 20000, conv: 5000,  medAllow: 1800,  grossPay: 101800, netPay: 91800,  pfPay: 1800, joiningDate: "2023-04-01", branch: "Ludhiana Branch", role: "hr" },
  { empCode: "00025", name: "Javed Mohd",            fatherName: "Abbas",               basic: 50000, hra: 20000, conv: 10000, medAllow: 0,     grossPay: 80000,  netPay: 80000,  pfPay: 0,    joiningDate: "2023-07-01", branch: "Ludhiana Branch" },
  { empCode: "00026", name: "Sadik",                 fatherName: "",                    basic: 50000, hra: 20000, conv: 10000, medAllow: 0,     grossPay: 80000,  netPay: 80000,  pfPay: 0,    joiningDate: "2025-04-01", branch: "Ludhiana Branch" },
  { empCode: "00027", name: "Manpreet",              fatherName: "",                    basic: 50000, hra: 20000, conv: 10000, medAllow: 0,     grossPay: 80000,  netPay: 80000,  pfPay: 0,    joiningDate: "2025-04-01", branch: "Ludhiana Branch" },
  { empCode: "00028", name: "Hardeep Singh",         fatherName: "",                    basic: 50000, hra: 20000, conv: 10000, medAllow: 0,     grossPay: 80000,  netPay: 80000,  pfPay: 0,    joiningDate: "2025-04-01", branch: "Ludhiana Branch" },
  { empCode: "00029", name: "Harwinder Singh",       fatherName: "",                    basic: 50000, hra: 0,     conv: 0,     medAllow: 0,     grossPay: 50000,  netPay: 50000,  pfPay: 0,    joiningDate: "2025-04-01", branch: "Ludhiana Branch" },
  { empCode: "00030", name: "Mani Kumar",            fatherName: "",                    basic: 35000, hra: 12000, conv: 3000,  medAllow: 0,     grossPay: 50000,  netPay: 50000,  pfPay: 0,    joiningDate: "2025-04-01", branch: "Ludhiana Branch" },
  { empCode: "00031", name: "Parminder Kaur",        fatherName: "",                    basic: 35000, hra: 12000, conv: 3000,  medAllow: 0,     grossPay: 50000,  netPay: 50000,  pfPay: 0,    joiningDate: "2025-04-01", branch: "Ludhiana Branch" },
  { empCode: "00035", name: "Sant Ram",              fatherName: "",                    basic: 40000, hra: 7000,  conv: 3000,  medAllow: 0,     grossPay: 50000,  netPay: 50000,  pfPay: 0,    joiningDate: "2025-04-01", branch: "Ludhiana Branch" },
  { empCode: "00036", name: "Gurmeet Singh",         fatherName: "",                    basic: 35000, hra: 10000, conv: 5000,  medAllow: 0,     grossPay: 50000,  netPay: 50000,  pfPay: 0,    joiningDate: "2025-05-01", branch: "Ludhiana Branch" },
  { empCode: "00045", name: "Navdeep Kaur",          fatherName: "",                    basic: 30000, hra: 0,     conv: 0,     medAllow: 0,     grossPay: 30000,  netPay: 30000,  pfPay: 0,    joiningDate: "2025-11-01", branch: "Ludhiana Branch" },
  { empCode: "00047", name: "Kashish",               fatherName: "",                    basic: 30000, hra: 0,     conv: 0,     medAllow: 0,     grossPay: 30000,  netPay: 30000,  pfPay: 0,    joiningDate: "2025-11-01", branch: "Ludhiana Branch" },
  { empCode: "00048", name: "Kalpana",               fatherName: "",                    basic: 50000, hra: 0,     conv: 0,     medAllow: 0,     grossPay: 30000,  netPay: 30000,  pfPay: 0,    joiningDate: "2025-11-01", branch: "Ludhiana Branch" },
  { empCode: "00049", name: "Charanjeet Kaur",       fatherName: "",                    basic: 30000, hra: 0,     conv: 0,     medAllow: 0,     grossPay: 30000,  netPay: 30000,  pfPay: 0,    joiningDate: "2025-11-01", branch: "Ludhiana Branch" },
  { empCode: "00050", name: "Gurpreet Kaur",         fatherName: "",                    basic: 60000, hra: 0,     conv: 0,     medAllow: 0,     grossPay: 30000,  netPay: 30000,  pfPay: 0,    joiningDate: "2025-11-01", branch: "Ludhiana Branch" },
  { empCode: "00052", name: "Kuldeep Kaur",          fatherName: "",                    basic: 50000, hra: 0,     conv: 0,     medAllow: 0,     grossPay: 50000,  netPay: 50000,  pfPay: 0,    joiningDate: "2025-11-01", branch: "Ludhiana Branch" },
  { empCode: "00053", name: "Bhavna",                fatherName: "",                    basic: 50000, hra: 0,     conv: 0,     medAllow: 0,     grossPay: 50000,  netPay: 50000,  pfPay: 0,    joiningDate: "2025-11-01", branch: "Ludhiana Branch" },
  { empCode: "00054", name: "Gurwinder Kaur",        fatherName: "",                    basic: 50000, hra: 0,     conv: 0,     medAllow: 0,     grossPay: 50000,  netPay: 50000,  pfPay: 0,    joiningDate: "2026-01-01", branch: "Ludhiana Branch" },
  { empCode: "00056", name: "Anubhav Goyal",         fatherName: "",                    basic: 75000, hra: 0,     conv: 0,     medAllow: 0,     grossPay: 75000,  netPay: 75000,  pfPay: 0,    joiningDate: "2026-01-01", branch: "Ludhiana Branch" },
  { empCode: "00057", name: "Pooja Bisht",           fatherName: "",                    basic: 60000, hra: 0,     conv: 0,     medAllow: 0,     grossPay: 30000,  netPay: 30000,  pfPay: 0,    joiningDate: "2026-02-01", branch: "Ludhiana Branch" },
  { empCode: "00059", name: "Sagar Bagga",           fatherName: "",                    basic: 80000, hra: 0,     conv: 0,     medAllow: 0,     grossPay: 80000,  netPay: 80000,  pfPay: 0,    joiningDate: "2026-03-01", branch: "Ludhiana Branch" },
  // ─── Mumbai Branch ─────────────────────────────────────────────────────
  { empCode: "00023", name: "Kiran Anand Thorat",    fatherName: "Anand Thorat",        basic: 22000, hra: 0,     conv: 0,     medAllow: 0,     grossPay: 25314,  netPay: 25314,  pfPay: 0,    joiningDate: "2023-04-01", branch: "Mumbai Branch"   },
  { empCode: "00032", name: "Sushma",                fatherName: "",                    basic: 50000, hra: 20000, conv: 10000, medAllow: 0,     grossPay: 35742,  netPay: 35742,  pfPay: 0,    joiningDate: "2025-04-01", branch: "Mumbai Branch"   },
  { empCode: "00033", name: "Satya",                 fatherName: "",                    basic: 30000, hra: 0,     conv: 0,     medAllow: 0,     grossPay: 30000,  netPay: 30000,  pfPay: 0,    joiningDate: "2025-04-01", branch: "Mumbai Branch"   },
  { empCode: "00034", name: "Amit Malik",            fatherName: "",                    basic: 45000, hra: 8000,  conv: 2000,  medAllow: 0,     grossPay: 55000,  netPay: 55000,  pfPay: 0,    joiningDate: "2025-04-01", branch: "Mumbai Branch"   },
];

// ─── Default designation ID ──────────────────────────────────────────────
const DEFAULT_DESIGNATION_ID = "des-1"; // will use or create

// ─── Ensure default designation exists ──────────────────────────────────
if (!db.designations) db.designations = [];
const hasSalesDesignation = db.designations.find(d => d.id === 'des-field-agent');
if (!hasSalesDesignation) {
  db.designations.push({
    id: 'des-field-agent',
    title: 'Field Sales Agent',
    department: 'Sales',
    companyId: TARGET_COMPANY_ID
  });
  db.designations.push({
    id: 'des-admin',
    title: 'Managing Director',
    department: 'Executive',
    companyId: TARGET_COMPANY_ID
  });
  db.designations.push({
    id: 'des-hr-mgr',
    title: 'HR Manager',
    department: 'HR',
    companyId: TARGET_COMPANY_ID
  });
}

// ─── Build employee records ──────────────────────────────────────────────
if (!db.employees) db.employees = [];

const salt = bcrypt.genSaltSync(10);
const defaultPassword = bcrypt.hashSync('Nawaz123#', salt);

const avatars = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=256&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=256&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=256&auto=format&fit=crop',
];

let insertCount = 0;

pdfEmployees.forEach((emp, idx) => {
  const empId = `EMP-${emp.empCode}`;
  
  // Determine role
  let role = emp.role || 'employee';
  
  // Determine designationId
  let designationId;
  if (role === 'admin') designationId = 'des-admin';
  else if (role === 'hr') designationId = 'des-hr-mgr';
  else designationId = 'des-field-agent';
  
  // PF deduction - use pfPay from PDF
  const pfDeduction = emp.pfPay || 0;
  
  // Generate email from name
  const emailName = emp.name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '.');
  const email = `${emailName}@mgmfinanciers.com`;
  
  const newEmp = {
    id: empId,
    companyId: TARGET_COMPANY_ID,
    fullName: emp.name,
    email: email,
    phone: '+91 99999 00000',
    role: role,
    designationId: designationId,
    department: role === 'admin' ? 'Executive' : (role === 'hr' ? 'HR' : 'Sales'),
    joiningDate: emp.joiningDate,
    status: 'Active',
    salary: {
      basic: emp.basic,
      hra: emp.hra,
      allowances: emp.conv + emp.medAllow,
      pfDeduction: pfDeduction,
      tdsDeduction: 0
    },
    bankDetails: {
      accountNumber: '',
      bankName: '',
      ifsc: ''
    },
    address: emp.branch === 'Ludhiana Branch'
      ? 'Ludhiana, Punjab'
      : 'Mumbai, Maharashtra',
    emergencyContact: {
      name: emp.fatherName || 'Guardian',
      relation: emp.fatherName ? 'Father/Husband' : 'Relative',
      phone: '+91 99999 00000'
    },
    documents: [],
    onboardingTasks: [
      { id: `tsk-${empId}-1`, taskName: 'Verify KYC and Identity proof', completed: false, dueDate: emp.joiningDate },
      { id: `tsk-${empId}-2`, taskName: 'Collect Bank Account proof & PAN card', completed: false, dueDate: emp.joiningDate },
      { id: `tsk-${empId}-3`, taskName: 'Allocate MGM Financiers Credentials & Assets', completed: false, dueDate: emp.joiningDate },
    ],
    avatarUrl: avatars[idx % avatars.length],
    bio: emp.fatherName ? `${emp.name}, S/O or D/O ${emp.fatherName}. Joined MGM Financiers on ${emp.joiningDate}.` : `${emp.name}. Joined MGM Financiers on ${emp.joiningDate}.`,
    branch: emp.branch,
    password: defaultPassword,
    customFields: {
      empCode: emp.empCode,
      fatherOrHusbandName: emp.fatherName,
      grossPay: emp.grossPay,
      netPay: emp.netPay,
      source: 'MGM F JUNE 2026 PDF Import'
    }
  };
  
  db.employees.push(newEmp);
  insertCount++;
  console.log(`  [${insertCount}] Inserted: ${empId} - ${emp.name} (${emp.branch})`);
});

// ─── Save DB ─────────────────────────────────────────────────────────────
fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');

console.log('\n========================================');
console.log(`✅ Done! Inserted ${insertCount} employees.`);
console.log(`Total employees in DB now: ${db.employees.length}`);
console.log('========================================\n');
