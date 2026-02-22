import json
import logging
import os
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ui-server")

app = FastAPI(title="Med Spa AI Dashboard")

CONFIG_FILE = "config.json"

def read_config():
    """Reads the JSON config or returns default if it doesn't exist."""
    if not os.path.exists(CONFIG_FILE):
        return {
            "agent_instructions": "You are a friendly AI...",
            "stt_min_endpointing_delay": 0.6
        }
    with open(CONFIG_FILE, "r") as f:
        return json.load(f)

def write_config(data):
    """Writes the updated JSON config to disk."""
    with open(CONFIG_FILE, "w") as f:
        json.dump(data, f, indent=4)


@app.get("/", response_class=HTMLResponse)
async def get_dashboard():
    """Serves the simple HTML UI for the Developer Control Panel."""
    config = read_config()
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Agent Control Panel</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #f4f4f5;
                color: #18181b;
                margin: 0;
                padding: 40px 20px;
                display: flex;
                justify-content: center;
            }}
            .container {{
                background: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
                max-width: 800px;
                width: 100%;
            }}
            h1 {{
                margin-top: 0;
                font-size: 24px;
                font-weight: 600;
                border-bottom: 1px solid #e4e4e7;
                padding-bottom: 16px;
                margin-bottom: 24px;
            }}
            label {{
                display: block;
                font-size: 14px;
                font-weight: 500;
                margin-bottom: 8px;
                color: #3f3f46;
            }}
            textarea {{
                width: 100%;
                height: 300px;
                padding: 12px;
                border: 1px solid #d4d4d8;
                border-radius: 6px;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-size: 13px;
                line-height: 1.5;
                resize: vertical;
                box-sizing: border-box;
                margin-bottom: 24px;
            }}
            textarea:focus, input:focus {{
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
            }}
            input[type="number"] {{
                width: 100px;
                padding: 8px 12px;
                border: 1px solid #d4d4d8;
                border-radius: 6px;
                font-size: 14px;
                margin-bottom: 24px;
            }}
            .help-text {{
                font-size: 12px;
                color: #71717a;
                margin-top: -20px;
                margin-bottom: 24px;
                display: block;
            }}
            button {{
                background-color: #18181b;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                font-weight: 500;
                cursor: pointer;
                transition: background-color 0.2s;
            }}
            button:hover {{
                background-color: #27272a;
            }}
            #status {{
                margin-top: 16px;
                font-size: 14px;
                font-weight: 500;
                color: #16a34a;
                display: none;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>⚙️ AI Agent Control Panel</h1>
            
            <label for="prompt">Master System Prompt (Instructions)</label>
            <textarea id="prompt">{config.get('agent_instructions', '')}</textarea>
            
            <label for="delay">Mic Sensitivity (Endpointing Delay in seconds)</label>
            <input type="number" id="delay" step="0.1" value="{config.get('stt_min_endpointing_delay', 0.6)}">
            <span class="help-text">Higher means it waits longer before deciding you stopped speaking. 0.6 to 0.8 prevents abrupt cutoffs.</span>

            <button onclick="saveConfig()">Save Settings</button>
            <div id="status">✅ Settings saved updated successfully. (New calls will use this config instantly!)</div>
        </div>

        <script>
            async function saveConfig() {{
                const promptVal = document.getElementById('prompt').value;
                const delayVal = parseFloat(document.getElementById('delay').value);
                
                const response = await fetch('/api/config', {{
                    method: 'POST',
                    headers: {{
                        'Content-Type': 'application/json'
                    }},
                    body: JSON.stringify({{
                        agent_instructions: promptVal,
                        stt_min_endpointing_delay: delayVal
                    }})
                }});
                
                if (response.ok) {{
                    const statusEl = document.getElementById('status');
                    statusEl.style.display = 'block';
                    setTimeout(() => {{ statusEl.style.display = 'none'; }}, 3000);
                }} else {{
                    alert("Failed to save configuration.");
                }}
            }}
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@app.get("/api/config")
async def api_get_config():
    """API Endpoint to fetch JSON config directly."""
    return read_config()

@app.post("/api/config")
async def api_post_config(request: Request):
    """API Endpoint to save JSON config."""
    data = await request.json()
    write_config(data)
    logger.info(f"Configuration updated dynamically: {data}")
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    # Run server on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
