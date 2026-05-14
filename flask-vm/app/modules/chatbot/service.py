from app.modules.llm_gateway.service import generate_chatbot_answer


def ask_chatbot(message: str, incident_context: dict | None = None) -> dict:
    if not message or not message.strip():
        return {
            "success": False,
            "message": "message is required",
            "data": None,
        }

    payload = {
        "message": message.strip(),
        "incident_context": incident_context or {},
    }

    return generate_chatbot_answer(payload)
