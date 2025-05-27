"""
Arquivo: /home/ubuntu/backend/app/domain/accessibility_rules.py
Modelos de domínio para regras de acessibilidade.
Define as regras WCAG e outras diretrizes de acessibilidade.
"""

from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class WCAGLevel(str, Enum):
    """
    Níveis de conformidade WCAG.
    """
    A = "A"
    AA = "AA"
    AAA = "AAA"

class RuleCategory(str, Enum):
    """
    Categorias de regras de acessibilidade.
    """
    PERCEIVABLE = "perceivable"
    OPERABLE = "operable"
    UNDERSTANDABLE = "understandable"
    ROBUST = "robust"

class AccessibilityRule(BaseModel):
    """
    Regra de acessibilidade baseada em WCAG ou outras diretrizes.
    """
    id: str
    name: str
    description: str
    wcag_reference: Optional[str] = None
    level: WCAGLevel
    category: RuleCategory
    techniques: List[str] = []
    test_procedure: str
    impact: str
    example_pass: str
    example_fail: str
    
    class Config:
        frozen = True

# Regras de acessibilidade baseadas em WCAG 2.1
ACCESSIBILITY_RULES = [
    AccessibilityRule(
        id="1.1.1_alt_text",
        name="Texto alternativo para imagens",
        description="Todas as imagens devem ter texto alternativo que descreva o conteúdo e função da imagem.",
        wcag_reference="1.1.1",
        level=WCAGLevel.A,
        category=RuleCategory.PERCEIVABLE,
        techniques=["ARIA6", "ARIA10", "G94", "G95"],
        test_procedure="Verificar se todas as imagens têm atributo alt ou role='presentation' quando decorativas.",
        impact="Crítico para usuários de leitores de tela",
        example_pass="<img src='logo.png' alt='Logo da empresa XYZ'>",
        example_fail="<img src='logo.png'>"
    ),
    AccessibilityRule(
        id="1.4.3_contrast",
        name="Contraste de texto",
        description="O contraste entre texto e fundo deve ser de pelo menos 4.5:1 para texto normal e 3:1 para texto grande.",
        wcag_reference="1.4.3",
        level=WCAGLevel.AA,
        category=RuleCategory.PERCEIVABLE,
        techniques=["G18", "G145", "G174"],
        test_procedure="Medir o contraste entre texto e fundo usando ferramenta de contraste.",
        impact="Alto para usuários com baixa visão",
        example_pass="Texto preto (#000000) em fundo branco (#FFFFFF) - contraste 21:1",
        example_fail="Texto cinza claro (#CCCCCC) em fundo branco (#FFFFFF) - contraste 1.6:1"
    ),
    AccessibilityRule(
        id="2.1.1_keyboard",
        name="Acessibilidade por teclado",
        description="Toda funcionalidade deve estar disponível usando apenas o teclado.",
        wcag_reference="2.1.1",
        level=WCAGLevel.A,
        category=RuleCategory.OPERABLE,
        techniques=["G90", "G202", "H91"],
        test_procedure="Testar todas as funcionalidades usando apenas o teclado.",
        impact="Crítico para usuários que não podem usar mouse",
        example_pass="<button onclick='doSomething()'>Clique aqui</button>",
        example_fail="<div onclick='doSomething()'>Clique aqui</div> (sem foco de teclado)"
    ),
    AccessibilityRule(
        id="2.4.3_focus_order",
        name="Ordem de foco lógica",
        description="A ordem de navegação por teclado deve seguir uma sequência lógica e significativa.",
        wcag_reference="2.4.3",
        level=WCAGLevel.A,
        category=RuleCategory.OPERABLE,
        techniques=["G59", "H4"],
        test_procedure="Navegar pela página usando Tab e verificar se a ordem é lógica.",
        impact="Alto para usuários de teclado e leitores de tela",
        example_pass="Elementos de formulário organizados em ordem lógica de cima para baixo",
        example_fail="Foco pula aleatoriamente entre elementos da página"
    ),
    AccessibilityRule(
        id="3.3.2_form_labels",
        name="Rótulos para campos de formulário",
        description="Todos os campos de formulário devem ter rótulos descritivos associados.",
        wcag_reference="3.3.2",
        level=WCAGLevel.A,
        category=RuleCategory.UNDERSTANDABLE,
        techniques=["G131", "H44", "ARIA16"],
        test_procedure="Verificar se todos os campos têm elementos label associados ou aria-label.",
        impact="Alto para usuários de leitores de tela",
        example_pass="<label for='name'>Nome:</label><input id='name' type='text'>",
        example_fail="<input type='text'> (sem rótulo)"
    ),
    AccessibilityRule(
        id="4.1.2_name_role_value",
        name="Nome, função e valor",
        description="Para todos os componentes de interface, o nome, função e valor devem ser programaticamente determinados.",
        wcag_reference="4.1.2",
        level=WCAGLevel.A,
        category=RuleCategory.ROBUST,
        techniques=["ARIA5", "ARIA16", "G108"],
        test_procedure="Verificar se elementos personalizados têm roles e propriedades ARIA apropriados.",
        impact="Crítico para usuários de tecnologias assistivas",
        example_pass="<div role='button' tabindex='0' aria-pressed='false'>Botão personalizado</div>",
        example_fail="<div onclick='toggle()'>Botão personalizado</div> (sem role ou estado)"
    )
]

# Dicionário para acesso rápido por ID
RULES_BY_ID = {rule.id: rule for rule in ACCESSIBILITY_RULES}

def get_rule_by_id(rule_id: str) -> Optional[AccessibilityRule]:
    """
    Obtém uma regra de acessibilidade pelo ID.
    
    Args:
        rule_id: ID da regra
        
    Returns:
        Regra de acessibilidade ou None se não encontrada
    """
    return RULES_BY_ID.get(rule_id)

def get_rules_by_level(level: WCAGLevel) -> List[AccessibilityRule]:
    """
    Obtém todas as regras de um determinado nível WCAG.
    
    Args:
        level: Nível WCAG (A, AA, AAA)
        
    Returns:
        Lista de regras do nível especificado
    """
    return [rule for rule in ACCESSIBILITY_RULES if rule.level == level]

def get_rules_by_category(category: RuleCategory) -> List[AccessibilityRule]:
    """
    Obtém todas as regras de uma determinada categoria.
    
    Args:
        category: Categoria de regra
        
    Returns:
        Lista de regras da categoria especificada
    """
    return [rule for rule in ACCESSIBILITY_RULES if rule.category == category]
