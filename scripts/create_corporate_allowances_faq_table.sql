-- SQL migration script to create the corporate_allowances_faq database table in Supabase
CREATE TABLE IF NOT EXISTS public.corporate_allowances_faq (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by company_id
CREATE INDEX IF NOT EXISTS idx_corporate_allowances_faq_company_id ON public.corporate_allowances_faq(company_id);
