
import fs from "fs";
import path from "path";
import {
  Employee, Designation, AttendancePunch, LeaveRequest,
  Holiday, Policy, ExpenseClaim, InventoryItem,
  InventoryRequest, Fine, Reimbursement, Payslip, SimulatedEmail, TimingSettings, AttendanceBreak, ExcelUploadRecord, ExpenseCategory, Meeting, CorporateAllowanceFaq,
  SeatLayout, Room, RoomBooking, PayrollConfig, WifiRestrictionSettings, InfractionType, ChecklistItemTemplate
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
  payrollConfigs?: Record<string, PayrollConfig>;
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
}


const DB_FILE = path.join(process.cwd(), "db_snailhr.json");

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
  const defaultCompanyId = "a1b2c3d4-0001-0001-0001-000000000001";
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
    exitChecklistTemplates: initialExitChecklistTemplates
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

      let loadedEmployees = parsed.employees || [];

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
        expenseCategories: parsed.expenseCategories || getInitialState().expenseCategories,
        infractionTypes: parsed.infractionTypes || [],
        corporateAllowancesFaqs: parsed.corporateAllowancesFaqs || getInitialState().corporateAllowancesFaqs,
        timingSettings: parsed.timingSettings || cachedState.timingSettings || getInitialState().timingSettings,
        excelUploads: parsed.excelUploads || cachedState.excelUploads || [],
        meetings: parsed.meetings || [],
        seatLayouts: parsed.seatLayouts || [],
        rooms: parsed.rooms || [],
        roomBookings: parsed.roomBookings || [],
        customAmenities: parsed.customAmenities || getInitialState().customAmenities,
        wifiRestrictionSettings: parsed.wifiRestrictionSettings || getInitialState().wifiRestrictionSettings,
        showLeaveCount: parsed.showLeaveCount !== undefined ? parsed.showLeaveCount : true,
        onboardingChecklistTemplates: (parsed.onboardingChecklistTemplates && parsed.onboardingChecklistTemplates.length > 0) ? parsed.onboardingChecklistTemplates : initialOnboardingChecklistTemplates,
        exitChecklistTemplates: (parsed.exitChecklistTemplates && parsed.exitChecklistTemplates.length > 0) ? parsed.exitChecklistTemplates : initialExitChecklistTemplates
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

    // Write state to disk so API routes can find records by ID
    fs.writeFileSync(DB_FILE, JSON.stringify(clone, null, 2), "utf-8");

  } catch (err) {
    console.warn("Could not save state in memory:", err);
  }
}

