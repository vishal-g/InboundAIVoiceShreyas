-- 03_clear_test_data.sql
-- Run this in your Supabase SQL Editor to clear the previously partially-inserted test data.
-- This will resolve the "assigned_number" collision and ensure the users are created properly.

DELETE FROM public.sub_account_settings;
DELETE FROM public.sub_accounts WHERE name = 'Demo Roofing Sub-Account';
DELETE FROM public.agencies WHERE name = 'Demo Agency LLC';
DELETE FROM public.user_roles;

-- Note: We cannot easily bulk delete from auth.users via SQL without CASCADE risks to other tables, 
-- but auth.users uses ON CONFLICT DO NOTHING in our seed script anyway.
-- By deleting the public tables, we ensure the seed script will re-run the transaction successfully.
