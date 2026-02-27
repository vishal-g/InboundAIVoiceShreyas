import logging
from fastapi import APIRouter, Request, BackgroundTasks, HTTPException
from services import db
from graphs.text_engine import text_engine_graph
from graphs.lead_details import lead_details_graph

logger = logging.getLogger("webhooks")
hook_router = APIRouter(prefix="/api/webhook", tags=["webhooks"])

@hook_router.post("/ghl/text-engine")
async def ghl_text_engine(request: Request, background_tasks: BackgroundTasks, sub_account_id: str = None):
    """
    Replaces n8n Text_Engine.json
    Triggered by GHL when a text interaction (SMS, WhatsApp, IG, etc) occurs.
    """
    payload = await request.json()
    logger.info(f"Received text-engine webhook: {payload}")
    
    if not sub_account_id:
        raise HTTPException(status_code=400, detail="sub_account_id query parameter is required")
        
    # Standard GHL interaction payload
    # { "contact_id": "...", "phone": "...", "message": "...", "type": "SMS" }
    
    state = {
        "sub_account_id": sub_account_id,
        "contact_id": payload.get("contact_id", ""),
        "phone_number": payload.get("phone", ""),
        "user_message": payload.get("message", payload.get("body", "")),
        "chat_history": payload.get("history", []),
        "language": payload.get("language", "en")
    }
    
    background_tasks.add_task(text_engine_graph.ainvoke, state)
    return {"status": "accepted", "message": "Text engine job queued"}


@hook_router.post("/ghl/launch-campaign")
async def ghl_launch_campaign(request: Request, background_tasks: BackgroundTasks, sub_account_id: str = None):
    """
    Replaces n8n Launch_Campaign.json
    """
    payload = await request.json()
    logger.info(f"Received launch-campaign webhook: {payload}")
    if not sub_account_id:
        raise HTTPException(status_code=400, detail="sub_account_id query parameter is required")
        
    # GHL Payload typically includes workflow or campaign info
    # Expected payload: { "campaign_id": "...", "contact_ids": ["...", "..."] }
    campaign_id = payload.get("campaign_id")
    contact_ids = payload.get("contact_ids", [])
    if isinstance(payload.get("contact_id"), str) and not contact_ids:
        contact_ids = [payload.get("contact_id")]
        
    if campaign_id and contact_ids:
        from services.campaigns import launch_campaign
        background_tasks.add_task(launch_campaign, sub_account_id, campaign_id, contact_ids)
        return {"status": "accepted", "message": "Campaign launch queued"}
    else:
        raise HTTPException(status_code=400, detail="Missing campaign_id or contact_ids")


@hook_router.post("/ghl/lead-details")
async def ghl_lead_details(request: Request, background_tasks: BackgroundTasks, sub_account_id: str = None):
    """
    Replaces n8n Get_Lead_Details.json
    """
    payload = await request.json()
    logger.info(f"Received lead-details webhook: {payload}")
    if not sub_account_id:
        raise HTTPException(status_code=400, detail="sub_account_id query parameter is required")
        
    state = {
        "sub_account_id": sub_account_id,
        "contact_id": payload.get("contact_id", ""),
        "chat_history": str(payload.get("history", [])),
        "user_utterance": payload.get("last_message", "")
    }
    
    # We can also run this in background if it's slow
    background_tasks.add_task(lead_details_graph.ainvoke, state)
    return {"status": "accepted", "message": "Lead details background job queued"}


@hook_router.post("/ghl/make-outbound-call")
async def ghl_make_outbound_call(request: Request, background_tasks: BackgroundTasks, sub_account_id: str = None):
    """
    Replaces n8n Make_Outbound_Call.json
    """
    payload = await request.json()
    logger.info(f"Received make-outbound-call webhook: {payload}")
    if not sub_account_id:
        raise HTTPException(status_code=400, detail="sub_account_id query parameter is required")
        
    # Extract data for background dispatcher
    # Expected payload: {"contact_phone": "+1234..."}
    contact_phone = payload.get("contact_phone", payload.get("phone", ""))
    
    if contact_phone:
        from services.outbound_dispatcher import dispatch_outbound_call
        background_tasks.add_task(dispatch_outbound_call, sub_account_id, contact_phone)
        return {"status": "accepted", "message": "Outbound call dispatched"}
    else:
        raise HTTPException(status_code=400, detail="Missing contact_phone in payload")


@hook_router.post("/ghl/appointment-booking")
async def ghl_appointment_booking(request: Request, background_tasks: BackgroundTasks, sub_account_id: str = None):
    """
    Replaces n8n Appointment_Booking_Functions.json
    """
    payload = await request.json()
    logger.info(f"Received appointment-booking webhook: {payload}")
    if not sub_account_id:
        raise HTTPException(status_code=400, detail="sub_account_id query parameter is required")
        
    # Expected payload: { "action": "book|cancel", "contact_id": "...", "calendar_id": "...", "event_id": "..." }
    action = payload.get("action")
    
    # In a full implementation, we would extract the API key for the sub_account from DB
    api_key = "dummy_key_from_db"
    
    from services import booking_functions
    
    if action == "book":
        background_tasks.add_task(
            booking_functions.book_appointment, 
            api_key, payload.get("calendar_id"), payload.get("contact_id"), payload.get("start_time")
        )
    elif action == "cancel":
        background_tasks.add_task(
            booking_functions.cancel_appointment,
            api_key, payload.get("event_id")
        )
        
    return {"status": "accepted", "message": f"Appointment action '{action}' queued"}
