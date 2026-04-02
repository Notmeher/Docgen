from google import genai
import os
import logging
import json
from datetime import datetime
import time
from httpx import HTTPStatusError

from pydantic import BaseModel, Field
from typing import List, Optional, Tuple
from dotenv import load_dotenv
from openai import AzureOpenAI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Azure OpenAI Configuration
endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
model_name = os.getenv("AZURE_OPENAI_MODEL_NAME")
deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
subscription_key = os.getenv("AZURE_OPENAI_API_KEY")
api_version = os.getenv("AZURE_OPENAI_API_VERSION")



# # # Initialize Azure OpenAI LLM
# llm = AzureChatOpenAI(
#     azure_endpoint=endpoint,
#     api_key=subscription_key,
#     deployment_name=deployment,
#     api_version=api_version,
#     temperature=0
# )

# Configure logging
log_directory = os.getenv("LOG_DIR", "logs")
os.makedirs(log_directory, exist_ok=True)
log_file = os.path.join(
    log_directory, f"llm_calls_{datetime.now().strftime('%Y%m%d')}.log"
)

# Set up logger
logger = logging.getLogger("llm_logger")
logger.setLevel(logging.INFO)
logger.propagate = False  # Prevent propagation to root logger
file_handler = logging.FileHandler(log_file, encoding='utf-8')
file_handler.setFormatter(
    logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
)
logger.addHandler(file_handler)

# Simple cache configuration
cache_file = "llm_cache.json"



# Use Azure OpenAI with retries & error handling
def call_llm(prompt, use_cache: bool = True, retries: int = 7, max_tokens: int = 2000):
    # Validate required environment variables
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
    subscription_key = os.getenv("AZURE_OPENAI_API_KEY")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION")

    if not endpoint:
        raise ValueError("AZURE_OPENAI_ENDPOINT environment variable is not set")
    if not deployment:
        raise ValueError("AZURE_OPENAI_DEPLOYMENT environment variable is not set")
    if not subscription_key:
        raise ValueError("AZURE_OPENAI_API_KEY environment variable is not set")
    if not api_version:
        raise ValueError("AZURE_OPENAI_API_VERSION environment variable is not set")

    client = AzureOpenAI(
        api_version=api_version,
        azure_deployment=deployment,
        azure_endpoint=endpoint,
        api_key=subscription_key,
    )

    last_error = None
    for attempt in range(retries):
        try:
            response = client.chat.completions.create(
                model=deployment,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=0.1,
            )
            return response.choices[0].message.content

        except HTTPStatusError as e:
            # Handle 429 Too Many Requests
            if e.response.status_code == 429:
                wait_time = min(2 ** attempt, 60)  # exponential backoff, capped at 60s
                print(f"[WARN] 429 rate limit hit. Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
                last_error = e
            else:
                raise  # re-raise for non-429 errors

        except Exception as e:
            # Handle transient network issues
            wait_time = min(2 ** attempt, 30)
            print(f"[ERROR] Request failed ({e}). Retrying in {wait_time} seconds...")
            time.sleep(wait_time)
            last_error = e

    # If we exhausted retries, raise the last error
    raise RuntimeError(f"call_llm failed after {retries} attempts") from last_error

# Use Azure OpenAI
# def call_llm(prompt, use_cache: bool = True):
#     # Validate required environment variables
#     if not endpoint:
#         raise ValueError("AZURE_OPENAI_ENDPOINT environment variable is not set")
#     if not deployment:
#         raise ValueError("AZURE_OPENAI_DEPLOYMENT environment variable is not set")
#     if not subscription_key:
#         raise ValueError("AZURE_OPENAI_API_KEY environment variable is not set")
#     if not api_version:
#         raise ValueError("AZURE_OPENAI_API_VERSION environment variable is not set")
    
#     # Use environment variables instead of hardcoded placeholders
#     client = AzureOpenAI(
#         api_version=api_version,
#         azure_deployment=deployment,
#         azure_endpoint=endpoint,
#         api_key=subscription_key,
#     )

#     r = client.chat.completions.create(
#         model=deployment,
#         messages=[{"role": "user", "content": prompt}],
#         max_tokens=4000,
#         temperature=0.1
#     )
#     return r.choices[0].message.content

# # By default, we Google Gemini 2.5 pro, as it shows great performance for code understanding
# def call_llm(prompt: str, use_cache: bool = True) -> str:
#     # Log the prompt
#     logger.info(f"PROMPT: {prompt}")

#     # Check cache if enabled
#     if use_cache:
#         # Load cache from disk
#         cache = {}
#         if os.path.exists(cache_file):
#             try:
#                 with open(cache_file, "r", encoding="utf-8") as f:
#                     cache = json.load(f)
#             except:
#                 logger.warning(f"Failed to load cache, starting with empty cache")

#         # Return from cache if exists
#         if prompt in cache:
#             logger.info(f"RESPONSE: {cache[prompt]}")
#             return cache[prompt]

#     # # Call the LLM if not in cache or cache disabled
#     # client = genai.Client(
#     #     vertexai=True,
#     #     # TODO: change to your own project id and location
#     #     project=os.getenv("GEMINI_PROJECT_ID", "your-project-id"),
#     #     location=os.getenv("GEMINI_LOCATION", "us-central1")
#     # )

#     # You can comment the previous line and use the AI Studio key instead:
#     client = genai.Client(
#         api_key=os.getenv("GEMINI_API_KEY", ""),
#     )
#     model = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")
#     # model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
#     response = client.models.generate_content(model=model, contents=[prompt])
#     response_text = response.text

#     # Log the response
#     logger.info(f"RESPONSE: {response_text}")

#     # Update cache if enabled
#     if use_cache:
#         # Load cache again to avoid overwrites
#         cache = {}
#         if os.path.exists(cache_file):
#             try:
#                 with open(cache_file, "r", encoding="utf-8") as f:
#                     cache = json.load(f)
#             except:
#                 pass

#         # Add to cache and save
#         cache[prompt] = response_text
#         try:
#             with open(cache_file, "w", encoding="utf-8") as f:
#                 json.dump(cache, f)
#         except Exception as e:
#             logger.error(f"Failed to save cache: {e}")

#     return response_text



# # Use Anthropic Claude 3.7 Sonnet Extended Thinking
# def call_llm(prompt, use_cache: bool = True):
#     from anthropic import Anthropic
#     client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", "your-api-key"))
#     response = client.messages.create(
#         model="claude-3-7-sonnet-20250219",
#         max_tokens=21000,
#         thinking={
#             "type": "enabled",
#             "budget_tokens": 20000
#         },
#         messages=[
#             {"role": "user", "content": prompt}
#         ]
#     )
#     return response.content[1].text

# # Use OpenAI o1
# def call_llm(prompt, use_cache: bool = True):
#     from openai import OpenAI
#     client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", "your-api-key"))
#     r = client.chat.completions.create(
#         model="o1",
#         messages=[{"role": "user", "content": prompt}],
#         response_format={
#             "type": "text"
#         },
#         reasoning_effort="medium",
#         store=False
#     )
#     return r.choices[0].message.content

# Use OpenRouter API
# def call_llm(prompt: str, use_cache: bool = True) -> str:
#     import requests
#     # Log the prompt
#     logger.info(f"PROMPT: {prompt}")

#     # Check cache if enabled
#     if use_cache:
#         # Load cache from disk
#         cache = {}
#         if os.path.exists(cache_file):
#             try:
#                 with open(cache_file, "r", encoding="utf-8") as f:
#                     cache = json.load(f)
#             except:
#                 logger.warning(f"Failed to load cache, starting with empty cache")

#         # Return from cache if exists
#         if prompt in cache:
#             logger.info(f"RESPONSE: {cache[prompt]}")
#             return cache[prompt]

#     # OpenRouter API configuration
#     api_key = os.getenv("OPENROUTER_API_KEY", "")
#     model = os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-exp:free")
    
#     headers = {
#         "Authorization": f"Bearer {api_key}",
#     }

#     data = {
#         "model": model,
#         "messages": [{"role": "user", "content": prompt}]
#     }

#     response = requests.post(
#         "https://openrouter.ai/api/v1/chat/completions",
#         headers=headers,
#         json=data
#     )

#     if response.status_code != 200:
#         error_msg = f"OpenRouter API call failed with status {response.status_code}: {response.text}"
#         logger.error(error_msg)
#         raise Exception(error_msg)
#     try:
#         response_text = response.json()["choices"][0]["message"]["content"]
#     except Exception as e:
#         error_msg = f"Failed to parse OpenRouter response: {e}; Response: {response.text}"
#         logger.error(error_msg)        
#         raise Exception(error_msg)
    

#     # Log the response
#     logger.info(f"RESPONSE: {response_text}")

#     # Update cache if enabled
#     if use_cache:
#         # Load cache again to avoid overwrites
#         cache = {}
#         if os.path.exists(cache_file):
#             try:
#                 with open(cache_file, "r", encoding="utf-8") as f:
#                     cache = json.load(f)
#             except:
#                 pass

#         # Add to cache and save
#         cache[prompt] = response_text
#         try:
#             with open(cache_file, "w", encoding="utf-8") as f:
#                 json.dump(cache, f)
#         except Exception as e:
#             logger.error(f"Failed to save cache: {e}")

#     return response_text

if __name__ == "__main__":
    test_prompt = "Hello, how are you?"

    # First call - should hit the API
    print("Making call...")
    response1 = call_llm(test_prompt, use_cache=False)
    print(f"Response: {response1}")
