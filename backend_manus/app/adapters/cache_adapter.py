"""
Arquivo: /home/ubuntu/backend/app/adapters/cache_adapter.py
Adaptador para cache.
Implementa a integração com diferentes sistemas de cache (memória, Redis, etc.).
"""

import logging
import json
import time
from typing import Dict, Any, Optional, Union
import asyncio
import aioredis

from app.core.config import settings

# Configuração do logger
logger = logging.getLogger(__name__)

class CacheAdapter:
    """
    Adaptador para cache.
    Abstrai a comunicação com diferentes sistemas de cache.
    """
    
    def __init__(self):
        """
        Inicializa o adaptador com base nas configurações.
        """
        self.cache_type = settings.CACHE_TYPE
        
        # Cache em memória
        self._memory_cache = {}
        self._memory_expiry = {}
        
        # Cliente Redis
        self.redis_client = None
        
        # Inicializa Redis se configurado
        if self.cache_type == "redis":
            self._init_redis_client()
    
    async def _init_redis_client(self):
        """
        Inicializa o cliente Redis.
        """
        try:
            # Conecta ao Redis
            self.redis_client = await aioredis.create_redis_pool(
                settings.REDIS_URL,
                password=settings.REDIS_PASSWORD,
                encoding="utf-8"
            )
            logger.info(f"Conexão com Redis estabelecida: {settings.REDIS_URL}")
            
        except Exception as e:
            logger.error(f"Erro ao conectar ao Redis: {str(e)}")
            # Fallback para cache em memória
            self.cache_type = "memory"
            logger.warning("Usando cache em memória como fallback")
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Obtém um valor do cache.
        
        Args:
            key: Chave do valor
            
        Returns:
            Optional[Any]: Valor armazenado ou None se não encontrado ou expirado
        """
        try:
            if self.cache_type == "redis" and self.redis_client:
                return await self._get_redis(key)
            else:
                return await self._get_memory(key)
        except Exception as e:
            logger.exception(f"Erro ao obter valor do cache para chave {key}: {str(e)}")
            return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: int = 3600  # 1 hora por padrão
    ) -> bool:
        """
        Armazena um valor no cache.
        
        Args:
            key: Chave para o valor
            value: Valor a ser armazenado
            ttl: Tempo de vida em segundos
            
        Returns:
            bool: True se armazenado com sucesso, False caso contrário
        """
        try:
            if self.cache_type == "redis" and self.redis_client:
                return await self._set_redis(key, value, ttl)
            else:
                return await self._set_memory(key, value, ttl)
        except Exception as e:
            logger.exception(f"Erro ao armazenar valor no cache para chave {key}: {str(e)}")
            return False
    
    async def delete(self, key: str) -> bool:
        """
        Remove um valor do cache.
        
        Args:
            key: Chave do valor
            
        Returns:
            bool: True se removido com sucesso, False caso contrário
        """
        try:
            if self.cache_type == "redis" and self.redis_client:
                return await self._delete_redis(key)
            else:
                return await self._delete_memory(key)
        except Exception as e:
            logger.exception(f"Erro ao remover valor do cache para chave {key}: {str(e)}")
            return False
    
    async def clear(self) -> bool:
        """
        Limpa todo o cache.
        
        Returns:
            bool: True se limpo com sucesso, False caso contrário
        """
        try:
            if self.cache_type == "redis" and self.redis_client:
                return await self._clear_redis()
            else:
                return await self._clear_memory()
        except Exception as e:
            logger.exception(f"Erro ao limpar cache: {str(e)}")
            return False
    
    async def _get_memory(self, key: str) -> Optional[Any]:
        """
        Obtém um valor do cache em memória.
        
        Args:
            key: Chave do valor
            
        Returns:
            Optional[Any]: Valor armazenado ou None se não encontrado ou expirado
        """
        # Verifica se a chave existe
        if key not in self._memory_cache:
            return None
        
        # Verifica se o valor expirou
        if key in self._memory_expiry and self._memory_expiry[key] < time.time():
            # Remove o valor expirado
            del self._memory_cache[key]
            del self._memory_expiry[key]
            return None
        
        # Retorna o valor
        return self._memory_cache[key]
    
    async def _set_memory(
        self,
        key: str,
        value: Any,
        ttl: int
    ) -> bool:
        """
        Armazena um valor no cache em memória.
        
        Args:
            key: Chave para o valor
            value: Valor a ser armazenado
            ttl: Tempo de vida em segundos
            
        Returns:
            bool: True se armazenado com sucesso
        """
        # Armazena o valor
        self._memory_cache[key] = value
        
        # Define o tempo de expiração
        if ttl > 0:
            self._memory_expiry[key] = time.time() + ttl
        
        return True
    
    async def _delete_memory(self, key: str) -> bool:
        """
        Remove um valor do cache em memória.
        
        Args:
            key: Chave do valor
            
        Returns:
            bool: True se removido com sucesso, False se não encontrado
        """
        # Verifica se a chave existe
        if key not in self._memory_cache:
            return False
        
        # Remove o valor
        del self._memory_cache[key]
        
        # Remove a expiração se existir
        if key in self._memory_expiry:
            del self._memory_expiry[key]
        
        return True
    
    async def _clear_memory(self) -> bool:
        """
        Limpa todo o cache em memória.
        
        Returns:
            bool: True se limpo com sucesso
        """
        # Limpa o cache
        self._memory_cache.clear()
        self._memory_expiry.clear()
        
        return True
    
    async def _get_redis(self, key: str) -> Optional[Any]:
        """
        Obtém um valor do cache Redis.
        
        Args:
            key: Chave do valor
            
        Returns:
            Optional[Any]: Valor armazenado ou None se não encontrado
        """
        # Obtém o valor do Redis
        value = await self.redis_client.get(key)
        
        if value is None:
            return None
        
        # Tenta decodificar JSON
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            # Se não for JSON, retorna o valor como string
            return value
    
    async def _set_redis(
        self,
        key: str,
        value: Any,
        ttl: int
    ) -> bool:
        """
        Armazena um valor no cache Redis.
        
        Args:
            key: Chave para o valor
            value: Valor a ser armazenado
            ttl: Tempo de vida em segundos
            
        Returns:
            bool: True se armazenado com sucesso
        """
        # Converte o valor para JSON se não for string
        if not isinstance(value, str):
            value = json.dumps(value)
        
        # Armazena o valor no Redis
        if ttl > 0:
            await self.redis_client.setex(key, ttl, value)
        else:
            await self.redis_client.set(key, value)
        
        return True
    
    async def _delete_redis(self, key: str) -> bool:
        """
        Remove um valor do cache Redis.
        
        Args:
            key: Chave do valor
            
        Returns:
            bool: True se removido com sucesso
        """
        # Remove o valor do Redis
        count = await self.redis_client.delete(key)
        
        # Retorna True se pelo menos uma chave foi removida
        return count > 0
    
    async def _clear_redis(self) -> bool:
        """
        Limpa todo o cache Redis.
        
        Returns:
            bool: True se limpo com sucesso
        """
        # Limpa o Redis
        await self.redis_client.flushdb()
        
        return True
    
    async def close(self):
        """
        Fecha conexões e libera recursos.
        """
        if self.cache_type == "redis" and self.redis_client:
            self.redis_client.close()
            await self.redis_client.wait_closed()
            logger.info("Conexão com Redis fechada")
