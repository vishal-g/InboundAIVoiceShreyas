"""
config.py — Centralised configuration management.

Uses Pydantic BaseSettings to auto-load .env variables with typed validation.
Also handles config.json (dashboard-editable settings) and per-client overrides.

Merge priority:  .env defaults → config.json overrides → per-client configs/{phone}.json
"""

import json
import logging
import os
from pathlib import Path
from typing import Any

from pydantic import Field
from pydantic_settings import BaseSettings

logger = logging.getLogger("config")


# ══════════════════════════════════════════════════════════════════════════════
# Pydantic BaseSettings — typed, validated .env loading
# ══════════════════════════════════════════════════════════════════════════════

class AppSettings(BaseSettings):
    """
    Application settings loaded from environment variables / .env file.

    Each field maps to an env var of the same name (case-insensitive).
    config.json values override these at runtime via ``get_live_config()``.
    """

    # ── LiveKit ───────────────────────────────────────────────────────────
    livekit_url: str = ""
    livekit_api_key: str = ""
    livekit_api_secret: str = ""

    # ── AI Providers ──────────────────────────────────────────────────────
    openai_api_key: str = ""
    sarvam_api_key: str = ""
    anthropic_api_key: str = ""

    # ── Agent Behaviour ───────────────────────────────────────────────────
    llm_model: str = "gpt-4o-mini"
    llm_provider: str = "openai"
    tts_voice: str = "kavya"
    tts_language: str = "hi-IN"
    tts_provider: str = "sarvam"
    stt_provider: str = "sarvam"
    stt_language: str = "unknown"
    lang_preset: str = "multilingual"
    stt_min_endpointing_delay: float = 0.05
    max_turns: int = 25
    first_line: str = (
        "Namaste! This is Aryan from RapidX AI — we help businesses automate "
        "with AI. Hmm, may I ask what kind of business you run?"
    )
    agent_instructions: str = ""

    # ── Cal.com ───────────────────────────────────────────────────────────
    cal_api_key: str = ""
    cal_event_type_id: str = ""

    # ── Supabase ──────────────────────────────────────────────────────────
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_s3_access_key: str = ""
    supabase_s3_secret_key: str = ""
    supabase_s3_endpoint: str = ""
    supabase_s3_region: str = "ap-south-1"

    # ── Telegram ──────────────────────────────────────────────────────────
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    # ── SIP / VoBiz ───────────────────────────────────────────────────────
    vobiz_sip_domain: str = ""
    vobiz_username: str = ""
    vobiz_password: str = ""
    vobiz_outbound_number: str = ""
    sip_trunk_id: str = ""
    default_transfer_number: str = ""

    # ── Twilio (WhatsApp) ─────────────────────────────────────────────────
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_number: str = "whatsapp:+14155238886"

    # ── Optional integrations ─────────────────────────────────────────────
    sentry_dsn: str = ""
    environment: str = "production"
    n8n_webhook_url: str = ""
    google_calendar_id: str = ""
    google_service_account_file: str = "google_creds.json"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "allow"}


# Singleton — call get_settings() to access
_settings: AppSettings | None = None


def get_settings() -> AppSettings:
    """Return the cached AppSettings singleton, creating it on first call."""
    global _settings
    if _settings is None:
        _settings = AppSettings()
    return _settings


# ══════════════════════════════════════════════════════════════════════════════
# Live config (used by agent at call time)
# ══════════════════════════════════════════════════════════════════════════════

def get_live_config(phone_number: str | None = None) -> dict[str, Any]:
    """
    Load agent config — fetches from Supabase using the assigned phone number.
    Falls back to .env defaults if no DB config is found.
    """
    # Import locally to avoid circular dependencies if services/db.py imports config.py
    from services.db import get_sub_account_by_number

    db_config: dict[str, Any] = {}
    
    if phone_number and phone_number != "unknown":
        # Format phone to match what should be in the DB (usually E.164 +1234567890)
        clean_phone = phone_number.replace(" ", "")
        if not clean_phone.startswith("+"):
            clean_phone = "+" + clean_phone
            
        logger.info(f"[CONFIG] Fetching sub-account settings for number: {clean_phone}")
        db_data = get_sub_account_by_number(clean_phone)
        if db_data:
            logger.info(f"[CONFIG] Successfully loaded DB config for number {clean_phone}")
            db_config = db_data
        else:
            logger.warning(f"[CONFIG] No DB sub-account found for number: {clean_phone}. Using system defaults.")

    settings = get_settings()
    
    # Merge Database config over .env defaults
    resolved: dict[str, Any] = {
        "sub_account_id":            db_config.get("sub_account_id"),
        "agent_instructions":        db_config.get("agent_instructions", settings.agent_instructions),
        "stt_min_endpointing_delay": db_config.get("stt_min_endpointing_delay", settings.stt_min_endpointing_delay),
        "llm_model":                 db_config.get("llm_model", settings.llm_model),
        "llm_provider":              db_config.get("llm_provider", settings.llm_provider),
        "tts_voice":                 db_config.get("tts_voice", settings.tts_voice),
        "tts_language":              db_config.get("tts_language", settings.tts_language),
        "tts_provider":              db_config.get("tts_provider", settings.tts_provider),
        "stt_provider":              db_config.get("stt_provider", settings.stt_provider),
        "stt_language":              db_config.get("stt_language", settings.stt_language),
        "lang_preset":               db_config.get("lang_preset", settings.lang_preset),
        "max_turns":                 db_config.get("max_turns", settings.max_turns),
        "first_line":                db_config.get("first_line", settings.first_line),
        "cal_event_type_id":         db_config.get("cal_event_type_id", settings.cal_event_type_id),
    }
    
    # Include the nested agency/sub_account naming metadata if it was joined in the SQL view
    if "sub_accounts" in db_config:
        resolved["sub_account_name"] = db_config["sub_accounts"].get("name")
        resolved["ghl_sub_account_id"] = db_config["sub_accounts"].get("ghl_sub_account_id")

    return resolved


# ══════════════════════════════════════════════════════════════════════════════
# Language Presets
# ══════════════════════════════════════════════════════════════════════════════

LANGUAGE_PRESETS: dict[str, dict[str, str]] = {
    "hinglish": {
        "label": "Hinglish (Hindi+English)",
        "tts_language": "hi-IN",
        "tts_voice": "kavya",
        "instruction": (
            "Speak in natural Hinglish — mix Hindi and English like educated "
            "Indians do. Default to Hindi but use English words when more natural."
        ),
    },
    "hindi": {
        "label": "Hindi",
        "tts_language": "hi-IN",
        "tts_voice": "ritu",
        "instruction": "Speak only in pure Hindi. Avoid English words wherever a Hindi equivalent exists.",
    },
    "english": {
        "label": "English (India)",
        "tts_language": "en-IN",
        "tts_voice": "dev",
        "instruction": "Speak only in Indian English with a warm, professional tone.",
    },
    "tamil": {
        "label": "Tamil",
        "tts_language": "ta-IN",
        "tts_voice": "priya",
        "instruction": "Speak only in Tamil. Use standard spoken Tamil for a professional context.",
    },
    "telugu": {
        "label": "Telugu",
        "tts_language": "te-IN",
        "tts_voice": "kavya",
        "instruction": "Speak only in Telugu. Use clear, polite spoken Telugu.",
    },
    "gujarati": {
        "label": "Gujarati",
        "tts_language": "gu-IN",
        "tts_voice": "rohan",
        "instruction": "Speak only in Gujarati. Use polite, professional Gujarati.",
    },
    "bengali": {
        "label": "Bengali",
        "tts_language": "bn-IN",
        "tts_voice": "neha",
        "instruction": "Speak only in Bengali (Bangla). Use standard, polite spoken Bengali.",
    },
    "marathi": {
        "label": "Marathi",
        "tts_language": "mr-IN",
        "tts_voice": "shubh",
        "instruction": "Speak only in Marathi. Use polite, standard spoken Marathi.",
    },
    "kannada": {
        "label": "Kannada",
        "tts_language": "kn-IN",
        "tts_voice": "rahul",
        "instruction": "Speak only in Kannada. Use clear, professional spoken Kannada.",
    },
    "malayalam": {
        "label": "Malayalam",
        "tts_language": "ml-IN",
        "tts_voice": "ritu",
        "instruction": "Speak only in Malayalam. Use polite, professional spoken Malayalam.",
    },
    "multilingual": {
        "label": "Multilingual (Auto)",
        "tts_language": "hi-IN",
        "tts_voice": "kavya",
        "instruction": (
            "Detect the caller's language from their first message and reply in that "
            "SAME language for the entire call. Supported: Hindi, Hinglish, English, "
            "Tamil, Telugu, Gujarati, Bengali, Marathi, Kannada, Malayalam. Switch if "
            "caller switches."
        ),
    },
}


def get_language_instruction(lang_preset: str) -> str:
    """Return the language directive prompt block for the given preset key."""
    preset = LANGUAGE_PRESETS.get(lang_preset, LANGUAGE_PRESETS["multilingual"])
    return f"\n\n[LANGUAGE DIRECTIVE]\n{preset['instruction']}"
