"""internal auth.py 기능을 지원하는 internal auth 모듈.

도메인 경계 안에서 재사용되는 애플리케이션 로직을 제공한다."""

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations

# 설명: hmac 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import hmac

# 설명: flask에서 current_app, jsonify, request 이름을 가져와 아래 로직에서 재사용한다.
from flask import current_app, jsonify, request


# 설명: `INTERNAL_TOKEN_HEADER`의 기준값 또는 기본값을 'X-Internal-API-Token'로 설정한다.
INTERNAL_TOKEN_HEADER = "X-Internal-API-Token"


# 설명: `require_internal_api_token` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def require_internal_api_token():
    """Validate internal VM-to-VM API token.

    Test suites keep existing request fixtures lightweight by default.
    Set REQUIRE_INTERNAL_API_TOKEN_IN_TESTING=True in a test to verify auth behavior.
    """

    # 설명: `current_app.config.get('TESTING') and (not current_app.config.get('REQUIRE_INTERN...` 조건 결과에 따라 실행 경로를 분기한다.
    if current_app.config.get("TESTING") and not current_app.config.get(
        "REQUIRE_INTERNAL_API_TOKEN_IN_TESTING"
    ):
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `expected_token`에 `str(current_app.config.get('INTERNAL_API_TOKEN') or '').strip` 호출 결과를 저장해 다음 처리에서 사용한다.
    expected_token = str(current_app.config.get("INTERNAL_API_TOKEN") or "").strip()

    # 설명: `not expected_token` 조건 결과에 따라 실행 경로를 분기한다.
    if not expected_token:
        # 설명: 호출자에게 (jsonify({'ok': False, 'success': False, 'error': 'INTERNAL_API_TOKEN is not co... 값을 함수 결과로 반환한다.
        return (
            jsonify(
                {
                    "ok": False,
                    "success": False,
                    "error": "INTERNAL_API_TOKEN is not configured.",
                }
            ),
            503,
        )

    # 설명: `provided_token`에 `str(request.headers.get(INTERNAL_TOKEN_HEADER) or '').strip` 호출 결과를 저장해 다음 처리에서 사용한다.
    provided_token = str(request.headers.get(INTERNAL_TOKEN_HEADER) or "").strip()

    # 설명: `not provided_token or not hmac.compare_digest(provided_token, expected_token)` 조건 결과에 따라 실행 경로를 분기한다.
    if not provided_token or not hmac.compare_digest(provided_token, expected_token):
        # 설명: 호출자에게 (jsonify({'ok': False, 'success': False, 'error': 'Invalid internal API token.'... 값을 함수 결과로 반환한다.
        return (
            jsonify(
                {
                    "ok": False,
                    "success": False,
                    "error": "Invalid internal API token.",
                }
            ),
            401,
        )

    # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
    return None
