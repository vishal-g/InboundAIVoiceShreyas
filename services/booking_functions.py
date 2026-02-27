import httpx
import logging
from typing import Dict, Any

logger = logging.getLogger("booking_functions")

async def get_available_slots(api_key: str, calendar_id: str, timezone: str) -> Dict[str, Any]:
    """
    Equivalent to n8n getAvailableSlot1 / Get_Available_Slot1
    """
    url = f"https://services.leadconnectorhq.com/calendars/{calendar_id}/free-slots/"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Version": "2021-04-15"
    }
    # Note: the actual GHL API expects a timeframe
    params = {
        "timezone": timezone
    }
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, headers=headers, params=params)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error(f"Failed to fetch slots for calendar {calendar_id}: {e}")
            return {}

async def book_appointment(api_key: str, calendar_id: str, contact_id: str, start_time: str) -> Dict[str, Any]:
    """
    Equivalent to n8n bookAppointment1
    """
    url = "https://services.leadconnectorhq.com/calendars/events/appointments"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Version": "2021-04-15"
    }
    payload = {
        "calendarId": calendar_id,
        "contactId": contact_id,
        "startTime": start_time
    }
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            logger.info(f"Booked appointment for contact {contact_id} at {start_time}")
            return resp.json()
        except Exception as e:
            logger.error(f"Failed to book appointment: {e}")
            return {}

async def cancel_appointment(api_key: str, event_id: str) -> bool:
    """
    Equivalent to n8n cancelAppointment1 (PUT with status change)
    """
    url = f"https://services.leadconnectorhq.com/calendars/events/appointments/{event_id}"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Version": "2021-04-15"
    }
    payload = {
        "status": "cancelled"
    }
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.put(url, headers=headers, json=payload)
            resp.raise_for_status()
            logger.info(f"Cancelled appointment {event_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to cancel appointment {event_id}: {e}")
            return False
