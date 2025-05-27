"""
Arquivo: /home/ubuntu/backend/app/api/api_v1/api.py
Configuração das rotas da API v1.
Agrega todos os routers dos diferentes módulos.
"""

from fastapi import APIRouter
from app.api.api_v1.endpoints.accessibility import accessibility as accessibility_router
from app.api.api_v1.endpoints.conversation import conversation as conversation_router
from app.api.api_v1.endpoints.tasks import tasks as tasks_router

# Router principal que agrega todos os sub-routers
api_router = APIRouter()

# Inclui os routers de cada módulo com seus respectivos prefixos
api_router.include_router(accessibility_router, prefix="/accessibility", tags=["accessibility"])
api_router.include_router(conversation_router, prefix="/conversation", tags=["conversation"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])