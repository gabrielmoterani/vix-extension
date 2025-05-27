"""
Arquivo: /home/ubuntu/backend/app/core/logger.py
Configuração de logging para a aplicação.
Define formatação, níveis e handlers para logs.
"""

import logging
import sys
from typing import List, Dict, Any
import json
from pathlib import Path

from app.core.config import settings

# Formatos de log
SIMPLE_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
JSON_FORMAT = '{"time": "%(asctime)s", "name": "%(name)s", "level": "%(levelname)s", "message": "%(message)s"}'

# Diretório de logs
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

class JsonFormatter(logging.Formatter):
    """
    Formatador personalizado para logs em formato JSON.
    Útil para integração com ferramentas de análise de logs como ELK.
    """
    def __init__(self):
        super().__init__()
        self.default_keys = ["name", "levelname", "message", "asctime"]
    
    def format(self, record):
        log_record: Dict[str, Any] = {}
        
        # Adiciona campos padrão
        log_record["timestamp"] = self.formatTime(record)
        log_record["level"] = record.levelname
        log_record["name"] = record.name
        log_record["message"] = record.getMessage()
        
        # Adiciona informações de exceção, se houver
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        
        # Adiciona campos extras
        for key, value in record.__dict__.items():
            if key not in self.default_keys and not key.startswith("_") and not callable(value):
                log_record[key] = value
        
        return json.dumps(log_record)

def setup_logging():
    """
    Configura o sistema de logging da aplicação.
    Define handlers, formatadores e níveis de log com base nas configurações.
    """
    # Obtém o nível de log das configurações
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    
    # Configura o logger raiz
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove handlers existentes para evitar duplicação
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Cria handler para console
    console_handler = logging.StreamHandler(sys.stdout)
    
    # Define o formatador com base no ambiente
    if settings.ENVIRONMENT == "production":
        console_handler.setFormatter(JsonFormatter())
    else:
        console_handler.setFormatter(logging.Formatter(SIMPLE_FORMAT))
    
    # Adiciona o handler ao logger raiz
    root_logger.addHandler(console_handler)
    
    # Em produção, adiciona também um handler para arquivo
    if settings.ENVIRONMENT == "production":
        file_handler = logging.FileHandler(LOG_DIR / "app.log")
        file_handler.setFormatter(JsonFormatter())
        root_logger.addHandler(file_handler)
    
    # Configura níveis específicos para alguns loggers
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    # Log inicial
    logging.info(f"Logging configurado. Nível: {settings.LOG_LEVEL.upper()}, Ambiente: {settings.ENVIRONMENT}")

# Função para criar um logger para um módulo específico
def get_logger(name: str) -> logging.Logger:
    """
    Obtém um logger configurado para um módulo específico.
    
    Args:
        name: Nome do módulo ou componente
        
    Returns:
        Logger configurado
    """
    return logging.getLogger(name)
