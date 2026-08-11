
import fs from "fs";
import path from "path";
import {
  Employee, Designation, AttendancePunch, LeaveRequest,
  Holiday, Policy, ExpenseClaim, InventoryItem,
  InventoryRequest, Fine, Reimbursement, Payslip, SimulatedEmail, TimingSettings, AttendanceBreak, ExcelUploadRecord, ExpenseCategory, Meeting, CorporateAllowanceFaq,
  SeatLayout, Room, RoomBooking, PayrollConfig, WifiRestrictionSettings, InfractionType
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
}


const DB_FILE = path.join(process.cwd(), "db_snailhr.json");

const initialDesignations: Designation[] = [];
const initialHolidays: Holiday[] = [];
const initialPolicies: Policy[] = [];

export const initialCorporateAllowanceFaqs: CorporateAllowanceFaq[] = [];

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
    attendanceBreaks: [],
    excelUploads: [],
    meetings: [],
    seatLayouts: [],
    rooms: [],
    roomBookings: []
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
        wifiRestrictionSettings: parsed.wifiRestrictionSettings || getInitialState().wifiRestrictionSettings
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

    // Per explicit directive: DO NOT write to db_snailhr.json.
    // State persistence goes directly to database / in-memory cache.
    // fs.writeFileSync(DB_FILE, JSON.stringify(clone, null, 2), "utf-8");

  } catch (err) {
    console.warn("Could not save state in memory:", err);
  }
}

