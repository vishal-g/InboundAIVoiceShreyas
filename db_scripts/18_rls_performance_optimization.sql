-- 18_rls_performance_optimization.sql
-- Fixes error 42P17 (infinite recursion) and optimizes RLS performance

-- 1. Helper Functions (SECURITY DEFINER breaks recursion)
-- These must be created first
CREATE OR REPLACE FUNCTION public.check_is_platform_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'platform_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_auth_agency_id()
RETURNS uuid AS $$
BEGIN
  RETURN (SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_auth_sub_account_id()
RETURNS uuid AS $$
BEGIN
  RETURN (SELECT sub_account_id FROM public.user_roles WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Aggressive Cleanup
-- Drop ALL policies on core tables to avoid name mismatches and "already exists" errors
DO $$ 
DECLARE 
    rec record;
BEGIN 
    -- Get all policies for tables we are touching
    FOR rec IN 
        SELECT policyname, tablename, schemaname
        FROM pg_policies 
        WHERE (schemaname = 'public' AND tablename IN ('user_roles', 'agencies', 'sub_accounts', 'sub_account_settings', 'call_logs', 'bookings', 'call_stats', 'kb_settings', 'kb_documents', 'kb_urls', 'kb_chunks'))
        OR (schemaname = 'storage' AND tablename = 'objects')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', rec.policyname, rec.schemaname, rec.tablename);
    END LOOP;
END $$;

-- 3. Update user_roles Policies (IDENTITY CHECKS ONLY - NO FUNCTIONS HERE)
-- This is critical to prevent recursion on the check table itself
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
USING (public.check_is_platform_admin())
WITH CHECK (public.check_is_platform_admin());

-- 4. Update agencies & sub_accounts Policies
CREATE POLICY "agencies_read_access" ON public.agencies FOR SELECT TO authenticated
USING (
    public.check_is_platform_admin()
    OR id = public.get_auth_agency_id()
);

CREATE POLICY "sub_accounts_read_access" ON public.sub_accounts FOR SELECT TO authenticated
USING (
    public.check_is_platform_admin()
    OR agency_id = public.get_auth_agency_id()
    OR id = public.get_auth_sub_account_id()
);

-- 5. Update sub_account_settings, call_logs, bookings
CREATE POLICY "settings_read_access" ON public.sub_account_settings FOR SELECT TO authenticated
USING (
    public.check_is_platform_admin()
    OR sub_account_id IN (SELECT id FROM public.sub_accounts) -- Relies on sub_accounts RLS
);

CREATE POLICY "call_logs_read_access" ON public.call_logs FOR SELECT TO authenticated
USING (
    public.check_is_platform_admin()
    OR sub_account_id IN (SELECT id FROM public.sub_accounts) -- Relies on sub_accounts RLS
);

-- Apply similar logic to other data tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bookings') THEN
        CREATE POLICY "bookings_read_access" ON public.bookings FOR SELECT TO authenticated
        USING (public.check_is_platform_admin() OR sub_account_id IN (SELECT id FROM public.sub_accounts));
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'call_stats') THEN
        CREATE POLICY "call_stats_read_access" ON public.call_stats FOR SELECT TO authenticated
        USING (public.check_is_platform_admin() OR sub_account_id IN (SELECT id FROM public.sub_accounts));
    END IF;
END $$;

-- 6. Update Knowledgebase Policies
CREATE POLICY "kb_settings_management" ON public.kb_settings FOR ALL TO authenticated
USING (public.check_is_platform_admin() OR sub_account_id IN (SELECT id FROM public.sub_accounts));

CREATE POLICY "kb_documents_management" ON public.kb_documents FOR ALL TO authenticated
USING (public.check_is_platform_admin() OR sub_account_id IN (SELECT id FROM public.sub_accounts));

CREATE POLICY "kb_urls_management" ON public.kb_urls FOR ALL TO authenticated
USING (public.check_is_platform_admin() OR sub_account_id IN (SELECT id FROM public.sub_accounts));

CREATE POLICY "kb_chunks_management" ON public.kb_chunks FOR ALL TO authenticated
USING (public.check_is_platform_admin() OR sub_account_id IN (SELECT id FROM public.sub_accounts));

-- 7. Update Storage Policy
CREATE POLICY "Knowledgebase Storage Access" ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'knowledgebase' AND (
    public.check_is_platform_admin()
    OR (storage.foldername(name))[1]::uuid IN (SELECT id FROM public.sub_accounts)
  )
)
WITH CHECK (
  bucket_id = 'knowledgebase' AND (
    public.check_is_platform_admin()
    OR (storage.foldername(name))[1]::uuid IN (SELECT id FROM public.sub_accounts)
  )
);
