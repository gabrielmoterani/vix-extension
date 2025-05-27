from app.api.analysis.schemas import AltTextSuggestion, PageDataRequest, AccessibilitySuggestions
from app.infrastructure.openai_client import ask_accessibility_suggestions
from app.infrastructure.storage_service import save_screenshot_base64


def generate_stub_suggestions(_: PageDataRequest) -> AccessibilitySuggestions:
    return AccessibilitySuggestions(
        altTexts={
            "logo.png": "Logo da empresa",
            "banner.jpg": "Banner promocional"
        }
    )

def generate_ai_suggestions(data: PageDataRequest) -> AccessibilitySuggestions:
    image_url = save_screenshot_base64(data.screenshot)
    raw = ask_accessibility_suggestions(data, image_url=image_url)

    suggestions = [
        AltTextSuggestion(selector=item["selector"], alt=item["alt"])
        for item in raw if "selector" in item and "alt" in item
    ]

    return AccessibilitySuggestions(suggestions=suggestions)
