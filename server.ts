import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "./src/lib/supabase.js";
import bcrypt from "bcryptjs";
import { 
  Employee, Designation, AttendancePunch, LeaveRequest, 
  Holiday, Policy, ExpenseClaim, InventoryItem, 
  InventoryRequest, Fine, Reimbursement, Payslip, SimulatedEmail, EmployeeDocument, TimingSettings, ExcelUploadRecord 
} from "./src/types";
import { generateGuaranteedUniqueEmployeeId } from "./src/lib/idGenerator";

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
  timingSettings: TimingSettings;
  excelUploads?: ExcelUploadRecord[];
}

const initialDesignations: Designation[] = [];
const initialHolidays: Holiday[] = [];
const initialPolicies: Policy[] = [];
const initialAttendance: AttendancePunch[] = [];
const initialLeaves: LeaveRequest[] = [];
const initialExpenses: ExpenseClaim[] = [];
const initialInventory: InventoryItem[] = [];
const initialInventoryRequests: InventoryRequest[] = [];
const initialFines: Fine[] = [];
const initialReimbursements: Reimbursement[] = [];
const initialPayslips: Payslip[] = [];
const initialSimulatedEmails: SimulatedEmail[] = [];
const initialEmployees: Employee[] = [];

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
  customBranches: ["Snail Mumbai HQ", "Noida Field Hub", "Pune Branch Office", "Hyderabad Insurance Center", "Bangalore Tech Hub"],
  timingSettings: {
    clockInTime: "09:00",
    clockOutTime: "18:00",
    lateThreshold: "09:30",
    breakStartTime: "13:00",
    breakEndTime: "14:00"
  }
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
      if (!state.employees) state.employees = [];
      if (!state.timingSettings) state.timingSettings = initialData.timingSettings;
      return state;
    }
  } catch (err) {
    console.error("Error reading local database file, using in-memory defaults.", err);
  }
  return initialData;
}

function writeDatabaseLocal(state: AppState) {
  // Per explicit directive: DO NOT write to db_snailhr.json.
  // All state persistence goes directly to Supabase cloud database tables.
}

// Global active in-memory database representation
let db = readDatabaseLocal();

// Supabase Relational Table Sync Helpers
async function syncLeaveToSupabase(leave: LeaveRequest) {
  if (supabase) {
    try {
      const leaveId = leave.id || "lv-" + Date.now();
      const employeeName = leave.employeeName || db.employees.find(e => e.id === leave.employeeId)?.fullName || "Employee " + leave.employeeId;
      const status = leave.status || "Pending";
      const appliedDate = leave.appliedDate || new Date().toISOString().split('T')[0];

      const payload = {
        id: leaveId,
        employee_id: leave.employeeId,
        employee_name: employeeName,
        leave_type: leave.leaveType,
        start_date: leave.startDate,
        end_date: leave.endDate,
        reason: leave.reason,
        status: status,
        applied_date: appliedDate
      };
      const { error } = await supabase.from("leaves").upsert(payload, { onConflict: "id" });
      if (error) {
        console.warn("Supabase 'leaves' table upsert warning:", error.message);
      } else {
        console.log(`Synced leave record ${leaveId} (${employeeName}) to Supabase 'leaves' relational table.`);
      }
    } catch (err) {
      console.warn("Supabase leaves sync exception:", err);
    }
  }
}

async function syncAllLeavesToSupabase(leaves: LeaveRequest[]) {
  if (supabase && leaves.length > 0) {
    try {
      const payload = leaves.map(leave => ({
        id: leave.id || "lv-" + Math.floor(Math.random() * 1000000),
        employee_id: leave.employeeId,
        employee_name: leave.employeeName || db.employees.find(e => e.id === leave.employeeId)?.fullName || "Employee " + leave.employeeId,
        leave_type: leave.leaveType || "Casual Leave",
        start_date: leave.startDate,
        end_date: leave.endDate,
        reason: leave.reason,
        status: leave.status || "Pending",
        applied_date: leave.appliedDate || new Date().toISOString().split('T')[0]
      }));
      const { error } = await supabase.from("leaves").upsert(payload, { onConflict: "id" });
      if (error) {
        console.warn("Supabase bulk leaves upsert warning:", error.message);
      } else {
        console.log(`Synced ${leaves.length} leave records to Supabase 'leaves' relational table.`);
      }
    } catch (err) {
      console.warn("Supabase bulk leaves exception:", err);
    }
  }
}

async function fetchLeavesFromSupabase(): Promise<LeaveRequest[] | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("leaves").select("*");
      if (!error && data && data.length > 0) {
        return data.map((row: any) => ({
          id: row.id,
          employeeId: row.employee_id || row.employeeId || "",
          employeeName: row.employee_name || row.employeeName || "",
          leaveType: row.leave_type || row.leaveType || "Casual Leave",
          startDate: row.start_date || row.startDate || "",
          endDate: row.end_date || row.endDate || "",
          reason: row.reason || "",
          status: row.status || "Pending",
          appliedDate: row.applied_date || row.appliedDate || ""
        }));
      }
    } catch (err) {
      console.warn("Error fetching leaves from Supabase 'leaves' table:", err);
    }
  }
  return null;
}

async function syncExcelUploadToSupabase(record: ExcelUploadRecord) {
  if (supabase) {
    try {
      const payload = {
        id: record.id,
        filename: record.filename,
        uploaded_at: record.uploadedAt,
        uploaded_by_name: record.uploadedByName,
        uploaded_by_id: record.uploadedById,
        record_count: record.recordCount,
        detected_custom_fields: record.detectedCustomFields,
        status: record.status,
        file_data: record.fileData
      };
      await supabase.from("excel_uploads").upsert(payload, { onConflict: "id" });
    } catch (err) {
      console.warn("Supabase excel_uploads upsert warning:", err);
    }
  }
}

async function fetchExcelUploadsFromSupabase(): Promise<ExcelUploadRecord[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("excel_uploads").select("*").order("uploaded_at", { ascending: false });
      if (!error && data) {
        db.excelUploads = data.map((row: any) => ({
          id: row.id,
          filename: row.filename,
          uploadedAt: row.uploaded_at || row.uploadedAt,
          uploadedByName: row.uploaded_by_name || row.uploadedByName || "Admin User",
          uploadedById: row.uploaded_by_id || row.uploadedById || "",
          recordCount: Number(row.record_count ?? row.recordCount ?? 0),
          detectedCustomFields: typeof row.detected_custom_fields === "string" 
            ? JSON.parse(row.detected_custom_fields) 
            : (row.detected_custom_fields || []),
          status: row.status || "Success",
          fileData: row.file_data || row.fileData || ""
        }));
        return db.excelUploads;
      }
    } catch (err) {
      console.warn("Error fetching excel_uploads from Supabase:", err);
    }
  }
  return db.excelUploads || [];
}

async function fetchAllFromSupabase(): Promise<AppState> {
  if (!supabase) return db;
  try {
    const [leavesRes, attendanceRes, employeesRes] = await Promise.all([
      supabase.from("leaves").select("*"),
      supabase.from("attendance").select("*"),
      supabase.from("employees").select("*")
    ]);

    if (leavesRes.data && leavesRes.data.length > 0) {
      db.leaves = leavesRes.data.map((row: any) => ({
        id: row.id,
        employeeId: row.employee_id || row.employeeId || "",
        employeeName: row.employee_name || row.employeeName || "",
        leaveType: row.leave_type || row.leaveType || "Casual Leave",
        startDate: row.start_date || row.startDate || "",
        endDate: row.end_date || row.endDate || "",
        reason: row.reason || "",
        status: row.status || "Pending",
        appliedDate: row.applied_date || row.appliedDate || ""
      }));
    }

    if (attendanceRes.data && attendanceRes.data.length > 0) {
      db.attendance = attendanceRes.data.map((row: any) => ({
        id: row.id,
        employeeId: row.employee_id || row.employeeId || "",
        date: row.date,
        clockIn: row.clock_in || row.clockIn,
        clockOut: row.clock_out || row.clockOut,
        breaks: typeof row.breaks === "string" ? JSON.parse(row.breaks) : (row.breaks || []),
        status: row.status || "Present",
        workFromHome: row.work_from_home ?? row.workFromHome ?? false,
        notes: row.notes || ""
      }));
    }

    if (employeesRes.data && employeesRes.data.length > 0) {
      db.employees = employeesRes.data.map((row: any) => {
        const bankDetailsFromRow = typeof row.bank_details === "string" ? JSON.parse(row.bank_details) : row.bank_details;
        const salaryFromRow = typeof row.salary === "string" ? JSON.parse(row.salary) : row.salary;
        const emergencyFromRow = typeof row.emergency_contact === "string" ? JSON.parse(row.emergency_contact) : row.emergency_contact;

        return {
          id: row.id,
          fullName: row.full_name || row.fullName || "",
          email: row.email || "",
          phone: row.phone || "",
          role: row.role || "employee",
          designationId: row.designation_id || row.designationId || "des-4",
          department: row.department || "Loans",
          branch: row.branch || "Mumbai Branch",
          joiningDate: row.joining_date || row.joiningDate || "2024-03-15",
          status: row.status || "Active",
          salary: {
            basic: Number(row.salary_basic ?? salaryFromRow?.basic ?? 45000),
            hra: Number(row.salary_hra ?? salaryFromRow?.hra ?? 18000),
            allowances: Number(row.salary_allowances ?? salaryFromRow?.allowances ?? 10000),
            pfDeduction: Number(row.salary_pf_deduction ?? salaryFromRow?.pfDeduction ?? 3200)
          },
          bankDetails: {
            accountNumber: String(row.bank_account_number ?? bankDetailsFromRow?.accountNumber ?? ""),
            bankName: String(row.bank_name ?? bankDetailsFromRow?.bankName ?? "State Bank of India"),
            ifsc: String(row.bank_ifsc ?? bankDetailsFromRow?.ifsc ?? "")
          },
          address: row.address || "",
          emergencyContact: {
            name: row.emergency_contact_name || emergencyFromRow?.name || "",
            relation: row.emergency_contact_relation || emergencyFromRow?.relation || "",
            phone: row.emergency_contact_phone || emergencyFromRow?.phone || ""
          },
          documents: typeof row.documents === "string" ? JSON.parse(row.documents) : (row.documents || []),
          onboardingTasks: typeof row.onboarding_tasks === "string" ? JSON.parse(row.onboarding_tasks) : (row.onboardingTasks || []),
          avatarUrl: row.avatar_url || row.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop",
          bio: row.bio || "",
          password: row.password || ""
        };
      });
    } else {
      console.log("Supabase 'employees' table empty - Hydrating initial employee roster and seeding to Supabase...");
      db.employees = initialEmployees;
      await syncAllEmployeesToSupabase(initialEmployees);
    }
  } catch (err) {
    console.warn("Error fetching data directly from Supabase tables:", err);
  }
  return db;
}

// Employee Supabase Table Sync Helpers
async function syncAllEmployeesToSupabase(employees: Employee[]) {
  if (supabase && employees.length > 0) {
    try {
      const payload = employees.map(emp => ({
        id: emp.id,
        full_name: emp.fullName,
        email: emp.email,
        phone: emp.phone,
        role: emp.role,
        designation_id: emp.designationId,
        department: emp.department,
        branch: emp.branch || "Mumbai Branch",
        joining_date: emp.joiningDate,
        status: emp.status || "Active",
        salary: emp.salary,
        bank_details: emp.bankDetails,
        address: emp.address,
        emergency_contact: emp.emergencyContact,
        documents: emp.documents || [],
        onboarding_tasks: emp.onboardingTasks || [],
        password: emp.password || null
      }));
      const { error } = await supabase.from("employees").upsert(payload, { onConflict: "id" });
      if (error) {
        console.warn("Supabase employees upsert warning:", error.message);
      } else {
        console.log(`Synced ${employees.length} employee records to Supabase 'employees' table via API.`);
      }
    } catch (err) {
      console.warn("Supabase bulk employees exception:", err);
    }
  }
}

async function seedSupabaseFromInitialFile() {
  if (!supabase) return;
  const legacyDbFile = path.join(__dirname, "db_snailhr.json");
  if (fs.existsSync(legacyDbFile)) {
    try {
      console.log("Seeding all initial dataset from local JSON to Supabase Cloud PostgreSQL Database via API...");
      const fileData = fs.readFileSync(legacyDbFile, "utf-8");
      const seedData: AppState = JSON.parse(fileData);

      if (seedData.employees && seedData.employees.length > 0) {
        await syncAllEmployeesToSupabase(seedData.employees);
        db.employees = seedData.employees;
      }
      if (seedData.leaves && seedData.leaves.length > 0) {
        await syncAllLeavesToSupabase(seedData.leaves);
        db.leaves = seedData.leaves;
      }

      console.log("Database seeded successfully via API! Deleting db_snailhr.json per explicit directive...");
      fs.unlinkSync(legacyDbFile);
      console.log("Successfully removed db_snailhr.json from filesystem.");
    } catch (err) {
      console.warn("Error during initial file database seeding to Supabase:", err);
    }
  }
}

// Background sync from Supabase on startup
async function initializeSupabaseSync() {
  if (supabase) {
    try {
      console.log("Checking Supabase relational database tables via API...");
      await seedSupabaseFromInitialFile();
      await fetchAllFromSupabase();
    } catch (err) {
      console.warn("Failed to initialize Supabase sync:", err);
    }
  }
}

// Reader / Writer helpers
function readDatabase(): AppState {
  return db;
}

function writeDatabase(state: AppState) {
  db = state;
  if (supabase) {
    (async () => {
      try {
        await supabase.from("snailhr_state").upsert({ key: "app_state", value: state });
        if (state.attendance && state.attendance.length > 0) {
          const payload = state.attendance.map(a => ({
            id: a.id,
            employee_id: a.employeeId,
            date: a.date,
            clock_in: a.clockIn || null,
            clock_out: a.clockOut || null,
            status: a.status || "Present"
          }));
          const { error } = await supabase.from("attendance").upsert(payload, { onConflict: "id" });
          if (error) {
            console.warn("Supabase attendance bulk upsert error:", error.message);
          }
        }
      } catch (e) {
        console.warn("Supabase sync warning:", e);
      }
    })();
  }
}

// Fire async background sync on startup
initializeSupabaseSync();

// Helper to sync single employee to Supabase
async function syncEmployeeToSupabase(emp: Employee) {
  if (supabase) {
    try {
      const payload = {
        id: emp.id,
        full_name: emp.fullName,
        email: emp.email,
        phone: emp.phone,
        role: emp.role,
        designation_id: emp.designationId,
        department: emp.department,
        branch: emp.branch || "Mumbai Branch",
        joining_date: emp.joiningDate,
        status: emp.status || "Active",
        address: emp.address,
        avatar_url: emp.avatarUrl,
        bio: emp.bio,
        salary_basic: emp.salary?.basic,
        salary_hra: emp.salary?.hra,
        salary_allowances: emp.salary?.allowances,
        salary_pf_deduction: emp.salary?.pfDeduction,
        bank_account_number: emp.bankDetails?.accountNumber,
        bank_name: emp.bankDetails?.bankName,
        bank_ifsc: emp.bankDetails?.ifsc,
        password: emp.password || null
      };
      const { error } = await supabase.from("employees").upsert(payload, { onConflict: "id" });
      if (error) {
        console.warn("Supabase employee upsert warning:", error.message);
      } else {
        console.log(`Synced single employee record ${emp.id} (${emp.fullName}) to Supabase.`);
      }
    } catch (err) {
      console.warn("Supabase employee sync exception:", err);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  
  // 1. Get entire app state directly from Supabase tables
  app.get("/api/data", async (req, res) => {
    try {
      const currentData = await fetchAllFromSupabase();
      if (!currentData.employees || currentData.employees.length === 0) {
        currentData.employees = initialEmployees;
      }
      res.json(currentData);
    } catch (err) {
      console.warn("GET /api/data fallback to initialData:", err);
      res.json(initialData);
    }
  });

  // Auth Login Endpoint
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    let employee = db.employees.find(e => e.email.toLowerCase() === email.toLowerCase());

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("*")
          .ilike("email", email)
          .maybeSingle();

        if (data) {
          employee = {
            id: data.id,
            fullName: data.full_name || data.fullName || "",
            email: data.email || "",
            phone: data.phone || "",
            role: data.role || "employee",
            designationId: data.designation_id || data.designationId || "des-4",
            department: data.department || "Loans",
            branch: data.branch || "Mumbai Branch",
            joiningDate: data.joining_date || data.joiningDate || "2024-03-15",
            status: data.status || "Active",
            salary: typeof data.salary === "string" ? JSON.parse(data.salary) : (data.salary || { basic: 45000, hra: 18000, allowances: 10000, pfDeduction: 3200 }),
            bankDetails: typeof data.bank_details === "string" ? JSON.parse(data.bank_details) : (data.bankDetails || { accountNumber: "", bankName: "SBI", ifsc: "" }),
            address: data.address || "",
            emergencyContact: typeof data.emergency_contact === "string" ? JSON.parse(data.emergency_contact) : (data.emergencyContact || { name: "", relation: "", phone: "" }),
            documents: typeof data.documents === "string" ? JSON.parse(data.documents) : (data.documents || []),
            onboardingTasks: typeof data.onboarding_tasks === "string" ? JSON.parse(data.onboarding_tasks) : (data.onboardingTasks || []),
            password: data.password || ""
          };
        }
      } catch (err) {
        console.warn("Express auth Supabase exception:", err);
      }
    }

    if (!employee) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const storedHash = employee.password;
    if (!storedHash) {
      const isMatch = password === "Nawaz123#";
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
    } else {
      const isMatch = bcrypt.compareSync(password, storedHash);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
    }

    const { password: _, ...userWithoutPassword } = employee;
    res.json({ success: true, employee: userWithoutPassword });
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
  app.post("/api/employees", async (req, res) => {
    const empData = req.body;
    if (!empData.fullName || !empData.email) {
      return res.status(400).json({ error: "Full Name and Email are required" });
    }
    
    const newEmpId = await generateGuaranteedUniqueEmployeeId(db.employees, supabase);
    
    // Hash password
    const rawPassword = empData.password || "Nawaz123#";
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(rawPassword, salt);

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
      bio: empData.bio || "Newly joined financial operations specialist.",
      password: hashedPassword
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
    
    // Sync to individual Supabase table
    await syncEmployeeToSupabase(newEmp);

    res.status(201).json(newEmp);
  });

  // 4b. Bulk Onboard Employees via Excel Spreadsheet Upload
  app.post("/api/employees/bulk", async (req, res) => {
    try {
      const { employees: incomingEmployees, filename, fileData, uploadedByName, uploadedById } = req.body;

      if (!Array.isArray(incomingEmployees) || incomingEmployees.length === 0) {
        return res.status(400).json({ error: "No employee records provided in bulk request" });
      }

      if (!db.excelUploads) {
        db.excelUploads = [];
      }

      const createdEmployees: Employee[] = [];
      const customFieldsSet = new Set<string>();

      const salt = bcrypt.genSaltSync(10);
      const defaultHashedPassword = bcrypt.hashSync("MGM@1234", salt);

      for (let i = 0; i < incomingEmployees.length; i++) {
        const empData = incomingEmployees[i];
        const newEmpId = await generateGuaranteedUniqueEmployeeId(db.employees, supabase);

        // Find designation match if title is provided
        let desigId = "des-4";
        if (empData.designationTitle) {
          const match = db.designations.find(d =>
            d.title.toLowerCase().trim() === String(empData.designationTitle).toLowerCase().trim()
          );
          if (match) desigId = match.id;
        }

        // Hash custom password if provided, else use default
        let empPassword = defaultHashedPassword;
        if (empData.password) {
          empPassword = bcrypt.hashSync(String(empData.password), salt);
        }

        // Collect custom fields
        if (empData.customFields && typeof empData.customFields === "object") {
          Object.keys(empData.customFields).forEach(k => customFieldsSet.add(k));
        }

        const newEmp: Employee = {
          id: newEmpId,
          fullName: empData.fullName || `Agent ${newEmpId}`,
          email: empData.email || `agent.${newEmpId.toLowerCase()}@mgmfinanciers.com`,
          phone: empData.phone || "+91 98765 00000",
          role: (empData.role?.toLowerCase() === "admin" || empData.role?.toLowerCase() === "hr") ? empData.role.toLowerCase() : "employee",
          designationId: desigId,
          department: empData.department || "Loans",
          branch: empData.branch || "Mumbai Branch",
          joiningDate: empData.joiningDate || new Date().toISOString().split("T")[0],
          status: (empData.status === "Active" || empData.status === "Probation" || empData.status === "Suspended") ? empData.status : "Active",
          salary: {
            basic: Number(empData.salaryBasic) || 45000,
            hra: Number(empData.salaryHra) || 18000,
            allowances: Number(empData.salaryAllowances) || 10000,
            pfDeduction: Number(empData.salaryPf) || 3200
          },
          bankDetails: {
            accountNumber: empData.bankAccount || "50100234567891",
            bankName: empData.bankName || "HDFC Bank",
            ifsc: empData.bankIfsc || "HDFC0001234"
          },
          address: empData.address || "Main Branch Office Desk",
          emergencyContact: {
            name: empData.emergencyName || "Family Contact",
            relation: empData.emergencyRelation || "Spouse",
            phone: empData.emergencyPhone || "+91 98765 99999"
          },
          documents: [],
          onboardingTasks: [
            { id: `task-auto-${Date.now()}-${i}-1`, taskName: "Verify KYC and Identity proof", completed: false, dueDate: "2026-07-28" },
            { id: `task-auto-${Date.now()}-${i}-2`, taskName: "Collect Bank Account proof & PAN card", completed: false, dueDate: "2026-07-30" },
            { id: `task-auto-${Date.now()}-${i}-3`, taskName: "Allocate SnailHR Credentials & Assets", completed: false, dueDate: "2026-08-01" }
          ],
          avatarUrl: empData.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop",
          bio: empData.bio || "NBFC operations agent onboarded via Excel import.",
          password: empPassword,
          customFields: empData.customFields || {}
        };

        db.employees.push(newEmp);
        createdEmployees.push(newEmp);
      }

      // Log Excel Upload Record
      const uploadRecord: ExcelUploadRecord = {
        id: "xl-upload-" + Date.now(),
        filename: filename || `Employee_Import_${new Date().toISOString().slice(0, 10)}.xlsx`,
        uploadedAt: new Date().toISOString(),
        uploadedByName: uploadedByName || "Admin User",
        uploadedById: uploadedById || "",
        recordCount: createdEmployees.length,
        detectedCustomFields: Array.from(customFieldsSet),
        status: "Success",
        fileData: fileData || ""
      };

      db.excelUploads.unshift(uploadRecord);
      writeDatabase(db);

      // Sync upload record to Supabase
      await syncExcelUploadToSupabase(uploadRecord);

      // Sync all employees to Supabase Database
      await syncAllEmployeesToSupabase(db.employees);

      res.status(201).json({
        success: true,
        count: createdEmployees.length,
        uploadRecord,
        employees: createdEmployees
      });
    } catch (err: any) {
      console.error("Error executing bulk employee upload:", err);
      res.status(500).json({ error: err.message || "Failed to process bulk upload" });
    }
  });

  // 4c. Get Bulk Excel Upload History Logs (Direct from Supabase or memory)
  app.get("/api/employees/bulk/history", async (req, res) => {
    const uploads = await fetchExcelUploadsFromSupabase();
    res.json({ uploads });
  });

  // 4d. Delete single Excel Upload History Log
  app.delete("/api/employees/bulk/history/:id", async (req, res) => {
    const { id } = req.params;
    db.excelUploads = (db.excelUploads || []).filter(u => u.id !== id);
    if (supabase) {
      try {
        await supabase.from("excel_uploads").delete().eq("id", id);
      } catch (err) {
        console.warn("Supabase delete excel_upload record error:", err);
      }
    }
    res.json({ success: true, message: "Upload log record deleted" });
  });

  // 4e. Clear All Excel Upload History Logs
  app.delete("/api/employees/bulk/history", async (req, res) => {
    db.excelUploads = [];
    if (supabase) {
      try {
        await supabase.from("excel_uploads").delete().neq("id", "0");
      } catch (err) {
        console.warn("Supabase clear excel_uploads error:", err);
      }
    }
    res.json({ success: true, message: "All upload log records cleared" });
  });

  // 5. Update Employee Status / Bio
  app.put("/api/employees/:id", async (req, res) => {
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
    
    // Sync single employee change to Supabase
    await syncEmployeeToSupabase(db.employees[empIndex]);

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
  app.post("/api/attendance/punch", async (req, res) => {
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

      // Check if late based on timing settings from Supabase
      const now = new Date();
      let status: "Present" | "Late" = "Present";
      let lateTime = "09:30";
      if (supabase) {
        try {
          const { data } = await supabase.from("timing_settings").select("late_threshold").eq("id", "default").maybeSingle();
          if (data && data.late_threshold) {
            lateTime = data.late_threshold;
          }
        } catch (e) {}
      } else if (db.timingSettings) {
        lateTime = db.timingSettings.lateThreshold || "09:30";
      }
      const [lateHours, lateMinutes] = lateTime.split(":").map(Number);
      if (now.getHours() > lateHours || (now.getHours() === lateHours && now.getMinutes() > lateMinutes)) {
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

  // 10b. Update Attendance Punch (WFH, status, timings, breaks, notes)
  app.put("/api/attendance/:id", (req, res) => {
    const { id } = req.params;
    const { status, workFromHome, clockIn, clockOut, breaks, notes, date } = req.body;
    
    const index = db.attendance.findIndex(a => a.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Attendance record not found" });
    }
    
    db.attendance[index] = {
      ...db.attendance[index],
      ...(status !== undefined && { status }),
      ...(workFromHome !== undefined && { workFromHome }),
      ...(clockIn !== undefined && { clockIn }),
      ...(clockOut !== undefined && { clockOut }),
      ...(breaks !== undefined && { breaks }),
      ...(notes !== undefined && { notes }),
      ...(date !== undefined && { date })
    };
    
    writeDatabase(db);
    res.json(db.attendance[index]);
  });

  // 10c. Delete Attendance Punch
  app.delete("/api/attendance/:id", (req, res) => {
    const { id } = req.params;
    db.attendance = db.attendance.filter(a => a.id !== id);
    writeDatabase(db);
    res.json({ success: true, message: "Attendance record deleted successfully" });
  });

  // 10d. Save / Upsert Attendance Punch for Any Employee and Date
  app.post("/api/attendance/save", async (req, res) => {
    const { id, employeeId, date, status, clockIn, clockOut, breaks, workFromHome, notes } = req.body;
    if (!employeeId || !date) {
      return res.status(400).json({ error: "Employee ID and date are required" });
    }

    let existingIndex = -1;
    if (id) {
      existingIndex = db.attendance.findIndex(a => a.id === id);
    }
    if (existingIndex === -1) {
      existingIndex = db.attendance.findIndex(a => a.employeeId === employeeId && a.date === date);
    }

    if (existingIndex !== -1) {
      // Update existing
      db.attendance[existingIndex] = {
        ...db.attendance[existingIndex],
        status: status || db.attendance[existingIndex].status,
        clockIn: clockIn || db.attendance[existingIndex].clockIn,
        clockOut: clockOut !== undefined ? clockOut : db.attendance[existingIndex].clockOut,
        breaks: breaks || db.attendance[existingIndex].breaks || [],
        workFromHome: workFromHome !== undefined ? workFromHome : db.attendance[existingIndex].workFromHome,
        notes: notes !== undefined ? notes : db.attendance[existingIndex].notes
      };
      writeDatabase(db);
      return res.json(db.attendance[existingIndex]);
    } else {
      // Create new punch record
      let defaultClockIn = "09:00";
      let defaultClockOut = "18:00";
      if (supabase) {
        try {
          const { data } = await supabase.from("timing_settings").select("clock_in_time, clock_out_time").eq("id", "default").maybeSingle();
          if (data) {
            defaultClockIn = data.clock_in_time || "09:00";
            defaultClockOut = data.clock_out_time || "18:00";
          }
        } catch (e) {}
      } else if (db.timingSettings) {
        defaultClockIn = db.timingSettings.clockInTime || "09:00";
        defaultClockOut = db.timingSettings.clockOutTime || "18:00";
      }
      const newPunch: AttendancePunch = {
        id: "pun-" + Date.now(),
        employeeId,
        date,
        clockIn: clockIn || `${date}T${defaultClockIn}:00.000Z`,
        clockOut: clockOut || `${date}T${defaultClockOut}:00.000Z`,
        breaks: breaks || [],
        status: status || "Present",
        workFromHome: !!workFromHome,
        notes: notes || ""
      };
      db.attendance.push(newPunch);
      writeDatabase(db);
      return res.status(201).json(newPunch);
    }
  });

  // 10e. Save Attendance Timing Settings
  app.post("/api/attendance/settings", async (req, res) => {
    const settings = req.body;
    const timingSettings = {
      clockInTime: settings.clockInTime || "09:00",
      clockOutTime: settings.clockOutTime || "18:00",
      lateThreshold: settings.lateThreshold || "09:30",
      breakStartTime: settings.breakStartTime || "13:00",
      breakEndTime: settings.breakEndTime || "14:00"
    };
    db.timingSettings = timingSettings;
    if (supabase) {
      try {
        await supabase.from("timing_settings").upsert({
          id: "default",
          clock_in_time: timingSettings.clockInTime,
          clock_out_time: timingSettings.clockOutTime,
          late_threshold: timingSettings.lateThreshold,
          break_start_time: timingSettings.breakStartTime,
          break_end_time: timingSettings.breakEndTime
        }, { onConflict: "id" });
      } catch (e) {
        console.warn("Supabase settings sync error:", e);
      }
    }
    res.json({ success: true, timingSettings });
  });

  // 11. Create Leave Request
  app.post("/api/leaves", async (req, res) => {
    const { employeeId, leaveType, startDate, endDate, reason } = req.body;
    if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ error: "All leave fields are required" });
    }

    // Refresh memory from Supabase
    await fetchAllFromSupabase();

    const employee = db.employees.find(e => e.id === employeeId);
    const employeeName = employee?.fullName || "Employee " + employeeId;

    const newRequest: LeaveRequest = {
      id: "lv-" + Date.now(),
      employeeId,
      employeeName,
      leaveType,
      startDate,
      endDate,
      reason,
      status: "Pending",
      appliedDate: new Date().toISOString().split('T')[0]
    };

    db.leaves.push(newRequest);
    writeDatabase(db);

    // Sync to Supabase relational 'leaves' table
    await syncLeaveToSupabase(newRequest);

    res.status(201).json(newRequest);
  });

  // 12. Approve/Reject Leave Request
  app.put("/api/leaves/:id", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // Approved | Rejected
    if (!status || (status !== "Approved" && status !== "Rejected")) {
      return res.status(400).json({ error: "Invalid status update" });
    }

    await fetchAllFromSupabase();

    const leaveIndex = db.leaves.findIndex(l => l.id === id);
    if (leaveIndex === -1) {
      return res.status(404).json({ error: "Leave request not found" });
    }

    db.leaves[leaveIndex].status = status;

    // Save update to Supabase
    await syncLeaveToSupabase(db.leaves[leaveIndex]);

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

    // Sync status update directly to Supabase 'leaves' table
    await syncLeaveToSupabase(db.leaves[leaveIndex]);

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
      
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
        const fallbackText = getSmartExpressFallback(message, dbState, employee);
        return res.status(200).json({ text: fallbackText });
      }

      try {
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
      } catch (apiErr: any) {
        console.warn("Gemini API call failed, using DB fallback:", apiErr?.message || apiErr);
        const fallbackText = getSmartExpressFallback(message, dbState, employee);
        return res.status(200).json({ text: fallbackText });
      }
    } catch (err: any) {
      console.error("Gemini Chat Error:", err);
      res.status(200).json({ text: "I am currently processing your query. Please rephrase or check system status." });
    }
  });

function getSmartExpressFallback(message: string, dbState: any, employee: any): string {
  const msgLower = message.toLowerCase();
  const userRole = employee ? employee.role : "employee";

  // 1. Upcoming Holidays
  if (msgLower.includes("holiday") || msgLower.includes("festival") || msgLower.includes("vacation")) {
    if (!dbState.holidays || dbState.holidays.length === 0) {
      return "There are no upcoming company holidays configured at this time.";
    }
    const holidayList = dbState.holidays
      .map((h: any) => `• **${h.name}**: ${h.date} (${h.type || "Holiday"})`)
      .join("\n");
    return `### 📅 Upcoming Company Holidays\n\n${holidayList}\n\n*Plan your leave requests in advance via the Leaves tab!*`;
  }

  // 2. Who is present today / How many present today
  if (msgLower.includes("present") || msgLower.includes("attendance today") || msgLower.includes("clocked in")) {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayAttendance = (dbState.attendance || []).filter((a: any) => a.date === todayStr && (a.status === "Present" || a.status === "Late"));
    
    if (userRole === "admin" || userRole === "hr") {
      const presentEmps = todayAttendance.map((a: any) => {
        const emp = (dbState.employees || []).find((e: any) => e.id === a.employeeId);
        return `• ${emp ? emp.fullName : a.employeeId} (${a.status}${a.workFromHome ? ' - WFH' : ''})`;
      });
      return `### 📊 Today's Attendance Overview (${todayStr})\n\n**Total Present:** ${todayAttendance.length} employee(s)\n\n${presentEmps.length > 0 ? presentEmps.join('\n') : "No employees have clocked in yet today."}`;
    } else {
      return `### 📊 Today's Attendance\n\n**Total Employees Present Today:** ${todayAttendance.length}\n(Detailed attendance rosters are restricted to HR & Admins).`;
    }
  }

  // 3. Who is on leave today
  if (msgLower.includes("leave today") || msgLower.includes("who is on leave") || msgLower.includes("absent today")) {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const activeLeaves = (dbState.leaves || []).filter((l: any) => l.status === "Approved" && todayStr >= l.startDate && todayStr <= l.endDate);

    if (activeLeaves.length === 0) {
      return `### 🌴 On Leave Today (${todayStr})\n\nNo employees are currently on approved leave today. All rostered staff are scheduled.`;
    }

    if (userRole === "admin" || userRole === "hr") {
      const leaveList = activeLeaves.map((l: any) => `• **${l.employeeName}**: ${l.leaveType} (${l.startDate} to ${l.endDate})`).join('\n');
      return `### 🌴 Employees On Approved Leave Today (${todayStr})\n\n${leaveList}`;
    } else {
      return `### 🌴 On Leave Today\n\nThere are **${activeLeaves.length} employee(s)** on approved leave today.`;
    }
  }

  // 4. Leave balance
  if (msgLower.includes("leave balance") || msgLower.includes("my leaves") || msgLower.includes("remaining leave")) {
    if (!employee) {
      return "Please log in to view your personalized leave balance details.";
    }
    const userLeaves = (dbState.leaves || []).filter((l: any) => l.employeeId === employee.id && l.status === "Approved");
    const casualUsed = userLeaves.filter((l: any) => l.leaveType === "Casual Leave").length;
    const medicalUsed = userLeaves.filter((l: any) => l.leaveType === "Medical Leave").length;

    return `### 🗓️ Your Leave Balance Summary (${employee.fullName})\n\n` +
      `• **Casual Leaves**: ${18 - casualUsed} Days Remaining (18 Total Quota)\n` +
      `• **Medical Leaves**: ${12 - medicalUsed} Days Remaining (12 Total Quota)\n` +
      `• **Earned Leaves**: Accrued monthly according to corporate policy\n\n` +
      `*You can submit a new leave request under the Leaves tab.*`;
  }

  // 5. WFH or fine policies
  if (msgLower.includes("policy") || msgLower.includes("wfh") || msgLower.includes("work from home") || msgLower.includes("fine") || msgLower.includes("late") || msgLower.includes("secure")) {
    const matchedPolicies = (dbState.policies || []).filter((p: any) => 
      p.title.toLowerCase().includes("wfh") || 
      p.title.toLowerCase().includes("fine") || 
      p.title.toLowerCase().includes("late") ||
      p.content.toLowerCase().includes("work from home") ||
      p.content.toLowerCase().includes("late") ||
      p.content.toLowerCase().includes("secure") ||
      p.title.toLowerCase().includes("security")
    );

    if (matchedPolicies.length > 0) {
      const polText = matchedPolicies.map((p: any) => `#### 📜 ${p.title} (${p.category})\n${p.content}`).join("\n\n");
      return `### 📖 Relevant Corporate Policies\n\n${polText}`;
    }

    const allPolicies = (dbState.policies || []).map((p: any) => `• **${p.title}** (${p.category})`).join("\n");
    return `### 📖 Company Policies Overview\n\n${allPolicies || "Standard SnailHR compliance rules apply."}`;
  }

  // 6. General query fallback
  return `Hello! I am your SnailHR AI Assistant.\n\n` +
    `Live status summary:\n` +
    `• **Active Employees**: ${(dbState.employees || []).length}\n` +
    `• **Upcoming Holidays**: ${(dbState.holidays || []).length} scheduled\n` +
    `• **Published Policies**: ${(dbState.policies || []).length} active\n\n` +
    `How can I assist you with attendance, leaves, company policies, or payroll information?`;
}

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
