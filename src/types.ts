export type UserRole = "admin" | "hr" | "employee";

export interface Designation {
  id: string;
  title: string;
  department: string;
}

export interface EmployeeDocument {
  id: string;
  name: string;
  category: "ID Proof" | "Contract" | "Tax Document" | "Educational" | "Other";
  uploadedAt: string;
  size: string;
}

export interface OnboardingTask {
  id: string;
  taskName: string;
  completed: boolean;
  dueDate: string;
}

export interface Employee {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  designationId: string; // references Designation.id
  department: string;
  joiningDate: string;
  status: "Active" | "Probation" | "Suspended";
  salary: {
    basic: number;
    hra: number;
    allowances: number;
    pfDeduction: number;
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
  avatarUrl?: string;
  bio?: string;
  branch?: string;
  password?: string;
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
}

export interface Policy {
  id: string;
  title: string;
  category: "Conduct & Ethics" | "Employee Benefits" | "Compliance & Security" | "NBFC Sales & Commissions";
  content: string;
  lastUpdated: string;
}

export interface ExpenseClaim {
  id: string;
  employeeId: string;
  employeeName: string;
  category: "Travel & Fuel" | "Client Entertainment" | "Broadband & Phone" | "Office Supplies" | "Training & Courses" | "Others";
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
}

export interface Fine {
  id: string;
  employeeId: string;
  employeeName: string;
  reason: "Late Coming" | "Compliance Violation" | "Unprofessional Conduct" | "Lost Asset";
  amount: number;
  date: string; // YYYY-MM-DD
  status: "Pending" | "Paid" | "Deducted From Payroll";
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
  allowances: number;
  finesDeducted: number;
  pfDeduction: number;
  taxDeduction: number;
  netPay: number;
  status: "Draft" | "Generated" | "Paid";
  generatedAt: string;
  sentToEmail: string | null;
}

export interface SimulatedEmail {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  sentAt: string;
}

export interface TimingSettings {
  clockInTime: string;
  clockOutTime: string;
  lateThreshold: string;
  breakStartTime: string;
  breakEndTime: string;
}

