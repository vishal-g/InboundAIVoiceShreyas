const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const multi_step_config = {
    "slides": [
        {
            "title": "Welcome to OpenAI Setup",
            "content": "<h3>Ready to get started?</h3><p>OpenAI is the brain of your AI Rep. In this guide, we'll set up your account and billing so you can generate your first API key.</p><div class='callout callout-info'><strong>Note:</strong> You will need a credit card for the billing section.</div>",
        },
        {
            "title": "Adding Billing Credits",
            "content": "<h3>Crucial Step: Credits</h3><p>OpenAI API is pay-as-you-go. Without at least $5 in credits, your calls will fail immediately.</p><ul><li>Go to Settings -> Billing</li><li>Add a payment method</li><li>Purchase $5-$10 of initial credits</li></ul><div class='callout callout-warning'><strong>Warning:</strong> Auto-recharge is recommended to prevent service interruptions.</div>"
        },
        {
            "title": "Generating API Keys",
            "content": "<h3>The Final Step</h3><p>Navigate to <b>API Keys</b> dashboard and create a new secret key.</p><p>Name it something descriptive like 'GHL AI Rep - Live'.</p><div class='callout callout-success'><strong>Success:</strong> Once you have the key, you are ready to proceed to the next step!</div>"
        }
    ]
};

const quiz_config = {
    "title": "OpenAI Knowledge Check",
    "threshold": 100,
    "questions": [
        {
            "id": "q1",
            "text": "What happens if you have $0 in your OpenAI credits?",
            "options": ["The AI works slower", "The AI stops responding immediately", "OpenAI sends you a bill later"],
            "correct_index": 1
        },
        {
            "id": "q2",
            "text": "Should you share your API Secret Key in public places?",
            "options": ["Yes, it is safe", "No, keep it secret", "Only if it is a test key"],
            "correct_index": 1
        }
    ]
};

async function seed() {
    try {
        console.log("--- Seeding Test Content ---");

        // 1. Create Checklist Type
        const { error: typeErr } = await supabase.from('checklist_types').upsert({
            id: 'text_ai_config',
            title: 'Text AI Rep Setup Progress',
            description: 'Complete all phases to enable Text AI reps',
            icon: '💬'
        });
        if (typeErr) throw typeErr;
        console.log("✓ Checklist type ready");

        // 2. Create Section
        const sectionId = 'a1000000-0000-0000-0000-000000000001';
        const { error: sectionErr } = await supabase.from('checklist_sections').upsert({
            id: sectionId,
            checklist_type_id: 'text_ai_config',
            title: 'Accounts Setup',
            description: 'Create accounts for Supabase, OpenAI, and more',
            icon: '👤',
            sort_order: 1
        });
        if (sectionErr) throw sectionErr;
        console.log("✓ Section ready");

        // 3. Create Step with Multi-step Content
        const { data: step, error: stepErr } = await supabase.from('checklist_steps').upsert({
            section_id: sectionId,
            title: 'Create OpenAI Account (with Demo Slides)',
            description: 'Set up your OpenAI account and billing.',
            sort_order: 1,
            multi_step_config: multi_step_config,
            quiz_config: quiz_config
        }).select().single();
        if (stepErr) throw stepErr;
        console.log(`✓ Step created with ID: ${step.id}`);

        console.log("\n✅ Demo content seeded successfully!");
        console.log("You can now find the step 'Create OpenAI Account (with Demo Slides)' in the 'Accounts Setup' section.");

    } catch (e) {
        console.error("❌ Seed failed:", e);
        console.log("\nTIP: Make sure you ran the SQL migrations first to add columns multi_step_config and quiz_config.");
    }
}

seed();
