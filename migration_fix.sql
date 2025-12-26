-- Migration Script to Fix Missing Columns in Live Database

-- 1. Add status column to testimonials if missing
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS status TEXT DEFAULT NULL;
-- Add check constraint safely (might fail if data violates it, so we skip constraint for now or try specific alter)
-- ALTER TABLE testimonials ADD CONSTRAINT status_check CHECK (status IS NULL OR status IN ('approved', 'pending'));

-- 2. Add other potential missing columns
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS image TEXT DEFAULT '';
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS date TEXT DEFAULT '';

-- 3. Ensure Ads table exists and has defaults
CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY DEFAULT 1,
    head TEXT DEFAULT '',
    header TEXT DEFAULT '',
    body TEXT DEFAULT '',
    sidebar TEXT DEFAULT '',
    footer TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_row_ads CHECK (id = 1)
);

INSERT INTO ads (id, head, header, body, sidebar, footer) 
VALUES (1, '', '', '', '', '')
ON CONFLICT (id) DO NOTHING;
