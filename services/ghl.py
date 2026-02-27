import httpx
import logging

logger = logging.getLogger("ghl")

async def update_contact_custom_field(api_key: str, contact_id: str, field_id: str, field_value: str):
    """
    Updates a specific custom field for a GHL contact using the v1 API.
    """
    url = f"https://rest.gohighlevel.com/v1/contacts/{contact_id}"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "customField": {
            field_id: field_value
        }
    }
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.put(url, json=data, headers=headers)
            resp.raise_for_status()
            logger.info(f"Successfully updated GHL contact {contact_id}, field {field_id}")
            return resp.json()
        except Exception as e:
            logger.error(f"Failed to update GHL contact {contact_id}: {e}")
            return None

async def add_contact_to_campaign(api_key: str, contact_id: str, campaign_id: str):
    """
    Adds a contact to a specific campaign.
    """
    url = f"https://rest.gohighlevel.com/v1/contacts/{contact_id}/campaigns/{campaign_id}"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, headers=headers)
            resp.raise_for_status()
            logger.info(f"Successfully added GHL contact {contact_id} to campaign {campaign_id}")
            return resp.json()
        except Exception as e:
            logger.error(f"Failed to add GHL contact {contact_id} to campaign: {e}")
            return None
