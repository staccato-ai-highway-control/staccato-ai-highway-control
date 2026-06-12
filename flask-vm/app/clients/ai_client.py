"""AI 분석 서버와 통신하는 HTTP 클라이언트.

타임아웃과 응답 검증을 적용하고 상위 서비스가 사용할 일관된 결과를 반환한다."""

# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: requests 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import requests


# 설명: `AI_SERVER_URL`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
AI_SERVER_URL = os.getenv("AI_SERVER_URL", "http://192.168.0.186:8001")
# 설명: `INTERNAL_API_TOKEN`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
INTERNAL_API_TOKEN = os.getenv("INTERNAL_API_TOKEN", "")


# 설명: `check_ai_health` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def check_ai_health() -> dict:
    # 설명: `url`에 f'{AI_SERVER_URL}/internal/ai/health' 표현식의 계산 결과를 저장한다.
    url = f"{AI_SERVER_URL}/internal/ai/health"

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `response`에 `requests.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        response = requests.get(url, timeout=5)
        # 설명: `response.raise_for_status`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        response.raise_for_status()
        # 설명: 호출자에게 response.json() 값을 함수 결과로 반환한다.
        return response.json()

    except requests.RequestException as exc:
        # 설명: 호출자에게 {'success': False, 'error_code': 'AI_HEALTH_CHECK_FAILED', 'message': str(exc)} 값을 함수 결과로 반환한다.
        return {
            "success": False,
            "error_code": "AI_HEALTH_CHECK_FAILED",
            "message": str(exc),
        }


# 설명: `request_ai_analysis` 함수는 외부 처리 또는 비동기 작업을 요청하는 함수다.
def request_ai_analysis(payload: dict) -> dict:
    # 설명: `url`에 f'{AI_SERVER_URL}/internal/ai/analyze' 표현식의 계산 결과를 저장한다.
    url = f"{AI_SERVER_URL}/internal/ai/analyze"

    # 설명: `headers`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    headers = {
        "Content-Type": "application/json",
    }

    # 설명: `INTERNAL_API_TOKEN` 조건 결과에 따라 실행 경로를 분기한다.
    if INTERNAL_API_TOKEN:
        # 설명: `headers['X-Internal-Token']`에 INTERNAL_API_TOKEN 표현식의 계산 결과를 저장한다.
        headers["X-Internal-Token"] = INTERNAL_API_TOKEN

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `response`에 `requests.post` 호출 결과를 저장해 다음 처리에서 사용한다.
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=30,
        )
        # 설명: `response.raise_for_status`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        response.raise_for_status()
        # 설명: 호출자에게 response.json() 값을 함수 결과로 반환한다.
        return response.json()

    except requests.RequestException as exc:
        # 설명: 호출자에게 {'success': False, 'error_code': 'AI_SERVER_REQUEST_FAILED', 'message': str(exc)} 값을 함수 결과로 반환한다.
        return {
            "success": False,
            "error_code": "AI_SERVER_REQUEST_FAILED",
            "message": str(exc),
        }
