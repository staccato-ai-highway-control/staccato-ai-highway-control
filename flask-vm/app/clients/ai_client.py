import os
import requests


AI_SERVER_URL = os.getenv("AI_SERVER_URL", "http://192.168.0.186:8001")
INTERNAL_API_TOKEN = os.getenv("INTERNAL_API_TOKEN", "")


def check_ai_health() -> dict:
    url = f"{AI_SERVER_URL}/internal/ai/health"

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
    url = f"{AI_SERVER_URL}/internal/ai/analyze"

    headers = {
        "Content-Type": "application/json",
    }

    if INTERNAL_API_TOKEN:
        headers["X-Internal-Token"] = INTERNAL_API_TOKEN

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
