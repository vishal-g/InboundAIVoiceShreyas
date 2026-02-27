import logging
import asyncio

logger = logging.getLogger("outbound_dispatcher")

async def dispatch_outbound_call(sub_account_id: str, contact_phone: str):
    """
    Replicates the Make_Outbound_Call n8n logic.
    Instead of an n8n webhook, this calls our own internal FastAPI /api/call/single endpoint
    OR directly spawns the LiveKit agent dispatch.
    """
    logger.info(f"Dispatching automated outbound call from sub_account {sub_account_id} to {contact_phone}")
    from services.db import get_sub_account_settings_by_id
    
    settings = get_sub_account_settings_by_id(sub_account_id)
    if not settings:
        logger.error("No sub account settings found, aborting dispatch.")
        return False
        
    try:
        import random
        import json as _json
        import os
        from livekit import api as lkapi

        lk_url = settings.get("livekit_url") or os.environ.get("LIVEKIT_URL", "")
        lk_key = settings.get("livekit_api_key") or os.environ.get("LIVEKIT_API_KEY", "")
        lk_secret = settings.get("livekit_api_secret") or os.environ.get("LIVEKIT_API_SECRET", "")
        assigned_number = settings.get("assigned_number", "")

        lk = lkapi.LiveKitAPI(url=lk_url, api_key=lk_key, api_secret=lk_secret)
        room_name = f"auto-call-{contact_phone.replace('+', '')}-{random.randint(1000, 9999)}"
        
        dispatch = await lk.agent_dispatch.create_dispatch(
            lkapi.CreateAgentDispatchRequest(
                agent_name="voice-agent",
                room=room_name,
                metadata=_json.dumps({"phone_number": contact_phone, "destination_number": assigned_number}),
            )
        )
        await lk.aclose()
        logger.info(f"Automated Outbound call dispatched securely: {dispatch.id}")
        return True
    except Exception as e:
        logger.error(f"Failed to dispatch automated outbound call: {e}")
        return False
