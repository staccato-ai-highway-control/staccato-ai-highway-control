"""replay 도메인의 HTTP API 엔드포인트를 정의한다.

요청 인증과 입력 변환을 수행한 뒤 서비스 결과를 안정적인 JSON 응답으로 전달한다."""

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations

# 설명: flask에서 Blueprint, jsonify, request 이름을 가져와 아래 로직에서 재사용한다.
from flask import Blueprint, jsonify, request

# 설명: app.modules.replay.service에서 get_replay_detail, list_replays 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.replay.service import get_replay_detail, list_replays


# 설명: `replay_bp`에 `Blueprint` 호출 결과를 저장해 다음 처리에서 사용한다.
replay_bp = Blueprint("replay", __name__, url_prefix="/api/replays")


# 설명: `list_replays_api` 함수는 조건에 맞는 목록을 조회하는 함수다.
@replay_bp.get("")
def list_replays_api():
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `page`에 `_positive_int` 호출 결과를 저장해 다음 처리에서 사용한다.
        page = _positive_int(request.args.get("page"), 1)
        # 설명: `size`에 `_positive_int` 호출 결과를 저장해 다음 처리에서 사용한다.
        size = _positive_int(request.args.get("size"), 20, maximum=100)
    except ValueError as exc:
        # 설명: 호출자에게 (jsonify({'success': False, 'error_code': 'INVALID_REPLAY_QUERY', 'message': st... 값을 함수 결과로 반환한다.
        return jsonify({
            "success": False,
            "error_code": "INVALID_REPLAY_QUERY",
            "message": str(exc),
            "details": None,
        }), 400

    # 설명: `filters`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    filters = {
        "source_type": request.args.get("source_type"),
        "incident_type": request.args.get("incident_type"),
        "risk_level": request.args.get("risk_level"),
        "status": request.args.get("status"),
        "keyword": request.args.get("keyword"),
    }

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `result`에 `list_replays` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = list_replays(page=page, size=size, filters=filters)
    except ValueError as exc:
        # 설명: 호출자에게 (jsonify({'success': False, 'error_code': 'INVALID_REPLAY_QUERY', 'message': st... 값을 함수 결과로 반환한다.
        return jsonify({
            "success": False,
            "error_code": "INVALID_REPLAY_QUERY",
            "message": str(exc),
            "details": None,
        }), 400

    # 설명: 호출자에게 (jsonify(result), 200) 값을 함수 결과로 반환한다.
    return jsonify(result), 200


# 설명: `get_replay_detail_api` 함수는 단일 값이나 리소스를 조회하는 함수다.
@replay_bp.get("/<int:incident_id>")
def get_replay_detail_api(incident_id: int):
    # 설명: `result`에 `get_replay_detail` 호출 결과를 저장해 다음 처리에서 사용한다.
    result = get_replay_detail(incident_id)
    # 설명: `status_code`에 200 if result.get('success') else 404 표현식의 계산 결과를 저장한다.
    status_code = 200 if result.get("success") else 404
    # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
    return jsonify(result), status_code


# 설명: `_positive_int` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _positive_int(value, default: int, maximum: int | None = None) -> int:
    # 설명: `value in (None, '')` 조건 결과에 따라 실행 경로를 분기한다.
    if value in (None, ""):
        # 설명: 호출자에게 default 값을 함수 결과로 반환한다.
        return default

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `parsed`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        # 설명: 현재 처리를 중단하고 ValueError('page and size must be positive integers.')를 호출자에게 전달한다.
        raise ValueError("page and size must be positive integers.") from exc

    # 설명: `parsed <= 0` 조건 결과에 따라 실행 경로를 분기한다.
    if parsed <= 0:
        # 설명: 현재 처리를 중단하고 ValueError('page and size must be positive integers.')를 호출자에게 전달한다.
        raise ValueError("page and size must be positive integers.")

    # 설명: `maximum is not None` 조건 결과에 따라 실행 경로를 분기한다.
    if maximum is not None:
        # 설명: 호출자에게 min(parsed, maximum) 값을 함수 결과로 반환한다.
        return min(parsed, maximum)

    # 설명: 호출자에게 parsed 값을 함수 결과로 반환한다.
    return parsed
