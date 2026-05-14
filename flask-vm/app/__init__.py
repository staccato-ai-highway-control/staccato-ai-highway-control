from flask import Flask
from app.config import Config
from app.extensions import init_extensions
from app.modules.auth.routes import auth_bp
from app.modules.incident.routes import incident_bp
from app.modules.report_upload.routes import report_upload_bp
from app.modules.llm_gateway.routes import llm_gateway_bp
from app.modules.chatbot.routes import chatbot_bp
from app.modules.chat.routes import chat_bp
from app.routes.health_routes import health_bp
# 본인이 추가한 리포트 블루프린트 (다른 사람 코드는 그대로 유지)
from app.api.report_routes import report_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    init_extensions(app)
    
    # 기존 블루프린트 등록 (다른 팀원들의 작업물)
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(incident_bp)
    app.register_blueprint(report_upload_bp)
    app.register_blueprint(llm_gateway_bp)
    app.register_blueprint(chatbot_bp)
    app.register_blueprint(chat_bp)
    
    # 본인이 작업한 새로운 리포트 라우트 등록 (내 브랜치 작업분)
    app.register_blueprint(report_bp)
    
    return app