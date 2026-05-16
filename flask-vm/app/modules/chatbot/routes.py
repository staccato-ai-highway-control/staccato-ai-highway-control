from flask import Blueprint, jsonify, request

from app.modules.chatbot.service import (
    UPSTREAM_ERROR_CODES,
    ask_chatbot,
    close_chatbot_session,
    get_chatbot_session_detail,
    get_or_create_incident_chatbot_session,
    list_chatbot_session_messages,
    list_incident_chatbot_sessions,
    send_chatbot_session_message,
)
from app.utils.security import require_auth

chatbot_bp = Blueprint("chatbot", __name__)


def _current_user():
    return getattr(request, "current_user", None)


def _status_code(result: dict) -> int:
    """챗봇 서비스 결과를 HTTP status code로 변환한다."""
    if result.get("success"):
        return 200

    message = result.get("message")
    if message == "Permission denied":
        return 403
    if message == "Chatbot session not found":
        return 404
    if result.get("error_code") in UPSTREAM_ERROR_CODES:
        return 502

    return 400


@chatbot_bp.post("/chatbot/answer")
def chatbot_answer():
    # 기존 호환 API: DB 저장 없이 단건 LLM 답변만 생성한다.
    payload = request.get_json(silent=True) or {}

    message = payload.get("message")
    incident_context = payload.get("incident_context") or {}

    result = ask_chatbot(message=message, incident_context=incident_context)
    return jsonify(result), _status_code(result)


@chatbot_bp.post("/incidents/<int:incident_id>/chatbot/answer")
def incident_chatbot_answer(incident_id: int):
    # 기존 호환 API: incident_id만 컨텍스트에 추가하고 저장은 하지 않는다.
    payload = request.get_json(silent=True) or {}

    message = payload.get("message")
    incident_context = payload.get("incident_context") or {}
    incident_context["incident_id"] = incident_id

    result = ask_chatbot(message=message, incident_context=incident_context)
    return jsonify(result), _status_code(result)


@chatbot_bp.post("/incidents/<int:incident_id>/chatbot-sessions")
@require_auth
def create_incident_chatbot_session(incident_id: int):
    """특정 사건 기준으로 내 OPEN 챗봇 세션을 생성하거나 재사용한다."""
    result = get_or_create_incident_chatbot_session(incident_id, _current_user())
    return jsonify(result), _status_code(result)


@chatbot_bp.get("/incidents/<int:incident_id>/chatbot-sessions")
@require_auth
def list_incident_sessions(incident_id: int):
    """관리자는 사건 전체 세션, 일반 사용자는 본인 세션만 조회한다."""
    result = list_incident_chatbot_sessions(incident_id, _current_user())
    return jsonify(result), _status_code(result)


@chatbot_bp.get("/chatbot-sessions/<int:session_id>")
@require_auth
def get_session(session_id: int):
    """세션 생성자 또는 관제/최고관리자만 세션 상세를 조회한다."""
    result = get_chatbot_session_detail(session_id, _current_user())
    return jsonify(result), _status_code(result)


@chatbot_bp.get("/chatbot-sessions/<int:session_id>/messages")
@require_auth
def list_session_messages(session_id: int):
    """세션 접근 권한 확인 후 대화 이력을 시간순으로 반환한다."""
    result = list_chatbot_session_messages(session_id, _current_user())
    return jsonify(result), _status_code(result)


@chatbot_bp.post("/chatbot-sessions/<int:session_id>/messages")
@require_auth
def create_session_message(session_id: int):
    """사용자 질문과 LLM 답변을 ChatbotMessage에 각각 저장한다."""
    payload = request.get_json(silent=True) or {}
    result = send_chatbot_session_message(
        session_id=session_id,
        user=_current_user(),
        message=payload.get("message"),
    )
    return jsonify(result), _status_code(result)


@chatbot_bp.patch("/chatbot-sessions/<int:session_id>/close")
@require_auth
def close_session(session_id: int):
    """세션을 CLOSED 처리한다. 종료 후 이력 조회는 가능하지만 질문 전송은 막는다."""
    result = close_chatbot_session(session_id, _current_user())
    return jsonify(result), _status_code(result)
