-- ══════════════════════════════════════════════════════════════════════════════
-- 07_setup_checklist.sql — Generic modular checklist system
-- Supports: Text AI Config, Voice AI Config, Deploy AI Reps, or any future process
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Checklist type registry (e.g. 'text_ai_config', 'voice_ai_config', 'deploy_ai_reps')
CREATE TABLE IF NOT EXISTS checklist_types (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sections within a checklist type
CREATE TABLE IF NOT EXISTS checklist_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_type_id TEXT NOT NULL REFERENCES checklist_types(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Steps within a section
CREATE TABLE IF NOT EXISTS checklist_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES checklist_sections(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Per-sub-account step completion tracking
CREATE TABLE IF NOT EXISTS checklist_progress (
    sub_account_id UUID NOT NULL REFERENCES sub_accounts(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES checklist_steps(id) ON DELETE CASCADE,
    is_done BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (sub_account_id, step_id)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_checklist_sections_type ON checklist_sections(checklist_type_id);
CREATE INDEX IF NOT EXISTS idx_checklist_steps_section ON checklist_steps(section_id);
CREATE INDEX IF NOT EXISTS idx_checklist_progress_sub ON checklist_progress(sub_account_id);
CREATE INDEX IF NOT EXISTS idx_checklist_sections_sort ON checklist_sections(checklist_type_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_checklist_steps_sort ON checklist_steps(section_id, sort_order);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE checklist_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_progress ENABLE ROW LEVEL SECURITY;

-- Checklist types, sections, steps: readable by all authenticated users, writable by platform_admin
CREATE POLICY "checklist_types_read" ON checklist_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "checklist_types_write" ON checklist_types FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin'));

CREATE POLICY "checklist_sections_read" ON checklist_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "checklist_sections_write" ON checklist_sections FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin'));

CREATE POLICY "checklist_steps_read" ON checklist_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "checklist_steps_write" ON checklist_steps FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin'));

-- Progress: users can read/write only their own sub-account's progress
CREATE POLICY "checklist_progress_read" ON checklist_progress FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
    OR sub_account_id IN (SELECT id FROM sub_accounts WHERE agency_id IN (SELECT agency_id FROM user_roles WHERE user_id = auth.uid() AND role = 'agency_admin'))
    OR sub_account_id IN (SELECT sub_account_id FROM user_roles WHERE user_id = auth.uid() AND role = 'sub_account_user')
);

CREATE POLICY "checklist_progress_write" ON checklist_progress FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
    OR sub_account_id IN (SELECT id FROM sub_accounts WHERE agency_id IN (SELECT agency_id FROM user_roles WHERE user_id = auth.uid() AND role = 'agency_admin'))
    OR sub_account_id IN (SELECT sub_account_id FROM user_roles WHERE user_id = auth.uid() AND role = 'sub_account_user')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
    OR sub_account_id IN (SELECT id FROM sub_accounts WHERE agency_id IN (SELECT agency_id FROM user_roles WHERE user_id = auth.uid() AND role = 'agency_admin'))
    OR sub_account_id IN (SELECT sub_account_id FROM user_roles WHERE user_id = auth.uid() AND role = 'sub_account_user')
);

-- ══════════════════════════════════════════════════════════════════════════════
-- SEED DATA — Text AI Rep Configuration (8 sections, 54 steps)
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO checklist_types (id, title, description, icon) VALUES
    ('text_ai_config', 'Text AI Rep Setup Progress', 'Complete all phases to enable Text AI reps', '💬')
ON CONFLICT (id) DO NOTHING;

-- ── Section 1: Accounts Setup (5 steps) ─────────────────────────────────────
INSERT INTO checklist_sections (id, checklist_type_id, title, description, icon, sort_order) VALUES
    ('a1000000-0000-0000-0000-000000000001', 'text_ai_config', 'Accounts Setup', 'Create accounts for Supabase, n8n, and more', '👤', 1);
INSERT INTO checklist_steps (section_id, title, description, sort_order) VALUES
    ('a1000000-0000-0000-0000-000000000001', 'Create GoHighLevel Account', 'Set up your GoHighLevel CRM account. You can either use our managed account or create your own.', 1),
    ('a1000000-0000-0000-0000-000000000001', 'Create OpenAI Account', 'Sign up at platform.openai.com and add billing.', 2),
    ('a1000000-0000-0000-0000-000000000001', 'OpenAI API Key', 'Generate an API key from the OpenAI dashboard under API Keys.', 3),
    ('a1000000-0000-0000-0000-000000000001', 'Create OpenRouter Account', 'Sign up at openrouter.ai for access to multiple LLM providers.', 4),
    ('a1000000-0000-0000-0000-000000000001', 'OpenRouter API Key', 'Generate an API key from the OpenRouter dashboard.', 5);

-- ── Section 2: Supabase Setup (7 steps) ─────────────────────────────────────
INSERT INTO checklist_sections (id, checklist_type_id, title, description, icon, sort_order) VALUES
    ('a1000000-0000-0000-0000-000000000002', 'text_ai_config', 'Supabase Setup', 'Configure your Supabase database connection', '🗄️', 2);
INSERT INTO checklist_steps (section_id, title, description, sort_order) VALUES
    ('a1000000-0000-0000-0000-000000000002', 'Create Supabase Project', 'Create a new project at supabase.com. Choose a strong database password.', 1),
    ('a1000000-0000-0000-0000-000000000002', 'Get Supabase URL', 'Copy the project URL from Settings → API in the Supabase dashboard.', 2),
    ('a1000000-0000-0000-0000-000000000002', 'Get Supabase Anon Key', 'Copy the anon/public key from Settings → API.', 3),
    ('a1000000-0000-0000-0000-000000000002', 'Get Supabase Service Role Key', 'Copy the service_role key from Settings → API. Keep this secret.', 4),
    ('a1000000-0000-0000-0000-000000000002', 'Run Database Schema', 'Run the provided SQL schema in the Supabase SQL Editor.', 5),
    ('a1000000-0000-0000-0000-000000000002', 'Configure RLS Policies', 'Apply Row Level Security policies to protect data.', 6),
    ('a1000000-0000-0000-0000-000000000002', 'Test Database Connection', 'Verify the connection works by inserting and reading a test row.', 7);

-- ── Section 3: Workflows Import (3 steps) ───────────────────────────────────
INSERT INTO checklist_sections (id, checklist_type_id, title, description, icon, sort_order) VALUES
    ('a1000000-0000-0000-0000-000000000003', 'text_ai_config', 'Workflows Import', 'Download and import n8n workflows', '📥', 3);
INSERT INTO checklist_steps (section_id, title, description, sort_order) VALUES
    ('a1000000-0000-0000-0000-000000000003', 'Download n8n Workflow Files', 'Download the workflow JSON files from the resources section.', 1),
    ('a1000000-0000-0000-0000-000000000003', 'Import Workflows into n8n', 'In your n8n instance, import each workflow via the Import button.', 2),
    ('a1000000-0000-0000-0000-000000000003', 'Verify Workflow Import', 'Ensure all imported workflows appear correctly without errors.', 3);

-- ── Section 4: AI Rep Setup (12 steps) ──────────────────────────────────────
INSERT INTO checklist_sections (id, checklist_type_id, title, description, icon, sort_order) VALUES
    ('a1000000-0000-0000-0000-000000000004', 'text_ai_config', 'AI Rep Setup', 'Configure your Text AI Rep workflow in n8n', '⚙️', 4);
INSERT INTO checklist_steps (section_id, title, description, sort_order) VALUES
    ('a1000000-0000-0000-0000-000000000004', 'Open Text Engine Workflow', 'Navigate to the Text Engine workflow in n8n.', 1),
    ('a1000000-0000-0000-0000-000000000004', 'Configure Webhook Trigger', 'Set the webhook URL that GHL will call.', 2),
    ('a1000000-0000-0000-0000-000000000004', 'Set OpenAI Credentials', 'Add your OpenAI API key to the n8n credentials.', 3),
    ('a1000000-0000-0000-0000-000000000004', 'Set Supabase Credentials', 'Add your Supabase URL and key to n8n credentials.', 4),
    ('a1000000-0000-0000-0000-000000000004', 'Configure Knowledge Base Node', 'Point the KB node to your Supabase vector table.', 5),
    ('a1000000-0000-0000-0000-000000000004', 'Configure Response Format', 'Set the output format for the AI response.', 6),
    ('a1000000-0000-0000-0000-000000000004', 'Configure GHL Response Node', 'Set the GHL API call to send the response back.', 7),
    ('a1000000-0000-0000-0000-000000000004', 'Set GHL API Credentials', 'Add GoHighLevel API credentials to n8n.', 8),
    ('a1000000-0000-0000-0000-000000000004', 'Configure Error Handling', 'Set up error notifications and fallback messages.', 9),
    ('a1000000-0000-0000-0000-000000000004', 'Enable Conversation History', 'Configure the conversation memory/history storage.', 10),
    ('a1000000-0000-0000-0000-000000000004', 'Test with Sample Message', 'Send a test message through the workflow and verify the response.', 11),
    ('a1000000-0000-0000-0000-000000000004', 'Activate Workflow', 'Turn on the workflow so it processes live messages.', 12);

-- ── Section 5: Prompts Setup (8 steps) ──────────────────────────────────────
INSERT INTO checklist_sections (id, checklist_type_id, title, description, icon, sort_order) VALUES
    ('a1000000-0000-0000-0000-000000000005', 'text_ai_config', 'Prompts Setup', 'Configure your Text AI agent prompts', '📝', 5);
INSERT INTO checklist_steps (section_id, title, description, sort_order) VALUES
    ('a1000000-0000-0000-0000-000000000005', 'Configure System Prompt (prompt_0)', 'Set the master system prompt that defines the AI personality.', 1),
    ('a1000000-0000-0000-0000-000000000005', 'Configure Greeting Prompt (prompt_1)', 'Set the initial greeting message for new conversations.', 2),
    ('a1000000-0000-0000-0000-000000000005', 'Configure Follow-up Prompt (prompt_2)', 'Set the follow-up prompt for continuing conversations.', 3),
    ('a1000000-0000-0000-0000-000000000005', 'Configure Booking Prompt (prompt_3)', 'Set the prompt for steering conversations toward booking.', 4),
    ('a1000000-0000-0000-0000-000000000005', 'Configure Objection Handling (prompt_4)', 'Set the prompt for handling common objections.', 5),
    ('a1000000-0000-0000-0000-000000000005', 'Configure Closing Prompt (prompt_5)', 'Set the closing and recap prompt.', 6),
    ('a1000000-0000-0000-0000-000000000005', 'Test Prompts with Sample Data', 'Run through a test conversation to verify prompt quality.', 7),
    ('a1000000-0000-0000-0000-000000000005', 'Finalize and Save All Prompts', 'Review all prompts and save the final versions.', 8);

-- ── Section 6: HighLevel Credentials (4 steps) ─────────────────────────────
INSERT INTO checklist_sections (id, checklist_type_id, title, description, icon, sort_order) VALUES
    ('a1000000-0000-0000-0000-000000000006', 'text_ai_config', 'HighLevel Credentials', 'Set up your GoHighLevel API credentials', '🔑', 6);
INSERT INTO checklist_steps (section_id, title, description, sort_order) VALUES
    ('a1000000-0000-0000-0000-000000000006', 'Get GHL API Key', 'Navigate to Settings → API in your GHL sub-account and copy the API key.', 1),
    ('a1000000-0000-0000-0000-000000000006', 'Get GHL Location ID', 'Copy the Location ID from Settings → Business Info.', 2),
    ('a1000000-0000-0000-0000-000000000006', 'Configure Webhook URL in GHL', 'Set the webhook URL in GHL to point to your n8n trigger.', 3),
    ('a1000000-0000-0000-0000-000000000006', 'Test GHL API Connection', 'Verify the API key works by making a test call.', 4);

-- ── Section 7: HighLevel Setup (10 steps) ───────────────────────────────────
INSERT INTO checklist_sections (id, checklist_type_id, title, description, icon, sort_order) VALUES
    ('a1000000-0000-0000-0000-000000000007', 'text_ai_config', 'HighLevel Setup', 'Configure HighLevel workflows and webhooks', '⚡', 7);
INSERT INTO checklist_steps (section_id, title, description, sort_order) VALUES
    ('a1000000-0000-0000-0000-000000000007', 'Create AI Rep Pipeline', 'Create a new pipeline in GHL for AI-managed conversations.', 1),
    ('a1000000-0000-0000-0000-000000000007', 'Configure Pipeline Stages', 'Set up stages: New Lead, AI Engaged, Booking Attempted, Booked, Lost.', 2),
    ('a1000000-0000-0000-0000-000000000007', 'Create Inbound Webhook Workflow', 'Create a GHL workflow triggered on new inbound messages.', 3),
    ('a1000000-0000-0000-0000-000000000007', 'Set Custom Fields', 'Create custom fields: message_1 through message_5, agent_number.', 4),
    ('a1000000-0000-0000-0000-000000000007', 'Configure WhatsApp Channel', 'Connect WhatsApp Business to your GHL sub-account.', 5),
    ('a1000000-0000-0000-0000-000000000007', 'Configure SMS Channel', 'Set up your SMS/Twilio number in GHL.', 6),
    ('a1000000-0000-0000-0000-000000000007', 'Configure Live Chat Widget', 'Install the GHL chat widget on your website.', 7),
    ('a1000000-0000-0000-0000-000000000007', 'Test WhatsApp Integration', 'Send a test WhatsApp message and verify AI response.', 8),
    ('a1000000-0000-0000-0000-000000000007', 'Test SMS Integration', 'Send a test SMS and verify AI response.', 9),
    ('a1000000-0000-0000-0000-000000000007', 'Test Live Chat Integration', 'Send a test Live Chat message and verify AI response.', 10);

-- ── Section 8: Knowledgebase Setup (5 steps) ────────────────────────────────
INSERT INTO checklist_sections (id, checklist_type_id, title, description, icon, sort_order) VALUES
    ('a1000000-0000-0000-0000-000000000008', 'text_ai_config', 'Knowledgebase Setup', 'Set up your knowledge base workflow', '📚', 8);
INSERT INTO checklist_steps (section_id, title, description, sort_order) VALUES
    ('a1000000-0000-0000-0000-000000000008', 'Prepare Knowledge Documents', 'Gather all FAQs, product info, and business details into documents.', 1),
    ('a1000000-0000-0000-0000-000000000008', 'Upload Documents to Supabase', 'Upload your knowledge base documents via the dashboard.', 2),
    ('a1000000-0000-0000-0000-000000000008', 'Generate Vector Embeddings', 'Process the documents to create searchable embeddings.', 3),
    ('a1000000-0000-0000-0000-000000000008', 'Configure RAG Pipeline', 'Set up the retrieval-augmented generation pipeline in n8n.', 4),
    ('a1000000-0000-0000-0000-000000000008', 'Test Knowledge Retrieval', 'Ask questions that require knowledge base lookup and verify accuracy.', 5);

-- ══════════════════════════════════════════════════════════════════════════════
-- DONE. All tables, indexes, RLS policies, and seed data are idempotent.
-- ══════════════════════════════════════════════════════════════════════════════

-- Add widget configuration to checklist steps
ALTER TABLE public.checklist_steps 
  ADD COLUMN IF NOT EXISTS widget_type text,
  ADD COLUMN IF NOT EXISTS widget_title text,
  ADD COLUMN IF NOT EXISTS widget_placeholder text;
