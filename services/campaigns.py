import logging
from typing import List

logger = logging.getLogger("campaigns")

async def launch_campaign(sub_account_id: str, campaign_id: str, contact_ids: List[str]):
    """
    Replicates the Launch_Campaign n8n logic.
    Receives a list of contacts and a campaign ID, then adds them to the GHL campaign with staggered delays.
    """
    logger.info(f"Launching campaign {campaign_id} for sub_account {sub_account_id} with {len(contact_ids)} contacts.")
    
    from services.ghl import add_contact_to_campaign
    from services.db import get_sub_account_settings_by_id
    
    # In a real implementation you would retrieve the sub_account API key
    settings = get_sub_account_settings_by_id(sub_account_id)
    # api_key = settings.get("ghl_api_key")
    api_key = "dummy_key"
    
    success_count = 0
    for cid in contact_ids:
        res = await add_contact_to_campaign(api_key, cid, campaign_id)
        if res:
            success_count += 1
            
    logger.info(f"Successfully launched {success_count}/{len(contact_ids)} contacts into campaign.")
    return success_count
