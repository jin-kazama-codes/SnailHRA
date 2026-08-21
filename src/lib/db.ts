
import {
  Employee, Designation, AttendancePunch, LeaveRequest,
  Holiday, Policy, ExpenseClaim, InventoryItem,
  InventoryRequest, Fine, Reimbursement, Payslip, SimulatedEmail, TimingSettings, AttendanceBreak, ExcelUploadRecord, ExpenseCategory, Meeting, CorporateAllowanceFaq,
  SeatLayout, Room, RoomBooking, PayrollConfig, WifiRestrictionSettings, InfractionType, ChecklistItemTemplate,
  GrievanceTicket, PerformanceRecord
} from "../types";

export interface AppState {
  designations: Designation[];
  employees: Employee[];
  attendance: AttendancePunch[];
  leaves: LeaveRequest[];
  holidays: Holiday[];
  policies: Policy[];
  expenses: ExpenseClaim[];
  expenseCategories?: ExpenseCategory[];
  infractionTypes?: InfractionType[];
  corporateAllowancesFaqs?: CorporateAllowanceFaq[];
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
  companyTimingSettings?: Record<string, TimingSettings>;
  branchTimingSettings?: Record<string, TimingSettings>;
  branchLeaveTypes?: Record<string, string[]>;
  branchDepartments?: Record<string, string[]>;
  branchAmenities?: Record<string, string[]>;
  branchLeaveCountVisibility?: Record<string, boolean>;
  branchWifiSettings?: Record<string, WifiRestrictionSettings>;
  branchCodePrefixes?: Record<string, string>;
  empCodePrefix?: string;
  payrollConfigs?: Record<string, PayrollConfig>;
  companySettings?: Record<string, any>;
  attendanceBreaks?: AttendanceBreak[];
  excelUploads?: ExcelUploadRecord[];
  meetings?: Meeting[];
  seatLayouts?: SeatLayout[];
  rooms?: Room[];
  roomBookings?: RoomBooking[];
  customAmenities?: string[];
  wifiRestrictionSettings?: WifiRestrictionSettings;
  showLeaveCount?: boolean;
  onboardingChecklistTemplates?: ChecklistItemTemplate[];
  exitChecklistTemplates?: ChecklistItemTemplate[];
  grievanceTickets?: GrievanceTicket[];
  performanceRecords?: PerformanceRecord[];
}

const initialDesignations: Designation[] = [];
const initialHolidays: Holiday[] = [];
const initialPolicies: Policy[] = [];

export const initialCorporateAllowanceFaqs: CorporateAllowanceFaq[] = [];

export const initialOnboardingChecklistTemplates: ChecklistItemTemplate[] = [
  {
    id: "onb-tmpl-1",
    title: "Aadhaar Card Copy",
    description: "Government Identity Proof for mandatory KYC verification",
    category: "Identity Proof",
    required: true,
    type: "onboarding"
  },
  {
    id: "onb-tmpl-2",
    title: "PAN Card Copy",
    description: "Permanent Account Number card for income tax deduction & compliance",
    category: "Tax Document",
    required: true,
    type: "onboarding"
  },
  {
    id: "onb-tmpl-3",
    title: "Educational Certificates & Marksheets",
    description: "Copy of highest degree or professional qualification certificate",
    category: "Educational",
    required: true,
    type: "onboarding"
  },
  {
    id: "onb-tmpl-4",
    title: "Previous Relieving / Experience Letter",
    description: "Relieving letter and last 3 months pay slips from previous organization",
    category: "Contract",
    required: false,
    type: "onboarding"
  },
  {
    id: "onb-tmpl-5",
    title: "Cancelled Cheque or Bank Passbook",
    description: "Bank account proof with IFSC code for salary transfer",
    category: "Other",
    required: true,
    type: "onboarding"
  },
  {
    id: "onb-tmpl-6",
    title: "Signed Employment Contract / Offer Letter",
    description: "Countersigned copy of the employment appointment agreement",
    category: "Contract",
    required: true,
    type: "onboarding"
  }
];

export const initialExitChecklistTemplates: ChecklistItemTemplate[] = [
  {
    id: "exit-tmpl-1",
    title: "Resignation Letter Copy",
    description: "Formal submitted resignation letter with effective last working date",
    category: "Contract",
    required: true,
    type: "exit"
  },
  {
    id: "exit-tmpl-2",
    title: "Company Asset Return Form",
    description: "Signed asset return clearance (Laptop, Access Card, Mobile, WiFi Dongle, etc.)",
    category: "Other",
    required: true,
    type: "exit"
  },
  {
    id: "exit-tmpl-3",
    title: "Department No-Dues Certificate",
    description: "Departmental clearance sign-off from HOD / Reporting Manager",
    category: "Other",
    required: true,
    type: "exit"
  },
  {
    id: "exit-tmpl-4",
    title: "Knowledge Transfer (KT) Sign-off Document",
    description: "Documented project & operational handover signed by replacement/manager",
    category: "Other",
    required: true,
    type: "exit"
  },
  {
    id: "exit-tmpl-5",
    title: "Finance & Accounts Clearance Form",
    description: "No-dues sign-off confirming zero pending loans, advances, or unpaid fines",
    category: "Tax Document",
    required: true,
    type: "exit"
  }
];

const initialEmployees: Employee[] = [];

export function getInitialState(): AppState {
  return {
    designations: initialDesignations,
    employees: initialEmployees,
    attendance: [],
    leaves: [],
    holidays: [],
    policies: initialPolicies,
    expenses: [],
    expenseCategories: [],
    infractionTypes: [],
    corporateAllowancesFaqs: initialCorporateAllowanceFaqs,
    inventory: [],
    inventoryRequests: [],
    fines: [],
    reimbursements: [],
    payslips: [],
    simulatedEmails: [],
    customLeaveTypes: ["Casual Leave|18", "Medical Leave|12", "Earned Leave|15", "Maternity/Paternity|30", "Loss of Pay|0"],
    customDepartments: ["Executive", "Risk", "HR", "Loans", "Insurance", "Sales", "Operations", "Compliance", "IT"],
    customBranches: [],
    customAmenities: ["Projector", "Whiteboard", "Video Conferencing", "WiFi", "Coffee", "AC"],
    timingSettings: {
      clockInTime: "09:00",
      clockOutTime: "18:00",
      lateThreshold: "09:30",
      breakStartTime: "13:00",
      breakEndTime: "14:00"
    },
    wifiRestrictionSettings: {
      enabled: false,
      allowedIp: "",
      allowedIps: []
    },
    showLeaveCount: true,
    attendanceBreaks: [],
    excelUploads: [],
    meetings: [],
    seatLayouts: [],
    rooms: [],
    roomBookings: [],
    onboardingChecklistTemplates: initialOnboardingChecklistTemplates,
    exitChecklistTemplates: initialExitChecklistTemplates,
    grievanceTickets: [],
    performanceRecords: [],
  };
}

// Pure in-memory cache — no filesystem I/O. Supabase is the single source of truth.
// On Vercel (serverless), each request gets a fresh cachedState hydrated from Supabase.
let cachedState: AppState = getInitialState();

/**
 * Returns the current in-memory state.
 * API routes hydrate this state from Supabase after calling loadDatabase().
 */
export function loadDatabase(): AppState {
  return cachedState;
}

/**
 * Updates the in-memory cache only. No file is written.
 * All persistence is handled by individual API routes writing to Supabase.
 */
export function saveDatabase(state: AppState): void {
  cachedState = state;
}
