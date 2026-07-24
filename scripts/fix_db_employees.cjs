const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db_snailhr.json');
if (!fs.existsSync(dbPath)) {
  console.log("db_snailhr.json does not exist yet.");
  process.exit(0);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

if (!Array.isArray(db.employees)) {
  db.employees = [];
}

// 1. Restore EMP-1005, EMP-1006, EMP-1007
const original1005 = {
  id: 'EMP-1005',
  fullName: 'Siddharth Malhotra',
  email: 'siddharth.malhotra@mgmfinanciers.com',
  phone: '+91 9379896728',
  role: 'employee',
  designationId: 'des-1',
  department: 'Executive',
  branch: 'Mumbai Branch',
  joiningDate: '2024-07-21',
  status: 'Active',
  salary: { basic: 51230, hra: 20492, allowances: 10246, pfDeduction: 4098 },
  bankDetails: { accountNumber: '804962213777', bankName: 'HDFC Bank', ifsc: 'HDFC0000104' },
  address: 'Flat 101, Shanti Enclave, Sector 12, Mumbai',
  emergencyContact: { name: 'Vikram Malhotra', relation: 'Spouse', phone: '+91 8491677162' },
  documents: [],
  onboardingTasks: [],
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
  bio: 'Operations coordinator specialized in Managing Director metrics.'
};

const original1006 = {
  id: 'EMP-1006',
  fullName: 'Arjun Rao',
  email: 'arjun.rao@mgmfinanciers.com',
  phone: '+91 9739350338',
  role: 'employee',
  designationId: 'des-2',
  department: 'Risk',
  branch: 'Noida HQ',
  joiningDate: '2024-08-03',
  status: 'Active',
  salary: { basic: 44480, hra: 17792, allowances: 8896, pfDeduction: 3558 },
  bankDetails: { accountNumber: '247031512826', bankName: 'ICICI Bank', ifsc: 'ICIC0000213' },
  address: 'Flat 108, Shanti Enclave, Sector 13, Noida',
  emergencyContact: { name: 'Sanjay Rao', relation: 'Father', phone: '+91 8196616285' },
  documents: [],
  onboardingTasks: [],
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop',
  bio: 'Operations coordinator specialized in Head of Credit & Risk metrics.'
};

const original1007 = {
  id: 'EMP-1007',
  fullName: 'Aditi Kumar',
  email: 'aditi.kumar@mgmfinanciers.com',
  phone: '+91 9379667870',
  role: 'employee',
  designationId: 'des-3',
  department: 'HR',
  branch: 'Pune Digital Office',
  joiningDate: '2024-05-21',
  status: 'Active',
  salary: { basic: 39967, hra: 15987, allowances: 7993, pfDeduction: 3197 },
  bankDetails: { accountNumber: '550831498643', bankName: 'SBI', ifsc: 'SBIN0001234' },
  address: 'Flat 115, Shanti Enclave, Sector 14, Pune',
  emergencyContact: { name: 'Kavita Kumar', relation: 'Mother', phone: '+91 8945984434' },
  documents: [],
  onboardingTasks: [],
  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop',
  bio: 'Operations coordinator specialized in HR Business Partner metrics.'
};

// Replace or restore 1005, 1006, 1007
const updateOrPush = (empObj) => {
  const idx = db.employees.findIndex(e => e.id === empObj.id);
  if (idx >= 0) {
    db.employees[idx] = empObj;
  } else {
    db.employees.push(empObj);
  }
};

updateOrPush(original1005);
updateOrPush(original1006);
updateOrPush(original1007);

// Find max existing ID integer
let maxNum = 1032;
db.employees.forEach(e => {
  const m = String(e.id).match(/^EMP-(\d+)$/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (!isNaN(n) && n > maxNum) maxNum = n;
  }
});

// Re-add imported employees with fresh unique IDs (e.g., EMP-1033, EMP-1034, EMP-1035)
const vikram = {
  id: `EMP-${++maxNum}`,
  fullName: "Vikramaditya Rao",
  email: "vikramaditya.rao@mgmfinanciers.com",
  phone: "+91 98111 22334",
  role: "employee",
  designationId: "des-4",
  department: "Loans",
  branch: "Mumbai Branch",
  joiningDate: "2026-08-01",
  status: "Active",
  salary: { basic: 58000, hra: 23200, allowances: 14000, pfDeduction: 4200 },
  bankDetails: { accountNumber: "881900223411", bankName: "Kotak Mahindra Bank", ifsc: "KKBK0000123" },
  address: "A-45, Vaishali Nagar, Mumbai, Maharashtra",
  emergencyContact: { name: "Pooja Rao", relation: "Spouse", phone: "+91 98111 99999" },
  documents: [],
  onboardingTasks: [],
  avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop",
  bio: "Senior Credit & Loan Evaluation Specialist."
};

const neha = {
  id: `EMP-${++maxNum}`,
  fullName: "Neha Saxena",
  email: "neha.saxena@mgmfinanciers.com",
  phone: "+91 97222 33445",
  role: "employee",
  designationId: "des-4",
  department: "Risk",
  branch: "Noida HQ",
  joiningDate: "2026-08-05",
  status: "Active",
  salary: { basic: 49000, hra: 19600, allowances: 11000, pfDeduction: 3500 },
  bankDetails: { accountNumber: "91201004567890", bankName: "Axis Bank", ifsc: "UTIB0000567" },
  address: "Block B, Sector 62, Noida, UP",
  emergencyContact: { name: "Rohan Saxena", relation: "Brother", phone: "+91 97222 88888" },
  documents: [],
  onboardingTasks: [],
  avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop",
  bio: "Fraud Risk & Portfolio Compliance Officer."
};

const tarun = {
  id: `EMP-${++maxNum}`,
  fullName: "Tarun Deshmukh",
  email: "tarun.deshmukh@mgmfinanciers.com",
  phone: "+91 96333 44556",
  role: "employee",
  designationId: "des-4",
  department: "Operations",
  branch: "Pune Digital Office",
  joiningDate: "2026-08-10",
  status: "Active",
  salary: { basic: 62000, hra: 24800, allowances: 15000, pfDeduction: 4800 },
  bankDetails: { accountNumber: "000401987654", bankName: "ICICI Bank", ifsc: "ICIC0000004" },
  address: "Plot 12, Baner Road, Pune, Maharashtra",
  emergencyContact: { name: "Meenal Deshmukh", relation: "Spouse", phone: "+91 96333 77777" },
  documents: [],
  onboardingTasks: [],
  avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&auto=format&fit=crop",
  bio: "Field Operations & Collections Management Lead."
};

updateOrPush(vikram);
updateOrPush(neha);
updateOrPush(tarun);

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
console.log("Restored original EMP-1005..EMP-1007 and reassigned Excel employees to new unique IDs:", vikram.id, neha.id, tarun.id);
