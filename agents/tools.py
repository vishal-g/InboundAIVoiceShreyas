"""
tools.py — AI-callable tool functions for the voice agent.

Contains ``AgentTools``, a LiveKit ``ToolContext`` subclass that exposes
functions the LLM can invoke during a call: booking, availability checks,
call transfer, call ending, and business hours lookup.

Both the inbound and outbound agents share this same tool set.
"""

import logging
import os
from datetime import datetime
from typing import Annotated

import pytz
from livekit import api
from livekit.agents import llm

from services.calendar_tools import get_available_slots, create_booking
from core.utils import normalize_email

logger = logging.getLogger("agent-tools")


class AgentTools(llm.ToolContext):
    """
    LLM-callable tools available during a live voice call.

    Instantiated once per call with the caller's phone and name.
    The ``ctx_api`` and ``room_name`` are set after the LiveKit session connects.
    """

    def __init__(self, caller_phone: str, caller_name: str = ""):
        super().__init__(tools=[])
        self.caller_phone = caller_phone
        self.caller_name = caller_name
        self.booking_intent: dict | None = None
        self.sip_domain = os.getenv("VOBIZ_SIP_DOMAIN")
        self.ctx_api = None
        self.room_name = None
        self._sip_identity = None

    # ── Tool: Transfer to Human ───────────────────────────────────────────

    @llm.function_tool(
        description=(
            "Transfer this call to a human agent. Use if: caller asks for "
            "human, is angry, or query is outside scope."
        )
    )
    async def transfer_call(self) -> str:
        """Initiate a SIP transfer to the configured human fallback number."""
        logger.info("[TOOL] transfer_call triggered")
        destination = os.getenv("DEFAULT_TRANSFER_NUMBER")

        if destination and self.sip_domain and "@" not in destination:
            clean_dest = destination.replace("tel:", "").replace("sip:", "")
            destination = f"sip:{clean_dest}@{self.sip_domain}"
        if destination and not destination.startswith("sip:"):
            destination = f"sip:{destination}"

        try:
            if self.ctx_api and self.room_name and destination and self._sip_identity:
                await self.ctx_api.sip.transfer_sip_participant(
                    api.TransferSIPParticipantRequest(
                        room_name=self.room_name,
                        participant_identity=self._sip_identity,
                        transfer_to=destination,
                        play_dialtone=False,
                    )
                )
                return "Transfer initiated successfully."
            return "Unable to transfer right now."
        except Exception as e:
            logger.error(f"Transfer failed: {e}")
            return "Unable to transfer right now."

    # ── Tool: End Call ────────────────────────────────────────────────────

    @llm.function_tool(
        description=(
            "End the call. Use ONLY when caller says bye/goodbye or after "
            "booking is fully confirmed."
        )
    )
    async def end_call(self) -> str:
        """Hang up the SIP call by transferring to a null destination."""
        logger.info("[TOOL] end_call triggered — hanging up.")
        try:
            if self.ctx_api and self.room_name and self._sip_identity:
                await self.ctx_api.sip.transfer_sip_participant(
                    api.TransferSIPParticipantRequest(
                        room_name=self.room_name,
                        participant_identity=self._sip_identity,
                        transfer_to="tel:+00000000",
                        play_dialtone=False,
                    )
                )
        except Exception as e:
            logger.warning(f"[END-CALL] SIP hangup failed: {e}")
        return "Call ended."

    # ── Tool: Save Booking Intent ─────────────────────────────────────────

    @llm.function_tool(
        description=(
            "Save booking intent after caller confirms appointment. Call this "
            "ONCE after you have name, email, date, and time. You MUST collect "
            "and confirm email before calling this."
        )
    )
    async def save_booking_intent(
        self,
        start_time: Annotated[str, "ISO 8601 datetime e.g. '2026-03-01T10:00:00+05:30'"],
        caller_name: Annotated[str, "Full name of the caller"],
        caller_phone: Annotated[str, "Phone number of the caller"],
        caller_email: Annotated[
            str,
            "Email address of the caller e.g. 'john@gmail.com'. Must contain @ and a domain.",
        ],
        notes: Annotated[str, "Any special requests or notes"] = "",
    ) -> str:
        """Validate and store booking details; actual booking is created at call shutdown."""
        email = normalize_email(caller_email)
        logger.info(f"[TOOL] save_booking_intent: {caller_name} <{email}> at {start_time}")

        # Basic validation
        if "@" not in email or "." not in email.split("@")[-1]:
            logger.warning(f"[TOOL] Email looks invalid: {email}")
            return (
                f"The email '{email}' doesn't look right. Please ask the caller "
                "to spell their email again, letter by letter."
            )

        try:
            self.booking_intent = {
                "start_time": start_time,
                "caller_name": caller_name,
                "caller_phone": caller_phone,
                "caller_email": email,
                "notes": notes,
            }
            self.caller_name = caller_name
            return (
                f"Booking intent saved for {caller_name} ({email}) at {start_time}. "
                "I'll confirm after the call."
            )
        except Exception as e:
            logger.error(f"[TOOL] save_booking_intent failed: {e}")
            return "I had trouble saving the booking. Please try again."

    # ── Tool: Check Availability ──────────────────────────────────────────

    @llm.function_tool(
        description=(
            "Check available appointment slots for a given date. "
            "Call this when user asks about availability."
        )
    )
    async def check_availability(
        self,
        date: Annotated[str, "Date to check in YYYY-MM-DD format e.g. '2026-03-01'"],
    ) -> str:
        """Query Cal.com / Google Calendar for open slots on the given date."""
        logger.info(f"[TOOL] check_availability: date={date}")
        try:
            slots = await get_available_slots(date)
            if not slots:
                return f"No available slots on {date}. Would you like to check another date?"
            slot_strings = [s.get("start_time", str(s))[-8:][:5] for s in slots[:6]]
            return f"Available slots on {date}: {', '.join(slot_strings)} IST."
        except Exception as e:
            logger.error(f"[TOOL] check_availability failed: {e}")
            return "I'm having trouble checking the calendar right now."

    # ── Tool: Business Hours ──────────────────────────────────────────────

    @llm.function_tool(
        description=(
            "Check if the business is currently open and what the operating hours are."
        )
    )
    async def get_business_hours(self) -> str:
        """Return current open/closed status and today's operating hours."""
        ist = pytz.timezone("Asia/Kolkata")
        now = datetime.now(ist)
        hours = {
            0: ("Monday", "10:00", "19:00"),
            1: ("Tuesday", "10:00", "19:00"),
            2: ("Wednesday", "10:00", "19:00"),
            3: ("Thursday", "10:00", "19:00"),
            4: ("Friday", "10:00", "19:00"),
            5: ("Saturday", "10:00", "17:00"),
            6: ("Sunday", None, None),
        }
        day_name, open_t, close_t = hours[now.weekday()]
        current_time = now.strftime("%H:%M")
        if open_t is None:
            return "We are closed on Sundays. Next opening: Monday 10:00 AM IST."
        if open_t <= current_time <= close_t:
            return f"We are OPEN. Today ({day_name}): {open_t}–{close_t} IST."
        return f"We are CLOSED. Today ({day_name}): {open_t}–{close_t} IST."
