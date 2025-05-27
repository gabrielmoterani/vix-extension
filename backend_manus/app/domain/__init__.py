"""
Arquivo: /home/ubuntu/backend/app/domain/__init__.py
Inicializador do pacote domain.
"""

# Exporta componentes principais para facilitar importação
from app.domain.accessibility_rules import (
    AccessibilityRule,
    WCAGLevel,
    RuleCategory,
    get_rule_by_id,
    get_rules_by_level,
    get_rules_by_category
)
