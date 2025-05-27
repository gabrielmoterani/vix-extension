from abc import ABC, abstractmethod
import asyncio
from typing import List, Dict, Optional

from src.domain.cme.models import SceneGraph, DOMModification, ModificationPlan, AccessibilityIssue, ModificationType, ElementType

class LLMPort(ABC):
    @abstractmethod
    async def generate_modifications(
        self, 
        scene_graph: SceneGraph, 
        accessibility_issues: List[AccessibilityIssue]
    ) -> List[DOMModification]:
        pass

class AccessibilityAnalyzerPort(ABC):
    @abstractmethod
    async def analyze_accessibility(self, dom_elements: List[Dict]) -> List[AccessibilityIssue]:
        pass

class ContextualModificationEngine:
    def __init__(
        self, 
        llm_adapter: LLMPort,
        accessibility_analyzer: AccessibilityAnalyzerPort
    ):
        self.llm_adapter = llm_adapter
        self.accessibility_analyzer = accessibility_analyzer
        self.modification_cache = {}
    
    async def create_modification_plan(
        self,
        scene_graph: SceneGraph,
        dom_elements: List[Dict],
        user_preferences: Optional[Dict] = None
    ) -> ModificationPlan:
        """
        Cria um plano de modificações para melhorar acessibilidade
        """
        start_time = asyncio.get_event_loop().time()
        
        # 1. Analyze current accessibility issues
        issues = await self.accessibility_analyzer.analyze_accessibility(dom_elements)
        
        # 2. Generate AI-powered modifications
        ai_modifications = await self.llm_adapter.generate_modifications(
            scene_graph, 
            issues
        )
        
        # 3. Apply rule-based improvements
        rule_modifications = self._apply_rule_based_improvements(
            scene_graph, 
            dom_elements
        )
        
        # 4. Combine and prioritize modifications
        all_modifications = ai_modifications + rule_modifications
        prioritized = self._prioritize_modifications(all_modifications, user_preferences)
        
        # 5. Create execution plan
        end_time = asyncio.get_event_loop().time()
        processing_time = int((end_time - start_time) * 1000)
        
        return ModificationPlan(
            page_url="",  # Will be set by caller
            total_issues=len(issues),
            modifications=prioritized,
            estimated_improvement_score=self._calculate_improvement_score(prioritized),
            processing_time_ms=processing_time
        )
    
    def _apply_rule_based_improvements(
        self, 
        scene_graph: SceneGraph, 
        dom_elements: List[Dict]
    ) -> List[DOMModification]:
        """
        Aplica melhorias baseadas em regras predefinidas
        """
        modifications = []
        
        # Rule 1: Add missing alt text for images
        for element in scene_graph.media_elements:
            if element.element_type == ElementType.IMAGE:
                if not element.attributes.get('alt'):
                    modifications.append(DOMModification(
                        id=f"alt_text_{element.id}",
                        element_selector=f"#{element.id}",
                        modification_type=ModificationType.ADD_ALT_TEXT,
                        action="setAttribute",
                        target_attribute="alt",
                        new_value="",  # Will be filled by AI
                        css_changes=None,
                        priority=9,
                        wcag_criteria=["1.1.1"]
                    ))
        
        # Rule 2: Add ARIA landmarks
        if not self._has_main_landmark(scene_graph):
            main_content = self._find_main_content_area(scene_graph)
            if main_content:
                modifications.append(DOMModification(
                    id=f"main_landmark_{main_content.id}",
                    element_selector=f"#{main_content.id}",
                    modification_type=ModificationType.ADD_LANDMARK,
                    action="setAttribute",
                    target_attribute="role",
                    new_value="main",
                    css_changes=None,
                    priority=8,
                    wcag_criteria=["2.4.1"]
                ))
        
        # Rule 3: Improve heading structure
        heading_fixes = self._analyze_heading_structure(scene_graph)
        modifications.extend(heading_fixes)
        
        # Rule 4: Add skip links
        if not self._has_skip_links(dom_elements):
            modifications.append(self._create_skip_link_modification())
        
        return modifications
    
    def _prioritize_modifications(
        self, 
        modifications: List[DOMModification],
        user_preferences: Optional[Dict] = None
    ) -> List[DOMModification]:
        """
        Prioriza modificações baseado em impacto e preferências do usuário
        """
        # Base priority from modification
        def priority_score(mod: DOMModification) -> float:
            score = mod.priority
            
            # Boost based on WCAG level
            if any(criteria.startswith("1.") for criteria in mod.wcag_criteria):
                score += 2  # Level A is most important
            
            # User preference adjustments
            if user_preferences:
                if user_preferences.get("focus_on_images") and mod.modification_type == ModificationType.ADD_ALT_TEXT:
                    score += 3
                if user_preferences.get("focus_on_navigation") and "navigation" in mod.element_selector.lower():
                    score += 2
            
            return score
        
        return sorted(modifications, key=priority_score, reverse=True)
    
    def _calculate_improvement_score(self, modifications: List[DOMModification]) -> float:
        """
        Calcula score estimado de melhoria (0-100)
        """
        if not modifications:
            return 0.0
        
        # Weight by priority and WCAG impact
        total_weight = 0
        for mod in modifications:
            weight = mod.priority
            if any(criteria.startswith("1.") for criteria in mod.wcag_criteria):
                weight *= 1.5
            total_weight += weight
        
        # Normalize to 0-100 scale
        max_possible = len(modifications) * 10 * 1.5
        return min(100.0, (total_weight / max_possible) * 100)