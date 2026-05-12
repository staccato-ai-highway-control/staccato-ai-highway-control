import os
from typing import Any

from app.services.mock_llm_service import (
    generate_mock_chatbot_answer,
    generate_mock_report,
    generate_mock_risk_summary,
)

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "MOCK").upper()


def get_llm_health() -> dict:
    return {
        "success": True,
        "service": "llm-server",
        "status": "ok",
        "llm_provider": LLM_PROVIDER,
    }


def generate_chatbot_answer(payload: dict[str, Any]) -> dict:
    return generate_mock_chatbot_answer(payload)


def generate_report(payload: dict[str, Any]) -> dict:
    return generate_mock_report(payload)


def generate_risk_summary(payload: dict[str, Any]) -> dict:
    return generate_mock_risk_summary(payload)
