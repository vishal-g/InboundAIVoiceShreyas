# Test Credentials for Dashboard Validation

Run the `db_scripts/02_seed_test_users.sql` script in your Supabase SQL Editor to automatically generate these users in the database and link them to their Multi-Tenant roles.

## 1. Platform Super Admin
This user has the highest level of access and can see all Agencies and all Sub-Accounts on the platform.
- **Email:** `superadmin.demo.ghl@gmail.com`
- **Password:** `Password123!`
- **Role:** `platform_admin`
- **Expected View:** Should see the "Agencies", "Sub-Accounts", and "System Logs" links in the sidebar.

## 2. Agency Admin
This user manages a specific white-label agency and can see all Sub-Accounts associated with their specific agency.
- **Email:** `agencyadmin.demo.ghl@gmail.com`
- **Password:** `Password123!`
- **Role:** `agency_admin`
- **Expected View:** Should see the "Sub-Accounts" linking to only their clients (currently limited implementation, but role exists).

## 3. Sub-Account User (End Client)
This is an end-client (like a roofing company) who only has access to their own specific AI Voice Agent settings, logs, and analytics.
- **Email:** `subaccount.demo.ghl@gmail.com`
- **Password:** `Password123!`
- **Role:** `sub_account_user`
- **Expected View:** Should **NOT** see "Agencies" or "Sub-Accounts" in the sidebar. Should only see specific setup links for their pipeline (Settings, Call Logs, Analytics).
