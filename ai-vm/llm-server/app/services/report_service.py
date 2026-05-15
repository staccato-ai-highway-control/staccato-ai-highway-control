from typing import Any

from app.services.llm_service import generate_report


def create_report(payload: dict[str, Any]) -> dict:
    return generate_report(payload)
