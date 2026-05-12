import os
import requests


LLM_SERVER_URL = os.getenv("LLM_SERVER_URL", "http://192.168.0.186:8000")
INTERNAL_API_TOKEN = os.getenv("INTERNAL_API_TOKEN", "")


def check_llm_health() -> dict:
    url = f"{LLM_SERVER_URL}/internal/llm/health"

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
    url = f"{LLM_SERVER_URL}/internal/llm/reports/generate"

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
            "error_code": "LLM_SERVER_REQUEST_FAILED",
            "message": str(exc),
        }


def request_chatbot_answer(payload: dict) -> dict:
    url = f"{LLM_SERVER_URL}/internal/llm/chatbot/answer"

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
            "error_code": "LLM_CHATBOT_REQUEST_FAILED",
            "message": str(exc),
        }
