from fastapi import APIRouter
from app.api.analysis.schemas import PageDataRequest, AccessibilitySuggestions
from app.services.analysis_service import generate_ai_suggestions

router = APIRouter(prefix="/analise_pagina", tags=["Accessibility Analysis"])

@router.post("/", response_model=AccessibilitySuggestions)
async def analyze_page(data: PageDataRequest):
    return generate_ai_suggestions(data)