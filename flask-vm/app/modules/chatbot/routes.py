from flask import Blueprint, jsonify, request

from app.modules.chatbot.service import ask_chatbot

chatbot_bp = Blueprint("chatbot", __name__)

# LLM 서버 장애는 사용자 입력 오류와 구분해 502로 응답한다.
UPSTREAM_ERROR_CODES = {
    "LLM_HEALTH_CHECK_FAILED",
    "LLM_SERVER_REQUEST_FAILED",
    "LLM_CHATBOT_REQUEST_FAILED",
}


def _status_code(result: dict) -> int:
    """챗봇 서비스 결과를 HTTP status code로 변환한다."""
    if result.get("success"):
        return 200

    if result.get("error_code") in UPSTREAM_ERROR_CODES:
        return 502

    return 400


@chatbot_bp.post("/chatbot/answer")
def chatbot_answer():
    # 일반 챗봇 질의는 DB에 저장하지 않고 LLM 프록시로만 전달한다.
    payload = request.get_json(silent=True) or {}

    message = payload.get("message")
    incident_context = payload.get("incident_context") or {}

    result = ask_chatbot(message=message, incident_context=incident_context)
    return jsonify(result), _status_code(result)


@chatbot_bp.post("/incidents/<int:incident_id>/chatbot/answer")
def incident_chatbot_answer(incident_id: int):
    # URL의 incident_id를 컨텍스트에 주입해 LLM 서버가 사고 기준으로 답변할 수 있게 한다.
    payload = request.get_json(silent=True) or {}

    message = payload.get("message")
    incident_context = payload.get("incident_context") or {}
    incident_context["incident_id"] = incident_id

    result = ask_chatbot(message=message, incident_context=incident_context)
    return jsonify(result), _status_code(result)
