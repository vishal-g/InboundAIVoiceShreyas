-- 06_rls_policies.sql
-- Creates Row Level Security policies for all tables.
-- Without these, RLS blocks ALL queries through the anon/authenticated key.

-- user_roles: users can read their own role
CREATE POLICY "Users can read own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- user_roles: platform admins can read all roles
CREATE POLICY "Platform admins can read all roles" ON public.user_roles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'platform_admin')
    );

-- user_roles: platform admins can manage all roles
CREATE POLICY "Platform admins can manage roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'platform_admin')
    );

-- agencies: all authenticated users can read
CREATE POLICY "Authenticated users can read agencies" ON public.agencies
    FOR SELECT TO authenticated USING (true);

-- agencies: platform admins can manage
CREATE POLICY "Platform admins can manage agencies" ON public.agencies
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'platform_admin')
    );

-- sub_accounts: all authenticated users can read
CREATE POLICY "Authenticated users can read sub_accounts" ON public.sub_accounts
    FOR SELECT TO authenticated USING (true);

-- sub_accounts: admins can manage
CREATE POLICY "Admins can manage sub_accounts" ON public.sub_accounts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('platform_admin', 'agency_admin'))
    );

-- sub_account_settings: authenticated users can read
CREATE POLICY "Authenticated users can read settings" ON public.sub_account_settings
    FOR SELECT TO authenticated USING (true);

-- sub_account_settings: admins can manage
CREATE POLICY "Admins can manage settings" ON public.sub_account_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('platform_admin', 'agency_admin'))
    );

-- sub_account_settings: sub-account users can update own
CREATE POLICY "Sub account users can update own settings" ON public.sub_account_settings
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.sub_account_id = sub_account_id)
    );

-- call_logs: all authenticated users can read
CREATE POLICY "Authenticated users can read call_logs" ON public.call_logs
    FOR SELECT TO authenticated USING (true);

-- call_logs: admins can manage
CREATE POLICY "Admins can manage call_logs" ON public.call_logs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('platform_admin', 'agency_admin'))
    );
