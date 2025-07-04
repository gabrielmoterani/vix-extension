from openai import OpenAI
from config import Config
import json

class OpenAIRepository:
    def __init__(self):
        # Initialize the OpenAI client with API key
        self.client = OpenAI(api_key=Config.OPENAI_API_KEY)

    def process_image(self, prompt: any, model: str = "gpt-4o-mini") -> str:
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a system that analyzes web images and generates alt text for them."},
                    {"role": "system", "content": "You will be given the page summary so you can generate the alt text based on the content of the page."},
                    {"role": "user", "content": prompt['summary']},
                    {"role": "system", "content": "You will be given the url of the image, so you can generate the alt text based on the content of the page."},
                    {"role": "user", "content": prompt['imageUrl']},
                    {"role": "system", "content": "Generate a concise, descriptive alt text for this image, WCAG compliant. Focus on the main subject, important details, and context. The alt text should be helpful for visually impaired users."},
                ]
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error calling OpenAI API: {prompt}")
            return f"Error processing prompt: {str(prompt)}"
        
    def process_summary(self, prompt: str, model: str = "gpt-4o-mini") -> str:
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a system that summarizes web pages, you will be given a string with all extracted texts from the page and you will need to summarize it in a few sentences."},
                    {"role": "user", "content": prompt},
                    {"role": "system", "content": "Generate a concise, descriptive summary for this page, remeber to describe the page and not only the content. The summary should be helpful for visually impaired users. Text should be only a small paragraph."},
                ],
            )
            return response.choices[0].message.content
        except Exception as e:  
            print(f"Error calling MODEL {model} API: {e}")
            return f"Error processing summary: {str(e)}"

    def process_wcag_check(self, prompt: str, model: str = "gpt-4o") -> str:
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a system that checks web pages for WCAG and ARIA compliance, you will be given a json represatation of the DOM elements on the page"},
                    {"role": "user", "content": prompt},
                    {"role": "system", "content": "You will need to check the page for WCAG and ARIA compliance. Return a json with the array of elements that are not WCAG compliant and the tags to make them compliant, ignore ALT tags."},
                    {"role": "system", "content": "Return a JSON with the following format: {'elements': [{'id': 'string', 'addAttributes': [{'attributeName': 'string', 'value': 'string'}]}]}. The id is the id of the element, the addAttributes is an array of attributes and values to add to the element to make it compliant."},
                    {"role": "system", "content": "Return a JSON and only the JSON, no other text or comments."}
                ],
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error calling OpenAI Vision API: {e}")
            return f"Error processing image: {str(e)}"
            
    def process_page_task(self, html_content: str, task_prompt: str, page_summary: str, model: str = "gpt-4o-mini") -> str:
        """
        Processa uma tarefa na página usando OpenAI
        
        Args:
            html_content: JSON string contendo elementos interativos da página
            task_prompt: Instrução do usuário sobre o que fazer
            page_summary: Resumo do conteúdo da página
            model: Modelo OpenAI a ser usado
            
        Returns:
            JSON string com explicação e comandos JavaScript
        """
        try:
            # Parse do html_content se for string
            if isinstance(html_content, str):
                try:
                    actions_data = json.loads(html_content)
                except json.JSONDecodeError:
                    actions_data = html_content
            else:
                actions_data = html_content
            
            # Criar prompt estruturado
            system_prompt = """Você é um assistente de IA que ajuda usuários a interagir com páginas web.

CONTEXTO:
- Você receberá elementos interativos da página (botões, links, campos de entrada)
- Cada elemento tem um ID único (data-vix) para seleção
- Você deve gerar comandos JavaScript para executar a tarefa solicitada

REGRAS IMPORTANTES:
1. Use sempre o seletor: document.querySelector('[data-vix="ID_DO_ELEMENTO"]')
2. Para CLICAR: use .click() em elementos com isClickable=true ou tag="button"/"a"
3. Para PREENCHER TEXTO: use .value="texto" em elementos com isInput=true (input/textarea/select)
4. Para ALTERAR TEXTO: use .innerText="texto" apenas em elementos de exibição (não inputs)
5. NUNCA use .innerText em inputs - sempre use .value
6. Analise o elementType para escolher a ação correta:
   - input[text], input[email], textarea: use .value = "texto"
   - button, a: use .click()
   - label, span, div: use .innerText = "texto" (apenas para exibição)

SELEÇÃO DE ELEMENTOS:
- Prefira elementos com isInput=true para campos de entrada
- Prefira elementos com isClickable=true para ações de click
- Use placeholder, ariaLabel, name para identificar campos corretos
- Ignore labels ao procurar campos - procure pelos inputs diretos

FORMATO DE RESPOSTA:
{
  "explanation": "Explicação amigável do que será feito",
  "js_commands": ["comando1", "comando2", ...]
}"""

            user_prompt = f"""ELEMENTOS INTERATIVOS DA PÁGINA:
{json.dumps(actions_data, indent=2)}

RESUMO DA PÁGINA:
{page_summary}

TAREFA SOLICITADA:
{task_prompt}

Analise os elementos disponíveis e gere os comandos JavaScript necessários para completar a tarefa."""

            print("#TODEBUG: Enviando para OpenAI:")
            print(f"#TODEBUG: Actions data: {json.dumps(actions_data[:3], indent=2) if len(actions_data) > 3 else json.dumps(actions_data, indent=2)}")
            print(f"#TODEBUG: Task prompt: {task_prompt}")
            print(f"#TODEBUG: Page summary length: {len(page_summary)}")

            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,  # Baixa temperatura para respostas mais consistentes
                max_tokens=1000
            )
            
            result = response.choices[0].message.content
            print(f"#TODEBUG: Resposta bruta da OpenAI: {result}")
            
            # Verificar se a resposta é um JSON válido
            try:
                parsed_result = json.loads(result)
                print(f"#TODEBUG: JSON parseado com sucesso: {json.dumps(parsed_result, indent=2)}")
                return result
            except json.JSONDecodeError as e:
                print(f"#TODEBUG: ERRO - Resposta não é JSON válido: {e}")
                print(f"#TODEBUG: Conteúdo problemático: {result}")
                # Se não for JSON válido, criar resposta de erro estruturada
                error_response = {
                    "explanation": f"Erro ao processar a tarefa: {result}",
                    "js_commands": []
                }
                return json.dumps(error_response)
                
        except Exception as e:
            print(f"Error processing page task: {e}")
            error_response = {
                "explanation": f"Erro interno ao processar a tarefa: {str(e)}",
                "js_commands": []
            }
            return json.dumps(error_response)