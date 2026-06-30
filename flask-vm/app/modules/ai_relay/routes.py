"""ai relay 도메인의 HTTP API 엔드포인트를 정의한다.

요청 인증과 입력 변환을 수행한 뒤 서비스 결과를 안정적인 JSON 응답으로 전달한다."""

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations

# 설명: logging 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import logging

# 설명: flask에서 Blueprint, jsonify, request 이름을 가져와 아래 로직에서 재사용한다.
from flask import Blueprint, jsonify, request

# 설명: app.modules.internal_auth에서 require_internal_api_token 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.internal_auth import require_internal_api_token
from app.modules.ai_media.service import has_event_media_access
from app.utils.security import require_auth
# 설명: app.modules.incident_event.service에서 IncidentEventService, IncidentEventValidationError 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.incident_event.service import (
    IncidentEventService,
    IncidentEventValidationError,
)

# 설명: app.extensions에서 db, socketio 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db, socketio
# 설명: app.modules.ai_relay.service에서 RelayValidationError, build_incident_event_payload, build_replay, get_event, list_events, store_event 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.ai_relay.service import (
    RelayValidationError,
    build_incident_event_payload,
    build_replay,
    get_event,
    list_events,
    store_event,
)


# 설명: `logger`에 `logging.getLogger` 호출 결과를 저장해 다음 처리에서 사용한다.
logger = logging.getLogger(__name__)

# 설명: `ai_relay_bp`에 `Blueprint` 호출 결과를 저장해 다음 처리에서 사용한다.
ai_relay_bp = Blueprint("ai_relay", __name__, url_prefix="/api")


# 설명: `create_event` 함수는 새 데이터나 리소스를 생성하는 함수다.
@ai_relay_bp.post("/events")
def create_event():
    # 설명: `auth_error`에 `require_internal_api_token` 호출 결과를 저장해 다음 처리에서 사용한다.
    auth_error = require_internal_api_token()
    # 설명: `auth_error` 조건 결과에 따라 실행 경로를 분기한다.
    if auth_error:
        # 설명: 호출자에게 auth_error 값을 함수 결과로 반환한다.
        return auth_error

    # 설명: `payload`에 `request.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    payload = request.get_json(silent=True)
    # 설명: `payload is None` 조건 결과에 따라 실행 경로를 분기한다.
    if payload is None:
        # 설명: 호출자에게 (jsonify({'ok': False, 'success': False, 'error': 'JSON body is required'}), 400) 값을 함수 결과로 반환한다.
        return jsonify({"ok": False, "success": False, "error": "JSON body is required"}), 400

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `(event, status)`에 `store_event` 호출 결과를 저장해 다음 처리에서 사용한다.
        event, status = store_event(payload, commit=False)
        # 설명: `incident_result`에 `IncidentEventService.create_from_its_event` 호출 결과를 저장해 다음 처리에서 사용한다.
        incident_result = IncidentEventService.create_from_its_event(
            build_incident_event_payload(payload),
            commit=False,
            emit_socket=False,
        )
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
    except RelayValidationError as exc:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()
        # 설명: 호출자에게 (jsonify({'ok': False, 'success': False, 'error': str(exc)}), 400) 값을 함수 결과로 반환한다.
        return jsonify({"ok": False, "success": False, "error": str(exc)}), 400
    except IncidentEventValidationError as exc:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()
        # 설명: 호출자에게 (jsonify({'ok': False, 'success': False, 'error': str(exc)}), 400) 값을 함수 결과로 반환한다.
        return jsonify({"ok": False, "success": False, "error": str(exc)}), 400
    except Exception:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("Unexpected AI event persistence error")
        # 설명: 호출자에게 (jsonify({'ok': False, 'success': False, 'error': 'Internal server error'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"ok": False, "success": False, "error": "Internal server error"}), 500

    # 설명: `incident_result.get('status') == 'created'` 조건 결과에 따라 실행 경로를 분기한다.
    if incident_result.get("status") == "created":
        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `incident_result['socket_emitted']`에 `IncidentEventService.emit_realtime_event_by_id` 호출 결과를 저장해 다음 처리에서 사용한다.
            incident_result["socket_emitted"] = (
                IncidentEventService.emit_realtime_event_by_id(
                    incident_result.get("realtime_event_id")
                )
            )
        except Exception:
            # 설명: `incident_result['socket_emitted']`의 기준값 또는 기본값을 False로 설정한다.
            incident_result["socket_emitted"] = False
            # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            logger.exception(
                "Failed to emit AI-created incident socket after commit. event_id=%s",
                payload.get("event_id"),
            )

    # 설명: `event_dict`에 `event.to_dict` 호출 결과를 저장해 다음 처리에서 사용한다.
    event_dict = event.to_dict()
    # 설명: `broadcast_queued`에 `_emit` 호출 결과를 저장해 다음 처리에서 사용한다.
    broadcast_queued = _emit("ai_event_received", event_dict)
    # 설명: `status_code`에 201 if status == 'created' else 200 표현식의 계산 결과를 저장한다.
    status_code = 201 if status == "created" else 200

    # 설명: 호출자에게 (jsonify({'ok': True, 'success': True, 'status': status, 'event': event_dict, '... 값을 함수 결과로 반환한다.
    return jsonify({
        "ok": True,
        "success": True,
        "status": status,
        "event": event_dict,
        "incident": incident_result,
        "broadcast_queued": broadcast_queued,
    }), status_code


# 설명: `get_events` 함수는 단일 값이나 리소스를 조회하는 함수다.
@ai_relay_bp.get("/events")
@require_auth
def get_events():
    if not has_event_media_access(request.current_user):
        return jsonify({"ok": False, "success": False, "error": "Permission denied."}), 403
    # 설명: `events`에 `list_events` 호출 결과를 저장해 다음 처리에서 사용한다.
    events = list_events(
        limit=request.args.get("limit", default=100, type=int),
        camera_id=request.args.get("camera_id"),
        event_type=request.args.get("event_type"),
        status=request.args.get("status"),
    )
    # 설명: `event_items`에 [event.to_dict() for event in events] 표현식의 계산 결과를 저장한다.
    event_items = [event.to_dict() for event in events]

    # 설명: 호출자에게 (jsonify({'ok': True, 'success': True, 'events': event_items, 'count': len(even... 값을 함수 결과로 반환한다.
    return jsonify({
        "ok": True,
        "success": True,
        "events": event_items,
        "count": len(event_items),
    }), 200


# 설명: `get_event_detail` 함수는 단일 값이나 리소스를 조회하는 함수다.
@ai_relay_bp.get("/events/<event_id>")
@require_auth
def get_event_detail(event_id: str):
    if not has_event_media_access(request.current_user):
        return jsonify({"ok": False, "success": False, "error": "Permission denied."}), 403
    # 설명: `event`에 `get_event` 호출 결과를 저장해 다음 처리에서 사용한다.
    event = get_event(event_id)
    # 설명: `event is None` 조건 결과에 따라 실행 경로를 분기한다.
    if event is None:
        # 설명: 호출자에게 (jsonify({'ok': False, 'success': False, 'error': 'event not found'}), 404) 값을 함수 결과로 반환한다.
        return jsonify({"ok": False, "success": False, "error": "event not found"}), 404

    # 설명: 호출자에게 (jsonify({'ok': True, 'success': True, 'event': event.to_dict()}), 200) 값을 함수 결과로 반환한다.
    return jsonify({"ok": True, "success": True, "event": event.to_dict()}), 200


# 설명: `get_replay` 함수는 단일 값이나 리소스를 조회하는 함수다.
@ai_relay_bp.get("/replays/<event_id>")
@require_auth
def get_replay(event_id: str):
    if not has_event_media_access(request.current_user):
        return jsonify({"ok": False, "success": False, "error": "Permission denied."}), 403
    # 설명: `event`에 `get_event` 호출 결과를 저장해 다음 처리에서 사용한다.
    event = get_event(event_id)
    # 설명: `event is None` 조건 결과에 따라 실행 경로를 분기한다.
    if event is None:
        # 설명: 호출자에게 (jsonify({'ok': False, 'success': False, 'error': 'event not found'}), 404) 값을 함수 결과로 반환한다.
        return jsonify({"ok": False, "success": False, "error": "event not found"}), 404

    # 설명: 호출자에게 (jsonify({'ok': True, 'success': True, 'replay': build_replay(event)}), 200) 값을 함수 결과로 반환한다.
    return jsonify({"ok": True, "success": True, "replay": build_replay(event)}), 200


# 설명: `_emit` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _emit(event_name: str, payload: dict) -> bool:
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `socketio.emit`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        socketio.emit(event_name, payload)
        # 설명: 호출자에게 True 값을 함수 결과로 반환한다.
        return True
    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("Failed to emit %s", event_name)
        # 설명: 호출자에게 False 값을 함수 결과로 반환한다.
        return False
