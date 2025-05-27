from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
import json
import asyncio
from dataclasses import dataclass
import tiktoken

class PromptType(Enum):
    VISUAL_ANALYSIS = "visual_analysis"
    ACCESSIBILITY_MODIFICATION = "accessibility_modification"
    INTENT_UNDERSTANDING = "intent_understanding"
    TASK_PLANNING = "task_planning"
    ERROR_RECOVERY = "error_recovery"

@dataclass
class PromptTemplate:
    name: str
    template: str
    max_tokens: int
    temperature: float
    system_prompt: Optional[str] = None
    few_shot_examples: Optional[List[Dict]] = None
    token_budget_allocation: Optional[Dict[str, float]] = None

class TokenManager:
    """Gerencia uso inteligente de tokens para otimizar custos e qualidade"""
    
    def __init__(self, model_name: str = "gpt-4"):
        self.encoding = tiktoken.encoding_for_model(model_name)
        self.model_limits = {
            "gpt-4": 8192,
            "gpt-4-32k": 32768,
            "gpt-4-turbo": 128000,
            "gpt-4-vision-preview": 128000,
            "claude-3-opus": 200000,
            "claude-3-sonnet": 200000
        }
        self.max_tokens = self.model_limits.get(model_name, 8192)
    
    def count_tokens(self, text: str) -> int:
        """Conta tokens de um texto"""
        return len(self.encoding.encode(text))
    
    def optimize_content_for_tokens(
        self, 
        content: Dict[str, str], 
        priority_weights: Dict[str, float],
        target_tokens: int
    ) -> Dict[str, str]:
        """
        Otimiza conteúdo para ficar dentro do limite de tokens
        preservando informações mais importantes
        """
        current_tokens = sum(self.count_tokens(text) for text in content.values())
        
        if current_tokens <= target_tokens:
            return content
        
        # Calcular quanto cortar de cada seção
        reduction_ratio = target_tokens / current_tokens
        optimized_content = {}
        
        for section, text in content.items():
            weight = priority_weights.get(section, 1.0)
            section_tokens = self.count_tokens(text)
            target_section_tokens = int(section_tokens * reduction_ratio * weight)
            
            if target_section_tokens < section_tokens:
                optimized_content[section] = self._truncate_intelligently(
                    text, target_section_tokens
                )
            else:
                optimized_content[section] = text
        
        return optimized_content
    
    def _truncate_intelligently(self, text: str, target_tokens: int) -> str:
        """
        Trunca texto preservando informações importantes
        """
        sentences = text.split('. ')
        
        # Priorizar primeiras e últimas frases
        if len(sentences) <= 3:
            return text[:target_tokens * 4]  # Aproximação de chars por token
        
        important_sentences = []
        token_count = 0
        
        # Adicionar primeira frase
        first_sentence = sentences[0]
        first_tokens = self.count_tokens(first_sentence)
        if first_tokens < target_tokens:
            important_sentences.append(first_sentence)
            token_count += first_tokens
        
        # Adicionar frases do meio
        middle_start = len(sentences) // 3
        middle_end = 2 * len(sentences) // 3
        
        for sentence in sentences[middle_start:middle_end]:
            sentence_tokens = self.count_tokens(sentence)
            if token_count + sentence_tokens < target_tokens * 0.8:
                important_sentences.append(sentence)
                token_count += sentence_tokens
            else:
                break
        
        # Adicionar última frase se houver espaço
        last_sentence = sentences[-1]
        last_tokens = self.count_tokens(last_sentence)
        if token_count + last_tokens <= target_tokens:
            important_sentences.append(last_sentence)
        
        return '. '.join(important_sentences)

class PromptManager:
    """Gerencia templates de prompts otimizados para diferentes tarefas"""
    
    def __init__(self, token_manager: TokenManager):
        self.token_manager = token_manager
        self.templates = self._load_prompt_templates()
        self.performance_cache = {}
    
    def _load_prompt_templates(self) -> Dict[PromptType, PromptTemplate]:
        """Carrega templates de prompts otimizados"""
        return {
            PromptType.VISUAL_ANALYSIS: PromptTemplate(
                name="visual_analysis_v2",
                template=self._get_visual_analysis_template(),
                max_tokens=2000,
                temperature=0.1,
                system_prompt=self._get_visual_analysis_system_prompt(),
                token_budget_allocation={
                    "system_prompt": 0.1,
                    "dom_context": 0.3,
                    "visual_description": 0.4,
                    "examples": 0.1,
                    "response": 0.1
                }
            ),
            PromptType.ACCESSIBILITY_MODIFICATION: PromptTemplate(
                name="accessibility_mod_v3",
                template=self._get_accessibility_mod_template(),
                max_tokens=3000,
                temperature=0.1,
                system_prompt=self._get_accessibility_system_prompt(),
                few_shot_examples=self._get_accessibility_examples()
            ),
            PromptType.INTENT_UNDERSTANDING: PromptTemplate(
                name="intent_understanding_v2",
                template=self._get_intent_template(),
                max_tokens=1000,
                temperature=0.2,
                system_prompt=self._get_intent_system_prompt()
            ),
            PromptType.TASK_PLANNING: PromptTemplate(
                name="task_planning_v2",
                template=self._get_task_planning_template(),
                max_tokens=2500,
                temperature=0.1,
                system_prompt=self._get_task_planning_system_prompt(),
                few_shot_examples=self._get_task_planning_examples()
            )
        }
    
    def build_optimized_prompt(
        self,
        prompt_type: PromptType,
        context_data: Dict[str, Any],
        max_tokens_override: Optional[int] = None
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Constrói prompt otimizado respeitando limites de tokens
        """
        template = self.templates[prompt_type]
        max_tokens = max_tokens_override or template.max_tokens
        
        # Reservar tokens para resposta
        response_tokens = int(max_tokens * 0.3)
        available_tokens = max_tokens - response_tokens
        
        # Construir seções do prompt
        prompt_sections = self._build_prompt_sections(template, context_data)
        
        # Otimizar para tokens disponíveis
        if template.token_budget_allocation:
            optimized_sections = self.token_manager.optimize_content_for_tokens(
                prompt_sections,
                template.token_budget_allocation,
                available_tokens
            )
        else:
            optimized_sections = prompt_sections
        
        # Montar prompt final
        final_prompt = self._assemble_final_prompt(template, optimized_sections)
        
        # Configurações para o modelo
        model_config = {
            "max_tokens": response_tokens,
            "temperature": template.temperature,
            "top_p": 0.9,
            "frequency_penalty": 0.1,
            "presence_penalty": 0.1
        }
        
        return final_prompt, model_config
    
    def _get_visual_analysis_template(self) -> str:
        return """
Analyze this webpage screenshot and DOM structure to create a comprehensive scene graph.

DOM Structure Summary:
{dom_summary}

Page Context:
- URL: {page_url}
- Viewport: {viewport_size}
- Total Elements: {total_elements}

Visual Analysis Instructions:
1. Identify main page sections and their semantic roles
2. Locate interactive elements and their accessibility status
3. Detect images and visual content needing descriptions
4. Map element relationships and hierarchies
5. Identify potential accessibility barriers

Focus Areas:
- Navigation structures and landmarks
- Form elements and their labels
- Images without adequate alt text
- Interactive elements lacking ARIA attributes
- Color contrast and visual hierarchy issues

Return structured JSON following this schema:
{{
    "page_analysis": {{
        "title": "page title",
        "main_sections": [
            {{
                "id": "section_id",
                "type": "header|main|nav|aside|footer",
                "semantic_role": "banner|navigation|main|complementary|contentinfo",
                "bbox": {{"x": 0, "y": 0, "width": 0, "height": 0}},
                "accessibility_score": 0-100,
                "issues": ["list of issues"],
                "confidence": 0.0-1.0
            }}
        ],
        "interactive_elements": [...],
        "media_elements": [...],
        "accessibility_summary": {{
            "overall_score": 0-100,
            "critical_issues": [],
            "improvement_opportunities": []
        }}
    }}
}}

Be precise and focus on actionable accessibility insights.
"""
    
    def _get_visual_analysis_system_prompt(self) -> str:
        return """You are an expert web accessibility analyst with deep knowledge of WCAG 2.1 AA standards, screen reader behavior, and assistive technologies. Your role is to analyze webpage screenshots combined with DOM data to identify accessibility issues and opportunities for improvement.

Key expertise areas:
- WCAG 2.1 AA compliance criteria
- Screen reader navigation patterns
- ARIA roles, states, and properties
- Color contrast and visual design accessibility
- Keyboard navigation requirements
- Motor accessibility considerations

Always provide specific, actionable recommendations based on established accessibility guidelines."""

    def _get_accessibility_mod_template(self) -> str:
        return """
Based on the page analysis, generate specific DOM modifications to improve accessibility.

Page Analysis:
{scene_graph}

Current Accessibility Issues:
{accessibility_issues}

User Accessibility Needs:
{user_needs}

Generate modifications following this priority order:
1. Critical WCAG AA violations (Level A/AA)
2. Screen reader navigation improvements
3. Keyboard accessibility enhancements
4. Visual accessibility improvements
5. Motor accessibility adaptations

For each modification, consider:
- WCAG success criteria addressed
- Impact on assistive technology users
- Implementation complexity and reliability
- Potential side effects on existing functionality

Few-shot Examples:
{examples}

Return JSON array of modifications:
{{
    "modifications": [
        {{
            "id": "unique_mod_id",
            "element_selector": "CSS selector",
            "modification_type": "add_alt_text|add_aria_label|add_role|improve_heading|fix_contrast",
            "action": "setAttribute|createElement|modifyStyle|replaceElement",
            "target_attribute": "alt|role|aria-label|etc",
            "new_value": "descriptive value",
            "css_changes": {{"property": "value"}},
            "priority": 1-10,
            "wcag_criteria": ["1.1.1", "2.4.1"],
            "reasoning": "why this modification helps accessibility",
            "estimated_impact": "high|medium|low",
            "testing_notes": "how to verify the modification works"
        }}
    ],
    "summary": {{
        "total_modifications": 0,
        "estimated_improvement_percentage": 0,
        "implementation_complexity": "low|medium|high"
    }}
}}
"""
    
    def _get_accessibility_examples(self) -> List[Dict]:
        return [
            {
                "scenario": "Image without alt text in article",
                "modification": {
                    "element_selector": "img[src*='hero-image']",
                    "modification_type": "add_alt_text",
                    "action": "setAttribute",
                    "target_attribute": "alt",
                    "new_value": "Scientists observing solar eclipse with specialized equipment",
                    "priority": 9,
                    "wcag_criteria": ["1.1.1"],
                    "reasoning": "Images must have meaningful alternative text for screen readers"
                }
            },
            {
                "scenario": "Navigation without landmarks",
                "modification": {
                    "element_selector": "nav.main-navigation",
                    "modification_type": "add_role",
                    "action": "setAttribute",
                    "target_attribute": "role",
                    "new_value": "navigation",
                    "priority": 8,
                    "wcag_criteria": ["2.4.1"],
                    "reasoning": "Navigation landmarks help screen reader users orient and navigate"
                }
            }
        ]

class ChainOfThoughtPrompting:
    """Implementa Chain-of-Thought para raciocínio complexo"""
    
    @staticmethod
    def create_cot_prompt(task: str, context: str) -> str:
        return f"""
Let's approach this step by step:

Task: {task}
Context: {context}

Step 1: Understanding the Problem
First, I need to analyze what accessibility challenges are present and what the user is trying to achieve.

Step 2: Identifying Solutions
Next, I'll consider various approaches to address each issue, weighing their effectiveness and implementation complexity.

Step 3: Prioritizing Actions
I'll prioritize solutions based on:
- WCAG compliance level (A, AA, AAA)
- Impact on user experience
- Technical feasibility
- User's specific accessibility needs

Step 4: Creating Implementation Plan
Finally, I'll create a concrete plan with specific modifications and their expected outcomes.

Let me work through this systematically:
"""

class ReActPrompting:
    """Implementa ReAct (Reasoning + Acting) para execução de tarefas"""
    
    @staticmethod
    def create_react_prompt(observation: str, previous_actions: List[str]) -> str:
        action_history = "\n".join([f"Action {i+1}: {action}" for i, action in enumerate(previous_actions)])
        
        return f"""
Current Observation: {observation}

Previous Actions Taken:
{action_history}

Now I need to:
1. **Think**: Analyze the current state and what I observe
2. **Act**: Decide on the next action to take
3. **Observe**: Note the results of my action

Thought: Let me analyze what I can see in the current page state...

Action: I will [specific action to take]

Expected Outcome: [what should happen after this action]
"""

class PromptOptimizer:
    """Otimiza prompts baseado em performance histórica"""
    
    def __init__(self):
        self.performance_metrics = {}
        self.a_b_tests = {}
    
    async def optimize_prompt_performance(
        self,
        prompt_type: PromptType,
        base_prompt: str,
        test_variations: List[str],
        evaluation_criteria: Dict[str, float]
    ) -> str:
        """
        Testa variações de prompt e retorna o melhor performer
        """
        results = {}
        
        # Testar prompt base
        base_score = await self._evaluate_prompt(base_prompt, evaluation_criteria)
        results["base"] = base_score
        
        # Testar variações
        for i, variation in enumerate(test_variations):
            variation_score = await self._evaluate_prompt(variation, evaluation_criteria)
            results[f"variation_{i}"] = variation_score
        
        # Encontrar melhor prompt
        best_prompt_key = max(results.keys(), key=lambda k: results[k])
        
        if best_prompt_key == "base":
            return base_prompt
        else:
            variation_index = int(best_prompt_key.split("_")[1])
            return test_variations[variation_index]
    
    async def _evaluate_prompt(
        self, 
        prompt: str, 
        criteria: Dict[str, float]
    ) -> float:
        """
        Avalia qualidade de um prompt baseado em critérios específicos
        """
        # Implementaria métricas como:
        # - Precisão das respostas
        # - Tempo de resposta
        # - Uso de tokens
        # - Satisfação do usuário
        
        # Por ora, retorna score simulado
        import random
        return random.uniform(0.7, 0.95)

# Exemplo de uso das técnicas avançadas
class AccessibilityAIOrchestrator:
    """Orquestra diferentes técnicas de IA para análise completa"""
    
    def __init__(self):
        self.token_manager = TokenManager("gpt-4-turbo")
        self.prompt_manager = PromptManager(self.token_manager)
        self.cot_prompting = ChainOfThoughtPrompting()
        self.react_prompting = ReActPrompting()
        self.optimizer = PromptOptimizer()
    
    async def analyze_page_with_advanced_ai(
        self,
        page_data: Dict[str, Any],
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Análise completa usando múltiplas técnicas de IA
        """
        
        # 1. Análise visual inicial com Chain-of-Thought
        visual_prompt, config = self.prompt_manager.build_optimized_prompt(
            PromptType.VISUAL_ANALYSIS,
            {
                "dom_summary": page_data["dom_summary"],
                "page_url": page_data["url"],
                "viewport_size": page_data["viewport_size"],
                "total_elements": len(page_data["dom_elements"])
            }
        )
        
        cot_visual_prompt = self.cot_prompting.create_cot_prompt(
            "Analyze webpage accessibility",
            visual_prompt
        )
        
        # 2. Gerar modificações usando prompting otimizado
        scene_graph = await self._call_llm(cot_visual_prompt, config)
        
        modification_prompt, mod_config = self.prompt_manager.build_optimized_prompt(
            PromptType.ACCESSIBILITY_MODIFICATION,
            {
                "scene_graph": scene_graph,
                "accessibility_issues": page_data.get("issues", []),
                "user_needs": user_context.get("accessibility_needs", [])
            }
        )
        
        modifications = await self._call_llm(modification_prompt, mod_config)
        
        # 3. Se há interação do usuário, usar ReAct
        if user_context.get("user_command"):
            react_prompt = self.react_prompting.create_react_prompt(
                scene_graph,
                user_context.get("previous_actions", [])
            )
            
            action_plan = await self._call_llm(react_prompt, {"max_tokens": 1000})
            
            return {
                "scene_graph": scene_graph,
                "modifications": modifications,
                "action_plan": action_plan,
                "processing_strategy": "advanced_multi_technique"
            }
        
        return {
            "scene_graph": scene_graph,
            "modifications": modifications,
            "processing_strategy": "cot_optimized"
        }
    
    async def _call_llm(self, prompt: str, config: Dict) -> Dict:
        """Placeholder para chamada do LLM"""
        # Implementaria chamada real para OpenAI/Anthropic
        return {"placeholder": "response"}

# Estratégias de Cache Inteligente
class IntelligentCache:
    """Cache inteligente que considera contexto e similaridade semântica"""
    
    def __init__(self, vector_store):
        self.vector_store = vector_store
        self.cache_hits = 0
        self.cache_misses = 0
    
    async def get_similar_analysis(
        self, 
        page_signature: str,
        similarity_threshold: float = 0.85
    ) -> Optional[Dict]:
        """
        Busca análises similares no cache vetorial
        """
        similar_results = await self.vector_store.search(
            query_vector=self._create_page_vector(page_signature),
            limit=1,
            score_threshold=similarity_threshold
        )
        
        if similar_results:
            self.cache_hits += 1
            return similar_results[0]
        
        self.cache_misses += 1
        return None
    
    def _create_page_vector(self, page_signature: str) -> List[float]:
        """Cria vetor representativo da página"""
        # Implementaria embedding da página
        return [0.1] * 1536  # Placeholder para dimensão OpenAI