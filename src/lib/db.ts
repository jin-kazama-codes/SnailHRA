
import fs from "fs";
import path from "path";
import {
  Employee, Designation, AttendancePunch, LeaveRequest,
  Holiday, Policy, ExpenseClaim, InventoryItem,
  InventoryRequest, Fine, Reimbursement, Payslip, SimulatedEmail, TimingSettings, AttendanceBreak, ExcelUploadRecord
} from "../types";

export interface AppState {
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
  customLeaveTypes: string[];
  customDepartments: string[];
  customBranches: string[];
  timingSettings: TimingSettings;
  attendanceBreaks?: AttendanceBreak[];
  excelUploads?: ExcelUploadRecord[];
}

const DB_FILE = path.join(process.cwd(), "db_snailhr.json");

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
const initialHolidays: Holiday[] = [];
const initialPolicies: Policy[] = [
  {
    id: "pol-1",
    title: "Code of Conduct & Ethics",
    category: "Conduct & Ethics",
    content: "MGM FINANCIERS PRIV LIMITED and our NBFC parent organisation are committed to maintaining strict professional ethics, workplace integrity, and regulatory compliance. Employees must uphold confidentiality, prevent conflicts of interest, and treat clients and team members with respect.",
    lastUpdated: "2026-01-15"
  },
  {
    id: "pol-2",
    title: "Annual Leave & Attendance Policy",
    category: "Employee Benefits",
    content: "Every active employee receives annual leave allowances including Casual Leave, Medical Leave, and Earned Leave. Daily attendance punches must be logged via MGM FINANCIERS PRIV LIMITED. Leaves must be applied in advance and approved by HR or reporting managers.",
    lastUpdated: "2026-02-01"
  },
  {
    id: "pol-3",
    title: "Data Protection & Information Security",
    category: "Compliance & Security",
    content: "NBFC employees handle sensitive customer financial and personal information (PII). All company devices must be secured with multi-factor authentication and passwords. Sharing customer credit info externally without authorization is strictly prohibited.",
    lastUpdated: "2026-03-10"
  },
  {
    id: "pol-4",
    title: "Sales Commission & Agent Incentives Framework",
    category: "NBFC Sales & Commissions",
    content: "Relationship managers and field sales agents earn monthly incentive commissions based on verified loan disbursements and loan portfolio performance. All deal documentations must pass audit before commission release.",
    lastUpdated: "2026-04-05"
  }
];

const initialEmployees: Employee[] = [
  {
    id: "EMP-1001",
    fullName: "Ratul Mohindra",
    email: "ratul.mohindra@mgmfinanciers.com",
    phone: "+91 98765 43210",
    role: "admin",
    designationId: "des-1",
    department: "Executive",
    joiningDate: "2024-03-15",
    status: "Active",
    salary: { basic: 95000, hra: 18000, allowances: 10000, pfDeduction: 6500 },
    bankDetails: { accountNumber: "**** (BFHL)", bankName: "HDFC Bank", ifsc: "HDFC0000104" },
    address: "B-402, Skyline Residency, Sector 62, Noida, UP - 201301",
    emergencyContact: { name: "Suman Sharma", relation: "Spouse", phone: "+91 98765 43211" },
    documents: [],
    onboardingTasks: [],
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop",
    bio: "Managing Director leading MGM FINANCIERS PRIV LIMITED.",
    branch: "Mumbai Branch",
    password: "$2a$10$e8w.gT60J12F0z1m8dC.e.a3x5z3y7w2x1v0"
  },
  {
    id: "EMP-1002",
    fullName: "Priya Patel",
    email: "priya.patel@mgmfinanciers.com",
    phone: "+91 87654 32109",
    role: "hr",
    designationId: "des-3",
    department: "HR",
    joiningDate: "2024-06-01",
    status: "Active",
    salary: { basic: 60000, hra: 24000, allowances: 16000, pfDeduction: 5000 },
    bankDetails: { accountNumber: "876543210987", bankName: "ICICI Bank", ifsc: "ICIC0000213" },
    address: "Flat 504, Emerald Court, Andheri East, Mumbai - 400069",
    emergencyContact: { name: "Ramesh Patel", relation: "Father", phone: "+91 87654 32108" },
    documents: [],
    onboardingTasks: [],
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop",
    bio: "HR Business Partner managing talent and culture.",
    branch: "Mumbai Branch"
  },
  {
    id: "EMP-1003",
    fullName: "Rahul Verma",
    email: "rahul.verma@mgmfinanciers.com",
    phone: "+91 76543 21098",
    role: "employee",
    designationId: "des-4",
    department: "Loans",
    joiningDate: "2024-11-10",
    status: "Active",
    salary: { basic: 50000, hra: 20000, allowances: 15000, pfDeduction: 4200 },
    bankDetails: { accountNumber: "765432109876", bankName: "State Bank of India", ifsc: "SBIN0001234" },
    address: "Row House No. 12, Rosewood Society, Baner, Pune - 411045",
    emergencyContact: { name: "Aarti Verma", relation: "Mother", phone: "+91 76543 21099" },
    documents: [],
    onboardingTasks: [],
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&auto=format&fit=crop",
    bio: "Senior Loan Officer.",
    branch: "Mumbai Branch"
  },
  {
    id: "EMP-1004",
    fullName: "Sneha Iyer",
    email: "sneha.iyer@mgmfinanciers.com",
    phone: "+91 65432 10987",
    role: "employee",
    designationId: "des-5",
    department: "Insurance",
    joiningDate: "2025-01-20",
    status: "Active",
    salary: { basic: 48000, hra: 19200, allowances: 12800, pfDeduction: 4000 },
    bankDetails: { accountNumber: "654321098765", bankName: "Axis Bank", ifsc: "UTIB0000084" },
    address: "Flat 201, Green Meadows, Gachibowli, Hyderabad - 500032",
    emergencyContact: { name: "Venkat Iyer", relation: "Father", phone: "+91 65432 10980" },
    documents: [],
    onboardingTasks: [],
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
    bio: "Insurance Underwriter.",
    branch: "Mumbai Branch"
  }
];

export function getInitialState(): AppState {
  return {
    designations: initialDesignations,
    employees: initialEmployees,
    attendance: [],
    leaves: [],
    holidays: [],
    policies: initialPolicies,
    expenses: [],
    inventory: [],
    inventoryRequests: [],
    fines: [],
    reimbursements: [],
    payslips: [],
    simulatedEmails: [],
    customLeaveTypes: ["Casual Leave", "Medical Leave", "Earned Leave", "Maternity Leave", "Paternity Leave"],
    customDepartments: ["Executive", "Risk", "HR", "Loans", "Insurance", "Sales", "Operations", "Compliance", "IT"],
    customBranches: ["Noida HQ", "Mumbai Branch", "Pune Digital Office", "Hyderabad Hub"],
    timingSettings: {
      clockInTime: "09:00",
      clockOutTime: "18:00",
      lateThreshold: "09:30",
      breakStartTime: "13:00",
      breakEndTime: "14:00"
    },
    attendanceBreaks: [],
    excelUploads: []
  };
}

let cachedState: AppState = getInitialState();

export function loadDatabase(): AppState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const fileData = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(fileData);
      const attendanceBreaks = parsed.attendanceBreaks || [];
      
      const reconstructedAttendance = (parsed.attendance || []).map((a: any) => {
        const relatedBreaks = attendanceBreaks
          .filter((b: any) => b.attendanceId === a.id)
          .map((b: any) => ({
            start: b.breakStart,
            end: b.breakEnd
          }));
        
        let breakMs = 0;
        relatedBreaks.forEach((b: any) => {
          const bStart = new Date(b.start);
          const bEnd = b.end ? new Date(b.end) : bStart;
          breakMs += (bEnd.getTime() - bStart.getTime());
        });
        const mins = Math.round(breakMs / 60000);
        const hrs = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        const totalBreakDuration = `${hrs.toString().padStart(2, "0")}h ${remainingMins.toString().padStart(2, "0")}m`;

        return {
          ...a,
          breaks: relatedBreaks,
          totalBreakDuration: a.totalBreakDuration !== undefined ? a.totalBreakDuration : totalBreakDuration
        };
      });

      let loadedEmployees = parsed.employees && parsed.employees.length > 0 ? parsed.employees : initialEmployees;
      if (!loadedEmployees.find((e: any) => e.id === "EMP-1001")) {
        loadedEmployees = [initialEmployees[0], ...loadedEmployees];
      }

      cachedState = {
        ...getInitialState(),
        ...cachedState,
        ...parsed,
        attendance: reconstructedAttendance,
        attendanceBreaks: attendanceBreaks,
        employees: loadedEmployees,
        designations: (parsed.designations && parsed.designations.length > 0) ? parsed.designations : initialDesignations,
        holidays: parsed.holidays || [],
        policies: (parsed.policies && parsed.policies.length > 0) ? parsed.policies : initialPolicies,
        timingSettings: parsed.timingSettings || cachedState.timingSettings || getInitialState().timingSettings
      };
      return cachedState;
    }
  } catch (err) {
    console.warn("Could not read db_snailhr.json:", err);
  }

  return cachedState;
}

export function saveDatabase(state: AppState): void {
  cachedState = state;
  try {
    const clone = { ...state };
    delete (clone as any).timingSettings;

    // Dynamically rebuild the top-level attendanceBreaks array from the nested breaks of state.attendance
    const allBreaks: any[] = [];
    if (state.attendance) {
      state.attendance.forEach(a => {
        if (a.id && a.breaks) {
          a.breaks.forEach((b, index) => {
            allBreaks.push({
              id: `brk-${a.id}-${index}`,
              attendanceId: a.id,
              breakStart: b.start,
              breakEnd: b.end || null
            });
          });
        }
      });
    }
    clone.attendanceBreaks = allBreaks;

    // Strip breaks from attendance punches to prevent nesting them in the JSON database
    if (clone.attendance) {
      clone.attendance = clone.attendance.map(a => {
        const { breaks, ...rest } = a;
        // Calculate total break duration in hours and minutes
        let breakMs = 0;
        (breaks || []).forEach(b => {
          const bStart = new Date(b.start);
          const bEnd = b.end ? new Date(b.end) : bStart;
          breakMs += (bEnd.getTime() - bStart.getTime());
        });
        const mins = Math.round(breakMs / 60000);
        const hrs = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        const totalBreakDuration = `${hrs.toString().padStart(2, "0")}h ${remainingMins.toString().padStart(2, "0")}m`;
        return {
          ...rest,
          totalBreakDuration: a.totalBreakDuration !== undefined ? a.totalBreakDuration : totalBreakDuration
        } as any;
      });
    }

    // Note: Local db_snailhr.json file writing is disabled because Supabase is active.
    // fs.writeFileSync(DB_FILE, JSON.stringify(clone, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not save state in memory:", err);
  }
}

