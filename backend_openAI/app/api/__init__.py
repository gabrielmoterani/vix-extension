from fastapi import APIRouter
from app.api.analysis.router import router as analysis_router

router = APIRouter()
router.include_router(analysis_router)

@router.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}