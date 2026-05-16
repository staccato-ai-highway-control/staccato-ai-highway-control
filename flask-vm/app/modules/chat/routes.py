from flask import Blueprint, jsonify, request

from app.utils.security import require_auth
from app.modules.chat.service import (
    add_chat_room_members,
    assign_incident_chat_room,
    close_incident_chat_room_for_status,
    create_general_chat_room,
    delete_chat_message,
    delete_chat_room,
    get_chat_messages,
    get_chat_room_detail,
    get_or_create_chat_room,
    leave_chat_room,
    list_my_chat_rooms,
    mark_chat_room_read,
    send_chat_message,
)

chat_bp = Blueprint("chat", __name__)


def _get_current_user():
    return getattr(request, "current_user", None)


def _get_current_user_id() -> int | None:
    current_user = _get_current_user()
    if current_user is None:
        return None
    return getattr(current_user, "id", None)


def _status_code(result: dict) -> int:
    if result.get("success"):
        return 200

    message = result.get("message")
    if message in {"Chat room not found", "Chat message not found"}:
        return 404
    if message == "Permission denied":
        return 403
    return 400


def _member_ids_from_payload(payload: dict) -> list[int]:
    member_ids = payload.get("member_ids")
    if member_ids is None and payload.get("member_id") is not None:
        member_ids = [payload.get("member_id")]
    if member_ids is None:
        return []
    if not isinstance(member_ids, list):
        return []
    return [member_id for member_id in member_ids if member_id is not None]


@chat_bp.post("/incidents/<int:incident_id>/chat-room")
@require_auth
def create_or_get_incident_chat_room(incident_id: int):
    user_id = _get_current_user_id()
    if user_id is None:
        return jsonify({"success": False, "message": "Authentication user not found", "data": None}), 401

    result = get_or_create_chat_room(incident_id=incident_id, user_id=user_id)
    return jsonify(result), _status_code(result)


@chat_bp.post("/incidents/<int:incident_id>/chat-room/assign")
@require_auth
def assign_incident_room(incident_id: int):
    payload = request.get_json(silent=True) or {}
    result = assign_incident_chat_room(
        incident_id=incident_id,
        control_user_id=_get_current_user_id(),
        responder_user_id=payload.get("responder_user_id"),
        admin_user_ids=payload.get("admin_user_ids") or [],
    )
    return jsonify(result), _status_code(result)


@chat_bp.post("/chat-rooms")
@require_auth
def create_chat_room():
    payload = request.get_json(silent=True) or {}
    user_id = _get_current_user_id()

    result = create_general_chat_room(
        creator_id=user_id,
        room_type=payload.get("room_type"),
        member_ids=_member_ids_from_payload(payload),
    )
    status_code = 201 if result.get("success") else _status_code(result)
    return jsonify(result), status_code


@chat_bp.get("/chat-rooms")
@require_auth
def list_chat_rooms():
    result = list_my_chat_rooms(_get_current_user_id())
    return jsonify(result), _status_code(result)


@chat_bp.get("/chat-rooms/<int:room_id>")
@require_auth
def get_chat_room(room_id: int):
    result = get_chat_room_detail(room_id, _get_current_user_id())
    return jsonify(result), _status_code(result)


@chat_bp.delete("/chat-rooms/<int:room_id>")
@require_auth
def remove_chat_room(room_id: int):
    result = delete_chat_room(room_id, _get_current_user())
    return jsonify(result), _status_code(result)


@chat_bp.post("/chat-rooms/<int:room_id>/members")
@require_auth
def add_members(room_id: int):
    payload = request.get_json(silent=True) or {}
    result = add_chat_room_members(
        room_id=room_id,
        current_user_id=_get_current_user_id(),
        member_ids=_member_ids_from_payload(payload),
    )
    return jsonify(result), _status_code(result)


@chat_bp.delete("/chat-rooms/<int:room_id>/members/me")
@require_auth
def leave_room(room_id: int):
    result = leave_chat_room(room_id, _get_current_user_id())
    return jsonify(result), _status_code(result)


@chat_bp.get("/chat-rooms/<int:room_id>/messages")
@require_auth
def list_chat_messages(room_id: int):
    result = get_chat_messages(room_id, user_id=_get_current_user_id())
    return jsonify(result), _status_code(result)


@chat_bp.post("/chat-rooms/<int:room_id>/messages")
@require_auth
def create_chat_message(room_id: int):
    payload = request.get_json(silent=True) or {}
    result = send_chat_message(
        room_id=room_id,
        sender_id=_get_current_user_id(),
        content=payload.get("content"),
    )
    return jsonify(result), _status_code(result)


@chat_bp.delete("/chat-rooms/<int:room_id>/messages/<int:message_id>")
@require_auth
def remove_chat_message(room_id: int, message_id: int):
    result = delete_chat_message(
        room_id=room_id,
        message_id=message_id,
        user_id=_get_current_user_id(),
    )
    return jsonify(result), _status_code(result)


@chat_bp.patch("/chat-rooms/<int:room_id>/read")
@require_auth
def read_chat_room(room_id: int):
    payload = request.get_json(silent=True) or {}
    result = mark_chat_room_read(
        room_id=room_id,
        user_id=_get_current_user_id(),
        message_id=payload.get("message_id"),
    )
    return jsonify(result), _status_code(result)


@chat_bp.patch("/incidents/<int:incident_id>/chat-room/status")
@require_auth
def update_incident_chat_room_status(incident_id: int):
    payload = request.get_json(silent=True) or {}
    result = close_incident_chat_room_for_status(
        incident_id=incident_id,
        incident_status=payload.get("incident_status"),
    )
    return jsonify(result), _status_code(result)
