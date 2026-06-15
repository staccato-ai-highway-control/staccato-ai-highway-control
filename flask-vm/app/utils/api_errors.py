"""api errors 관련 공통 변환과 검증 기능을 제공한다.

라우트와 서비스가 동일한 입력 규칙 및 응답 계약을 재사용하도록 돕는다."""

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations

# 설명: flask에서 jsonify 이름을 가져와 아래 로직에서 재사용한다.
from flask import jsonify
# 설명: werkzeug.exceptions에서 HTTPException 이름을 가져와 아래 로직에서 재사용한다.
from werkzeug.exceptions import HTTPException


# 설명: `ERROR_STATUS_CODES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
ERROR_STATUS_CODES = {401, 403, 404, 500}
# 설명: `DEFAULT_MESSAGES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
DEFAULT_MESSAGES = {
    401: "Authentication is required.",
    403: "Permission denied.",
    404: "Resource not found.",
    500: "Internal server error.",
}
# 설명: `DEFAULT_ERROR_CODES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
DEFAULT_ERROR_CODES = {
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    500: "INTERNAL_SERVER_ERROR",
}


# 설명: `register_api_error_handlers` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def register_api_error_handlers(app) -> None:
    # 설명: `normalize_error_response` 함수는 입력 값을 일관된 형식으로 정규화하는 함수다.
    @app.after_request
    def normalize_error_response(response):
        # 설명: `response.status_code not in ERROR_STATUS_CODES or not response.is_json` 조건 결과에 따라 실행 경로를 분기한다.
        if response.status_code not in ERROR_STATUS_CODES or not response.is_json:
            # 설명: 호출자에게 response 값을 함수 결과로 반환한다.
            return response

        # 설명: `payload`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
        payload = response.get_json(silent=True)
        # 설명: `not isinstance(payload, dict)` 조건 결과에 따라 실행 경로를 분기한다.
        if not isinstance(payload, dict):
            # 설명: `payload`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
            payload = {}

        # 설명: `message`에 payload.get('message') or payload.get('error') or DEFAULT_MESSAGES[re... 표현식의 계산 결과를 저장한다.
        message = (
            payload.get("message")
            or payload.get("error")
            or DEFAULT_MESSAGES[response.status_code]
        )

        # 설명: `payload['success']`의 기준값 또는 기본값을 False로 설정한다.
        payload["success"] = False
        # 설명: `payload['status_code']`에 response.status_code 표현식의 계산 결과를 저장한다.
        payload["status_code"] = response.status_code
        # 설명: `payload.setdefault`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        payload.setdefault("error_code", DEFAULT_ERROR_CODES[response.status_code])
        # 설명: `payload.setdefault`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        payload.setdefault("message", message)
        # 설명: `payload.setdefault`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        payload.setdefault("error", message)
        # 설명: `response.set_data`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        response.set_data(app.json.dumps(payload))
        # 설명: `response.content_type`의 기준값 또는 기본값을 'application/json'로 설정한다.
        response.content_type = "application/json"
        # 설명: 호출자에게 response 값을 함수 결과로 반환한다.
        return response

    # 설명: `handle_not_found` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @app.errorhandler(404)
    def handle_not_found(error):
        # 설명: 호출자에게 _error_response(404) 값을 함수 결과로 반환한다.
        return _error_response(404)

    # 설명: `handle_internal_server_error` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @app.errorhandler(500)
    def handle_internal_server_error(error):
        # 설명: `app.logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        app.logger.exception("Unhandled server error", exc_info=error)
        # 설명: 호출자에게 _error_response(500) 값을 함수 결과로 반환한다.
        return _error_response(500)

    # 설명: `handle_http_exception` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        # 설명: `status_code`에 error.code or 500 표현식의 계산 결과를 저장한다.
        status_code = error.code or 500
        # 설명: `status_code not in ERROR_STATUS_CODES` 조건 결과에 따라 실행 경로를 분기한다.
        if status_code not in ERROR_STATUS_CODES:
            # 설명: 호출자에게 error 값을 함수 결과로 반환한다.
            return error
        # 설명: 호출자에게 _error_response(status_code, error.description) 값을 함수 결과로 반환한다.
        return _error_response(status_code, error.description)


# 설명: `_error_response` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _error_response(status_code: int, message: str | None = None):
    # 설명: `resolved_message`에 message or DEFAULT_MESSAGES[status_code] 표현식의 계산 결과를 저장한다.
    resolved_message = message or DEFAULT_MESSAGES[status_code]
    # 설명: 호출자에게 (jsonify({'success': False, 'status_code': status_code, 'error_code': DEFAULT_E... 값을 함수 결과로 반환한다.
    return jsonify({
        "success": False,
        "status_code": status_code,
        "error_code": DEFAULT_ERROR_CODES[status_code],
        "message": resolved_message,
        "error": resolved_message,
    }), status_code
