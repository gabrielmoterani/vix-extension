from dataclasses import dataclass
from typing import List, Dict, Optional, Any
from enum import Enum

class ElementType(Enum):
    TEXT = "text"
    IMAGE = "image"
    BUTTON = "button"
    LINK = "link"
    FORM = "form"
    NAVIGATION = "navigation"
    MAIN_CONTENT = "main_content"
    SIDEBAR = "sidebar"
    HEADER = "header"
    FOOTER = "footer"

@dataclass
class BoundingBox:
    x: int
    y: int
    width: int
    height: int

@dataclass
class VisualElement:
    id: str
    element_type: ElementType
    bbox: BoundingBox
    text_content: Optional[str]
    attributes: Dict[str, Any]
    semantic_role: Optional[str]
    confidence: float
    children: List['VisualElement']

@dataclass
class SceneGraph:
    page_title: str
    main_sections: List[VisualElement]
    navigation_elements: List[VisualElement]
    interactive_elements: List[VisualElement]
    media_elements: List[VisualElement]
    metadata: Dict[str, Any]