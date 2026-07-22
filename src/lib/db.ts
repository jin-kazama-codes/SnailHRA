
import fs from "fs";
import path from "path";
import {
  Employee, Designation, AttendancePunch, LeaveRequest,
  Holiday, Policy, ExpenseClaim, InventoryItem,
  InventoryRequest, Fine, Reimbursement, Payslip, SimulatedEmail, TimingSettings
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
}

const DB_FILE = path.join(process.cwd(), "db_snailhr.json");

const initialDesignations: Designation[] = [];
const initialHolidays: Holiday[] = [];
const initialPolicies: Policy[] = [
  {
    id: "pol-1",
    title: "Code of Conduct & Ethics",
    category: "Conduct & Ethics",
    content: "SnailHR and our NBFC parent organisation are committed to maintaining strict professional ethics, workplace integrity, and regulatory compliance. Employees must uphold confidentiality, prevent conflicts of interest, and treat clients and team members with respect.",
    lastUpdated: "2026-01-15"
  },
  {
    id: "pol-2",
    title: "Annual Leave & Attendance Policy",
    category: "Employee Benefits",
    content: "Every active employee receives annual leave allowances including Casual Leave, Medical Leave, and Earned Leave. Daily attendance punches must be logged via SnailHR. Leaves must be applied in advance and approved by HR or reporting managers.",
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
const initialEmployees: Employee[] = [];

export function getInitialState(): AppState {
  return {
    designations: [],
    employees: [],
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
    }
  };
}

let cachedState: AppState = getInitialState();

export function loadDatabase(): AppState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const fileData = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(fileData);
      cachedState = {
        ...getInitialState(),
        ...cachedState,
        ...parsed,
        attendance: parsed.attendance !== undefined ? parsed.attendance : (cachedState.attendance || []),
        employees: parsed.employees || [],
        designations: parsed.designations || [],
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
    fs.writeFileSync(DB_FILE, JSON.stringify(clone, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not write db_snailhr.json:", err);
  }
}

