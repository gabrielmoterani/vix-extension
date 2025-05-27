"""
Arquivo: /home/ubuntu/backend/app/core/__init__.py
Inicializador do pacote core.
"""

# Exporta componentes principais para facilitar importação
from app.core.config import settings
from app.core.logger import setup_logging, get_logger
from app.core.security import get_api_key, validate_permissions, generate_api_key
