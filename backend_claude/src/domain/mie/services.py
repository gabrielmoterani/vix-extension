from abc import ABC, abstractmethod
import asyncio
import datetime
from typing import List, Dict
from backend.src.domain.cpm.models import TaskPlan
from src.domain.cpm.models import TaskAction, ExecutionResult, TaskStatus
from src.domain.vli.services import VisualLayoutInterpreter


class BrowserControlPort(ABC):
    @abstractmethod
    async def execute_action(self, action: TaskAction) -> ExecutionResult:
        pass
    
    @abstractmethod
    async def take_screenshot(self) -> str:  # base64 encoded
        pass
    
    @abstractmethod
    async def get_current_dom(self) -> List[Dict]:
        pass

class MultimodalInteractionExecutor:
    def __init__(
        self, 
        browser_control: BrowserControlPort,
        vli: VisualLayoutInterpreter
    ):
        self.browser_control = browser_control
        self.vli = vli
        self.execution_log = []
    
    async def execute_plan(self, plan: TaskPlan) -> List[ExecutionResult]:
        """
        Executa plano de tarefas com verificação a cada passo
        """
        results = []
        
        for action in plan.actions:
            try:
                # Execute action
                result = await self._execute_with_verification(action)
                results.append(result)
                
                # Log execution
                self.execution_log.append({
                    "plan_id": plan.id,
                    "action_id": action.id,
                    "result": result,
                    "timestamp": datetime.utcnow()
                })
                
                # Check if action failed
                if not result.success:
                    if action.retry_count < action.max_retries:
                        action.retry_count += 1
                        action.status = TaskStatus.PENDING
                        # Retry the action
                        continue
                    else:
                        # Action failed permanently
                        action.status = TaskStatus.FAILED
                        break
                
                action.status = TaskStatus.COMPLETED
                
                # Wait between actions for page to settle
                await asyncio.sleep(1)
                
            except Exception as e:
                result = ExecutionResult(
                    action_id=action.id,
                    success=False,
                    result_data=None,
                    error_message=str(e),
                    screenshot_path=None,
                    execution_time_ms=0
                )
                results.append(result)
                break
        
        return results
    
    async def _execute_with_verification(self, action: TaskAction) -> ExecutionResult:
        """
        Executa ação e verifica se foi bem-sucedida
        """
        start_time = asyncio.get_event_loop().time()
        
        # Take screenshot before action
        screenshot_before = await self.browser_control.take_screenshot()
        
        # Execute the action
        result = await self.browser_control.execute_action(action)
        
        if result.success:
            # Wait for page to settle
            await asyncio.sleep(2)
            
            # Take screenshot after action
            screenshot_after = await self.browser_control.take_screenshot()
            
            # Verify the action had expected effect
            verification_result = await self._verify_action_outcome(
                action, 
                screenshot_before, 
                screenshot_after
            )
            
            if not verification_result:
                result.success = False
                result.error_message = "Action did not produce expected outcome"
        
        end_time = asyncio.get_event_loop().time()
        result.execution_time_ms = int((end_time - start_time) * 1000)
        
        return result
    
    async def _verify_action_outcome(
        self,
        action: TaskAction,
        screenshot_before: str,
        screenshot_after: str
    ) -> bool:
        """
        Verifica se a ação teve o resultado esperado comparando screenshots
        """
        # Get current DOM
        current_dom = await self.browser_control.get_current_dom()
        
        # Create scene graph of current state
        current_scene = await self.vli.interpret_page(
            screenshot_after, 
            current_dom, 
            (1024, 768)  # Standard viewport
        )
        
        # Use LLM to verify if expected outcome was achieved
        verification_prompt = f"""
        Compare these two screenshots and determine if the action '{action.action_type.value}' 
        with expected outcome '{action.expected_outcome}' was successful.
        
        Return JSON: {{"success": true/false, "reasoning": "explanation"}}
        """
        
        # This would use vision model to compare screenshots
        # For now, return True as placeholder
        return True