-- Create checklist_templates table in Supabase if not already created
CREATE TABLE IF NOT EXISTS public.checklist_templates (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    required BOOLEAN DEFAULT true,
    type TEXT NOT NULL, -- 'onboarding' or 'exit'
    company_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS and grant read/write permissions
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read checklist_templates" ON public.checklist_templates;
CREATE POLICY "Allow public read checklist_templates" ON public.checklist_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write checklist_templates" ON public.checklist_templates;
CREATE POLICY "Allow public write checklist_templates" ON public.checklist_templates FOR ALL USING (true);
