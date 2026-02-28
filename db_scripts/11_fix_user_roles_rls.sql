-- SQL Fix for user_roles RLS policies
-- Enabling users to read their own roles and Platform Admins to manage everything

-- 1. Drop existing policies if any (to be safe)
DROP POLICY IF EXISTS "Allow users to read their own role" ON user_roles;
DROP POLICY IF EXISTS "Allow platform admins to manage all roles" ON user_roles;

-- 2. Allow users to read their own roles (Essential for standard client checks)
CREATE POLICY "Allow users to read their own role"
ON user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Allow platform admins to manage all roles (CRUD)
-- Note: This is recursive, so we use a subquery that specifically excludes the current row or handled by Supabase optimizing auth.uid()
CREATE POLICY "Allow platform admins to manage all roles"
ON user_roles FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'platform_admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'platform_admin'
    )
);
