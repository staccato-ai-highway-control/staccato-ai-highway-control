from datetime import datetime, timezone

from app.extensions import db
from app.models.chat_models import ChatbotConversation, ChatbotMessage
from app.models.incident_models import DetectionLog, Incident
from app.models.incident_support_models import IncidentMemo
from app.models.its_models import ItsRiskScore
from app.models.its_support_models import RiskContextSnapshot
from app.models.llm_models import LlmReport
from app.modules.llm_gateway.service import generate_chatbot_answer

ADMIN_ROLES = {"SUPER_ADMIN", "CONTROL_ADMIN"}
OPEN_STATUS = "OPEN"
CLOSED_STATUS = "CLOSED"
UPSTREAM_ERROR_CODES = {
    "LLM_HEALTH_CHECK_FAILED",
    "LLM_SERVER_REQUEST_FAILED",
    "LLM_CHATBOT_REQUEST_FAILED",
}


def _now():
    return datetime.now(timezone.utc)


def _response(success: bool, message: str, data=None, error_code: str | None = None) -> dict:
    result = {"success": success, "message": message, "data": data}
    if error_code:
        result["error_code"] = error_code
    return result


def _is_admin(user) -> bool:
    return getattr(user, "role", None) in ADMIN_ROLES


def _can_access_session(session: ChatbotConversation, user) -> bool:
    return session.user_id == user.id or _is_admin(user)


def _session_status(session: ChatbotConversation) -> str:
    return session.conversation_status


def _session_to_dict(session: ChatbotConversation, include_incident: bool = False) -> dict:
    data = {
        "id": session.id,
        "session_id": session.id,
        "incident_id": session.incident_id,
        "user_id": session.user_id,
        "status": _session_status(session),
        "conversation_status": session.conversation_status,
        "title": session.title,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "updated_at": session.updated_at.isoformat() if session.updated_at else None,
        "closed_at": session.closed_at.isoformat() if session.closed_at else None,
    }

    if include_incident:
        incident = Incident.query.get(session.incident_id) if session.incident_id else None
        data["incident"] = incident.to_dict() if incident else None

    return data


def _message_generation_status(message: ChatbotMessage) -> str | None:
    context = message.context_json or {}
    return context.get("generation_status")


def _message_to_dict(message: ChatbotMessage) -> dict:
    return {
        "id": message.id,
        "message_id": message.id,
        "session_id": message.conversation_id,
        "conversation_id": message.conversation_id,
        "incident_id": message.incident_id,
        "user_id": message.user_id,
        "sender_type": message.sender_type,
        "message": message.message,
        "generation_status": _message_generation_status(message),
        "llm_model_name": message.llm_model_name,
        "context_json": message.context_json,
        "token_usage_json": message.token_usage_json,
        "created_at": message.created_at.isoformat() if message.created_at else None,
    }


def _latest_risk_score(incident_id: int):
    return (
        ItsRiskScore.query
        .filter_by(incident_id=incident_id)
        .order_by(ItsRiskScore.created_at.desc())
        .first()
    )


def _build_source_snapshot(incident_id: int) -> dict:
    """현재 존재하는 모델만 사용해 LLM에 전달할 사고 컨텍스트를 구성한다."""
    incident = Incident.query.get(incident_id)
    latest_risk = _latest_risk_score(incident_id)

    detection_logs = (
        DetectionLog.query
        .filter_by(incident_id=incident_id)
        .order_by(DetectionLog.created_at.desc())
        .limit(5)
        .all()
    )
    memos = (
        IncidentMemo.query
        .filter_by(incident_id=incident_id)
        .filter(IncidentMemo.deleted_at.is_(None))
        .order_by(IncidentMemo.created_at.desc())
        .limit(5)
        .all()
    )
    latest_llm_report = (
        LlmReport.query
        .filter_by(incident_id=incident_id)
        .order_by(LlmReport.created_at.desc())
        .first()
    )
    latest_risk_context = (
        RiskContextSnapshot.query
        .filter_by(incident_id=incident_id)
        .order_by(RiskContextSnapshot.created_at.desc())
        .first()
    )

    return {
        "incident": {
            "id": incident.id if incident else incident_id,
            "incident_type": incident.incident_type if incident else None,
            "status": incident.incident_status if incident else None,
            "risk_level": incident.risk_level if incident else None,
            "risk_score": float(latest_risk.risk_score) if latest_risk and latest_risk.risk_score is not None else None,
            "title": None,
            "description": incident.location_name if incident else None,
            "detected_at": incident.detected_at.isoformat() if incident and incident.detected_at else None,
            "assigned_to": None,
        },
        "detection_logs": [
            {
                "confidence": float(log.confidence) if log.confidence is not None else None,
                "stopped_seconds": log.stopped_duration_seconds,
                "movement_delta": float(log.movement_delta_px) if log.movement_delta_px is not None else None,
                "object_type": log.detected_class,
                "model_name": log.model_name,
                "model_version": log.model_version,
            }
            for log in detection_logs
        ],
        "incident_memos": [memo.to_dict() for memo in memos],
        "llm_report": latest_llm_report.to_dict() if latest_llm_report else None,
        "risk_context_snapshot": latest_risk_context.to_dict() if latest_risk_context else None,
    }


def _extract_answer(result: dict) -> str | None:
    data = result.get("data") if isinstance(result.get("data"), dict) else {}
    for source in (data, result):
        for key in ("answer", "content", "message"):
            value = source.get(key)
            if value:
                return value
    return None


def _extract_llm_model_name(result: dict) -> str | None:
    data = result.get("data") if isinstance(result.get("data"), dict) else {}
    return data.get("llm_model_name") or data.get("model_name") or result.get("llm_model_name") or result.get("model_name")


def _extract_token_usage(result: dict):
    data = result.get("data") if isinstance(result.get("data"), dict) else {}
    return data.get("token_usage_json") or data.get("token_usage") or result.get("token_usage_json") or result.get("token_usage")


def ask_chatbot(message: str, incident_context: dict | None = None) -> dict:
    if not message or not message.strip():
        return _response(False, "message is required", None)

    payload = {
        "message": message.strip(),
        "incident_context": incident_context or {},
    }

    return generate_chatbot_answer(payload)


def get_or_create_incident_chatbot_session(incident_id: int, user) -> dict:
    if user is None:
        return _response(False, "Authentication user not found", None)

    try:
        session = (
            ChatbotConversation.query
            .filter_by(incident_id=incident_id, user_id=user.id, conversation_status=OPEN_STATUS)
            .order_by(ChatbotConversation.created_at.desc())
            .first()
        )

        if session is None:
            session = ChatbotConversation(
                user_id=user.id,
                incident_id=incident_id,
                conversation_status=OPEN_STATUS,
                title=f"Incident {incident_id} chatbot session",
                created_at=_now(),
                updated_at=None,
                closed_at=None,
            )
            db.session.add(session)
            db.session.flush()

        db.session.commit()
        return _response(True, "Chatbot session ready", _session_to_dict(session))
    except Exception as exc:
        db.session.rollback()
        return _response(False, f"Failed to prepare chatbot session: {str(exc)}", None)


def list_incident_chatbot_sessions(incident_id: int, user) -> dict:
    try:
        query = ChatbotConversation.query.filter_by(incident_id=incident_id)
        if not _is_admin(user):
            query = query.filter_by(user_id=user.id)

        sessions = query.order_by(ChatbotConversation.created_at.desc()).all()
        return _response(True, "Chatbot sessions fetched", [_session_to_dict(session) for session in sessions])
    except Exception as exc:
        return _response(False, f"Failed to fetch chatbot sessions: {str(exc)}", None)


def get_chatbot_session_detail(session_id: int, user) -> dict:
    try:
        session = ChatbotConversation.query.get(session_id)
        if session is None:
            return _response(False, "Chatbot session not found", None)

        if not _can_access_session(session, user):
            return _response(False, "Permission denied", None)

        return _response(True, "Chatbot session fetched", _session_to_dict(session, include_incident=True))
    except Exception as exc:
        return _response(False, f"Failed to fetch chatbot session: {str(exc)}", None)


def list_chatbot_session_messages(session_id: int, user) -> dict:
    try:
        session = ChatbotConversation.query.get(session_id)
        if session is None:
            return _response(False, "Chatbot session not found", None)

        if not _can_access_session(session, user):
            return _response(False, "Permission denied", None)

        messages = (
            ChatbotMessage.query
            .filter_by(conversation_id=session.id)
            .order_by(ChatbotMessage.created_at.asc())
            .all()
        )
        return _response(
            True,
            "Chatbot messages fetched",
            {"session": _session_to_dict(session), "messages": [_message_to_dict(message) for message in messages]},
        )
    except Exception as exc:
        return _response(False, f"Failed to fetch chatbot messages: {str(exc)}", None)


def send_chatbot_session_message(session_id: int, user, message: str) -> dict:
    if not message or not message.strip():
        return _response(False, "message is required", None)

    try:
        session = ChatbotConversation.query.get(session_id)
        if session is None:
            return _response(False, "Chatbot session not found", None)

        if not _can_access_session(session, user):
            return _response(False, "Permission denied", None)

        if session.conversation_status == CLOSED_STATUS:
            return _response(False, "Chatbot session is closed", None)

        source_snapshot = _build_source_snapshot(session.incident_id)
        prompt_message = message.strip()

        user_message = ChatbotMessage(
            conversation_id=session.id,
            incident_id=session.incident_id,
            user_id=user.id,
            sender_type="USER",
            message=prompt_message,
            llm_model_name=None,
            prompt_text=None,
            context_json={"generation_status": "SUBMITTED"},
            token_usage_json=None,
            created_at=_now(),
        )
        db.session.add(user_message)
        db.session.flush()

        llm_payload = {
            "message": prompt_message,
            "incident_id": session.incident_id,
            "incident_context": source_snapshot,
            "source_snapshot": source_snapshot,
        }
        llm_result = generate_chatbot_answer(llm_payload)

        if not llm_result.get("success"):
            error_code = llm_result.get("error_code") or "LLM_CHATBOT_REQUEST_FAILED"
            failed_message = ChatbotMessage(
                conversation_id=session.id,
                incident_id=session.incident_id,
                user_id=user.id,
                sender_type="BOT",
                message=llm_result.get("message") or "LLM response generation failed",
                llm_model_name=_extract_llm_model_name(llm_result),
                prompt_text=prompt_message,
                context_json={
                    "generation_status": "FAILED",
                    "error_code": error_code,
                    "source_snapshot": source_snapshot,
                },
                token_usage_json=_extract_token_usage(llm_result),
                created_at=_now(),
            )
            session.updated_at = _now()
            db.session.add(failed_message)
            db.session.commit()
            return _response(
                False,
                llm_result.get("message") or "LLM response generation failed",
                {
                    "user_message": _message_to_dict(user_message),
                    "bot_message": _message_to_dict(failed_message),
                },
                error_code=error_code,
            )

        answer = _extract_answer(llm_result) or ""
        bot_message = ChatbotMessage(
            conversation_id=session.id,
            incident_id=session.incident_id,
            user_id=user.id,
            sender_type="BOT",
            message=answer,
            llm_model_name=_extract_llm_model_name(llm_result),
            prompt_text=prompt_message,
            context_json={
                "generation_status": "SUCCEEDED",
                "source_snapshot": source_snapshot,
                "llm_response": llm_result,
            },
            token_usage_json=_extract_token_usage(llm_result),
            created_at=_now(),
        )
        session.updated_at = _now()
        db.session.add(bot_message)
        db.session.commit()

        return _response(
            True,
            "Chatbot message sent",
            {
                "session": _session_to_dict(session),
                "user_message": _message_to_dict(user_message),
                "bot_message": _message_to_dict(bot_message),
                "answer": answer,
            },
        )
    except Exception as exc:
        db.session.rollback()
        return _response(False, f"Failed to send chatbot message: {str(exc)}", None)


def close_chatbot_session(session_id: int, user) -> dict:
    try:
        session = ChatbotConversation.query.get(session_id)
        if session is None:
            return _response(False, "Chatbot session not found", None)

        if not _can_access_session(session, user):
            return _response(False, "Permission denied", None)

        session.conversation_status = CLOSED_STATUS
        session.closed_at = session.closed_at or _now()
        session.updated_at = _now()
        db.session.commit()
        return _response(True, "Chatbot session closed", _session_to_dict(session))
    except Exception as exc:
        db.session.rollback()
        return _response(False, f"Failed to close chatbot session: {str(exc)}", None)
