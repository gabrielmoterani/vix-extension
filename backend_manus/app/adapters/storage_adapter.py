"""
Arquivo: /home/ubuntu/backend/app/adapters/storage_adapter.py
Adaptador para armazenamento de arquivos.
Implementa a integração com diferentes sistemas de armazenamento (local, S3, etc.).
"""

import logging
import os
import time
import uuid
import shutil
from typing import Dict, Any, Optional, BinaryIO
from pathlib import Path
import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

# Configuração do logger
logger = logging.getLogger(__name__)

class StorageAdapter:
    """
    Adaptador para armazenamento de arquivos.
    Abstrai a comunicação com diferentes sistemas de armazenamento.
    """
    
    def __init__(self):
        """
        Inicializa o adaptador com base nas configurações.
        """
        self.storage_type = settings.STORAGE_TYPE
        
        # Configuração para armazenamento local
        self.base_dir = Path("storage")
        self.base_dir.mkdir(exist_ok=True)
        
        # Configuração para S3
        if self.storage_type == "s3":
            self._init_s3_client()
    
    def _init_s3_client(self):
        """
        Inicializa o cliente S3.
        """
        try:
            # Configuração para LocalStack (desenvolvimento)
            if settings.USE_LOCALSTACK:
                self.s3_client = boto3.client(
                    's3',
                    endpoint_url='http://localhost:4566',
                    aws_access_key_id='test',
                    aws_secret_access_key='test',
                    region_name=settings.S3_REGION
                )
            # Configuração para AWS S3 (produção)
            else:
                self.s3_client = boto3.client('s3', region_name=settings.S3_REGION)
            
            # Verifica se o bucket existe
            self.s3_client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
            logger.info(f"Conexão com S3 estabelecida: {settings.S3_BUCKET_NAME}")
            
        except ClientError as e:
            logger.error(f"Erro ao conectar ao S3: {str(e)}")
            # Fallback para armazenamento local
            self.storage_type = "local"
            logger.warning("Usando armazenamento local como fallback")
    
    async def store_file(
        self,
        file_data: bytes,
        filename: str,
        folder: str = "uploads"
    ) -> str:
        """
        Armazena um arquivo no sistema de armazenamento.
        
        Args:
            file_data: Conteúdo do arquivo em bytes
            filename: Nome do arquivo
            folder: Pasta para armazenar o arquivo
            
        Returns:
            str: Caminho ou URL para o arquivo armazenado
        """
        try:
            if self.storage_type == "s3":
                return await self._store_file_s3(file_data, filename, folder)
            else:
                return await self._store_file_local(file_data, filename, folder)
        except Exception as e:
            logger.exception(f"Erro ao armazenar arquivo {filename}: {str(e)}")
            raise
    
    async def get_file(
        self,
        file_path: str
    ) -> Optional[bytes]:
        """
        Obtém um arquivo do sistema de armazenamento.
        
        Args:
            file_path: Caminho ou chave do arquivo
            
        Returns:
            Optional[bytes]: Conteúdo do arquivo ou None se não encontrado
        """
        try:
            if self.storage_type == "s3" and not file_path.startswith("/"):
                return await self._get_file_s3(file_path)
            else:
                return await self._get_file_local(file_path)
        except Exception as e:
            logger.exception(f"Erro ao obter arquivo {file_path}: {str(e)}")
            return None
    
    async def delete_file(
        self,
        file_path: str
    ) -> bool:
        """
        Exclui um arquivo do sistema de armazenamento.
        
        Args:
            file_path: Caminho ou chave do arquivo
            
        Returns:
            bool: True se excluído com sucesso, False caso contrário
        """
        try:
            if self.storage_type == "s3" and not file_path.startswith("/"):
                return await self._delete_file_s3(file_path)
            else:
                return await self._delete_file_local(file_path)
        except Exception as e:
            logger.exception(f"Erro ao excluir arquivo {file_path}: {str(e)}")
            return False
    
    async def _store_file_local(
        self,
        file_data: bytes,
        filename: str,
        folder: str
    ) -> str:
        """
        Armazena um arquivo localmente.
        
        Args:
            file_data: Conteúdo do arquivo em bytes
            filename: Nome do arquivo
            folder: Pasta para armazenar o arquivo
            
        Returns:
            str: Caminho para o arquivo armazenado
        """
        # Cria o diretório se não existir
        folder_path = self.base_dir / folder
        folder_path.mkdir(exist_ok=True, parents=True)
        
        # Caminho completo do arquivo
        file_path = folder_path / filename
        
        # Escreve o arquivo
        with open(file_path, 'wb') as f:
            f.write(file_data)
        
        logger.debug(f"Arquivo armazenado localmente: {file_path}")
        return str(file_path)
    
    async def _store_file_s3(
        self,
        file_data: bytes,
        filename: str,
        folder: str
    ) -> str:
        """
        Armazena um arquivo no S3.
        
        Args:
            file_data: Conteúdo do arquivo em bytes
            filename: Nome do arquivo
            folder: Pasta para armazenar o arquivo
            
        Returns:
            str: Chave do arquivo no S3
        """
        # Chave do objeto no S3
        s3_key = f"{folder}/{filename}"
        
        # Faz upload para o S3
        self.s3_client.put_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=s3_key,
            Body=file_data
        )
        
        logger.debug(f"Arquivo armazenado no S3: {s3_key}")
        return s3_key
    
    async def _get_file_local(
        self,
        file_path: str
    ) -> Optional[bytes]:
        """
        Obtém um arquivo armazenado localmente.
        
        Args:
            file_path: Caminho do arquivo
            
        Returns:
            Optional[bytes]: Conteúdo do arquivo ou None se não encontrado
        """
        # Verifica se o caminho é absoluto
        path = Path(file_path)
        if not path.is_absolute():
            path = self.base_dir / path
        
        # Verifica se o arquivo existe
        if not path.exists():
            logger.warning(f"Arquivo não encontrado: {path}")
            return None
        
        # Lê o arquivo
        with open(path, 'rb') as f:
            data = f.read()
        
        logger.debug(f"Arquivo lido localmente: {path}")
        return data
    
    async def _get_file_s3(
        self,
        s3_key: str
    ) -> Optional[bytes]:
        """
        Obtém um arquivo armazenado no S3.
        
        Args:
            s3_key: Chave do objeto no S3
            
        Returns:
            Optional[bytes]: Conteúdo do arquivo ou None se não encontrado
        """
        try:
            # Obtém o objeto do S3
            response = self.s3_client.get_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=s3_key
            )
            
            # Lê o conteúdo
            data = response['Body'].read()
            
            logger.debug(f"Arquivo lido do S3: {s3_key}")
            return data
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                logger.warning(f"Arquivo não encontrado no S3: {s3_key}")
                return None
            raise
    
    async def _delete_file_local(
        self,
        file_path: str
    ) -> bool:
        """
        Exclui um arquivo armazenado localmente.
        
        Args:
            file_path: Caminho do arquivo
            
        Returns:
            bool: True se excluído com sucesso, False caso contrário
        """
        # Verifica se o caminho é absoluto
        path = Path(file_path)
        if not path.is_absolute():
            path = self.base_dir / path
        
        # Verifica se o arquivo existe
        if not path.exists():
            logger.warning(f"Arquivo não encontrado para exclusão: {path}")
            return False
        
        # Exclui o arquivo
        path.unlink()
        
        logger.debug(f"Arquivo excluído localmente: {path}")
        return True
    
    async def _delete_file_s3(
        self,
        s3_key: str
    ) -> bool:
        """
        Exclui um arquivo armazenado no S3.
        
        Args:
            s3_key: Chave do objeto no S3
            
        Returns:
            bool: True se excluído com sucesso, False caso contrário
        """
        try:
            # Exclui o objeto do S3
            self.s3_client.delete_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=s3_key
            )
            
            logger.debug(f"Arquivo excluído do S3: {s3_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Erro ao excluir arquivo do S3 {s3_key}: {str(e)}")
            return False
