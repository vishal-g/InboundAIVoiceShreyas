# 🚀 Quickstart: Running Your AI Voice Agent

Follow these simple steps every time you need to initialize or restart your LiveKit AI Voice Agent from scratch.

---

### Step 1: Open Your Terminal
Open your terminal (or Command Prompt) and navigate to your project folder:
```bash
cd "Desktop/inbound AI voice"
```

### Step 2: Activate the Virtual Environment (venv)
Before installing packages or running the agent, you must activate the isolated Python environment. This ensures you don't mess up your system's global Python packages.

**On Mac/Linux:**
```bash
source .venv/bin/activate
```

**On Windows:**
```powershell
.venv\Scripts\activate
```
*(You will know it worked if your terminal prompt now starts with `(.venv)`)*

### Step 3: Install/Update Dependencies
Whenever you pull new code or change the `requirements.txt` file, you need to sync your packages.

```bash
pip install -r requirements.txt
```

### Step 4: Run the Agent
To start the agent so it listens for inbound calls or dispatch requests:

**For Development (Auto-reloads when you save files, shows detailed logs):**
```bash
python3 agent.py dev
```

**For Production (Standard running mode):**
```bash
python3 agent.py start
```

*Wait until you see:* `INFO:livekit.agents:registered worker [outbound-caller]`
*Your agent is now live and waiting for calls!*

---

### Step 5: Make a Test Outbound Call
Keep the terminal window from **Step 4** running. 
Open a **new** terminal window, navigate to your folder, and activate the virtual environment again (Steps 1 & 2). 

Then, trigger a dispatch call to a phone number:
```bash
python3 make_call.py --to +91XXXXXXXXXX
```
*(Replace `+91XXXXXXXXXX` with your actual phone number, including the country code).*
