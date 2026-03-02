-- 02_seed_test_users.sql
-- Run this in your Supabase SQL Editor to instantly create 3 test users and their roles.
-- Passwords for all 3 users will be: Password123!

-- 1. Create the Users in Supabase Auth (bypassing email confirmation)
-- We use a DO block to safely insert only if they don't exist

DO $$
DECLARE
    super_admin_id UUID;
    agency_admin_id UUID;
    sub_account_user_id UUID;
    
    agency_uuid UUID := '11111111-1111-1111-1111-111111111111';
    sub_account_uuid UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
    -- 1. Get or Create Super Admin
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'superadmin.demo.ghl@gmail.com') THEN
        super_admin_id := gen_random_uuid();
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at, 
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
            role, aud, confirmation_token, recovery_token, email_change_token_new, 
            email_change, phone_change, phone_change_token, email_change_token_current, 
            reauthentication_token, is_sso_user, is_anonymous
        )
        VALUES (
            super_admin_id, '00000000-0000-0000-0000-000000000000', 'superadmin.demo.ghl@gmail.com', 
            crypt('Password123!', gen_salt('bf')), now(), 
            '{"provider":"email","providers":["email"]}', '{"email": "superadmin.demo.ghl@gmail.com", "email_verified": true}', 
            now(), now(), 'authenticated', 'authenticated', '', '', '', '', '', '', '', '', false, false
        );
    ELSE
        SELECT id INTO super_admin_id FROM auth.users WHERE email = 'superadmin.demo.ghl@gmail.com';
    END IF;

    -- Ensure Platform Admin Role
    INSERT INTO public.user_roles (user_id, agency_id, sub_account_id, role)
    VALUES (super_admin_id, NULL, NULL, 'platform_admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'platform_admin';

    -- 2. Create Agency
    INSERT INTO public.agencies (id, name, is_active)
    VALUES (agency_uuid, 'Demo Agency LLC', true)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

    -- 3. Get or Create Agency Admin
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'agencyadmin.demo.ghl@gmail.com') THEN
        agency_admin_id := gen_random_uuid();
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at, 
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
            role, aud, confirmation_token, recovery_token, email_change_token_new, 
            email_change, phone_change, phone_change_token, email_change_token_current, 
            reauthentication_token, is_sso_user, is_anonymous
        )
        VALUES (
            agency_admin_id, '00000000-0000-0000-0000-000000000000', 'agencyadmin.demo.ghl@gmail.com', 
            crypt('Password123!', gen_salt('bf')), now(), 
            '{"provider":"email","providers":["email"]}', '{"email": "agencyadmin.demo.ghl@gmail.com", "email_verified": true}', 
            now(), now(), 'authenticated', 'authenticated', '', '', '', '', '', '', '', '', false, false
        );
    ELSE
        SELECT id INTO agency_admin_id FROM auth.users WHERE email = 'agencyadmin.demo.ghl@gmail.com';
    END IF;

    -- Ensure Agency Admin Role
    INSERT INTO public.user_roles (user_id, agency_id, sub_account_id, role)
    VALUES (agency_admin_id, agency_uuid, NULL, 'agency_admin')
    ON CONFLICT (user_id) DO UPDATE SET agency_id = EXCLUDED.agency_id, role = 'agency_admin';

    -- 4. Create Sub-Account
    INSERT INTO public.sub_accounts (id, agency_id, name, is_active)
    VALUES (sub_account_uuid, agency_uuid, 'Demo Roofing Sub-Account', true)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

    -- 5. Get or Create Sub-Account User
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'subaccount.demo.ghl@gmail.com') THEN
        sub_account_user_id := gen_random_uuid();
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at, 
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
            role, aud, confirmation_token, recovery_token, email_change_token_new, 
            email_change, phone_change, phone_change_token, email_change_token_current, 
            reauthentication_token, is_sso_user, is_anonymous
        )
        VALUES (
            sub_account_user_id, '00000000-0000-0000-0000-000000000000', 'subaccount.demo.ghl@gmail.com', 
            crypt('Password123!', gen_salt('bf')), now(), 
            '{"provider":"email","providers":["email"]}', '{"email": "subaccount.demo.ghl@gmail.com", "email_verified": true}', 
            now(), now(), 'authenticated', 'authenticated', '', '', '', '', '', '', '', '', false, false
        );
    ELSE
        SELECT id INTO sub_account_user_id FROM auth.users WHERE email = 'subaccount.demo.ghl@gmail.com';
    END IF;

    -- Ensure Sub Account User Role
    INSERT INTO public.user_roles (user_id, agency_id, sub_account_id, role)
    VALUES (sub_account_user_id, NULL, sub_account_uuid, 'sub_account_user')
    ON CONFLICT (user_id) DO UPDATE SET sub_account_id = EXCLUDED.sub_account_id, role = 'sub_account_user';

    -- Initialize default AI Settings
    INSERT INTO public.sub_account_settings (sub_account_id, assigned_number, first_line, agent_instructions)
    VALUES (sub_account_uuid, '+15550123456', 'Hello, this is the demo agent. How can I help?', 'You are a helpful demo assistant.')
    ON CONFLICT (sub_account_id) DO NOTHING;
END $$;
