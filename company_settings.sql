-- ==============================================================================
-- SQL MIGRATION: Company Settings (Employer PAN, TAN, GSTIN, Address, Signatory)
-- Run this in your Supabase SQL Editor to support Employer PAN & TAN per company
-- ==============================================================================

-- 1. Add PAN, TAN, and organizational details to public.companies table
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS pan TEXT,
  ADD COLUMN IF NOT EXISTS tan TEXT,
  ADD COLUMN IF NOT EXISTS gstin TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS signatory_name TEXT,
  ADD COLUMN IF NOT EXISTS signatory_designation TEXT;

-- 2. Optional: Create dedicated company_settings table for multi-tenant configurations
CREATE TABLE IF NOT EXISTS public.company_settings (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  company_name TEXT,
  pan TEXT,
  tan TEXT,
  gstin TEXT,
  address TEXT,
  signatory_name TEXT,
  signatory_designation TEXT,
  logo_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS & create permissive policies for authenticated / service operations
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'company_settings' AND policyname = 'Allow all on company_settings'
  ) THEN
    CREATE POLICY "Allow all on company_settings" ON public.company_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
