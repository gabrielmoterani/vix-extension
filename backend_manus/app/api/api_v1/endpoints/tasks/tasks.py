"""
Arquivo: /home/ubuntu/backend/app/api/api_v1/endpoints/tasks.py
Endpoints para gerenciamento de tarefas de acessibilidade.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body
from http import HTTPStatus
from typing import List, Optional
from datetime import datetime

from app.core.security import get_api_key, validate_permissions
from app.schemas.tasks import (
    Task,
    TaskCreate,
    TaskUpdate,
    TaskList,
    TaskPriority,
    TaskStatus
)
from app.services.tasks import TaskService
from app.core.config import settings

# Configuração do logger
logger = logging.getLogger(__name__)

# Criação do router
router = APIRouter()

# Instância do serviço
task_service = TaskService()

@router.post(
    "/",
    response_model=Task,
    status_code=HTTPStatus.CREATED,
    summary="Criar nova tarefa de acessibilidade",
    description="Cria uma nova tarefa de acessibilidade para uma página específica."
)
async def create_task(
    task: TaskCreate,
    api_key: str = Depends(get_api_key)
):
    """
    Endpoint para criar uma nova tarefa de acessibilidade.
    
    Args:
        task: Dados da tarefa a ser criada
        api_key: API key validada pela dependência get_api_key
        
    Returns:
        Task: Tarefa criada
        
    Raises:
        HTTPException: Se ocorrer algum erro durante o processamento
    """
    try:
        logger.info(f"Requisição para criar tarefa recebida: {task.title}")
        
        # Cria a tarefa
        created_task = await task_service.create_task(task)
        
        logger.info(f"Tarefa criada com sucesso: {created_task.id}")
        return created_task
        
    except Exception as e:
        logger.exception(f"Erro ao criar tarefa: {task.title}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar tarefa: {str(e)}"
        )

@router.get(
    "/",
    response_model=TaskList,
    status_code=HTTPStatus.OK,
    summary="Listar tarefas de acessibilidade",
    description="Lista todas as tarefas de acessibilidade com opções de filtragem e paginação."
)
async def list_tasks(
    url: Optional[str] = Query(None, description="Filtrar por URL"),
    status: Optional[TaskStatus] = Query(None, description="Filtrar por status"),
    priority: Optional[TaskPriority] = Query(None, description="Filtrar por prioridade"),
    skip: int = Query(0, description="Número de registros para pular (paginação)"),
    limit: int = Query(100, description="Número máximo de registros a retornar"),
    api_key: str = Depends(get_api_key)
):
    """
    Endpoint para listar tarefas de acessibilidade.
    
    Args:
        url: Filtro opcional por URL
        status: Filtro opcional por status
        priority: Filtro opcional por prioridade
        skip: Número de registros para pular (paginação)
        limit: Número máximo de registros a retornar
        api_key: API key validada pela dependência get_api_key
        
    Returns:
        TaskList: Lista de tarefas
        
    Raises:
        HTTPException: Se ocorrer algum erro durante o processamento
    """
    try:
        logger.info(f"Requisição para listar tarefas recebida")
        
        # Lista as tarefas
        tasks = await task_service.list_tasks(
            url=url,
            status=status,
            priority=priority,
            skip=skip,
            limit=limit
        )
        
        logger.info(f"Tarefas listadas com sucesso: {len(tasks.items)} tarefas")
        return tasks
        
    except Exception as e:
        logger.exception(f"Erro ao listar tarefas")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar tarefas: {str(e)}"
        )

@router.get(
    "/{task_id}",
    response_model=Task,
    status_code=HTTPStatus.OK,
    summary="Obter tarefa específica",
    description="Obtém detalhes de uma tarefa específica pelo ID."
)
async def get_task(
    task_id: str = Path(..., description="ID da tarefa"),
    api_key: str = Depends(get_api_key)
):
    """
    Endpoint para obter detalhes de uma tarefa específica.
    
    Args:
        task_id: ID da tarefa
        api_key: API key validada pela dependência get_api_key
        
    Returns:
        Task: Detalhes da tarefa
        
    Raises:
        HTTPException: Se a tarefa não for encontrada ou ocorrer outro erro
    """
    try:
        logger.info(f"Requisição para obter tarefa recebida: {task_id}")
        
        # Obtém a tarefa
        task = await task_service.get_task(task_id)
        
        if not task:
            logger.warning(f"Tarefa não encontrada: {task_id}")
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail=f"Tarefa não encontrada: {task_id}"
            )
        
        logger.info(f"Tarefa obtida com sucesso: {task_id}")
        return task
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Erro ao obter tarefa: {task_id}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter tarefa: {str(e)}"
        )

@router.put(
    "/{task_id}",
    response_model=Task,
    status_code=HTTPStatus.OK,
    summary="Atualizar tarefa",
    description="Atualiza uma tarefa existente pelo ID."
)
async def update_task(
    task_id: str = Path(..., description="ID da tarefa"),
    task_update: TaskUpdate = Body(..., description="Dados para atualização"),
    api_key: str = Depends(get_api_key)
):
    """
    Endpoint para atualizar uma tarefa existente.
    
    Args:
        task_id: ID da tarefa
        task_update: Dados para atualização
        api_key: API key validada pela dependência get_api_key
        
    Returns:
        Task: Tarefa atualizada
        
    Raises:
        HTTPException: Se a tarefa não for encontrada ou ocorrer outro erro
    """
    try:
        logger.info(f"Requisição para atualizar tarefa recebida: {task_id}")
        
        # Verifica se a tarefa existe
        existing_task = await task_service.get_task(task_id)
        if not existing_task:
            logger.warning(f"Tarefa não encontrada para atualização: {task_id}")
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail=f"Tarefa não encontrada: {task_id}"
            )
        
        # Atualiza a tarefa
        updated_task = await task_service.update_task(task_id, task_update)
        
        logger.info(f"Tarefa atualizada com sucesso: {task_id}")
        return updated_task
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Erro ao atualizar tarefa: {task_id}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar tarefa: {str(e)}"
        )

@router.delete(
    "/{task_id}",
    status_code=HTTPStatus.NO_CONTENT,
    summary="Excluir tarefa",
    description="Exclui uma tarefa existente pelo ID."
)
async def delete_task(
    task_id: str = Path(..., description="ID da tarefa"),
    api_key: str = Depends(get_api_key),
    _permissions = Depends(validate_permissions(["admin"]))
):
    """
    Endpoint para excluir uma tarefa existente.
    Requer permissão de administrador.
    
    Args:
        task_id: ID da tarefa
        api_key: API key validada pela dependência get_api_key
        _permissions: Validação de permissões
        
    Returns:
        None
        
    Raises:
        HTTPException: Se a tarefa não for encontrada ou ocorrer outro erro
    """
    try:
        logger.info(f"Requisição para excluir tarefa recebida: {task_id}")
        
        # Verifica se a tarefa existe
        existing_task = await task_service.get_task(task_id)
        if not existing_task:
            logger.warning(f"Tarefa não encontrada para exclusão: {task_id}")
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail=f"Tarefa não encontrada: {task_id}"
            )
        
        # Exclui a tarefa
        await task_service.delete_task(task_id)
        
        logger.info(f"Tarefa excluída com sucesso: {task_id}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Erro ao excluir tarefa: {task_id}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Erro ao excluir tarefa: {str(e)}"
        )

@router.post(
    "/{task_id}/complete",
    response_model=Task,
    status_code=HTTPStatus.OK,
    summary="Marcar tarefa como concluída",
    description="Marca uma tarefa como concluída e registra a data de conclusão."
)
async def complete_task(
    task_id: str = Path(..., description="ID da tarefa"),
    api_key: str = Depends(get_api_key)
):
    """
    Endpoint para marcar uma tarefa como concluída.
    
    Args:
        task_id: ID da tarefa
        api_key: API key validada pela dependência get_api_key
        
    Returns:
        Task: Tarefa atualizada
        
    Raises:
        HTTPException: Se a tarefa não for encontrada ou ocorrer outro erro
    """
    try:
        logger.info(f"Requisição para concluir tarefa recebida: {task_id}")
        
        # Verifica se a tarefa existe
        existing_task = await task_service.get_task(task_id)
        if not existing_task:
            logger.warning(f"Tarefa não encontrada para conclusão: {task_id}")
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail=f"Tarefa não encontrada: {task_id}"
            )
        
        # Atualiza a tarefa
        task_update = TaskUpdate(
            status=TaskStatus.COMPLETED,
            completed_at=datetime.now()
        )
        completed_task = await task_service.update_task(task_id, task_update)
        
        logger.info(f"Tarefa concluída com sucesso: {task_id}")
        return completed_task
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Erro ao concluir tarefa: {task_id}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Erro ao concluir tarefa: {str(e)}"
        )
