from flask import Blueprint, jsonify, request

from app.modules.chatbot.service import ask_chatbot

chatbot_bp = Blueprint("chatbot", __name__)


@chatbot_bp.post("/chatbot/answer")
def chatbot_answer():
    payload = request.get_json(silent=True) or {}

    message = payload.get("message")
    incident_context = payload.get("incident_context") or {}

    result = ask_chatbot(message=message, incident_context=incident_context)

    status_code = 200 if result.get("success") else 400
    return jsonify(result), status_code


@chatbot_bp.post("/incidents/<int:incident_id>/chatbot/answer")
def incident_chatbot_answer(incident_id: int):
    payload = request.get_json(silent=True) or {}

    message = payload.get("message")
    incident_context = payload.get("incident_context") or {}
    incident_context["incident_id"] = incident_id

    result = ask_chatbot(message=message, incident_context=incident_context)

    status_code = 200 if result.get("success") else 400
    return jsonify(result), status_code
