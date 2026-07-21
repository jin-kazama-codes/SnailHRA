import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "./src/lib/supabase.js";
import { 
  Employee, Designation, AttendancePunch, LeaveRequest, 
  Holiday, Policy, ExpenseClaim, InventoryItem, 
  InventoryRequest, Fine, Reimbursement, Payslip, SimulatedEmail, EmployeeDocument 
} from "./src/types";

// Setup __dirname and __filename in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_FILE = path.join(__dirname, "db_snailhr.json");

// Helper to load and save data
interface AppState {
  designations: Designation[];
  employees: Employee[];
  attendance: AttendancePunch[];
  leaves: LeaveRequest[];
  holidays: Holiday[];
  policies: Policy[];
  expenses: ExpenseClaim[];
  inventory: InventoryItem[];
  inventoryRequests: InventoryRequest[];
  fines: Fine[];
  reimbursements: Reimbursement[];
  payslips: Payslip[];
  simulatedEmails: SimulatedEmail[];
  
  // Custom configurations collections
  customLeaveTypes: string[];
  customDepartments: string[];
  customBranches: string[];
}

const initialDesignations: Designation[] = [
  { id: "des-1", title: "Managing Director", department: "Executive" },
  { id: "des-2", title: "Head of Credit & Risk", department: "Risk" },
  { id: "des-3", title: "HR Business Partner", department: "HR" },
  { id: "des-4", title: "Senior Loan Officer", department: "Loans" },
  { id: "des-5", title: "Insurance Underwriter", department: "Insurance" },
  { id: "des-6", title: "Sales Relationship Manager", department: "Sales" },
  { id: "des-7", title: "Collections Specialist", department: "Operations" },
  { id: "des-8", title: "Compliance Officer", department: "Compliance" }
];

const initialEmployees: Employee[] = [
  {
    id: "EMP-1001",
    fullName: "Amit Sharma",
    email: "amit.sharma@snailhr.com",
    phone: "+91 98765 43210",
    role: "admin",
    designationId: "des-2",
    department: "Risk",
    joiningDate: "2024-03-15",
    status: "Active",
    salary: {
      basic: 85000,
      hra: 34000,
      allowances: 21000,
      pfDeduction: 6500
    },
    bankDetails: {
      accountNumber: "987654321098",
      bankName: "HDFC Bank",
      ifsc: "HDFC0000104"
    },
    address: "B-402, Skyline Residency, Sector 62, Noida, UP - 201301",
    emergencyContact: {
      name: "Suman Sharma",
      relation: "Spouse",
      phone: "+91 98765 43211"
    },
    documents: [
      { id: "doc-1", name: "Aadhaar_Card.pdf", category: "ID Proof", uploadedAt: "2024-03-15", size: "1.2 MB" },
      { id: "doc-2", name: "Employment_Agreement.pdf", category: "Contract", uploadedAt: "2024-03-15", size: "3.4 MB" }
    ],
    onboardingTasks: [
      { id: "tsk-1", taskName: "Bank Account verification", completed: true, dueDate: "2024-03-20" },
      { id: "tsk-2", taskName: "Submit signed NDA", completed: true, dueDate: "2024-03-20" }
    ],
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop",
    bio: "Lead credit evaluation and risk assessment models for commercial and retail loan products. Over 10 years of experience in retail banking risk policies."
  },
  {
    id: "EMP-1002",
    fullName: "Priya Patel",
    email: "priya.patel@snailhr.com",
    phone: "+91 87654 32109",
    role: "hr",
    designationId: "des-3",
    department: "HR",
    joiningDate: "2024-06-01",
    status: "Active",
    salary: {
      basic: 60000,
      hra: 24000,
      allowances: 16000,
      pfDeduction: 5000
    },
    bankDetails: {
      accountNumber: "876543210987",
      bankName: "ICICI Bank",
      ifsc: "ICIC0000213"
    },
    address: "Flat 504, Emerald Court, Andheri East, Mumbai - 400069",
    emergencyContact: {
      name: "Ramesh Patel",
      relation: "Father",
      phone: "+91 87654 32108"
    },
    documents: [
      { id: "doc-3", name: "PAN_Card.pdf", category: "ID Proof", uploadedAt: "2024-06-01", size: "0.8 MB" },
      { id: "doc-4", name: "HR_Certifications.pdf", category: "Educational", uploadedAt: "2024-06-02", size: "4.1 MB" }
    ],
    onboardingTasks: [
      { id: "tsk-3", taskName: "ID verification", completed: true, dueDate: "2024-06-05" },
      { id: "tsk-4", taskName: "Welcome kit dispatch", completed: true, dueDate: "2024-06-05" }
    ],
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop",
    bio: "Managing end-to-end talent acquisition, employee relations, and policy compliance for SnailHR. Committed to nurturing our digital-first culture."
  },
  {
    id: "EMP-1003",
    fullName: "Rahul Verma",
    email: "rahul.verma@snailhr.com",
    phone: "+91 76543 21098",
    role: "employee",
    designationId: "des-4",
    department: "Loans",
    joiningDate: "2024-11-10",
    status: "Active",
    salary: {
      basic: 50000,
      hra: 20000,
      allowances: 15000,
      pfDeduction: 4200
    },
    bankDetails: {
      accountNumber: "765432109876",
      bankName: "State Bank of India",
      ifsc: "SBIN0001234"
    },
    address: "Row House No. 12, Rosewood Society, Baner, Pune - 411045",
    emergencyContact: {
      name: "Aarti Verma",
      relation: "Mother",
      phone: "+91 76543 21099"
    },
    documents: [
      { id: "doc-5", name: "Aadhaar_Rahul.pdf", category: "ID Proof", uploadedAt: "2024-11-10", size: "1.1 MB" }
    ],
    onboardingTasks: [
      { id: "tsk-5", taskName: "Set up laptop and software licenses", completed: true, dueDate: "2024-11-12" }
    ],
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&auto=format&fit=crop",
    bio: "Senior Loan Officer facilitating home and personal loan processing for retail clients. Awarded Top Seller for Q1 2026."
  },
  {
    id: "EMP-1004",
    fullName: "Sneha Iyer",
    email: "sneha.iyer@snailhr.com",
    phone: "+91 65432 10987",
    role: "employee",
    designationId: "des-5",
    department: "Insurance",
    joiningDate: "2025-01-20",
    status: "Active",
    salary: {
      basic: 48000,
      hra: 19200,
      allowances: 12800,
      pfDeduction: 4000
    },
    bankDetails: {
      accountNumber: "654321098765",
      bankName: "Axis Bank",
      ifsc: "UTIB0000084"
    },
    address: "Flat 201, Green Meadows, Gachibowli, Hyderabad - 500032",
    emergencyContact: {
      name: "Venkat Iyer",
      relation: "Father",
      phone: "+91 65432 10980"
    },
    documents: [
      { id: "doc-6", name: "Insurance_Cert_III.pdf", category: "Educational", uploadedAt: "2025-01-20", size: "2.3 MB" }
    ],
    onboardingTasks: [
      { id: "tsk-6", taskName: "Completed IRDAI Certification logging", completed: true, dueDate: "2025-01-25" }
    ],
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
    bio: "Managing underwriting risk policies for motor and life insurance distributions. Specialized in medical claim risk loading algorithms."
  }
];

// Programmatically generate remaining 28 employees to hit at least 32 total (30 employees, 1 HR, 1 Admin)
const firstNames = ["Siddharth", "Arjun", "Aditi", "Rajesh", "Pooja", "Vikram", "Sanjay", "Kavita", "Rohan", "Divya", "Sandeep", "Neha", "Vivek", "Swati", "Abhinav", "Anjali", "Manoj", "Kiran", "Milind", "Shreya", "Sonu", "Arijit", "Sunidhi", "Rohit", "Virat", "Mahendra", "Sachin", "Rahul", "Jasprit", "Ravindra"];
const lastNames = ["Malhotra", "Rao", "Kumar", "Hegde", "Sharma", "Dutt", "Krishnamurthy", "Bopanna", "Spandana", "Singh", "Dhupia", "Oberoi", "Sen", "Bindra", "Bhagwat", "Bajpayee", "Hashmi", "Kapoor", "Bedi", "Soman", "Ghoshal", "Nigam", "Singh", "Chauhan", "Sharma", "Kohli", "Dhoni", "Tendulkar", "Bumrah", "Jadeja"];

for (let i = 0; i < 28; i++) {
  const fName = firstNames[i % firstNames.length];
  const lName = lastNames[i % lastNames.length];
  const fullName = `${fName} ${lName}`;
  const empId = `EMP-${1005 + i}`;
  const email = `${fName.toLowerCase()}.${lName.toLowerCase()}@snailhr.com`;
  const phone = `+91 9${Math.floor(100000000 + Math.random() * 900000000)}`;
  const designation = initialDesignations[i % initialDesignations.length];
  const joiningDate = `2024-${String(Math.floor(1 + Math.random() * 11)).padStart(2, "0")}-${String(Math.floor(1 + Math.random() * 28)).padStart(2, "0")}`;
  
  const basic = Math.round(35000 + Math.random() * 40000);
  const hra = Math.round(basic * 0.4);
  const allowances = Math.round(basic * 0.2);
  const pfDeduction = Math.round(basic * 0.08);

  initialEmployees.push({
    id: empId,
    fullName,
    email,
    phone,
    role: "employee",
    designationId: designation.id,
    department: designation.department,
    joiningDate,
    status: "Active",
    salary: { basic, hra, allowances, pfDeduction },
    bankDetails: {
      accountNumber: String(100000000000 + Math.floor(Math.random() * 900000000000)),
      bankName: ["HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak Mahindra"][i % 5],
      ifsc: ["HDFC0000104", "ICIC0000213", "SBIN0001234", "UTIB0000084", "KKBK0000311"][i % 5]
    },
    address: `Flat ${101 + i * 7}, Shanti Enclave, Sector ${12 + i}, ${["Mumbai", "Noida", "Pune", "Hyderabad", "Bangalore"][i % 5]}`,
    emergencyContact: {
      name: `${firstNames[(i + 5) % firstNames.length]} ${lName}`,
      relation: ["Spouse", "Father", "Mother", "Sibling"][i % 4],
      phone: `+91 8${Math.floor(100000000 + Math.random() * 900000000)}`
    },
    documents: [],
    onboardingTasks: [
      { id: `tsk-auto-${empId}-1`, taskName: "KYC submission", completed: true, dueDate: joiningDate },
      { id: `tsk-auto-${empId}-2`, taskName: "Orientation session", completed: true, dueDate: joiningDate }
    ],
    avatarUrl: `https://images.unsplash.com/photo-${[
      "1534528741775-53994a69daeb",
      "1507003211169-0a1dd7228f2d",
      "1494790108377-be9c29b29330",
      "1500648767791-00dcc994a43e"
    ][i % 4]}?q=80&w=256&auto=format&fit=crop`,
    bio: `Operations coordinator specialized in ${designation.title} metrics. Dedicated team player.`
  });
}


const initialHolidays: Holiday[] = [
  { id: "hol-1", date: "2026-01-26", name: "Republic Day", type: "National" },
  { id: "hol-2", date: "2026-03-17", name: "Holi", type: "Regional" },
  { id: "hol-3", date: "2026-04-03", name: "Good Friday", type: "National" },
  { id: "hol-4", date: "2026-08-15", name: "Independence Day", type: "National" },
  { id: "hol-5", date: "2026-10-02", name: "Gandhi Jayanti", type: "National" },
  { id: "hol-6", date: "2026-10-19", name: "Dussehra", type: "Regional" },
  { id: "hol-7", date: "2026-11-08", name: "Diwali Festival of Lights", type: "National" },
  { id: "hol-8", date: "2026-12-25", name: "Christmas Day", type: "National" }
];

const initialPolicies: Policy[] = [
  {
    id: "pol-1",
    title: "Code of Conduct & Ethics",
    category: "Conduct & Ethics",
    content: "SnailHR and our NBFC parent are committed to the highest standards of professional integrity. Employees must ensure that all loan interest calculations and insurance loading charges are explicitly disclosed to customers. Misrepresentation of terms, processing fees, or tie-up commissions is strictly prohibited.",
    lastUpdated: "2026-01-10"
  },
  {
    id: "pol-2",
    title: "Annual Leave & Attendance Policy",
    category: "Employee Benefits",
    content: "Every active employee receives 18 Casual Leaves and 12 Medical Leaves per year. Attendance punches should be recorded between 09:00 AM and 06:30 PM. Clocking in after 09:30 AM is considered Late. Consecutive late-comings of more than 3 days per month will attract an automatic system fine of Rs. 500.",
    lastUpdated: "2026-02-15"
  },
  {
    id: "pol-3",
    title: "Data Protection & Information Security Policy",
    category: "Compliance & Security",
    content: "NBFC employees handle sensitive financial details (Bank Statements, PAN details, Credit Scores). All personal documents and credit files of loan prospects must be managed strictly inside the secure company CRM. Storing client records on local hard drives or sharing them on public messaging apps is a severe violation.",
    lastUpdated: "2026-03-01"
  },
  {
    id: "pol-4",
    title: "Sales Commission & Agent Incentives Program",
    category: "NBFC Sales & Commissions",
    content: "Relationship managers and underwriting coordinators are eligible for a quarterly sales commission. Loans processed with zero NPA logs in the first 6 months earn an additional 1.5% commission weight. Motor and group health policies qualify for a flat incentive paid along with the monthly payslip.",
    lastUpdated: "2026-04-12"
  }
];

const initialAttendance: AttendancePunch[] = [
  {
    id: "pun-1",
    employeeId: "EMP-1003",
    date: "2026-07-20",
    clockIn: "2026-07-20T09:12:00-07:00",
    clockOut: null,
    breaks: [],
    status: "Present"
  },
  {
    id: "pun-2",
    employeeId: "EMP-1004",
    date: "2026-07-20",
    clockIn: "2026-07-20T09:42:00-07:00",
    clockOut: null,
    breaks: [{ start: "2026-07-20T12:00:00-07:00", end: "2026-07-20T12:30:00-07:00" }],
    status: "Late"
  },
  {
    id: "pun-3",
    employeeId: "EMP-1001",
    date: "2026-07-19",
    clockIn: "2026-07-19T08:55:00-07:00",
    clockOut: "2026-07-19T18:05:00-07:00",
    breaks: [],
    status: "Present"
  },
  {
    id: "pun-4",
    employeeId: "EMP-1002",
    date: "2026-07-19",
    clockIn: "2026-07-19T09:05:00-07:00",
    clockOut: "2026-07-19T17:45:00-07:00",
    breaks: [],
    status: "Present"
  }
];

const initialLeaves: LeaveRequest[] = [
  {
    id: "lv-1",
    employeeId: "EMP-1003",
    employeeName: "Rahul Verma",
    leaveType: "Medical Leave",
    startDate: "2026-07-22",
    endDate: "2026-07-24",
    reason: "Severe fever and wisdom tooth extraction",
    status: "Pending",
    appliedDate: "2026-07-19"
  },
  {
    id: "lv-2",
    employeeId: "EMP-1004",
    employeeName: "Sneha Iyer",
    leaveType: "Casual Leave",
    startDate: "2026-07-10",
    endDate: "2026-07-12",
    reason: "Traveling to native place for family ceremony",
    status: "Approved",
    appliedDate: "2026-07-05"
  }
];

const initialExpenses: ExpenseClaim[] = [
  {
    id: "exp-1",
    employeeId: "EMP-1003",
    employeeName: "Rahul Verma",
    category: "Travel & Fuel",
    amount: 1850,
    date: "2026-07-15",
    description: "Fuel and toll charges for visiting loan applicant's warehouse in Greater Noida",
    status: "Pending"
  },
  {
    id: "exp-2",
    employeeId: "EMP-1004",
    employeeName: "Sneha Iyer",
    category: "Client Entertainment",
    amount: 2400,
    date: "2026-07-08",
    description: "Business dinner with Bajaj Allianz Insurance distribution partners",
    status: "Approved"
  },
  {
    id: "exp-3",
    employeeId: "EMP-1003",
    employeeName: "Rahul Verma",
    category: "Broadband & Phone",
    amount: 999,
    date: "2026-07-01",
    description: "Work-from-home high-speed monthly internet reimbursement",
    status: "Approved"
  }
];

const initialInventory: InventoryItem[] = [
  { id: "inv-1", name: "Lenovo ThinkPad T14", serialNumber: "SNAIL-LP-8849", category: "Laptop", status: "Assigned", assignedToEmployeeId: "EMP-1001", assignedDate: "2024-03-15" },
  { id: "inv-2", name: "Dell Latitude 5420", serialNumber: "SNAIL-LP-9241", category: "Laptop", status: "Assigned", assignedToEmployeeId: "EMP-1003", assignedDate: "2024-11-12" },
  { id: "inv-3", name: "iPad 10.9-inch (Sales Tab)", serialNumber: "SNAIL-TB-3021", category: "Mobile Tablet", status: "Assigned", assignedToEmployeeId: "EMP-1004", assignedDate: "2025-01-21" },
  { id: "inv-4", name: "TP-Link Portable 4G Router", serialNumber: "SNAIL-WF-1049", category: "WiFi Dongle", status: "Available", assignedToEmployeeId: null, assignedDate: null },
  { id: "inv-5", name: "Dell 24-inch IPS Monitor", serialNumber: "SNAIL-MN-4491", category: "Other", status: "Available", assignedToEmployeeId: null, assignedDate: null }
];

const initialInventoryRequests: InventoryRequest[] = [
  {
    id: "invreq-1",
    employeeId: "EMP-1004",
    employeeName: "Sneha Iyer",
    itemName: "Portable Bluetooth Scanner (for field documentation)",
    category: "Other",
    requestDate: "2026-07-18",
    reason: "Need portable document scanner to quickly upload customer insurance proposal files during field audits.",
    status: "Pending"
  }
];

const initialFines: Fine[] = [
  {
    id: "fin-1",
    employeeId: "EMP-1003",
    employeeName: "Rahul Verma",
    reason: "Late Coming",
    amount: 500,
    date: "2026-07-12",
    status: "Pending"
  },
  {
    id: "fin-2",
    employeeId: "EMP-1004",
    employeeName: "Sneha Iyer",
    reason: "Compliance Violation",
    amount: 1000,
    date: "2026-07-05",
    status: "Deducted From Payroll"
  }
];

const initialReimbursements: Reimbursement[] = [
  {
    id: "reim-1",
    employeeId: "EMP-1004",
    employeeName: "Sneha Iyer",
    category: "Client Entertainment",
    amount: 2400,
    claimId: "exp-2",
    status: "Pending",
    processedDate: null
  },
  {
    id: "reim-2",
    employeeId: "EMP-1003",
    employeeName: "Rahul Verma",
    category: "Broadband & Phone",
    amount: 999,
    claimId: "exp-3",
    status: "Paid",
    processedDate: "2026-07-05"
  }
];

const initialPayslips: Payslip[] = [
  {
    id: "pay-1",
    employeeId: "EMP-1003",
    month: "June 2026",
    basic: 50000,
    hra: 20000,
    allowances: 15000,
    finesDeducted: 0,
    pfDeduction: 4200,
    taxDeduction: 3500,
    netPay: 77300,
    status: "Paid",
    generatedAt: "2026-07-01T10:00:00Z",
    sentToEmail: "rahul.verma@snailhr.com"
  },
  {
    id: "pay-2",
    employeeId: "EMP-1004",
    month: "June 2026",
    basic: 48000,
    hra: 19200,
    allowances: 12800,
    finesDeducted: 1000,
    pfDeduction: 4000,
    taxDeduction: 3000,
    netPay: 72000,
    status: "Paid",
    generatedAt: "2026-07-01T10:15:00Z",
    sentToEmail: "sneha.iyer@snailhr.com"
  }
];

const initialSimulatedEmails: SimulatedEmail[] = [
  {
    id: "em-1",
    recipientEmail: "rahul.verma@snailhr.com",
    recipientName: "Rahul Verma",
    subject: "Payslip Generated for June 2026 - SnailHR",
    body: "Dear Rahul Verma,\n\nYour payslip for the month of June 2026 has been generated and approved by the SnailHR finance team. Here are the brief payroll details:\n- Net Pay: Rs. 77,300\n- PF Deduction: Rs. 4,200\n- Professional Tax: Rs. 3,500\n\nYou can log into your SnailHR app to view, download, or print your full structural PDF. If you have questions regarding allowances, commissions, or sales incentives, contact priya.patel@snailhr.com.\n\nBest Regards,\nSnailHR Payroll Automation Bot",
    sentAt: "2026-07-01T10:00:05-07:00"
  },
  {
    id: "em-2",
    recipientEmail: "sneha.iyer@snailhr.com",
    recipientName: "Sneha Iyer",
    subject: "Welcome to SnailHR Admin Panel!",
    body: "Dear Sneha Iyer,\n\nWelcome to SnailHR! Your employee portal is fully active. You have been onboarded as a Senior Insurance Underwriter in the Insurance Department.\n\nPlease log in and upload your IRDAI certification files and complete your onboarding tasks.\n\nBest Regards,\nPriya Patel (HR Team)",
    sentAt: "2025-01-20T09:30:00-07:00"
  }
];

const initialData: AppState = {
  designations: initialDesignations,
  employees: initialEmployees,
  attendance: initialAttendance,
  leaves: initialLeaves,
  holidays: initialHolidays,
  policies: initialPolicies,
  expenses: initialExpenses,
  inventory: initialInventory,
  inventoryRequests: initialInventoryRequests,
  fines: initialFines,
  reimbursements: initialReimbursements,
  payslips: initialPayslips,
  simulatedEmails: initialSimulatedEmails,
  customLeaveTypes: ["Casual Leave", "Medical Leave", "Earned Leave", "Maternity/Paternity", "Loss of Pay"],
  customDepartments: ["Executive", "Risk", "HR", "Loans", "Insurance", "Sales", "Operations", "Compliance", "Marketing"],
  customBranches: ["Snail Mumbai HQ", "Noida Field Hub", "Pune Branch Office", "Hyderabad Insurance Center", "Bangalore Tech Hub"]
};

// Database loader/saver with local-first file and background Supabase sync
function readDatabaseLocal(): AppState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const fileData = fs.readFileSync(DB_FILE, "utf-8");
      const state = JSON.parse(fileData);
      // Ensure fallbacks for dynamic fields if they were missing in the saved JSON
      if (!state.customLeaveTypes) state.customLeaveTypes = initialData.customLeaveTypes;
      if (!state.customDepartments) state.customDepartments = initialData.customDepartments;
      if (!state.customBranches) state.customBranches = initialData.customBranches;
      if (!state.employees || state.employees.length < 32) state.employees = initialData.employees;
      return state;
    }
  } catch (err) {
    console.error("Error reading local database file, using in-memory defaults.", err);
  }
  return initialData;
}

function writeDatabaseLocal(state: AppState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database file to disk.", err);
  }
}

// Global active in-memory database representation
let db = readDatabaseLocal();

// Background push to Supabase
async function pushStateToSupabase(state: AppState) {
  if (supabase) {
    try {
      const { error } = await supabase
        .from("snailhr_state")
        .upsert({ key: "app_state", value: state });
      if (error) {
        console.warn("Supabase Cloud Sync Warning (Run table SQL setup if table missing):", error.message);
      } else {
        console.log("SnailHR successfully synced live organizational state to Supabase Cloud.");
      }
    } catch (err) {
      console.warn("Supabase Cloud exception during background push:", err);
    }
  }
}

// Background sync from Supabase on startup
async function initializeSupabaseSync() {
  if (supabase) {
    try {
      console.log("Checking Supabase for existing SnailHR state...");
      const { data, error } = await supabase
        .from("snailhr_state")
        .select("value")
        .eq("key", "app_state")
        .maybeSingle();

      if (error) {
        console.warn("Supabase query failed, state table might be uninitialized. Background seeding to Supabase...");
        await pushStateToSupabase(db);
        return;
      }

      if (data && data.value && Object.keys(data.value).length > 0) {
        console.log("Discovered existing live SnailHR state in Supabase. Hydrating local cache.");
        const state = data.value as AppState;
        
        // Dynamic fallbacks
        if (!state.customLeaveTypes) state.customLeaveTypes = initialData.customLeaveTypes;
        if (!state.customDepartments) state.customDepartments = initialData.customDepartments;
        if (!state.customBranches) state.customBranches = initialData.customBranches;
        if (!state.employees || state.employees.length < 32) state.employees = initialData.employees;

        db = state;
        writeDatabaseLocal(db);
      } else {
        console.log("Supabase State table is empty. Uploading default 32-Employee SnailHR state...");
        await pushStateToSupabase(db);
      }
    } catch (err) {
      console.warn("Failed to initialize Supabase sync. Running with local filesystem fallback:", err);
    }
  }
}

// Fast synchronous client endpoints reader/writer
function readDatabase(): AppState {
  // Always return current in-memory reference which is fast and live
  return db;
}

function writeDatabase(state: AppState) {
  db = state;
  writeDatabaseLocal(state);
  pushStateToSupabase(state); // Fire background async push to Supabase
}

// Fire async background sync on startup
initializeSupabaseSync();

// Make sure initial mock write happens if file doesn't exist
if (!fs.existsSync(DB_FILE)) {
  writeDatabase(db);
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  
  // 1. Get entire app state
  app.get("/api/data", (req, res) => {
    db = readDatabase(); // Always refresh from disk
    res.json(db);
  });

  // 2. Add designation
  app.post("/api/designations", (req, res) => {
    const { title, department } = req.body;
    if (!title || !department) {
      return res.status(400).json({ error: "Title and Department are required" });
    }
    const newDes: Designation = {
      id: "des-" + Date.now(),
      title,
      department
    };
    db.designations.push(newDes);
    writeDatabase(db);
    res.status(201).json(newDes);
  });

  // 3. Remove designation
  app.delete("/api/designations/:id", (req, res) => {
    const { id } = req.params;
    db.designations = db.designations.filter(d => d.id !== id);
    writeDatabase(db);
    res.json({ success: true, message: "Designation deleted successfully" });
  });

  // 4. Onboard Employee
  app.post("/api/employees", (req, res) => {
    const empData = req.body;
    if (!empData.fullName || !empData.email) {
      return res.status(400).json({ error: "Full Name and Email are required" });
    }
    
    const newEmpId = "EMP-" + (1000 + db.employees.length + 1);
    const newEmp: Employee = {
      id: newEmpId,
      fullName: empData.fullName,
      email: empData.email,
      phone: empData.phone || "+91 99999 88888",
      role: empData.role || "employee",
      designationId: empData.designationId || "des-4",
      department: empData.department || "Loans",
      joiningDate: empData.joiningDate || new Date().toISOString().split('T')[0],
      status: empData.status || "Active",
      salary: {
        basic: Number(empData.salaryBasic) || 40000,
        hra: Number(empData.salaryHra) || 16000,
        allowances: Number(empData.salaryAllowances) || 8000,
        pfDeduction: Number(empData.salaryPf) || 3600
      },
      bankDetails: {
        accountNumber: empData.bankAccount || "112233445566",
        bankName: empData.bankName || "State Bank of India",
        ifsc: empData.bankIfsc || "SBIN0000001"
      },
      address: empData.address || "Main Street, Financial Hub",
      emergencyContact: {
        name: empData.emergencyName || "Guardian",
        relation: empData.emergencyRelation || "Spouse",
        phone: empData.emergencyPhone || "+91 99999 88888"
      },
      documents: [],
      onboardingTasks: [
        { id: "task-auto-1", taskName: "Verify KYC and Identity proof", completed: false, dueDate: "2026-07-25" },
        { id: "task-auto-2", taskName: "Collect Bank Account proof & PAN card", completed: false, dueDate: "2026-07-27" },
        { id: "task-auto-3", taskName: "Allocate SnailHR Credentials & Assets", completed: false, dueDate: "2026-07-28" }
      ],
      avatarUrl: empData.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop",
      bio: empData.bio || "Newly joined financial operations specialist."
    };

    // Add welcoming email simulation
    const welcomEmail: SimulatedEmail = {
      id: "em-" + Date.now(),
      recipientEmail: newEmp.email,
      recipientName: newEmp.fullName,
      subject: `Welcome to SnailHR - Onboarding Activated!`,
      body: `Dear ${newEmp.fullName},\n\nWelcome to SnailHR and our NBFC team! Your employee profile has been created successfully.\n\nOnboarding Details:\n- Employee ID: ${newEmp.id}\n- Designation: ${newEmp.department} Associate\n- Status: probation\n\nPlease log in to complete your checklist tasks, upload your compliance documents (Aadhaar, PAN, and Form-16), and punch your first clock-in today.\n\nWarm Regards,\nSnailHR Automated HR Desk`,
      sentAt: new Date().toISOString()
    };

    db.employees.push(newEmp);
    db.simulatedEmails.push(welcomEmail);
    writeDatabase(db);
    res.status(201).json(newEmp);
  });

  // 5. Update Employee Status / Bio
  app.put("/api/employees/:id", (req, res) => {
    const { id } = req.params;
    const updateBody = req.body;
    const empIndex = db.employees.findIndex(e => e.id === id);
    if (empIndex === -1) {
      return res.status(404).json({ error: "Employee not found" });
    }

    db.employees[empIndex] = {
      ...db.employees[empIndex],
      ...updateBody,
      salary: updateBody.salary ? { ...db.employees[empIndex].salary, ...updateBody.salary } : db.employees[empIndex].salary,
      bankDetails: updateBody.bankDetails ? { ...db.employees[empIndex].bankDetails, ...updateBody.bankDetails } : db.employees[empIndex].bankDetails
    };

    writeDatabase(db);
    res.json(db.employees[empIndex]);
  });

  // 6. Delete/Offboard Employee
  app.delete("/api/employees/:id", (req, res) => {
    const { id } = req.params;
    db.employees = db.employees.filter(e => e.id !== id);
    writeDatabase(db);
    res.json({ success: true, message: "Employee record removed successfully" });
  });

  // 7. Add document to employee
  app.post("/api/employees/:id/documents", (req, res) => {
    const { id } = req.params;
    const { name, category, size } = req.body;
    if (!name || !category) {
      return res.status(400).json({ error: "Document name and category are required" });
    }

    const empIndex = db.employees.findIndex(e => e.id === id);
    if (empIndex === -1) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const newDoc: EmployeeDocument = {
      id: "doc-" + Date.now(),
      name,
      category,
      uploadedAt: new Date().toISOString().split('T')[0],
      size: size || "1.5 MB"
    };

    db.employees[empIndex].documents.push(newDoc);
    writeDatabase(db);
    res.status(201).json(newDoc);
  });

  // 8. Delete document from employee
  app.delete("/api/employees/:id/documents/:docId", (req, res) => {
    const { id, docId } = req.params;
    const empIndex = db.employees.findIndex(e => e.id === id);
    if (empIndex === -1) {
      return res.status(404).json({ error: "Employee not found" });
    }

    db.employees[empIndex].documents = db.employees[empIndex].documents.filter(d => d.id !== docId);
    writeDatabase(db);
    res.json({ success: true });
  });

  // 9. Mark onboarding task complete
  app.put("/api/employees/:id/tasks/:taskId", (req, res) => {
    const { id, taskId } = req.params;
    const { completed } = req.body;
    
    const empIndex = db.employees.findIndex(e => e.id === id);
    if (empIndex === -1) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const taskIndex = db.employees[empIndex].onboardingTasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      db.employees[empIndex].onboardingTasks[taskIndex].completed = completed;
    }

    writeDatabase(db);
    res.json(db.employees[empIndex]);
  });

  // 10. Record Clock-In / Clock-Out / Break Punches
  app.post("/api/attendance/punch", (req, res) => {
    const { employeeId, type } = req.body; // type: 'clockin' | 'clockout' | 'breakstart' | 'breakend'
    if (!employeeId || !type) {
      return res.status(400).json({ error: "Employee ID and punch type are required" });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const nowISO = new Date().toISOString();

    let punchIndex = db.attendance.findIndex(a => a.employeeId === employeeId && a.date === todayStr);

    if (type === "clockin") {
      if (punchIndex !== -1) {
        return res.status(400).json({ error: "Already clocked in for today" });
      }

      // Check if late (after 9:30 AM local time)
      const now = new Date();
      let status: "Present" | "Late" = "Present";
      if (now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30)) {
        status = "Late";
      }

      const newPunch: AttendancePunch = {
        id: "pun-" + Date.now(),
        employeeId,
        date: todayStr,
        clockIn: nowISO,
        clockOut: null,
        breaks: [],
        status
      };
      db.attendance.push(newPunch);
      writeDatabase(db);
      return res.status(201).json(newPunch);
    }

    if (punchIndex === -1) {
      return res.status(400).json({ error: "You must clock in first before taking other actions" });
    }

    const activePunch = db.attendance[punchIndex];

    if (type === "clockout") {
      if (activePunch.clockOut) {
        return res.status(400).json({ error: "Already clocked out for today" });
      }
      activePunch.clockOut = nowISO;
    } else if (type === "breakstart") {
      // check if a break is already active
      const hasActiveBreak = activePunch.breaks.some(b => b.end === null);
      if (hasActiveBreak) {
        return res.status(400).json({ error: "Already on a break" });
      }
      activePunch.breaks.push({ start: nowISO, end: null });
    } else if (type === "breakend") {
      const activeBreakIndex = activePunch.breaks.findIndex(b => b.end === null);
      if (activeBreakIndex === -1) {
        return res.status(400).json({ error: "No active break to resume from" });
      }
      activePunch.breaks[activeBreakIndex].end = nowISO;
    }

    writeDatabase(db);
    res.json(activePunch);
  });

  // 10b. Update Attendance Punch (WFH, status, timings)
  app.put("/api/attendance/:id", (req, res) => {
    const { id } = req.params;
    const { status, workFromHome, clockIn, clockOut } = req.body;
    
    const index = db.attendance.findIndex(a => a.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Attendance record not found" });
    }
    
    db.attendance[index] = {
      ...db.attendance[index],
      ...(status !== undefined && { status }),
      ...(workFromHome !== undefined && { workFromHome }),
      ...(clockIn !== undefined && { clockIn }),
      ...(clockOut !== undefined && { clockOut })
    };
    
    writeDatabase(db);
    res.json(db.attendance[index]);
  });

  // 11. Create Leave Request
  app.post("/api/leaves", (req, res) => {
    const { employeeId, leaveType, startDate, endDate, reason } = req.body;
    if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ error: "All leave fields are required" });
    }

    const employee = db.employees.find(e => e.id === employeeId);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const newRequest: LeaveRequest = {
      id: "lv-" + Date.now(),
      employeeId,
      employeeName: employee.fullName,
      leaveType,
      startDate,
      endDate,
      reason,
      status: "Pending",
      appliedDate: new Date().toISOString().split('T')[0]
    };

    db.leaves.push(newRequest);
    writeDatabase(db);
    res.status(201).json(newRequest);
  });

  // 12. Approve/Reject Leave Request
  app.put("/api/leaves/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // Approved | Rejected
    if (!status || (status !== "Approved" && status !== "Rejected")) {
      return res.status(400).json({ error: "Invalid status update" });
    }

    const leaveIndex = db.leaves.findIndex(l => l.id === id);
    if (leaveIndex === -1) {
      return res.status(404).json({ error: "Leave request not found" });
    }

    db.leaves[leaveIndex].status = status;

    // Simulate email notification
    const employee = db.employees.find(e => e.id === db.leaves[leaveIndex].employeeId);
    if (employee) {
      const statusEmail: SimulatedEmail = {
        id: "em-" + Date.now(),
        recipientEmail: employee.email,
        recipientName: employee.fullName,
        subject: `Leave Request Status Updated: ${status}`,
        body: `Dear ${employee.fullName},\n\nYour leave request for ${db.leaves[leaveIndex].leaveType} (${db.leaves[leaveIndex].startDate} to ${db.leaves[leaveIndex].endDate}) has been reviewed and marked as: ${status}.\n\nHR comments: Leave logged in corporate balance accounts.\n\nBest Regards,\nSnailHR Automated HR Desk`,
        sentAt: new Date().toISOString()
      };
      db.simulatedEmails.push(statusEmail);
    }

    writeDatabase(db);
    res.json(db.leaves[leaveIndex]);
  });

  // 13. Create Expense Claim
  app.post("/api/expenses", (req, res) => {
    const { employeeId, category, amount, date, description } = req.body;
    if (!employeeId || !category || !amount || !date || !description) {
      return res.status(400).json({ error: "All expense fields are required" });
    }

    const employee = db.employees.find(e => e.id === employeeId);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const newClaim: ExpenseClaim = {
      id: "exp-" + Date.now(),
      employeeId,
      employeeName: employee.fullName,
      category,
      amount: Number(amount),
      date,
      description,
      status: "Pending"
    };

    db.expenses.push(newClaim);
    writeDatabase(db);
    res.status(201).json(newClaim);
  });

  // 14. Approve/Reject Expense Claim (and trigger reimbursement generation)
  app.put("/api/expenses/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // Approved | Rejected
    if (!status || (status !== "Approved" && status !== "Rejected")) {
      return res.status(400).json({ error: "Invalid status update" });
    }

    const expIndex = db.expenses.findIndex(e => e.id === id);
    if (expIndex === -1) {
      return res.status(404).json({ error: "Expense claim not found" });
    }

    db.expenses[expIndex].status = status;

    if (status === "Approved") {
      // Automatically create a Reimbursement record!
      const claim = db.expenses[expIndex];
      const newReim: Reimbursement = {
        id: "reim-" + Date.now(),
        employeeId: claim.employeeId,
        employeeName: claim.employeeName,
        category: claim.category,
        amount: claim.amount,
        claimId: claim.id,
        status: "Pending",
        processedDate: null
      };
      db.reimbursements.push(newReim);
    }

    writeDatabase(db);
    res.json(db.expenses[expIndex]);
  });

  // 15. Process Reimbursement Payment
  app.put("/api/reimbursements/:id/pay", (req, res) => {
    const { id } = req.params;
    const reimIndex = db.reimbursements.findIndex(r => r.id === id);
    if (reimIndex === -1) {
      return res.status(404).json({ error: "Reimbursement record not found" });
    }

    db.reimbursements[reimIndex].status = "Paid";
    db.reimbursements[reimIndex].processedDate = new Date().toISOString().split('T')[0];

    writeDatabase(db);
    res.json(db.reimbursements[reimIndex]);
  });

  // 16. Create/Register Inventory Asset
  app.post("/api/inventory", (req, res) => {
    const { name, serialNumber, category } = req.body;
    if (!name || !serialNumber || !category) {
      return res.status(400).json({ error: "All asset fields are required" });
    }

    const newAsset: InventoryItem = {
      id: "inv-" + Date.now(),
      name,
      serialNumber,
      category,
      status: "Available",
      assignedToEmployeeId: null,
      assignedDate: null
    };

    db.inventory.push(newAsset);
    writeDatabase(db);
    res.status(201).json(newAsset);
  });

  // 17. Submit Asset Request
  app.post("/api/inventory/request", (req, res) => {
    const { employeeId, itemName, category, reason } = req.body;
    if (!employeeId || !itemName || !category || !reason) {
      return res.status(400).json({ error: "All request fields are required" });
    }

    const employee = db.employees.find(e => e.id === employeeId);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const newReq: InventoryRequest = {
      id: "invreq-" + Date.now(),
      employeeId,
      employeeName: employee.fullName,
      itemName,
      category,
      requestDate: new Date().toISOString().split('T')[0],
      reason,
      status: "Pending"
    };

    db.inventoryRequests.push(newReq);
    writeDatabase(db);
    res.status(201).json(newReq);
  });

  // 18. Approve/Reject Asset Request
  app.put("/api/inventory/request/:id", (req, res) => {
    const { id } = req.params;
    const { status, assetId } = req.body; // status: Approved | Rejected, assetId if approved
    if (!status || (status !== "Approved" && status !== "Rejected")) {
      return res.status(400).json({ error: "Invalid status update" });
    }

    const reqIndex = db.inventoryRequests.findIndex(r => r.id === id);
    if (reqIndex === -1) {
      return res.status(404).json({ error: "Request not found" });
    }

    db.inventoryRequests[reqIndex].status = status;

    if (status === "Approved") {
      if (!assetId) {
        return res.status(400).json({ error: "assetId is required to assign an asset" });
      }
      
      const assetIndex = db.inventory.findIndex(i => i.id === assetId);
      if (assetIndex !== -1) {
        db.inventory[assetIndex].status = "Assigned";
        db.inventory[assetIndex].assignedToEmployeeId = db.inventoryRequests[reqIndex].employeeId;
        db.inventory[assetIndex].assignedDate = new Date().toISOString().split('T')[0];
      }
    }

    writeDatabase(db);
    res.json(db.inventoryRequests[reqIndex]);
  });

  // 19. Submit Fine
  app.post("/api/fines", (req, res) => {
    const { employeeId, reason, amount } = req.body;
    if (!employeeId || !reason || !amount) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const employee = db.employees.find(e => e.id === employeeId);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const newFine: Fine = {
      id: "fin-" + Date.now(),
      employeeId,
      employeeName: employee.fullName,
      reason,
      amount: Number(amount),
      date: new Date().toISOString().split('T')[0],
      status: "Pending"
    };

    db.fines.push(newFine);
    writeDatabase(db);
    res.status(201).json(newFine);
  });

  // 20. Update Fine Status
  app.put("/api/fines/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // Paid | Deducted From Payroll
    const fineIndex = db.fines.findIndex(f => f.id === id);
    if (fineIndex === -1) {
      return res.status(404).json({ error: "Fine not found" });
    }

    db.fines[fineIndex].status = status;
    writeDatabase(db);
    res.json(db.fines[fineIndex]);
  });

  // 21. Payroll - Generate Payslip and Auto Send Simulated Email
  app.post("/api/payroll/generate", (req, res) => {
    const { employeeId, month } = req.body;
    if (!employeeId || !month) {
      return res.status(400).json({ error: "Employee ID and Month are required" });
    }

    const employee = db.employees.find(e => e.id === employeeId);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Check if already exists for this employee + month
    const exists = db.payslips.find(p => p.employeeId === employeeId && p.month === month);
    if (exists) {
      return res.status(400).json({ error: `Payslip already generated for ${employee.fullName} for ${month}` });
    }

    // Calculate deductions
    const pf = employee.salary.pfDeduction || Math.round(employee.salary.basic * 0.08);
    
    // Find pending fines for this employee to deduct
    const pendingFines = db.fines.filter(f => f.employeeId === employeeId && f.status === "Pending");
    const finesDeduction = pendingFines.reduce((sum, f) => sum + f.amount, 0);

    // Calculate Professional Tax + TDS roughly
    const tax = Math.round((employee.salary.basic + employee.salary.hra + employee.salary.allowances) * 0.05);

    const netPay = (employee.salary.basic + employee.salary.hra + employee.salary.allowances) - pf - finesDeduction - tax;

    const newPayslip: Payslip = {
      id: "pay-" + Date.now(),
      employeeId,
      month,
      basic: employee.salary.basic,
      hra: employee.salary.hra,
      allowances: employee.salary.allowances,
      finesDeducted: finesDeduction,
      pfDeduction: pf,
      taxDeduction: tax,
      netPay,
      status: "Generated",
      generatedAt: new Date().toISOString(),
      sentToEmail: employee.email
    };

    // Mark pending fines as deducted
    pendingFines.forEach(f => {
      f.status = "Deducted From Payroll";
    });

    // Create Simulated Sent Email record!
    const emailSubject = `Payslip Generated for ${month} - SnailHR Admin`;
    const emailBody = `Dear ${employee.fullName},\n\nYour salary payslip for the month of ${month} has been successfully compiled and processed by the SnailHR automation pipeline.\n\nSummary of Earnings & Deductions:\n------------------------------------------------\n- Basic Salary: Rs. ${employee.salary.basic.toLocaleString()}\n- HRA: Rs. ${employee.salary.hra.toLocaleString()}\n- Special Allowances: Rs. ${employee.salary.allowances.toLocaleString()}\n- PF Deduction: Rs. ${pf.toLocaleString()}\n- Corporate Fines Deducted: Rs. ${finesDeduction.toLocaleString()}\n- Tax Deduction (TDS/PT): Rs. ${tax.toLocaleString()}\n------------------------------------------------\n- Net Disbursed Pay: Rs. ${netPay.toLocaleString()}\n------------------------------------------------\n\nYour salary will be disbursed directly to your registered bank account (${employee.bankDetails.bankName}, A/C: ****${employee.bankDetails.accountNumber.slice(-4)}) within the next 48 hours.\n\nYou can access your SnailHR dashboard to download a detailed tabular break-up.\n\nWarm Regards,\nSnailHR Payroll Automation Portal`;

    const newEmail: SimulatedEmail = {
      id: "em-" + Date.now(),
      recipientEmail: employee.email,
      recipientName: employee.fullName,
      subject: emailSubject,
      body: emailBody,
      sentAt: new Date().toISOString()
    };

    db.payslips.push(newPayslip);
    db.simulatedEmails.push(newEmail);
    writeDatabase(db);

    res.status(201).json({ payslip: newPayslip, email: newEmail });
  });

  // 22. Payroll - Pay all Generated Payslips
  app.post("/api/payroll/pay-all", (req, res) => {
    const { month } = req.body;
    if (!month) {
      return res.status(400).json({ error: "Month is required" });
    }

    let updatedCount = 0;
    db.payslips.forEach(p => {
      if (p.month === month && p.status === "Generated") {
        p.status = "Paid";
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      writeDatabase(db);
    }
    res.json({ success: true, updatedCount, message: `Disbursed ${updatedCount} salary payments for ${month}` });
  });

  // 23. Simulated Emails log
  app.get("/api/emails", (req, res) => {
    res.json(db.simulatedEmails);
  });

  // 24. Supabase Synchronization Status check
  app.get("/api/supabase-status", async (req, res) => {
    if (!supabase) {
      return res.json({ connected: false, synced: false, error: "Supabase client not initialized. Check your environment variables." });
    }
    try {
      const { data, error } = await supabase
        .from("snailhr_state")
        .select("key")
        .eq("key", "app_state")
        .maybeSingle();

      if (error) {
        return res.json({ connected: true, synced: false, error: "Table 'snailhr_state' not found or uninitialized. DDL setup required." });
      }
      return res.json({ connected: true, synced: true });
    } catch (err: any) {
      return res.json({ connected: true, synced: false, error: err.message || "Unknown connectivity issue." });
    }
  });

  // 25. Update dynamic configurations collections
  app.post("/api/config-collections", (req, res) => {
    const { type, updatedList } = req.body;
    if (!type || !Array.isArray(updatedList)) {
      return res.status(400).json({ error: "Type and updatedList array are required." });
    }

    if (type === "leaveTypes") {
      db.customLeaveTypes = updatedList;
    } else if (type === "departments") {
      db.customDepartments = updatedList;
    } else if (type === "branches") {
      db.customBranches = updatedList;
    } else {
      return res.status(400).json({ error: "Invalid collection type." });
    }

    writeDatabase(db);
    res.json({ success: true, message: `Configuration for ${type} updated successfully.` });
  });

  // 26. AI Chatbot assistant with Gemini Core grounding
  app.post("/api/chat", async (req, res) => {
    const { message, employeeId, chatHistory } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    try {
      const dbState = readDatabase();
      const employee = dbState.employees.find(e => e.id === employeeId);
      
      const todayStr = "2026-07-20";
      const todayPunches = dbState.attendance.filter(p => p.date === todayStr);
      const presentToday = todayPunches.filter(p => p.status === "Present" || p.status === "Late").length;
      const wfhToday = todayPunches.filter(p => p.workFromHome).length;
      const onLeaveToday = dbState.leaves.filter(l => l.status === "Approved" && todayStr >= l.startDate && todayStr <= l.endDate).length;
      const pendingLeaves = dbState.leaves.filter(l => l.status === "Pending").length;
      
      const statsContext = `
Current Date: Monday, July 20, 2026
Total Registered Employees: ${dbState.employees.length}
Today's Presence Summary:
- Clocked In/Active Today: ${presentToday}
- Working from Home (WFH) Today: ${wfhToday}
- On Approved Leave Today: ${onLeaveToday}
- Pending Leave Approvals: ${pendingLeaves}
`;

      const holidaysContext = dbState.holidays
        .map(h => `- ${h.name} on ${h.date} (${h.type} Holiday)`)
        .join("\n");

      const policiesContext = dbState.policies
        .map(p => `### Policy: ${p.title} (${p.category})\n${p.content}`)
        .join("\n\n");

      let userProfileContext = "User Role: Anonymous Guest\n";
      if (employee) {
        const userLeaves = dbState.leaves.filter(l => l.employeeId === employee.id);
        const approvedCasual = userLeaves.filter(l => l.status === "Approved" && l.leaveType === "Casual Leave").length;
        const approvedMedical = userLeaves.filter(l => l.status === "Approved" && l.leaveType === "Medical Leave").length;
        
        userProfileContext = `
Logged-in Employee Context:
- ID: ${employee.id}
- Full Name: ${employee.fullName}
- Role: ${employee.role}
- Department: ${employee.department}
- Bio: ${employee.bio || "None"}
- Remaining Leave Balance (Annual quota is 18 Casual, 12 Medical):
  * Casual Leaves Remaining: ${18 - approvedCasual} Days (Approved: ${approvedCasual})
  * Medical Leaves Remaining: ${12 - approvedMedical} Days (Approved: ${approvedMedical})
`;
      }

      const systemInstruction = `
You are SnailHR AI Assistant, a helpful and highly professional human resources companion built for SnailHR (a modern NBFC HR tech platform).
Your primary job is to assist HR managers, Admins, and Employees with their queries in a concise, warm, objective, and extremely polite tone.

Context Guidelines:
- Today's date is strictly Monday, July 20, 2026. SnailHR is based in India.
- You have live access to the SnailHR database. Use the database context below to answer queries exactly, without inventing figures or names.
- If a user asks "Who is present today?", "How many are on leave?", "What are upcoming holidays?", or "What is my leave balance?", use the context values.
- If they ask about policies, refer to the policy content.
- Do NOT share bank details, account numbers, or IFSC codes with anybody for privacy reasons.
- Keep answers structured with simple bullet points where applicable, and maintain deep professional composure (avoid developer jargon or system terms).

--- LIVE DATABASE CONTEXT ---
${statsContext}

--- LOGGED-IN USER PROFILE ---
${userProfileContext}

--- UPCOMING HOLIDAYS ---
${holidaysContext}

--- COMPANY POLICIES ---
${policiesContext}
---------------------------------
`;

      const contents: any[] = [];
      if (chatHistory && Array.isArray(chatHistory)) {
        chatHistory.forEach(ch => {
          contents.push({
            role: ch.role === "user" ? "user" : "model",
            parts: [{ text: ch.text }]
          });
        });
      }
      contents.push({ role: "user", parts: [{ text: message }] });

      if (!process.env.GEMINI_API_KEY) {
        return res.status(200).json({ 
          text: "My Gemini AI Core is not fully configured (missing GEMINI_API_KEY). Please add your key in Settings > Secrets. However, SnailHR is fully ready to sync and chat once configured!" 
        });
      }

      const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error("Gemini Chat Error:", err);
      res.status(500).json({ error: "SnailHR Assistant core is offline or encountering an error. Please verify your GEMINI_API_KEY and backend configurations." });
    }
  });

  // Vite Integration for Hot Reload and Client serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SnailHR full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
