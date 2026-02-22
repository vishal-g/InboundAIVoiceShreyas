import os
import logging
from supabase import create_client, Client

logger = logging.getLogger("db")

def get_supabase() -> Client | None:
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_KEY", "")
    if not url or not key:
        return None
    try:
        return create_client(url, key)
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None

def save_call_log(phone: str, duration: int, transcript: str, summary: str = "") -> dict:
    """
    Saves a call log to the 'call_logs' table in Supabase.
    If Supabase is not configured, logs it locally instead.
    """
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_KEY", "")
    if not url or not key:
        logger.info(f"Supabase not configured. Local Log -> Phone: {phone}, Duration: {duration}s")
        return {"success": False, "message": "Supabase not configured"}

    supabase = get_supabase()
    if not supabase:
        return {"success": False, "message": "Supabase client failed"}

    try:
        data = {
            "phone_number": phone,
            "duration_seconds": duration,
            "transcript": transcript,
            "summary": summary
        }
        res = supabase.table("call_logs").insert(data).execute()
        logger.info(f"Successfully saved call log to Supabase for {phone}")
        return {"success": True, "data": res.data}
    except Exception as e:
        logger.error(f"Failed to save call log to Supabase: {e}")
        return {"success": False, "message": str(e)}

def fetch_call_logs(limit: int = 50) -> list:
    """
    Fetches the latest call logs from Supabase for the UI dashboard.
    """
    supabase = get_supabase()
    if not supabase:
        return []

    try:
        res = supabase.table("call_logs").select("*").order("created_at", desc=True).limit(limit).execute()
        return res.data
    except Exception as e:
        logger.error(f"Failed to fetch call logs: {e}")
        return []
