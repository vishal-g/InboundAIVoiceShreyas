-- ══════════════════════════════════════════════════════════════════════════════
-- 12_page_manager_refactor.sql
-- Refactor Checklist system into a more general Page Manager
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Add display_type to checklist_types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checklist_types' AND column_name = 'display_type') THEN
        ALTER TABLE checklist_types ADD COLUMN display_type TEXT DEFAULT 'checklist' CHECK (display_type IN ('checklist', 'page'));
    END IF;
END $$;

-- 2. Seed 'credentials_page' as a 'page' type
INSERT INTO checklist_types (id, title, description, icon, display_type)
VALUES (
    'credentials_page', 
    'Platform Credentials', 
    'Manage your API keys, secrets, and AI prompts.', 
    '🔑', 
    'page'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    display_type = EXCLUDED.display_type;

-- 3. Seed initial sections for Credentials
-- Section 1: AI API Keys
INSERT INTO checklist_sections (id, checklist_type_id, title, description, icon, sort_order) VALUES
    ('c1000000-0000-0000-0000-000000000001', 'credentials_page', 'AI API Keys', 'Connect your LLM providers', '🤖', 1)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- OpenAI Step
INSERT INTO checklist_steps (id, section_id, title, description, sort_order, widget_type, widget_key, widget_title, widget_config) VALUES
    ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'OpenAI Integration', 'Enter your OpenAI API key to enable AI features.', 1, 'credentials', 'openai_keys', 'OpenAI API Key', 
    '{"title": "OpenAI Credentials", "fields": [{"key": "openai_api_key", "type": "password", "label": "API Key", "required": true, "placeholder": "sk-..."}]}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    widget_type = EXCLUDED.widget_type,
    widget_key = EXCLUDED.widget_key,
    widget_title = EXCLUDED.widget_title,
    widget_config = EXCLUDED.widget_config;

-- Section 2: CRM Integration
INSERT INTO checklist_sections (id, checklist_type_id, title, description, icon, sort_order) VALUES
    ('c1000000-0000-0000-0000-000000000002', 'credentials_page', 'CRM & Voice', 'Connect GHL and Voice providers', '🔌', 2)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- GHL Step
INSERT INTO checklist_steps (id, section_id, title, description, sort_order, widget_type, widget_key, widget_title, widget_config) VALUES
    ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'GoHighLevel API', 'Connect your GHL account for CRM automation.', 1, 'credentials', 'ghl_keys', 'GHL Keys', 
    '{"title": "GoHighLevel Credentials", "fields": [{"key": "ghl_api_key", "type": "password", "label": "API Key", "required": true}, {"key": "ghl_location_id", "type": "text", "label": "Location ID", "required": true}]}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    widget_type = EXCLUDED.widget_type,
    widget_key = EXCLUDED.widget_key,
    widget_title = EXCLUDED.widget_title,
    widget_config = EXCLUDED.widget_config;

-- Section 3: AI Prompts
INSERT INTO checklist_sections (id, checklist_type_id, title, description, icon, sort_order) VALUES
    ('c1000000-0000-0000-0000-000000000003', 'credentials_page', 'AI Prompts', 'Configure default AI behaviors', '📝', 3)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- System Prompt Step
INSERT INTO checklist_steps (id, section_id, title, description, sort_order, widget_type, widget_key, widget_title) VALUES
    ('d1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'Master System Prompt', 'The core personality and behavior instructions for your AI.', 1, 'prompt', 'prompt_0', 'System Prompt (prompt_0)')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    widget_type = EXCLUDED.widget_type,
    widget_key = EXCLUDED.widget_key,
    widget_title = EXCLUDED.widget_title;

-- 4. Seed Navigation Item for Credentials
-- First, add a unique constraint if it doesn't exist to allow ON CONFLICT to work
-- We include view_mode because some items (like Sub-Accounts) have different entries for different views
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'navigation_items_label_href_view_mode_key') THEN
        ALTER TABLE navigation_items ADD CONSTRAINT navigation_items_label_href_view_mode_key UNIQUE (label, href, view_mode);
    END IF;
END $$;

INSERT INTO navigation_items (label, href, icon, sort_order, view_mode, required_role)
VALUES (
    'Credentials', 
    '/dashboard/credentials', 
    'Key', 
    10, 
    'all', 
    'sub_account_user'
)
ON CONFLICT (label, href, view_mode) DO UPDATE SET
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    required_role = EXCLUDED.required_role;
