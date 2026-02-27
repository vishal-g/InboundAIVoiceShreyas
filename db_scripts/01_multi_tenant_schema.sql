-- 01_multi_tenant_schema.sql
-- Run this in your Supabase SQL Editor to migrate to the multi-tenant architecture

-- 1. Create the agencies table (The top level - allows multiple Super Admins)
CREATE TABLE IF NOT EXISTS agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create the sub_accounts table (Maps 1:1 with GHL Sub-Accounts)
CREATE TABLE IF NOT EXISTS sub_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    ghl_sub_account_id TEXT UNIQUE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create the users table (Role-Based Access Control)
-- Note: Supabase Auth already has an auth.users table. This is the public profile mapping.
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID PRIMARY KEY, -- References auth.users(id)
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE, -- NULL if Platform Admin
    sub_account_id UUID REFERENCES sub_accounts(id) ON DELETE CASCADE, -- NULL if Agency Admin or Platform Admin
    role TEXT NOT NULL CHECK (role IN ('platform_admin', 'agency_admin', 'sub_account_user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create the sub_account_settings table (The Voice Agent Config)
CREATE TABLE IF NOT EXISTS sub_account_settings (
    sub_account_id UUID PRIMARY KEY REFERENCES sub_accounts(id) ON DELETE CASCADE,
    assigned_number TEXT UNIQUE NOT NULL, -- The LiveKit/Vobiz/Twilio number that calls this agent
    llm_model TEXT DEFAULT 'openai:gpt-4o-mini',
    stt_provider TEXT DEFAULT 'sarvam:saaras:v3',
    tts_voice TEXT DEFAULT 'kavya',
    tts_language TEXT DEFAULT 'hi-IN',
    first_line TEXT DEFAULT 'Hello, who am I speaking with?',
    agent_instructions TEXT DEFAULT 'You are a helpful AI assistant.',
    cal_event_type_id INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Update existing tables to include sub_account_id
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS sub_account_id UUID REFERENCES sub_accounts(id) ON DELETE CASCADE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sub_account_id UUID REFERENCES sub_accounts(id) ON DELETE CASCADE;
ALTER TABLE call_stats ADD COLUMN IF NOT EXISTS sub_account_id UUID REFERENCES sub_accounts(id) ON DELETE CASCADE;

-- Create indexes for performance on lookups
CREATE INDEX IF NOT EXISTS idx_sub_account_settings_assigned_number ON sub_account_settings(assigned_number);
CREATE INDEX IF NOT EXISTS idx_call_logs_sub_account_id ON call_logs(sub_account_id);
CREATE INDEX IF NOT EXISTS idx_bookings_sub_account_id ON bookings(sub_account_id);
CREATE INDEX IF NOT EXISTS idx_call_stats_sub_account_id ON call_stats(sub_account_id);

-- 6. Enable RLS (Row Level Security)
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_account_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- 7. Define RLS Policies for true Multi-Tenancy Security
-- Platform Admins see everything. Agency Admins see everything in their Agency. Sub-Account Users see only their specific Sub-Account.

-- Sub Accounts
CREATE POLICY "allow_read_sub_accounts" ON sub_accounts FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
    OR 
    agency_id IN (SELECT agency_id FROM user_roles WHERE user_id = auth.uid() AND role = 'agency_admin') 
    OR 
    id IN (SELECT sub_account_id FROM user_roles WHERE user_id = auth.uid() AND role = 'sub_account_user')
);

-- Settings
CREATE POLICY "allow_read_settings" ON sub_account_settings FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
    OR
    sub_account_id IN (SELECT id FROM sub_accounts WHERE agency_id IN (SELECT agency_id FROM user_roles WHERE user_id = auth.uid() AND role = 'agency_admin'))
    OR 
    sub_account_id IN (SELECT sub_account_id FROM user_roles WHERE user_id = auth.uid() AND role = 'sub_account_user')
);

-- Call Logs
CREATE POLICY "allow_read_call_logs" ON call_logs FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
    OR
    sub_account_id IN (SELECT id FROM sub_accounts WHERE agency_id IN (SELECT agency_id FROM user_roles WHERE user_id = auth.uid() AND role = 'agency_admin'))
    OR 
    sub_account_id IN (SELECT sub_account_id FROM user_roles WHERE user_id = auth.uid() AND role = 'sub_account_user')
);
