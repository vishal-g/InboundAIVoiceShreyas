import logging
from typing import Dict, TypedDict, Optional
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from langgraph.graph import StateGraph, START, END

logger = logging.getLogger("lead_details")

class LeadState(TypedDict):
    sub_account_id: str
    contact_id: str
    chat_history: str
    user_utterance: str
    
    extracted_profile: Optional[Dict[str, str]]
    lead_score: Optional[int]

async def extract_profile(state: LeadState) -> LeadState:
    """Extracts user information from the chat history."""
    prompt = f"""
    Extract user details from the following chat history.
    User last input: {state.get('user_utterance', '')}
    History: {state.get('chat_history', '')}
    
    Return a strictly valid JSON object with standard fields like "name", "email", "company", "budget", etc.
    """
    try:
        llm = ChatOpenAI(model="gpt-4o-mini", model_kwargs={"response_format": {"type": "json_object"}})
        res = await llm.ainvoke([HumanMessage(content=prompt)])
        import json
        profile = json.loads(res.content)
        return {"extracted_profile": profile}
    except Exception as e:
        logger.error(f"Failed to extract profile: {e}")
        return {"extracted_profile": {}}

async def score_lead(state: LeadState) -> LeadState:
    """Scores the lead based on conversation context."""
    prompt = f"""
    Score this lead from 1 to 10 based on their purchase intent and qualification in the chat.
    History: {state.get('chat_history', '')}
    Extracted Profile: {state.get('extracted_profile', {})}
    
    Return purely a JSON object with a single key "score" containing an integer 1-10.
    """
    try:
        llm = ChatOpenAI(model="gpt-4o-mini", model_kwargs={"response_format": {"type": "json_object"}})
        res = await llm.ainvoke([HumanMessage(content=prompt)])
        import json
        data = json.loads(res.content)
        return {"lead_score": data.get("score", 5)}
    except Exception as e:
        logger.error(f"Failed to score lead: {e}")
        return {"lead_score": 5}

async def send_updates(state: LeadState) -> LeadState:
    """Simulates the webhook POST to GHL to save lead score and profile."""
    logger.info(f"Sending Lead updates to GHL for contact {state['contact_id']}")
    # API calls to GHL would happen here.
    return state


workflow = StateGraph(LeadState)
workflow.add_node("extract", extract_profile)
workflow.add_node("score", score_lead)
workflow.add_node("update", send_updates)

workflow.add_edge(START, "extract")
workflow.add_edge("extract", "score")
workflow.add_edge("score", "update")
workflow.add_edge("update", END)

lead_details_graph = workflow.compile()
