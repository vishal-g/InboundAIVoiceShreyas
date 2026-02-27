-- 02_test_data_insert.sql
-- Run this in your Supabase SQL Editor AFTER running 01_multi_tenant_schema.sql
-- IMPORTANT: Replace '+1234567890' below with the actual phone number you are dialing FROM (your Vobiz/Twilio number)

-- 1. Insert dummy agency
INSERT INTO agencies (id, name) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Demo Agency') 
ON CONFLICT DO NOTHING;

-- 2. Insert dummy sub account
INSERT INTO sub_accounts (id, agency_id, name) 
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Shreyas Voice Demo') 
ON CONFLICT DO NOTHING;

-- 3. Insert test settings
-- This binds the sub_account to the specific assigned_number you are using to make/receive calls.
INSERT INTO sub_account_settings (
    sub_account_id, 
    assigned_number, 
    llm_model, 
    first_line, 
    agent_instructions
) 
VALUES (
    '22222222-2222-2222-2222-222222222222', 
    '+1234567890', -- CHANGE THIS TO YOUR ACTUAL VOBIZ/TWILIO NUMBER
    'openai:gpt-4o-mini', 
    'Hello from the multi-tenant database!', 
    'You are a helpful AI assistant running on a multi-tenant platform. Keep answers very brief.'
)
ON CONFLICT (sub_account_id) DO UPDATE SET 
    assigned_number = EXCLUDED.assigned_number,
    first_line = EXCLUDED.first_line,
    agent_instructions = EXCLUDED.agent_instructions;
