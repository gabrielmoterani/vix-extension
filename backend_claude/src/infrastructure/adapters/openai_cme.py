
import json
from typing import Dict, Any, List
from src.domain.cme.services import LLMPort, AccessibilityAnalyzerPort
from src.domain.cme.models import SceneGraph, DOMModification, ModificationPlan, AccessibilityIssue, ModificationType, ElementType
from openai import AsyncOpenAI

class OpenAICMEAdapter(LLMPort):
    def __init__(self, api_key: str, model: str = "gpt-4-turbo"):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model
    
    async def generate_modifications(
        self, 
        scene_graph: SceneGraph, 
        accessibility_issues: List[AccessibilityIssue]
    ) -> List[DOMModification]:
        """
        Usa LLM para gerar modificações contextuais baseadas na análise da página
        """
        
        prompt = self._create_modification_prompt(scene_graph, accessibility_issues)
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert web accessibility consultant. 
                        Generate specific DOM modifications to improve accessibility based on WCAG 2.1 AA standards.
                        Return valid JSON only."""
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=3000,
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            modifications_data = json.loads(content)
            
            return self._convert_to_modifications(modifications_data)
            
        except Exception as e:
            print(f"Error generating modifications: {e}")
            return []
    
    def _create_modification_prompt(
        self, 
        scene_graph: SceneGraph, 
        issues: List[AccessibilityIssue]
    ) -> str:
        return f"""
        Analyze this webpage structure and generate accessibility improvements:
        
        Page Structure:
        - Title: {scene_graph.page_title}
        - Main sections: {len(scene_graph.main_sections)}
        - Interactive elements: {len(scene_graph.interactive_elements)}
        - Media elements: {len(scene_graph.media_elements)}
        
        Identified Issues:
        {[{"type": issue.issue_type, "severity": issue.severity, "description": issue.description} for issue in issues[:10]]}
        
        Generate specific modifications following this JSON structure:
        {{
            "modifications": [
                {{
                    "id": "unique_modification_id",
                    "element_selector": "CSS selector",
                    "modification_type": "add_alt_text|add_aria_label|add_role|improve_heading_structure",
                    "action": "setAttribute|createElement|modifyStyle",
                    "target_attribute": "alt|role|aria-label|etc",
                    "new_value": "descriptive value",
                    "priority": 1-10,
                    "wcag_criteria": ["1.1.1", "2.4.1"],
                    "context_reasoning": "why this modification helps"
                }}
            ]
        }}
        
        Focus on:
        1. Adding meaningful alt text for images
        2. Improving semantic structure with ARIA roles
        3. Enhancing keyboard navigation
        4. Adding proper headings hierarchy
        5. Color contrast improvements
        
        Limit to 15 most impactful modifications.
        """

