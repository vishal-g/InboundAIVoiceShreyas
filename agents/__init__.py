"""
agents — Inbound and outbound voice agent package.

Exports the two LiveKit entrypoint functions that are registered
as separate workers in ``agent.py``.
"""

from agents.inbound import inbound_entrypoint
from agents.outbound import outbound_entrypoint

__all__ = ["inbound_entrypoint", "outbound_entrypoint"]
