from fastapi import FastAPI
from app.api import router as api_router

app = FastAPI(
    title="AccessiAI Backend",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.include_router(api_router)
