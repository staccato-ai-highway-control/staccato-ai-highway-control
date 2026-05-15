from flask import Flask

# ============================================================
# Core / App Config
# - 담당: 공통 백엔드
# - 주의: Config, extensions 관련 import만 관리
# ============================================================
from app.config import Config
from app.extensions import init_extensions





# ============================================================
# Common Routes
# - 담당: 공통 백엔드
# - 예: health check
# ============================================================
from app.modules.health.routes import health_bp





# ============================================================
# Auth Module
# - 담당: 인증/회원가입/마이페이지
# - 파일 위치: app/modules/auth/
# ============================================================
from app.modules.auth.routes import auth_bp





# ============================================================
# Incident Module
# - 담당: 이상상황/사고 관리
# - 파일 위치: app/modules/incident/
# ============================================================
from app.modules.incident.routes import incident_bp





# ============================================================
# Report Upload Module
# - 담당: 신고/영상·이미지 업로드
# - 파일 위치: app/modules/report_upload/
# ============================================================
from app.modules.report_upload.routes import report_upload_bp





# ============================================================
# LLM Gateway Module
# - 담당: Flask ↔ LLM 서버 연동
# - 파일 위치: app/modules/llm_gateway/
# ============================================================
from app.modules.llm_gateway.routes import llm_gateway_bp





# ============================================================
# Chatbot Module
# - 담당: 사고 질의응답 챗봇
# - 파일 위치: app/modules/chatbot/
# ============================================================
from app.modules.chatbot.routes import chatbot_bp





# ============================================================
# Chat Module
# - 담당: 사고 대응 채팅
# - 파일 위치: app/modules/chat/
# ============================================================
from app.modules.chat.routes import chat_bp
from app.modules.frontend_config.routes import frontend_config_bp





# ============================================================
# Board Module
# - 담당: 관리자 게시판
# - 파일 위치: app/modules/board/
# ============================================================
from app.modules.board.routes import board_bp





def register_blueprints(app):
    """Register Flask blueprints by module.

    신규 모듈 추가 시 아래 구역에만 blueprint를 등록한다.
    기존 모듈의 등록 순서는 특별한 이유 없이 변경하지 않는다.
    """

    # ========================================================
    # Common
    # ========================================================
    app.register_blueprint(health_bp)










    # ========================================================
    # Auth / Account
    # ========================================================
    app.register_blueprint(auth_bp)









    # ========================================================
    # Incident / Report
    # ========================================================
    app.register_blueprint(incident_bp)
    app.register_blueprint(report_upload_bp)









    # ========================================================
    # LLM / Chatbot / Chat
    # ========================================================
    app.register_blueprint(llm_gateway_bp)
    app.register_blueprint(chatbot_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(frontend_config_bp)












    # ========================================================
    # board
    # ========================================================
    app.register_blueprint(board_bp)










def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    init_extensions(app)

    register_blueprints(app)

    return app
