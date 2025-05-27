from backend.src.domain.cpm.models import ActionType
from backend.src.domain.cpm.services import ConversationPort
from src.domain.cpm.models import ConversationContext, TaskPlan, TaskAction, TaskStatus
from src.domain.vli.models import SceneGraph
from openai import AsyncOpenAI
import json
from typing import Dict, Any
import uuid
import datetime

class OpenAIConversationAdapter(ConversationPort):
    def __init__(self, api_key: str, model: str = "gpt-4-turbo"):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model
    
    async def understand_intent(
        self, 
        user_message: str, 
        context: ConversationContext
    ) -> Dict[str, Any]:
        """
        Analisa mensagem do usuário para entender intenção
        """
        
        context_prompt = self._build_context_prompt(context)
        
        prompt = f"""
        {context_prompt}
        
        User message: "{user_message}"
        
        Analyze the user's intent and return JSON with:
        {{
            "intent_type": "navigation|information_extraction|task_completion|question_answering",
            "target_elements": ["list of elements user wants to interact with"],
            "goal": "clear description of what user wants to achieve",
            "complexity": "simple|moderate|complex",
            "requires_clarification": true/false,
            "accessibility_considerations": ["specific needs based on user preferences"],
            "summary": "one sentence summary of the intent"
        }}
        """
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": """You are an AI assistant specialized in helping users with disabilities navigate websites. 
                        Analyze user intents with focus on accessibility needs and break down complex tasks into manageable steps."""
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=1000,
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            return json.loads(response.choices[0].message.content)
            
        except Exception as e:
            # Fallback intent
            return {
                "intent_type": "general",
                "goal": user_message,
                "complexity": "simple",
                "requires_clarification": False,
                "summary": f"Help with: {user_message[:50]}..."
            }
    
    async def generate_plan(
        self, 
        intent: Dict[str, Any], 
        scene_graph: SceneGraph
    ) -> TaskPlan:
        """
        Gera plano de ação baseado na intenção do usuário
        """
        
        plan_prompt = f"""
        Create a detailed execution plan for this user intent:
        
        Intent: {intent}
        
        Available page elements:
        - Interactive elements: {len(scene_graph.interactive_elements) if scene_graph else 0}
        - Navigation elements: {len(scene_graph.navigation_elements) if scene_graph else 0}
        
        Generate a plan with these actions in sequence:
        {{
            "plan_id": "unique_id",
            "estimated_duration": 30,
            "actions": [
                {{
                    "id": "action_1",
                    "action_type": "click|type|scroll|wait|extract_info|summarize",
                    "target_selector": "CSS selector or description",
                    "parameters": {{"text": "content to type", "direction": "up|down"}},
                    "expected_outcome": "what should happen after this action",
                    "checkpoint": true/false
                }}
            ],
            "checkpoints": ["User confirmation points"],
            "fallback_strategies": ["Alternative approaches if primary plan fails"]
        }}
        
        Make the plan accessible and break complex tasks into simple steps.
        """
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a task planning AI that creates step-by-step plans for web interactions, optimized for accessibility."
                    },
                    {
                        "role": "user",
                        "content": plan_prompt
                    }
                ],
                max_tokens=2000,
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            plan_data = json.loads(response.choices[0].message.content)
            
            # Convert to TaskPlan object
            actions = [
                TaskAction(
                    id=action["id"],
                    action_type=ActionType(action["action_type"]),
                    target_selector=action.get("target_selector"),
                    parameters=action.get("parameters", {}),
                    expected_outcome=action["expected_outcome"]
                )
                for action in plan_data["actions"]
            ]
            
            return TaskPlan(
                id=str(uuid.uuid4()),
                user_intent=intent["goal"],
                actions=actions,
                context=None,  # Will be set by caller
                status=TaskStatus.PENDING,
                created_at=datetime.utcnow(),
                estimated_duration_seconds=plan_data.get("estimated_duration", 60),
                checkpoints=plan_data.get("checkpoints", [])
            )
            
        except Exception as e:
            # Return minimal plan
            return TaskPlan(
                id=str(uuid.uuid4()),
                user_intent=intent["goal"],
                actions=[],
                context=None,
                status=TaskStatus.FAILED,
                created_at=datetime.utcnow(),
                estimated_duration_seconds=0,
                checkpoints=[]
            )
    
    def _build_context_prompt(self, context: ConversationContext) -> str:
        """
        Constrói prompt com contexto da conversa
        """
        accessibility_info = ", ".join(context.accessibility_needs) if context.accessibility_needs else "general accessibility"
        
        recent_history = context.conversation_history[-5:]  # Last 5 messages
        history_text = "\n".join([
            f"{msg['role']}: {msg['content'][:100]}..." 
            for msg in recent_history
        ])
        
        return f"""
        Context:
        - Current URL: {context.current_url}
        - User accessibility needs: {accessibility_info}
        - Recent conversation:
        {history_text}
        """