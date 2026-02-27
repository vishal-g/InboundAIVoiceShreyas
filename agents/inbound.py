"""
agents/inbound.py — Inbound voice agent.

Handles incoming calls from SIP. The agent greets the caller, answers
questions, checks availability, and books appointments.

Registered as ``agent_name="inbound-agent"`` in the LiveKit worker.
"""

import asyncio
import logging
from datetime import datetime

from livekit.agents import Agent, AgentSession, JobContext, llm

from agents.base import (
    FILLER_WORDS,
    apply_config_env_overrides,
    build_llm,
    build_room_input_options,
    build_session,
    build_stt,
    build_tts,
    extract_caller_info,
    get_caller_history,
    log_transcript_entry,
    start_recording,
    unified_shutdown_hook,
    upsert_active_call,
)
from config import get_language_instruction, get_live_config
from tools import AgentTools
from utils import count_tokens, get_ist_time_context, is_rate_limited

logger = logging.getLogger("inbound-agent")


# ══════════════════════════════════════════════════════════════════════════════
# Inbound Agent Class
# ══════════════════════════════════════════════════════════════════════════════

class InboundAssistant(Agent):
    """
    AI assistant for inbound calls.

    Greets the caller with the configured first line, answers questions
    about the business, checks calendar availability, and books appointments.
    """

    def __init__(
        self,
        agent_tools: AgentTools,
        first_line: str = "",
        live_config: dict | None = None,
    ):
        tools = llm.find_function_tools(agent_tools)
        self._first_line = first_line
        self._live_config = live_config or {}

        # Build system prompt
        base_instructions = self._live_config.get("agent_instructions", "")
        ist_context = get_ist_time_context()
        lang_preset = self._live_config.get("lang_preset", "multilingual")
        lang_instruction = get_language_instruction(lang_preset)
        final_instructions = base_instructions + ist_context + lang_instruction

        # Token budget check
        token_count = count_tokens(final_instructions)
        logger.info(f"[PROMPT] System prompt: {token_count} tokens")
        if token_count > 600:
            logger.warning("[PROMPT] Prompt exceeds 600 tokens — consider trimming for latency")

        super().__init__(instructions=final_instructions, tools=tools)

    async def on_enter(self):
        """Deliver the configured greeting when the agent joins the call."""
        greeting = self._live_config.get(
            "first_line",
            self._first_line
            or (
                "Namaste! This is Aryan from RapidX AI — we help businesses "
                "automate with AI. Hmm, may I ask what kind of business you run?"
            ),
        )
        logger.info("[AGENT] on_enter() — generating inbound greeting...")
        await self.session.generate_reply(
            instructions=f"Say exactly this phrase: '{greeting}'"
        )
        logger.info("[AGENT] on_enter() greeting complete")


# ══════════════════════════════════════════════════════════════════════════════
# Inbound Entrypoint
# ══════════════════════════════════════════════════════════════════════════════

# Global speaking state (used by filler / echo filters)
_agent_is_speaking = False


async def inbound_entrypoint(ctx: JobContext) -> None:
    """
    LiveKit entrypoint for inbound calls.

    Lifecycle:
    1. Connect to room, extract caller info
    2. Load config, build STT/LLM/TTS
    3. Start recording + session
    4. Register speech handlers (filler filter, turn counter, transcript logging)
    5. Shutdown hook: booking, transcript, sentiment, save to DB
    """
    global _agent_is_speaking

    # ── Connect + extract caller ──────────────────────────────────────────
    await ctx.connect()
    logger.info(f"[ROOM] Connected: {ctx.room.name}")
    logger.info(f"[ROOM] Job metadata: {ctx.job.metadata}")

    caller_phone, caller_name, raw_phone = extract_caller_info(ctx)
    logger.info(f"[CALLER] Phone: {caller_phone} | Name: {caller_name} | Raw: {raw_phone}")

    if is_rate_limited(caller_phone):
        logger.warning(f"[RATE-LIMIT] Blocked {caller_phone}")
        return

    # ── Config ────────────────────────────────────────────────────────────
    live_config = get_live_config(caller_phone)
    apply_config_env_overrides(live_config)

    tts_voice = live_config.get("tts_voice", "kavya")
    tts_language = live_config.get("tts_language", "hi-IN")
    max_turns = live_config.get("max_turns", 25)
    logger.info(f"[CONFIG] LLM={live_config.get('llm_model')} | STT={live_config.get('stt_provider')} | TTS={tts_voice}/{tts_language} | MaxTurns={max_turns}")
    logger.info(f"[CONFIG] First line: {live_config.get('first_line', '(default)')}")

    # ── Caller memory ────────────────────────────────────────────────────
    history = await get_caller_history(caller_phone)
    if history:
        logger.info(f"[MEMORY] Loaded history for {caller_phone}: {history[:100]}...")
        live_config["agent_instructions"] = live_config.get("agent_instructions", "") + history
    else:
        logger.info(f"[MEMORY] No history found for {caller_phone}")

    # ── Tools ─────────────────────────────────────────────────────────────
    agent_tools = AgentTools(caller_phone=caller_phone, caller_name=caller_name)
    agent_tools._sip_identity = (
        f"sip_{caller_phone.replace('+', '')}" if raw_phone else "inbound_caller"
    )
    agent_tools.ctx_api = ctx.api
    agent_tools.room_name = ctx.room.name
    logger.info(f"[TOOLS] AgentTools initialized for {caller_phone}")

    # ── Providers ─────────────────────────────────────────────────────────
    agent_llm = build_llm(
        live_config.get("llm_provider", "openai"),
        live_config.get("llm_model", "gpt-4o-mini"),
    )
    agent_stt = build_stt(
        live_config.get("stt_provider", "sarvam"),
        live_config.get("stt_language", "unknown"),
    )
    agent_tts = build_tts(
        live_config.get("tts_provider", "sarvam"),
        tts_voice,
        tts_language,
    )

    # ── Agent + session ───────────────────────────────────────────────────
    agent = InboundAssistant(
        agent_tools=agent_tools,
        first_line=live_config.get("first_line", ""),
        live_config=live_config,
    )
    session = build_session(
        agent_stt, agent_llm, agent_tts,
        live_config.get("stt_min_endpointing_delay", 0.05),
    )
    room_input = build_room_input_options()

    logger.info("[SESSION] Starting session.start()...")
    try:
        await asyncio.wait_for(
            session.start(room=ctx.room, agent=agent, room_input_options=room_input),
            timeout=30.0,
        )
        logger.info("[SESSION] session.start() completed")
    except asyncio.TimeoutError:
        logger.error("[SESSION] session.start() timed out after 30s!")
        return

    # TTS pre-warm
    try:
        await asyncio.wait_for(session.tts.prewarm(), timeout=5.0)
        logger.info("[TTS] Pre-warmed successfully")
    except asyncio.TimeoutError:
        logger.warning("[TTS] Pre-warm timed out")
    except Exception as e:
        logger.debug(f"[TTS] Pre-warm skipped: {e}")

    logger.info("[AGENT] Session live — waiting for caller audio.")
    call_start_time = datetime.now()

    # ── Recording ─────────────────────────────────────────────────────────
    logger.info(f"[RECORDING] Attempting to start recording for room {ctx.room.name}...")
    egress_id = await start_recording(ctx)
    if egress_id:
        logger.info(f"[RECORDING] ✅ Recording active — egress_id: {egress_id}")
    else:
        logger.warning("[RECORDING] ⚠️  Recording NOT started — check S3/Supabase config")
    await upsert_active_call(ctx.room.name, caller_phone, caller_name, "active")

    # ── Event handlers ────────────────────────────────────────────────────
    turn_count = 0
    interrupt_count = 0
    _shutdown_done = False

    @session.on("agent_speech_started")
    def _on_speech_started(ev):
        global _agent_is_speaking
        _agent_is_speaking = True

    @session.on("agent_speech_finished")
    def _on_speech_finished(ev):
        global _agent_is_speaking
        _agent_is_speaking = False

    @session.on("agent_speech_interrupted")
    def _on_interrupted(ev):
        nonlocal interrupt_count
        interrupt_count += 1
        logger.info(f"[INTERRUPT] Total: {interrupt_count}")

    @session.on("user_speech_committed")
    def on_user_speech(ev):
        nonlocal turn_count
        global _agent_is_speaking

        transcript = ev.user_transcript.strip()
        transcript_lower = transcript.lower().rstrip(".")

        if _agent_is_speaking:
            logger.debug(f"[FILTER-ECHO] Dropped: '{transcript}'")
            return
        if not transcript or len(transcript) < 3:
            return
        if transcript_lower in FILLER_WORDS:
            logger.debug(f"[FILTER-FILLER] Dropped: '{transcript}'")
            return

        asyncio.create_task(
            log_transcript_entry(ctx.room.name, caller_phone, "user", transcript)
        )

        turn_count += 1
        logger.info(f"[USER] Turn {turn_count}/{max_turns}: '{transcript}'")
        if turn_count >= max_turns:
            logger.info(f"[LIMIT] Reached {max_turns} turns — wrapping up")
            asyncio.create_task(
                session.generate_reply(
                    instructions=(
                        "Politely wrap up: thank the caller, say they can "
                        "call back anytime, and say a warm goodbye."
                    )
                )
            )

    @ctx.room.on("participant_disconnected")
    def on_disconnect(participant):
        global _agent_is_speaking
        logger.info(f"[HANGUP] Disconnected: {participant.identity}")
        _agent_is_speaking = False
        asyncio.create_task(_do_shutdown(ctx))

    async def _do_shutdown(shutdown_ctx):
        nonlocal _shutdown_done
        if _shutdown_done:
            return
        _shutdown_done = True
        duration = int((datetime.now() - call_start_time).total_seconds())
        logger.info(f"[SHUTDOWN] ═══ Inbound call shutdown ═══")
        logger.info(f"[SHUTDOWN] Phone: {caller_phone} | Duration: {duration}s | Turns: {turn_count} | Interrupts: {interrupt_count}")
        logger.info(f"[SHUTDOWN] Booking intent: {bool(agent_tools.booking_intent)}")
        logger.info(f"[SHUTDOWN] Egress ID: {egress_id or 'none'}")
        await unified_shutdown_hook(
            ctx=shutdown_ctx,
            agent=agent,
            agent_tools=agent_tools,
            call_start_time=call_start_time,
            tts_voice=tts_voice,
            egress_id=egress_id,
            interrupt_count=interrupt_count,
            caller_phone=caller_phone,
            caller_name=caller_name,
        )
        logger.info(f"[SHUTDOWN] ═══ Shutdown complete ═══")

    ctx.add_shutdown_callback(_do_shutdown)
