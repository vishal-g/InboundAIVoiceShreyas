# 🚀 Multi-Tenant Omnichannel AI Automation Platform — Architecture Strategy

This document outlines the strategic roadmap to evolve the current standalone voice agent into a comprehensive, multi-tenant B2B **Omnichannel AI Platform**. 

**Core Identity of the Platform**:
1. **The Native Voice AI & Dashboard**: The platform will continue to feature the powerful, low-latency LiveKit Voice AI Reps and the modular Next.js dashboard as its flagship capabilities, now running in a fully multi-tenant manner (Supabase).
2. **The Aggregated Text Engine**: The platform will absorb the current n8n workflows (WhatsApp, SMS, CRM syncing) directly into the Python backend via LangGraph and background tasks. This creates a single, native "Agentic Brain" for *all* interactions, voice and text.

---

## 🏗️ 1. Multi-Tenant Foundation (The "One Codebase" Rule)

To keep your overhead near zero, you must avoid deploying separate instances/codebases for each client. **Everyone runs on the exact same code.**

### How it works alongside GHL:
1. **GHL as the Source of Truth**: GoHighLevel (GHL) remains your primary CRM for lead management, pipelines, and basic standard automations.
2. **The 4-Tier Database (Platform -> Agency -> Sub-Account)**: We map the exact same structure that GHL uses, plus your overarching "Platform" level.
    * `agencies`: ID, Name, Subscription Status. (You can have partner agencies on your system).
    * `sub_accounts`: ID, Agency_ID, GHL Sub-Account ID, Name.
    * `users`: ID, Role (`platform_admin`, `agency_admin`, `sub_account_user`), Agency_ID, Sub_Account_ID.
    * `sub_account_settings`: API keys, LLM preferences, Twilio/SIP phone numbers assigned to them.
3. **Dynamic Routing**: When a call or SMS comes in, the system looks up the destination phone number in the DB to immediately identify the `sub_account_id` and loads their specific settings, prompts, and knowledge base dynamically.
3. **Feature Flags**: Every client has a JSON chunk in the DB like `{"sms_followup": true, "appointment_reminders": false}`. Your code just checks this flag to enable/disable features without touching code.

---

## 🧠 2. The Agentic Layer (LangGraph replacing n8n)

Since your standard workflows (emails, basic pipeline moves) live in GHL, n8n is currently acting as your "Agentic Layer" for complex, LLM-driven reasoning. Replacing n8n with LangGraph (Python code natively embedded in your app) is the right move for version control, debugging, and scaling across clients without hitting n8n workflow limits.

**Why LangGraph for the Agentic Layer?**
LangGraph is built exactly for this. It models stateful, multi-actor applications as graphs.

1. **State Persistence**: LangGraph natively saves "checkpoints" to a database (we can map this to Supabase). This means a workflow can sleep for 3 days (e.g., waiting for an appointment), wake up, and continue exactly where it left off.
2. **Visual Debugging**: **LangGraph Studio** gives you a visual UI to see every step the workflow took, replay errors, and see what the LLM thought at any given node. It gives you the "n8n visual feel" but with pure Python code.
3. **The Omnichannel Workflows (Migrated from n8n)**:
    * **Text Engine / 1:1 n8n Mapping**: A LangGraph graph that acts as a strict 1-to-1 drop-in replacement for the n8n `Text_Engine.json`. It receives the exact same webhooks from GHL (WhatsApp, SMS, LiveChat, FB, Insta), drafts a context-aware reply using the Knowledgebase, and pushes it back to the exact GHL custom fields (`message_1`, `agent_number`) to send to the user without breaking existing automations.
    * **Lead CRM Integration (`Get_Lead_Details.json`)**: Code-native integration with the GHL CRM to dynamically fetch client/lead context for use by both the text engine and the active voice reps.
    * **Outbound Dispatch Engine (`Make_Outbound_Call.json`)**: A background service that receives GHL webhook triggers and automatically spins up a native LiveKit outbound dispatch routine, pitching leads intelligently.
    * **Note on Knowledgebase**: The `Update_Knowledgebase.json` workflow will *not* be migrated 1:1. Instead, it will be replaced by a native SaaS feature where clients upload PDFs in the dashboard, and the platform chunks/embeds them directly into a Supabase vector database.

---

### The Tech Stack (Dashboard)
- **Backend:** FastAPI (`ui_server.py` becomes `api_server.py`). It serves purely JSON REST APIs.
- **Frontend Framework:** **Next.js (React)** with the App Router.
- **UI Components:** **Tailwind CSS + Shadcn UI** (for a premium, flexible, and accessible interface).
- **Authentication:** Supabase Auth.
- **Charts/Analytics:** **Recharts** (React charting library) driven by Supabase aggregate SQL views.

### Flexibility & Modular Navigation
To support the extensive feature set (Analytics, AI Configs, Prompt Management, Knowledgebase, Webinar Setup, DB Activation), the frontend must be deeply modular.
- **Dynamic Routing:** We will use Next.js dynamic routes (`/dashboard/[sub_account_id]/[section]`).
- **Sidebar Configuration:** The sidebar navigation menu will be driven by a central JSON configuration. If you need to add a new tool (e.g., "Facebook Lead Forms"), you simply add one object to the navigation array, and the UI dynamically renders the new subsection.

### The Onboarding Checklist System
To ensure clients successfully set up their agents (`09-individual-step-progress.png`, `14-what-to-do.png`), we will build a gamified onboarding engine:
1. **State Tracking:** In Supabase, the `sub_accounts` table will have a `jsonb` column called `onboarding_progress`.
2. **Step Verification:** 
   - Step 1: Add Credentials (turns green when API validates Twilio/GHL).
   - Step 2: Upload Knowledge Base (turns green when RAG embeddings are generated).
   - Step 3: Deploy AI Rep (turns green when `is_active` boolean is flipped).
3. **UI Reflection:** The frontend will calculate a percentage (e.g., "60% Complete") and block deployment until necessary steps are green.

### Debugging & Analytics Views
- **Debugging (`10-debugging.png`):** A dedicated "Logs" page that pulls real-time transcripts, API errors, and LangGraph trace events from the database. It will feature a search/filter bar to easily find "Failed Calls" or "Unanswered SMS".
- **Analytics (`01/02-Analytics`):** Top-level KPI cards (Total Calls, Minutes Used, Appointments Booked, SMS Sent) powered by efficient Supabase database views.

### Role-Based Access Control (RBAC):
    1. **Platform Admin View (For You - "Super Super Admin"):** Any user with `role="platform_admin"` sees the entire platform. You see all Agencies, all Sub-Accounts, aggregate usage, billing limits, and system-wide LangGraph logs.
    2. **Agency Admin View (For Your Partners):** A user with `role="agency_admin"` sees only the Sub-Accounts under their specific Agency. They can manage their clients, provision numbers (manually), and see their aggregate usage.
    3. **Sub-Account View (For End Clients):** A user with `role="sub_account_user"` logs in and *only* configures their specific instance. They upload Knowledge Base PDFs, set their Cal.com link, and tweak their Voice Agent's personality. They do *not* see CRM data here (they use GHL for that).

---

## ⚡ 4. Manual Onboarding Flow

With this architecture, onboarding a new client taking < 5 minutes:
1. Add Sub-Account under an Agency in the dashboard.
2. **Manual Phone Provisioning (Default)**: You or the Agency Admin manually configures a Twilio/Vobiz number and adds it to the client's `assigned_number` settings in the dashboard.
3. Client logs in, uploads a PDF (knowledge base), and pastes their Cal.com link.
4. **Done.** The agent and LangGraph workflows are instantly live for their number.

---

## 🗺️ Execution Roadmap (Phased Approach)

Don't build this all at once. Here is the safest integration path:

### Phase 1: Database Multi-Tenancy (1-2 Weeks)
* Migrate the current voice agent to be fully driven by Supabase `clients` and `settings` tables instead of local `config.py/json`.
* Update the FastAPI dash to require a `client_id`.

### Phase 2: LangGraph Core Migration (2-3 Weeks)
* Install LangGraph.
* Recreate the following workflows as strict 1-to-1 Python drop-in replacements (maintaining all GHL payload constraints):
    * `Text_Engine.json`
    * `Launch_Campaign.json`
    * `Get_Lead_Details.json`
    * `Make_Outbound_Call.json`
    * `Appointment_Booking_Functions.json`
* Build a FastAPI webhook proxy to intercept GHL calls and trigger the respective LangGraph/Python nodes.
* Tie the workflows to the multi-tenant Database (so they react per client).

### Phase 3: Frontend Overhaul (Ongoing)
* Build the Next.js Unified Dashboard.
* Hook up API endpoints to the database for Sub-Account management.
* Integrate Langgraph Studio tracing logs directly into the UI.
