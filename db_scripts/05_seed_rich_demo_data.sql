-- 05_seed_rich_demo_data.sql
-- Adds a second agency, additional sub-accounts, and realistic call logs
-- to showcase all dashboard features. Run AFTER 02_seed_test_users.sql.

DO $$
DECLARE
    existing_agency_id UUID;
    second_agency_id UUID := gen_random_uuid();
    dental_sub_id UUID := gen_random_uuid();
    ecom_sub_id UUID := gen_random_uuid();
    roofing_sub_id UUID;
BEGIN
    -- Find the existing Demo Agency
    SELECT id INTO existing_agency_id FROM public.agencies WHERE name = 'Demo Agency LLC' LIMIT 1;
    IF existing_agency_id IS NULL THEN
        RAISE NOTICE 'Run 02_seed_test_users.sql first.';
        RETURN;
    END IF;

    -- Find the existing Roofing sub-account
    SELECT id INTO roofing_sub_id FROM public.sub_accounts WHERE name = 'Demo Roofing Sub-Account' LIMIT 1;

    -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    -- 1. Create a SECOND agency
    -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    IF NOT EXISTS (SELECT 1 FROM public.agencies WHERE name = 'StarBridge Digital') THEN
        INSERT INTO public.agencies (id, name, is_active) VALUES (second_agency_id, 'StarBridge Digital', true);
    ELSE
        SELECT id INTO second_agency_id FROM public.agencies WHERE name = 'StarBridge Digital';
    END IF;

    -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    -- 2. Add sub-accounts under BOTH agencies
    -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    -- Dental sub-account under Demo Agency LLC
    IF NOT EXISTS (SELECT 1 FROM public.sub_accounts WHERE name = 'Smile Clinics') THEN
        INSERT INTO public.sub_accounts (id, agency_id, name, is_active)
        VALUES (dental_sub_id, existing_agency_id, 'Smile Clinics', true);

        INSERT INTO public.sub_account_settings (sub_account_id, assigned_number, first_line, agent_instructions, llm_model, tts_voice)
        VALUES (dental_sub_id, '+919000100010', 'Hello! This is Smile Clinics AI assistant. How can I help?', 'You are a helpful dental clinic assistant. Help patients book appointments, answer FAQ about dental services, and collect their contact info.', 'openai:gpt-4o-mini', 'kavya');
    END IF;

    -- E-commerce sub-account under StarBridge Digital
    IF NOT EXISTS (SELECT 1 FROM public.sub_accounts WHERE name = 'ShopEase India') THEN
        INSERT INTO public.sub_accounts (id, agency_id, name, is_active)
        VALUES (ecom_sub_id, second_agency_id, 'ShopEase India', true);

        INSERT INTO public.sub_account_settings (sub_account_id, assigned_number, first_line, agent_instructions, llm_model, tts_voice)
        VALUES (ecom_sub_id, '+919000200020', 'Hi! Welcome to ShopEase. How can I assist you today?', 'You are a friendly e-commerce support agent for ShopEase India. Help with order status, returns, and product questions.', 'openai:gpt-4o', 'alloy');
    END IF;

    -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    -- 3. Seed call logs for MULTIPLE sub-accounts
    -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    -- Delete any existing test call logs to avoid duplicates
    DELETE FROM public.call_logs WHERE phone_number IN ('+919876543210', '+919123456789', '+918765432109', '+917654321098', '+919555111222', '+919555333444', '+919555555666', '+919555777888');

    -- Roofing Sub-Account calls
    IF roofing_sub_id IS NOT NULL THEN
        INSERT INTO public.call_logs (phone_number, duration_seconds, transcript, summary, sub_account_id, caller_name, sentiment, was_booked, created_at) VALUES
        ('+919876543210', 185,
        'Agent: Namaste! This is Aryan from RapidX AI. How can I help you today?' || chr(10) || 'Caller: Hi, I run a roofing company in Delhi. We get a lot of inbound calls.' || chr(10) || 'Agent: Our AI voice agents can handle inbound calls 24/7 and book appointments.' || chr(10) || 'Caller: How much does it cost?' || chr(10) || 'Agent: Plans start at 15,000/month. Want to schedule a demo?' || chr(10) || 'Caller: Sure, Thursday at 3pm.' || chr(10) || 'Agent: Booked for Thursday 3 PM!',
        'Demo booked — Thursday 3PM. Roofing company owner from Delhi, interested in AI voice for lead qualification.',
        roofing_sub_id, 'Rahul Sharma', 'positive', true, now() - interval '2 hours'),

        ('+919123456789', 92,
        'Agent: Hello! May I ask what kind of business you run?' || chr(10) || 'Caller: Dental clinic chain. Need appointment reminders.' || chr(10) || 'Agent: We handle reminders, follow-ups, and rebooking.' || chr(10) || 'Caller: Send details to dr.mehta@smileclinics.in' || chr(10) || 'Agent: Will do. Have a great day!',
        'Lead captured — Dr. Mehta, dental clinic. Email follow-up at dr.mehta@smileclinics.in.',
        roofing_sub_id, 'Dr. Mehta', 'neutral', false, now() - interval '5 hours'),

        ('+918765432109', 45,
        'Agent: Namaste! This is Aryan from RapidX AI.' || chr(10) || 'Caller: Sorry, wrong number.' || chr(10) || 'Agent: No worries! Have a great day.',
        'Wrong number — call ended quickly.',
        roofing_sub_id, NULL, 'neutral', false, now() - interval '1 day'),

        ('+917654321098', 210,
        'Agent: Hello! How are you doing today?' || chr(10) || 'Caller: Hi, I am Priya. Saw your WhatsApp automation ad.' || chr(10) || 'Agent: We build AI WhatsApp chatbots for order queries and campaigns.' || chr(10) || 'Caller: We get hundreds of messages daily. Can it handle order status?' || chr(10) || 'Agent: Absolutely! We integrate with your order system.' || chr(10) || 'Caller: Let''s set up a call — tomorrow 11 AM. priya@shopease.in' || chr(10) || 'Agent: Booked! Calendar invite coming to priya@shopease.in.',
        'Tech demo booked — tomorrow 11AM. Priya from ShopEase, WhatsApp automation for order support.',
        roofing_sub_id, 'Priya Nair', 'positive', true, now() - interval '30 minutes');
    END IF;

    -- Dental Sub-Account calls
    INSERT INTO public.call_logs (phone_number, duration_seconds, transcript, summary, sub_account_id, caller_name, sentiment, was_booked, created_at) VALUES
    ('+919555111222', 120,
    'Agent: Hello! This is Smile Clinics AI. How can I help?' || chr(10) || 'Caller: I need to book a teeth cleaning appointment.' || chr(10) || 'Agent: We have slots available this week. Does Thursday 10 AM work?' || chr(10) || 'Caller: Yes, perfect. My name is Ananya.' || chr(10) || 'Agent: Great Ananya! Your email please?' || chr(10) || 'Caller: ananya@gmail.com' || chr(10) || 'Agent: Booked for Thursday 10 AM!',
    'Appointment booked — Thursday 10AM, teeth cleaning for Ananya.',
    dental_sub_id, 'Ananya Gupta', 'positive', true, now() - interval '3 hours'),

    ('+919555333444', 65,
    'Agent: Hello! Smile Clinics here. How can I assist?' || chr(10) || 'Caller: What are your prices for dental implants?' || chr(10) || 'Agent: Implants range from 25,000 to 50,000 depending on type. Would you like a free consultation?' || chr(10) || 'Caller: I''ll think about it and call back.',
    'Pricing inquiry — dental implants. Caller will call back.',
    dental_sub_id, NULL, 'neutral', false, now() - interval '6 hours');

    -- E-commerce Sub-Account calls  
    INSERT INTO public.call_logs (phone_number, duration_seconds, transcript, summary, sub_account_id, caller_name, sentiment, was_booked, created_at) VALUES
    ('+919555555666', 95,
    'Agent: Hi! Welcome to ShopEase. How can I help?' || chr(10) || 'Caller: Where is my order #SE-78234?' || chr(10) || 'Agent: Let me check... Order #SE-78234 was shipped yesterday and is expected to arrive by Friday.' || chr(10) || 'Caller: Great, thanks!' || chr(10) || 'Agent: You''re welcome! Anything else?' || chr(10) || 'Caller: No, that''s all.',
    'Order status query — #SE-78234, shipped yesterday, arriving Friday. Resolved.',
    ecom_sub_id, 'Vikram Patel', 'positive', false, now() - interval '1 hour'),

    ('+919555777888', 150,
    'Agent: Hi! ShopEase support here. How can I assist?' || chr(10) || 'Caller: I want to return a product. The size doesn''t fit.' || chr(10) || 'Agent: I can help with that. Which order and item?' || chr(10) || 'Caller: Order SE-75100, the blue kurta.' || chr(10) || 'Agent: I''ve initiated a return for order SE-75100. You''ll receive a pickup schedule via SMS within 24 hours.' || chr(10) || 'Caller: Thank you so much!',
    'Return initiated — Order SE-75100, blue kurta. Pickup to be scheduled in 24h.',
    ecom_sub_id, 'Sneha Reddy', 'neutral', false, now() - interval '4 hours');

    RAISE NOTICE 'Rich demo data seeded successfully!';
END $$;
