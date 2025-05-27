"""
Módulo de segurança para autenticação e autorização.
Implementa verificação de API key e outras funcionalidades de segurança.
"""

from http import HTTPStatus
from fastapi import Security, HTTPException, Depends
from fastapi.security.api_key import APIKeyHeader
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Header para API Key
api_key_header = APIKeyHeader(name=settings.API_KEY_NAME, auto_error=False)

async def get_api_key(api_key_header: str = Security(api_key_header)):
    """
    Dependência para verificar a API key nos headers da requisição.
    Retorna a API key se válida ou lança uma exceção se inválida.
    
    Args:
        api_key_header: API key extraída do header da requisição
        
    Returns:
        str: API key validada
        
    Raises:
        HTTPException: Se a API key for inválida ou não fornecida
    """
    # Se a verificação de API key não estiver habilitada, retorna
    if not settings.REQUIRE_API_KEY:
        return api_key_header
    
    # Verifica se a API key foi fornecida
    if not api_key_header:
        logger.warning("Tentativa de acesso sem API key")
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="API key não fornecida",
            headers={"WWW-Authenticate": settings.API_KEY_NAME},
        )
    
    # Verifica se a API key é válida
    if api_key_header != settings.API_KEY:
        logger.warning(f"Tentativa de acesso com API key inválida: {api_key_header[:5]}...")
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="API key inválida",
            headers={"WWW-Authenticate": settings.API_KEY_NAME},
        )
    
    return api_key_header

# Função para uso futuro - implementação de rate limiting
async def check_rate_limit(client_id: str):
    """
    Verifica se o cliente atingiu o limite de requisições.
    Implementação básica para futura expansão.
    
    Args:
        client_id: Identificador do cliente (pode ser IP ou API key)
        
    Raises:
        HTTPException: Se o limite de requisições for excedido
    """
    # Implementação futura - pode usar Redis ou outro mecanismo
    # para controle de taxa de requisições
    pass
