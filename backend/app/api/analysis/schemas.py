from pydantic import BaseModel
from typing import Dict, List, Optional


class PageDataRequest(BaseModel):
    html: str
    screenshot: str  # base64 string
    title: Optional[str] = None
    url: Optional[str] = None

class AltTextSuggestion(BaseModel):
    selector: str  # ex: "img[src*='logo.png']"
    alt: str


class AccessibilitySuggestions(BaseModel):
    suggestions: List[AltTextSuggestion]