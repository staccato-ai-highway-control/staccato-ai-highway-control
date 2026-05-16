import os

import requests
from flask import current_app, has_app_context


# AI VM 내부 llm-server의 기본 포트는 8000이다.
DEFAULT_LLM_SERVER_URL = "http://192.168.0.186:8000"


def _get_config_value(name: str, default: str = "") -> str:
    """요청 실행 시점에 Flask config, env, 기본값 순서로 설정을 읽는다."""
    if has_app_context():
        value = current_app.config.get(name)
        if value:
            return value

    return os.getenv(name, default)


def _get_llm_server_url() -> str:
    return _get_config_value("LLM_SERVER_URL", DEFAULT_LLM_SERVER_URL).rstrip("/")


def _get_internal_api_token() -> str:
    return _get_config_value("INTERNAL_API_TOKEN", "")


def _json_headers() -> dict:
    """LLM 서버 호출에 공통으로 사용하는 JSON 헤더를 만든다."""
    headers = {
        "Content-Type": "application/json",
    }

    internal_api_token = _get_internal_api_token()
    if internal_api_token:
        headers["X-Internal-Token"] = internal_api_token

    return headers


def check_llm_health() -> dict:
    url = f"{_get_llm_server_url()}/internal/llm/health"

    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        return response.json()

    except requests.RequestException as exc:
        return {
            "success": False,
            "error_code": "LLM_HEALTH_CHECK_FAILED",
            "message": str(exc),
        }


def request_llm_report(payload: dict) -> dict:
    url = f"{_get_llm_server_url()}/internal/llm/reports/generate"

    try:
        response = requests.post(
            url,
            json=payload,
            headers=_json_headers(),
            timeout=30,
        )
        response.raise_for_status()
        return response.json()

    except requests.RequestException as exc:
        return {
            "success": False,
            "error_code": "LLM_SERVER_REQUEST_FAILED",
            "message": str(exc),
        }


def request_chatbot_answer(payload: dict) -> dict:
    """챗봇 답변 생성을 LLM 서버에 위임한다."""
    url = f"{_get_llm_server_url()}/internal/llm/chatbot/answer"

    try:
        response = requests.post(
            url,
            json=payload,
            headers=_json_headers(),
            timeout=30,
        )
        response.raise_for_status()
        return response.json()

    except requests.RequestException as exc:
        return {
            "success": False,
            "error_code": "LLM_CHATBOT_REQUEST_FAILED",
            "message": str(exc),
        }
