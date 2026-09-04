export type UserRole = "admin" | "hr" | "employee" | "super_admin";

export interface Company {
  id: string;
  name: string;
  slug: string;
  subscriptionModel: 1 | 2 | 3 | 4; // 1=Basic, 2=WhatsApp Only, 3=Chatbot Only, 4=Full Suite
  createdAt: string;
  isActive: boolean;
  logoUrl?: string; // Public URL of the company logo stored in Supabase S3
  // Stats (populated by super admin queries)
  totalEmployees?: number;
  totalAdmins?: number;
  totalHR?: number;
}

export interface SuperAdmin {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}

export interface Designation {
  id: string;
  title: string;
  department: string;
  companyId?: string;
  branch?: string;
}

export interface CorporateAllowanceFaq {
  id: string;
  title: string;
  description: string;
  companyId?: string;
  branch?: string;
  createdAt?: string;
}

export interface EmployeeDocument {
  id: string;
  name: string;
  category: "ID Proof" | "Contract" | "Tax Document" | "Educational" | "Other" | "Onboarding Document Checklist" | "Employee Exit & Separation Clearance Checklist" | string;
  uploadedAt: string;
  approvedAt?: string;
  reviewedBy?: string;
  size: string;
  fileUrl?: string;
}

export interface OnboardingTask {
  id: string;
  taskName: string;
  completed: boolean;
  dueDate: string;
}

/** Per-employee Income Tax profile — regime choice + all declarations */
export interface EmployeeTaxProfile {
  regime: "new" | "old";              // Tax regime chosen by employee
  monthlyRentPaid?: number;           // For HRA exemption (Old Regime)
  cityType?: "metro" | "non-metro";  // Metro: 50% of Basic, Non-metro: 40%
  // Chapter VI-A (Old Regime only)
  section80C?: number;      // PPF/ELSS/LIC/EPF/Home Loan Principal — max ₹1,50,000
  section80CCD1B?: number;  // NPS self-contribution — max ₹50,000
  section80D?: number;      // Health insurance premium — max ₹25,000
  section80E?: number;      // Education loan interest — no limit
  section80G?: number;      // Donations to approved funds
  section80EEA?: number;    // Affordable home loan interest — max ₹1,50,000
  // Both regimes
  employerNPS?: number;     // 80CCD(2) — max 10% of basic
  professionalTax?: number; // Annual professional tax (state-specific)
  // Manual override
  manualMonthlyTDS?: number; // Fixed monthly TDS if locked
  tdsLocked?: boolean;       // If true, skip calculation and use manual value
}

export interface Employee {
  id: string;
  companyId?: string; // tenant company reference
  employeeNumber?: number; // sequential integer, used for employee code display (e.g. MGMDIR0003)
  prefix?: "Mr" | "Mrs" | "Miss" | "Ms"; // honorific prefix
  fullName: string;
  gender?: "Male" | "Female" | "Other";
  email: string;
  phone: string;
  role: UserRole;
  designationId: string; // references Designation.id
  department: string;
  joiningDate: string;
  dateOfBirth?: string;
  status: "Active" | "Probation" | "Suspended" | "Resigned";
  code?: string;
  salary: {
    basic: number;
    hra: number;
    telephone?: number;       // Telephone / communication allowance
    fuel?: number;            // Fuel / conveyance allowance
    professionalDev?: number; // Professional development allowance
    lta?: number;             // Leave Travel Allowance
    allowances: number;       // Special allowance (catch-all)
    pfDeduction: number;
    pfMode?: "percentage" | "fixed_1800" | "custom" | "exempt";
    tdsDeduction?: number;
    tdsMode?: "slab" | "custom";
    tdsOptIn?: boolean;
    esiOptIn?: boolean;
    esiMode?: "auto" | "custom";
    esiDeduction?: number;
    taxProfile?: EmployeeTaxProfile;  // Per-employee tax declarations + regime
  };
  bankDetails: {
    accountNumber: string;
    bankName: string;
    ifsc: string;
  };
  address: string;
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  documents: EmployeeDocument[];
  onboardingTasks: OnboardingTask[];
  onboardingChecklist?: EmployeeChecklistItem[];
  exitChecklist?: EmployeeChecklistItem[];
  exitClearedAt?: string;
  exitClearedBy?: string;
  avatarUrl?: string;
  bio?: string;
  branch?: string;
  password?: string;
  employmentType?: "contract" | "permanent" | "consultant" | "";
  pan?: string;
  uan?: string;
  customFields?: Record<string, string | number | boolean>;
}

export interface ChecklistItemTemplate {
  id: string;
  title: string;
  description?: string;
  category?: string;
  required: boolean;
  type: "onboarding" | "exit";
  companyId?: string;
  branch?: string;
}

export interface EmployeeChecklistItem {
  id: string;
  templateId: string;
  title: string;
  description?: string;
  type: "onboarding" | "exit";
  status: "Pending" | "Uploaded" | "Approved" | "Rejected";
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  comments?: string;
}

export interface AttendanceBreak {
  id: string;
  attendanceId: string;
  breakStart: string; // ISO string
  breakEnd: string | null; // ISO string
}

export interface AttendancePunch {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  clockIn: string; // ISO string
  clockOut: string | null; // ISO string
  breaks: {
    start: string; // ISO string
    end: string | null; // ISO string
  }[];
  status: "Present" | "Late" | "Half Day" | "Absent" | "On Leave";
  workFromHome?: boolean;
  notes?: string;
  totalBreakDuration?: string;
}

export type AttendanceRequestType = "Travel" | "Client Visit" | "Out of Office" | "Field Work" | "Work From Home";
export type AttendanceRequestStatus = "Pending" | "Approved" | "Rejected";

export interface AttendanceRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  companyId?: string;
  branch?: string;
  department?: string;
  date: string; // YYYY-MM-DD
  requestType: AttendanceRequestType;
  clockInTime: string; // HH:mm format, e.g. "09:30"
  clockOutTime?: string; // HH:mm format, e.g. "18:00"
  location: string; // Destination / Client site / City
  reason: string; // Purpose / travel details
  status: AttendanceRequestStatus;
  appliedAt: string; // ISO string
  reviewedBy?: string; // HR or Admin Name
  reviewedById?: string; // HR or Admin Employee ID
  reviewedAt?: string; // ISO string
  reviewRemarks?: string; // HR approval notes / rejection reason
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: "Casual Leave" | "Medical Leave" | "Earned Leave" | "Maternity/Paternity" | "Loss of Pay";
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  appliedDate: string; // YYYY-MM-DD
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: "National" | "Regional" | "Restricted";
  companyId?: string;
  branch?: string; // Optional: if set, holiday is branch-specific
}

export interface Policy {
  id: string;
  title: string;
  category: "Conduct & Ethics" | "Employee Benefits" | "Compliance & Security" | "Sales & Commissions" | "NBFC Sales & Commissions";
  content: string;
  lastUpdated: string;
  companyId?: string;
  branch?: string; // Optional: if set, policy is branch-specific
}

export interface ExpenseCategory {
  id: string;
  name: string;
  companyId?: string; // or company_id
  branch?: string;
  description?: string;
  createdAt?: string;
}

export interface ExpenseClaim {
  id: string;
  employeeId: string;
  employeeName: string;
  companyId?: string;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  status: "Pending" | "Approved" | "Rejected";
}

export interface InventoryItem {
  id: string;
  name: string;
  serialNumber: string;
  category: "Laptop" | "Mobile Tablet" | "WiFi Dongle" | "Furniture" | "Access Card" | "Other";
  status: "Available" | "Assigned" | "Under Repair";
  assignedToEmployeeId: string | null;
  assignedDate: string | null;
  branch?: string;
  companyId?: string;
}

export interface InventoryRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  itemName: string;
  category: string;
  requestDate: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  branch?: string;
  companyId?: string;
}

export interface InfractionType {
  id: string;
  name: string;
  description?: string;
  defaultAmount?: number;
  companyId?: string;
  branch?: string;
}

export interface Fine {
  id: string;
  employeeId: string;
  employeeName: string;
  reason: string; // dynamic — loaded from InfractionType list
  amount: number;
  date: string; // YYYY-MM-DD
  status: "Pending" | "Paid" | "Deducted From Payroll" | "Deducted";
}

export interface Reimbursement {
  id: string;
  employeeId: string;
  employeeName: string;
  category: string;
  amount: number;
  claimId: string; // associated ExpenseClaim.id
  status: "Pending" | "Paid";
  processedDate: string | null;
}

export interface Payslip {
  id: string;
  employeeId: string;
  month: string; // "July 2026"
  basic: number;
  hra: number;
  telephone: number;       // Telephone allowance
  fuel: number;            // Fuel allowance
  professionalDev: number; // Professional development
  lta: number;             // Leave Travel Allowance
  allowances: number;      // Special allowance
  finesDeducted: number;
  pfDeduction: number;
  taxDeduction: number;
  esiDeduction?: number;
  netPay: number;
  status: "Draft" | "Generated" | "Paid";
  generatedAt: string;
  sentToEmail: string | null;
  documentUrl?: string;
  documentName?: string;
  documentUploadedAt?: string;
  documentUploadedBy?: string;
  documents?: {
    id: string;
    name: string;
    url: string;
    uploadedAt: string;
    uploadedBy?: string;
    fileType?: string;
    size?: string;
  }[];
}

export interface SimulatedEmail {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  sentAt: string;
}

export interface PayrollConfig {
  companyId: string;
  hraType: "percentage" | "fixed";
  hraValue: number;
  pfType: "percentage" | "fixed";
  pfValue: number;
  pfModeDefault?: "percentage" | "fixed_1800";
  pfExemptEmployeeIds: string[];
  allowancesType: "percentage" | "fixed";
  allowancesValue: number;
  taxType: "percentage" | "fixed" | "slab";
  taxValue: number;
  tdsOptInDefault?: boolean;
  tdsModeDefault?: "slab" | "custom";
  esiEnabled?: boolean;
  esiRatePercentage?: number;
  esiGrossCeiling?: number;
  esiExemptEmployeeIds?: string[];
  ltaValue?: number;
  ltaType?: "percentage" | "fixed";
  telephoneValue?: number;
  telephoneType?: "percentage" | "fixed";
  fuelValue?: number;
  fuelType?: "percentage" | "fixed";
  professionalDevValue?: number;
  professionalDevType?: "percentage" | "fixed";
  defaultTaxRegime?: "new" | "old";   // Company-level default tax regime
  updatedAt?: string;
}

export interface TimingSettings {
  clockInTime: string;
  clockOutTime: string;
  lateThreshold: string;
  breakStartTime: string;
  breakEndTime: string;
}

export interface WifiRestrictionSettings {
  enabled: boolean;
  allowedIp?: string;
  allowedIps: string[];
  companyId?: string;
}

export interface ExcelUploadRecord {
  id: string;
  filename: string;
  uploadedAt: string; // ISO timestamp
  uploadedByName: string;
  uploadedById: string;
  recordCount: number;
  detectedCustomFields: string[];
  status: "Success" | "Partial" | "Failed";
  fileData?: string; // base64 or text content of uploaded file
}

export function capitalizeName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .map(word => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export interface Meeting {
  id: string;
  companyId: string;
  title: string;
  description: string;
  reason: string;
  type: "Online" | "Offline" | "Hybrid";
  organizerId: string;
  participantIds: string[];
  department?: string;
  branch?: string;
  priority?: "Low" | "Medium" | "High" | "Urgent";
  date: string;
  startTime: string;
  endTime: string;
  duration?: string;
  timezone?: string;
  location?: string;
  link?: string;
  createdAt: string;
}

// ─── Seating Plan ───────────────────────────────────────────────────────────

export interface SeatSection {
  id: string;
  name: string; // e.g. "HR Department", "Directors"
  color: string; // Tailwind bg color token or hex
}

export interface Seat {
  id: string;
  seatNumber: string;
  sectionId: string;
  x: number; // grid column (0-indexed)
  y: number; // grid row (0-indexed)
  assignedEmployeeId?: string | null;
  label?: string;
  type: "desk" | "reserved" | "cabin" | "empty";
}

export interface SeatLayout {
  id: string;
  companyId: string;
  name: string; // e.g. "Floor 1 – Main Office"
  branch?: string;
  sections: SeatSection[];
  seats: Seat[];
  updatedAt: string;
  updatedBy?: string;
}

// ─── Room Booking ────────────────────────────────────────────────────────────

export interface Room {
  id: string;
  companyId: string;
  name: string;
  capacity: number;
  amenities: string[]; // ["Projector", "Whiteboard", "Video Conferencing"]
  floor?: string;
  branch?: string;
  isActive: boolean;
  createdAt: string;
}

export interface RoomBooking {
  id: string;
  companyId: string;
  roomId: string;
  roomName: string;
  requestedBy: string; // employee ID
  requestedByName: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  purpose: string;
  attendees: string[]; // employee IDs
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

// ─── Support & Grievance ─────────────────────────────────────────────────────

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: "employee" | "hr" | "admin";
  message: string;
  createdAt: string;
}

export interface GrievanceTicket {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  title: string;
  description: string;
  category: string; // "HR Policy" | "Workplace" | "Payroll" | "IT" | "Other"
  branch?: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Open" | "In Progress" | "Resolved" | "Rejected" | "Closed";
  isAnonymous?: boolean;
  createdAt: string;
  // Set by HR/Admin when updating status
  resolvedBy?: string;
  resolvedByName?: string;
  resolutionMessage?: string;
  resolvedAt?: string;
  messages?: TicketMessage[];
}

// ─── Performance Management ──────────────────────────────────────────────────

export interface PerformanceRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  reviewerId: string;
  reviewerName: string;
  branch?: string;
  /** "Fine" = auto-surfaced from FinesView, not stored separately */
  type: "Appraisal" | "Incident" | "Commendation" | "Disciplinary" | "Fine";
  period?: string;        // e.g. "Q3 2025", "Annual 2025" — free text
  summary: string;        // what happened / what is being noted
  overallRating?: number; // 1–5, applicable for Appraisal / Commendation
  incidentDate?: string;  // for Incident / Disciplinary
  actionTaken?: string;   // for Incident / Disciplinary
  sourceId?: string;      // for "Fine" type — references Fine.id
  createdAt: string;
}


