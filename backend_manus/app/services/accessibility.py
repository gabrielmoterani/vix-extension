"""
Arquivo: /home/ubuntu/backend/app/services/accessibility.py
Serviço de análise de acessibilidade.
Implementa a lógica de negócio para análise e modificação de acessibilidade web.
"""

import logging
import time
import uuid
import base64
from io import BytesIO
from typing import List, Dict, Any, Optional
from datetime import datetime
from PIL import Image

from app.core.config import settings
from app.schemas.accessibility import (
    AnalysisRequest,
    AnalysisResponse,
    AccessibilityReport,
    ModificationRequest,
    ModificationResponse,
    PageSummary,
    Modification,
    Action
)
from app.domain.accessibility_rules import (
    AccessibilityRule,
    WCAGLevel,
    RuleCategory,
    get_rule_by_id,
    get_rules_by_level,
    get_rules_by_category
)
from app.adapters.ia_adapter import IAAdapter
from app.adapters.storage_adapter import StorageAdapter
from app.adapters.cache_adapter import CacheAdapter

# Configuração do logger
logger = logging.getLogger(__name__)

class AccessibilityService:
    """
    Serviço para análise e modificação de acessibilidade web.
    Implementa a lógica de negócio para processamento de páginas web.
    """
    
    def __init__(self):
        """
        Inicializa o serviço com adaptadores necessários.
        """
        self.ia_adapter = IAAdapter()
        self.storage_adapter = StorageAdapter()
        self.cache_adapter = CacheAdapter()
        
        # Métricas para monitoramento
        self.last_processing_time = 0
        self.last_tokens_used = 0
    
    async def process_page(self, request: AnalysisRequest) -> AnalysisResponse:
        """
        Processa uma página web para análise de acessibilidade.
        
        Args:
            request: Dados da requisição contendo URL, DOM, screenshot, etc.
            
        Returns:
            AnalysisResponse: Resposta contendo modificações, ações e sumário
        """
        start_time = time.time()
        logger.info(f"Iniciando processamento para URL: {request.url}")
        
        # Verifica cache
        if settings.ENABLE_CACHE:
            cache_key = f"analysis:{request.url}"
            cached_response = await self.cache_adapter.get(cache_key)
            if cached_response:
                logger.info(f"Resposta encontrada em cache para URL: {request.url}")
                cached_response["sessionId"] = request.sessionId
                return AnalysisResponse(**cached_response)
        
        # Processa o screenshot
        screenshot_path = await self._process_screenshot(request.screenshot, request.sessionId)
        
        # Prepara dados para análise
        analysis_data = {
            "url": str(request.url),
            "dom": request.dom.dict(),
            "screenshot_path": screenshot_path,
            "viewport": request.viewport.dict(),
            "user_preferences": request.userPreferences.dict(),
            "session_id": request.sessionId
        }
        
        # Realiza análise com IA
        analysis_result = await self.ia_adapter.analyze_accessibility(analysis_data)
        
        # Registra métricas
        self.last_tokens_used = analysis_result.get("tokens_used", 0)
        
        # Constrói a resposta
        response = AnalysisResponse(
            modifications=self._build_modifications(analysis_result),
            actions=self._build_actions(analysis_result),
            summary=self._build_summary(analysis_result),
            sessionId=request.sessionId
        )
        
        # Armazena em cache
        if settings.ENABLE_CACHE:
            cache_key = f"analysis:{request.url}"
            await self.cache_adapter.set(
                cache_key, 
                response.dict(exclude={"sessionId"}),
                ttl=settings.CACHE_TTL
            )
        
        # Calcula tempo de processamento
        self.last_processing_time = time.time() - start_time
        logger.info(f"Processamento concluído em {self.last_processing_time:.2f}s para URL: {request.url}")
        
        return response
    
    async def get_analysis_status(self, session_id: str) -> Dict[str, Any]:
        """
        Verifica o status de uma análise em andamento.
        
        Args:
            session_id: Identificador único da sessão de análise
            
        Returns:
            dict: Status da análise
        """
        # Verifica status no adaptador de IA
        status = await self.ia_adapter.get_analysis_status(session_id)
        
        return {
            "sessionId": session_id,
            "status": status.get("status", "unknown"),
            "progress": status.get("progress", 0),
            "estimatedTimeRemaining": status.get("estimated_time_remaining", None)
        }
    
    async def apply_modifications(self, request: ModificationRequest) -> ModificationResponse:
        """
        Aplica modificações específicas de acessibilidade.
        
        Args:
            request: Dados da requisição contendo modificações a serem aplicadas
            
        Returns:
            ModificationResponse: Resposta contendo resultado das modificações
        """
        logger.info(f"Aplicando {len(request.modifications)} modificações para URL: {request.url}")
        
        # Implementação real aplicaria as modificações
        # Esta é uma implementação simulada
        applied_count = 0
        failed_count = 0
        details = []
        
        for mod in request.modifications:
            try:
                # Simula aplicação da modificação
                details.append({
                    "selector": mod.selector,
                    "type": mod.type,
                    "success": True
                })
                applied_count += 1
            except Exception as e:
                logger.error(f"Erro ao aplicar modificação {mod.type} para seletor {mod.selector}: {str(e)}")
                details.append({
                    "selector": mod.selector,
                    "type": mod.type,
                    "success": False,
                    "error": str(e)
                })
                failed_count += 1
        
        return ModificationResponse(
            success=failed_count == 0,
            appliedCount=applied_count,
            failedCount=failed_count,
            details=details
        )
    
    async def get_accessibility_report(
        self, 
        url: str, 
        include_history: bool = False
    ) -> AccessibilityReport:
        """
        Obtém um relatório detalhado de acessibilidade.
        
        Args:
            url: URL da página para obter o relatório
            include_history: Se deve incluir histórico de análises anteriores
            
        Returns:
            AccessibilityReport: Relatório detalhado de acessibilidade
        """
        logger.info(f"Gerando relatório para URL: {url}")
        
        # Verifica cache
        if settings.ENABLE_CACHE:
            cache_key = f"report:{url}"
            cached_report = await self.cache_adapter.get(cache_key)
            if cached_report:
                logger.info(f"Relatório encontrado em cache para URL: {url}")
                return AccessibilityReport(**cached_report)
        
        # Obtém a análise mais recente
        cache_key = f"analysis:{url}"
        cached_analysis = await self.cache_adapter.get(cache_key)
        
        if not cached_analysis:
            logger.warning(f"Nenhuma análise encontrada para URL: {url}")
            # Cria um relatório vazio
            return AccessibilityReport(
                url=url,
                score=0,
                issues=[],
                summary="Nenhuma análise disponível para esta URL."
            )
        
        # Constrói o relatório com base na análise
        analysis = AnalysisResponse(**cached_analysis)
        
        # Obtém histórico se solicitado
        history = None
        if include_history:
            # Implementação real buscaria histórico no banco de dados
            history = []
        
        report = AccessibilityReport(
            url=url,
            timestamp=datetime.now(),
            score=analysis.summary.accessibilityScore,
            issues=self._extract_issues_from_analysis(analysis),
            summary=analysis.summary.mainContentSummary or "Análise de acessibilidade concluída.",
            history=history
        )
        
        # Armazena em cache
        if settings.ENABLE_CACHE:
            cache_key = f"report:{url}"
            await self.cache_adapter.set(
                cache_key, 
                report.dict(),
                ttl=settings.CACHE_TTL * 2  # TTL maior para relatórios
            )
        
        return report
    
    async def list_accessibility_rules(
        self, 
        category: Optional[str] = None,
        level: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Lista todas as regras de acessibilidade disponíveis.
        
        Args:
            category: Filtro opcional por categoria
            level: Filtro opcional por nível WCAG
            
        Returns:
            List[dict]: Lista de regras de acessibilidade
        """
        rules = []
        
        if category and level:
            # Filtra por categoria e nível
            cat_enum = RuleCategory(category.lower())
            level_enum = WCAGLevel(level.upper())
            rules = [r for r in get_rules_by_category(cat_enum) if r.level == level_enum]
        elif category:
            # Filtra apenas por categoria
            cat_enum = RuleCategory(category.lower())
            rules = get_rules_by_category(cat_enum)
        elif level:
            # Filtra apenas por nível
            level_enum = WCAGLevel(level.upper())
            rules = get_rules_by_level(level_enum)
        else:
            # Sem filtro, retorna todas as regras
            from app.domain.accessibility_rules import ACCESSIBILITY_RULES
            rules = ACCESSIBILITY_RULES
        
        # Converte para dicionários
        return [rule.dict() for rule in rules]
    
    async def record_metrics(
        self,
        url: str,
        session_id: str,
        processing_time: float,
        tokens_used: int
    ) -> None:
        """
        Registra métricas de processamento para análise e monitoramento.
        
        Args:
            url: URL da página analisada
            session_id: ID da sessão
            processing_time: Tempo de processamento em segundos
            tokens_used: Número de tokens utilizados
        """
        # Implementação real registraria métricas em um banco de dados
        logger.info(
            f"Métricas: URL={url}, SessionId={session_id}, "
            f"ProcessingTime={processing_time:.2f}s, TokensUsed={tokens_used}"
        )
    
    async def _process_screenshot(self, screenshot_base64: str, session_id: str) -> str:
        """
        Processa e armazena o screenshot.
        
        Args:
            screenshot_base64: Screenshot em formato base64
            session_id: ID da sessão
            
        Returns:
            str: Caminho para o screenshot armazenado
        """
        try:
            # Decodifica o base64
            screenshot_data = base64.b64decode(screenshot_base64)
            
            # Verifica o tamanho
            if len(screenshot_data) > settings.MAX_SCREENSHOT_SIZE_KB * 1024:
                logger.warning(f"Screenshot excede o tamanho máximo: {len(screenshot_data) / 1024:.2f}KB")
                # Redimensiona a imagem
                img = Image.open(BytesIO(screenshot_data))
                img.thumbnail((1280, 1280))  # Redimensiona mantendo proporção
                output = BytesIO()
                img.save(output, format='JPEG', quality=85)
                screenshot_data = output.getvalue()
            
            # Gera nome de arquivo único
            filename = f"{session_id}_{int(time.time())}.jpg"
            
            # Armazena o screenshot
            path = await self.storage_adapter.store_file(screenshot_data, filename, "screenshots")
            
            logger.debug(f"Screenshot armazenado em: {path}")
            return path
            
        except Exception as e:
            logger.error(f"Erro ao processar screenshot: {str(e)}")
            raise
    
    def _build_modifications(self, analysis_result: Dict[str, Any]) -> List[Modification]:
        """
        Constrói a lista de modificações a partir do resultado da análise.
        
        Args:
            analysis_result: Resultado da análise de IA
            
        Returns:
            List[Modification]: Lista de modificações
        """
        modifications = []
        
        # Extrai modificações do resultado da análise
        raw_modifications = analysis_result.get("modifications", [])
        
        for mod in raw_modifications:
            try:
                modifications.append(Modification(
                    type=mod.get("type", "unknown"),
                    selector=mod.get("selector", ""),
                    details=mod.get("details", {})
                ))
            except Exception as e:
                logger.error(f"Erro ao processar modificação: {str(e)}")
        
        return modifications
    
    def _build_actions(self, analysis_result: Dict[str, Any]) -> List[Action]:
        """
        Constrói a lista de ações a partir do resultado da análise.
        
        Args:
            analysis_result: Resultado da análise de IA
            
        Returns:
            List[Action]: Lista de ações
        """
        actions = []
        
        # Extrai ações do resultado da análise
        raw_actions = analysis_result.get("actions", [])
        
        for act in raw_actions:
            try:
                actions.append(Action(
                    type=act.get("type", "unknown"),
                    selector=act.get("selector"),
                    parameters=act.get("parameters", {})
                ))
            except Exception as e:
                logger.error(f"Erro ao processar ação: {str(e)}")
        
        return actions
    
    def _build_summary(self, analysis_result: Dict[str, Any]) -> PageSummary:
        """
        Constrói o resumo da página a partir do resultado da análise.
        
        Args:
            analysis_result: Resultado da análise de IA
            
        Returns:
            PageSummary: Resumo da página
        """
        raw_summary = analysis_result.get("summary", {})
        
        return PageSummary(
            pageType=raw_summary.get("page_type"),
            mainContentSummary=raw_summary.get("main_content_summary"),
            accessibilityScore=raw_summary.get("accessibility_score", 0),
            majorIssues=raw_summary.get("major_issues", [])
        )
    
    def _extract_issues_from_analysis(self, analysis: AnalysisResponse) -> List[Dict[str, Any]]:
        """
        Extrai problemas detalhados de uma análise.
        
        Args:
            analysis: Análise de acessibilidade
            
        Returns:
            List[Dict[str, Any]]: Lista de problemas detalhados
        """
        issues = []
        
        # Mapeia modificações para problemas
        for mod in analysis.modifications:
            # Determina a severidade com base no tipo
            severity = "high"
            if mod.type == "aria":
                severity = "medium"
            elif mod.type == "style":
                severity = "low"
            
            # Cria um problema para cada modificação
            issues.append({
                "rule_id": f"{mod.type}_{len(issues)}",
                "element_selector": mod.selector,
                "description": self._generate_issue_description(mod),
                "severity": severity,
                "suggested_fixes": [self._generate_fix_suggestion(mod)]
            })
        
        return issues
    
#     def _generate_issue_description(self, m
# (Content truncated due to size limit. Use line ranges to read in chunks)