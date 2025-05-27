import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.security import HTTPBearer
from typing import List, Optional
import asyncio
import time

from src.api.v1.schemas import (
    PageAnalysisRequest,
    PageAnalysisResponse,
    ModificationPlanResponse,
    HealthCheckResponse
)
from src.application.services import AccessibilityService
from src.api.dependencies import get_accessibility_service, get_current_user
from src.domain.models.user import User

router = APIRouter()
security = HTTPBearer()

@router.post("/analyze-page", response_model=PageAnalysisResponse)
async def analyze_page(
    request: PageAnalysisRequest,
    background_tasks: BackgroundTasks,
    service: AccessibilityService = Depends(get_accessibility_service),
    current_user: User = Depends(get_current_user)
):
    """
    Analyzes a webpage and returns accessibility modifications
    """
    try:
        start_time = time.time()
        
        # Validate request
        if not request.dom_elements:
            raise HTTPException(status_code=400, detail="DOM elements are required")
        
        if not request.screenshot:
            raise HTTPException(status_code=400, detail="Screenshot is required")
        
        # Process analysis
        modification_plan = await service.analyze_page_accessibility(
            url=request.url,
            dom_elements=request.dom_elements,
            screenshot=request.screenshot,
            user_preferences=request.user_preferences,
            accessibility_needs=request.accessibility_needs
        )
        
        # Log analytics in background
        background_tasks.add_task(
            log_analysis_metrics,
            user_id=current_user.id,
            url=request.url,
            processing_time=time.time() - start_time,
            modifications_count=len(modification_plan.modifications)
        )
        
        return PageAnalysisResponse(
            success=True,
            modification_plan=modification_plan,
            processing_time_ms=int((time.time() - start_time) * 1000),
            message="Page analysis completed successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/apply-modifications")
async def apply_modifications(
    plan_id: str,
    service: AccessibilityService = Depends(get_accessibility_service),
    current_user: User = Depends(get_current_user)
):
    """
    Applies a previously generated modification plan
    """
    try:
        success = await service.apply_modification_plan(plan_id, current_user.id)
        
        if success:
            return {"success": True, "message": "Modifications applied successfully"}
        else:
            raise HTTPException(status_code=404, detail="Modification plan not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply modifications: {str(e)}")

@router.get("/modification-history")
async def get_modification_history(
    url: Optional[str] = None,
    limit: int = 50,
    service: AccessibilityService = Depends(get_accessibility_service),
    current_user: User = Depends(get_current_user)
):
    """
    Gets modification history for user
    """
    try:
        history = await service.get_modification_history(
            user_id=current_user.id,
            url=url,
            limit=limit
        )
        
        return {"history": history}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get history: {str(e)}")

async def log_analysis_metrics(
    user_id: str, 
    url: str, 
    processing_time: float, 
    modifications_count: int
):
    """Background task to log analytics"""
    # This would log to analytics service
    logging.info(f"Analysis: user={user_id}, url={url}, time={processing_time:.2f}s, mods={modifications_count}")
