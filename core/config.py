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

CONFIG_FILE = "config.json"


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
# config.json helpers (dashboard-editable settings)
# ══════════════════════════════════════════════════════════════════════════════

def read_config_json() -> dict[str, Any]:
    """
    Read config.json and merge with env-based defaults for the dashboard UI.

    Returns a dict with resolved values: config.json takes precedence over
    .env for keys present in both.
    """
    config: dict[str, Any] = {}
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                config = json.load(f)
        except Exception as e:
            logger.error(f"[CONFIG] Failed to read {CONFIG_FILE}: {e}")

    settings = get_settings()

    def _val(key: str, env_key: str, default: Any = "") -> Any:
        """config.json value if present, else env var, else default."""
        return config.get(key) if config.get(key) else getattr(settings, env_key.lower(), default)

    resolved: dict[str, Any] = {
        "first_line":                _val("first_line", "FIRST_LINE", settings.first_line),
        "agent_instructions":        _val("agent_instructions", "AGENT_INSTRUCTIONS", ""),
        "stt_min_endpointing_delay": float(_val("stt_min_endpointing_delay", "STT_MIN_ENDPOINTING_DELAY", 0.6)),
        "llm_model":                 _val("llm_model", "LLM_MODEL", "gpt-4o-mini"),
        "tts_voice":                 _val("tts_voice", "TTS_VOICE", "kavya"),
        "tts_language":              _val("tts_language", "TTS_LANGUAGE", "hi-IN"),
        "livekit_url":               _val("livekit_url", "LIVEKIT_URL", ""),
        "sip_trunk_id":              _val("sip_trunk_id", "SIP_TRUNK_ID", ""),
        "livekit_api_key":           _val("livekit_api_key", "LIVEKIT_API_KEY", ""),
        "livekit_api_secret":        _val("livekit_api_secret", "LIVEKIT_API_SECRET", ""),
        "openai_api_key":            _val("openai_api_key", "OPENAI_API_KEY", ""),
        "sarvam_api_key":            _val("sarvam_api_key", "SARVAM_API_KEY", ""),
        "cal_api_key":               _val("cal_api_key", "CAL_API_KEY", ""),
        "cal_event_type_id":         _val("cal_event_type_id", "CAL_EVENT_TYPE_ID", ""),
        "telegram_bot_token":        _val("telegram_bot_token", "TELEGRAM_BOT_TOKEN", ""),
        "telegram_chat_id":          _val("telegram_chat_id", "TELEGRAM_CHAT_ID", ""),
        "supabase_url":              _val("supabase_url", "SUPABASE_URL", ""),
        "supabase_key":              _val("supabase_key", "SUPABASE_KEY", ""),
    }
    # Merge extra config.json keys without overwriting resolved values
    for k, v in config.items():
        if k not in resolved:
            resolved[k] = v
    return resolved


def write_config_json(data: dict[str, Any]) -> None:
    """Merge new data into config.json and save."""
    config = read_config_json()
    config.update(data)
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=4)


# ══════════════════════════════════════════════════════════════════════════════
# Live config (used by agent at call time)
# ══════════════════════════════════════════════════════════════════════════════

def get_live_config(phone_number: str | None = None) -> dict[str, Any]:
    """
    Load agent config — tries per-client file first, then default, then config.json.

    Merge chain:
        1. ``configs/{phone}.json`` (if exists)
        2. ``configs/default.json`` (if exists)
        3. ``config.json``

    Returns a dict with all resolved settings.
    """
    config: dict[str, Any] = {}
    paths: list[str] = []

    if phone_number and phone_number != "unknown":
        clean = phone_number.replace("+", "").replace(" ", "")
        paths.append(f"configs/{clean}.json")
    paths += ["configs/default.json", CONFIG_FILE]

    for path in paths:
        if os.path.exists(path):
            try:
                with open(path, "r") as f:
                    config = json.load(f)
                    logger.info(f"[CONFIG] Loaded: {path}")
                    break
            except Exception as e:
                logger.error(f"[CONFIG] Failed to read {path}: {e}")

    settings = get_settings()
    resolved: dict[str, Any] = {
        "agent_instructions":        config.get("agent_instructions", settings.agent_instructions),
        "stt_min_endpointing_delay": config.get("stt_min_endpointing_delay", settings.stt_min_endpointing_delay),
        "llm_model":                 config.get("llm_model", settings.llm_model),
        "llm_provider":              config.get("llm_provider", settings.llm_provider),
        "tts_voice":                 config.get("tts_voice", settings.tts_voice),
        "tts_language":              config.get("tts_language", settings.tts_language),
        "tts_provider":              config.get("tts_provider", settings.tts_provider),
        "stt_provider":              config.get("stt_provider", settings.stt_provider),
        "stt_language":              config.get("stt_language", settings.stt_language),
        "lang_preset":               config.get("lang_preset", settings.lang_preset),
        "max_turns":                 config.get("max_turns", settings.max_turns),
        "first_line":                config.get("first_line", settings.first_line),
    }
    # Merge extra config keys
    for k, v in config.items():
        if k not in resolved:
            resolved[k] = v
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
