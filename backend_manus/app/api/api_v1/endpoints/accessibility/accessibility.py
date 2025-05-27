"""
Arquivo: /home/ubuntu/backend/app/api/api_v1/endpoints/accessibility.py
Endpoints para análise e modificação de acessibilidade web.
"""

import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Path
from http import HTTPStatus
from typing import List, Optional

from app.core.security import get_api_key
from app.schemas.accessibility import (
    AnalysisRequest, 
    AnalysisResponse, 
    AccessibilityReport, 
    ModificationRequest,
    ModificationResponse
)
from app.services.accessibility import AccessibilityService
from app.core.config import settings

# Configuração do logger
logger = logging.getLogger(__name__)

# Criação do router
router = APIRouter()

# Instância do serviço
accessibility_service = AccessibilityService()

@router.post(
    "/analyze",
    response_model=AnalysisResponse,
    status_code=HTTPStatus.OK,
    summary="Analisar página web para acessibilidade",
    description="Recebe dados de uma página web (DOM, screenshot) e retorna modificações de acessibilidade e outras informações relevantes."
)
async def analyze_page(
    request: AnalysisRequest,
    background_tasks: BackgroundTasks,
    api_key: str = Depends(get_api_key)
):
    """
    Endpoint principal para análise de páginas web.
    
    Recebe dados da página web da extensão, processa utilizando os módulos de IA
    e retorna modificações de acessibilidade e outras informações relevantes.
    
    Args:
        request: Dados da requisição contendo URL, DOM, screenshot, etc.
        background_tasks: Tarefas em background do FastAPI
        api_key: API key validada pela dependência get_api_key
        
    Returns:
        AnalysisResponse: Resposta contendo modificações, ações e sumário
        
    Raises:
        HTTPException: Se ocorrer algum erro durante o processamento
    """
    try:
        # Log da requisição (sem dados sensíveis)
        logger.info(f"Requisição de análise recebida para URL: {request.url}")
        
        # Gera um sessionId se não fornecido
        if not request.sessionId:
            request.sessionId = str(uuid.uuid4())
            logger.debug(f"Gerado novo sessionId: {request.sessionId}")
        
        # Processa a requisição
        response = await accessibility_service.process_page(request)
        
        # Adiciona informações de debug em ambiente de desenvolvimento
        if settings.ENVIRONMENT == "development" and settings.DEBUG:
            response.debugInfo = {
                "processingTime": accessibility_service.last_processing_time,
                "tokensUsed": accessibility_service.last_tokens_used,
                "modelVersion": settings.OPENAI_MODEL
            }
        
        # Registra métricas em background para não atrasar a resposta
        background_tasks.add_task(
            accessibility_service.record_metrics,
            request.url,
            request.sessionId,
            accessibility_service.last_processing_time,
            accessibility_service.last_tokens_used
        )
        
        logger.info(f"Análise concluída para URL: {request.url}, sessionId: {request.sessionId}")
        return response
        
    except Exception as e:
        # Log detalhado do erro
        logger.exception(f"Erro ao processar análise para URL: {request.url}")
        
        # Retorna erro apropriado
        if isinstance(e, HTTPException):
            raise e
        else:
            raise HTTPException(
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                detail=f"Erro ao processar análise: {str(e)}"
            )

@router.get(
    "/status/{session_id}",
    status_code=HTTPStatus.OK,
    summary="Verificar status de análise",
    description="Verifica o status de uma análise em andamento pelo sessionId."
)
async def check_analysis_status(
    session_id: str = Path(..., description="Identificador único da sessão de análise"),
    api_key: str = Depends(get_api_key)
):
    """
    Endpoint para verificar o status de uma análise em andamento.
    
    Args:
        session_id: Identificador único da sessão de análise
        api_key: API key validada pela dependência get_api_key
        
    Returns:
        dict: Status da análise
    """
    try:
        status = await accessibility_service.get_analysis_status(session_id)
        return status
    except Exception as e:
        logger.exception(f"Erro ao verificar status para sessionId: {session_id}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Erro ao verificar status: {str(e)}"
        )

@router.post(
    "/modify",
    response_model=ModificationResponse,
    status_code=HTTPStatus.OK,
    summary="Aplicar modificações de acessibilidade",
    description="Recebe solicitações para aplicar modificações específicas de acessibilidade."
)
async def apply_modifications(
    request: ModificationRequest,
    api_key: str = Depends(get_api_key)
):
    """
    Endpoint para aplicar modificações específicas de acessibilidade.
    
    Args:
        request: Dados da requisição contendo modificações a serem aplicadas
        api_key: API key validada pela dependência get_api_key
        
    Returns:
        ModificationResponse: Resposta contendo resultado das modificações
    """
    try:
        logger.info(f"Requisição de modificação recebida para URL: {request.url}")
        
        # Processa a requisição
        response = await accessibility_service.apply_modifications(request)
        
        logger.info(f"Modificações aplicadas para URL: {request.url}")
        return response
    except Exception as e:
        logger.exception(f"Erro ao aplicar modificações para URL: {request.url}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Erro ao aplicar modificações: {str(e)}"
        )

@router.get(
    "/report/{url:path}",
    response_model=AccessibilityReport,
    status_code=HTTPStatus.OK,
    summary="Obter relatório de acessibilidade",
    description="Obtém um relatório detalhado de acessibilidade para uma URL específica."
)
async def get_accessibility_report(
    url: str = Path(..., description="URL da página para obter o relatório"),
    include_history: bool = Query(False, description="Incluir histórico de análises anteriores"),
    api_key: str = Depends(get_api_key)
):
    """
    Endpoint para obter um relatório detalhado de acessibilidade.
    
    Args:
        url: URL da página para obter o relatório
        include_history: Se deve incluir histórico de análises anteriores
        api_key: API key validada pela dependência get_api_key
        
    Returns:
        AccessibilityReport: Relatório detalhado de acessibilidade
    """
    try:
        logger.info(f"Requisição de relatório recebida para URL: {url}")
        
        # Obtém o relatório
        report = await accessibility_service.get_accessibility_report(url, include_history)
        
        logger.info(f"Relatório gerado para URL: {url}")
        return report
    except Exception as e:
        logger.exception(f"Erro ao gerar relatório para URL: {url}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Erro ao gerar relatório: {str(e)}"
        )

@router.get(
    "/rules",
    response_model=List[dict],
    status_code=HTTPStatus.OK,
    summary="Listar regras de acessibilidade",
    description="Lista todas as regras de acessibilidade disponíveis no sistema."
)
async def list_accessibility_rules(
    category: Optional[str] = Query(None, description="Filtrar por categoria de regra"),
    level: Optional[str] = Query(None, description="Filtrar por nível WCAG (A, AA, AAA)"),
    api_key: str = Depends(get_api_key)
):
    """
    Endpoint para listar todas as regras de acessibilidade disponíveis.
    
    Args:
        category: Filtro opcional por categoria
        level: Filtro opcional por nível WCAG
        api_key: API key validada pela dependência get_api_key
        
    Returns:
        List[dict]: Lista de regras de acessibilidade
    """
    try:
        rules = await accessibility_service.list_accessibility_rules(category, level)
        return rules
    except Exception as e:
        logger.exception("Erro ao listar regras de acessibilidade")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar regras: {str(e)}"
        )
