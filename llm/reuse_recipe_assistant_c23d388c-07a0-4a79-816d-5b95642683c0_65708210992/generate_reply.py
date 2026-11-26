import httpx
import logging
import time
from typing import Optional, Dict, Any
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class LLMRetryError(Exception):
    """Custom exception for LLM API connection errors."""
    pass

def generate_reply_with_retry(
    prompt: str,
    api_key: str,
    base_url: str,
    max_retries: int = 3,
    initial_backoff: float = 1.0,
    max_backoff: float = 60.0
) -> Optional[Dict[str, Any]]:
    """
    Generate a reply with retry logic and proper timeout configuration.
    
    Args:
        prompt: The input prompt for the LLM
        api_key: API key for authentication
        base_url: Base URL of the LLM API
        max_retries: Maximum number of retry attempts (default: 3)
        initial_backoff: Initial backoff time in seconds (default: 1.0)
        max_backoff: Maximum backoff time in seconds (default: 60.0)
    
    Returns:
        Dictionary containing the reply or None if all retries fail
    """
    # Configuration
    connect_timeout = 10  # seconds
    read_timeout = 30     # seconds
    write_timeout = 10    # seconds
    pool_timeout = 10     # seconds
    
    # Create httpx client with timeout configuration
    client = httpx.Client(
        timeout=httpx.Timeout(
            connect=connect_timeout,
            read=read_timeout,
            write=write_timeout,
            pool=pool_timeout
        ),
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    )
    
    # Retry configuration
    backoff = initial_backoff
    max_backoff = min(max_backoff, 60.0)  # Cap at 60 seconds
    
    for attempt in range(max_retries + 1):  # +1 for the initial attempt
        logger.info(f"Attempt {attempt + 1}/{max_retries + 1} to generate reply")
        
        try:
            # Make the API call
            response = client.post(
                f"{base_url}/generate_reply",
                json={"prompt": prompt},
                follow_redirects=True
            )
            
            # Check for successful response
            if response.status_code == 200:
                reply_data = response.json()
                logger.info(f"Successfully generated reply after {attempt + 1} attempt")
                return reply_data
            else:
                logger.warning(f"Received status code {response.status_code}")
                
        except httpx.APIConnectionError as e:
            logger.error(f"APIConnectionError: {e}")
            if attempt < max_retries:
                logger.info(f"Retrying in {backoff:.2f} seconds...")
                time.sleep(backoff)
                backoff = min(backoff * 2, max_backoff)  # Exponential backoff
            else:
                raise LLMRetryError(f"APIConnectionError after {max_retries + 1} attempts")
                
        except httpx.TimeoutException as e:
            logger.error(f"TimeoutException: {e}")
            if attempt < max_retries:
                logger.info(f"Retrying in {backoff:.2f} seconds...")
                time.sleep(backoff)
                backoff = min(backoff * 2, max_backoff)
            else:
                raise LLMRetryError(f"TimeoutException after {max_retries + 1} attempts")
                
        except httpx.ConnectTimeout as e:
            logger.error(f"ConnectTimeout: {e}")
            if attempt < max_retries:
                logger.info(f"Retrying in {backoff:.2f} seconds...")
                time.sleep(backoff)
                backoff = min(backoff * 2, max_backoff)
            else:
                raise LLMRetryError(f"ConnectTimeout after {max_retries + 1} attempts")
                
        except httpx.ConnectError as e:
            logger.error(f"ConnectError: {e}")
            if attempt < max_retries:
                logger.info(f"Retrying in {backoff:.2f} seconds...")
                time.sleep(backoff)
                backoff = min(backoff * 2, max_backoff)
            else:
                raise LLMRetryError(f"ConnectError after {max_retries + 1} attempts")
                
        except httpx.ReadTimeout as e:
            logger.error(f"ReadTimeout: {e}")
            if attempt < max_retries:
                logger.info(f"Retrying in {backoff:.2f} seconds...")
                time.sleep(backoff)
                backoff = min(backoff * 2, max_backoff)
            else:
                raise LLMRetryError(f"ReadTimeout after {max_retries + 1} attempts")
                
        except httpx.StreamError as e:
            logger.error(f"StreamError: {e}")
            if attempt < max_retries:
                logger.info(f"Retrying in {backoff:.2f} seconds...")
                time.sleep(backoff)
                backoff = min(backoff * 2, max_backoff)
            else:
                raise LLMRetryError(f"StreamError after {max_retries + 1} attempts")
                
        except httpx.HTTPError as e:
            logger.error(f"HTTPError: {e}")
            if attempt < max_retries:
                logger.info(f"Retrying in {backoff:.2f} seconds...")
                time.sleep(backoff)
                backoff = min(backoff * 2, max_backoff)
            else:
                raise LLMRetryError(f"HTTPError after {max_retries + 1} attempts")
                
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            if attempt < max_retries:
                logger.info(f"Retrying in {backoff:.2f} seconds...")
                time.sleep(backoff)
                backoff = min(backoff * 2, max_backoff)
            else:
                raise LLMRetryError(f"Unexpected error after {max_retries + 1} attempts")
    
    # Fallback mechanism - return a default response
    logger.warning("Fallback mechanism: returning default response")
    return {
        "reply": "Sorry, I'm having trouble connecting to the LLM service. Please try again later.",
        "timestamp": datetime.now().isoformat(),
        "fallback": True
    }

# Example usage
if __name__ == "__main__":
    # Replace with actual values
    API_KEY = "your_api_key_here"
    BASE_URL = "https://your-llm-api.com"
    PROMPT = "Hello, how are you?"
    
    try:
        reply = generate_reply_with_retry(
            prompt=PROMPT,
            api_key=API_KEY,
            base_url=BASE_URL
        )
        if reply:
            print(f"Reply: {reply}")
        else:
            print("No reply received")
    except LLMRetryError as e:
        print(f"Error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")