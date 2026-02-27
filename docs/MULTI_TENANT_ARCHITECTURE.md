# 🚀 Multi-Tenant AI Automation Platform — Architecture Strategy

This document outlines the strategic roadmap to evolve the current standalone voice agent into a comprehensive, multi-tenant B2B platform that replaces n8n, centralizes dashboards, and enables rapid client onboarding.

---

## 🏗️ 1. Multi-Tenant Foundation (The "One Codebase" Rule)

To keep your overhead near zero, you must avoid deploying separate instances/codebases for each client. **Everyone runs on the exact same code.**

### How it works alongside GHL:
1. **GHL as the Source of Truth**: GoHighLevel (GHL) remains your primary CRM for lead management, pipelines, and basic standard automations.
2. **The 3-Tier Database (Agency Model)**: We map the exact same Agency -> Sub-Account structure that GHL uses into Supabase.
    * `agencies`: ID, Name, Subscription Status (Allows allowing multiple Super Admins per Agency).
    * `sub_accounts`: ID, Agency_ID, GHL Sub-Account ID, Name.
    * `users`: ID, Role (`super_admin`, `sub_account_user`), Agency_ID, Sub_Account_ID.
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
3. **The Workflows**:
    * **Text Engine / Query Addressing**: A LangGraph graph that receives webhooks from GHL (or incoming SMS), routes to a RAG node (Knowledgebase), drafts a reply, and sends it back to GHL or via Twilio.
    * **Agentic Lead Qualification**: A graph that evaluates a lead's intent based on their conversation history, and when qualified, pushes a "State Change" via API back into GHL to move them to the next pipeline stage.
    * **Post-Call Automations**: When the Voice Agent hangs up, it triggers a background LangGraph job: analyze transcript, summarize, push notes to GHL Contact, and `if booking_intent == true -> send WhatsApp confirmation`.

---

## 🖥️ 3. The Unified Dashboard Architecture

To merge the UI server and your external configuration dashboard, we need a robust web framework. While FastAPI + Jinja2 is great for a V1, a multi-tenant platform demands a modern frontend.

**The Stack Proposal:**
- **Backend:** Keep FastAPI (the current `ui_server.py` becomes `api_server.py`). It serves purely JSON REST APIs.
- **Frontend:** **Next.js (React)** or **Vue (Nuxt)**. Hosted on Vercel or Coolify.
- **Authentication:** Supabase Auth.
- **Role-Based Access Control (RBAC):**
    1. **SuperAdmin View (For You & Partners):** Any user with `role="super_admin"` sees the Agency view. You see all Sub-Accounts, aggregate usage, manage global phone number inventory, and view LangGraph logs.
    2. **Sub-Account View (For Your Clients):** A user with `role="sub_account_user"` logs in and *only* configures their specific instance. They upload Knowledge Base PDFs, set their Cal.com link, and tweak their Voice Agent's personality. They do *not* see CRM data here (they use GHL for that).

---

## ⚡ 4. Rapid Onboarding Flow

With this architecture, onboarding a new client taking < 5 minutes:
1. Add Client in SuperAdmin dashboard.
2. Platform auto-purchases a phone number via Twilio/Vobiz API and maps it to their `client_id`.
3. Client logs in, uploads a PDF (knowledge base), and pasts their Cal.com link.
4. **Done.** The agent and LangGraph workflows are instantly live for their number.

---

## 🗺️ Execution Roadmap (Phased Approach)

Don't build this all at once. Here is the safest integration path:

### Phase 1: Database Multi-Tenancy (1-2 Weeks)
* Migrate the current voice agent to be fully driven by Supabase `clients` and `settings` tables instead of local `config.py/json`.
* Update the FastAPI dash to require a `client_id`.

### Phase 2: LangGraph Core Migration (2-3 Weeks)
* Install LangGraph.
* Recreate the `Text_Engine.json` (SMS replying using Knowledgebase) and `Make_Outbound_Call.json` logic in Python.
* Tie the workflows to the multi-tenant Database (so they react per client).

### Phase 3: Long-Running Automations (2 Weeks)
* Implement LangGraph persistent checkpoints in Supabase.
* Migrate `Launch_Campaign` (drip sequences) and `Appointment_Booking_Functions` (reminders) to Python background tasks.

### Phase 4: Frontend Overhaul (Ongoing)
* Build the Next.js Unified Dashboard.
* Integrate Langgraph Studio for visual workflow debugging.
