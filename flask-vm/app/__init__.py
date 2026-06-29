"""Flask 애플리케이션 팩토리와 전체 Blueprint 등록을 담당한다.

설정, 확장 모듈, 데이터베이스 모델, 실시간 이벤트 훅을 한곳에서 조립한다."""

# 설명: flask에서 Flask, send_from_directory, abort 이름을 가져와 아래 로직에서 재사용한다.
from flask import Flask, send_from_directory, abort

# ============================================================
# Core / App Config
# - 담당: 공통 백엔드
# - 주의: Config, extensions 관련 import만 관리
# ============================================================
from app.config import Config
# 설명: app.extensions에서 init_extensions 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import init_extensions
# 설명: app.utils.api_errors에서 register_api_error_handlers 이름을 가져와 아래 로직에서 재사용한다.
from app.utils.api_errors import register_api_error_handlers





# ============================================================
# Common Routes
# - 담당: 공통 백엔드
# - 예: health check
# ============================================================
from app.modules.health.routes import health_bp
# 설명: app.modules.ai_relay.routes에서 ai_relay_bp 이름을 가져와 아래 로직에서 재사용한다.
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
# 설명: app.modules.realtime.routes에서 realtime_bp 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.realtime.routes import realtime_bp





# ============================================================
# Report Upload Module
# - 담당: 신고/영상·이미지 업로드
# - 파일 위치: app/modules/report_upload/
# ============================================================
from app.modules.report_upload.routes import report_upload_bp
from app.modules.report_model_comparison.routes import report_model_comparison_bp
# 설명: app.modules.location_search.routes에서 location_search_bp 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.location_search.routes import location_search_bp
# 설명: app.modules.cctv.routes에서 cctv_bp 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.cctv.routes import cctv_bp
# 설명: app.modules.bug_report에서 bug_report_bp 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.bug_report import bug_report_bp
# 설명: app.modules.replay에서 replay_bp 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.replay import replay_bp
# 설명: app.modules.resources에서 resources_bp 이름을 가져와 아래 로직에서 재사용한다.
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





# 설명: `register_blueprints` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def register_blueprints(app):
    """Register Flask blueprints by module.

    신규 모듈 추가 시 아래 구역에만 blueprint를 등록한다.
    기존 모듈의 등록 순서는 특별한 이유 없이 변경하지 않는다.
    """

    # ========================================================
    # Common
    # ========================================================
    app.register_blueprint(health_bp)
    # 설명: `app.register_blueprint`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    app.register_blueprint(ai_relay_bp)










    # ========================================================
    # Auth / Account
    # ========================================================
    app.register_blueprint(auth_bp)









    # ========================================================
    # Incident / Report
    # ========================================================
    app.register_blueprint(incident_bp)
    # 설명: `app.register_blueprint`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    app.register_blueprint(realtime_bp)
    # 설명: `app.register_blueprint`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    app.register_blueprint(report_upload_bp)
    app.register_blueprint(report_model_comparison_bp)
    # 설명: `app.register_blueprint`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    app.register_blueprint(location_search_bp)
    # 설명: `app.register_blueprint`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    app.register_blueprint(cctv_bp)
    # 설명: `app.register_blueprint`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    app.register_blueprint(bug_report_bp)
    # 설명: `app.register_blueprint`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    app.register_blueprint(replay_bp)
    # 설명: `app.register_blueprint`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    app.register_blueprint(resources_bp)









    # ========================================================
    # ========================================================
    app.register_blueprint(frontend_config_bp)
    # 설명: `app.register_blueprint`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    app.register_blueprint(dashboard_bp)












    # ========================================================
    # board
    # ========================================================
    app.register_blueprint(board_bp)










# 설명: `create_app` 함수는 새 데이터나 리소스를 생성하는 함수다.
def create_app(test_config=None):
    # 설명: `app`에 `Flask` 호출 결과를 저장해 다음 처리에서 사용한다.
    app = Flask(__name__)
    # 설명: `app.config.from_object`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    app.config.from_object(Config)

    # 설명: `test_config is not None` 조건 결과에 따라 실행 경로를 분기한다.
    if test_config is not None:
        # 설명: `app.config.update`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        app.config.update(test_config)

    # 설명: `init_extensions`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    init_extensions(app)

    # 설명: `register_blueprints`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    register_blueprints(app)
    # 설명: `register_api_error_handlers`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    register_api_error_handlers(app)

    # Register Socket.IO event handlers.
    from app.modules import socketio as socketio_module  # noqa: F401

    # 설명: `_register_report_created_realtime_hook`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    _register_report_created_realtime_hook(app)

    # 설명: `serve_storage_file` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @app.route("/storage/<path:filename>", methods=["GET", "HEAD"])
    def serve_storage_file(filename):
        """Serve local storage files such as generated incident media."""
        # 설명: pathlib에서 Path 이름을 가져와 아래 로직에서 재사용한다.
        from pathlib import Path

        # 설명: `storage_roots`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        storage_roots = []

        # 설명: `configured_storage_root`에 `app.config.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        configured_storage_root = app.config.get("STORAGE_ROOT")
        # 설명: `configured_storage_root` 조건 결과에 따라 실행 경로를 분기한다.
        if configured_storage_root:
            # 설명: `storage_roots.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
            storage_roots.append(Path(configured_storage_root))

        # 설명: `storage_roots.extend` 호출로 처리 결과를 기존 컬렉션에 누적한다.
        storage_roots.extend([
            Path(app.root_path).parent / "storage",
            Path("/home/staccato/staccato/storage"),
            Path("/home/staccato/staccato-flask/storage"),
        ])

        # 설명: `storage_roots`의 각 항목을 `storage_root`로 받아 반복 처리한다.
        for storage_root in storage_roots:
            # 설명: `root`에 `storage_root.resolve` 호출 결과를 저장해 다음 처리에서 사용한다.
            root = storage_root.resolve()
            # 설명: `target_path`에 `(root / filename).resolve` 호출 결과를 저장해 다음 처리에서 사용한다.
            target_path = (root / filename).resolve()

            # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
            try:
                # 설명: `target_path.relative_to`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                target_path.relative_to(root)
            except ValueError:
                # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
                continue

            # 설명: `target_path.exists() and target_path.is_file()` 조건 결과에 따라 실행 경로를 분기한다.
            if target_path.exists() and target_path.is_file():
                # 설명: 호출자에게 send_from_directory(root, filename) 값을 함수 결과로 반환한다.
                return send_from_directory(root, filename)

        # 설명: `abort`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        abort(404)

    # 설명: 호출자에게 app 값을 함수 결과로 반환한다.
    return app



# 설명: `_register_report_created_realtime_hook` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _register_report_created_realtime_hook(app):
    # 설명: `getattr(app, '_report_created_realtime_hook_registered', False)` 조건 결과에 따라 실행 경로를 분기한다.
    if getattr(app, "_report_created_realtime_hook_registered", False):
        # 설명: 현재 함수의 처리를 종료하고 호출자에게 별도 값을 반환하지 않는다.
        return

    # 설명: `app._report_created_realtime_hook_registered`의 기준값 또는 기본값을 True로 설정한다.
    app._report_created_realtime_hook_registered = True

    # 설명: `_emit_report_created_after_request` 함수는 실시간 이벤트를 클라이언트에 전송하는 함수다.
    @app.after_request
    def _emit_report_created_after_request(response):
        # 설명: datetime에서 datetime 이름을 가져와 아래 로직에서 재사용한다.
        from datetime import datetime
        # 설명: flask에서 request 이름을 가져와 아래 로직에서 재사용한다.
        from flask import request

        # 설명: `request.method != 'POST'` 조건 결과에 따라 실행 경로를 분기한다.
        if request.method != "POST":
            # 설명: 호출자에게 response 값을 함수 결과로 반환한다.
            return response

        # 설명: `request.path.rstrip('/') != '/api/reports'` 조건 결과에 따라 실행 경로를 분기한다.
        if request.path.rstrip("/") != "/api/reports":
            # 설명: 호출자에게 response 값을 함수 결과로 반환한다.
            return response

        # 설명: `response.status_code != 201` 조건 결과에 따라 실행 경로를 분기한다.
        if response.status_code != 201:
            # 설명: 호출자에게 response 값을 함수 결과로 반환한다.
            return response

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `body`에 response.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
            body = response.get_json(silent=True) or {}
            # 설명: `data`에 body.get('data') if isinstance(body.get('data'), dict) else {} 표현식의 계산 결과를 저장한다.
            data = body.get("data") if isinstance(body.get("data"), dict) else {}
            # 설명: `report`에 body.get('report') if isinstance(body.get('report'), dict) else {} 표현식의 계산 결과를 저장한다.
            report = body.get("report") if isinstance(body.get("report"), dict) else {}

            # 설명: `report_id`에 body.get('report_id') or body.get('id') or data.get('report_id') or d... 표현식의 계산 결과를 저장한다.
            report_id = (
                body.get("report_id")
                or body.get("id")
                or data.get("report_id")
                or data.get("id")
                or report.get("report_id")
                or report.get("id")
            )

            # 설명: `not report_id` 조건 결과에 따라 실행 경로를 분기한다.
            if not report_id:
                # 설명: 호출자에게 response 값을 함수 결과로 반환한다.
                return response

            # 설명: `created_at`에 body.get('created_at') or data.get('created_at') or report.get('creat... 표현식의 계산 결과를 저장한다.
            created_at = (
                body.get("created_at")
                or data.get("created_at")
                or report.get("created_at")
                or datetime.utcnow().replace(microsecond=0).isoformat()
            )

            # 설명: `title`에 body.get('title') or data.get('title') or report.get('title') or '새 신... 표현식의 계산 결과를 저장한다.
            title = (
                body.get("title")
                or data.get("title")
                or report.get("title")
                or "새 신고가 등록되었습니다."
            )

            # 설명: `payload`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
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

            # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
            from app.extensions import db
            # 설명: app.models에서 RealtimeEvent 이름을 가져와 아래 로직에서 재사용한다.
            from app.models import RealtimeEvent

            # 설명: `realtime_event`에 `RealtimeEvent` 호출 결과를 저장해 다음 처리에서 사용한다.
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
            # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
            db.session.add(realtime_event)
            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()

            # 설명: app.modules.socketio.emitters에서 emit_incident_created, emit_report_created 이름을 가져와 아래 로직에서 재사용한다.
            from app.modules.socketio.emitters import (
                emit_incident_created,
                emit_report_created,
            )

            # 설명: `emit_incident_created`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            emit_incident_created(payload)
            # 설명: `emit_report_created`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            emit_report_created(payload)

        except Exception:
            # 설명: `app.logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            app.logger.exception("Failed to emit report.created after POST /api/reports")

        # 설명: 호출자에게 response 값을 함수 결과로 반환한다.
        return response
