"""
Schemas Pydantic para validação de dados da API.
Define os modelos de entrada e saída para o endpoint de análise.
"""

from pydantic import BaseModel, Field, HttpUrl
from typing import List, Dict, Any, Optional, Union

# --- Schemas de Requisição ---

class DomData(BaseModel):
    """
    Dados do DOM e metadados da página web.
    """
    processedHtml: Optional[str] = Field(
        None, 
        description="HTML pré-processado (ex: após Readability)"
    )
    accessibilityTree: Optional[Dict[str, Any]] = Field(
        None, 
        description="Representação da árvore de acessibilidade"
    )
    metadata: Optional[Dict[str, str]] = Field(
        {}, 
        description="Metadados da página (título, lang, etc.)"
    )

class ViewportData(BaseModel):
    """
    Informações sobre a viewport do navegador.
    """
    width: int = Field(..., description="Largura da viewport em pixels")
    height: int = Field(..., description="Altura da viewport em pixels")
    devicePixelRatio: Optional[float] = Field(
        1.0, 
        description="Razão de pixels do dispositivo (para telas de alta densidade)"
    )

class UserPreferences(BaseModel):
    """
    Preferências de acessibilidade do usuário.
    """
    contrastEnhancement: Optional[bool] = Field(
        False, 
        description="Melhorar contraste de cores"
    )
    textEnlargement: Optional[bool] = Field(
        False, 
        description="Aumentar tamanho do texto"
    )
    keyboardNavigation: Optional[bool] = Field(
        True, 
        description="Otimizar para navegação por teclado"
    )
    screenReader: Optional[bool] = Field(
        True, 
        description="Otimizar para leitores de tela"
    )
    simplifiedView: Optional[bool] = Field(
        False, 
        description="Simplificar layout e conteúdo"
    )

class AnalysisRequest(BaseModel):
    """
    Requisição completa para análise de página web.
    """
    url: HttpUrl = Field(
        ..., 
        description="URL da página analisada"
    )
    dom: DomData = Field(
        ..., 
        description="Dados do DOM e metadados"
    )
    screenshot: str = Field(
        ..., 
        description="Screenshot da página codificado em Base64"
    )
    viewport: ViewportData = Field(
        ..., 
        description="Informações da viewport"
    )
    userPreferences: Optional[UserPreferences] = Field(
        UserPreferences(), 
        description="Preferências de acessibilidade do usuário"
    )
    sessionId: Optional[str] = Field(
        None, 
        description="Identificador único da sessão de análise"
    )
    userIntent: Optional[str] = Field(
        None, 
        description="Intenção do usuário em linguagem natural (para CPM)"
    )

# --- Schemas de Resposta ---

class AriaModification(BaseModel):
    """
    Modificação de atributos ARIA em um elemento.
    """
    selector: str = Field(
        ..., 
        description="Seletor CSS do elemento a modificar"
    )
    attributes: Dict[str, str] = Field(
        ..., 
        description="Atributos ARIA a adicionar/modificar"
    )

class StyleModification(BaseModel):
    """
    Modificação de estilos CSS em um elemento.
    """
    selector: str = Field(
        ..., 
        description="Seletor CSS do elemento a modificar"
    )
    styles: Dict[str, str] = Field(
        ..., 
        description="Estilos CSS a aplicar"
    )

class StructureModification(BaseModel):
    """
    Modificação estrutural em um elemento (ex: adicionar heading, wrapper).
    """
    selector: str = Field(
        ..., 
        description="Seletor CSS do elemento a modificar"
    )
    action: str = Field(
        ..., 
        description="Ação estrutural (ex: 'wrapWithNav', 'addHeading')"
    )
    parameters: Optional[Dict[str, Any]] = Field(
        {}, 
        description="Parâmetros para a ação"
    )

class Modification(BaseModel):
    """
    Modificação genérica a ser aplicada no DOM.
    """
    type: str = Field(
        ..., 
        description="Tipo de modificação ('aria', 'style', 'structure')"
    )
    selector: str = Field(
        ..., 
        description="Seletor CSS do elemento a modificar"
    )
    details: Dict[str, Any] = Field(
        ..., 
        description="Detalhes da modificação, dependendo do tipo"
    )

class Action(BaseModel):
    """
    Ação a ser executada pelo frontend.
    """
    type: str = Field(
        ..., 
        description="Tipo de ação (ex: 'focus', 'click', 'announce')"
    )
    selector: Optional[str] = Field(
        None, 
        description="Seletor CSS do elemento alvo"
    )
    parameters: Optional[Dict[str, Any]] = Field(
        {}, 
        description="Parâmetros adicionais para a ação"
    )

class PageSummary(BaseModel):
    """
    Sumário da análise da página.
    """
    pageType: Optional[str] = Field(
        None, 
        description="Tipo inferido da página (ex: 'article', 'product', 'form')"
    )
    mainContentSummary: Optional[str] = Field(
        None, 
        description="Resumo do conteúdo principal"
    )
    accessibilityScore: Optional[int] = Field(
        None, 
        description="Pontuação estimada de acessibilidade (0-100)"
    )
    majorIssues: Optional[List[str]] = Field(
        [], 
        description="Lista dos principais problemas de acessibilidade encontrados"
    )
    wcagViolations: Optional[List[Dict[str, Any]]] = Field(
        [], 
        description="Violações específicas de WCAG identificadas"
    )

class AnalysisResponse(BaseModel):
    """
    Resposta completa da análise de página web.
    """
    modifications: List[Modification] = Field(
        [], 
        description="Lista de modificações a serem aplicadas no DOM"
    )
    actions: List[Action] = Field(
        [], 
        description="Lista de ações a serem executadas pela extensão"
    )
    summary: Optional[PageSummary] = Field(
        None, 
        description="Sumário da análise da página"
    )
    sessionId: Optional[str] = Field(
        None, 
        description="Identificador único da sessão de análise"
    )
    debugInfo: Optional[Dict[str, Any]] = Field(
        None, 
        description="Informações de debug (apenas em ambiente de dev)"
    )
