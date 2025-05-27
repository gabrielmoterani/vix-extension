from abc import ABC, abstractmethod
from typing import Tuple, List, Dict
import base64

from src.domain.vli.models import SceneGraph

class VisionModelPort(ABC):
    @abstractmethod
    async def analyze_screenshot(
        self, 
        image_data: bytes, 
        dom_context: str
    ) -> SceneGraph:
        pass

class VisualLayoutInterpreter:
    def __init__(self, vision_model: VisionModelPort):
        self.vision_model = vision_model
    
    async def interpret_page(
        self, 
        screenshot: str,  # base64
        dom_elements: List[Dict],
        viewport_size: Tuple[int, int]
    ) -> SceneGraph:
        """
        Analisa screenshot + DOM para criar um grafo de cena semântico
        """
        # Decode screenshot
        image_data = base64.b64decode(screenshot)
        
        # Create DOM context string (optimized for tokens)
        dom_context = self._create_dom_context(dom_elements, viewport_size)
        
        # Analyze with vision model
        scene_graph = await self.vision_model.analyze_screenshot(
            image_data, 
            dom_context
        )
        
        # Post-process and validate
        return self._validate_scene_graph(scene_graph)
    
    def _create_dom_context(
        self, 
        dom_elements: List[Dict], 
        viewport_size: Tuple[int, int]
    ) -> str:
        """
        Cria contexto DOM otimizado para LLM (máximo 2000 tokens)
        """
        important_elements = []
        
        for element in dom_elements:
            # Filter by importance and visibility
            if self._is_important_element(element):
                simplified = {
                    'tag': element.get('tagName', ''),
                    'text': element.get('textContent', '')[:100],
                    'role': element.get('role'),
                    'bounds': element.get('boundingRect')
                }
                important_elements.append(simplified)
        
        # Limit to most important elements to stay under token limit
        return str(important_elements[:50])
    
    def _is_important_element(self, element: Dict) -> bool:
        """
        Determina se um elemento DOM é importante para análise
        """
        important_tags = {
            'h1', 'h2', 'h3', 'button', 'a', 'input', 
            'select', 'textarea', 'img', 'nav', 'main', 'section'
        }
        
        tag_name = element.get('tagName', '').lower()
        has_text = bool(element.get('textContent', '').strip())
        has_role = bool(element.get('role'))
        is_visible = element.get('isVisible', True)
        
        return (
            tag_name in important_tags or 
            has_role or 
            (has_text and len(element.get('textContent', '')) > 10)
        ) and is_visible