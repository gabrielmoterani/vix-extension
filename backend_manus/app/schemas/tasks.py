"""
Arquivo: /home/ubuntu/backend/app/schemas/tasks.py
Schemas Pydantic para validação de dados relacionados a tarefas de acessibilidade.
Define estruturas de dados para requisições e respostas da API de tarefas.
"""

from pydantic import BaseModel, Field, HttpUrl, validator
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

class TaskStatus(str, Enum):
    """
    Status possíveis para uma tarefa de acessibilidade.
    """
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TaskPriority(str, Enum):
    """
    Níveis de prioridade para uma tarefa de acessibilidade.
    """
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class TaskType(str, Enum):
    """
    Tipos de tarefas de acessibilidade.
    """
    FIX = "fix"
    REVIEW = "review"
    MONITOR = "monitor"
    IMPLEMENT = "implement"

class TaskCreate(BaseModel):
    """
    Dados para criação de uma nova tarefa de acessibilidade.
    """
    title: str = Field(..., description="Título da tarefa")
    description: str = Field(..., description="Descrição detalhada da tarefa")
    url: HttpUrl = Field(..., description="URL da página relacionada")
    type: TaskType = Field(..., description="Tipo da tarefa")
    priority: TaskPriority = Field(TaskPriority.MEDIUM, description="Prioridade da tarefa")
    due_date: Optional[datetime] = Field(None, description="Data de vencimento")
    assignee: Optional[str] = Field(None, description="ID do responsável pela tarefa")
    tags: List[str] = Field(default_factory=list, description="Tags para categorização")
    related_issues: List[str] = Field(default_factory=list, description="IDs de problemas relacionados")
    
    @validator('title')
    def title_not_empty(cls, v):
        """Valida se o título não está vazio."""
        if not v or not v.strip():
            raise ValueError("O título não pode estar vazio")
        return v.strip()
    
    @validator('description')
    def description_not_empty(cls, v):
        """Valida se a descrição não está vazia."""
        if not v or not v.strip():
            raise ValueError("A descrição não pode estar vazia")
        return v.strip()

class TaskUpdate(BaseModel):
    """
    Dados para atualização de uma tarefa existente.
    """
    title: Optional[str] = Field(None, description="Título da tarefa")
    description: Optional[str] = Field(None, description="Descrição detalhada da tarefa")
    status: Optional[TaskStatus] = Field(None, description="Status da tarefa")
    priority: Optional[TaskPriority] = Field(None, description="Prioridade da tarefa")
    due_date: Optional[datetime] = Field(None, description="Data de vencimento")
    assignee: Optional[str] = Field(None, description="ID do responsável pela tarefa")
    tags: Optional[List[str]] = Field(None, description="Tags para categorização")
    related_issues: Optional[List[str]] = Field(None, description="IDs de problemas relacionados")
    progress: Optional[int] = Field(None, description="Progresso da tarefa (0-100)")
    notes: Optional[str] = Field(None, description="Notas adicionais")
    completed_at: Optional[datetime] = Field(None, description="Data de conclusão")
    
    @validator('title')
    def title_not_empty(cls, v):
        """Valida se o título não está vazio quando fornecido."""
        if v is not None and not v.strip():
            raise ValueError("O título não pode estar vazio")
        return v.strip() if v else None
    
    @validator('description')
    def description_not_empty(cls, v):
        """Valida se a descrição não está vazia quando fornecida."""
        if v is not None and not v.strip():
            raise ValueError("A descrição não pode estar vazia")
        return v.strip() if v else None
    
    @validator('progress')
    def progress_range(cls, v):
        """Valida se o progresso está entre 0 e 100."""
        if v is not None and (v < 0 or v > 100):
            raise ValueError("O progresso deve estar entre 0 e 100")
        return v

class Task(BaseModel):
    """
    Representação completa de uma tarefa de acessibilidade.
    """
    id: str = Field(..., description="ID único da tarefa")
    title: str = Field(..., description="Título da tarefa")
    description: str = Field(..., description="Descrição detalhada da tarefa")
    url: HttpUrl = Field(..., description="URL da página relacionada")
    type: TaskType = Field(..., description="Tipo da tarefa")
    status: TaskStatus = Field(..., description="Status da tarefa")
    priority: TaskPriority = Field(..., description="Prioridade da tarefa")
    due_date: Optional[datetime] = Field(None, description="Data de vencimento")
    assignee: Optional[str] = Field(None, description="ID do responsável pela tarefa")
    tags: List[str] = Field(default_factory=list, description="Tags para categorização")
    related_issues: List[str] = Field(default_factory=list, description="IDs de problemas relacionados")
    progress: int = Field(0, description="Progresso da tarefa (0-100)")
    notes: Optional[str] = Field(None, description="Notas adicionais")
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data da última atualização")
    completed_at: Optional[datetime] = Field(None, description="Data de conclusão")
    created_by: str = Field(..., description="ID do criador da tarefa")
    
    class Config:
        schema_extra = {
            "example": {
                "id": "task_123456",
                "title": "Corrigir contraste de botões",
                "description": "Os botões de ação na página principal não têm contraste suficiente para usuários com baixa visão.",
                "url": "https://example.com",
                "type": "fix",
                "status": "pending",
                "priority": "high",
                "due_date": "2025-06-01T00:00:00Z",
                "assignee": "user_123",
                "tags": ["contraste", "botões", "WCAG-AA"],
                "related_issues": ["issue_789"],
                "progress": 0,
                "notes": None,
                "created_at": "2025-05-23T04:19:00Z",
                "updated_at": "2025-05-23T04:19:00Z",
                "completed_at": None,
                "created_by": "user_456"
            }
        }

class TaskList(BaseModel):
    """
    Lista paginada de tarefas de acessibilidade.
    """
    items: List[Task] = Field(..., description="Lista de tarefas")
    total: int = Field(..., description="Número total de tarefas")
    page: int = Field(1, description="Página atual")
    size: int = Field(..., description="Tamanho da página")
    pages: int = Field(..., description="Número total de páginas")
    
    @validator('pages')
    def calculate_pages(cls, v, values):
        """Calcula o número de páginas com base no total e tamanho."""
        if 'total' in values and 'size' in values and values['size'] > 0:
            return (values['total'] + values['size'] - 1) // values['size']
        return v
