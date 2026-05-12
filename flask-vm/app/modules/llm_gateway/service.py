from app.clients.llm_client import (
    check_llm_health,
    request_llm_report,
    request_chatbot_answer,
)


def get_llm_health() -> dict:
    return check_llm_health()


def generate_llm_report(payload: dict) -> dict:
    return request_llm_report(payload)


def generate_chatbot_answer(payload: dict) -> dict:
    return request_chatbot_answer(payload)
