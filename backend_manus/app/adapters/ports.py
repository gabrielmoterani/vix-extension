"""
Definição das interfaces (portas) para adaptadores externos.
Este módulo define as interfaces que os adaptadores devem implementar.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
import io

class IAPort(ABC):
    """
    Interface para adaptadores de IA.
    Define os métodos que qualquer adaptador de IA deve implementar.
    """
    
    @abstractmethod
    async def interpret_visual_layout(self, dom_data: Dict[str, Any], image: io.BytesIO) -> Dict[str, Any]:
        """
        Interpreta o layout visual da página (VLI - Visual Layout Interpreter).
        
        Args:
            dom_data: Dados do DOM e metadados
            image: Imagem da página em formato BytesIO
            
        Returns:
            Dict: Representação hierárquica (grafo de cena) com anotações semânticas
        """
        pass
    
    @abstractmethod
    async def generate_modifications(self, vli_output: Dict[str, Any], accessibility_rules: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Gera modificações de acessibilidade (CME - Contextual Modification Engine).
        
        Args:
            vli_output: Saída do VLI (grafo de cena)
            accessibility_rules: Regras de acessibilidade a serem aplicadas
            
        Returns:
            List[Dict]: Lista de modificações a serem aplicadas no DOM
        """
        pass
    
    @abstractmethod
    async def plan_actions(self, user_intent: str, page_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Planeja ações baseadas na intenção do usuário (CPM - Conversational Plan Manager).
        
        Args:
            user_intent: Intenção do usuário em linguagem natural
            page_context: Contexto da página (grafo de cena, URL, etc.)
            
        Returns:
            List[Dict]: Plano de ações a serem executadas
        """
        pass
    
    @abstractmethod
    async def get_tokens_used(self) -> int:
        """
        Retorna o número de tokens usados na última operação.
        
        Returns:
            int: Número de tokens usados
        """
        pass

class StoragePort(ABC):
    """
    Interface para adaptadores de armazenamento.
    Define os métodos que qualquer adaptador de armazenamento deve implementar.
    """
    
    @abstractmethod
    async def save_image(self, image_data: bytes, session_id: str) -> str:
        """
        Salva uma imagem no armazenamento.
        
        Args:
            image_data: Dados binários da imagem
            session_id: Identificador da sessão
            
        Returns:
            str: Caminho ou URL da imagem salva
        """
        pass
    
    @abstractmethod
    async def get_image(self, image_path: str) -> Optional[bytes]:
        """
        Recupera uma imagem do armazenamento.
        
        Args:
            image_path: Caminho ou identificador da imagem
            
        Returns:
            Optional[bytes]: Dados binários da imagem ou None se não encontrada
        """
        pass
    
    @abstractmethod
    async def delete_image(self, image_path: str) -> bool:
        """
        Remove uma imagem do armazenamento.
        
        Args:
            image_path: Caminho ou identificador da imagem
            
        Returns:
            bool: True se removida com sucesso, False caso contrário
        """
        pass

class CachePort(ABC):
    """
    Interface para adaptadores de cache.
    Define os métodos que qualquer adaptador de cache deve implementar.
    """
    
    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        """
        Recupera um valor do cache.
        
        Args:
            key: Chave do valor
            
        Returns:
            Optional[Any]: Valor armazenado ou None se não encontrado/expirado
        """
        pass
    
    @abstractmethod
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Armazena um valor no cache.
        
        Args:
            key: Chave para armazenar o valor
            value: Valor a ser armazenado
            ttl: Tempo de vida em segundos (None para usar o padrão)
            
        Returns:
            bool: True se armazenado com sucesso, False caso contrário
        """
        pass
    
    @abstractmethod
    async def delete(self, key: str) -> bool:
        """
        Remove um valor do cache.
        
        Args:
            key: Chave do valor
            
        Returns:
            bool: True se removido com sucesso, False caso contrário
        """
        pass
    
    @abstractmethod
    async def clear(self) -> bool:
        """
        Limpa todo o cache.
        
        Returns:
            bool: True se limpo com sucesso, False caso contrário
        """
        pass
