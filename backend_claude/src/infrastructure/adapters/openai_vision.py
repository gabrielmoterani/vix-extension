import base64
from openai import AsyncOpenAI
import json
from typing import Dict, Any
from src.domain.vli.services import VisionModelPort
from src.domain.vli.models import SceneGraph


class OpenAIVisionAdapter(VisionModelPort):
    def __init__(self, api_key: str, model: str = "gpt-4-vision-preview"):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model
    
    async def analyze_screenshot(
        self, 
        image_data: bytes, 
        dom_context: str
    ) -> SceneGraph:
        """
        Usa GPT-4V para analisar screenshot e criar scene graph
        """
        prompt = self._create_analysis_prompt(dom_context)
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64.b64encode(image_data).decode()}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=2000,
                temperature=0.1
            )
            
            # Parse JSON response
            content = response.choices[0].message.content
            scene_data = json.loads(content)
            
            return self._convert_to_scene_graph(scene_data)
            
        except Exception as e:
            # Fallback to basic analysis
            return self._create_fallback_scene_graph(dom_context)
    
    def _create_analysis_prompt(self, dom_context: str) -> str:
        return f"""
        Analyze this webpage screenshot and DOM context to create a semantic scene graph.
        
        DOM Context: {dom_context}
        
        Return a JSON with this structure:
        {{
            "page_title": "string",
            "main_sections": [
                {{
                    "id": "unique_id",
                    "type": "header|main|navigation|sidebar|footer",
                    "bbox": {{"x": 0, "y": 0, "width": 0, "height": 0}},
                    "semantic_role": "banner|navigation|main|complementary|contentinfo",
                    "confidence": 0.95,
                    "description": "semantic description"
                }}
            ],
            "interactive_elements": [...],
            "media_elements": [...]
        }}
        
        Focus on accessibility semantic roles and clear element boundaries.
        """