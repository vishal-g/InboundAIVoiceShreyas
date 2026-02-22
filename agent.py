import json
import logging
import os
import certifi
from datetime import datetime
from dotenv import load_dotenv

# Fix for macOS SSL certificate verification
os.environ["SSL_CERT_FILE"] = certifi.where()

from livekit import api
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    RoomInputOptions,
    WorkerOptions,
    cli,
    llm,
)
from livekit.plugins import openai, sarvam
from typing import Annotated

CONFIG_FILE = "config.json"

def get_live_config():
    """Reads the latest config.json to inject dynamic prompts and VAD tuning."""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read config.json, falling back: {e}")
            
    return {
        "agent_instructions": "You are a helpful assistant.",
        "stt_min_endpointing_delay": 0.6
    }

from calendar_tools import get_available_slots, create_booking, cancel_booking
from notify import (
    notify_booking_confirmed,
    notify_booking_cancelled,
    notify_call_no_booking,
    notify_agent_error,
)

load_dotenv()
logger = logging.getLogger("outbound-agent")
logging.basicConfig(level=logging.INFO)


# ══════════════════════════════════════════════════════════════════════════════
# TOOL CONTEXT — All AI-callable functions
# ══════════════════════════════════════════════════════════════════════════════

class AgentTools(llm.ToolContext):

    def __init__(self, sip_participant_identity: str, caller_phone: str):
        super().__init__(tools=[])
        self._sip_identity          = sip_participant_identity
        self._caller_phone          = caller_phone

        # ── State tracked across the call ──────────────────────────────────
        self._caller_name           = "Unknown"
        self._available_slots       = []       # Slots returned by check_availability
        self._last_booking_id       = None     # Set when booking succeeds
        self._last_booking_time     = None     # ISO string of the booked slot
        self._last_booking_notes    = ""       # Any notes from the caller
        self._booking_was_cancelled = False    # True if caller cancelled during call
        self.sip_domain             = os.getenv("VOBIZ_SIP_DOMAIN")
        self.ctx_api                = None
        self.room_name              = None


    # ── Tool 1: Transfer to Human ──────────────────────────────────────────

    @llm.function_tool(
        description=(
            "Transfer this call to a human agent immediately. "
            "Use this if: the caller explicitly asks for a human, "
            "the caller is angry or frustrated, or the query is outside your scope."
        )
    )
    async def transfer_call(self):
        logger.info("[TOOL] transfer_call triggered")
        destination = os.getenv("DEFAULT_TRANSFER_NUMBER")
            
        if destination and self.sip_domain and "@" not in destination:
            clean_dest = destination.replace("tel:", "").replace("sip:", "")
            destination = f"sip:{clean_dest}@{self.sip_domain}"
        
        if destination and not destination.startswith("sip:"):
            destination = f"sip:{destination}"
            
        try:
            if self.ctx_api and self.room_name and destination:
                await self.ctx_api.sip.transfer_sip_participant(
                    api.TransferSIPParticipantRequest(
                        room_name=self.room_name,
                        participant_identity=self._sip_identity,
                        transfer_to=destination,
                        play_dialtone=False
                    )
                )
                return "Transfer initiated successfully."
            else:
                return "I'm having trouble transferring right now. Please hold on."
        except Exception as e:
            logger.error(f"Transfer failed: {e}")
            return "I'm having trouble transferring right now. Please hold on."


    # ── Tool 2: Check Availability ─────────────────────────────────────────

    @llm.function_tool(
        description=(
            "Check available appointment slots for a specific date. "
            "Always call this BEFORE booking — never assume a slot is free. "
            "Ask the caller for their preferred date first, then call this."
        )
    )
    async def check_availability(
        self,
        date: Annotated[str, "Date in YYYY-MM-DD format. Convert spoken dates like 'tomorrow' or 'next Monday' to this format before calling."]
    ):
        logger.info(f"[TOOL] check_availability: {date}")
        slots = get_available_slots(date)
        self._available_slots = slots

        if not slots:
            return (
                f"I'm sorry, there are no available slots on {date}. "
                "Would you like me to check a different date?"
            )

        # Read out max 5 slots to keep it conversational
        labels = [s["label"] for s in slots[:5]]
        slot_str = ", ".join(labels[:-1]) + f" and {labels[-1]}" if len(labels) > 1 else labels[0]
        return (
            f"On {date}, I have slots available at {slot_str}. "
            "Which time works best for you?"
        )


    # ── Tool 3: Book Appointment ───────────────────────────────────────────

    @llm.function_tool(
        description=(
            "Book an appointment slot. "
            "ONLY call this after: (1) availability has been checked, "
            "(2) the caller has chosen a specific time, "
            "(3) you have confirmed their name, "
            "(4) the caller has said YES to a confirmation question like "
            "'Just to confirm — [Name] on [Date] at [Time] — is that correct?'. "
            "Never book without explicit caller confirmation."
        )
    )
    async def book_appointment(
        self,
        caller_name: Annotated[str, "Full name of the caller as they stated it."],
        start_time: Annotated[str, "The exact ISO 8601 start time with IST offset. Match this against the slots returned by check_availability. Example: '2026-02-24T10:00:00+05:30'"],
        notes: Annotated[str, "Any relevant notes the caller mentioned — reason for appointment, service needed, etc."] = "",
    ):
        logger.info(f"[TOOL] book_appointment: {caller_name} at {start_time}")

        # Update state before API call
        self._caller_name        = caller_name
        self._last_booking_time  = start_time
        self._last_booking_notes = notes

        result = create_booking(
            start_time=start_time,
            caller_name=caller_name,
            caller_phone=self._caller_phone,
            notes=notes,
        )

        if result["success"]:
            self._last_booking_id = result["booking_id"]

            # Build a human-readable time for the voice response
            try:
                dt = datetime.fromisoformat(start_time)
                readable = dt.strftime("%A, %d %B at %-I:%M %p")
            except Exception:
                readable = start_time

            # Immediately send Telegram notification on booking success
            notify_booking_confirmed(
                caller_name=caller_name,
                caller_phone=self._caller_phone,
                booking_time_iso=start_time,
                booking_id=result["booking_id"],
                notes=notes,
            )

            return (
                f"Your appointment is confirmed! "
                f"{caller_name}, you're booked for {readable}. "
                "You'll receive a confirmation shortly. "
                "Is there anything else I can help you with?"
            )
        else:
            return (
                f"I wasn't able to complete the booking — {result['message']}. "
                "Would you like to try a different time slot?"
            )


    # ── Tool 4: Cancel Appointment ─────────────────────────────────────────

    @llm.function_tool(
        description=(
            "Cancel the appointment that was booked during THIS call. "
            "Use this if the caller changes their mind after booking. "
            "Only works if a booking was already made in this session."
        )
    )
    async def cancel_appointment(
        self,
        reason: Annotated[str, "Reason for cancellation as stated by the caller."] = "Caller changed their mind",
    ):
        logger.info(f"[TOOL] cancel_appointment: reason={reason}")

        if not self._last_booking_id:
            return "I don't have an active booking from this call to cancel."

        result = cancel_booking(self._last_booking_id, reason)

        if result["success"]:
            # Notify on cancellation too
            notify_booking_cancelled(
                caller_name=self._caller_name,
                caller_phone=self._caller_phone,
                booking_id=self._last_booking_id,
                reason=reason,
            )
            self._last_booking_id       = None
            self._last_booking_time     = None
            self._booking_was_cancelled = True
            return (
                "No problem — I've cancelled your booking. "
                "Would you like to reschedule for another time?"
            )
        else:
            return (
                f"I couldn't cancel the booking right now: {result['message']}. "
                "You can also cancel using the link in your confirmation email."
            )


# ══════════════════════════════════════════════════════════════════════════════
# SARVAM-POWERED VOICE AGENT
# ══════════════════════════════════════════════════════════════════════════════

class OutboundAssistant(Agent):

    def __init__(self, agent_tools: AgentTools):
        tools = llm.find_function_tools(agent_tools)
        # Load the latest prompt from the UI dashboard config
        live_config = get_live_config()
        
        super().__init__(
            instructions=live_config.get("agent_instructions", ""),
            tools=tools,
        )

    async def on_enter(self):
        await self.session.generate_reply(
            instructions="Say exactly this phrase without any extra thinking: 'Namaste! Welcome to our Med Spa. Main aapki kaise madad kar sakti hoon? I can answer questions about our treatments or help you book an appointment.'"
        )


# ══════════════════════════════════════════════════════════════════════════════
# JOB ENTRYPOINT
# ══════════════════════════════════════════════════════════════════════════════

async def entrypoint(ctx: JobContext):
    logger.info(f"[JOB] id={ctx.job.id}")
    logger.info(f"[JOB] raw metadata='{ctx.job.metadata}'")

    # ── Parse metadata ─────────────────────────────────────────────────────
    phone_number = None
    call_type    = "inbound"
    raw_meta     = ctx.job.metadata or ""

    if raw_meta.strip():
        try:
            meta = json.loads(raw_meta)
            phone_number = (
                meta.get("phone_number")
                or meta.get("to")
                or meta.get("destination")
            )
            if phone_number:
                call_type = "outbound"
                logger.info(f"[CALL] Outbound → {phone_number}")
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"[METADATA] Parse error: {e} — treating as inbound")

    # ── Connect to LiveKit room ────────────────────────────────────────────
    await ctx.connect()
    logger.info(f"[ROOM] Connected: {ctx.room.name}")

    # ── Outbound: dial via Vobiz SIP trunk ────────────────────────────────
    if call_type == "outbound" and phone_number:
        try:
            lk_api = api.LiveKitAPI(
                url=os.environ["LIVEKIT_URL"],
                api_key=os.environ["LIVEKIT_API_KEY"],
                api_secret=os.environ["LIVEKIT_API_SECRET"],
            )
            
            sip_trunk_id = os.environ.get("OUTBOUND_TRUNK_ID", os.environ.get("SIP_TRUNK_ID", ""))
            
            await lk_api.sip.create_sip_participant(
                api.CreateSIPParticipantRequest(
                    room_name=ctx.room.name,
                    sip_trunk_id=sip_trunk_id,
                    sip_call_to=phone_number,
                    participant_identity=f"sip_{phone_number.replace('+', '')}",
                    participant_name="Caller",
                    wait_until_answered=True,
                )
            )
            await lk_api.aclose()
            logger.info(f"[SIP] Outbound call dispatched to {phone_number} and answered.")
        except Exception as e:
            logger.error(f"[SIP] Dispatch failed: {e}")
            notify_agent_error(phone_number or "unknown", str(e))
            return

    # ── Instantiate tools ─────────────────────────────────────────────────
    caller_phone = phone_number or "unknown"
    participant_identity = (
        f"sip_{caller_phone.replace('+', '')}"
        if phone_number else "inbound_caller"
    )

    agent_tools = AgentTools(
        sip_participant_identity=participant_identity,
        caller_phone=caller_phone,
    )
    
    agent_tools.ctx_api = ctx.api
    agent_tools.room_name = ctx.room.name

    # ── Build agent ───────────────────────────────────────────────────────
    agent = OutboundAssistant(agent_tools=agent_tools)

    # ── Read live configuration ───────────────────────────────────────────
    live_config = get_live_config()
    delay_setting = live_config.get("stt_min_endpointing_delay", 0.6)

    # ── Start Sarvam-powered session ──────────────────────────────────────
    session = AgentSession(
        stt=sarvam.STT(
            language="unknown",      # Auto-detect Hindi, Hinglish, Tamil, etc.
            model="saaras:v3",
            mode="transcribe",       # "transcribe" for native text routing
            flush_signal=True,
        ),
        llm=openai.LLM(model="gpt-4o-mini"), # Using gpt-4o-mini here as standard "GPT 4.1 mini" replacement
        tts=sarvam.TTS(
            target_language_code="hi-IN",
            model="bulbul:v3",
            speaker="rohan",         # Natural Indian male voice (per earlier fixes)
            speech_sample_rate=8000, # 8kHz = optimised for telephony / Vobiz SIP
        ),
        turn_detection="stt",
        min_endpointing_delay=delay_setting, # Dynamic mic sensitivity!
    )

    await session.start(
        room=ctx.room,
        agent=agent,
        room_input_options=RoomInputOptions(
            close_on_disconnect=False,
        ),
    )

    logger.info("[AGENT] Session live — waiting for caller audio.")

    # ══════════════════════════════════════════════════════════════════════
    # POST-CALL SHUTDOWN HOOK
    # Runs AFTER the caller hangs up — silent, no disruption to the call.
    # The AI decides what happened by reading agent_tools state.
    # ══════════════════════════════════════════════════════════════════════

    async def on_shutdown(shutdown_ctx: JobContext):
        logger.info("[SHUTDOWN] Call ended. Evaluating post-call actions...")

        booking_active    = agent_tools._last_booking_id is not None
        booking_cancelled = agent_tools._booking_was_cancelled
        caller_name       = agent_tools._caller_name
        booking_id        = agent_tools._last_booking_id

        if booking_active:
            # ── Booking exists and was NOT cancelled: confirm it ──────────
            logger.info(f"[SHUTDOWN] Active booking found: {booking_id}")
            logger.info(f"[SHUTDOWN] ✅ Confirmed booking for {caller_name} | ID: {booking_id}")

        elif booking_cancelled:
            # ── Booking was made but cancelled during the call ─────────────
            logger.info("[SHUTDOWN] Booking was cancelled during the call.")

        else:
            # ── Call ended with NO booking at all ─────────────────────────
            logger.info("[SHUTDOWN] No booking made — sending follow-up notification.")
            notify_call_no_booking(
                caller_name=caller_name,
                caller_phone=caller_phone,
                call_summary="Caller did not schedule an appointment during this call.",
            )

    ctx.add_shutdown_callback(on_shutdown)


# ══════════════════════════════════════════════════════════════════════════════
# WORKER ENTRY
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="outbound-caller" 
    ))
