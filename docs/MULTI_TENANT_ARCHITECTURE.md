# 🚀 Multi-Tenant AI Automation Platform — Architecture Strategy

This document outlines the strategic roadmap to evolve the current standalone voice agent into a comprehensive, multi-tenant B2B platform that replaces n8n, centralizes dashboards, and enables rapid client onboarding.

---

## 🏗️ 1. Multi-Tenant Foundation (The "One Codebase" Rule)

To keep your overhead near zero, you must avoid deploying separate instances/codebases for each client. **Everyone runs on the exact same code.**

### How it works:
1. **Database-Driven Config**: `config.json` goes away. We migrate all configurations to Supabase tables.
    * `clients`: ID, Name, Plan, active status.
    * `client_settings`: API keys (Twilio, Cal.com), LLM preferences, Twilio/SIP phone numbers assigned to them.
    * `campaigns`: Active campaigns linked to a client.
2. **Dynamic Routing**: When a call or SMS comes in, the system looks up the destination phone number in the DB to immediately identify the `client_id` and loads their specific settings, prompts, and knowledge base dynamically.
3. **Feature Flags**: Every client has a JSON chunk in the DB like `{"sms_followup": true, "appointment_reminders": false}`. Your code just checks this flag to enable/disable features without touching code.

---

## 🧠 2. Replacing n8n with LangGraph (Python)

Replacing n8n with Python code natively embedded in your app is the right move for version control, debugging, and avoiding multiple subscription costs.

**Why LangGraph?**
LangGraph is built exactly for this. It models stateful, multi-actor applications as graphs.

1. **State Persistence**: LangGraph natively saves "checkpoints" to a database (we can map this to Supabase). This means a workflow can sleep for 3 days (e.g., waiting for an appointment), wake up, and continue exactly where it left off.
2. **Visual Debugging**: **LangGraph Studio** gives you a visual UI to see every step the workflow took, replay errors, and see what the LLM thought at any given node. It gives you the "n8n visual feel" but with pure Python code.
3. **The Workflows**:
    * **Text Engine / Query Addressing**: A LangGraph graph that receives an incoming SMS, routes it to an RAG node (Knowledgebase), drafts a reply, and sends it via Twilio.
    * **Lead Nurturing / Drip Campaigns**: A graph that triggers on "New Lead", sends Day 1 SMS, delays, checks if they replied, sends Day 3 SMS, etc.
    * **Post-Call Automations**: When the Voice Agent hangs up, it triggers a background LangGraph job: `if booking_intent == true -> send WhatsApp confirmation`.

---

## 🖥️ 3. The Unified Dashboard Architecture

To merge the UI server and your external configuration dashboard, we need a robust web framework. While FastAPI + Jinja2 is great for a V1, a multi-tenant platform demands a modern frontend.

**The Stack Proposal:**
- **Backend:** Keep FastAPI (the current `ui_server.py` becomes `api_server.py`). It serves purely JSON REST APIs.
- **Frontend:** **Next.js (React)** or **Vue (Nuxt)**. Hosted on Vercel or Coolify.
- **Authentication:** Supabase Auth.
- **Two Views in One App:**
    1. **SuperAdmin View (For You):** See all clients, aggregate revenue, manage their active phone numbers, tweak global prompts, view LangGraph Studio logs.
    2. **Client View (For Them):** They log in and only see their CRM, their call logs, and a simple toggle menu to turn features (like SMS follow-up) on/off.

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
