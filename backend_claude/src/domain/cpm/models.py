from dataclasses import dataclass
from typing import List, Dict, Optional, Any, Union
from enum import Enum
import uuid
from datetime import datetime

class TaskStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ActionType(Enum):
    CLICK = "click"
    TYPE = "type"
    SCROLL = "scroll"
    WAIT = "wait"
    NAVIGATE = "navigate"
    EXTRACT_INFO = "extract_info"
    SUMMARIZE = "summarize"
    ANSWER_QUESTION = "answer_question"

@dataclass
class TaskAction:
    id: str
    action_type: ActionType
    target_selector: Optional[str]
    parameters: Dict[str, Any]
    expected_outcome: str
    retry_count: int = 0
    max_retries: int = 3
    status: TaskStatus = TaskStatus.PENDING

@dataclass
class ConversationContext:
    session_id: str
    user_id: str
    current_url: str
    conversation_history: List[Dict[str, str]]
    user_preferences: Dict[str, Any]
    accessibility_needs: List[str]  # e.g., ["screen_reader", "high_contrast", "large_text"]

@dataclass
class TaskPlan:
    id: str
    user_intent: str
    actions: List[TaskAction]
    context: ConversationContext
    status: TaskStatus
    created_at: datetime
    estimated_duration_seconds: int
    checkpoints: List[str]  # Points where user confirmation is needed

@dataclass
class ExecutionResult:
    action_id: str
    success: bool
    result_data: Optional[Dict[str, Any]]
    error_message: Optional[str]
    screenshot_path: Optional[str]
    execution_time_ms: int