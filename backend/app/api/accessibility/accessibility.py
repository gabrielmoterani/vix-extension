from app.api.accessibility import AccessibilitySuggestions, PageDataRequest
from app.services.analysis_service import generate_ai_suggestions
from fastapi import APIRouter

router = APIRouter(prefix="/analyse-page", tags=["Accessibility Analysis"])

@router.post("/", response_model=AccessibilitySuggestions)
async def analyze_page(data: PageDataRequest):
    return generate_ai_suggestions(data)