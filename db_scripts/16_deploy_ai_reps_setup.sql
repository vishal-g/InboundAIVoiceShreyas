-- ══════════════════════════════════════════════════════════════════════════════
-- 16_deploy_ai_reps_setup.sql — Deploy AI Reps Setup Configuration
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Checklist type: Deploy AI Reps
INSERT INTO checklist_types (id, title, description, icon, display_type) VALUES
    ('deploy_ai_reps', 'Deploy AI Reps', 'Guide to deploying your AI reps across multi-channel environments', '🚀', 'checklist')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    display_type = EXCLUDED.display_type;

-- 2. Sections (IDs starting with a3000000...)
INSERT INTO checklist_sections (id, checklist_type_id, title, description, icon, sort_order) VALUES
    ('a3000000-0000-0000-0000-000000000001', 'deploy_ai_reps', 'Live Chat Setup', 'Set up and deploy your AI Chat Widget', '💬', 1),
    ('a3000000-0000-0000-0000-000000000002', 'deploy_ai_reps', 'WhatsApp Setup', 'Connect and test WhatsApp integration', '🟢', 2),
    ('a3000000-0000-0000-0000-000000000003', 'deploy_ai_reps', 'SMS Setup', 'Configure A2P and SMS triggers', '📱', 3),
    ('a3000000-0000-0000-0000-000000000004', 'deploy_ai_reps', 'Meta/Instagram Setup', 'Connect Meta channels for DM automation', '📸', 4),
    ('a3000000-0000-0000-0000-000000000005', 'deploy_ai_reps', 'Inbound Voice AI Testing', 'Verify end-to-end voice inbound flows', '🎧', 5),
    ('a3000000-0000-0000-0000-000000000006', 'deploy_ai_reps', 'Demo Setup', 'Setup pre-built demo templates and engagement flows', '🧪', 6)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- 3. Steps (IDs starting with b3000000...)

-- Section 1: Live Chat Setup
INSERT INTO checklist_steps (id, section_id, title, description, sort_order) VALUES
    ('b3000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'Navigate to Chat Widget', 'Go to the Chat Widget section in your GHL settings.', 1),
    ('b3000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000001', 'Create Live Chat Widget', 'Create a new widget for your specific sub-account.', 2),
    ('b3000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000001', 'Configure Widget Style', 'Customize colors, branding, and placement.', 3),
    ('b3000000-0000-0000-0000-000000000004', 'a3000000-0000-0000-0000-000000000001', 'Configure Chat Window', 'Set up the greeting and online/offline behavior.', 4),
    ('b3000000-0000-0000-0000-000000000005', 'a3000000-0000-0000-0000-000000000001', 'Configure Contact Form', 'Define which fields to collect from the lead.', 5),
    ('b3000000-0000-0000-0000-000000000006', 'a3000000-0000-0000-0000-000000000001', 'Configure Messaging', 'Enable live-agent fallback and auto-replies.', 6),
    ('b3000000-0000-0000-0000-000000000007', 'a3000000-0000-0000-0000-000000000001', 'Save Widget', 'Save your configuration and verify settings.', 7),
    ('b3000000-0000-0000-0000-000000000008', 'a3000000-0000-0000-0000-000000000001', 'Get Code & Deploy', 'Copy the installation snippet and embed it on your site.', 8)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- Section 2: WhatsApp Setup
INSERT INTO checklist_steps (id, section_id, title, description, sort_order) VALUES
    ('b3000000-0000-0000-0000-000000000009', 'a3000000-0000-0000-0000-000000000002', 'Understand the Logic', 'Learn how the WhatsApp AI trigger works in GHL.', 1),
    ('b3000000-0000-0000-0000-000000000010', 'a3000000-0000-0000-0000-000000000002', 'Subscribe to WhatsApp', 'Enable the WhatsApp Business API subscription.', 2),
    ('b3000000-0000-0000-0000-000000000011', 'a3000000-0000-0000-0000-000000000002', 'Get a Phone Number', 'Select or port a number for WhatsApp usage.', 3),
    ('b3000000-0000-0000-0000-000000000012', 'a3000000-0000-0000-0000-000000000002', 'Add Number to WhatsApp', 'Register the number with Meta/WhatsApp Business.', 4),
    ('b3000000-0000-0000-0000-000000000013', 'a3000000-0000-0000-0000-000000000002', 'Configure Phone Number', 'Set up the display name and profile details.', 5),
    ('b3000000-0000-0000-0000-000000000014', 'a3000000-0000-0000-0000-000000000002', 'Verify Connection Status', 'Ensure the number shows as "Connected" in GHL.', 6),
    ('b3000000-0000-0000-0000-000000000015', 'a3000000-0000-0000-0000-000000000002', 'Enable WhatsApp Trigger', 'Activate the AI automation for incoming WhatsApp messages.', 7),
    ('b3000000-0000-0000-0000-000000000016', 'a3000000-0000-0000-0000-000000000002', 'Test WhatsApp', 'Send a test message and verify the AI response.', 8)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- Section 3: SMS Setup
INSERT INTO checklist_steps (id, section_id, title, description, sort_order) VALUES
    ('b3000000-0000-0000-0000-000000000017', 'a3000000-0000-0000-0000-000000000003', 'Understand A2P Verification', 'Learn about the required 10DLC registration process.', 1),
    ('b3000000-0000-0000-0000-000000000018', 'a3000000-0000-0000-0000-000000000003', 'Phone Number Options', 'Choose between traditional SMS numbers or toll-free.', 2),
    ('b3000000-0000-0000-0000-000000000019', 'a3000000-0000-0000-0000-000000000003', 'Verify A2P Complete', 'Ensure your brand and campaign are approved.', 3),
    ('b3000000-0000-0000-0000-000000000020', 'a3000000-0000-0000-0000-000000000003', 'Enable SMS Trigger', 'Activate the AI automation for incoming SMS messages.', 4),
    ('b3000000-0000-0000-0000-000000000021', 'a3000000-0000-0000-0000-000000000003', 'Test SMS', 'Send a test SMS and verify the AI response.', 5)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- Section 4: Meta/Instagram Setup
INSERT INTO checklist_steps (id, section_id, title, description, sort_order) VALUES
    ('b3000000-0000-0000-0000-000000000022', 'a3000000-0000-0000-0000-000000000004', 'Understand Meta Integration', 'Learn how AI handles Facebook and Instagram DMs.', 1),
    ('b3000000-0000-0000-0000-000000000023', 'a3000000-0000-0000-0000-000000000004', 'Connect Facebook/Instagram', 'Link your Meta Business Assets to GHL.', 2),
    ('b3000000-0000-0000-0000-000000000024', 'a3000000-0000-0000-0000-000000000004', 'Login to Facebook', 'Authenticate your business account.', 3),
    ('b3000000-0000-0000-0000-000000000025', 'a3000000-0000-0000-0000-000000000004', 'Select Pages', 'Choose the specific FB pages and IG accounts to automate.', 4),
    ('b3000000-0000-0000-0000-000000000026', 'a3000000-0000-0000-0000-000000000004', 'Enable Workflow Triggers', 'Activate the AI automation for Meta DMs.', 5),
    ('b3000000-0000-0000-0000-000000000027', 'a3000000-0000-0000-0000-000000000004', 'Test Meta DMs', 'Send a test DM and verify the AI response.', 6)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- Section 5: Inbound Voice AI Testing
INSERT INTO checklist_steps (id, section_id, title, description, sort_order) VALUES
    ('b3000000-0000-0000-0000-000000000028', 'a3000000-0000-0000-0000-000000000005', 'Complete Text AI Rep Setup', 'Ensure the core Text AI configuration is finished.', 1),
    ('b3000000-0000-0000-0000-000000000029', 'a3000000-0000-0000-0000-000000000005', 'Complete Voice AI Rep Setup', 'Ensure the core Voice AI configuration is finished.', 2),
    ('b3000000-0000-0000-0000-000000000030', 'a3000000-0000-0000-0000-000000000005', 'Verify Retell Configuration', 'Check Retell agent settings and webhook connectivity.', 3),
    ('b3000000-0000-0000-0000-000000000031', 'a3000000-0000-0000-0000-000000000005', 'Your AI Rep Phone Number', 'Confirm your primary inbound voice number.', 4),
    ('b3000000-0000-0000-0000-000000000032', 'a3000000-0000-0000-0000-000000000005', 'Test Inbound Call', 'Place a test call and verify conversational performance.', 5)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- Section 6: Demo Setup
INSERT INTO checklist_steps (id, section_id, title, description, sort_order) VALUES
    ('b3000000-0000-0000-0000-000000000033', 'a3000000-0000-0000-0000-000000000006', 'Complete Text AI Rep Setup', 'Required for multi-channel demo functionality.', 1),
    ('b3000000-0000-0000-0000-000000000034', 'a3000000-0000-0000-0000-000000000006', 'Complete Voice AI Rep Setup', 'Required for voice-based engagement in demo.', 2),
    ('b3000000-0000-0000-0000-000000000035', 'a3000000-0000-0000-0000-000000000006', 'Find AI Demo Template', 'Locate the pre-built funnel template in GHL.', 3),
    ('b3000000-0000-0000-0000-000000000036', 'a3000000-0000-0000-0000-000000000006', 'Review Funnel Steps', 'Sanity check the opt-in and confirmation pages.', 4),
    ('b3000000-0000-0000-0000-000000000037', 'a3000000-0000-0000-0000-000000000006', 'Edit Opt-In Page', 'Customize branding and copy on the landing page.', 5),
    ('b3000000-0000-0000-0000-000000000038', 'a3000000-0000-0000-0000-000000000006', 'Edit Confirmation Page', 'Customize branding on the post-submission page.', 6),
    ('b3000000-0000-0000-0000-000000000039', 'a3000000-0000-0000-0000-000000000006', 'Configure Demo Form', 'Set up the form to trigger the engagement workflow.', 7),
    ('b3000000-0000-0000-0000-000000000040', 'a3000000-0000-0000-0000-000000000006', 'Set Up Engagement Workflow', 'Configure the workflow that handles incoming demo leads.', 8),
    ('b3000000-0000-0000-0000-000000000041', 'a3000000-0000-0000-0000-000000000006', 'Set Agent Number', 'Specify the outgoing number for the demo rep.', 9),
    ('b3000000-0000-0000-0000-000000000042', 'a3000000-0000-0000-0000-000000000006', 'Configure Engagement SMS', 'Set up the initial SMS follow-up message.', 10),
    ('b3000000-0000-0000-0000-000000000043', 'a3000000-0000-0000-0000-000000000006', 'Configure Outbound Call', 'Set up the automated outbound call trigger.', 11),
    ('b3000000-0000-0000-0000-000000000044', 'a3000000-0000-0000-0000-000000000006', 'Publish Workflow', 'Make the demo automation live.', 12),
    ('b3000000-0000-0000-0000-000000000045', 'a3000000-0000-0000-0000-000000000006', 'Test Demo', 'Submit the form and verify the end-to-end flow.', 13)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- 4. Navigation item (Using a safe insert to avoid duplicate error)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM navigation_items WHERE label = 'Deploy AI Reps' AND href = '/dashboard/{subAccountId}/deploy-ai') THEN
        INSERT INTO navigation_items (label, href, icon, sort_order, view_mode, required_role) VALUES
            ('Deploy AI Reps', '/dashboard/{subAccountId}/deploy-ai', 'Rocket', 7, 'sub_account', 'all');
    ELSE
        UPDATE navigation_items 
        SET icon = 'Rocket', sort_order = 7, view_mode = 'sub_account'
        WHERE label = 'Deploy AI Reps' AND href = '/dashboard/{subAccountId}/deploy-ai';
    END IF;
END $$;

-- Ensure subsequent items are shifted correctly
UPDATE navigation_items SET sort_order = 8 WHERE label = 'AI Settings';
UPDATE navigation_items SET sort_order = 9 WHERE label = 'Call Logs';
UPDATE navigation_items SET sort_order = 10 WHERE label = 'Manage Menu';
