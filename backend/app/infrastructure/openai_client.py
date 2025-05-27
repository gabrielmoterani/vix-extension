from openai import OpenAI
from app.api.analysis.schemas import PageDataRequest
from app.core.config import settings
import json


def build_prompt(html: str, image_url: str | None = None) -> str:
    prompt = (
        "Você é um especialista em acessibilidade web.\n"
        "Seu trabalho é analisar o HTML da página abaixo e sugerir textos alternativos para as imagens (`<img>`) que não possuem o atributo `alt` preenchido.\n"
        "Para cada imagem encontrada, gere um seletor CSS simples baseado no `src` e retorne uma sugestão de `alt`.\n"
        "Use o seguinte formato de resposta JSON:\n"
        '[\n'
        '  {\n'
        '    "selector": "img[src*=\'logo.png\']",\n'
        '    "alt": "Logo da empresa com fundo branco"\n'
        '  },\n'
        '  ...\n'
        ']\n\n'
    )

    if image_url:
        prompt += f"A screenshot da página está disponível aqui: {image_url}\n"

    prompt += f"HTML:\n{html[:5000]}"  # limite de segurança

    return prompt


def ask_accessibility_suggestions(data: PageDataRequest, image_url: str = "") -> list[dict]:
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    prompt = build_prompt(data.html, image_url)

    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "Você é um assistente de acessibilidade web."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2,
        max_tokens=1000
    )

    content = response.choices[0].message.content.strip()
    try:
        return json.loads(content)
    except Exception as e:
        print("[ERROR] JSON inválido da IA:", e)
        return []
