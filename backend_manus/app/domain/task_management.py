"""
Arquivo: /home/ubuntu/backend/app/domain/task_management.py
Modelos de domínio para gerenciamento de tarefas de acessibilidade.
Define estruturas e regras para tarefas, priorização e fluxos de trabalho.
"""

from enum import Enum
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, Field

class TaskPriorityCalculator:
    """
    Calculadora de prioridade para tarefas de acessibilidade.
    Determina a prioridade com base em vários fatores.
    """
    
    # Pesos para diferentes fatores na priorização
    WEIGHTS = {
        "wcag_level": {
            "A": 5,
            "AA": 3,
            "AAA": 1
        },
        "impact": {
            "critical": 5,
            "high": 4,
            "medium": 3,
            "low": 1
        },
        "affected_users": {
            "all": 5,
            "many": 4,
            "some": 2,
            "few": 1
        },
        "visibility": {
            "high": 3,
            "medium": 2,
            "low": 1
        },
        "urgency": {
            "immediate": 5,
            "soon": 3,
            "eventual": 1
        }
    }
    
    @staticmethod
    def calculate_priority_score(
        wcag_level: str,
        impact: str,
        affected_users: str,
        visibility: str,
        urgency: str
    ) -> int:
        """
        Calcula a pontuação de prioridade com base nos fatores fornecidos.
        
        Args:
            wcag_level: Nível WCAG (A, AA, AAA)
            impact: Impacto do problema (critical, high, medium, low)
            affected_users: Quantidade de usuários afetados (all, many, some, few)
            visibility: Visibilidade do problema (high, medium, low)
            urgency: Urgência da correção (immediate, soon, eventual)
            
        Returns:
            Pontuação de prioridade (1-100)
        """
        weights = TaskPriorityCalculator.WEIGHTS
        
        # Calcula a pontuação ponderada
        score = (
            weights["wcag_level"].get(wcag_level, 0) * 4 +
            weights["impact"].get(impact, 0) * 5 +
            weights["affected_users"].get(affected_users, 0) * 3 +
            weights["visibility"].get(visibility, 0) * 2 +
            weights["urgency"].get(urgency, 0) * 4
        )
        
        # Normaliza para escala 1-100
        max_possible_score = (
            max(weights["wcag_level"].values()) * 4 +
            max(weights["impact"].values()) * 5 +
            max(weights["affected_users"].values()) * 3 +
            max(weights["visibility"].values()) * 2 +
            max(weights["urgency"].values()) * 4
        )
        
        normalized_score = int((score / max_possible_score) * 100)
        
        return max(1, min(normalized_score, 100))  # Garante que está entre 1 e 100
    
    @staticmethod
    def get_priority_category(score: int) -> str:
        """
        Converte uma pontuação numérica em categoria de prioridade.
        
        Args:
            score: Pontuação de prioridade (1-100)
            
        Returns:
            Categoria de prioridade (critical, high, medium, low)
        """
        if score >= 80:
            return "critical"
        elif score >= 60:
            return "high"
        elif score >= 40:
            return "medium"
        else:
            return "low"

class TaskEstimator:
    """
    Estimador de esforço e tempo para tarefas de acessibilidade.
    """
    
    # Estimativas base em horas-pessoa
    BASE_ESTIMATES = {
        "fix": {
            "simple": 1,
            "moderate": 4,
            "complex": 16
        },
        "review": {
            "simple": 0.5,
            "moderate": 2,
            "complex": 8
        },
        "implement": {
            "simple": 2,
            "moderate": 8,
            "complex": 24
        },
        "monitor": {
            "simple": 0.5,
            "moderate": 1,
            "complex": 4
        }
    }
    
    @staticmethod
    def estimate_effort(task_type: str, complexity: str) -> float:
        """
        Estima o esforço necessário para uma tarefa em horas-pessoa.
        
        Args:
            task_type: Tipo de tarefa (fix, review, implement, monitor)
            complexity: Complexidade da tarefa (simple, moderate, complex)
            
        Returns:
            Esforço estimado em horas-pessoa
        """
        estimates = TaskEstimator.BASE_ESTIMATES
        
        if task_type in estimates and complexity in estimates[task_type]:
            return estimates[task_type][complexity]
        
        # Valor padrão se tipo ou complexidade não encontrados
        return 4.0
    
    @staticmethod
    def estimate_duration(
        effort: float,
        resources: float = 1.0,
        efficiency: float = 0.7
    ) -> timedelta:
        """
        Estima a duração de uma tarefa com base no esforço e recursos.
        
        Args:
            effort: Esforço estimado em horas-pessoa
            resources: Número de recursos alocados (pessoas)
            efficiency: Fator de eficiência (0.0-1.0)
            
        Returns:
            Duração estimada como timedelta
        """
        # Calcula horas de trabalho efetivas
        effective_hours = effort / (resources * efficiency)
        
        # Converte para dias de trabalho (assumindo 8 horas por dia)
        work_days = effective_hours / 8
        
        # Adiciona buffer para imprevistos (20%)
        work_days_with_buffer = work_days * 1.2
        
        # Converte para dias corridos (considerando fins de semana)
        calendar_days = work_days_with_buffer * 1.4
        
        # Retorna como timedelta
        return timedelta(days=calendar_days)

class WorkflowTransition(BaseModel):
    """
    Transição de estado em um fluxo de trabalho.
    """
    from_status: str
    to_status: str
    name: str
    requires_permission: Optional[str] = None
    requires_comment: bool = False
    
    class Config:
        frozen = True

# Definição do fluxo de trabalho para tarefas de acessibilidade
TASK_WORKFLOW_TRANSITIONS = [
    WorkflowTransition(
        from_status="pending",
        to_status="in_progress",
        name="Iniciar trabalho",
        requires_permission=None,
        requires_comment=False
    ),
    WorkflowTransition(
        from_status="in_progress",
        to_status="completed",
        name="Concluir tarefa",
        requires_permission=None,
        requires_comment=True
    ),
    WorkflowTransition(
        from_status="in_progress",
        to_status="pending",
        name="Pausar trabalho",
        requires_permission=None,
        requires_comment=True
    ),
    WorkflowTransition(
        from_status="pending",
        to_status="cancelled",
        name="Cancelar tarefa",
        requires_permission="admin",
        requires_comment=True
    ),
    WorkflowTransition(
        from_status="in_progress",
        to_status="cancelled",
        name="Cancelar tarefa",
        requires_permission="admin",
        requires_comment=True
    ),
    WorkflowTransition(
        from_status="cancelled",
        to_status="pending",
        name="Reativar tarefa",
        requires_permission="admin",
        requires_comment=True
    )
]

def get_allowed_transitions(current_status: str) -> List[WorkflowTransition]:
    """
    Obtém as transições permitidas a partir de um status atual.
    
    Args:
        current_status: Status atual da tarefa
        
    Returns:
        Lista de transições permitidas
    """
    return [t for t in TASK_WORKFLOW_TRANSITIONS if t.from_status == current_status]

def is_transition_allowed(from_status: str, to_status: str) -> bool:
    """
    Verifica se uma transição de status é permitida.
    
    Args:
        from_status: Status atual
        to_status: Status desejado
        
    Returns:
        True se a transição for permitida, False caso contrário
    """
    return any(t.from_status == from_status and t.to_status == to_status 
               for t in TASK_WORKFLOW_TRANSITIONS)
