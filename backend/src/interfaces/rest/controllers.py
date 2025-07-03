from flask import Blueprint, request, jsonify
from src.application.services.prompt_service import PromptService

api_blueprint = Blueprint('api', __name__)
prompt_service = PromptService()

@api_blueprint.route('/parse_image', methods=['POST'])
def parse_image():
    data = request.json
    content = data.get('content')
    if not content:
        return jsonify({'error': 'No content provided'}), 400
    result = prompt_service.parse_image(content)
    return jsonify({'response': result.response})

@api_blueprint.route('/wcag_check', methods=['POST'])
def wcag_check():
    data = request.json
    content = data.get('content')
    if not content:
        return jsonify({'error': 'No content provided',}), 400
    result = prompt_service.wcag_check(content)
    return jsonify({'response': result.response})

@api_blueprint.route('/summarize_page', methods=['POST'])
def summarize_page():
    data = request.json
    content = data.get('content')
    if not content:
        return jsonify({'error': 'No content provided', 'content': content}), 400
    
    result = prompt_service.summarize_page(content)
    return jsonify({'response': result.response})

@api_blueprint.route('/execute_page_task', methods=['POST'])
def execute_page_task():
    data = request.json
    html_content = data.get('html_content')
    task_prompt = data.get('task_prompt')
    page_summary = data.get('page_summary')
    
    if not html_content:
        return jsonify({'error': 'No HTML content provided'}), 400
    
    if not task_prompt:
        return jsonify({'error': 'No task prompt provided'}), 400
    
    if not page_summary:
        return jsonify({'error': 'No page summary provided'}), 400
    
    result = prompt_service.execute_page_task(
        html_content=html_content,
        task_prompt=task_prompt,
        page_summary=page_summary
    )
    
    return jsonify({'response': result.response})