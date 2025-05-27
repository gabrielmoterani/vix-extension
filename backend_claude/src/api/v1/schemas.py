from pydantic import BaseModel, HttpUrl, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class AccessibilityNeed(str, Enum):
    SCREEN_READER = "screen_reader"
    HIGH_CONTRAST = "high_contrast"
    LARGE_TEXT = "large_text"
    KEYBOARD_NAVIGATION = "keyboard_navigation"
    COLOR_BLINDNESS = "color_blindness"
    MOTOR_IMPAIRMENT = "motor_impairment"

class DOMElementSchema(BaseModel):
    tag_name: str = Field(..., description="HTML tag name")
    id: Optional[str] = Field(None, description="Element ID")
    class_name: Optional[str] = Field(None, description="CSS classes")
    text_content: Optional[str] = Field(None, max_length=1000, description="Text content")
    attributes: Dict[str, str] = Field(default_factory=dict, description="HTML attributes")
    bounding_rect: Dict[str, float] = Field(..., description="Element position and size")
    is_visible: bool = Field(True, description="Element visibility")
    role: Optional[str] = Field(None, description="ARIA role")
    aria_label: Optional[str] = Field(None, description="ARIA label")

class PageAnalysisRequest(BaseModel):
    url: HttpUrl = Field(..., description="Page URL")
    dom_elements: List[DOMElementSchema] = Field(..., min_items=1, description="DOM elements")
    screenshot: str = Field(..., description="Base64 encoded screenshot")
    viewport_size: tuple[int, int] = Field(default=(1024, 768), description="Viewport dimensions")
    user_preferences: Optional[Dict[str, Any]] = Field(default_factory=dict)
    accessibility_needs: List[AccessibilityNeed] = Field(default_factory=list)
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

    @validator('screenshot')
    def validate_screenshot(cls, v):
        if not v or len(v) < 100:
            raise ValueError('Screenshot data is too small or empty')
        return v

    @validator('dom_elements')
    def validate_dom_elements(cls, v):
        if len(v) > 1000:
            raise ValueError('Too many DOM elements (max 1000)')
        return v

class ModificationSchema(BaseModel):
    id: str
    element_selector: str
    modification_type: str
    action: str
    target_attribute: Optional[str]
    new_value: Optional[str]
    css_changes: Optional[Dict[str, str]]
    priority: int = Field(ge=1, le=10)
    wcag_criteria: List[str]

class ModificationPlanSchema(BaseModel):
    id: str = Field(..., description="Unique plan identifier")
    page_url: str
    total_issues: int = Field(ge=0)
    modifications: List[ModificationSchema]
    estimated_improvement_score: float = Field(ge=0, le=100)
    processing_time_ms: int = Field(ge=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PageAnalysisResponse(BaseModel):
    success: bool
    modification_plan: ModificationPlanSchema
    processing_time_ms: int
    message: str