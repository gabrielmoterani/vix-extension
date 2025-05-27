"""
Adaptador para modelos de IA.
Implementa a interface IAPort para comunicação com APIs de IA.
"""

import io
import base64
import logging
import time
import json
from typing import Dict, Any, List, Optional
import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential

from app.adapters.ports import IAPort
from app.core.config import settings

logger = logging.getLogger(__name__)

class OpenAIAdapter(IAPort):
    """
    Adaptador para a API da OpenAI.
    Implementa os métodos da interface IAPort usando a API da OpenAI.
    """
    
    def __init__(self):
        """
        Inicializa o adaptador com configurações da API da OpenAI.
        """
        self.api_key = settings.OPENAI_API_KEY
        self.model = settings.OPENAI_MODEL
        self.max_tokens = settings.OPENAI_MAX_TOKENS
        self.api_base = "https://api.openai.com/v1"
        self.tokens_used = 0
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def _call_openai_api(self, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Método auxiliar para chamar a API da OpenAI com retry.
        
        Args:
            endpoint: Endpoint da API (ex: /chat/completions)
            payload: Dados da requisição
            
        Returns:
            Dict: Resposta da API
            
        Raises:
            Exception: Se ocorrer um erro na chamada à API
        """
        url = f"{self.api_base}{endpoint}"
        
        start_time = time.time()
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=self.headers, json=payload) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Erro na API da OpenAI: {response.status} - {error_text}")
                        raise Exception(f"Erro na API da OpenAI: {response.status} - {error_text}")
                    
                    result = await response.json()
                    
                    # Registra uso de tokens
                    if "usage" in result:
                        self.tokens_used = result["usage"].get("total_tokens", 0)
                        logger.info(f"Tokens usados: {self.tokens_used}")
                    
                    return result
        except Exception as e:
            logger.exception(f"Erro ao chamar API da OpenAI: {str(e)}")
            raise
        finally:
            elapsed = time.time() - start_time
            logger.debug(f"Chamada à API da OpenAI completada em {elapsed:.2f}s")
    
    async def interpret_visual_layout(self, dom_data: Dict[str, Any], image: io.BytesIO) -> Dict[str, Any]:
        """
        Implementação do VLI (Visual Layout Interpreter) usando a API da OpenAI.
        
        Args:
            dom_data: Dados do DOM e metadados
            image: Imagem da página em formato BytesIO
            
        Returns:
            Dict: Representação hierárquica (grafo de cena) com anotações semânticas
        """
        logger.info("Iniciando interpretação de layout visual (VLI)")
        
        # Converte a imagem para base64
        image_bytes = image.getvalue()
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        # Prepara o prompt para o VLI
        system_prompt = """
        Você é um Visual Layout Interpreter especializado em acessibilidade web.
        Sua tarefa é analisar a imagem da página web e o DOM fornecido para criar uma representação
        hierárquica (grafo de cena) com anotações semânticas.
        
        Identifique:
        1. Regiões principais da página (cabeçalho, menu, conteúdo principal, barra lateral, rodapé)
        2. Elementos interativos (botões, links, campos de formulário)
        3. Elementos visuais sem texto alternativo adequado
        4. Problemas de contraste e legibilidade
        5. Estrutura hierárquica e relações entre elementos
        
        Forneça sua análise em formato JSON estruturado.
        """
        
        # Simplifica o DOM para reduzir tokens
        simplified_dom = self._simplify_dom(dom_data)
        
        # Monta o payload para a API
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": [
                    {"type": "text", "text": f"Analise esta página web. DOM simplificado: {json.dumps(simplified_dom)}"},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                ]}
            ],
            "max_tokens": self.max_tokens
        }
        
        # Chama a API
        response = await self._call_openai_api("/chat/completions", payload)
        
        # Processa a resposta
        try:
            content = response["choices"][0]["message"]["content"]
            # Extrai o JSON da resposta
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = content[json_start:json_end]
                scene_graph = json.loads(json_str)
            else:
                # Fallback se não encontrar JSON válido
                scene_graph = {"error": "Não foi possível extrair JSON válido", "raw_content": content}
                logger.warning("Não foi possível extrair JSON válido da resposta do VLI")
        except Exception as e:
            logger.exception(f"Erro ao processar resposta do VLI: {str(e)}")
            scene_graph = {"error": str(e)}
        
        logger.info("Interpretação de layout visual (VLI) concluída")
        return scene_graph
    
    async def generate_modifications(self, vli_output: Dict[str, Any], accessibility_rules: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Implementação do CME (Contextual Modification Engine) usando a API da OpenAI.
        
        Args:
            vli_output: Saída do VLI (grafo de cena)
            accessibility_rules: Regras de acessibilidade a serem aplicadas
            
        Returns:
            List[Dict]: Lista de modificações a serem aplicadas no DOM
        """
        logger.info("Iniciando geração de modificações (CME)")
        
        # Prepara o prompt para o CME
        system_prompt = """
        Você é um Contextual Modification Engine especializado em acessibilidade web.
        Sua tarefa é analisar o grafo de cena fornecido pelo VLI e gerar modificações
        para melhorar a acessibilidade da página web.
        
        Para cada modificação, especifique:
        1. Tipo de modificação (aria, style, structure)
        2. Seletor CSS do elemento a modificar
        3. Detalhes da modificação (atributos, estilos, ações estruturais)
        
        Forneça suas modificações em formato JSON estruturado como uma lista de objetos.
        Cada objeto deve seguir o formato:
        {
            "type": "aria|style|structure",
            "selector": "seletor CSS",
            "details": { ... detalhes específicos ... }
        }
        """
        
        # Monta o payload para a API
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"""
                Gere modificações de acessibilidade para esta página web.
                
                Grafo de cena do VLI:
                {json.dumps(vli_output)}
                
                Regras de acessibilidade a aplicar:
                {json.dumps(accessibility_rules)}
                
                Retorne apenas o JSON com a lista de modificações.
                """}
            ],
            "max_tokens": self.max_tokens
        }
        
        # Chama a API
        response = await self._call_openai_api("/chat/completions", payload)
        
        # Processa a resposta
        try:
            content = response["choices"][0]["message"]["content"]
            # Extrai o JSON da resposta
            json_start = content.find('[')
            json_end = content.rfind(']') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = content[json_start:json_end]
                modifications = json.loads(json_str)
            else:
                # Tenta encontrar um objeto JSON
                json_start = content.find('{')
                json_end = content.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = content[json_start:json_end]
                    modifications = [json.loads(json_str)]
                else:
                    # Fallback se não encontrar JSON válido
                    modifications = []
                    logger.warning("Não foi possível extrair JSON válido da resposta do CME")
        except Exception as e:
            logger.exception(f"Erro ao processar resposta do CME: {str(e)}")
            modifications = []
        
        logger.info(f"Geração de modificações (CME) concluída: {len(modifications)} modificações geradas")
        return modifications
    
    async def plan_actions(self, user_intent: str, page_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Implementação do CPM (Conversational Plan Manager) usando a API da OpenAI.
        
        Args:
            user_intent: Intenção do usuário em linguagem natural
            page_context: Contexto da página (grafo de cena, URL, etc.)
            
        Returns:
            List[Dict]: Plano de ações a serem executadas
        """
        logger.info("Iniciando planejamento de ações (CPM)")
        
        if not user_intent:
            logger.info("Nenhuma intenção do usuário fornecida, pulando CPM")
            return []
        
        # Prepara o prompt para o CPM
        system_prompt = """
        Você é um Conversational Plan Manager especializado em acessibilidade web.
        Sua tarefa é analisar a intenção do usuário e o contexto da página para criar
        um plano de ações que ajude o usuário a realizar sua tarefa.
        
        Para cada ação no plano, especifique:
        1. Tipo de ação (focus, click, input, scroll, etc.)
        2. Seletor CSS do elemento alvo (quando aplicável)
        3. Parâmetros adicionais (texto a inserir, etc.)
        
        Forneça seu plano em formato JSON estruturado como uma lista de objetos.
        Cada objeto deve seguir o formato:
        {
            "type": "tipo_da_ação",
            "selector": "seletor CSS",
            "parameters": { ... parâmetros específicos ... }
        }
        """
        
        # Monta o payload para a API
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"""
                Crie um plano de ações para esta intenção do usuário:
                "{user_intent}"
                
                Contexto da página:
                {json.dumps(page_context)}
                
                Retorne apenas o JSON com a lista de ações.
                """}
            ],
            "max_tokens": self.max_tokens
        }
        
        # Chama a API
        response = await self._call_openai_api("/chat/completions", payload)
        
        # Processa a resposta
        try:
            content = response["choices"][0]["message"]["content"]
            # Extrai o JSON da resposta
            json_start = content.find('[')
            json_end = content.rfind(']') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = content[json_start:json_end]
                actions = json.loads(json_str)
            else:
                # Tenta encontrar um objeto JSON
                json_start = content.find('{')
                json_end = content.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = content[json_start:json_end]
                    actions = [json.loads(json_str)]
                else:
                    # Fallback se não encontrar JSON válido
                    actions = []
                    logger.warning("Não foi possível extrair JSON válido da resposta do CPM")
        except Exception as e:
            logger.exception(f"Erro ao processar resposta do CPM: {str(e)}")
            actions = []
        
        logger.info(f"Planejamento de ações (CPM) concluído: {len(actions)} ações planejadas")
        return actions
    
    async def get_tokens_used(self) -> int:
        """
        Retorna o número de tokens usados na última operação.
        
        Returns:
            int: Número de tokens usados
        """
        return self.tokens_used
    
    def _simplify_dom(self, dom_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simplifica o DOM para reduzir o número de tokens.
        
        Args:
            dom_data: Dados completos do DOM
            
        Returns:
            Dict: DOM simplificado
        """
        # Se não houver HTML processado, retorna os dados originais
        if not dom_data.get("processedHtml"):
            return dom_data
        
        # Implementação básica - em produção, seria mais sofisticada
        html = dom_data["processedHtml"]
        
        # Limita o tamanho do HTML
        max_html_length = 10000  # Ajustar conforme necessário
        if len(html) > max_html_length:
            html = html[:max_html_length] + "... [truncado]"
        
        # Retorna DOM simplificado
        return {
            "processedHtml": html,
            "metadata": dom_data.get("metadata", {})
        }
