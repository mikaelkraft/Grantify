-- Granti Database Schema for Neon PostgreSQL
-- This schema includes all tables for managing loan applications, testimonials, 
-- qualified persons, advertising, admin users, and content management.

-- ============================================================================
-- 1. APPLICATIONS TABLE
-- Stores loan application data submitted by users
-- ============================================================================
CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT,
    country TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    purpose TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Standard', 'Fast-Track')),
    repayment_amount NUMERIC(12, 2) NOT NULL,
    duration_months INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    date_applied TEXT NOT NULL,
    referral_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_referral_code ON applications(referral_code) WHERE referral_code IS NOT NULL;

-- ============================================================================
-- 2. TESTIMONIALS TABLE
-- Stores success stories with voting metrics (likes, loves, claps)
-- ============================================================================
CREATE TABLE IF NOT EXISTS testimonials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    loves INTEGER DEFAULT 0,
    claps INTEGER DEFAULT 0,
    date TEXT NOT NULL,
    status TEXT DEFAULT NULL CHECK (status IS NULL OR status IN ('approved', 'pending')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_testimonials_created_at ON testimonials(created_at DESC);

-- ============================================================================
-- 3. QUALIFIED_PERSONS TABLE
-- Stores list of approved applicants and their status
-- ============================================================================
CREATE TABLE IF NOT EXISTS qualified_persons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Contacted', 'Pending', 'Disbursed')),
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qualified_persons_status ON qualified_persons(status);

-- ============================================================================
-- 4. ADS TABLE
-- Stores advertising configuration (single row with id=1)
-- ============================================================================
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

-- Insert default row if not exists
INSERT INTO ads (id, head, header, body, sidebar, footer) 
VALUES (1, '', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. ADMIN_USERS TABLE
-- Stores admin user authentication data
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'FLOOR_ADMIN')),
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

-- ============================================================================
-- 6. REPAYMENT_CONTENT TABLE
-- Stores dynamic text content for the repayment page (single row with id=1)
-- ============================================================================
CREATE TABLE IF NOT EXISTS repayment_content (
    id INTEGER PRIMARY KEY DEFAULT 1,
    intro_text TEXT DEFAULT '',
    standard_note TEXT DEFAULT '',
    fast_track_note TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_row_repayment_content CHECK (id = 1)
);

-- Insert default row if not exists
INSERT INTO repayment_content (id, intro_text, standard_note, fast_track_note) 
VALUES (1, '', '', '')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- Automatically update the updated_at column when rows are modified
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_testimonials_updated_at ON testimonials;
CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON testimonials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_qualified_persons_updated_at ON qualified_persons;
CREATE TRIGGER update_qualified_persons_updated_at BEFORE UPDATE ON qualified_persons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ads_updated_at ON ads;
CREATE TRIGGER update_ads_updated_at BEFORE UPDATE ON ads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_repayment_content_updated_at ON repayment_content;
CREATE TRIGGER update_repayment_content_updated_at BEFORE UPDATE ON repayment_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
