"""
Arquivo: /home/ubuntu/backend/app/services/tasks.py
Serviço de gerenciamento de tarefas de acessibilidade.
Implementa a lógica de negócio para criação, atualização e consulta de tarefas.
"""

import logging
import time
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.core.config import settings
from app.schemas.tasks import (
    Task,
    TaskCreate,
    TaskUpdate,
    TaskList,
    TaskPriority,
    TaskStatus
)
from app.domain.task_management import (
    TaskPriorityCalculator,
    TaskEstimator,
    get_allowed_transitions,
    is_transition_allowed
)
from app.adapters.storage_adapter import StorageAdapter

# Configuração do logger
logger = logging.getLogger(__name__)

class TaskService:
    """
    Serviço para gerenciamento de tarefas de acessibilidade.
    Implementa a lógica de negócio para tarefas de correção e monitoramento.
    """
    
    def __init__(self):
        """
        Inicializa o serviço com adaptadores necessários.
        """
        self.storage_adapter = StorageAdapter()
        
        # Armazenamento em memória para simulação (seria um banco de dados real)
        self._tasks = {}
    
    async def create_task(self, task_create: TaskCreate) -> Task:
        """
        Cria uma nova tarefa de acessibilidade.
        
        Args:
            task_create: Dados da tarefa a ser criada
            
        Returns:
            Task: Tarefa criada
        """
        logger.info(f"Criando tarefa: {task_create.title}")
        
        # Gera ID único
        task_id = f"task_{uuid.uuid4()}"
        
        # Timestamp atual
        now = datetime.now()
        
        # Cria a tarefa
        task = Task(
            id=task_id,
            title=task_create.title,
            description=task_create.description,
            url=task_create.url,
            type=task_create.type,
            status=TaskStatus.PENDING,
            priority=task_create.priority,
            due_date=task_create.due_date,
            assignee=task_create.assignee,
            tags=task_create.tags,
            related_issues=task_create.related_issues,
            progress=0,
            notes=None,
            created_at=now,
            updated_at=now,
            completed_at=None,
            created_by="system"  # Em uma implementação real, seria o usuário autenticado
        )
        
        # Armazena a tarefa (em uma implementação real, seria no banco de dados)
        self._tasks[task_id] = task.dict()
        
        logger.info(f"Tarefa criada com sucesso: {task_id}")
        return task
    
    async def get_task(self, task_id: str) -> Optional[Task]:
        """
        Obtém uma tarefa pelo ID.
        
        Args:
            task_id: ID da tarefa
            
        Returns:
            Task: Tarefa encontrada ou None se não existir
        """
        logger.info(f"Buscando tarefa: {task_id}")
        
        # Busca a tarefa (em uma implementação real, seria no banco de dados)
        task_data = self._tasks.get(task_id)
        
        if not task_data:
            logger.warning(f"Tarefa não encontrada: {task_id}")
            return None
        
        return Task(**task_data)
    
    async def update_task(self, task_id: str, task_update: TaskUpdate) -> Task:
        """
        Atualiza uma tarefa existente.
        
        Args:
            task_id: ID da tarefa
            task_update: Dados para atualização
            
        Returns:
            Task: Tarefa atualizada
            
        Raises:
            ValueError: Se a tarefa não existir ou a transição de status não for permitida
        """
        logger.info(f"Atualizando tarefa: {task_id}")
        
        # Busca a tarefa existente
        task_data = self._tasks.get(task_id)
        
        if not task_data:
            logger.warning(f"Tarefa não encontrada para atualização: {task_id}")
            raise ValueError(f"Tarefa não encontrada: {task_id}")
        
        # Cria objeto Task a partir dos dados
        task = Task(**task_data)
        
        # Verifica transição de status
        if task_update.status and task_update.status != task.status:
            if not is_transition_allowed(task.status, task_update.status):
                logger.warning(f"Transição de status não permitida: {task.status} -> {task_update.status}")
                raise ValueError(f"Transição de status não permitida: {task.status} -> {task_update.status}")
        
        # Atualiza os campos
        update_data = task_update.dict(exclude_unset=True)
        
        # Atualiza o timestamp
        update_data["updated_at"] = datetime.now()
        
        # Aplica as atualizações
        task_dict = task.dict()
        task_dict.update(update_data)
        
        # Armazena a tarefa atualizada
        self._tasks[task_id] = task_dict
        
        logger.info(f"Tarefa atualizada com sucesso: {task_id}")
        return Task(**task_dict)
    
    async def delete_task(self, task_id: str) -> None:
        """
        Exclui uma tarefa existente.
        
        Args:
            task_id: ID da tarefa
            
        Raises:
            ValueError: Se a tarefa não existir
        """
        logger.info(f"Excluindo tarefa: {task_id}")
        
        # Verifica se a tarefa existe
        if task_id not in self._tasks:
            logger.warning(f"Tarefa não encontrada para exclusão: {task_id}")
            raise ValueError(f"Tarefa não encontrada: {task_id}")
        
        # Remove a tarefa
        del self._tasks[task_id]
        
        logger.info(f"Tarefa excluída com sucesso: {task_id}")
    
    async def list_tasks(
        self,
        url: Optional[str] = None,
        status: Optional[TaskStatus] = None,
        priority: Optional[TaskPriority] = None,
        skip: int = 0,
        limit: int = 100
    ) -> TaskList:
        """
        Lista tarefas com filtros e paginação.
        
        Args:
            url: Filtro opcional por URL
            status: Filtro opcional por status
            priority: Filtro opcional por prioridade
            skip: Número de registros para pular (paginação)
            limit: Número máximo de registros a retornar
            
        Returns:
            TaskList: Lista paginada de tarefas
        """
        logger.info(f"Listando tarefas com filtros: url={url}, status={status}, priority={priority}")
        
        # Aplica filtros
        filtered_tasks = []
        
        for task_data in self._tasks.values():
            task = Task(**task_data)
            
            # Aplica filtro de URL
            if url and str(task.url) != url:
                continue
            
            # Aplica filtro de status
            if status and task.status != status:
                continue
            
            # Aplica filtro de prioridade
            if priority and task.priority != priority:
                continue
            
            filtered_tasks.append(task)
        
        # Ordena por prioridade e data de criação
        sorted_tasks = sorted(
            filtered_tasks,
            key=lambda t: (
                # Ordem de prioridade: critical, high, medium, low
                ["critical", "high", "medium", "low"].index(t.priority),
                t.created_at
            )
        )
        
        # Aplica paginação
        total = len(sorted_tasks)
        paginated_tasks = sorted_tasks[skip:skip+limit]
        
        # Calcula número de páginas
        pages = (total + limit - 1) // limit if limit > 0 else 1
        page = (skip // limit) + 1 if limit > 0 else 1
        
        logger.info(f"Tarefas listadas: {len(paginated_tasks)} de {total}")
        
        return TaskList(
            items=paginated_tasks,
            total=total,
            page=page,
            size=limit,
            pages=pages
        )
    
    async def calculate_task_priority(
        self,
        wcag_level: str,
        impact: str,
        affected_users: str,
        visibility: str,
        urgency: str
    ) -> Dict[str, Any]:
        """
        Calcula a prioridade recomendada para uma tarefa.
        
        Args:
            wcag_level: Nível WCAG (A, AA, AAA)
            impact: Impacto do problema (critical, high, medium, low)
            affected_users: Quantidade de usuários afetados (all, many, some, few)
            visibility: Visibilidade do problema (high, medium, low)
            urgency: Urgência da correção (immediate, soon, eventual)
            
        Returns:
            Dict[str, Any]: Prioridade recomendada e pontuação
        """
        # Calcula a pontuação
        score = TaskPriorityCalculator.calculate_priority_score(
            wcag_level, impact, affected_users, visibility, urgency
        )
        
        # Determina a categoria
        category = TaskPriorityCalculator.get_priority_category(score)
        
        return {
            "score": score,
            "priority": category,
            "factors": {
                "wcag_level": wcag_level,
                "impact": impact,
                "affected_users": affected_users,
                "visibility": visibility,
                "urgency": urgency
            }
        }
    
    async def estimate_task_effort(
        self,
        task_type: str,
        complexity: str,
        resources: float = 1.0
    ) -> Dict[str, Any]:
        """
        Estima o esforço e duração para uma tarefa.
        
        Args:
            task_type: Tipo de tarefa (fix, review, implement, monitor)
            complexity: Complexidade da tarefa (simple, moderate, complex)
            resources: Número de recursos alocados (pessoas)
            
        Returns:
            Dict[str, Any]: Estimativas de esforço e duração
        """
        # Calcula o esforço
        effort = TaskEstimator.estimate_effort(task_type, complexity)
        
        # Calcula a duração
        duration = TaskEstimator.estimate_duration(effort, resources)
        
        return {
            "effort_hours": effort,
            "duration_days": duration.days,
            "estimated_completion_date": (datetime.now() + duration).isoformat(),
            "factors": {
                "task_type": task_type,
                "complexity": complexity,
                "resources": resources
            }
        }
    
    async def get_allowed_status_transitions(self, current_status: str) -> List[Dict[str, Any]]:
        """
        Obtém as transições de status permitidas a partir do status atual.
        
        Args:
            current_status: Status atual da tarefa
            
        Returns:
            List[Dict[str, Any]]: Lista de transições permitidas
        """
        transitions = get_allowed_transitions(current_status)
        
        return [
            {
                "from_status": t.from_status,
                "to_status": t.to_status,
                "name": t.name,
                "requires_permission": t.requires_permission,
                "requires_comment": t.requires_comment
            }
            for t in transitions
        ]
