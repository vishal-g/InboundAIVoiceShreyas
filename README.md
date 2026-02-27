# 🎙️ RapidX AI Voice Agent

A complete, production-ready AI voice agent solution supporting both **inbound** and **outbound** telephony via LiveKit SIP trunks, complete with a web dashboard for configuration and analytics.

The system uses:
- **LiveKit** for WebRTC/SIP transport and agent hosting
- **FastAPI / Jinja2** for the web dashboard and API
- **Supabase** for call logs, CRM, and recording storage
- **Sarvam AI / Deepgram** for Speech-to-Text (STT) and Text-to-Speech (TTS)
- **OpenAI / Groq / Anthropic** for the conversational LLM brain

## 📂 Project Structure

- `agent.py` — The unified LiveKit worker entrypoint (routes calls to inbound or outbound).
- `agents/` — Core agent logic (`inbound.py`, `outbound.py`, `base.py`).
- `ui_server.py` — The FastAPI web dashboard and API backend.
- `config.py` — Centralized Pydantic configuration (`.env` + `config.json`).
- `tools.py` — Agent tools (booking, checking availability, etc.).
- `db_scripts/` — SQL schemas for Supabase.
- `scripts/` — Utility scripts (`make_call.py`, `setup_trunk.py`).
- `docs/` — Detailed guides (deployment, architecture, integrations).

For a detailed view of the system architecture and call flows, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 🚀 Quickstart

### 1. Requirements
- Python 3.9+
- `uv` (recommended) or `pip`

### 2. Install Dependencies
```bash
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
```

### 3. Configuration
Copy the example environment file and fill in your API keys (LiveKit, OpenAI, Sarvam, Supabase, etc.):
```bash
cp .env.example .env
```
*(You can also configure many of the dynamic settings like AI personality, opening lines, and voices directly from the web dashboard later).*

### 4. Running the System

You need to run two processes simultaneously:

**Terminal 1: Start the Web Dashboard**
```bash
# Starts the UI server on http://localhost:8000
python ui_server.py
```

**Terminal 2: Start the AI Agent Worker**
```bash
# Starts the LiveKit worker that powers the voice AI
python agent.py dev
```

---

## 📞 Using the Agent

### Web Dashboard
Oepn `http://localhost:8000` in your browser. From here you can:
- View **Call Logs** and **CRM Contacts**
- See real-time **Metrics** (total calls, booking rates, average duration)
- Change the **Agent Settings** (system prompt, opening greeting)
- Switch **Models & Voices** (toggle between OpenAI/Groq or change TTS language presets)

### Browser Demo
You can test the agent directly in your browser without calling a phone number! 
Go to the **Demo Link** tab in the dashboard and generate a web session link.

### Outbound Calling
Go to the **Outbound Calls** tab in the dashboard to dispatch the agent to call any phone number instantly.

### Inbound Calling (SIP)
To receive calls from a real phone number, you need to configure a SIP Trunk (e.g., using Vobiz) in your LiveKit Cloud project and route it to the agent. See the docs in the `docs/` folder for detailed SIP setup instructions.
