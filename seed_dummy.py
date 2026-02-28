import os
import json
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)

multi_step_config = {
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
}

quiz_config = {
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
}

def seed():
    print("Finding 'Create OpenAI Account' step...")
    res = supabase.table("checklist_steps").select("id").eq("title", "Create OpenAI Account").limit(1).execute()
    
    if not res.data:
        print("Step not found!")
        return
    
    step_id = res.data[0]["id"]
    print(f"Found Step ID: {step_id}. Updating with dummy content...")
    
    update_res = supabase.table("checklist_steps").update({
        "multi_step_config": multi_step_config,
        "quiz_config": quiz_config
    }).eq("id", step_id).execute()
    
    if update_res.data:
        print("✅ Demo content seeded successfully!")
    else:
        print("❌ Failed to seed content. Check if columns exist.")

if __name__ == "__main__":
    seed()
