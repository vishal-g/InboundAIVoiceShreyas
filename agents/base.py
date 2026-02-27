"""
agents/base.py — Shared infrastructure for inbound and outbound agents.

Contains factory functions for building LLM / STT / TTS providers,
session construction, recording management, caller info extraction,
caller memory lookup, and the unified post-call shutdown hook.

Both ``agents/inbound.py`` and ``agents/outbound.py`` import from here.
"""

import asyncio
import json
import logging
import os
import re
import time
from datetime import datetime

import pytz
from livekit import api
from livekit.agents import Agent, AgentSession, JobContext, RoomInputOptions, llm
from livekit.plugins import openai, sarvam, silero

from core.config import get_live_config, get_language_instruction, get_settings
from services.notify import (
    notify_booking_confirmed,
    notify_booking_cancelled,
    notify_call_no_booking,
    notify_agent_error,
)
from agents.tools import AgentTools
from core.utils import count_tokens, get_ist_time_context, is_rate_limited

logger = logging.getLogger("agent-base")


# ══════════════════════════════════════════════════════════════════════════════
# Provider Factories
# ══════════════════════════════════════════════════════════════════════════════

def build_llm(provider: str, model: str):
    """
    Create an LLM instance based on the configured provider.

    Supports: openai, groq, claude.
    All providers use ``max_completion_tokens=120`` to keep voice responses short.
    """
    if provider == "groq":
        agent_llm = openai.LLM.with_groq(
            model=model or "llama-3.3-70b-versatile",
            max_completion_tokens=120,
        )
        logger.info(f"[LLM] Using Groq: {model}")
    elif provider == "claude":
        _anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
        agent_llm = openai.LLM(
            model=model or "claude-haiku-3-5-latest",
            base_url="https://api.anthropic.com/v1/",
            api_key=_anthropic_key,
            max_completion_tokens=120,
        )
        logger.info(f"[LLM] Using Claude via Anthropic: {model}")
    else:
        agent_llm = openai.LLM(model=model, max_completion_tokens=120)
        logger.info(f"[LLM] Using OpenAI: {model}")
    return agent_llm


def build_stt(provider: str, language: str):
    """
    Create an STT (speech-to-text) instance.

    Supports: sarvam (default), deepgram.
    Sarvam uses Saaras v3 at 16kHz; Deepgram uses Nova-2 multilingual.
    """
    if provider == "deepgram":
        try:
            from livekit.plugins import deepgram
            agent_stt = deepgram.STT(
                model="nova-2-general",
                language="multi",
                interim_results=False,
            )
            logger.info("[STT] Using Deepgram Nova-2")
            return agent_stt
        except ImportError:
            logger.warning("[STT] deepgram plugin not installed — falling back to Sarvam")

    agent_stt = sarvam.STT(
        language=language,        # "unknown" = auto-detect
        model="saaras:v3",
        mode="translate",
        flush_signal=True,
        sample_rate=16000,        # force 16kHz
    )
    logger.info("[STT] Using Sarvam Saaras v3")
    return agent_stt


def build_tts(provider: str, voice: str, language: str):
    """
    Create a TTS (text-to-speech) instance.

    Supports: sarvam (default), elevenlabs.
    Sarvam uses Bulbul v3 at 24kHz; ElevenLabs uses Turbo v2.5.
    """
    if provider == "elevenlabs":
        try:
            from livekit.plugins import elevenlabs
            _el_voice_id = os.environ.get("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
            agent_tts = elevenlabs.TTS(
                model="eleven_turbo_v2_5",
                voice_id=_el_voice_id,
            )
            logger.info(f"[TTS] Using ElevenLabs Turbo v2.5 — voice: {_el_voice_id}")
            return agent_tts
        except ImportError:
            logger.warning("[TTS] elevenlabs plugin not installed — falling back to Sarvam")

    agent_tts = sarvam.TTS(
        target_language_code=language,
        model="bulbul:v3",
        speaker=voice,
        speech_sample_rate=24000,   # force 24kHz
    )
    logger.info(f"[TTS] Using Sarvam Bulbul v3 — voice: {voice} lang: {language}")
    return agent_tts


# ══════════════════════════════════════════════════════════════════════════════
# Session Builder
# ══════════════════════════════════════════════════════════════════════════════

def build_session(stt, agent_llm, tts, delay: float) -> AgentSession:
    """
    Construct an ``AgentSession`` with STT turn detection and interruption support.

    Args:
        stt: Speech-to-text instance.
        agent_llm: Language model instance.
        tts: Text-to-speech instance.
        delay: Min endpointing delay in seconds (silence before responding).
    """
    return AgentSession(
        stt=stt,
        llm=agent_llm,
        tts=tts,
        turn_detection="stt",
        min_endpointing_delay=float(delay),
        allow_interruptions=True,
    )


def build_room_input_options() -> RoomInputOptions:
    """
    Build RoomInputOptions with optional BVC noise cancellation.

    Falls back gracefully if the noise cancellation plugin is not installed.
    """
    try:
        from livekit.agents import noise_cancellation as nc
        _noise_cancel = nc.BVC()
        logger.info("[AUDIO] BVC noise cancellation enabled")
        try:
            return RoomInputOptions(close_on_disconnect=False, noise_cancellation=_noise_cancel)
        except Exception:
            return RoomInputOptions(close_on_disconnect=False)
    except Exception:
        logger.info("[AUDIO] BVC not available — running without noise cancellation")
        return RoomInputOptions(close_on_disconnect=False)


# ══════════════════════════════════════════════════════════════════════════════
# Caller Info Extraction
# ══════════════════════════════════════════════════════════════════════════════

def extract_caller_info(ctx: JobContext) -> tuple[str, str, str | None]:
    """
    Extract caller phone number and name from the LiveKit room context.

    Checks (in order):
    1. Dispatch metadata (outbound calls)
    2. SIP participant attributes
    3. Participant identity (regex for phone number)

    Returns:
        (caller_phone, caller_name, raw_phone_number)
    """
    phone_number = None
    caller_name = ""

    # Try metadata first (outbound dispatch)
    metadata = ctx.job.metadata or ""
    if metadata:
        try:
            meta = json.loads(metadata)
            phone_number = meta.get("phone_number")
        except Exception:
            pass

    # Extract from SIP participants
    for identity, participant in ctx.room.remote_participants.items():
        if participant.name and participant.name not in ("", "Caller", "Unknown"):
            caller_name = participant.name
            logger.info(f"[CALLER-ID] Name from SIP: {caller_name}")
        if not phone_number:
            attr = participant.attributes or {}
            phone_number = attr.get("sip.phoneNumber") or attr.get("phoneNumber")
        if not phone_number and "+" in identity:
            m = re.search(r"\+\d{7,15}", identity)
            if m:
                phone_number = m.group()

    caller_phone = phone_number or "unknown"
    return caller_phone, caller_name, phone_number


# ══════════════════════════════════════════════════════════════════════════════
# Caller Memory
# ══════════════════════════════════════════════════════════════════════════════

async def get_caller_history(phone: str) -> str:
    """
    Look up the caller's last interaction from Supabase.

    Returns a system prompt fragment like:
    ``[CALLER HISTORY: Last call 2026-02-20. Summary: ...]``

    Returns empty string if no history found or Supabase is not configured.
    """
    if phone == "unknown":
        return ""
    try:
        from supabase import create_client
        sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
        result = (
            sb.table("call_logs")
            .select("summary, created_at")
            .eq("phone", phone)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            last = result.data[0]
            return (
                f"\n\n[CALLER HISTORY: Last call {last['created_at'][:10]}. "
                f"Summary: {last['summary']}]"
            )
    except Exception as e:
        logger.warning(f"[MEMORY] Could not load history: {e}")
    return ""


# ══════════════════════════════════════════════════════════════════════════════
# Recording
# ══════════════════════════════════════════════════════════════════════════════

async def start_recording(ctx: JobContext) -> str | None:
    """
    Start S3-backed room recording via LiveKit Egress.

    Records audio-only in OGG format to the ``call-recordings`` Supabase bucket.
    Returns the egress_id on success, or None if recording fails/times out.
    """
    try:
        rec_api = api.LiveKitAPI(
            url=os.environ["LIVEKIT_URL"],
            api_key=os.environ["LIVEKIT_API_KEY"],
            api_secret=os.environ["LIVEKIT_API_SECRET"],
        )
        egress_resp = await asyncio.wait_for(
            rec_api.egress.start_room_composite_egress(
                api.RoomCompositeEgressRequest(
                    room_name=ctx.room.name,
                    audio_only=True,
                    file_outputs=[
                        api.EncodedFileOutput(
                            file_type=api.EncodedFileType.OGG,
                            filepath=f"recordings/{ctx.room.name}.ogg",
                            s3=api.S3Upload(
                                access_key=os.environ["SUPABASE_S3_ACCESS_KEY"],
                                secret=os.environ["SUPABASE_S3_SECRET_KEY"],
                                bucket="call-recordings",
                                region=os.environ.get("SUPABASE_S3_REGION", "ap-south-1"),
                                endpoint=os.environ["SUPABASE_S3_ENDPOINT"],
                                force_path_style=True,
                            ),
                        )
                    ],
                )
            ),
            timeout=10.0,
        )
        egress_id = egress_resp.egress_id
        await rec_api.aclose()
        logger.info(f"[RECORDING] Started egress: {egress_id}")
        return egress_id
    except asyncio.TimeoutError:
        logger.warning("[RECORDING] Egress start timed out after 10s — skipping recording")
    except Exception as e:
        logger.warning(f"[RECORDING] Failed to start recording: {e}")
    return None


async def stop_recording(egress_id: str, room_name: str) -> str:
    """
    Stop a running egress and return the public recording URL.

    Returns empty string if stopping fails.
    """
    try:
        stop_api = api.LiveKitAPI(
            url=os.environ["LIVEKIT_URL"],
            api_key=os.environ["LIVEKIT_API_KEY"],
            api_secret=os.environ["LIVEKIT_API_SECRET"],
        )
        await stop_api.egress.stop_egress(api.StopEgressRequest(egress_id=egress_id))
        await stop_api.aclose()
        recording_url = (
            f"{os.environ.get('SUPABASE_URL', '')}/storage/v1/object/public/"
            f"call-recordings/recordings/{room_name}.ogg"
        )
        logger.info(f"[RECORDING] Stopped. URL: {recording_url}")
        return recording_url
    except Exception as e:
        logger.warning(f"[RECORDING] Stop failed: {e}")
        return ""


# ══════════════════════════════════════════════════════════════════════════════
# Active call tracking
# ══════════════════════════════════════════════════════════════════════════════

async def upsert_active_call(
    room_name: str, caller_phone: str, caller_name: str, status: str
) -> None:
    """Upsert the active_calls table in Supabase for live call tracking."""
    try:
        from supabase import create_client
        sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
        sb.table("active_calls").upsert({
            "room_id": room_name,
            "phone": caller_phone,
            "caller_name": caller_name,
            "status": status,
            "last_updated": datetime.utcnow().isoformat(),
        }).execute()
    except Exception as e:
        logger.debug(f"[ACTIVE-CALL] {e}")


# ══════════════════════════════════════════════════════════════════════════════
# Real-time transcript logging
# ══════════════════════════════════════════════════════════════════════════════

async def log_transcript_entry(
    room_name: str, caller_phone: str, role: str, content: str
) -> None:
    """Write a single transcript line to the call_transcripts table."""
    try:
        from supabase import create_client
        sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
        sb.table("call_transcripts").insert({
            "call_room_id": room_name,
            "phone": caller_phone,
            "role": role,
            "content": content,
        }).execute()
    except Exception as e:
        logger.debug(f"[TRANSCRIPT-STREAM] {e}")


# ══════════════════════════════════════════════════════════════════════════════
# Speech event constants
# ══════════════════════════════════════════════════════════════════════════════

FILLER_WORDS: set[str] = {
    "okay.", "okay", "ok", "uh", "hmm", "hm", "yeah", "yes",
    "no", "um", "ah", "oh", "right", "sure", "fine", "good",
    "haan", "han", "theek", "theek hai", "accha", "ji", "ha",
}


# ══════════════════════════════════════════════════════════════════════════════
# TTS sentence chunker
# ══════════════════════════════════════════════════════════════════════════════

def before_tts_cb(agent_response: str) -> str:
    """Truncate agent response to the first sentence for natural voice pacing."""
    sentences = re.split(r'(?<=[।.!?])\s+', agent_response.strip())
    return sentences[0] if sentences else agent_response


# ══════════════════════════════════════════════════════════════════════════════
# Unified Shutdown Hook
# ══════════════════════════════════════════════════════════════════════════════

async def unified_shutdown_hook(
    ctx: JobContext,
    agent: Agent,
    agent_tools: AgentTools,
    call_start_time: datetime,
    tts_voice: str,
    egress_id: str | None,
    interrupt_count: int,
    caller_phone: str,
    caller_name: str,
) -> None:
    """
    Post-call cleanup — called when the participant disconnects or agent shuts down.

    Performs (in order):
    1. Create Cal.com/Google Calendar booking if intent was saved
    2. Send Telegram/WhatsApp notifications
    3. Build transcript from chat context
    4. Run sentiment analysis via OpenAI
    5. Estimate call cost
    6. Stop recording egress
    7. Send n8n webhook
    8. Save call log to Supabase
    """
    duration = int((datetime.now() - call_start_time).total_seconds())

    # ── 1. Booking ────────────────────────────────────────────────────────
    booking_status_msg = "No booking"
    if agent_tools.booking_intent:
        from services.calendar_tools import async_create_booking
        intent = agent_tools.booking_intent
        result = await async_create_booking(
            start_time=intent["start_time"],
            caller_name=intent["caller_name"] or "Unknown Caller",
            caller_phone=intent["caller_phone"],
            notes=intent.get("notes", ""),
            caller_email=intent.get("caller_email", ""),
        )
        if result.get("success"):
            notify_booking_confirmed(
                caller_name=intent["caller_name"],
                caller_phone=intent["caller_phone"],
                booking_time_iso=intent["start_time"],
                booking_id=result.get("booking_id"),
                notes=intent["notes"],
                tts_voice=tts_voice,
                ai_summary="",
            )
            booking_status_msg = f"Booking Confirmed: {result.get('booking_id')}"
        else:
            booking_status_msg = f"Booking Failed: {result.get('message')}"
    else:
        notify_call_no_booking(
            caller_name=agent_tools.caller_name,
            caller_phone=agent_tools.caller_phone,
            call_summary="Caller did not schedule during this call.",
            tts_voice=tts_voice,
            duration_seconds=duration,
        )

    # ── 2. Build transcript ───────────────────────────────────────────────
    transcript_text = ""
    try:
        messages = agent.chat_ctx.messages
        if callable(messages):
            messages = messages()
        lines = []
        for msg in messages:
            if getattr(msg, "role", None) in ("user", "assistant"):
                content = getattr(msg, "content", "")
                if isinstance(content, list):
                    content = " ".join(str(c) for c in content if isinstance(c, str))
                lines.append(f"[{msg.role.upper()}] {content}")
        transcript_text = "\n".join(lines)
    except Exception as e:
        logger.error(f"[SHUTDOWN] Transcript read failed: {e}")
        transcript_text = "unavailable"

    # ── 3. Sentiment analysis ─────────────────────────────────────────────
    sentiment = "unknown"
    if transcript_text and transcript_text != "unavailable":
        try:
            import openai as _oai
            _client = _oai.AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
            resp = await _client.chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=5,
                messages=[{
                    "role": "user",
                    "content": (
                        "Classify this call as one word: positive, neutral, "
                        f"negative, or frustrated.\n\n{transcript_text[:800]}"
                    ),
                }],
            )
            sentiment = resp.choices[0].message.content.strip().lower()
            logger.info(f"[SENTIMENT] {sentiment}")
        except Exception as e:
            logger.warning(f"[SENTIMENT] Failed: {e}")

    # ── 4. Cost estimation ────────────────────────────────────────────────
    def _estimate_cost(dur: int, chars: int) -> float:
        return round(
            (dur / 60) * 0.002
            + (dur / 60) * 0.006
            + (chars / 1000) * 0.003
            + (chars / 4000) * 0.0001,
            5,
        )

    estimated_cost = _estimate_cost(duration, len(transcript_text))
    logger.info(f"[COST] Estimated: ${estimated_cost}")

    # ── 5. Analytics timestamps ───────────────────────────────────────────
    ist = pytz.timezone("Asia/Kolkata")
    call_dt = call_start_time.astimezone(ist)

    # ── 6. Stop recording ─────────────────────────────────────────────────
    recording_url = ""
    if egress_id:
        recording_url = await stop_recording(egress_id, ctx.room.name)

    # ── 7. Update active_calls ────────────────────────────────────────────
    await upsert_active_call(ctx.room.name, caller_phone, caller_name, "completed")

    # ── 8. n8n webhook ────────────────────────────────────────────────────
    _n8n_url = os.getenv("N8N_WEBHOOK_URL")
    if _n8n_url:
        try:
            import httpx
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: httpx.post(
                    _n8n_url,
                    json={
                        "event": "call_completed",
                        "phone": caller_phone,
                        "caller_name": agent_tools.caller_name,
                        "duration": duration,
                        "booked": bool(agent_tools.booking_intent),
                        "sentiment": sentiment,
                        "summary": booking_status_msg,
                        "recording_url": recording_url,
                        "interrupt_count": interrupt_count,
                    },
                    timeout=5.0,
                ),
            )
            logger.info("[N8N] Webhook triggered")
        except Exception as e:
            logger.warning(f"[N8N] Webhook failed: {e}")

    # ── 9. Save to Supabase ───────────────────────────────────────────────
    logger.info(f"[SHUTDOWN] Saving call log for {caller_phone} (duration={duration}s)")
    try:
        from services.db import save_call_log
        result = save_call_log(
            phone=caller_phone,
            duration=duration,
            transcript=transcript_text,
            summary=booking_status_msg,
            recording_url=recording_url,
            caller_name=agent_tools.caller_name or "",
            sentiment=sentiment,
            estimated_cost_usd=estimated_cost,
            call_date=call_dt.date().isoformat(),
            call_hour=call_dt.hour,
            call_day_of_week=call_dt.strftime("%A"),
            was_booked=bool(agent_tools.booking_intent),
            interrupt_count=interrupt_count,
        )
        logger.info(f"[SHUTDOWN] save_call_log result: {result}")
    except Exception as e:
        logger.error(f"[SHUTDOWN] save_call_log EXCEPTION: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# Env-var override helper
# ══════════════════════════════════════════════════════════════════════════════

ENV_KEYS_TO_OVERRIDE = [
    "LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET",
    "OPENAI_API_KEY", "SARVAM_API_KEY", "CAL_API_KEY",
    "TELEGRAM_BOT_TOKEN", "SUPABASE_URL", "SUPABASE_KEY",
    "SUPABASE_S3_ACCESS_KEY", "SUPABASE_S3_SECRET_KEY",
    "SUPABASE_S3_ENDPOINT", "SUPABASE_S3_REGION",
    "CAL_EVENT_TYPE_ID", "TELEGRAM_CHAT_ID",
]


def apply_config_env_overrides(live_config: dict) -> None:
    """Push config.json values into os.environ so downstream libs pick them up."""
    for key in ENV_KEYS_TO_OVERRIDE:
        val = live_config.get(key.lower(), "")
        if val:
            os.environ[key] = val
