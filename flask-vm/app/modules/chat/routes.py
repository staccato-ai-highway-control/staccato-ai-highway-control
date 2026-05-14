from flask import Blueprint, jsonify, request

from app.modules.chat.service import (
    get_or_create_chat_room,
    get_chat_messages,
    send_chat_message,
)

chat_bp = Blueprint("chat", __name__)


@chat_bp.post("/incidents/<int:incident_id>/chat-room")
def create_or_get_incident_chat_room(incident_id: int):
    result = get_or_create_chat_room(incident_id)
    return jsonify(result), 200


@chat_bp.get("/chat-rooms/<int:room_id>/messages")
def list_chat_messages(room_id: int):
    result = get_chat_messages(room_id)
    return jsonify(result), 200


@chat_bp.post("/chat-rooms/<int:room_id>/messages")
def create_chat_message(room_id: int):
    payload = request.get_json(silent=True) or {}

    sender_id = payload.get("sender_id")
    content = payload.get("content")

    result = send_chat_message(
        room_id=room_id,
        sender_id=sender_id,
        content=content,
    )

    status_code = 200 if result.get("success") else 400
    return jsonify(result), status_code
