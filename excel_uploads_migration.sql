-- ============================================================
--  MGM FINANCIERS PRIV LIMITED - Excel Uploads Archive Migration
--  Creates excel_uploads table to store uploaded Excel/CSV files date-wise
-- ============================================================

CREATE TABLE IF NOT EXISTS public.excel_uploads (
  id                     TEXT PRIMARY KEY,                     -- e.g. "IMP-1721820000000"
  filename               TEXT NOT NULL,                        -- e.g. "July_2026_Agents.xlsx"
  uploaded_at            TIMESTAMPTZ DEFAULT NOW(),            -- Timestamp of upload
  uploaded_by_name       TEXT,                                 -- Name of user who performed upload
  uploaded_by_id         TEXT,                                 -- Employee ID of uploader
  record_count           INTEGER DEFAULT 0,                    -- Total number of employee records imported
  detected_custom_fields JSONB DEFAULT '[]'::jsonb,            -- JSON array of dynamic headers detected (e.g. ["Blood Group", "PAN Number"])
  status                 TEXT DEFAULT 'Success',               -- "Success" | "Partial" | "Failed"
  file_data              TEXT                                  -- Base64 or text content of uploaded file
);

-- Create index on uploaded_at DESC for fast date-wise retrieval (newest uploads on top)
CREATE INDEX IF NOT EXISTS idx_excel_uploads_uploaded_at ON public.excel_uploads(uploaded_at DESC);
