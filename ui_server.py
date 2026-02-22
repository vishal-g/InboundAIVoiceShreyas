import json
import logging
import os
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ui-server")

app = FastAPI(title="Med Spa AI Dashboard")

CONFIG_FILE = "config.json"

def read_config():
    config = {}
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            config = json.load(f)
            
    def get_val(key, env_key, default=""):
        return config.get(key) if config.get(key) else os.getenv(env_key, default)
        
    return {
        "agent_instructions": get_val("agent_instructions", "AGENT_INSTRUCTIONS", "Say exactly this phrase without any extra thinking: 'Namaste! Welcome to Daisy's Med Spa. Main aapki kaise madad kar sakti hoon? I can answer questions about our treatments or help you book an appointment.'"),
        "stt_min_endpointing_delay": float(get_val("stt_min_endpointing_delay", "STT_MIN_ENDPOINTING_DELAY", 0.6)),
        "llm_model": get_val("llm_model", "LLM_MODEL", "gpt-4o-mini"),
        "tts_voice": get_val("tts_voice", "TTS_VOICE", "kavya"),
        "livekit_url": get_val("livekit_url", "LIVEKIT_URL", ""),
        "sip_trunk_id": get_val("sip_trunk_id", "SIP_TRUNK_ID", ""),
        "livekit_api_key": get_val("livekit_api_key", "LIVEKIT_API_KEY", ""),
        "livekit_api_secret": get_val("livekit_api_secret", "LIVEKIT_API_SECRET", ""),
        "openai_api_key": get_val("openai_api_key", "OPENAI_API_KEY", ""),
        "sarvam_api_key": get_val("sarvam_api_key", "SARVAM_API_KEY", ""),
        "cal_api_key": get_val("cal_api_key", "CAL_API_KEY", ""),
        "cal_event_type_id": get_val("cal_event_type_id", "CAL_EVENT_TYPE_ID", ""),
        "telegram_bot_token": get_val("telegram_bot_token", "TELEGRAM_BOT_TOKEN", ""),
        "telegram_chat_id": get_val("telegram_chat_id", "TELEGRAM_CHAT_ID", ""),
        "supabase_url": get_val("supabase_url", "SUPABASE_URL", ""),
        "supabase_key": get_val("supabase_key", "SUPABASE_KEY", ""),
        **config
    }

def write_config(data):
    # Merge existing config with new data so we don't overwrite missing keys
    config = read_config()
    config.update(data)
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=4)

@app.get("/", response_class=HTMLResponse)
async def get_dashboard():
    config = read_config()
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Med Spa AI Control Panel</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body {{ font-family: 'Inter', sans-serif; }}
            .tab-btn.active {{ border-bottom: 2px solid #3b82f6; color: #3b82f6; }}
            .tab-content {{ display: none; }}
            .tab-content.active {{ display: block; }}
        </style>
    </head>
    <body class="bg-gray-50 text-gray-900 min-h-screen">
        <div class="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="px-6 py-5 border-b border-gray-200">
                    <h1 class="text-2xl font-bold text-gray-900">✨ AI Concierge Control Panel</h1>
                    <p class="mt-1 text-sm text-gray-500">Configure your LiveKit Voice Agent seamlessly.</p>
                </div>
                
                <!-- Tabs -->
                <div class="flex border-b border-gray-200 px-6">
                    <button class="tab-btn active px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none" onclick="switchTab('prompting')">🤖 Prompting & Tuning</button>
                    <button class="tab-btn px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none" onclick="switchTab('models')">🎙️ Models & Voice</button>
                    <button class="tab-btn px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none" onclick="switchTab('credentials')">🔑 API Credentials</button>
                    <button class="tab-btn px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none" onclick="switchTab('logs'); loadLogs();">📞 Call Logs</button>
                </div>

                <div class="p-6">
                    <!-- Prompting Tab -->
                    <div id="prompting" class="tab-content active space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Master System Prompt</label>
                            <p class="text-xs text-gray-500 mb-2">The AI's personality and instructions. Note: Date and Time context is injected automatically!</p>
                            <textarea id="agent_instructions" class="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm">{config.get('agent_instructions', '')}</textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Mic Sensitivity (Endpointing Delay)</label>
                            <p class="text-xs text-gray-500 mb-2">Seconds the AI waits after you stop speaking to assume you are done. Default: 0.6.</p>
                            <input type="number" id="stt_min_endpointing_delay" step="0.1" value="{config.get('stt_min_endpointing_delay', 0.6)}" class="w-32 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>

                    <!-- Models Tab -->
                    <div id="models" class="tab-content space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">LLM Brain (OpenAI)</label>
                            <select id="llm_model" class="mt-1 block w-1/2 pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                                <option value="gpt-4o-mini" {'selected' if config.get('llm_model') == 'gpt-4o-mini' else ''}>gpt-4o-mini (Fastest, Default)</option>
                                <option value="gpt-4o" {'selected' if config.get('llm_model') == 'gpt-4o' else ''}>gpt-4o (Smartest, Slower)</option>
                                <option value="gpt-3.5-turbo" {'selected' if config.get('llm_model') == 'gpt-3.5-turbo' else ''}>gpt-3.5-turbo</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Voice Synthesis (Sarvam bulbul:v3)</label>
                            <select id="tts_voice" class="mt-1 block w-1/2 pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                                <option value="kavya" {'selected' if config.get('tts_voice') == 'kavya' else ''}>Kavya (Fastest Streaming)</option>
                                <option value="rohan" {'selected' if config.get('tts_voice') == 'rohan' else ''}>Rohan (Male, Balanced)</option>
                                <option value="priya" {'selected' if config.get('tts_voice') == 'priya' else ''}>Priya (Female)</option>
                                <option value="shubh" {'selected' if config.get('tts_voice') == 'shubh' else ''}>Shubh (Male)</option>
                                <option value="shreya" {'selected' if config.get('tts_voice') == 'shreya' else ''}>Shreya (Female)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Credentials Tab -->
                    <div id="credentials" class="tab-content space-y-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p class="text-sm text-gray-600 mb-4">Paste your API keys here. Your code will prioritize these over any hardcoded .env files. Do not share this dashboard publicly.</p>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider">LiveKit URL</label>
                                <input type="text" id="livekit_url" value="{config.get('livekit_url', '')}" class="mt-1 w-full p-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider">SIP Trunk ID (Outbound)</label>
                                <input type="text" id="sip_trunk_id" value="{config.get('sip_trunk_id', '')}" class="mt-1 w-full p-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider">LiveKit API Key</label>
                                <input type="password" id="livekit_api_key" value="{config.get('livekit_api_key', '')}" class="mt-1 w-full p-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider">LiveKit API Secret</label>
                                <input type="password" id="livekit_api_secret" value="{config.get('livekit_api_secret', '')}" class="mt-1 w-full p-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider">OpenAI API Key</label>
                                <input type="password" id="openai_api_key" value="{config.get('openai_api_key', '')}" class="mt-1 w-full p-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Sarvam API Key</label>
                                <input type="password" id="sarvam_api_key" value="{config.get('sarvam_api_key', '')}" class="mt-1 w-full p-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Cal.com API Key</label>
                                <input type="password" id="cal_api_key" value="{config.get('cal_api_key', '')}" class="mt-1 w-full p-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Cal.com Event Type ID</label>
                                <input type="text" id="cal_event_type_id" value="{config.get('cal_event_type_id', '')}" class="mt-1 w-full p-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Telegram Bot Token</label>
                                <input type="password" id="telegram_bot_token" value="{config.get('telegram_bot_token', '')}" class="mt-1 w-full p-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Telegram Chat ID</label>
                                <input type="text" id="telegram_chat_id" value="{config.get('telegram_chat_id', '')}" class="mt-1 w-full p-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Supabase URL</label>
                                <input type="text" id="supabase_url" value="{config.get('supabase_url', '')}" class="mt-1 w-full p-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Supabase Anon Key</label>
                                <input type="password" id="supabase_key" value="{config.get('supabase_key', '')}" class="mt-1 w-full p-2 border border-gray-300 rounded-lg">
                            </div>
                        </div>
                    </div>

                    <!-- Call Logs Tab -->
                    <div id="logs" class="tab-content space-y-6">
                        <div class="flex justify-between items-center">
                            <h2 class="text-lg font-semibold text-gray-900">Recent Calls</h2>
                            <button onclick="loadLogs()" class="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors">Refresh</button>
                        </div>
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transcript</th>
                                    </tr>
                                </thead>
                                <tbody id="logs-table-body" class="bg-white divide-y divide-gray-200 text-sm">
                                    <!-- Logs injected here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <span id="status" class="text-sm font-medium text-green-600 opacity-0 transition-opacity">✅ Configuration saved successfully!</span>
                    <button onclick="saveConfig()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>

        <script>
            function switchTab(tabId) {{
                document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active', 'text-blue-600'));
                
                document.getElementById(tabId).classList.add('active');
                event.currentTarget.classList.add('active', 'text-blue-600');
            }}

            async function saveConfig() {{
                const payload = {{
                    agent_instructions: document.getElementById('agent_instructions').value,
                    stt_min_endpointing_delay: parseFloat(document.getElementById('stt_min_endpointing_delay').value),
                    llm_model: document.getElementById('llm_model').value,
                    tts_voice: document.getElementById('tts_voice').value,
                    livekit_url: document.getElementById('livekit_url').value,
                    livekit_api_key: document.getElementById('livekit_api_key').value,
                    livekit_api_secret: document.getElementById('livekit_api_secret').value,
                    openai_api_key: document.getElementById('openai_api_key').value,
                    sarvam_api_key: document.getElementById('sarvam_api_key').value,
                    cal_api_key: document.getElementById('cal_api_key').value,
                    cal_event_type_id: document.getElementById('cal_event_type_id').value,
                    telegram_bot_token: document.getElementById('telegram_bot_token').value,
                    telegram_chat_id: document.getElementById('telegram_chat_id').value,
                    sip_trunk_id: document.getElementById('sip_trunk_id').value,
                    supabase_url: document.getElementById('supabase_url').value,
                    supabase_key: document.getElementById('supabase_key').value
                }};
                
                const response = await fetch('/api/config', {{
                    method: 'POST',
                    headers: {{'Content-Type': 'application/json'}},
                    body: JSON.stringify(payload)
                }});
                
                if (response.ok) {{
                    const statusEl = document.getElementById('status');
                    statusEl.style.opacity = '1';
                    setTimeout(() => {{ statusEl.style.opacity = '0'; }}, 3000);
                }} else {{
                    alert("Failed to save configuration.");
                }}
            }}

            async function loadLogs() {{
                const tbody = document.getElementById('logs-table-body');
                tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Loading call logs...</td></tr>';
                
                try {{
                    const response = await fetch('/api/logs');
                    const logs = await response.json();
                    
                    if (!logs || logs.length === 0) {{
                        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No call logs found. (Check Supabase credentials and make a call!)</td></tr>';
                        return;
                    }}
                    
                    tbody.innerHTML = logs.map(log => `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap text-gray-500">${{new Date(log.created_at).toLocaleString()}}</td>
                            <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">${{log.phone_number || 'Unknown'}}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-gray-500">${{log.duration_seconds}}s</td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${{log.summary.includes('Confirmed') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}}">
                                    ${{log.summary || 'Ended'}}
                                </span>
                            </td>
                            <td class="px-6 py-4">
                                <details class="cursor-pointer text-blue-600 hover:text-blue-800">
                                    <summary class="focus:outline-none">View Transcript</summary>
                                    <div class="mt-2 p-3 bg-gray-50 rounded-md text-xs text-gray-700 whitespace-pre-wrap font-mono border border-gray-200">${{log.transcript || 'No transcript available.'}}</div>
                                </details>
                            </td>
                        </tr>
                    `).join('');
                }} catch (e) {{
                    tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Error loading logs. Have you configured Supabase API keys?</td></tr>';
                }}
            }}
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@app.get("/api/config")
async def api_get_config():
    return read_config()

@app.post("/api/config")
async def api_post_config(request: Request):
    data = await request.json()
    write_config(data)
    logger.info("Configuration updated via UI dynamically.")
    return {"status": "success"}

@app.get("/api/logs")
async def api_get_logs():
    config = read_config()
    os.environ["SUPABASE_URL"] = config.get("supabase_url", "")
    os.environ["SUPABASE_KEY"] = config.get("supabase_key", "")
    
    import db
    try:
        logs = db.fetch_call_logs(limit=50)
        return logs
    except Exception as e:
        logger.error(f"Error fetching logs: {e}")
        return []

if __name__ == "__main__":
    import uvicorn
    # Use allow_reuse_address or ignore the process block for local re-runs
    uvicorn.run("ui_server:app", host="0.0.0.0", port=8000, reload=True)
