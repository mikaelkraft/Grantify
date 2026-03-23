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

-- 4. Loan Providers: ensure logo_url exists
ALTER TABLE loan_providers ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 5. User submissions queue for suggested loan apps/providers
CREATE TABLE IF NOT EXISTS loan_provider_submissions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    loan_range TEXT,
    interest_range TEXT,
    tenure TEXT,
    website TEXT NOT NULL,
    logo_url TEXT,
    play_store_url TEXT,
    tag TEXT,
    rating DECIMAL(2,1),
    requirements TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS loan_provider_submissions_status_created_at_idx
ON loan_provider_submissions (status, created_at DESC);

-- 6. Provider reviews: ensure replies are supported via parent_id
CREATE TABLE IF NOT EXISTS provider_reviews (
        id TEXT PRIMARY KEY,
        provider_id INTEGER REFERENCES loan_providers(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        rating INTEGER,
        content TEXT NOT NULL,
        parent_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE provider_reviews
    ADD COLUMN IF NOT EXISTS parent_id TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS rating INTEGER;

CREATE INDEX IF NOT EXISTS provider_reviews_provider_id_idx ON provider_reviews (provider_id);
CREATE INDEX IF NOT EXISTS provider_reviews_parent_id_idx ON provider_reviews (parent_id);
