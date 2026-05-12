from flask import Flask

from app.config import Config
from app.extensions import init_extensions
from app.modules.auth.routes import auth_bp
from app.routes.health_routes import health_bp
from app.modules.llm_gateway.routes import llm_gateway_bp
from app.modules.chatbot.routes import chatbot_bp
from app.modules.chat.routes import chat_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    init_extensions(app)

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(llm_gateway_bp)
    app.register_blueprint(chatbot_bp)
    app.register_blueprint(chat_bp)

    return app
