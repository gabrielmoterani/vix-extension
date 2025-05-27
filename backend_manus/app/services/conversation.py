"""
Arquivo: /home/ubuntu/backend/app/services/conversation.py
Serviço de gerenciamento de conversações e interações com usuários.
Implementa a lógica de negócio para processamento de intenções e conversas.
"""

import logging
import time
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.core.config import settings
from app.schemas.conversation import (
    ConversationRequest,
    ConversationResponse,
    UserIntent,
    ActionPlan,
    ConversationHistory,
    Message
)
from app.domain.conversation_intents import (
    IntentCategory,
    IntentConfidenceLevel,
    extract_entities_from_intent
)
from app.adapters.ia_adapter import IAAdapter
from app.adapters.cache_adapter import CacheAdapter

# Configuração do logger
logger = logging.getLogger(__name__)

class ConversationService:
    """
    Serviço para gerenciamento de conversações e interações com usuários.
    Implementa a lógica de negócio para processamento de intenções e conversas.
    """
    
    def __init__(self):
        """
        Inicializa o serviço com adaptadores necessários.
        """
        self.ia_adapter = IAAdapter()
        self.cache_adapter = CacheAdapter()
        
        # Métricas para monitoramento
        self.last_processing_time = 0
        self.last_tokens_used = 0
    
    async def process_intent(self, intent: UserIntent) -> ActionPlan:
        """
        Processa a intenção do usuário em linguagem natural.
        
        Args:
            intent: Intenção do usuário e contexto da página
            
        Returns:
            ActionPlan: Plano de ações a serem executadas
        """
        start_time = time.time()
        logger.info(f"Processando intenção: {intent.text[:50]}...")
        
        # Gera um sessionId se não fornecido
        session_id = intent.sessionId or str(uuid.uuid4())
        
        # Extrai entidades da intenção
        entities = extract_entities_from_intent(intent.text, intent.context)
        
        # Prepara dados para processamento
        intent_data = {
            "text": intent.text,
            "url": str(intent.url),
            "context": intent.context,
            "entities": entities,
            "session_id": session_id
        }
        
        # Processa a intenção com IA
        result = await self.ia_adapter.process_intent(intent_data)
        
        # Registra métricas
        self.last_tokens_used = result.get("tokens_used", 0)
        self.last_processing_time = time.time() - start_time
        
        # Constrói o plano de ações
        action_plan = ActionPlan(
            intent=result.get("interpreted_intent", intent.text),
            actions=result.get("actions", []),
            explanation=result.get("explanation", "Plano de ações baseado na sua solicitação."),
            confidence=result.get("confidence", 0.7),
            alternatives=result.get("alternatives")
        )
        
        logger.info(f"Intenção processada em {self.last_processing_time:.2f}s: {len(action_plan.actions)} ações geradas")
        
        # Salva o histórico da intenção
        await self._save_intent_to_history(session_id, intent.text, action_plan)
        
        return action_plan
    
    async def chat(
        self,
        message: str,
        history: Optional[List[Message]] = None,
        context: Optional[Dict[str, Any]] = None,
        session_id: Optional[str] = None
    ) -> ConversationResponse:
        """
        Processa uma mensagem de chat com o assistente.
        
        Args:
            message: Mensagem do usuário
            history: Histórico da conversação
            context: Contexto da página atual
            session_id: ID da sessão para rastreamento
            
        Returns:
            ConversationResponse: Resposta do assistente
        """
        start_time = time.time()
        logger.info(f"Processando mensagem de chat: {message[:50]}...")
        
        # Gera um sessionId se não fornecido
        session_id = session_id or str(uuid.uuid4())
        
        # Gera um ID único para a mensagem
        message_id = f"msg_{uuid.uuid4()}"
        
        # Prepara o histórico
        history = history or []
        
        # Prepara dados para processamento
        chat_data = {
            "message": message,
            "history": [m.dict() for m in history],
            "context": context or {},
            "session_id": session_id
        }
        
        # Processa a mensagem com IA
        result = await self.ia_adapter.process_chat(chat_data)
        
        # Registra métricas
        self.last_tokens_used = result.get("tokens_used", 0)
        self.last_processing_time = time.time() - start_time
        
        # Constrói a resposta
        response = ConversationResponse(
            message=result.get("response", "Desculpe, não consegui processar sua mensagem."),
            actions=result.get("suggested_actions", []),
            references=result.get("references"),
            sessionId=session_id,
            messageId=message_id
        )
        
        logger.info(f"Mensagem processada em {self.last_processing_time:.2f}s")
        
        # Salva a conversa no histórico
        await self._save_conversation(
            session_id=session_id,
            user_message=message,
            user_message_id=f"user_{int(time.time())}",
            assistant_message=response.message,
            assistant_message_id=message_id
        )
        
        return response
    
    async def get_history(
        self,
        session_id: str,
        limit: int = 10
    ) -> ConversationHistory:
        """
        Obtém o histórico de conversação para uma sessão específica.
        
        Args:
            session_id: Identificador único da sessão
            limit: Número máximo de mensagens a retornar
            
        Returns:
            ConversationHistory: Histórico de conversação
        """
        logger.info(f"Obtendo histórico para sessionId: {session_id}, limit: {limit}")
        
        # Verifica cache
        if settings.ENABLE_CACHE:
            cache_key = f"history:{session_id}"
            cached_history = await self.cache_adapter.get(cache_key)
            if cached_history:
                logger.info(f"Histórico encontrado em cache para sessionId: {session_id}")
                
                # Limita o número de mensagens
                history = ConversationHistory(**cached_history)
                if limit > 0 and len(history.messages) > limit:
                    history.messages = history.messages[-limit:]
                
                return history
        
        # Implementação real buscaria no banco de dados
        # Esta é uma implementação simulada
        return ConversationHistory(
            sessionId=session_id,
            messages=[],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
    
    async def clear_history(self, session_id: str) -> None:
        """
        Limpa o histórico de conversação para uma sessão específica.
        
        Args:
            session_id: Identificador único da sessão
        """
        logger.info(f"Limpando histórico para sessionId: {session_id}")
        
        # Remove do cache
        if settings.ENABLE_CACHE:
            cache_key = f"history:{session_id}"
            await self.cache_adapter.delete(cache_key)
        
        # Implementação real removeria do banco de dados
    
    async def _save_intent_to_history(
        self,
        session_id: str,
        intent_text: str,
        action_plan: ActionPlan
    ) -> None:
        """
        Salva uma intenção processada no histórico.
        
        Args:
            session_id: ID da sessão
            intent_text: Texto da intenção
            action_plan: Plano de ações gerado
        """
        # Implementação real salvaria no banco de dados
        # Esta é uma implementação simulada usando cache
        
        if settings.ENABLE_CACHE:
            # Obtém histórico existente ou cria novo
            cache_key = f"history:{session_id}"
            cached_history = await self.cache_adapter.get(cache_key)
            
            history = ConversationHistory(
                sessionId=session_id,
                messages=[],
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            if cached_history:
                history = ConversationHistory(**cached_history)
            
            # Adiciona mensagens
            user_message = Message(
                id=f"user_{int(time.time())}",
                role="user",
                content=intent_text,
                timestamp=datetime.now()
            )
            
            assistant_message = Message(
                id=f"assistant_{int(time.time())}",
                role="assistant",
                content=action_plan.explanation,
                timestamp=datetime.now(),
                metadata={
                    "type": "intent_response",
                    "actions": [a.dict() for a in action_plan.actions],
                    "confidence": action_plan.confidence
                }
            )
            
            history.messages.append(user_message)
            history.messages.append(assistant_message)
            history.updated_at = datetime.now()
            
            # Salva no cache
            await self.cache_adapter.set(
                cache_key,
                history.dict(),
                ttl=settings.CACHE_TTL * 24  # TTL maior para histórico
            )
    
    async def _save_conversation(
        self,
        session_id: str,
        user_message: str,
        user_message_id: str,
        assistant_message: str,
        assistant_message_id: str
    ) -> None:
        """
        Salva uma conversa no histórico.
        
        Args:
            session_id: ID da sessão
            user_message: Mensagem do usuário
            user_message_id: ID da mensagem do usuário
            assistant_message: Mensagem do assistente
            assistant_message_id: ID da mensagem do assistente
        """
        # Implementação real salvaria no banco de dados
        # Esta é uma implementação simulada usando cache
        
        if settings.ENABLE_CACHE:
            # Obtém histórico existente ou cria novo
            cache_key = f"history:{session_id}"
            cached_history = await self.cache_adapter.get(cache_key)
            
            history = ConversationHistory(
                sessionId=session_id,
                messages=[],
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            if cached_history:
                history = ConversationHistory(**cached_history)
            
            # Adiciona mensagens
            user_message_obj = Message(
                id=user_message_id,
                role="user",
                content=user_message,
                timestamp=datetime.now()
            )
            
            assistant_message_obj = Message(
                id=assistant_message_id,
                role="assistant",
                content=assistant_message,
                timestamp=datetime.now()
            )
            
            history.messages.append(user_message_obj)
            history.messages.append(assistant_message_obj)
            history.updated_at = datetime.now()
            
            # Salva no cache
            await self.cache_adapter.set(
                cache_key,
                history.dict(),
                ttl=settings.CACHE_TTL * 24  # TTL maior para histórico
            )
