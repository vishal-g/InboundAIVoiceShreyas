"""
agent.py — Main entry point for the RapidX AI Voice Agent.

Registers a single worker with LiveKit that routes to inbound or outbound
agent based on dispatch metadata. Both agent types share the same
infrastructure defined in the ``agents/`` package.

Usage:
    python agent.py dev        # development mode (auto-reload)
    python agent.py start      # production mode
"""

import json
import logging
import os

import certifi

# Fix for macOS SSL certificate verification
os.environ["SSL_CERT_FILE"] = certifi.where()

# ── Sentry error tracking ─────────────────────────────────────────────────────
import sentry_sdk

_sentry_dsn = os.environ.get("SENTRY_DSN", "")
if _sentry_dsn:
    from sentry_sdk.integrations.asyncio import AsyncioIntegration

    sentry_sdk.init(
        dsn=_sentry_dsn,
        traces_sample_rate=0.1,
        integrations=[AsyncioIntegration()],
        environment=os.environ.get("ENVIRONMENT", "production"),
    )

# ── Logging setup ─────────────────────────────────────────────────────────────
logging.getLogger("hpack").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agent")

from dotenv import load_dotenv

load_dotenv(override=True)

from livekit.agents import JobContext, WorkerOptions, cli

from agents import inbound_entrypoint, outbound_entrypoint


# ══════════════════════════════════════════════════════════════════════════════
# Routing Entrypoint
# ══════════════════════════════════════════════════════════════════════════════


async def entrypoint(ctx: JobContext) -> None:
    """
    Single entrypoint that routes to inbound or outbound agent.

    Routing logic:
    - If dispatch metadata contains ``{"direction": "outbound"}``, use outbound agent.
    - Otherwise, treat as an inbound call.
    """
    direction = "inbound"
    metadata = ctx.job.metadata or ""
    if metadata:
        try:
            meta = json.loads(metadata)
            if meta.get("direction") == "outbound" or meta.get("phone_number"):
                direction = "outbound"
        except Exception:
            pass

    logger.info(f"[ROUTER] Call direction: {direction}")

    if direction == "outbound":
        await outbound_entrypoint(ctx)
    else:
        await inbound_entrypoint(ctx)


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="voice-agent",
        )
    )
