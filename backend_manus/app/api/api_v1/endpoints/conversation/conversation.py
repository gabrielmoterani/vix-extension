"""
Arquivo: /home/ubuntu/backend/app/api/api_v1/endpoints/conversation.py
Endpoints para gerenciamento de conversações e interações com usuários.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from http import HTTPStatus
from typing import List, Optional

from app.core.security import get_api_key
from app.schemas.conversation import (
    ConversationRequest,
    ConversationResponse,
    UserIntent,
    ActionPlan,
    ConversationHistory
)
from app.services.conversation import ConversationService
from app.core.config import settings

# Configuração do logger
logger = logging.getLogger(__name__)

# Criação do router
router = APIRouter()

# Instância do serviço
conversation_service = ConversationService()

@router.post(
    "/intent",
    response_model=ActionPlan,
    status_code=HTTPStatus.OK,
    summary="Processar intenção do usuário",
    description="Processa a intenção do usuário em linguagem natural e retorna um plano de ações."
)
async def process_user_intent(
    intent: UserIntent,
    api_key: str = Depends(get_api_key)
):
    """
    Endpoint para processar a intenção do usuário em linguagem natural.
    
    Recebe a intenção do usuário e o contexto da página, e retorna um plano
    de ações para ajudar o usuário a realizar sua tarefa.
    
    Args:
        intent: Intenção do usuário e contexto da página
        api_key: API key validada pela dependência get_api_key
        
    Returns:
        ActionPlan: Plano de ações a serem executadas
        
    Raises:
        HTTPException: Se ocorrer algum erro durante o processamento
    """
    try:
        logger.info(f"Requisição de processamento de intenção recebida: {intent.text[:50]}...")
        
        # Processa a intenção
        action_plan = await conversation_service.process_intent(intent)
        
        logger.info(f"Intenção processada com sucesso: {len(action_plan.actions)} ações geradas")
        return action_plan
        
    except Exception as e:
        logger.exception(f"Erro ao processar intenção: {intent.text[:50]}...")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar intenção: {str(e)}"
        )

@router.post(
    "/chat",
    response_model=ConversationResponse,
    status_code=HTTPStatus.OK,
    summary="Conversar com assistente de acessibilidade",
    description="Permite conversar com o assistente de acessibilidade para obter ajuda e informações."
)
async def chat_with_assistant(
    request: ConversationRequest,
    api_key: str = Depends(get_api_key)
):
    """
    Endpoint para conversar com o assistente de acessibilidade.
    
    Recebe uma mensagem do usuário e o histórico da conversa, e retorna
    uma resposta do assistente.
    
    Args:
        request: Requisição contendo mensagem e histórico
        api_key: API key validada pela dependência get_api_key
        
    Returns:
        ConversationResponse: Resposta do assistente
        
    Raises:
        HTTPException: Se ocorrer algum erro durante o processamento
    """
    try:
        logger.info(f"Requisição de chat recebida: {request.message[:50]}...")
        
        # Processa a mensagem
        response = await conversation_service.chat(
            message=request.message,
            history=request.history,
            context=request.context
        )
        
        logger.info(f"Resposta de chat gerada com sucesso")
        return response
        
    except Exception as e:
        logger.exception(f"Erro ao processar chat: {request.message[:50]}...")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar chat: {str(e)}"
        )

@router.get(
    "/history/{session_id}",
    response_model=ConversationHistory,
    status_code=HTTPStatus.OK,
    summary="Obter histórico de conversação",
    description="Obtém o histórico de conversação para uma sessão específica."
)
async def get_conversation_history(
    session_id: str = Path(..., description="Identificador único da sessão"),
    limit: int = Query(10, description="Número máximo de mensagens a retornar"),
    api_key: str = Depends(get_api_key)
):
    """
    Endpoint para obter o histórico de conversação.
    
    Args:
        session_id: Identificador único da sessão
        limit: Número máximo de mensagens a retornar
        api_key: API key validada pela dependência get_api_key
        
    Returns:
        ConversationHistory: Histórico de conversação
        
    Raises:
        HTTPException: Se ocorrer algum erro durante o processamento
    """
    try:
        logger.info(f"Requisição de histórico recebida para sessionId: {session_id}")
        
        # Obtém o histórico
        history = await conversation_service.get_history(session_id, limit)
        
        logger.info(f"Histórico obtido com sucesso: {len(history.messages)} mensagens")
        return history
        
    except Exception as e:
        logger.exception(f"Erro ao obter histórico para sessionId: {session_id}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter histórico: {str(e)}"
        )

@router.delete(
    "/history/{session_id}",
    status_code=HTTPStatus.NO_CONTENT,
    summary="Limpar histórico de conversação",
    description="Limpa o histórico de conversação para uma sessão específica."
)
async def clear_conversation_history(
    session_id: str = Path(..., description="Identificador único da sessão"),
    api_key: str = Depends(get_api_key)
):
    """
    Endpoint para limpar o histórico de conversação.
    
    Args:
        session_id: Identificador único da sessão
        api_key: API key validada pela dependência get_api_key
        
    Returns:
        None
        
    Raises:
        HTTPException: Se ocorrer algum erro durante o processamento
    """
    try:
        logger.info(f"Requisição para limpar histórico recebida para sessionId: {session_id}")
        
        # Limpa o histórico
        await conversation_service.clear_history(session_id)
        
        logger.info(f"Histórico limpo com sucesso para sessionId: {session_id}")
        
    except Exception as e:
        logger.exception(f"Erro ao limpar histórico para sessionId: {session_id}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Erro ao limpar histórico: {str(e)}"
        )
