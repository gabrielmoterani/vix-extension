import os
from dotenv import load_dotenv
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Try to load the .env file
load_dotenv()

class Config:
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    PORT = os.getenv('API_PORT')
    DEBUG = os.getenv('FLASK_DEBUG')
    
    # Debug logging
    logger.debug(f"OPENAI_API_KEY loaded: {'Yes' if OPENAI_API_KEY else 'No'}")
    logger.debug(f"PORT loaded: {PORT}")
    logger.debug(f"DEBUG loaded: {DEBUG}")