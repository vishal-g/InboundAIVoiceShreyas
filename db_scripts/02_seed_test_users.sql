-- 02_seed_test_users.sql
-- Run this in your Supabase SQL Editor to instantly create 3 test users and their roles.
-- Passwords for all 3 users will be: Password123!

-- 1. Create the Users in Supabase Auth (bypassing email confirmation)
-- We use a DO block to safely insert only if they don't exist

DO $$
DECLARE
    super_admin_id UUID := gen_random_uuid();
    agency_admin_id UUID := gen_random_uuid();
    sub_account_user_id UUID := gen_random_uuid();
    
    agency_uuid UUID := gen_random_uuid();
    sub_account_uuid UUID := gen_random_uuid();
BEGIN
    -- Insert Super Admin
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'superadmin.demo.ghl@gmail.com') THEN
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
        VALUES (super_admin_id, '00000000-0000-0000-0000-000000000000', 'superadmin.demo.ghl@gmail.com', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"email": "superadmin.demo.ghl@gmail.com", "email_verified": true}', now(), now(), 'authenticated', 'authenticated');
        
        -- Assign Platform Admin Role
        INSERT INTO public.user_roles (user_id, agency_id, sub_account_id, role)
        VALUES (super_admin_id, NULL, NULL, 'platform_admin');
    END IF;

    -- Create a Dummy Agency
    IF NOT EXISTS (SELECT 1 FROM public.agencies WHERE name = 'Demo Agency LLC') THEN
        INSERT INTO public.agencies (id, name, is_active)
        VALUES (agency_uuid, 'Demo Agency LLC', true);

        -- Insert Agency Admin
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'agencyadmin.demo.ghl@gmail.com') THEN
            INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
            VALUES (agency_admin_id, '00000000-0000-0000-0000-000000000000', 'agencyadmin.demo.ghl@gmail.com', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"email": "agencyadmin.demo.ghl@gmail.com", "email_verified": true}', now(), now(), 'authenticated', 'authenticated');
            
            -- Assign Agency Admin Role
            INSERT INTO public.user_roles (user_id, agency_id, sub_account_id, role)
            VALUES (agency_admin_id, agency_uuid, NULL, 'agency_admin');
        END IF;

        -- Create a Dummy Sub-Account under this Agency
        INSERT INTO public.sub_accounts (id, agency_id, name, is_active)
        VALUES (sub_account_uuid, agency_uuid, 'Demo Roofing Sub-Account', true);

        -- Insert Sub-Account User
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'subaccount.demo.ghl@gmail.com') THEN
            INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
            VALUES (sub_account_user_id, '00000000-0000-0000-0000-000000000000', 'subaccount.demo.ghl@gmail.com', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"email": "subaccount.demo.ghl@gmail.com", "email_verified": true}', now(), now(), 'authenticated', 'authenticated');
            
            -- Assign Sub Account User Role
            INSERT INTO public.user_roles (user_id, agency_id, sub_account_id, role)
            VALUES (sub_account_user_id, NULL, sub_account_uuid, 'sub_account_user');
            
            -- Initialize default AI Settings for this sub-account
            INSERT INTO public.sub_account_settings (sub_account_id, assigned_number, first_line, agent_instructions)
            VALUES (sub_account_uuid, '+1' || floor(random() * 10000000000)::text, 'Hello, this is the demo agent. How can I help?', 'You are a helpful demo assistant.');
        END IF;
    END IF;
END $$;
