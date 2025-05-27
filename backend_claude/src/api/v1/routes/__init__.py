from fastapi import APIRouter
from .accessibility import router as accessibility_router
from .conversation import router as conversation_router
from .tasks import router as tasks_router

api_router = APIRouter()

api_router.include_router(accessibility_router, prefix="/accessibility", tags=["accessibility"])
api_router.include_router(conversation_router, prefix="/conversation", tags=["conversation"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])