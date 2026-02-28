-- 09_prompts_table.sql
-- Migration to support multiple named prompts for Text and Voice AI

CREATE TABLE IF NOT EXISTS prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_account_id UUID REFERENCES sub_accounts(id) ON DELETE CASCADE,
    ai_type TEXT NOT NULL CHECK (ai_type IN ('text', 'voice')),
    name TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (sub_account_id, ai_type, name)
);

-- Enable RLS
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "prompts_read" ON prompts FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
    OR sub_account_id IN (SELECT id FROM sub_accounts WHERE agency_id IN (SELECT agency_id FROM user_roles WHERE user_id = auth.uid() AND role = 'agency_admin'))
    OR sub_account_id IN (SELECT sub_account_id FROM user_roles WHERE user_id = auth.uid() AND role = 'sub_account_user')
);

CREATE POLICY "prompts_write" ON prompts FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
    OR sub_account_id IN (SELECT id FROM sub_accounts WHERE agency_id IN (SELECT agency_id FROM user_roles WHERE user_id = auth.uid() AND role = 'agency_admin'))
    OR sub_account_id IN (SELECT sub_account_id FROM user_roles WHERE user_id = auth.uid() AND role = 'sub_account_user')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
    OR sub_account_id IN (SELECT id FROM sub_accounts WHERE agency_id IN (SELECT agency_id FROM user_roles WHERE user_id = auth.uid() AND role = 'agency_admin'))
    OR sub_account_id IN (SELECT sub_account_id FROM user_roles WHERE user_id = auth.uid() AND role = 'sub_account_user')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prompts_sub_account_id ON prompts(sub_account_id);
CREATE INDEX IF NOT EXISTS idx_prompts_ai_type ON prompts(ai_type);
