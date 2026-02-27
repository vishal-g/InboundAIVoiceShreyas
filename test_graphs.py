import os
import asyncio
import logging
from dotenv import load_dotenv

# Load LangSmith and other secrets
load_dotenv()

# Fallback: if OpenAI is giving 429, try OpenRouter using the same key assuming it's an OpenRouter key if needed, or simply pass.
# However, to use OpenRouter with LangChain ChatOpenAI, we adjust the base URL before creating the client.
os.environ["OPENAI_API_BASE"] = "https://openrouter.ai/api/v1"
os.environ["OPENAI_API_KEY"] = os.environ.get("OPENROUTER_API_KEY", os.environ.get("OPENAI_API_KEY"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_graphs")

async def test_text_engine():
    from graphs.text_engine import text_engine_graph
    
    logger.info("=== Testing text_engine_graph ===")
    state = {
        "sub_account_id": os.environ.get("TEST_SUB_ACCOUNT_ID", "dummy-id"),
        "contact_id": "contact_123",
        "phone_number": "+1234567890",
        "user_message": "Hi, I need to book a roof inspection.",
        "chat_history": [
            {"role": "user", "content": "Hello?"},
            {"role": "ai", "content": "Hi there! How can I help you today?"}
        ],
        "language": "en"
    }
    
    # We use stream so we can see the state transitions
    async for output in text_engine_graph.astream(state):
        for key, value in output.items():
            logger.info(f"Finished node: '{key}'")
            if "agent_response" in value:
                logger.info(f"Agent Response: {value['agent_response']}")
            if "split_messages" in value:
                logger.info(f"Split Messages: {value['split_messages']}")
                
async def test_lead_details():
    from graphs. lead_details import lead_details_graph
    
    logger.info("=== Testing lead_details_graph ===")
    state = {
        "sub_account_id": os.environ.get("TEST_SUB_ACCOUNT_ID", "dummy-id"),
        "contact_id": "contact_123",
        "chat_history": "User: Hi, I'm John Smith from Acme Corp. Looking for pricing.\nAI: Hello John! We can definitely help.",
        "user_utterance": "My budget is around $2500 per month."
    }
    
    async for output in lead_details_graph.astream(state):
        for key, value in output.items():
            logger.info(f"Finished node: '{key}'")
            if "extracted_profile" in value:
                logger.info(f"Extracted Profile: {value['extracted_profile']}")
            if "lead_score" in value:
                logger.info(f"Lead Score: {value['lead_score']}")

async def main():
    await test_text_engine()
    print("\n-------------------------------\n")
    await test_lead_details()

if __name__ == "__main__":
    asyncio.run(main())
