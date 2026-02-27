-- 04_seed_test_call_logs.sql
-- Inserts sample call_logs for the demo sub-account so the dashboard has data to display.
-- Run after 02_seed_test_users.sql has been applied.

DO $$
DECLARE
    demo_sub_account_id UUID;
BEGIN
    -- Find the demo sub-account
    SELECT id INTO demo_sub_account_id FROM public.sub_accounts WHERE name = 'Demo Roofing Sub-Account' LIMIT 1;

    IF demo_sub_account_id IS NULL THEN
        RAISE NOTICE 'Demo sub-account not found. Run 02_seed_test_users.sql first.';
        RETURN;
    END IF;

    -- Insert sample call logs
    INSERT INTO public.call_logs (phone_number, duration_seconds, transcript, summary, sub_account_id, caller_name, sentiment, was_booked, created_at)
    VALUES
    (
        '+919876543210', 185,
        'Agent: Namaste! This is Aryan from RapidX AI. How can I help you today?' || chr(10) ||
        'Caller: Hi, I run a roofing company in Delhi. We get a lot of inbound calls and can''t handle them all.' || chr(10) ||
        'Agent: That''s exactly what we solve! Our AI voice agents can handle inbound calls 24/7, qualify leads, and book appointments automatically.' || chr(10) ||
        'Caller: That sounds great. How much does it cost?' || chr(10) ||
        'Agent: Our plans start at ₹15,000/month. Would you like to schedule a quick demo to see it in action?' || chr(10) ||
        'Caller: Sure, let''s do Thursday at 3pm.' || chr(10) ||
        'Agent: Perfect! I''ve booked a demo for Thursday at 3 PM. You''ll receive a calendar invite shortly.',
        'Confirmed — Demo booked for Thursday 3PM. Roofing company owner from Delhi interested in AI voice agents for lead qualification.',
        demo_sub_account_id,
        'Rahul Sharma',
        'positive',
        true,
        now() - interval '2 hours'
    ),
    (
        '+919123456789', 92,
        'Agent: Hello! This is Aryan from RapidX AI. May I ask what kind of business you run?' || chr(10) ||
        'Caller: I have a dental clinic chain. We need help with appointment reminders.' || chr(10) ||
        'Agent: We can definitely help — our AI handles appointment reminders, follow-ups, and even rebooking missed appointments.' || chr(10) ||
        'Caller: Interesting. Can you send me more details on email?' || chr(10) ||
        'Agent: Of course! What''s your email address?' || chr(10) ||
        'Caller: dr.mehta@smileclinics.in' || chr(10) ||
        'Agent: Got it — I''ll send over a detailed proposal. Have a great day!',
        'Lead captured — Dr. Mehta, dental clinic chain. Requested email follow-up at dr.mehta@smileclinics.in.',
        demo_sub_account_id,
        'Dr. Mehta',
        'neutral',
        false,
        now() - interval '5 hours'
    ),
    (
        '+918765432109', 45,
        'Agent: Namaste! This is Aryan from RapidX AI, we help businesses automate with AI. How can I help?' || chr(10) ||
        'Caller: Sorry, wrong number.' || chr(10) ||
        'Agent: No worries at all! Have a great day.',
        'Wrong number — call ended quickly.',
        demo_sub_account_id,
        NULL,
        'neutral',
        false,
        now() - interval '1 day'
    ),
    (
        '+917654321098', 210,
        'Agent: Hello! This is Aryan from RapidX AI. How are you doing today?' || chr(10) ||
        'Caller: Hi Aryan, my name is Priya. I saw your ad about WhatsApp automation.' || chr(10) ||
        'Agent: Great to hear, Priya! Yes, we build AI-powered WhatsApp chatbots that handle customer queries, send bulk campaigns, and qualify leads automatically.' || chr(10) ||
        'Caller: We run an e-commerce store and get hundreds of WhatsApp messages daily. Can your AI handle order status queries?' || chr(10) ||
        'Agent: Absolutely! We integrate directly with your order management system. The AI can look up order status, handle returns, and escalate to a human when needed.' || chr(10) ||
        'Caller: That would save us so much time. Let''s set up a call with my tech team.' || chr(10) ||
        'Agent: Perfect! When works for your team? How about tomorrow at 11 AM?' || chr(10) ||
        'Caller: Tomorrow at 11 works. My email is priya@shopease.in.' || chr(10) ||
        'Agent: Booked! You''ll get a calendar invite at priya@shopease.in. Looking forward to it!',
        'Confirmed — Technical demo booked for tomorrow 11AM. Priya from ShopEase e-commerce, interested in WhatsApp automation for order status + customer support.',
        demo_sub_account_id,
        'Priya Nair',
        'positive',
        true,
        now() - interval '30 minutes'
    );

    RAISE NOTICE 'Successfully inserted 4 test call logs for sub_account %', demo_sub_account_id;
END $$;
