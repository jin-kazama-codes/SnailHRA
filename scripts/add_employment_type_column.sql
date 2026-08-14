-- =========================================================================
-- SQL Migration Script: Add Employment Type Column to Employees Table (Null/Empty by Default)
-- Target Database: PostgreSQL / Supabase
-- =========================================================================

-- 1. Add 'employment_type' column without a default value (allows NULL / empty)
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50);

-- If column already exists with DEFAULT 'permanent', drop default constraint and reset existing values to NULL
ALTER TABLE public.employees
  ALTER COLUMN employment_type DROP DEFAULT;

UPDATE public.employees
  SET employment_type = NULL;

-- 2. Add check constraint to allow NULL, empty string, or allowed values ('contract', 'permanent', 'consultant')
ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS chk_employees_employment_type;

ALTER TABLE public.employees
  ADD CONSTRAINT chk_employees_employment_type
  CHECK (employment_type IS NULL OR employment_type IN ('contract', 'permanent', 'consultant', ''));

-- 3. Create index on employment_type
CREATE INDEX IF NOT EXISTS idx_employees_employment_type ON public.employees(employment_type);
