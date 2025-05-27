from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

# from src.infrastructure.config import Settings
# from src.infrastructure.database import DatabaseManager
# from src.infrastructure.redis import RedisManager
# from src.infrastructure.vector_store import QdrantManager
from src.api.v1.routes import api_router
from src.api.middleware import (
    RateLimitMiddleware, 
    AuthenticationMiddleware,
    RequestLoggingMiddleware
)

# Metrics
# REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])
# REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration')

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    settings = Settings()
    
    # Initialize infrastructure
    db_manager = DatabaseManager(settings.database_url)
    redis_manager = RedisManager(settings.redis_url)
    vector_manager = QdrantManager(settings.qdrant_url)
    
    await db_manager.connect()
    await redis_manager.connect()
    await vector_manager.connect()
    
    # Store in app state
    app.state.db = db_manager
    app.state.redis = redis_manager
    app.state.vector_store = vector_manager
    app.state.settings = settings
    
    logging.info("🚀 Accessibility API started successfully")
    
    yield
    
    # Shutdown
    await db_manager.disconnect()
    await redis_manager.disconnect()
    await vector_manager.disconnect()
    
    logging.info("🛑 Accessibility API shutdown complete")

def create_app() -> FastAPI:
    app = FastAPI(
        title="Web Accessibility AI API",
        description="AI-powered web accessibility enhancement system",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan
    )
    
    # Middleware
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["chrome-extension://*", "moz-extension://*", "safari-extension://*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RateLimitMiddleware, calls=100, period=60)
    app.add_middleware(AuthenticationMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    
    # Routes
    app.include_router(api_router, prefix="/api/v1")
    
    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "version": "1.0.0"}

    
    return app

app = create_app()