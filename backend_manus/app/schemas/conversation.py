"""
Arquivo: /home/ubuntu/backend/app/schemas/conversation.py
Schemas Pydantic para validação de dados relacionados a conversações.
Define estruturas de dados para requisições e respostas da API de conversação.
"""

from pydantic import BaseModel, Field, HttpUrl, validator
from typing import List, Dict, Any, Optional
from datetime import datetime

class UserIntent(BaseModel):
    """
    Intenção do usuário em linguagem natural.
    """
    text: str = Field(..., description="Texto da intenção do usuário")
    url: HttpUrl = Field(..., description="URL da página atual")
    context: Dict[str, Any] = Field(
        default_factory=dict,
        description="Contexto da página (grafo de cena, elementos visíveis, etc.)"
    )
    sessionId: Optional[str] = Field(None, description="ID da sessão para rastreamento")

class ActionStep(BaseModel):
    """
    Passo de uma ação a ser executada.
    """
    type: str = Field(..., description="Tipo de ação (focus, click, input, scroll, etc.)")
    selector: Optional[str] = Field(None, description="Seletor CSS do elemento alvo")
    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Parâmetros adicionais da ação"
    )
    description: str = Field(..., description="Descrição da ação em linguagem natural")

class ActionPlan(BaseModel):
    """
    Plano de ações para atender à intenção do usuário.
    """
    intent: str = Field(..., description="Intenção do usuário interpretada")
    actions: List[ActionStep] = Field(..., description="Lista de ações a serem executadas")
    explanation: str = Field(..., description="Explicação do plano em linguagem natural")
    confidence: float = Field(..., description="Nível de confiança na interpretação (0-1)")
    alternatives: Optional[List[str]] = Field(None, description="Interpretações alternativas da intenção")

class Message(BaseModel):
    """
    Mensagem em uma conversação.
    """
    id: str = Field(..., description="ID único da mensagem")
    role: str = Field(..., description="Papel do emissor (user, assistant)")
    content: str = Field(..., description="Conteúdo da mensagem")
    timestamp: datetime = Field(default_factory=datetime.now, description="Data e hora da mensagem")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Metadados adicionais")

class ConversationHistory(BaseModel):
    """
    Histórico de uma conversação.
    """
    sessionId: str = Field(..., description="ID da sessão de conversação")
    messages: List[Message] = Field(default_factory=list, description="Lista de mensagens")
    created_at: datetime = Field(default_factory=datetime.now, description="Data e hora de criação")
    updated_at: datetime = Field(default_factory=datetime.now, description="Data e hora da última atualização")

class ConversationRequest(BaseModel):
    """
    Requisição para conversar com o assistente.
    """
    message: str = Field(..., description="Mensagem do usuário")
    history: Optional[List[Message]] = Field(None, description="Histórico da conversação")
    context: Optional[Dict[str, Any]] = Field(None, description="Contexto da página atual")
    sessionId: Optional[str] = Field(None, description="ID da sessão para rastreamento")

class ConversationResponse(BaseModel):
    """
    Resposta do assistente em uma conversação.
    """
    message: str = Field(..., description="Mensagem do assistente")
    actions: Optional[List[ActionStep]] = Field(None, description="Ações sugeridas")
    references: Optional[List[Dict[str, Any]]] = Field(None, description="Referências utilizadas")
    sessionId: str = Field(..., description="ID da sessão para rastreamento")
    messageId: str = Field(..., description="ID único da mensagem")
    
    @validator('message')
    def message_not_empty(cls, v):
        """Valida se a mensagem não está vazia."""
        if not v or not v.strip():
            raise ValueError("A mensagem não pode estar vazia")
        return v
