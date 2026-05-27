import os
import requests
from flask import current_app


DEFAULT_AI_VM_BASE_URL = "http://192.168.0.186:8001"


def _config_value(name: str, default: str = "") -> str:
    try:
        value = current_app.config.get(name)
    except RuntimeError:
        value = None

    if value is None:
        value = os.getenv(name, default)

    return str(value or "").strip()


def _ai_vm_base_url() -> str:
    return (
        _config_value("AI_VM_BASE_URL")
        or _config_value("AI_SERVER_URL")
        or os.getenv("AI_VM_BASE_URL")
        or os.getenv("AI_SERVER_URL")
        or DEFAULT_AI_VM_BASE_URL
    ).rstrip("/")


def _internal_api_token() -> str:
    return _config_value("INTERNAL_API_TOKEN")


def check_ai_health() -> dict:
    url = f"{_ai_vm_base_url()}/internal/ai/health"

    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        return response.json()

    except requests.RequestException as exc:
        return {
            "success": False,
            "error_code": "AI_HEALTH_CHECK_FAILED",
            "message": str(exc),
        }


def request_ai_analysis(payload: dict) -> dict:
    url = f"{_ai_vm_base_url()}/internal/ai/analyze"

    headers = {
        "Content-Type": "application/json",
    }

    internal_api_token = _internal_api_token()
    if internal_api_token:
        headers["X-Internal-Token"] = internal_api_token

    try:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=30,
        )
        response.raise_for_status()
        return response.json()

    except requests.RequestException as exc:
        return {
            "success": False,
            "error_code": "AI_SERVER_REQUEST_FAILED",
            "message": str(exc),
        }
