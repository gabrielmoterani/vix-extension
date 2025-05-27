from src.domain.cme.services import AccessibilityAnalyzerPort
from src.domain.cme.models import AccessibilityIssue
from typing import List, Dict


class AxeAccessibilityAnalyzer(AccessibilityAnalyzerPort):
    """
    Usa axe-core para análise automática de acessibilidade
    """
    
    async def analyze_accessibility(self, dom_elements: List[Dict]) -> List[AccessibilityIssue]:
        """
        Simula análise do axe-core (na implementação real, seria executado no frontend)
        """
        issues = []
        
        for element in dom_elements:
            # Check for missing alt text
            if element.get('tagName') == 'IMG' and not element.get('alt'):
                issues.append(AccessibilityIssue(
                    element_selector=self._generate_selector(element),
                    issue_type="missing_alt_text",
                    severity="error",
                    wcag_criteria=["1.1.1"],
                    description="Image missing alternative text",
                    suggested_fix=None  # Will be generated later
                ))
            
            # Check for missing form labels
            if element.get('tagName') == 'INPUT' and not element.get('aria-label') and not element.get('aria-labelledby'):
                issues.append(AccessibilityIssue(
                    element_selector=self._generate_selector(element),
                    issue_type="missing_form_label",
                    severity="error",
                    wcag_criteria=["1.3.1", "4.1.2"],
                    description="Form input missing accessible label",
                    suggested_fix=None
                ))
        
        return issues
    
    def _generate_selector(self, element: Dict) -> str:
        """
        Gera seletor CSS para um elemento DOM
        """
        if element.get('id'):
            return f"#{element['id']}"
        
        tag = element.get('tagName', '').lower()
        classes = element.get('className', '')
        
        if classes:
            class_selector = '.'.join(classes.split()[:2])  # Use first 2 classes
            return f"{tag}.{class_selector}"
        
        return tag