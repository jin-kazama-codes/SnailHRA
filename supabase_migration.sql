-- ============================================================
--  SnailHRA - Complete Database Migration Script
--  Generated from: db_snailhr.json
--  Target: Supabase (PostgreSQL)
-- ============================================================

-- Enable UUID extension (needed for default UUID generation)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. DESIGNATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS designations (
  id          TEXT PRIMARY KEY,           -- e.g. "des-1"
  title       TEXT NOT NULL,              -- e.g. "Managing Director"
  department  TEXT NOT NULL               -- e.g. "Executive"
);

-- ============================================================
-- 2. EMPLOYEES  (core table)
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id                      TEXT PRIMARY KEY,    -- e.g. "EMP-1001"
  full_name               TEXT NOT NULL,
  email                   TEXT NOT NULL UNIQUE,
  phone                   TEXT,
  role                    TEXT NOT NULL,        -- "admin" | "hr" | "employee"
  designation_id          TEXT REFERENCES designations(id) ON DELETE SET NULL,
  department              TEXT,
  branch                  TEXT DEFAULT 'Snail Mumbai HQ',
  joining_date            DATE,
  status                  TEXT DEFAULT 'Active', -- "Active" | "Inactive"
  address                 TEXT,
  avatar_url              TEXT,
  bio                     TEXT,

  -- Nested salary object (flattened)
  salary_basic            NUMERIC(12, 2),
  salary_hra              NUMERIC(12, 2),
  salary_allowances       NUMERIC(12, 2),
  salary_pf_deduction     NUMERIC(12, 2),

  -- Nested bankDetails object (flattened)
  bank_account_number     TEXT,
  bank_name               TEXT,
  bank_ifsc               TEXT,

  -- Nested emergencyContact object (flattened)
  emergency_contact_name      TEXT,
  emergency_contact_relation  TEXT,
  emergency_contact_phone     TEXT,

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. EMPLOYEE DOCUMENTS  (1-to-many with employees)
-- ============================================================
CREATE TABLE IF NOT EXISTS employee_documents (
  id            TEXT PRIMARY KEY,          -- e.g. "doc-1"
  employee_id   TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,             -- e.g. "Aadhaar_Card.pdf"
  category      TEXT,                      -- e.g. "ID Proof" | "Contract" | "Educational"
  uploaded_at   DATE,
  size          TEXT,                      -- e.g. "1.2 MB"
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. EMPLOYEE ONBOARDING TASKS  (1-to-many with employees)
-- ============================================================
CREATE TABLE IF NOT EXISTS employee_onboarding_tasks (
  id            TEXT PRIMARY KEY,          -- e.g. "tsk-1"
  employee_id   TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  task_name     TEXT NOT NULL,
  completed     BOOLEAN DEFAULT FALSE,
  due_date      DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id            TEXT PRIMARY KEY,          -- e.g. "pun-1"
  employee_id   TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  clock_in      TIMESTAMPTZ,
  clock_out     TIMESTAMPTZ,
  status        TEXT,                      -- "Present" | "Late" | "Absent"
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. ATTENDANCE BREAKS  (1-to-many with attendance)
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_breaks (
  id              SERIAL PRIMARY KEY,
  attendance_id   TEXT NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  break_start     TIMESTAMPTZ NOT NULL,
  break_end       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. LEAVES
-- ============================================================
CREATE TABLE IF NOT EXISTS leaves (
  id              TEXT PRIMARY KEY,         -- e.g. "lv-1"
  employee_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name   TEXT,                     -- denormalized for quick display
  leave_type      TEXT NOT NULL,            -- "Medical Leave" | "Casual Leave" | etc.
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  reason          TEXT,
  status          TEXT DEFAULT 'Pending',   -- "Pending" | "Approved" | "Rejected"
  applied_date    DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. HOLIDAYS
-- ============================================================
CREATE TABLE IF NOT EXISTS holidays (
  id          TEXT PRIMARY KEY,          -- e.g. "hol-1"
  name        TEXT NOT NULL,             -- e.g. "Republic Day"
  date        DATE NOT NULL,             -- e.g. "2026-01-26"
  type        TEXT NOT NULL DEFAULT 'National', -- "National" | "Regional" | "Restricted"
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. HOLIDAYS
-- ============================================================
CREATE TABLE IF NOT EXISTS holidays (
  id          TEXT PRIMARY KEY,             -- e.g. "hol-1"
  date        DATE NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT,                         -- "National" | "Regional"
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. POLICIES
-- ============================================================
CREATE TABLE IF NOT EXISTS policies (
  id            TEXT PRIMARY KEY,           -- e.g. "pol-1"
  title         TEXT NOT NULL,
  category      TEXT,                       -- e.g. "Conduct & Ethics"
  content       TEXT,
  last_updated  DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id              TEXT PRIMARY KEY,         -- e.g. "exp-1"
  employee_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name   TEXT,                     -- denormalized
  category        TEXT,                     -- "Travel & Fuel" | "Client Entertainment" | "Broadband & Phone"
  amount          NUMERIC(12, 2) NOT NULL,
  date            DATE NOT NULL,
  description     TEXT,
  status          TEXT DEFAULT 'Pending',   -- "Pending" | "Approved" | "Rejected"
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. INVENTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory (
  id                        TEXT PRIMARY KEY,   -- e.g. "inv-1"
  name                      TEXT NOT NULL,      -- e.g. "Lenovo ThinkPad T14"
  serial_number             TEXT UNIQUE,        -- e.g. "SNAIL-LP-8849"
  category                  TEXT,               -- "Laptop" | "Mobile Tablet" | "WiFi Dongle" | "Other"
  status                    TEXT DEFAULT 'Available',  -- "Assigned" | "Available"
  assigned_to_employee_id   TEXT REFERENCES employees(id) ON DELETE SET NULL,
  assigned_date             DATE,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. INVENTORY REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_requests (
  id              TEXT PRIMARY KEY,         -- e.g. "invreq-1"
  employee_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name   TEXT,                     -- denormalized
  item_name       TEXT NOT NULL,
  category        TEXT,
  request_date    DATE,
  reason          TEXT,
  status          TEXT DEFAULT 'Pending',   -- "Pending" | "Approved" | "Rejected"
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. FINES
-- ============================================================
CREATE TABLE IF NOT EXISTS fines (
  id              TEXT PRIMARY KEY,         -- e.g. "fin-1"
  employee_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name   TEXT,                     -- denormalized
  reason          TEXT NOT NULL,            -- "Late Coming" | "Compliance Violation" etc.
  amount          NUMERIC(12, 2) NOT NULL,
  date            DATE NOT NULL,
  status          TEXT DEFAULT 'Pending',   -- "Pending" | "Deducted From Payroll"
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. REIMBURSEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS reimbursements (
  id              TEXT PRIMARY KEY,         -- e.g. "reim-1"
  employee_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name   TEXT,                     -- denormalized
  category        TEXT,
  amount          NUMERIC(12, 2) NOT NULL,
  claim_id        TEXT REFERENCES expenses(id) ON DELETE SET NULL,
  status          TEXT DEFAULT 'Pending',   -- "Pending" | "Paid"
  processed_date  DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 15. PAYSLIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS payslips (
  id              TEXT PRIMARY KEY,         -- e.g. "pay-1"
  employee_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month           TEXT NOT NULL,            -- e.g. "June 2026"
  basic           NUMERIC(12, 2),
  hra             NUMERIC(12, 2),
  allowances      NUMERIC(12, 2),
  fines_deducted  NUMERIC(12, 2) DEFAULT 0,
  pf_deduction    NUMERIC(12, 2),
  tax_deduction   NUMERIC(12, 2),
  net_pay         NUMERIC(12, 2),
  status          TEXT DEFAULT 'Pending',   -- "Pending" | "Paid"
  generated_at    TIMESTAMPTZ,
  sent_to_email   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 16. SIMULATED EMAILS
-- ============================================================
CREATE TABLE IF NOT EXISTS simulated_emails (
  id              TEXT PRIMARY KEY,         -- e.g. "em-1"
  recipient_email TEXT NOT NULL,
  recipient_name  TEXT,
  subject         TEXT NOT NULL,
  body            TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 17. CUSTOM LEAVE TYPES  (simple lookup list)
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_leave_types (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

-- ============================================================
-- 18. CUSTOM DEPARTMENTS  (simple lookup list)
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_departments (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

-- ============================================================
-- 19. CUSTOM BRANCHES  (simple lookup list)
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_branches (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

-- ============================================================
-- 20. TIMING SETTINGS  (dynamic configuration)
-- ============================================================
CREATE TABLE IF NOT EXISTS timing_settings (
  id                  VARCHAR(50) PRIMARY KEY,
  clock_in_time       VARCHAR(10) NOT NULL DEFAULT '09:00',
  clock_out_time      VARCHAR(10) NOT NULL DEFAULT '18:00',
  late_threshold      VARCHAR(10) NOT NULL DEFAULT '09:30',
  break_start_time    VARCHAR(10) NOT NULL DEFAULT '13:00',
  break_end_time      VARCHAR(10) NOT NULL DEFAULT '14:00',
  changed_by          VARCHAR(100) DEFAULT 'System',
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure changed_by column exists for existing table instances
ALTER TABLE timing_settings ADD COLUMN IF NOT EXISTS changed_by VARCHAR(100) DEFAULT 'System';

-- Insert default configurations row
INSERT INTO timing_settings (id, clock_in_time, clock_out_time, late_threshold, break_start_time, break_end_time, changed_by)
VALUES ('default', '09:00', '18:00', '09:30', '13:00', '14:00', 'System')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- INDEXES for common query patterns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_employees_department       ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_status           ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_designation_id   ON employees(designation_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_emp_id  ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_emp_id    ON employee_onboarding_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id     ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date            ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_breaks_att_id   ON attendance_breaks(attendance_id);
CREATE INDEX IF NOT EXISTS idx_leaves_employee_id         ON leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status              ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_expenses_employee_id       ON expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status            ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_inventory_status           ON inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_assigned_emp     ON inventory(assigned_to_employee_id);
CREATE INDEX IF NOT EXISTS idx_inv_requests_employee_id   ON inventory_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_fines_employee_id          ON fines(employee_id);
CREATE INDEX IF NOT EXISTS idx_reimbursements_employee_id ON reimbursements(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslips_employee_id       ON payslips(employee_id);

-- ============================================================
-- ROW LEVEL SECURITY (open policies for initial setup)
-- ============================================================
ALTER TABLE designations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance                ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_breaks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fines                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulated_emails          ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_leave_types        ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_departments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_branches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE timing_settings            ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON designations              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON employees                 FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON employee_documents        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON employee_onboarding_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON attendance                FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON attendance_breaks         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON leaves                    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON holidays                  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON policies                  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON expenses                  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON inventory                 FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON inventory_requests        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON fines                     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON reimbursements            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON payslips                  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON simulated_emails          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON custom_leave_types        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON custom_departments        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON custom_branches           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON timing_settings           FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- SEED DATA from db_snailhr.json
-- ============================================================

-- 1. DESIGNATIONS
INSERT INTO designations (id, title, department) VALUES
  ('des-1', 'Managing Director',         'Executive'),
  ('des-2', 'Head of Credit & Risk',     'Risk'),
  ('des-3', 'HR Business Partner',       'HR'),
  ('des-4', 'Senior Loan Officer',       'Loans'),
  ('des-5', 'Insurance Underwriter',     'Insurance'),
  ('des-6', 'Sales Relationship Manager','Sales'),
  ('des-7', 'Collections Specialist',    'Operations'),
  ('des-8', 'Compliance Officer',        'Compliance')
ON CONFLICT (id) DO NOTHING;


-- 2. EMPLOYEES (all 32 records)
INSERT INTO employees (
  id, full_name, email, phone, role, designation_id, department, joining_date, status,
  address, avatar_url, bio,
  salary_basic, salary_hra, salary_allowances, salary_pf_deduction,
  bank_account_number, bank_name, bank_ifsc,
  emergency_contact_name, emergency_contact_relation, emergency_contact_phone
) VALUES
('EMP-1001','Amit Sharma','amit.sharma@snailhr.com','+91 98765 43210','admin','des-2','Risk','2024-03-15','Active',
 'B-402, Skyline Residency, Sector 62, Noida, UP - 201301',
 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop',
 'Lead credit evaluation and risk assessment models for commercial and retail loan products. Over 10 years of experience in retail banking risk policies.',
 85000,34000,21000,6500,'987654321098','HDFC Bank','HDFC0000104','Suman Sharma','Spouse','+91 98765 43211'),

('EMP-1002','Priya Patel','priya.patel@snailhr.com','+91 87654 32109','hr','des-3','HR','2024-06-01','Active',
 'Flat 504, Emerald Court, Andheri East, Mumbai - 400069',
 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop',
 'Managing end-to-end talent acquisition, employee relations, and policy compliance for SnailHR. Committed to nurturing our digital-first culture.',
 60000,24000,16000,5000,'876543210987','ICICI Bank','ICIC0000213','Ramesh Patel','Father','+91 87654 32108'),

('EMP-1003','Rahul Verma','rahul.verma@snailhr.com','+91 76543 21098','employee','des-4','Loans','2024-11-10','Active',
 'Row House No. 12, Rosewood Society, Baner, Pune - 411045',
 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&auto=format&fit=crop',
 'Senior Loan Officer facilitating home and personal loan processing for retail clients. Awarded Top Seller for Q1 2026.',
 50000,20000,15000,4200,'765432109876','State Bank of India','SBIN0001234','Aarti Verma','Mother','+91 76543 21099'),

('EMP-1004','Sneha Iyer','sneha.iyer@snailhr.com','+91 65432 10987','employee','des-5','Insurance','2025-01-20','Active',
 'Flat 201, Green Meadows, Gachibowli, Hyderabad - 500032',
 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
 'Managing underwriting risk policies for motor and life insurance distributions. Specialized in medical claim risk loading algorithms.',
 48000,19200,12800,4000,'654321098765','Axis Bank','UTIB0000084','Venkat Iyer','Father','+91 65432 10980'),

('EMP-1005','Siddharth Malhotra','siddharth.malhotra@snailhr.com','+91 9379896728','employee','des-1','Executive','2024-07-21','Active',
 'Flat 101, Shanti Enclave, Sector 12, Mumbai',
 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Managing Director metrics. Dedicated team player.',
 51230,20492,10246,4098,'804962213777','HDFC Bank','HDFC0000104','Vikram Malhotra','Spouse','+91 8491677162'),

('EMP-1006','Arjun Rao','arjun.rao@snailhr.com','+91 9739350338','employee','des-2','Risk','2024-08-03','Active',
 'Flat 108, Shanti Enclave, Sector 13, Noida',
 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Head of Credit & Risk metrics. Dedicated team player.',
 44480,17792,8896,3558,'247031512826','ICICI Bank','ICIC0000213','Sanjay Rao','Father','+91 8196616285'),

('EMP-1007','Aditi Kumar','aditi.kumar@snailhr.com','+91 9379667870','employee','des-3','HR','2024-05-21','Active',
 'Flat 115, Shanti Enclave, Sector 14, Pune',
 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in HR Business Partner metrics. Dedicated team player.',
 39967,15987,7993,3197,'550831498643','SBI','SBIN0001234','Kavita Kumar','Mother','+91 8945984434'),

('EMP-1008','Rajesh Hegde','rajesh.hegde@snailhr.com','+91 9930814093','employee','des-4','Loans','2024-04-05','Active',
 'Flat 122, Shanti Enclave, Sector 15, Hyderabad',
 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Senior Loan Officer metrics. Dedicated team player.',
 57768,23107,11554,4621,'129942110498','Axis Bank','UTIB0000084','Rohan Hegde','Sibling','+91 8352646265'),

('EMP-1009','Pooja Sharma','pooja.sharma@snailhr.com','+91 9898375678','employee','des-5','Insurance','2024-02-27','Active',
 'Flat 129, Shanti Enclave, Sector 16, Bangalore',
 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Insurance Underwriter metrics. Dedicated team player.',
 70437,28175,14087,5635,'699136586171','Kotak Mahindra','KKBK0000311','Divya Sharma','Spouse','+91 8506381405'),

('EMP-1010','Vikram Dutt','vikram.dutt@snailhr.com','+91 9698191989','employee','des-6','Sales','2024-08-25','Active',
 'Flat 136, Shanti Enclave, Sector 17, Mumbai',
 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Sales Relationship Manager metrics. Dedicated team player.',
 67216,26886,13443,5377,'194688116747','HDFC Bank','HDFC0000104','Sandeep Dutt','Father','+91 8383317609'),

('EMP-1011','Sanjay Krishnamurthy','sanjay.krishnamurthy@snailhr.com','+91 9546597157','employee','des-7','Operations','2024-05-24','Active',
 'Flat 143, Shanti Enclave, Sector 18, Noida',
 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Collections Specialist metrics. Dedicated team player.',
 46537,18615,9307,3723,'948205297154','ICICI Bank','ICIC0000213','Neha Krishnamurthy','Mother','+91 8403521876'),

('EMP-1012','Kavita Bopanna','kavita.bopanna@snailhr.com','+91 9169984166','employee','des-8','Compliance','2024-03-10','Active',
 'Flat 150, Shanti Enclave, Sector 19, Pune',
 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Compliance Officer metrics. Dedicated team player.',
 72033,28813,14407,5763,'969294531234','SBI','SBIN0001234','Vivek Bopanna','Sibling','+91 8770316610'),

('EMP-1013','Rohan Spandana','rohan.spandana@snailhr.com','+91 9538462983','employee','des-1','Executive','2024-09-14','Active',
 'Flat 157, Shanti Enclave, Sector 20, Hyderabad',
 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Managing Director metrics. Dedicated team player.',
 61600,24640,12320,4928,'715170481900','Axis Bank','UTIB0000084','Swati Spandana','Spouse','+91 8581892812'),

('EMP-1014','Divya Singh','divya.singh@snailhr.com','+91 9584560443','employee','des-2','Risk','2024-06-02','Active',
 'Flat 164, Shanti Enclave, Sector 21, Bangalore',
 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Head of Credit & Risk metrics. Dedicated team player.',
 67894,27158,13579,5432,'812058798694','Kotak Mahindra','KKBK0000311','Abhinav Singh','Father','+91 8732161614'),

('EMP-1015','Sandeep Dhupia','sandeep.dhupia@snailhr.com','+91 9332036233','employee','des-3','HR','2024-10-24','Active',
 'Flat 171, Shanti Enclave, Sector 22, Mumbai',
 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in HR Business Partner metrics. Dedicated team player.',
 51925,20770,10385,4154,'859927898292','HDFC Bank','HDFC0000104','Anjali Dhupia','Mother','+91 8750478070'),

('EMP-1016','Neha Oberoi','neha.oberoi@snailhr.com','+91 9738925450','employee','des-4','Loans','2024-04-18','Active',
 'Flat 178, Shanti Enclave, Sector 23, Noida',
 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Senior Loan Officer metrics. Dedicated team player.',
 46708,18683,9342,3737,'886811106065','ICICI Bank','ICIC0000213','Manoj Oberoi','Sibling','+91 8931372514'),

('EMP-1017','Vivek Sen','vivek.sen@snailhr.com','+91 9487032822','employee','des-5','Insurance','2024-03-18','Active',
 'Flat 185, Shanti Enclave, Sector 24, Pune',
 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Insurance Underwriter metrics. Dedicated team player.',
 47132,18853,9426,3771,'949560859354','SBI','SBIN0001234','Kiran Sen','Spouse','+91 8441050264'),

('EMP-1018','Swati Bindra','swati.bindra@snailhr.com','+91 9440848248','employee','des-6','Sales','2024-09-05','Active',
 'Flat 192, Shanti Enclave, Sector 25, Hyderabad',
 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Sales Relationship Manager metrics. Dedicated team player.',
 40112,16045,8022,3209,'310121057236','Axis Bank','UTIB0000084','Milind Bindra','Father','+91 8300967528'),

('EMP-1019','Abhinav Bhagwat','abhinav.bhagwat@snailhr.com','+91 9720197394','employee','des-7','Operations','2024-07-26','Active',
 'Flat 199, Shanti Enclave, Sector 26, Bangalore',
 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Collections Specialist metrics. Dedicated team player.',
 48274,19310,9655,3862,'631303676037','Kotak Mahindra','KKBK0000311','Shreya Bhagwat','Mother','+91 8684932965'),

('EMP-1020','Anjali Bajpayee','anjali.bajpayee@snailhr.com','+91 9743880852','employee','des-8','Compliance','2024-02-27','Active',
 'Flat 206, Shanti Enclave, Sector 27, Mumbai',
 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Compliance Officer metrics. Dedicated team player.',
 53373,21349,10675,4270,'479039470064','HDFC Bank','HDFC0000104','Sonu Bajpayee','Sibling','+91 8364405870'),

('EMP-1021','Manoj Hashmi','manoj.hashmi@snailhr.com','+91 9558605131','employee','des-1','Executive','2024-11-05','Active',
 'Flat 213, Shanti Enclave, Sector 28, Noida',
 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Managing Director metrics. Dedicated team player.',
 66135,26454,13227,5291,'588102214618','ICICI Bank','ICIC0000213','Arijit Hashmi','Spouse','+91 8311298358'),

('EMP-1022','Kiran Kapoor','kiran.kapoor@snailhr.com','+91 9803446703','employee','des-2','Risk','2024-09-04','Active',
 'Flat 220, Shanti Enclave, Sector 29, Pune',
 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Head of Credit & Risk metrics. Dedicated team player.',
 65742,26297,13148,5259,'712763233264','SBI','SBIN0001234','Sunidhi Kapoor','Father','+91 8253348997'),

('EMP-1023','Milind Bedi','milind.bedi@snailhr.com','+91 9170745362','employee','des-3','HR','2024-08-10','Active',
 'Flat 227, Shanti Enclave, Sector 30, Hyderabad',
 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in HR Business Partner metrics. Dedicated team player.',
 57373,22949,11475,4590,'326045266517','Axis Bank','UTIB0000084','Rohit Bedi','Mother','+91 8855414890'),

('EMP-1024','Shreya Soman','shreya.soman@snailhr.com','+91 9369338830','employee','des-4','Loans','2024-09-23','Active',
 'Flat 234, Shanti Enclave, Sector 31, Bangalore',
 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Senior Loan Officer metrics. Dedicated team player.',
 70297,28119,14059,5624,'973279703757','Kotak Mahindra','KKBK0000311','Virat Soman','Sibling','+91 8974581979'),

('EMP-1025','Sonu Ghoshal','sonu.ghoshal@snailhr.com','+91 9700501608','employee','des-5','Insurance','2024-08-22','Active',
 'Flat 241, Shanti Enclave, Sector 32, Mumbai',
 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Insurance Underwriter metrics. Dedicated team player.',
 67915,27166,13583,5433,'310878949850','HDFC Bank','HDFC0000104','Mahendra Ghoshal','Spouse','+91 8248026154'),

('EMP-1026','Arijit Nigam','arijit.nigam@snailhr.com','+91 9216712483','employee','des-6','Sales','2024-01-10','Active',
 'Flat 248, Shanti Enclave, Sector 33, Noida',
 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Sales Relationship Manager metrics. Dedicated team player.',
 36438,14575,7288,2915,'990940214141','ICICI Bank','ICIC0000213','Sachin Nigam','Father','+91 8306499603'),

('EMP-1027','Sunidhi Singh','sunidhi.singh@snailhr.com','+91 9767338160','employee','des-7','Operations','2024-04-24','Active',
 'Flat 255, Shanti Enclave, Sector 34, Pune',
 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Collections Specialist metrics. Dedicated team player.',
 72954,29182,14591,5836,'313419519489','SBI','SBIN0001234','Rahul Singh','Mother','+91 8594950095'),

('EMP-1028','Rohit Chauhan','rohit.chauhan@snailhr.com','+91 9615212133','employee','des-8','Compliance','2024-05-17','Active',
 'Flat 262, Shanti Enclave, Sector 35, Hyderabad',
 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Compliance Officer metrics. Dedicated team player.',
 37759,15104,7552,3021,'892388314393','Axis Bank','UTIB0000084','Jasprit Chauhan','Sibling','+91 8611170070'),

('EMP-1029','Virat Sharma','virat.sharma@snailhr.com','+91 9876608694','employee','des-1','Executive','2024-09-06','Active',
 'Flat 269, Shanti Enclave, Sector 36, Bangalore',
 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Managing Director metrics. Dedicated team player.',
 44677,17871,8935,3574,'879257875717','Kotak Mahindra','KKBK0000311','Ravindra Sharma','Spouse','+91 8957951983'),

('EMP-1030','Mahendra Kohli','mahendra.kohli@snailhr.com','+91 9381754842','employee','des-2','Risk','2024-04-03','Active',
 'Flat 276, Shanti Enclave, Sector 37, Mumbai',
 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Head of Credit & Risk metrics. Dedicated team player.',
 43082,17233,8616,3447,'599914691871','HDFC Bank','HDFC0000104','Siddharth Kohli','Father','+91 8305654999'),

('EMP-1031','Sachin Dhoni','sachin.dhoni@snailhr.com','+91 9527405372','employee','des-3','HR','2024-11-01','Active',
 'Flat 283, Shanti Enclave, Sector 38, Noida',
 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in HR Business Partner metrics. Dedicated team player.',
 51054,20422,10211,4084,'250352117414','ICICI Bank','ICIC0000213','Arjun Dhoni','Mother','+91 8479527335'),

('EMP-1032','Rahul Tendulkar','rahul.tendulkar@snailhr.com','+91 9768214654','employee','des-4','Loans','2024-08-23','Active',
 'Flat 290, Shanti Enclave, Sector 39, Pune',
 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&auto=format&fit=crop',
 'Operations coordinator specialized in Senior Loan Officer metrics. Dedicated team player.',
 73407,29363,14681,5873,'893884822411','SBI','SBIN0001234','Aditi Tendulkar','Sibling','+91 8898799391')
ON CONFLICT (id) DO NOTHING;

-- Update branches for seeded employees
UPDATE employees SET branch = 'Noida Field Hub' WHERE id = 'EMP-1001';
UPDATE employees SET branch = 'Snail Mumbai HQ' WHERE id = 'EMP-1002';
UPDATE employees SET branch = 'Pune Branch Office' WHERE id = 'EMP-1003';
UPDATE employees SET branch = 'Hyderabad Insurance Center' WHERE id = 'EMP-1004';
UPDATE employees SET branch = 'Snail Mumbai HQ' WHERE id = 'EMP-1005';
UPDATE employees SET branch = 'Noida Field Hub' WHERE id = 'EMP-1006';
UPDATE employees SET branch = 'Pune Branch Office' WHERE id = 'EMP-1007';
UPDATE employees SET branch = 'Hyderabad Insurance Center' WHERE id = 'EMP-1008';
UPDATE employees SET branch = 'Bangalore Tech Hub' WHERE id = 'EMP-1009';
UPDATE employees SET branch = 'Snail Mumbai HQ' WHERE id = 'EMP-1010';
UPDATE employees SET branch = 'Noida Field Hub' WHERE id = 'EMP-1011';
UPDATE employees SET branch = 'Pune Branch Office' WHERE id = 'EMP-1012';
UPDATE employees SET branch = 'Hyderabad Insurance Center' WHERE id = 'EMP-1013';
UPDATE employees SET branch = 'Bangalore Tech Hub' WHERE id = 'EMP-1014';
UPDATE employees SET branch = 'Snail Mumbai HQ' WHERE id = 'EMP-1015';
UPDATE employees SET branch = 'Noida Field Hub' WHERE id = 'EMP-1016';
UPDATE employees SET branch = 'Pune Branch Office' WHERE id = 'EMP-1017';
UPDATE employees SET branch = 'Hyderabad Insurance Center' WHERE id = 'EMP-1018';
UPDATE employees SET branch = 'Bangalore Tech Hub' WHERE id = 'EMP-1019';
UPDATE employees SET branch = 'Snail Mumbai HQ' WHERE id = 'EMP-1020';
UPDATE employees SET branch = 'Noida Field Hub' WHERE id = 'EMP-1021';
UPDATE employees SET branch = 'Pune Branch Office' WHERE id = 'EMP-1022';
UPDATE employees SET branch = 'Hyderabad Insurance Center' WHERE id = 'EMP-1023';
UPDATE employees SET branch = 'Bangalore Tech Hub' WHERE id = 'EMP-1024';
UPDATE employees SET branch = 'Snail Mumbai HQ' WHERE id = 'EMP-1025';
UPDATE employees SET branch = 'Noida Field Hub' WHERE id = 'EMP-1026';
UPDATE employees SET branch = 'Pune Branch Office' WHERE id = 'EMP-1027';
UPDATE employees SET branch = 'Hyderabad Insurance Center' WHERE id = 'EMP-1028';
UPDATE employees SET branch = 'Bangalore Tech Hub' WHERE id = 'EMP-1029';
UPDATE employees SET branch = 'Snail Mumbai HQ' WHERE id = 'EMP-1030';
UPDATE employees SET branch = 'Noida Field Hub' WHERE id = 'EMP-1031';
UPDATE employees SET branch = 'Pune Branch Office' WHERE id = 'EMP-1032';


-- 3. EMPLOYEE DOCUMENTS
INSERT INTO employee_documents (id, employee_id, name, category, uploaded_at, size) VALUES
  ('doc-1','EMP-1001','Aadhaar_Card.pdf','ID Proof','2024-03-15','1.2 MB'),
  ('doc-2','EMP-1001','Employment_Agreement.pdf','Contract','2024-03-15','3.4 MB'),
  ('doc-3','EMP-1002','PAN_Card.pdf','ID Proof','2024-06-01','0.8 MB'),
  ('doc-4','EMP-1002','HR_Certifications.pdf','Educational','2024-06-02','4.1 MB'),
  ('doc-5','EMP-1003','Aadhaar_Rahul.pdf','ID Proof','2024-11-10','1.1 MB'),
  ('doc-6','EMP-1004','Insurance_Cert_III.pdf','Educational','2025-01-20','2.3 MB')
ON CONFLICT (id) DO NOTHING;


-- 4. EMPLOYEE ONBOARDING TASKS
INSERT INTO employee_onboarding_tasks (id, employee_id, task_name, completed, due_date) VALUES
  ('tsk-1','EMP-1001','Bank Account verification',TRUE,'2024-03-20'),
  ('tsk-2','EMP-1001','Submit signed NDA',TRUE,'2024-03-20'),
  ('tsk-3','EMP-1002','ID verification',TRUE,'2024-06-05'),
  ('tsk-4','EMP-1002','Welcome kit dispatch',TRUE,'2024-06-05'),
  ('tsk-5','EMP-1003','Set up laptop and software licenses',TRUE,'2024-11-12'),
  ('tsk-6','EMP-1004','Completed IRDAI Certification logging',TRUE,'2025-01-25'),
  ('tsk-auto-EMP-1005-1','EMP-1005','KYC submission',TRUE,'2024-07-21'),
  ('tsk-auto-EMP-1005-2','EMP-1005','Orientation session',TRUE,'2024-07-21'),
  ('tsk-auto-EMP-1006-1','EMP-1006','KYC submission',TRUE,'2024-08-03'),
  ('tsk-auto-EMP-1006-2','EMP-1006','Orientation session',TRUE,'2024-08-03'),
  ('tsk-auto-EMP-1007-1','EMP-1007','KYC submission',TRUE,'2024-05-21'),
  ('tsk-auto-EMP-1007-2','EMP-1007','Orientation session',TRUE,'2024-05-21'),
  ('tsk-auto-EMP-1008-1','EMP-1008','KYC submission',TRUE,'2024-04-05'),
  ('tsk-auto-EMP-1008-2','EMP-1008','Orientation session',TRUE,'2024-04-05'),
  ('tsk-auto-EMP-1009-1','EMP-1009','KYC submission',TRUE,'2024-02-27'),
  ('tsk-auto-EMP-1009-2','EMP-1009','Orientation session',TRUE,'2024-02-27'),
  ('tsk-auto-EMP-1010-1','EMP-1010','KYC submission',TRUE,'2024-08-25'),
  ('tsk-auto-EMP-1010-2','EMP-1010','Orientation session',TRUE,'2024-08-25'),
  ('tsk-auto-EMP-1011-1','EMP-1011','KYC submission',TRUE,'2024-05-24'),
  ('tsk-auto-EMP-1011-2','EMP-1011','Orientation session',TRUE,'2024-05-24'),
  ('tsk-auto-EMP-1012-1','EMP-1012','KYC submission',TRUE,'2024-03-10'),
  ('tsk-auto-EMP-1012-2','EMP-1012','Orientation session',TRUE,'2024-03-10'),
  ('tsk-auto-EMP-1013-1','EMP-1013','KYC submission',TRUE,'2024-09-14'),
  ('tsk-auto-EMP-1013-2','EMP-1013','Orientation session',TRUE,'2024-09-14'),
  ('tsk-auto-EMP-1014-1','EMP-1014','KYC submission',TRUE,'2024-06-02'),
  ('tsk-auto-EMP-1014-2','EMP-1014','Orientation session',TRUE,'2024-06-02'),
  ('tsk-auto-EMP-1015-1','EMP-1015','KYC submission',TRUE,'2024-10-24'),
  ('tsk-auto-EMP-1015-2','EMP-1015','Orientation session',TRUE,'2024-10-24'),
  ('tsk-auto-EMP-1016-1','EMP-1016','KYC submission',TRUE,'2024-04-18'),
  ('tsk-auto-EMP-1016-2','EMP-1016','Orientation session',TRUE,'2024-04-18'),
  ('tsk-auto-EMP-1017-1','EMP-1017','KYC submission',TRUE,'2024-03-18'),
  ('tsk-auto-EMP-1017-2','EMP-1017','Orientation session',TRUE,'2024-03-18'),
  ('tsk-auto-EMP-1018-1','EMP-1018','KYC submission',TRUE,'2024-09-05'),
  ('tsk-auto-EMP-1018-2','EMP-1018','Orientation session',TRUE,'2024-09-05'),
  ('tsk-auto-EMP-1019-1','EMP-1019','KYC submission',TRUE,'2024-07-26'),
  ('tsk-auto-EMP-1019-2','EMP-1019','Orientation session',TRUE,'2024-07-26'),
  ('tsk-auto-EMP-1020-1','EMP-1020','KYC submission',TRUE,'2024-02-27'),
  ('tsk-auto-EMP-1020-2','EMP-1020','Orientation session',TRUE,'2024-02-27'),
  ('tsk-auto-EMP-1021-1','EMP-1021','KYC submission',TRUE,'2024-11-05'),
  ('tsk-auto-EMP-1021-2','EMP-1021','Orientation session',TRUE,'2024-11-05'),
  ('tsk-auto-EMP-1022-1','EMP-1022','KYC submission',TRUE,'2024-09-04'),
  ('tsk-auto-EMP-1022-2','EMP-1022','Orientation session',TRUE,'2024-09-04'),
  ('tsk-auto-EMP-1023-1','EMP-1023','KYC submission',TRUE,'2024-08-10'),
  ('tsk-auto-EMP-1023-2','EMP-1023','Orientation session',TRUE,'2024-08-10'),
  ('tsk-auto-EMP-1024-1','EMP-1024','KYC submission',TRUE,'2024-09-23'),
  ('tsk-auto-EMP-1024-2','EMP-1024','Orientation session',TRUE,'2024-09-23'),
  ('tsk-auto-EMP-1025-1','EMP-1025','KYC submission',TRUE,'2024-08-22'),
  ('tsk-auto-EMP-1025-2','EMP-1025','Orientation session',TRUE,'2024-08-22'),
  ('tsk-auto-EMP-1026-1','EMP-1026','KYC submission',TRUE,'2024-01-10'),
  ('tsk-auto-EMP-1026-2','EMP-1026','Orientation session',TRUE,'2024-01-10'),
  ('tsk-auto-EMP-1027-1','EMP-1027','KYC submission',TRUE,'2024-04-24'),
  ('tsk-auto-EMP-1027-2','EMP-1027','Orientation session',TRUE,'2024-04-24'),
  ('tsk-auto-EMP-1028-1','EMP-1028','KYC submission',TRUE,'2024-05-17'),
  ('tsk-auto-EMP-1028-2','EMP-1028','Orientation session',TRUE,'2024-05-17'),
  ('tsk-auto-EMP-1029-1','EMP-1029','KYC submission',TRUE,'2024-09-06'),
  ('tsk-auto-EMP-1029-2','EMP-1029','Orientation session',TRUE,'2024-09-06'),
  ('tsk-auto-EMP-1030-1','EMP-1030','KYC submission',TRUE,'2024-04-03'),
  ('tsk-auto-EMP-1030-2','EMP-1030','Orientation session',TRUE,'2024-04-03'),
  ('tsk-auto-EMP-1031-1','EMP-1031','KYC submission',TRUE,'2024-11-01'),
  ('tsk-auto-EMP-1031-2','EMP-1031','Orientation session',TRUE,'2024-11-01'),
  ('tsk-auto-EMP-1032-1','EMP-1032','KYC submission',TRUE,'2024-08-23'),
  ('tsk-auto-EMP-1032-2','EMP-1032','Orientation session',TRUE,'2024-08-23')
ON CONFLICT (id) DO NOTHING;


-- 5. ATTENDANCE
INSERT INTO attendance (id, employee_id, date, clock_in, clock_out, status) VALUES
  ('pun-1','EMP-1003','2026-07-20','2026-07-20T09:12:00-07:00',NULL,'Present'),
  ('pun-2','EMP-1004','2026-07-20','2026-07-20T09:42:00-07:00',NULL,'Late'),
  ('pun-3','EMP-1001','2026-07-19','2026-07-19T08:55:00-07:00','2026-07-19T18:05:00-07:00','Present'),
  ('pun-4','EMP-1002','2026-07-19','2026-07-19T09:05:00-07:00','2026-07-19T17:45:00-07:00','Present')
ON CONFLICT (id) DO NOTHING;


-- 6. ATTENDANCE BREAKS
INSERT INTO attendance_breaks (attendance_id, break_start, break_end) VALUES
  ('pun-2','2026-07-20T12:00:00-07:00','2026-07-20T12:30:00-07:00');


-- 7. LEAVES
INSERT INTO leaves (id, employee_id, employee_name, leave_type, start_date, end_date, reason, status, applied_date) VALUES
  ('lv-1','EMP-1003','Rahul Verma','Medical Leave','2026-07-22','2026-07-24',
   'Severe fever and wisdom tooth extraction','Pending','2026-07-19'),
  ('lv-2','EMP-1004','Sneha Iyer','Casual Leave','2026-07-10','2026-07-12',
   'Traveling to native place for family ceremony','Approved','2026-07-05')
ON CONFLICT (id) DO NOTHING;


-- 8. HOLIDAYS
INSERT INTO holidays (id, date, name, type) VALUES
  ('hol-1','2026-01-26','Republic Day','National'),
  ('hol-2','2026-03-17','Holi','Regional'),
  ('hol-3','2026-04-03','Good Friday','National'),
  ('hol-4','2026-08-15','Independence Day','National'),
  ('hol-5','2026-10-02','Gandhi Jayanti','National'),
  ('hol-6','2026-10-19','Dussehra','Regional'),
  ('hol-7','2026-11-08','Diwali Festival of Lights','National'),
  ('hol-8','2026-12-25','Christmas Day','National')
ON CONFLICT (id) DO NOTHING;


-- 9. POLICIES
INSERT INTO policies (id, title, category, content, last_updated) VALUES
  ('pol-1','Code of Conduct & Ethics','Conduct & Ethics',
   'SnailHR and our NBFC parent are committed to the highest standards of professional integrity. Employees must ensure that all loan interest calculations and insurance loading charges are explicitly disclosed to customers. Misrepresentation of terms, processing fees, or tie-up commissions is strictly prohibited.',
   '2026-01-10'),
  ('pol-2','Annual Leave & Attendance Policy','Employee Benefits',
   'Every active employee receives 18 Casual Leaves and 12 Medical Leaves per year. Attendance punches should be recorded between 09:00 AM and 06:30 PM. Clocking in after 09:30 AM is considered Late. Consecutive late-comings of more than 3 days per month will attract an automatic system fine of Rs. 500.',
   '2026-02-15'),
  ('pol-3','Data Protection & Information Security Policy','Compliance & Security',
   'NBFC employees handle sensitive financial details (Bank Statements, PAN details, Credit Scores). All personal documents and credit files of loan prospects must be managed strictly inside the secure company CRM. Storing client records on local hard drives or sharing them on public messaging apps is a severe violation.',
   '2026-03-01'),
  ('pol-4','Sales Commission & Agent Incentives Program','NBFC Sales & Commissions',
   'Relationship managers and underwriting coordinators are eligible for a quarterly sales commission. Loans processed with zero NPA logs in the first 6 months earn an additional 1.5% commission weight. Motor and group health policies qualify for a flat incentive paid along with the monthly payslip.',
   '2026-04-12')
ON CONFLICT (id) DO NOTHING;


-- 10. EXPENSES
INSERT INTO expenses (id, employee_id, employee_name, category, amount, date, description, status) VALUES
  ('exp-1','EMP-1003','Rahul Verma','Travel & Fuel',1850,'2026-07-15',
   'Fuel and toll charges for visiting loan applicant''s warehouse in Greater Noida','Pending'),
  ('exp-2','EMP-1004','Sneha Iyer','Client Entertainment',2400,'2026-07-08',
   'Business dinner with Bajaj Allianz Insurance distribution partners','Approved'),
  ('exp-3','EMP-1003','Rahul Verma','Broadband & Phone',999,'2026-07-01',
   'Work-from-home high-speed monthly internet reimbursement','Approved')
ON CONFLICT (id) DO NOTHING;


-- 11. INVENTORY
INSERT INTO inventory (id, name, serial_number, category, status, assigned_to_employee_id, assigned_date) VALUES
  ('inv-1','Lenovo ThinkPad T14','SNAIL-LP-8849','Laptop','Assigned','EMP-1001','2024-03-15'),
  ('inv-2','Dell Latitude 5420','SNAIL-LP-9241','Laptop','Assigned','EMP-1003','2024-11-12'),
  ('inv-3','iPad 10.9-inch (Sales Tab)','SNAIL-TB-3021','Mobile Tablet','Assigned','EMP-1004','2025-01-21'),
  ('inv-4','TP-Link Portable 4G Router','SNAIL-WF-1049','WiFi Dongle','Available',NULL,NULL),
  ('inv-5','Dell 24-inch IPS Monitor','SNAIL-MN-4491','Other','Available',NULL,NULL)
ON CONFLICT (id) DO NOTHING;


-- 12. INVENTORY REQUESTS
INSERT INTO inventory_requests (id, employee_id, employee_name, item_name, category, request_date, reason, status) VALUES
  ('invreq-1','EMP-1004','Sneha Iyer',
   'Portable Bluetooth Scanner (for field documentation)','Other','2026-07-18',
   'Need portable document scanner to quickly upload customer insurance proposal files during field audits.',
   'Pending')
ON CONFLICT (id) DO NOTHING;


-- 13. FINES
INSERT INTO fines (id, employee_id, employee_name, reason, amount, date, status) VALUES
  ('fin-1','EMP-1003','Rahul Verma','Late Coming',500,'2026-07-12','Pending'),
  ('fin-2','EMP-1004','Sneha Iyer','Compliance Violation',1000,'2026-07-05','Deducted From Payroll')
ON CONFLICT (id) DO NOTHING;


-- 14. REIMBURSEMENTS
INSERT INTO reimbursements (id, employee_id, employee_name, category, amount, claim_id, status, processed_date) VALUES
  ('reim-1','EMP-1004','Sneha Iyer','Client Entertainment',2400,'exp-2','Pending',NULL),
  ('reim-2','EMP-1003','Rahul Verma','Broadband & Phone',999,'exp-3','Paid','2026-07-05')
ON CONFLICT (id) DO NOTHING;


-- 15. PAYSLIPS
INSERT INTO payslips (id, employee_id, month, basic, hra, allowances, fines_deducted, pf_deduction, tax_deduction, net_pay, status, generated_at, sent_to_email) VALUES
  ('pay-1','EMP-1003','June 2026',50000,20000,15000,0,4200,3500,77300,'Paid','2026-07-01T10:00:00Z','rahul.verma@snailhr.com'),
  ('pay-2','EMP-1004','June 2026',48000,19200,12800,1000,4000,3000,72000,'Paid','2026-07-01T10:15:00Z','sneha.iyer@snailhr.com')
ON CONFLICT (id) DO NOTHING;


-- 16. SIMULATED EMAILS
INSERT INTO simulated_emails (id, recipient_email, recipient_name, subject, body, sent_at) VALUES
  ('em-1','rahul.verma@snailhr.com','Rahul Verma',
   'Payslip Generated for June 2026 - SnailHR',
   E'Dear Rahul Verma,\n\nYour payslip for the month of June 2026 has been generated and approved by the SnailHR finance team. Here are the brief payroll details:\n- Net Pay: Rs. 77,300\n- PF Deduction: Rs. 4,200\n- Professional Tax: Rs. 3,500\n\nYou can log into your SnailHR app to view, download, or print your full structural PDF. If you have questions regarding allowances, commissions, or sales incentives, contact priya.patel@snailhr.com.\n\nBest Regards,\nSnailHR Payroll Automation Bot',
   '2026-07-01T10:00:05-07:00'),

  ('em-2','sneha.iyer@snailhr.com','Sneha Iyer',
   'Welcome to SnailHR Admin Panel!',
   E'Dear Sneha Iyer,\n\nWelcome to SnailHR! Your employee portal is fully active. You have been onboarded as a Senior Insurance Underwriter in the Insurance Department.\n\nPlease log in and upload your IRDAI certification files and complete your onboarding tasks.\n\nBest Regards,\nPriya Patel (HR Team)',
   '2025-01-20T09:30:00-07:00')
ON CONFLICT (id) DO NOTHING;


-- 17. CUSTOM LEAVE TYPES
INSERT INTO custom_leave_types (name) VALUES
  ('Casual Leave'),
  ('Medical Leave'),
  ('Earned Leave'),
  ('Maternity/Paternity'),
  ('Loss of Pay')
ON CONFLICT (name) DO NOTHING;


-- 18. CUSTOM DEPARTMENTS
INSERT INTO custom_departments (name) VALUES
  ('Executive'),
  ('Risk'),
  ('HR'),
  ('Loans'),
  ('Insurance'),
  ('Sales'),
  ('Operations'),
  ('Compliance'),
  ('Marketing')
ON CONFLICT (name) DO NOTHING;


-- 19. CUSTOM BRANCHES
INSERT INTO custom_branches (name) VALUES
  ('Snail Mumbai HQ'),
  ('Noida Field Hub'),
  ('Pune Branch Office'),
  ('Hyderabad Insurance Center'),
  ('Bangalore Tech Hub')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
