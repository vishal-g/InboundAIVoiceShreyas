-- ══════════════════════════════════════════════════════════════════════════════
-- 15_voice_ai_rep_setup.sql — Voice AI Rep Setup Configuration
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Checklist type: Voice AI Rep Setup
INSERT INTO checklist_types (id, title, description, icon, display_type) VALUES
    ('voice_ai_config', 'Voice AI Rep Setup', 'Configure your Voice AI agent, Twilio, and Retell AI', '🎙️', 'checklist')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    display_type = EXCLUDED.display_type;

-- 2. Sections (IDs starting with a2000000...)
INSERT INTO checklist_sections (id, checklist_type_id, title, description, icon, sort_order) VALUES
    ('a2000000-0000-0000-0000-000000000001', 'voice_ai_config', 'TWILIO SETUP', 'Set up your Twilio account and A2P registration', '📞', 1),
    ('a2000000-0000-0000-0000-000000000002', 'voice_ai_config', 'Accounts Setup', 'Set up Retell AI and API integrations', '👤', 2),
    ('a2000000-0000-0000-0000-000000000003', 'voice_ai_config', 'Inbound AI Rep Setup', 'Configure inbound call handling workflows', '📥', 3),
    ('a2000000-0000-0000-0000-000000000004', 'voice_ai_config', 'Outbound AI Rep Setup', 'Configure outbound dialing and campaigns', '📤', 4),
    ('a2000000-0000-0000-0000-000000000005', 'voice_ai_config', 'Prompts Setup', 'Configure your Voice AI agent prompts', '📝', 5)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- 3. Steps (IDs starting with b2000000...)

-- Section 1: TWILIO SETUP
INSERT INTO checklist_steps (id, section_id, title, description, sort_order) VALUES
    ('b2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'Create Twilio Account', 'Sign up at twilio.com and set up your billing.', 1),
    ('b2000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', 'Understand Phone Numbers', 'Learn how Twilio phone numbers work with Voice AI.', 2),
    ('b2000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000001', 'Buy a Phone Number', 'Purchase a local or toll-free number for your AI rep.', 3),
    ('b2000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000001', 'Connect Twilio to HighLevel', 'Integrate your Twilio account with GoHighLevel CRM.', 4),
    ('b2000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000001', 'A2P Brand Registration', 'Submit your brand registration for A2P 10DLC compliance.', 5),
    ('b2000000-0000-0000-0000-000000000006', 'a2000000-0000-0000-0000-000000000001', 'A2P Campaign Registration', 'Register your calling campaign for compliance.', 6)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- Section 2: Accounts Setup
INSERT INTO checklist_steps (id, section_id, title, description, sort_order) VALUES
    ('b2000000-0000-0000-0000-000000000007', 'a2000000-0000-0000-0000-000000000002', 'Create Retell AI Account', 'Sign up at retellai.com.', 1),
    ('b2000000-0000-0000-0000-000000000008', 'a2000000-0000-0000-0000-000000000002', 'Download Agent Templates', 'Download the pre-configured voice agent templates.', 2),
    ('b2000000-0000-0000-0000-000000000009', 'a2000000-0000-0000-0000-000000000002', 'Import Agents to Retell AI', 'Upload agent templates into your Retell AI account.', 3),
    ('b2000000-0000-0000-0000-000000000010', 'a2000000-0000-0000-0000-000000000002', 'Verify Folder Structure', 'Ensure your agents are organized in the correct folders.', 4),
    ('b2000000-0000-0000-0000-000000000011', 'a2000000-0000-0000-0000-000000000002', 'API Key', 'Obtain your Retell AI API Key from the dashboard.', 5),
    ('b2000000-0000-0000-0000-000000000012', 'a2000000-0000-0000-0000-000000000002', 'Phone Numbers', 'Link your Twilio numbers to Retell AI.', 6)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- Section 3: Inbound AI Rep Setup
INSERT INTO checklist_steps (id, section_id, title, description, sort_order) VALUES
    ('b2000000-0000-0000-0000-000000000013', 'a2000000-0000-0000-0000-000000000003', 'Inbound Agent ID', 'Copy the Inbound Agent ID from Retell AI.', 1),
    ('b2000000-0000-0000-0000-000000000014', 'a2000000-0000-0000-0000-000000000003', 'Get Lead Details Workflow', 'Configure the workflow to fetch lead info before a call.', 2),
    ('b2000000-0000-0000-0000-000000000015', 'a2000000-0000-0000-0000-000000000003', 'Retell Inbound Webhook', 'Set up the primary webhook for inbound Retell calls.', 3),
    ('b2000000-0000-0000-0000-000000000016', 'a2000000-0000-0000-0000-000000000003', 'Call Finished Webhook', 'Configure the post-call webhook for data syncing.', 4),
    ('b2000000-0000-0000-0000-000000000017', 'a2000000-0000-0000-0000-000000000003', 'Retell Webhook Settings', 'Review and finalize webhook headers and authentication.', 5),
    ('b2000000-0000-0000-0000-000000000018', 'a2000000-0000-0000-0000-000000000003', 'Booking Workflow', 'Configure the n8n booking workflow for voice calls.', 6),
    ('b2000000-0000-0000-0000-000000000019', 'a2000000-0000-0000-0000-000000000003', 'Booking Functions', 'Define the functions for scheduling and calendar syncing.', 7),
    ('b2000000-0000-0000-0000-000000000020', 'a2000000-0000-0000-0000-000000000003', 'Publish Agent', 'Make your inbound voice agent live.', 8)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- Section 4: Outbound AI Rep Setup
INSERT INTO checklist_steps (id, section_id, title, description, sort_order) VALUES
    ('b2000000-0000-0000-0000-000000000021', 'a2000000-0000-0000-0000-000000000004', 'Outbound Agent ID', 'Copy the Outbound Agent ID from Retell AI.', 1),
    ('b2000000-0000-0000-0000-000000000022', 'a2000000-0000-0000-0000-000000000004', 'Booking Functions', 'Define outbound-specific booking and scheduling logic.', 2),
    ('b2000000-0000-0000-0000-000000000023', 'a2000000-0000-0000-0000-000000000004', 'Make Outbound Call Workflow', 'Set up the n8n workflow to trigger outbound dialing.', 3),
    ('b2000000-0000-0000-0000-000000000024', 'a2000000-0000-0000-0000-000000000004', 'Outbound Caller Webhook', 'Configure the status callback for outbound calls.', 4),
    ('b2000000-0000-0000-0000-000000000025', 'a2000000-0000-0000-0000-000000000004', 'Activate Workflow', 'Enable the outbound calling system.', 5)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- Section 5: Prompts Setup
INSERT INTO checklist_steps (id, section_id, title, description, sort_order, widget_type, widget_key, widget_title) VALUES
    ('b2000000-0000-0000-0000-000000000026', 'a2000000-0000-0000-0000-000000000005', 'Understand Prompts', 'Learn how voice prompts differ from text-based prompts.', 1, NULL, NULL, NULL),
    ('b2000000-0000-0000-0000-000000000027', 'a2000000-0000-0000-0000-000000000005', 'Inbound Logic', 'Define the conversational logic for incoming calls.', 2, NULL, NULL, NULL),
    ('b2000000-0000-0000-0000-000000000028', 'a2000000-0000-0000-0000-000000000005', 'Outbound Logic', 'Define the conversational logic for outgoing calls.', 3, NULL, NULL, NULL),
    ('b2000000-0000-0000-0000-000000000029', 'a2000000-0000-0000-0000-000000000005', 'Prompt 0', 'Basic system configuration and instruction.', 4, 'prompt', 'prompt_vo_0', 'System Prompt (prompt_vo_0)'),
    ('b2000000-0000-0000-0000-000000000030', 'a2000000-0000-0000-0000-000000000005', 'Prompt 1', 'Greeting and initial engagement message.', 5, 'prompt', 'prompt_vo_1', 'Greeting Prompt (prompt_vo_1)'),
    ('b2000000-0000-0000-0000-000000000031', 'a2000000-0000-0000-0000-000000000005', 'Prompt 2', 'Information gathering and lead qualification.', 6, 'prompt', 'prompt_vo_2', 'Qualification Prompt (prompt_vo_2)'),
    ('b2000000-0000-0000-0000-000000000032', 'a2000000-0000-0000-0000-000000000005', 'Prompt 5', 'Closing and appointment confirmation.', 7, 'prompt', 'prompt_vo_5', 'Closing Prompt (prompt_vo_5)')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    widget_type = EXCLUDED.widget_type,
    widget_key = EXCLUDED.widget_key,
    widget_title = EXCLUDED.widget_title;

-- 4. Navigation item (Using a safe insert to avoid duplicate error)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM navigation_items WHERE label = 'Voice AI Rep' AND href = '/dashboard/{subAccountId}/voice-ai/config') THEN
        INSERT INTO navigation_items (label, href, icon, sort_order, view_mode, required_role) VALUES
            ('Voice AI Rep', '/dashboard/{subAccountId}/voice-ai/config', 'Mic', 6, 'sub_account', 'all');
    ELSE
        UPDATE navigation_items 
        SET icon = 'Mic', sort_order = 6, view_mode = 'sub_account'
        WHERE label = 'Voice AI Rep' AND href = '/dashboard/{subAccountId}/voice-ai/config';
    END IF;
END $$;

-- Shift existing items down
UPDATE navigation_items SET sort_order = 7 WHERE label = 'AI Settings';
UPDATE navigation_items SET sort_order = 8 WHERE label = 'Call Logs';
UPDATE navigation_items SET sort_order = 9 WHERE label = 'Manage Menu';
