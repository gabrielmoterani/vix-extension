from typing import List, Optional, Dict, Any
import asyncio
import uuid
from datetime import datetime

from src.domain.services import (
    VisualLayoutInterpreter,
    ContextualModificationEngine,
    ConversationalPlanManager,
    MultimodalInteractionExecutor
)
from src.domain.models import (
    SceneGraph,
    ModificationPlan,
    DOMElement,
    AccessibilityIssue
)
from src.infrastructure.repositories import (
    ModificationPlanRepository,
    UserRepository,
    AnalyticsRepository
)

class AccessibilityService:
    def __init__(
        self,
        vli: VisualLayoutInterpreter,
        cme: ContextualModificationEngine,
        cpm: ConversationalPlanManager,
        mie: MultimodalInteractionExecutor,
        plan_repository: ModificationPlanRepository,
        user_repository: UserRepository,
        analytics_repository: AnalyticsRepository
    ):
        self.vli = vli
        self.cme = cme
        self.cpm = cpm
        self.mie = mie
        self.plan_repository = plan_repository
        self.user_repository = user_repository
        self.analytics_repository = analytics_repository

    async def analyze_page_accessibility(
        self,
        url: str,
        dom_elements: List[Dict[str, Any]],
        screenshot: str,
        user_preferences: Optional[Dict[str, Any]] = None,
        accessibility_needs: Optional[List[str]] = None
    ) -> ModificationPlan:
        """
        Main service method to analyze page and create modification plan
        """
        try:
            # 1. Convert DOM data to domain objects
            domain_elements = [self._convert_dom_element(el) for el in dom_elements]
            
            # 2. Create scene graph using VLI
            scene_graph = await self.vli.interpret_page(
                screenshot=screenshot,
                dom_elements=domain_elements,
                viewport_size=(1024, 768)
            )
            
            # 3. Generate modification plan using CME
            modification_plan = await self.cme.create_modification_plan(
                scene_graph=scene_graph,
                dom_elements=domain_elements,
                user_preferences=user_preferences
            )
            
            # 4. Set additional metadata
            modification_plan.page_url = url
            modification_plan.id = str(uuid.uuid4())
            modification_plan.created_at = datetime.utcnow()
            
            # 5. Store plan for future reference
            await self.plan_repository.save(modification_plan)
            
            # 6. Log analytics
            await self.analytics_repository.log_analysis(
                url=url,
                modifications_count=len(modification_plan.modifications),
                improvement_score=modification_plan.estimated_improvement_score,
                processing_time_ms=modification_plan.processing_time_ms
            )
            
            return modification_plan
            
        except Exception as e:
            # Log error and return fallback plan
            await self.analytics_repository.log_error(
                operation="analyze_page_accessibility",
                error=str(e),
                url=url
            )
            return self._create_fallback_plan(url, dom_elements)

    async def process_user_command(
        self,
        command: str,
        user_id: str,
        current_url: str,
        conversation_history: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Processes natural language commands from users
        """
        try:
            # Get user preferences
            user = await self.user_repository.get_by_id(user_id)
            
            # Create conversation context
            context = ConversationContext(
                session_id=str(uuid.uuid4()),
                user_id=user_id,
                current_url=current_url,
                conversation_history=conversation_history,
                user_preferences=user.preferences if user else {},
                accessibility_needs=user.accessibility_needs if user else []
            )
            
            # Get current page scene graph (would be cached from recent analysis)
            scene_graph = await self._get_current_scene_graph(current_url)
            
            # Process command and create plan
            task_plan = await self.cpm.process_user_message(
                user_message=command,
                context=context,
                scene_graph=scene_graph
            )
            
            return {
                "plan_id": task_plan.id,
                "actions": [
                    {
                        "id": action.id,
                        "type": action.action_type.value,
                        "description": f"Will {action.action_type.value} {action.target_selector}",
                        "expected_outcome": action.expected_outcome
                    }
                    for action in task_plan.actions
                ],
                "estimated_duration": task_plan.estimated_duration_seconds,
                "requires_confirmation": len(task_plan.checkpoints) > 0
            }
            
        except Exception as e:
            return {
                "error": f"Command processing failed: {str(e)}",
                "suggestion": "Please try rephrasing your request or use simpler language."
            }

    async def execute_task_plan(self, plan_id: str, user_id: str) -> Dict[str, Any]:
        """
        Executes a task plan using the MIE
        """
        try:
            # Get task plan
            task_plan = await self.plan_repository.get_task_plan(plan_id)
            if not task_plan or task_plan.context.user_id != user_id:
                raise ValueError("Task plan not found or unauthorized")
            
            # Execute plan
            results = await self.mie.execute_plan(task_plan)
            
            # Process results
            success_count = sum(1 for r in results if r.success)
            total_actions = len(results)
            
            return {
                "success": success_count == total_actions,
                "executed_actions": total_actions,
                "successful_actions": success_count,
                "results": [
                    {
                        "action_id": r.action_id,
                        "success": r.success,
                        "error": r.error_message
                    }
                    for r in results
                ]
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Execution failed: {str(e)}"
            }

    async def get_modification_history(
        self, 
        user_id: str, 
        url: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Gets modification history for a user
        """
        return await self.plan_repository.get_user_history(
            user_id=user_id,
            url=url,
            limit=limit
        )

    def _convert_dom_element(self, element_data: Dict[str, Any]) -> DOMElement:
        """Converts API schema to domain object"""
        return DOMElement(
            tag_name=element_data["tag_name"],
            id=element_data.get("id"),
            class_name=element_data.get("class_name"),
            text_content=element_data.get("text_content"),
            attributes=element_data.get("attributes", {}),
            bounding_rect=element_data["bounding_rect"],
            is_visible=element_data.get("is_visible", True),
            role=element_data.get("role"),
            aria_label=element_data.get("aria_label")
        )

    def _create_fallback_plan(self, url: str, dom_elements: List[Dict]) -> ModificationPlan:
        """Creates a basic fallback plan when analysis fails"""
        return ModificationPlan(
            id=str(uuid.uuid4()),
            page_url=url,
            total_issues=0,
            modifications=[],
            estimated_improvement_score=0.0,
            processing_time_ms=100,
            created_at=datetime.utcnow()
        )

    async def _get_current_scene_graph(self, url: str) -> Optional[SceneGraph]:
        """Gets cached scene graph for URL"""
        # Implementation would check cache/database
        return None