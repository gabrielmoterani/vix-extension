"""
Arquivo: /home/ubuntu/backend/app/domain/conversation_intents.py
Modelos de domínio para intenções de conversação e processamento de linguagem natural.
Define estruturas e regras para interpretação de intenções do usuário.
"""

from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class IntentCategory(str, Enum):
    """
    Categorias de intenções do usuário.
    """
    NAVIGATION = "navigation"
    INFORMATION = "information"
    INTERACTION = "interaction"
    ASSISTANCE = "assistance"
    CUSTOMIZATION = "customization"
    OTHER = "other"

class IntentConfidenceLevel(str, Enum):
    """
    Níveis de confiança na interpretação da intenção.
    """
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    AMBIGUOUS = "ambiguous"

class IntentPattern(BaseModel):
    """
    Padrão de intenção para reconhecimento.
    """
    id: str
    name: str
    category: IntentCategory
    patterns: List[str]
    examples: List[str]
    required_context: List[str] = []
    
    class Config:
        frozen = True

# Padrões de intenção comuns para acessibilidade web
INTENT_PATTERNS = [
    IntentPattern(
        id="navigate_to",
        name="Navegar para elemento",
        category=IntentCategory.NAVIGATION,
        patterns=[
            "ir para {element}",
            "navegar para {element}",
            "encontrar {element}",
            "localizar {element}",
            "mostrar {element}"
        ],
        examples=[
            "ir para o menu principal",
            "navegar para o formulário de contato",
            "encontrar o botão de login",
            "localizar campo de busca",
            "mostrar rodapé"
        ],
        required_context=["page_elements"]
    ),
    IntentPattern(
        id="interact_with",
        name="Interagir com elemento",
        category=IntentCategory.INTERACTION,
        patterns=[
            "clicar em {element}",
            "selecionar {element}",
            "pressionar {element}",
            "ativar {element}",
            "interagir com {element}"
        ],
        examples=[
            "clicar no botão enviar",
            "selecionar a opção de acessibilidade",
            "pressionar o link de cadastro",
            "ativar o menu dropdown",
            "interagir com o slider de volume"
        ],
        required_context=["interactive_elements"]
    ),
    IntentPattern(
        id="fill_form",
        name="Preencher formulário",
        category=IntentCategory.INTERACTION,
        patterns=[
            "preencher {field} com {value}",
            "digitar {value} em {field}",
            "inserir {value} no campo {field}",
            "colocar {value} em {field}"
        ],
        examples=[
            "preencher email com usuario@exemplo.com",
            "digitar minha senha no campo senha",
            "inserir João Silva no campo nome",
            "colocar 11/05/1980 em data de nascimento"
        ],
        required_context=["form_elements"]
    ),
    IntentPattern(
        id="read_content",
        name="Ler conteúdo",
        category=IntentCategory.INFORMATION,
        patterns=[
            "ler {content}",
            "descrever {content}",
            "resumir {content}",
            "explicar {content}",
            "o que diz em {content}"
        ],
        examples=[
            "ler o parágrafo principal",
            "descrever a imagem do banner",
            "resumir o artigo",
            "explicar o gráfico de estatísticas",
            "o que diz em notícias recentes"
        ],
        required_context=["content_elements"]
    ),
    IntentPattern(
        id="customize_display",
        name="Personalizar exibição",
        category=IntentCategory.CUSTOMIZATION,
        patterns=[
            "aumentar {property}",
            "diminuir {property}",
            "ajustar {property}",
            "mudar {property} para {value}",
            "alterar {property}"
        ],
        examples=[
            "aumentar tamanho do texto",
            "diminuir brilho",
            "ajustar contraste",
            "mudar cor de fundo para escuro",
            "alterar espaçamento entre linhas"
        ]
    ),
    IntentPattern(
        id="get_help",
        name="Obter ajuda",
        category=IntentCategory.ASSISTANCE,
        patterns=[
            "ajuda com {topic}",
            "como {action}",
            "preciso de ajuda para {action}",
            "não consigo {action}",
            "tenho dificuldade em {action}"
        ],
        examples=[
            "ajuda com formulário de pagamento",
            "como navegar neste site",
            "preciso de ajuda para encontrar contatos",
            "não consigo fazer login",
            "tenho dificuldade em ler este texto"
        ]
    )
]

# Dicionário para acesso rápido por ID
INTENT_PATTERNS_BY_ID = {pattern.id: pattern for pattern in INTENT_PATTERNS}

def get_intent_pattern_by_id(pattern_id: str) -> Optional[IntentPattern]:
    """
    Obtém um padrão de intenção pelo ID.
    
    Args:
        pattern_id: ID do padrão de intenção
        
    Returns:
        Padrão de intenção ou None se não encontrado
    """
    return INTENT_PATTERNS_BY_ID.get(pattern_id)

def get_intent_patterns_by_category(category: IntentCategory) -> List[IntentPattern]:
    """
    Obtém todos os padrões de intenção de uma determinada categoria.
    
    Args:
        category: Categoria de intenção
        
    Returns:
        Lista de padrões de intenção da categoria especificada
    """
    return [pattern for pattern in INTENT_PATTERNS if pattern.category == category]

def extract_entities_from_intent(intent_text: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extrai entidades de uma intenção em texto.
    Implementação simplificada para demonstração.
    
    Args:
        intent_text: Texto da intenção
        context: Contexto da página
        
    Returns:
        Dicionário com entidades extraídas
    """
    # Implementação real usaria NLP mais avançado
    entities = {}
    
    # Exemplo simples de extração de entidades
    for pattern in INTENT_PATTERNS:
        for p in pattern.patterns:
            if "{element}" in p:
                # Tenta extrair elemento
                template_parts = p.split("{element}")
                if len(template_parts) == 2:
                    prefix, suffix = template_parts
                    if intent_text.startswith(prefix) and (suffix == "" or intent_text.endswith(suffix)):
                        element_text = intent_text[len(prefix):] if suffix == "" else intent_text[len(prefix):-len(suffix)]
                        element_text = element_text.strip()
                        if element_text:
                            entities["element"] = element_text
                            entities["intent_type"] = pattern.id
                            break
    
    return entities
