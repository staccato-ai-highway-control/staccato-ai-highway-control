from flask import Flask, send_from_directory, abort

# ============================================================
# Core / App Config
# - 담당: 공통 백엔드
# - 주의: Config, extensions 관련 import만 관리
# ============================================================
from app.config import Config
from app.extensions import init_extensions
from app.utils.api_errors import register_api_error_handlers





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
from app.modules.replay import replay_bp
from app.modules.resources import resources_bp





# ============================================================
# ============================================================
# 최종 MVP 범위에서 제외되었으므로 관련 blueprint import/register는 비활성화합니다.
# 관련 모듈과 DB 테이블은 보존하고 API 노출만 차단합니다.
# ============================================================
# - 담당: 사고 질의응답 챗봇
# ============================================================
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
    app.register_blueprint(replay_bp)
    app.register_blueprint(resources_bp)









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
    register_api_error_handlers(app)

    # Register Socket.IO event handlers.
    from app.modules import socketio as socketio_module  # noqa: F401

    _register_report_created_realtime_hook(app)

    @app.route("/storage/<path:filename>", methods=["GET", "HEAD"])
    def serve_storage_file(filename):
        """Serve local storage files such as generated incident media."""
        from pathlib import Path

        storage_roots = []

        configured_storage_root = app.config.get("STORAGE_ROOT")
        if configured_storage_root:
            storage_roots.append(Path(configured_storage_root))

        storage_roots.extend([
            Path(app.root_path).parent / "storage",
            Path("/home/staccato/staccato/storage"),
            Path("/home/staccato/staccato-flask/storage"),
        ])

        for storage_root in storage_roots:
            root = storage_root.resolve()
            target_path = (root / filename).resolve()

            try:
                target_path.relative_to(root)
            except ValueError:
                continue

            if target_path.exists() and target_path.is_file():
                return send_from_directory(root, filename)

        abort(404)

    return app



def _register_report_created_realtime_hook(app):
    if getattr(app, "_report_created_realtime_hook_registered", False):
        return

    app._report_created_realtime_hook_registered = True

    @app.after_request
    def _emit_report_created_after_request(response):
        from datetime import datetime
        from flask import request

        if request.method != "POST":
            return response

        if request.path.rstrip("/") != "/api/reports":
            return response

        if response.status_code != 201:
            return response

        try:
            body = response.get_json(silent=True) or {}
            data = body.get("data") if isinstance(body.get("data"), dict) else {}
            report = body.get("report") if isinstance(body.get("report"), dict) else {}

            report_id = (
                body.get("report_id")
                or body.get("id")
                or data.get("report_id")
                or data.get("id")
                or report.get("report_id")
                or report.get("id")
            )

            if not report_id:
                return response

            created_at = (
                body.get("created_at")
                or data.get("created_at")
                or report.get("created_at")
                or datetime.utcnow().replace(microsecond=0).isoformat()
            )

            title = (
                body.get("title")
                or data.get("title")
                or report.get("title")
                or "새 신고가 등록되었습니다."
            )

            payload = {
                "realtime_event_id": f"report-{report_id}",
                "id": f"report-{report_id}",
                "event_type": "REPORT_CREATED",
                "severity": "INFO",
                "incident_status": "REPORTED",
                "incident_id": report_id,
                "incident_code": f"REPORT-{report_id}",
                "report_id": report_id,
                "message": title,
                "created_at": created_at,
                "occurred_at": created_at,
            }

            from app.extensions import db
            from app.models import RealtimeEvent

            realtime_event = RealtimeEvent(
                event_type="REPORT_CREATED",
                event_name="incident.created",
                target_resource_type="report",
                target_resource_id=int(report_id),
                incident_id=None,
                payload=payload,
                send_status="SENT",
                error_message=None,
                created_at=datetime.utcnow(),
                sent_at=datetime.utcnow(),
            )
            db.session.add(realtime_event)
            db.session.commit()

            from app.modules.socketio.emitters import (
                emit_incident_created,
                emit_report_created,
            )

            emit_incident_created(payload)
            emit_report_created(payload)

        except Exception:
            app.logger.exception("Failed to emit report.created after POST /api/reports")

        return response
