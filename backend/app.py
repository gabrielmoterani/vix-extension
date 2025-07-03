from flask import Flask
from flask_cors import CORS
from src.interfaces.rest.controllers import api_blueprint
from config import Config

def create_app():
    app = Flask(__name__)
    CORS(app)
    app.config.from_object(Config)
    
    # Register blueprints
    app.register_blueprint(api_blueprint, url_prefix='/api')
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=Config.DEBUG, port=Config.PORT, host='0.0.0.0') 