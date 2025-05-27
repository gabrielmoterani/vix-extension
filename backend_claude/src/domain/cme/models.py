from dataclasses import dataclass
from typing import List, Dict, Optional, Any
from enum import Enum

class ModificationType(Enum):
    ADD_ALT_TEXT = "add_alt_text"
    ADD_ARIA_LABEL = "add_aria_label"
    ADD_ROLE = "add_role"
    IMPROVE_HEADING_STRUCTURE = "improve_heading_structure"
    ADD_LANDMARK = "add_landmark"
    FIX_COLOR_CONTRAST = "fix_color_contrast"
    ADD_SKIP_LINK = "add_skip_link"
    SIMPLIFY_NAVIGATION = "simplify_navigation"
    ADD_LIVE_REGION = "add_live_region"
    KEYBOARD_NAVIGATION = "keyboard_navigation"

@dataclass
class DOMModification:
    id: str
    element_selector: str
    modification_type: ModificationType
    action: str  # "setAttribute", "createElement", "modifyStyle", etc.
    target_attribute: Optional[str]
    new_value: Optional[str]
    css_changes: Optional[Dict[str, str]]
    priority: int  # 1-10, higher = more important
    wcag_criteria: List[str]  # e.g., ["1.1.1", "2.4.1"]

@dataclass
class AccessibilityIssue:
    element_selector: str
    issue_type: str
    severity: str  # "error", "warning", "info"
    wcag_criteria: List[str]
    description: str
    suggested_fix: DOMModification

@dataclass
class ModificationPlan:
    page_url: str
    total_issues: int
    modifications: List[DOMModification]
    estimated_improvement_score: float
    processing_time_ms: int