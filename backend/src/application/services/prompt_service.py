from src.domain.models.prompt import Prompt
from src.infrastructure.repositories.openai_repository import OpenAIRepository

class PromptService:
    def __init__(self):
        self.openai_repo = OpenAIRepository()

    def parse_image(self, content: dict) -> Prompt:
        prompt = Prompt(prompt_type="parse_image", content=content)
        prompt.response = self.openai_repo.process_image(content)
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
        prompt = Prompt(prompt_type="page_task", content={
            "html_content": html_content,
            "task_prompt": task_prompt,
            "page_summary": page_summary
        })
        prompt.response = self.openai_repo.process_page_task(
            html_content=html_content,
            task_prompt=task_prompt,
            page_summary=page_summary
        )
        return prompt