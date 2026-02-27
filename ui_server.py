"""
ui_server.py — FastAPI dashboard and API server for RapidX AI Voice Agent.

Provides:
- Dashboard UI (loaded from templates/dashboard.html)
- Demo call page (templates/demo.html)
- REST API for config, call logs, bookings, stats, CRM contacts
- Outbound call dispatch (single + bulk)
- Prometheus metrics endpoint
- Health check for deployment monitoring

Run:
    python ui_server.py              # starts on port 8000 with auto-reload
    uvicorn ui_server:app --port 80  # production
"""

import json
import logging
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, Request
from fastapi.responses import HTMLResponse, PlainTextResponse

from config import get_settings, read_config_json, write_config_json

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ui-server")

app = FastAPI(title="RapidX AI Dashboard")

TEMPLATE_DIR = Path(__file__).parent / "templates"


# ══════════════════════════════════════════════════════════════════════════════
# Config Router
# ══════════════════════════════════════════════════════════════════════════════

config_router = APIRouter(prefix="/api", tags=["config"])


@config_router.get("/config")
async def api_get_config():
    """Return the merged config (config.json + .env defaults)."""
    return read_config_json()


@config_router.post("/config")
async def api_post_config(request: Request):
    """Update config.json with the provided fields."""
    data = await request.json()
    write_config_json(data)
    logger.info("Configuration updated via UI.")
    return {"status": "success"}


app.include_router(config_router)


# ══════════════════════════════════════════════════════════════════════════════
# Data Router (logs, bookings, stats, contacts)
# ══════════════════════════════════════════════════════════════════════════════

data_router = APIRouter(prefix="/api", tags=["data"])


def _ensure_supabase_env():
    """Push Supabase creds from config into env vars for the db module."""
    config = read_config_json()
    os.environ["SUPABASE_URL"] = config.get("supabase_url", "")
    os.environ["SUPABASE_KEY"] = config.get("supabase_key", "")


@data_router.get("/logs")
async def api_get_logs():
    """Fetch the latest call logs from Supabase."""
    _ensure_supabase_env()
    import db
    try:
        return db.fetch_call_logs(limit=50)
    except Exception as e:
        logger.error(f"Error fetching logs: {e}")
        return []


@data_router.get("/logs/{log_id}/transcript")
async def api_get_transcript(log_id: str):
    """Download a call transcript as a text file."""
    _ensure_supabase_env()
    try:
        from supabase import create_client
        supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
        res = supabase.table("call_logs").select("*").eq("id", log_id).single().execute()
        data = res.data
        text = (
            f"Call Log — {data.get('created_at', '')}\n"
            f"Phone: {data.get('phone_number', 'Unknown')}\n"
            f"Duration: {data.get('duration_seconds', 0)}s\n"
            f"Summary: {data.get('summary', '')}\n\n"
            f"--- TRANSCRIPT ---\n"
            f"{data.get('transcript', 'No transcript available.')}"
        )
        return PlainTextResponse(
            content=text,
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename=transcript_{log_id}.txt"},
        )
    except Exception as e:
        return PlainTextResponse(content=f"Error: {e}", status_code=500)


@data_router.get("/bookings")
async def api_get_bookings():
    """Fetch confirmed bookings for the calendar view."""
    _ensure_supabase_env()
    import db
    try:
        return db.fetch_bookings()
    except Exception as e:
        logger.error(f"Error fetching bookings: {e}")
        return []


@data_router.get("/stats")
async def api_get_stats():
    """Return aggregate dashboard statistics."""
    _ensure_supabase_env()
    import db
    try:
        return db.fetch_stats()
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        return {"total_calls": 0, "total_bookings": 0, "avg_duration": 0, "booking_rate": 0}


@data_router.get("/contacts")
async def api_get_contacts():
    """CRM endpoint — groups call_logs by phone number into contacts."""
    _ensure_supabase_env()
    try:
        from supabase import create_client
        supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
        res = (
            supabase.table("call_logs")
            .select("phone_number, caller_name, summary, created_at")
            .order("created_at", desc=True)
            .limit(500)
            .execute()
        )
        rows = res.data or []

        contacts: dict = {}
        for r in rows:
            phone = r.get("phone_number") or "unknown"
            if phone not in contacts:
                contacts[phone] = {
                    "phone_number": phone,
                    "caller_name": r.get("caller_name") or "",
                    "total_calls": 0,
                    "last_seen": r.get("created_at"),
                    "is_booked": False,
                }
            c = contacts[phone]
            c["total_calls"] += 1
            if not c["caller_name"] and r.get("caller_name"):
                c["caller_name"] = r["caller_name"]
            if r.get("summary") and "Confirmed" in r.get("summary", ""):
                c["is_booked"] = True

        return sorted(contacts.values(), key=lambda x: x["last_seen"] or "", reverse=True)
    except Exception as e:
        logger.error(f"Error fetching contacts: {e}")
        return []


app.include_router(data_router)


# ══════════════════════════════════════════════════════════════════════════════
# Calls Router (outbound dispatch)
# ══════════════════════════════════════════════════════════════════════════════

calls_router = APIRouter(prefix="/api/call", tags=["calls"])

OUTBOUND_AGENT_NAME = "voice-agent"


@calls_router.post("/single")
async def api_call_single(request: Request):
    """Dispatch a single outbound call via LiveKit."""
    data = await request.json()
    phone = (data.get("phone") or "").strip()
    if not phone.startswith("+"):
        return {"status": "error", "message": "Phone number must start with + and country code"}

    config = read_config_json()
    try:
        import random
        import json as _json
        from livekit import api as lkapi

        lk = lkapi.LiveKitAPI(
            url=config.get("livekit_url") or os.environ.get("LIVEKIT_URL", ""),
            api_key=config.get("livekit_api_key") or os.environ.get("LIVEKIT_API_KEY", ""),
            api_secret=config.get("livekit_api_secret") or os.environ.get("LIVEKIT_API_SECRET", ""),
        )
        room_name = f"call-{phone.replace('+', '')}-{random.randint(1000, 9999)}"
        dispatch = await lk.agent_dispatch.create_dispatch(
            lkapi.CreateAgentDispatchRequest(
                agent_name=OUTBOUND_AGENT_NAME,
                room=room_name,
                metadata=_json.dumps({"phone_number": phone}),
            )
        )
        await lk.aclose()
        logger.info(f"Outbound call dispatched to {phone}: {dispatch.id}")
        return {"status": "ok", "dispatch_id": dispatch.id, "room": room_name, "phone": phone}
    except Exception as e:
        logger.error(f"Call dispatch error: {e}")
        return {"status": "error", "message": str(e)}


@calls_router.post("/bulk")
async def api_call_bulk(request: Request):
    """Dispatch outbound calls to multiple numbers (one per line)."""
    import random
    import json as _json
    from livekit import api as lkapi

    data = await request.json()
    numbers = [n.strip() for n in (data.get("numbers") or "").splitlines() if n.strip()]
    results = []
    cfg = read_config_json()
    lk_url = cfg.get("livekit_url") or os.environ.get("LIVEKIT_URL", "")
    lk_key = cfg.get("livekit_api_key") or os.environ.get("LIVEKIT_API_KEY", "")
    lk_secret = cfg.get("livekit_api_secret") or os.environ.get("LIVEKIT_API_SECRET", "")

    for phone in numbers:
        if not phone.startswith("+"):
            results.append({"phone": phone, "status": "error", "message": "Must start with +"})
            continue
        try:
            lk = lkapi.LiveKitAPI(url=lk_url, api_key=lk_key, api_secret=lk_secret)
            room_name = f"call-{phone.replace('+', '')}-{random.randint(1000, 9999)}"
            dispatch = await lk.agent_dispatch.create_dispatch(
                lkapi.CreateAgentDispatchRequest(
                    agent_name=OUTBOUND_AGENT_NAME,
                    room=room_name,
                    metadata=_json.dumps({"phone_number": phone}),
                )
            )
            await lk.aclose()
            results.append({"phone": phone, "status": "ok", "dispatch_id": dispatch.id})
            logger.info(f"Bulk outbound dispatched to {phone}: {dispatch.id}")
        except Exception as e:
            results.append({"phone": phone, "status": "error", "message": str(e)})
    return {"results": results, "total": len(results)}


app.include_router(calls_router)


# ══════════════════════════════════════════════════════════════════════════════
# Demo Router
# ══════════════════════════════════════════════════════════════════════════════

demo_router = APIRouter(tags=["demo"])


@demo_router.get("/api/demo-token")
async def api_demo_token():
    """Generate a LiveKit room + access token for browser-based demo call."""
    config = read_config_json()
    try:
        from livekit.api import AccessToken, VideoGrants
        import time, random, json as _json
        from livekit import api as lkapi

        room_name = f"demo-{random.randint(10000, 99999)}"
        api_key = config.get("livekit_api_key") or os.environ.get("LIVEKIT_API_KEY", "")
        api_secret = config.get("livekit_api_secret") or os.environ.get("LIVEKIT_API_SECRET", "")
        livekit_url = config.get("livekit_url") or os.environ.get("LIVEKIT_URL", "")

        token = (
            AccessToken(api_key, api_secret)
            .with_identity("demo-user")
            .with_name("Demo Caller")
            .with_grants(VideoGrants(room_join=True, room=room_name))
            .with_ttl(3600)
            .to_jwt()
        )

        lk = lkapi.LiveKitAPI(url=livekit_url, api_key=api_key, api_secret=api_secret)
        await lk.agent_dispatch.create_dispatch(
            lkapi.CreateAgentDispatchRequest(
                agent_name="inbound-agent",
                room=room_name,
                metadata=_json.dumps({"phone_number": "demo", "is_demo": True}),
            )
        )
        await lk.aclose()
        return {"token": token, "room": room_name, "url": livekit_url}
    except Exception as e:
        logger.error(f"Demo token error: {e}")
        return {"error": str(e)}


@demo_router.get("/demo", response_class=HTMLResponse)
async def get_demo_page():
    """Serve the browser-based demo call page."""
    html = (TEMPLATE_DIR / "demo.html").read_text()
    return HTMLResponse(content=html)


app.include_router(demo_router)


# ══════════════════════════════════════════════════════════════════════════════
# Metrics Router (Prometheus)
# ══════════════════════════════════════════════════════════════════════════════

try:
    from prometheus_client import (
        CollectorRegistry, Counter, Gauge, Histogram,
        generate_latest, CONTENT_TYPE_LATEST,
    )
    from fastapi.responses import Response as _Resp

    _METRICS_REGISTRY = CollectorRegistry()
    _voice_calls_total = Counter("voice_calls_total", "Total calls", registry=_METRICS_REGISTRY)
    _voice_calls_booked = Counter("voice_calls_booked_total", "Booked calls", registry=_METRICS_REGISTRY)
    _voice_call_duration = Histogram(
        "voice_call_duration_seconds", "Call duration",
        buckets=[10, 30, 60, 120, 300, 600, 1200], registry=_METRICS_REGISTRY,
    )
    _voice_calls_active = Gauge("voice_calls_active", "Active calls", registry=_METRICS_REGISTRY)

    @app.get("/metrics", include_in_schema=False)
    def metrics():
        """Prometheus metrics scrape endpoint."""
        return _Resp(generate_latest(_METRICS_REGISTRY), media_type=CONTENT_TYPE_LATEST)

    @app.post("/internal/record-call", include_in_schema=False)
    async def record_call_metric(request: Request):
        """Called by agent at shutdown to update Prometheus counters."""
        data = await request.json()
        _voice_calls_total.inc()
        if data.get("booked"):
            _voice_calls_booked.inc()
        if data.get("duration"):
            _voice_call_duration.observe(data["duration"])
        return {"ok": True}

    logger.info("[METRICS] Prometheus metrics enabled at /metrics")
except ImportError:
    logger.warning("[METRICS] prometheus_client not installed — /metrics disabled")


# ══════════════════════════════════════════════════════════════════════════════
# Health + Dashboard
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/health")
def health_check():
    """Health check endpoint for Coolify monitoring."""
    return {
        "status": "ok",
        "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
        "service": "rapidx-ai-voice-agent",
    }


@app.get("/", response_class=HTMLResponse)
async def get_dashboard():
    """Render the main dashboard from the Jinja2 template."""
    config = read_config_json()

    # Build 'selected' attributes for <select> elements
    def sel(key, val):
        return "selected" if config.get(key) == val else ""

    # Read template and perform replacements
    template = (TEMPLATE_DIR / "dashboard.html").read_text()

    # Replace {{ config.key }} placeholders
    def replace_config(m):
        key = m.group(1)
        return str(config.get(key, ""))

    html = re.sub(r"\{\{\s*config\.(\w+)\s*\}\}", replace_config, template)

    # Replace {{ sel_key_val }} placeholders
    def replace_sel(m):
        parts = m.group(1).split("_", 1)
        if len(parts) == 2:
            key_part = parts[0]
            val_part = parts[1].replace("_", "-")
            # Try common patterns
            for v in [val_part, val_part.replace("-", "."), val_part.replace("-", "_")]:
                if config.get(key_part) == v:
                    return "selected"
        return ""

    html = re.sub(r"\{\{\s*sel_(\w+)\s*\}\}", replace_sel, html)

    return HTMLResponse(content=html)


# ══════════════════════════════════════════════════════════════════════════════
# Entry
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ui_server:app", host="0.0.0.0", port=8000, reload=True)
