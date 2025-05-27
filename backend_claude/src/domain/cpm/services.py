from abc import abstractmethod, ABC
from typing import Dict, Any
from src.domain.cpm.models import ConversationContext, TaskPlan, TaskAction, TaskStatus
from src.domain.vli.models import SceneGraph


class ConversationPort(ABC):
    @abstractmethod
    async def understand_intent(
        self, 
        user_message: str, 
        context: ConversationContext
    ) -> Dict[str, Any]:
        pass
    
    @abstractmethod
    async def generate_plan(
        self, 
        intent: Dict[str, Any], 
        scene_graph: SceneGraph
    ) -> TaskPlan:
        pass

class ConversationalPlanManager:
    def __init__(
        self, 
        conversation_adapter: ConversationPort,
        vector_store: 'VectorStorePort'
    ):
        self.conversation_adapter = conversation_adapter
        self.vector_store = vector_store
        self.active_sessions = {}
    
    async def process_user_message(
        self,
        user_message: str,
        context: ConversationContext,
        scene_graph: SceneGraph
    ) -> TaskPlan:
        """
        Processa mensagem do usuário e cria plano de ação
        """
        # 1. Update conversation history
        context.conversation_history.append({
            "role": "user",
            "content": user_message,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # 2. Understand user intent
        intent = await self.conversation_adapter.understand_intent(
            user_message, 
            context
        )
        
        # 3. Generate task plan
        plan = await self.conversation_adapter.generate_plan(intent, scene_graph)
        plan.context = context
        
        # 4. Store session state
        self.active_sessions[context.session_id] = plan
        
        # 5. Add assistant response to history
        context.conversation_history.append({
            "role": "assistant",
            "content": f"I'll help you {intent.get('summary', 'with that task')}. Let me break this down into steps...",
            "timestamp": datetime.utcnow().isoformat(),
            "plan_id": plan.id
        })
        
        return plan
    
    async def handle_clarification(
        self,
        session_id: str,
        clarification: str
    ) -> TaskPlan:
        """
        Lida com perguntas de esclarecimento do usuário
        """
        if session_id not in self.active_sessions:
            raise ValueError(f"Session {session_id} not found")
        
        plan = self.active_sessions[session_id]
        
        # Update plan based on clarification
        updated_intent = await self.conversation_adapter.understand_intent(
            clarification,
            plan.context
        )
        
        # Regenerate plan if needed
        if updated_intent.get('requires_replanning'):
            new_plan = await self.conversation_adapter.generate_plan(
                updated_intent, 
                None  # Will get current scene graph
            )
            new_plan.context = plan.context
            self.active_sessions[session_id] = new_plan
            return new_plan
        
        return plan