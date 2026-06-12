"""incident event 도메인의 HTTP API 엔드포인트를 정의한다.

요청 인증과 입력 변환을 수행한 뒤 서비스 결과를 안정적인 JSON 응답으로 전달한다."""

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations

# 설명: logging 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import logging

# 설명: flask에서 Blueprint, jsonify, request 이름을 가져와 아래 로직에서 재사용한다.
from flask import Blueprint, jsonify, request

# 설명: app.modules.internal_auth에서 require_internal_api_token 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.internal_auth import require_internal_api_token

# 설명: app.modules.incident_event.service에서 IncidentEventService, IncidentEventValidationError 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.incident_event.service import (
    IncidentEventService,
    IncidentEventValidationError,
)


# 설명: `logger`에 `logging.getLogger` 호출 결과를 저장해 다음 처리에서 사용한다.
logger = logging.getLogger(__name__)

# 설명: `incident_event_bp`에 `Blueprint` 호출 결과를 저장해 다음 처리에서 사용한다.
incident_event_bp = Blueprint(
    "incident_event",
    __name__,
    url_prefix="/internal/its",
)


# 설명: `create_its_event` 함수는 새 데이터나 리소스를 생성하는 함수다.
@incident_event_bp.route("/events", methods=["POST"])
def create_its_event():
    # 설명: `auth_error`에 `require_internal_api_token` 호출 결과를 저장해 다음 처리에서 사용한다.
    auth_error = require_internal_api_token()
    # 설명: `auth_error` 조건 결과에 따라 실행 경로를 분기한다.
    if auth_error:
        # 설명: 호출자에게 auth_error 값을 함수 결과로 반환한다.
        return auth_error

    # 설명: `payload`에 `request.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    payload = request.get_json(silent=True)

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `result`에 `IncidentEventService.create_from_its_event` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = IncidentEventService.create_from_its_event(payload)
    except IncidentEventValidationError as exc:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': str(exc)}), 400) 값을 함수 결과로 반환한다.
        return jsonify({
            "success": False,
            "error": str(exc),
        }), 400
    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("Unexpected ITS incident event error")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({
            "success": False,
            "error": "서버 내부 오류가 발생했습니다.",
        }), 500

    # 설명: `status_code`에 200 if result.get('status') == 'duplicate' else 201 표현식의 계산 결과를 저장한다.
    status_code = 200 if result.get("status") == "duplicate" else 201

    # 설명: 호출자에게 (jsonify({'success': True, **result}), status_code) 값을 함수 결과로 반환한다.
    return jsonify({
        "success": True,
        **result,
    }), status_code
