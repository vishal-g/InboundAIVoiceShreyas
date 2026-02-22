import os
import logging
import requests
from datetime import datetime

logger = logging.getLogger("calendar-tools")

CAL_API_KEY      = os.environ.get("CAL_API_KEY", "")
CAL_EVENT_TYPE_ID = int(os.environ.get("CAL_EVENT_TYPE_ID", "0"))

HEADERS = {
    "Authorization": f"Bearer {CAL_API_KEY}",
    "cal-api-version": "2024-08-13",
    "Content-Type": "application/json",
}
CAL_BASE = "https://api.cal.com/v2"


# ─── Get available slots for a date ────────────────────────────────────────────

def get_available_slots(date_str: str) -> list:
    """
    Fetch open slots for a given date.
    date_str: "YYYY-MM-DD"
    Returns: [{"time": "2026-02-24T10:00:00+05:30", "label": "10:00 AM"}, ...]
    """
    try:
        resp = requests.get(
            f"{CAL_BASE}/slots",
            headers=HEADERS,
            params={
                "eventTypeId": CAL_EVENT_TYPE_ID,
                "startTime": f"{date_str}T00:00:00+05:30",
                "endTime":   f"{date_str}T23:59:59+05:30",
            },
            timeout=8,
        )
        resp.raise_for_status()
        raw_slots = resp.json().get("data", {}).get("slots", {}).get(date_str, [])

        slots = []
        for s in raw_slots:
            dt = datetime.fromisoformat(s["time"])
            slots.append({
                "time":  s["time"],
                "label": dt.strftime("%-I:%M %p"),   # e.g. "10:00 AM"
            })
        logger.info(f"[CAL] {len(slots)} slots found for {date_str}")
        return slots

    except Exception as e:
        logger.error(f"[CAL] get_available_slots error: {e}")
        return []


# ─── Create a booking ──────────────────────────────────────────────────────────

def create_booking(
    start_time: str,
    caller_name: str,
    caller_phone: str,
    notes: str = "",
) -> dict:
    """
    Book a slot on Cal.com via a single POST request.
    start_time: ISO 8601 with IST offset e.g. "2026-02-24T10:00:00+05:30"
    Returns: {"success": bool, "booking_id": str|None, "message": str}
    """
    payload = {
        "eventTypeId": CAL_EVENT_TYPE_ID,
        "start": start_time,
        "attendee": {
            "name":        caller_name,
            "email":       f"{caller_phone.replace('+', '')}@voiceagent.placeholder",
            "phoneNumber": caller_phone,
            "timeZone":    "Asia/Kolkata",
            "language":    "en",
        },
        "bookingFieldsResponses": {
            "notes": notes or f"Booked via AI voice agent. Phone: {caller_phone}",
        },
    }

    try:
        resp = requests.post(f"{CAL_BASE}/bookings", headers=HEADERS, json=payload, timeout=10)
        resp.raise_for_status()
        uid = resp.json().get("data", {}).get("uid", "unknown")
        logger.info(f"[CAL] Booking created: uid={uid}")
        return {"success": True, "booking_id": uid, "message": "Booking confirmed"}

    except requests.HTTPError as e:
        msg = (e.response.json().get("message", str(e)) if e.response else str(e))
        logger.error(f"[CAL] create_booking HTTPError: {msg}")
        return {"success": False, "booking_id": None, "message": msg}

    except Exception as e:
        logger.error(f"[CAL] create_booking error: {e}")
        return {"success": False, "booking_id": None, "message": str(e)}


# ─── Cancel a booking ──────────────────────────────────────────────────────────

def cancel_booking(booking_id: str, reason: str = "Cancelled by caller") -> dict:
    """
    Cancel a booking by its UID.
    Returns: {"success": bool, "message": str}
    """
    try:
        resp = requests.delete(
            f"{CAL_BASE}/bookings/{booking_id}",
            headers=HEADERS,
            json={"cancellationReason": reason},
            timeout=8,
        )
        resp.raise_for_status()
        logger.info(f"[CAL] Booking cancelled: {booking_id}")
        return {"success": True, "message": "Cancelled successfully"}

    except Exception as e:
        logger.error(f"[CAL] cancel_booking error: {e}")
        return {"success": False, "message": str(e)}
