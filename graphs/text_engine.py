import json
import logging
import random
from typing import Dict, TypedDict, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, START, END
from services import db, ghl

logger = logging.getLogger("text_engine")

# 1. Define the State
class AgentState(TypedDict):
    sub_account_id: str
    contact_id: str
    phone_number: str
    user_message: str
    chat_history: List[Dict[str, str]]
    language: str
    
    # Computed fields
    extracted_details: Dict[str, str]
    lead_score: str
    agent_response: str
    split_messages: List[str]

# 2. Define Nodes
async def verify_permissions(state: AgentState) -> AgentState:
    """Check if we should process this message based on sub-account active status."""
    logger.info(f"Verifying permissions for {state['phone_number']}")
    # In a full implementation, check DB for opt-out status, active subscription, etc.
    return state

async def generate_response(state: AgentState) -> AgentState:
    """Generate the core AI response using the sub-account's configured instructions."""
    settings = db.get_sub_account_settings_by_id(state["sub_account_id"]) or {}
    llm_model = settings.get("llm_model", "openai:gpt-4o-mini").split(":")[-1]
    instructions = settings.get("agent_instructions", "You are a helpful assistant.")
    
    llm = ChatOpenAI(model=llm_model)
    
    # Reconstruct history
    messages = [SystemMessage(content=instructions)]
    for msg in state.get("chat_history", []):
        if msg.get("role") == "user":
            messages.append(HumanMessage(content=msg.get("content", "")))
        else:
            # We use SystemMessage to inject AI history to avoid strictly alternating role errors if history is malformed
            messages.append(SystemMessage(content=f"Assistant: {msg.get('content', '')}"))
            
    messages.append(HumanMessage(content=state["user_message"]))
    
    response = await llm.ainvoke(messages)
    return {"agent_response": response.content}

async def split_response(state: AgentState) -> AgentState:
    """Replicates the n8n structured output parser to split replies humanistically."""
    # We use a structured Prompt to force JSON output
    split_prompt = f"""
    Split the following input message into 2-5 shorter text messages that feel human and natural.
    Input Message: {state["agent_response"]}
    
    RULES:
    - ALWAYS output purely valid JSON with a "messages" array of strings.
    - Keep random capitalization from the original text to keep human like effect.
    - ONLY add question marks when the message content is ACTUALLY asking a question.
    """
    
    try:
        llm = ChatOpenAI(model="gpt-4o-mini", model_kwargs={"response_format": {"type": "json_object"}})
        resp = await llm.ainvoke([HumanMessage(content=split_prompt)])
        data = json.loads(resp.content)
        
        # Depending on how the LLM formatted it
        if "messages" in data and isinstance(data["messages"], list):
            splits = data["messages"]
        elif "totalMessages" in data:
            splits = [v for k, v in data.items() if k.startswith("message") and v]
        else:
            splits = [state["agent_response"]]
            
    except Exception as e:
        logger.error(f"Failed to split response, falling back to single message. Error: {e}")
        splits = [state["agent_response"]]
        
    return {"split_messages": splits}

async def send_to_ghl(state: AgentState) -> AgentState:
    """Sends the chunked responses back to GHL via webhook/API."""
    logger.info(f"Sending {len(state.get('split_messages', []))} messages to {state['phone_number']}")
    # NOTE: In actual production, we delay a few seconds between sending each chunk
    # using the GHL API or pushing to an SQS queue. 
    return state


# 3. Build Graph
workflow = StateGraph(AgentState)
workflow.add_node("verify", verify_permissions)
workflow.add_node("generate", generate_response)
workflow.add_node("split", split_response)
workflow.add_node("send", send_to_ghl)

workflow.add_edge(START, "verify")
workflow.add_edge("verify", "generate")
workflow.add_edge("generate", "split")
workflow.add_edge("split", "send")
workflow.add_edge("send", END)

text_engine_graph = workflow.compile()
