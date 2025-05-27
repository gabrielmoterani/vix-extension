"""
Arquivo: /home/ubuntu/backend/app/main.py
Ponto de entrada principal da API de acessibilidade web com IA.
Configura a aplicação FastAPI, middleware, rotas e documentação.
"""

import time
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

from app.api.api_v1.api import api_router
from app.core.config import settings
from app.core.logger import setup_logging

# Configura o logger
logger = logging.getLogger(__name__)
setup_logging()

# Cria a aplicação FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Configura CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Middleware para logging de requisições
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log da requisição
    logger.info(f"Request: {request.method} {request.url.path}")
    
    # Processa a requisição
    response = await call_next(request)
    
    # Calcula o tempo de processamento
    process_time = time.time() - start_time
    
    # Log da resposta
    logger.info(f"Response: {request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.4f}s")
    
    # Adiciona header com o tempo de processamento
    response.headers["X-Process-Time"] = str(process_time)
    
    return response

# Handler para erros de validação
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )

# Inclui as rotas da API
app.include_router(api_router, prefix=settings.API_V1_STR)

# Rota de verificação de saúde
@app.get("/health", tags=["health"])
async def health_check():
    """
    Endpoint para verificação de saúde da API.
    Útil para monitoramento e verificação de disponibilidade.
    """
    return {
        "status": "ok",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

# Rota raiz
@app.get("/", tags=["root"])
async def root():
    """
    Rota raiz que redireciona para a documentação.
    """
    return {
        "message": f"Bem-vindo à API de Acessibilidade Web com IA. Acesse a documentação em {settings.API_V1_STR}/docs"
    }

if __name__ == "__main__":
    # Para execução direta (não recomendado para produção)
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
