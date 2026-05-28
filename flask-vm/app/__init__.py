from flask import Flask
from app.modules.chat.routes import chat_bp

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
from app.modules.ai_relay.routes import ai_relay_bp





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
from app.modules.incident_event.routes import incident_event_bp
from app.modules.realtime.routes import realtime_bp





# ============================================================
# Report Upload Module
# - 담당: 신고/영상·이미지 업로드
# - 파일 위치: app/modules/report_upload/
# ============================================================
from app.modules.report_upload.routes import report_upload_bp
from app.modules.location_search.routes import location_search_bp
from app.modules.cctv.routes import cctv_bp
from app.modules.bug_report import bug_report_bp
<<<<<<< HEAD
from app.modules.replay import replay_bp
=======
>>>>>>> origin/develop





# ============================================================
# ============================================================
# 최종 MVP 범위에서 제외되었으므로 관련 blueprint import/register는 비활성화합니다.
# 관련 모듈과 DB 테이블은 보존하고 API 노출만 차단합니다.
# ============================================================
# - 담당: 사고 질의응답 챗봇
# ============================================================
# ============================================================
# Chat Module
# - 담당: 사고 대응 채팅
# - 파일 위치: app/modules/chat/
# ============================================================
from app.modules.frontend_config.routes import frontend_config_bp





# ============================================================
# Dashboard Module
# - 담당: 대시보드 최소 요약
# - 파일 위치: app/modules/dashboard/
# ============================================================
from app.modules.dashboard import dashboard_bp





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
    app.register_blueprint(ai_relay_bp)
    app.register_blueprint(chat_bp)










    # ========================================================
    # Auth / Account
    # ========================================================
    app.register_blueprint(auth_bp)









    # ========================================================
    # Incident / Report
    # ========================================================
    app.register_blueprint(incident_bp)
    app.register_blueprint(incident_event_bp)
    app.register_blueprint(realtime_bp)
    app.register_blueprint(report_upload_bp)
    app.register_blueprint(location_search_bp)
    app.register_blueprint(cctv_bp)
    app.register_blueprint(bug_report_bp)
<<<<<<< HEAD
    app.register_blueprint(replay_bp)
=======
>>>>>>> origin/develop









    # ========================================================
    # ========================================================
    app.register_blueprint(frontend_config_bp)
    app.register_blueprint(dashboard_bp)












    # ========================================================
    # board
    # ========================================================
    app.register_blueprint(board_bp)










def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_object(Config)

    if test_config is not None:
        app.config.update(test_config)

    init_extensions(app)

    register_blueprints(app)

    # Register Socket.IO event handlers.
    from app.modules import socketio as socketio_module  # noqa: F401

    return app
