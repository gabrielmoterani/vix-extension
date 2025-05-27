"""
Arquivo: /home/ubuntu/backend/app/schemas/accessibility.py
Schemas Pydantic para validação de dados relacionados à acessibilidade.
Define estruturas de dados para requisições e respostas da API.
"""

from pydantic import BaseModel, Field, HttpUrl, validator
from typing import List, Dict, Any, Optional
from datetime import datetime
import base64

class DomData(BaseModel):
    """
    Dados do DOM da página web.
    """
    processedHtml: str = Field(..., description="HTML processado da página")
    accessibilityTree: Optional[Dict[str, Any]] = Field(None, description="Árvore de acessibilidade extraída")
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Metadados da página (título, descrição, etc.)"
    )

class ViewportData(BaseModel):
    """
    Dados da viewport do navegador.
    """
    width: int = Field(..., description="Largura da viewport em pixels")
    height: int = Field(..., description="Altura da viewport em pixels")
    devicePixelRatio: float = Field(1.0, description="Razão de pixels do dispositivo")

class UserPreferences(BaseModel):
    """
    Preferências do usuário para acessibilidade.
    """
    contrastEnhancement: bool = Field(True, description="Melhorar contraste")
    textEnlargement: bool = Field(False, description="Aumentar texto")
    keyboardNavigation: bool = Field(True, description="Melhorar navegação por teclado")
    screenReader: bool = Field(True, description="Otimizar para leitor de tela")
    simplifiedView: bool = Field(False, description="Simplificar visualização")

class AnalysisRequest(BaseModel):
    """
    Requisição para análise de acessibilidade de uma página web.
    """
    url: HttpUrl = Field(..., description="URL da página analisada")
    dom: DomData = Field(..., description="Dados do DOM da página")
    screenshot: str = Field(..., description="Screenshot da página em base64")
    viewport: ViewportData = Field(..., description="Dados da viewport")
    userPreferences: UserPreferences = Field(
        default_factory=UserPreferences,
        description="Preferências do usuário"
    )
    userIntent: Optional[str] = Field(None, description="Intenção do usuário em linguagem natural")
    sessionId: Optional[str] = Field(None, description="ID da sessão para rastreamento")
    
    @validator('screenshot')
    def validate_screenshot(cls, v):
        """Valida se o screenshot é uma string base64 válida."""
        try:
            # Tenta decodificar para verificar se é base64 válido
            base64.b64decode(v)
            return v
        except Exception:
            raise ValueError("Screenshot deve ser uma string base64 válida")

class Modification(BaseModel):
    """
    Modificação de acessibilidade a ser aplicada no DOM.
    """
    type: str = Field(..., description="Tipo de modificação (aria, style, structure)")
    selector: str = Field(..., description="Seletor CSS do elemento a modificar")
    details: Dict[str, Any] = Field(..., description="Detalhes da modificação")

class Action(BaseModel):
    """
    Ação a ser executada na página.
    """
    type: str = Field(..., description="Tipo de ação (focus, click, input, scroll, etc.)")
    selector: Optional[str] = Field(None, description="Seletor CSS do elemento alvo")
    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Parâmetros adicionais da ação"
    )

class PageSummary(BaseModel):
    """
    Resumo da análise de acessibilidade da página.
    """
    pageType: Optional[str] = Field(None, description="Tipo de página identificado")
    mainContentSummary: Optional[str] = Field(None, description="Resumo do conteúdo principal")
    accessibilityScore: int = Field(..., description="Pontuação de acessibilidade (0-100)")
    majorIssues: List[str] = Field(default_factory=list, description="Principais problemas encontrados")

class AnalysisResponse(BaseModel):
    """
    Resposta da análise de acessibilidade.
    """
    modifications: List[Modification] = Field(
        default_factory=list,
        description="Modificações a serem aplicadas"
    )
    actions: List[Action] = Field(
        default_factory=list,
        description="Ações sugeridas para o usuário"
    )
    summary: PageSummary = Field(..., description="Resumo da análise")
    sessionId: str = Field(..., description="ID da sessão para rastreamento")
    debugInfo: Optional[Dict[str, Any]] = Field(None, description="Informações de debug (apenas em desenvolvimento)")

class ModificationRequest(BaseModel):
    """
    Requisição para aplicar modificações específicas.
    """
    url: HttpUrl = Field(..., description="URL da página")
    modifications: List[Modification] = Field(..., description="Modificações a serem aplicadas")
    sessionId: Optional[str] = Field(None, description="ID da sessão para rastreamento")

class ModificationResponse(BaseModel):
    """
    Resposta da aplicação de modificações.
    """
    success: bool = Field(..., description="Se as modificações foram aplicadas com sucesso")
    appliedCount: int = Field(..., description="Número de modificações aplicadas")
    failedCount: int = Field(0, description="Número de modificações que falharam")
    details: Optional[List[Dict[str, Any]]] = Field(None, description="Detalhes da aplicação")

class AccessibilityIssue(BaseModel):
    """
    Problema de acessibilidade identificado.
    """
    rule_id: str = Field(..., description="ID da regra de acessibilidade")
    element_selector: str = Field(..., description="Seletor CSS do elemento problemático")
    description: str = Field(..., description="Descrição do problema")
    severity: str = Field(..., description="Severidade do problema (critical, high, medium, low)")
    suggested_fixes: List[str] = Field(default_factory=list, description="Sugestões de correção")

class AccessibilityReport(BaseModel):
    """
    Relatório detalhado de acessibilidade.
    """
    url: HttpUrl = Field(..., description="URL da página analisada")
    timestamp: datetime = Field(default_factory=datetime.now, description="Data e hora da análise")
    score: int = Field(..., description="Pontuação de acessibilidade (0-100)")
    issues: List[AccessibilityIssue] = Field(default_factory=list, description="Problemas encontrados")
    summary: str = Field(..., description="Resumo da análise")
    history: Optional[List[Dict[str, Any]]] = Field(None, description="Histórico de análises anteriores")
