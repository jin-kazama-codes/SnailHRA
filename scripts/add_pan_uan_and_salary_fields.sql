-- =========================================================================
-- SQL Migration Script: Add PAN, UAN, Employee Number & Extended Salary Columns
-- Target Database: PostgreSQL / Supabase
-- =========================================================================

-- 1. Update 'employees' Table
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS prefix VARCHAR(10),
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS employee_number INT,
  ADD COLUMN IF NOT EXISTS pan VARCHAR(15),
  ADD COLUMN IF NOT EXISTS uan VARCHAR(20),
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS salary_telephone NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS salary_fuel NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS salary_professional_dev NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS salary_lta NUMERIC(12, 2) DEFAULT 0.00;

-- 2. Update 'payslips' Table
ALTER TABLE public.payslips
  ADD COLUMN IF NOT EXISTS telephone NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS fuel NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS professional_dev NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS lta NUMERIC(12, 2) DEFAULT 0.00;

-- 3. Create Index on PAN and UAN for faster compliance lookups
CREATE INDEX IF NOT EXISTS idx_employees_pan ON public.employees(pan);
CREATE INDEX IF NOT EXISTS idx_employees_uan ON public.employees(uan);
