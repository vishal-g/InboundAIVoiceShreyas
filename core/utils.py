"""
utils.py — Standalone utility functions.

Contains helpers for token counting, IST time context generation,
rate limiting, and email normalisation from voice transcription.

These functions have no dependency on LiveKit, FastAPI, or the agent framework.
"""

import logging
import time
from collections import defaultdict
from datetime import datetime, timedelta

import pytz

logger = logging.getLogger("utils")


# ══════════════════════════════════════════════════════════════════════════════
# Token counting
# ══════════════════════════════════════════════════════════════════════════════

def count_tokens(text: str) -> int:
    """
    Approximate token count using a word-based heuristic.

    Avoids importing tiktoken which can hang during download.
    Rough estimate: ~0.75 words per token.
    """
    return int(len(text.split()) / 0.75)


# ══════════════════════════════════════════════════════════════════════════════
# IST time context (injected into agent system prompt)
# ══════════════════════════════════════════════════════════════════════════════

def get_ist_time_context() -> str:
    """
    Build a time-awareness block for the agent's system prompt.

    Includes today's date/time in IST and a 7-day reference table so the
    LLM can resolve "tomorrow", "next Monday", etc. without hallucinating.
    """
    ist = pytz.timezone("Asia/Kolkata")
    now = datetime.now(ist)
    today_str = now.strftime("%A, %B %d, %Y")
    time_str = now.strftime("%I:%M %p")

    days_lines: list[str] = []
    for i in range(7):
        day = now + timedelta(days=i)
        label = "Today" if i == 0 else ("Tomorrow" if i == 1 else day.strftime("%A"))
        days_lines.append(
            f"  {label}: {day.strftime('%A %d %B %Y')} → ISO {day.strftime('%Y-%m-%d')}"
        )
    days_block = "\n".join(days_lines)

    return (
        f"\n\n[SYSTEM CONTEXT]\n"
        f"Current date & time: {today_str} at {time_str} IST\n"
        f"Resolve ALL relative day references using this table:\n{days_block}\n"
        f"Always use ISO dates when calling save_booking_intent. "
        f"Appointments in IST (+05:30).]"
    )


# ══════════════════════════════════════════════════════════════════════════════
# Rate limiting
# ══════════════════════════════════════════════════════════════════════════════

_call_timestamps: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_CALLS = 5
RATE_LIMIT_WINDOW = 3600  # seconds (1 hour)


def is_rate_limited(phone: str) -> bool:
    """
    Check if a phone number has exceeded the rate limit.

    Allows ``RATE_LIMIT_CALLS`` calls per ``RATE_LIMIT_WINDOW`` seconds.
    Demo and unknown callers are never rate-limited.
    """
    if phone in ("unknown", "demo"):
        return False
    now = time.time()
    _call_timestamps[phone] = [
        t for t in _call_timestamps[phone] if now - t < RATE_LIMIT_WINDOW
    ]
    if len(_call_timestamps[phone]) >= RATE_LIMIT_CALLS:
        return True
    _call_timestamps[phone].append(now)
    return False


# ══════════════════════════════════════════════════════════════════════════════
# Email normalisation (for voice-transcribed emails)
# ══════════════════════════════════════════════════════════════════════════════

def normalize_email(raw_email: str) -> str:
    """
    Clean up an email address transcribed from voice.

    Handles common STT misinterpretations:
    - "at the rate" / "at" → @
    - "dot" / "period" → .
    - "gmial" / "gmal" → "gmail"
    - ".con" → ".com"
    """
    email = raw_email.lower().strip()

    # Common spoken-to-symbol replacements
    for phrase in ["at the rate of", "at the rate", "at rate", " at ", " eta "]:
        email = email.replace(phrase, "@")
    for phrase in [" dot ", " period "]:
        email = email.replace(phrase, ".")

    # Remove leftover spaces
    email = email.replace(" ", "")

    # Fix common domain misspellings
    email = email.replace("gmial", "gmail").replace("gmal", "gmail").replace("gmai", "gmail")
    email = email.replace("yaho", "yahoo").replace("hotmal", "hotmail")
    email = email.replace(".con", ".com").replace(".coom", ".com")

    return email
