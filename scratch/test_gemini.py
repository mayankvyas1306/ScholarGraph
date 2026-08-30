import os
import sys
import logging

# Ensure backend modules can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up logging to stdout
logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")

# Load environment variables manually from backend/.env
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                k = key.strip()
                v = val.strip()
                # Do not overwrite if env already has a real key and .env has the placeholder
                if k in os.environ and "your-" in v:
                    continue
                os.environ[k] = v

# NOTE: this script used to import `backend.clients.claude_client.ClaudeClient`,
# a pre-LangChain-migration client that called `google.genai` directly and
# has since been removed as dead code (nothing in the actual app imported
# it any more; see backend/clients/llm_provider.py + llm_client.py for the
# current, provider-agnostic LangChain-backed client). Updated to use the
# real client the app uses so this script stays a meaningful diagnostic.
from backend.clients.llm_client import LLMClient

def test_connection():
    print("Initializing client...")
    client = LLMClient()

    print(f"Detected Provider: {client.provider}")

    if client.provider == "mock":
        print("WARNING: Client is running in Mock Mode. Please double check that "
              "GEMINI_API_KEY (or ANTHROPIC_API_KEY / OPENAI_API_KEY) is correctly "
              "set in backend/.env.")
        return

    print(f"Testing text generation via provider '{client.provider}'...")
    try:
        response = client.complete(
            prompt="Decompose the following research topic into 3 sub-queries: 'quantum error correction'",
            system="You are a planning assistant."
        )
        print("\n--- API Response Success ---")
        print(response)
        print("----------------------------\n")
        print(f"Your {client.provider} API key is active and working perfectly!")
    except Exception as e:
        print(f"\nAPI Call Failed: {e}")
        print("\nPossible Reasons:")
        print("1. The API key lacks permissions, has expired, or is for the wrong project.")
        print("2. For Gemini: create a free key at https://aistudio.google.com/apikey — AI Studio keys work automatically.")
        print("3. For Anthropic: create a key at https://console.anthropic.com/ -> API Keys.")
        print("4. Check LLM_PROVIDER / LLM_MODEL in backend/.env if you're explicitly pinning a provider or model.")

if __name__ == "__main__":
    test_connection()