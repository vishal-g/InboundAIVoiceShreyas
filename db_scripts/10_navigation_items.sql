-- 10_navigation_items.sql
-- Table for dynamic dashboard navigation

CREATE TABLE IF NOT EXISTS navigation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    href TEXT NOT NULL,
    icon TEXT, -- Lucide icon name, e.g., 'Home', 'Settings'
    sort_order INTEGER NOT NULL DEFAULT 0,
    view_mode TEXT NOT NULL DEFAULT 'all' CHECK (view_mode IN ('super_admin', 'agency', 'sub_account', 'all')),
    required_role TEXT NOT NULL DEFAULT 'all' CHECK (required_role IN ('platform_admin', 'agency_admin', 'sub_account_user', 'all')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE navigation_items ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view active items
CREATE POLICY "Allow authenticated users to read active navigation items"
ON navigation_items FOR SELECT
TO authenticated
USING (is_active = true OR (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'platform_admin'
)));

-- Only platform_admin can manage
CREATE POLICY "Only platform admins can manage navigation items"
ON navigation_items FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role = 'platform_admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role = 'platform_admin'
    )
);

-- Seed some initial data matching current hardcoded links
INSERT INTO navigation_items (label, href, icon, sort_order, view_mode, required_role) VALUES
    ('Overview', '/dashboard', 'Home', 0, 'all', 'all'),
    ('Agencies', '/dashboard/agencies', 'Building2', 1, 'super_admin', 'platform_admin'),
    ('Sub-Accounts', '/dashboard/sub-accounts', 'Users2', 2, 'super_admin', 'platform_admin'),
    ('Manage Checklists', '/dashboard/admin/checklists', 'ClipboardList', 3, 'super_admin', 'platform_admin'),
    ('Sub-Accounts', '/dashboard/sub-accounts', 'Users2', 4, 'agency', 'all'),
    ('Text AI Rep', '/dashboard/{subAccountId}/text-ai/config', 'MessageSquareText', 5, 'sub_account', 'all'),
    ('AI Settings', '/dashboard/{subAccountId}/settings', 'Settings', 6, 'sub_account', 'all'),
    ('Call Logs', '/dashboard/{subAccountId}/logs', 'PhoneCall', 7, 'sub_account', 'all'),
    ('Manage Menu', '/dashboard/admin/navigation', 'Layout', 8, 'super_admin', 'platform_admin')
ON CONFLICT DO NOTHING;
