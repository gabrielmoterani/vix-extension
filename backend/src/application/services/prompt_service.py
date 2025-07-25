from src.domain.models.prompt import Prompt
from src.infrastructure.repositories.openai_repository import OpenAIRepository


class PromptService:
    def __init__(self):
        self.openai_repo = OpenAIRepository()

    def parse_image(self, content: dict) -> Prompt:
        prompt = Prompt(prompt_type="parse_image", content=content)
        result = self.openai_repo.process_image(content)
        
        # Se result for um dicionário (nova estrutura), manter como está
        # Se for string (resposta de erro ou formato antigo), converter para nova estrutura
        if isinstance(result, dict):
            prompt.response = result
        else:
            prompt.response = {
                'originalAlt': content.get('originalAlt'),
                'generatedAlt': result
            }
        return prompt

    def wcag_check(self, content: str) -> Prompt:
        prompt = Prompt(prompt_type="wcag_check", content=content)
        prompt.response = self.openai_repo.process_wcag_check(content)
        return prompt

    def summarize_page(self, content: str) -> Prompt:
        prompt = Prompt(prompt_type="summarize_page", content=content)
        prompt.response = self.openai_repo.process_summary(content)
        return prompt

    def execute_page_task(self, html_content: str, task_prompt: str, page_summary: str) -> Prompt:
        """
        Executa uma tarefa na página usando OpenAI
        
        Args:
            html_content: Lista de elementos interativos da página (JSON)
            task_prompt: Instrução do usuário sobre o que fazer
            page_summary: Resumo do conteúdo da página
            
        Returns:
            Prompt com resposta contendo explanation e js_commands
        """
        print('VIX: Executando tarefa na página - elementos:', len(html_content) if isinstance(html_content, list) else 'não é lista')
        
        # Criar prompt com dados estruturados
        prompt = Prompt(prompt_type="page_task", content={
            "html_content": html_content,
            "task_prompt": task_prompt,
            "page_summary": page_summary
        })
        
        # Processar através do repositório OpenAI
        prompt.response = self.openai_repo.process_page_task(
            html_content=html_content,
            task_prompt=task_prompt,
            page_summary=page_summary
        )
        
        print('VIX: Tarefa processada, resposta:', str(prompt.response)[:100] + '...' if len(str(prompt.response)) > 100 else str(prompt.response))
        return prompt