from datetime import datetime, timezone

from app.extensions import db
from app.models.auth_models import User
from app.models.chat_models import ChatMessage, ChatMessageRead, ChatRoom
from app.models.chat_support_models import ChatRoomMember

INCIDENT_ROOM_TYPE = "INCIDENT"
GENERAL_ROOM_TYPES = {"GROUP", "DM"}
WRITABLE_ROOM_STATUSES = {"OPEN"}
CLOSED_INCIDENT_STATUSES = {"RESOLVED", "CLOSED", "FALSE_POSITIVE"}
ADMIN_ROLES = {"SUPER_ADMIN"}


def _now():
    return datetime.now(timezone.utc)


def _response(success: bool, message: str, data=None) -> dict:
    return {"success": success, "message": message, "data": data}


def _is_super_admin(user) -> bool:
    return getattr(user, "role", None) in ADMIN_ROLES


def _active_member(room_id: int, user_id: int | None):
    if user_id is None:
        return None

    return ChatRoomMember.query.filter_by(
        room_id=room_id,
        user_id=user_id,
        left_at=None,
    ).first()


def _is_room_member(room_id: int, user_id: int | None) -> bool:
    return _active_member(room_id, user_id) is not None


def _ensure_room_member(room_id: int, user_id: int | None, member_role: str = "MEMBER"):
    if user_id is None:
        return None

    existing_member = _active_member(room_id, user_id)
    if existing_member:
        return existing_member

    member = ChatRoomMember(
        room_id=room_id,
        user_id=user_id,
        member_role=member_role,
        joined_at=_now(),
        left_at=None,
    )
    db.session.add(member)
    return member


def _room_members(room_id: int):
    return (
        ChatRoomMember.query
        .filter_by(room_id=room_id, left_at=None)
        .order_by(ChatRoomMember.joined_at.asc())
        .all()
    )


def _room_to_dict(room: ChatRoom, include_members: bool = False) -> dict:
    data = room.to_dict()
    if include_members:
        data["members"] = [member.to_dict() for member in _room_members(room.id)]
    return data


def _find_incident_room(incident_id: int):
    return (
        ChatRoom.query
        .filter_by(incident_id=incident_id, room_type=INCIDENT_ROOM_TYPE)
        .filter(ChatRoom.room_status.in_(["OPEN", "CLOSED"]))
        .order_by(ChatRoom.created_at.asc())
        .first()
    )


def ensure_incident_chat_room(
    incident_id: int,
    control_user_id: int | None = None,
    responder_user_id: int | None = None,
    admin_user_ids: list[int] | None = None,
):
    """Create/fetch an incident room and add lifecycle members without committing."""
    room = _find_incident_room(incident_id)

    if room is None:
        room = ChatRoom(
            incident_id=incident_id,
            room_type=INCIDENT_ROOM_TYPE,
            room_status="OPEN",
            created_by=control_user_id,
            created_at=_now(),
            closed_at=None,
        )
        db.session.add(room)
        db.session.flush()

    _ensure_room_member(room.id, control_user_id, "CONTROL")
    _ensure_room_member(room.id, responder_user_id, "RESPONDER")

    for admin_user_id in admin_user_ids or []:
        _ensure_room_member(room.id, admin_user_id, "ADMIN")

    return room


def close_incident_chat_room(incident_id: int):
    """Close an incident room without committing."""
    room = _find_incident_room(incident_id)
    if room is None:
        return None

    if room.room_status != "CLOSED":
        room.room_status = "CLOSED"
        room.closed_at = _now()

    return room


def sync_incident_chat_room_for_status(incident_id: int, incident_status: str):
    """Close the incident room when the incident reaches a terminal status."""
    if incident_status not in CLOSED_INCIDENT_STATUSES:
        return None
    return close_incident_chat_room(incident_id)


def assign_incident_chat_room(
    incident_id: int,
    control_user_id: int,
    responder_user_id: int,
    admin_user_ids: list[int] | None = None,
) -> dict:
    if incident_id is None:
        return _response(False, "incident_id is required", None)
    if control_user_id is None:
        return _response(False, "control_user_id is required", None)
    if responder_user_id is None:
        return _response(False, "responder_user_id is required", None)

    try:
        room = ensure_incident_chat_room(
            incident_id=incident_id,
            control_user_id=control_user_id,
            responder_user_id=responder_user_id,
            admin_user_ids=admin_user_ids,
        )
        db.session.commit()
        return _response(True, "Incident chat room ready", _room_to_dict(room, include_members=True))
    except Exception as exc:
        db.session.rollback()
        return _response(False, f"Failed to assign incident chat room: {str(exc)}", None)


def close_incident_chat_room_for_status(incident_id: int, incident_status: str) -> dict:
    if incident_id is None:
        return _response(False, "incident_id is required", None)

    try:
        room = sync_incident_chat_room_for_status(incident_id, incident_status)
        db.session.commit()

        if room is None:
            return _response(True, "No incident chat room changed", None)

        return _response(True, "Incident chat room closed", _room_to_dict(room, include_members=True))
    except Exception as exc:
        db.session.rollback()
        return _response(False, f"Failed to close incident chat room: {str(exc)}", None)


def get_or_create_chat_room(incident_id: int, user_id: int | None = None) -> dict:
    if incident_id is None:
        return _response(False, "incident_id is required", None)

    try:
        room = ensure_incident_chat_room(
            incident_id=incident_id,
            control_user_id=user_id,
        )
        db.session.commit()
        return _response(True, "Chat room ready", _room_to_dict(room, include_members=True))
    except Exception as exc:
        db.session.rollback()
        return _response(False, f"Failed to prepare chat room: {str(exc)}", None)


def create_general_chat_room(creator_id: int, room_type: str, member_ids: list[int] | None = None) -> dict:
    if creator_id is None:
        return _response(False, "creator_id is required", None)

    normalized_type = (room_type or "").upper()
    if normalized_type not in GENERAL_ROOM_TYPES:
        return _response(False, "room_type must be GROUP or DM", None)

    unique_member_ids = []
    for member_id in member_ids or []:
        if member_id and member_id != creator_id and member_id not in unique_member_ids:
            unique_member_ids.append(member_id)

    if normalized_type == "DM" and len(unique_member_ids) != 1:
        return _response(False, "DM room requires exactly one other member", None)

    if normalized_type == "GROUP" and not unique_member_ids:
        return _response(False, "GROUP room requires at least one member", None)

    try:
        room = ChatRoom(
            incident_id=None,
            room_type=normalized_type,
            room_status="OPEN",
            created_by=creator_id,
            created_at=_now(),
            closed_at=None,
        )
        db.session.add(room)
        db.session.flush()

        _ensure_room_member(room.id, creator_id, "CREATOR")
        for member_id in unique_member_ids:
            _ensure_room_member(room.id, member_id, "MEMBER")

        db.session.commit()
        return _response(True, "Chat room created", _room_to_dict(room, include_members=True))
    except Exception as exc:
        db.session.rollback()
        return _response(False, f"Failed to create chat room: {str(exc)}", None)


def list_my_chat_rooms(user_id: int) -> dict:
    if user_id is None:
        return _response(False, "user_id is required", None)

    try:
        rooms = (
            ChatRoom.query
            .join(ChatRoomMember, ChatRoom.id == ChatRoomMember.room_id)
            .filter(ChatRoomMember.user_id == user_id)
            .filter(ChatRoomMember.left_at.is_(None))
            .filter(ChatRoom.room_status != "DELETED")
            .order_by(ChatRoom.created_at.desc())
            .all()
        )
        return _response(True, "Chat rooms fetched", [_room_to_dict(room, include_members=True) for room in rooms])
    except Exception as exc:
        return _response(False, f"Failed to fetch chat rooms: {str(exc)}", None)


def get_chat_room_detail(room_id: int, user_id: int) -> dict:
    try:
        room = ChatRoom.query.get(room_id)
        if room is None or room.room_status == "DELETED":
            return _response(False, "Chat room not found", None)

        if not _is_room_member(room.id, user_id):
            return _response(False, "Permission denied", None)

        return _response(True, "Chat room fetched", _room_to_dict(room, include_members=True))
    except Exception as exc:
        return _response(False, f"Failed to fetch chat room: {str(exc)}", None)


def add_chat_room_members(room_id: int, current_user_id: int, member_ids: list[int]) -> dict:
    if not member_ids:
        return _response(False, "member_ids is required", None)

    try:
        room = ChatRoom.query.get(room_id)
        if room is None or room.room_status == "DELETED":
            return _response(False, "Chat room not found", None)

        if not _is_room_member(room.id, current_user_id):
            return _response(False, "Permission denied", None)

        for member_id in member_ids:
            _ensure_room_member(room.id, member_id, "MEMBER")

        db.session.commit()
        return _response(True, "Chat room members added", _room_to_dict(room, include_members=True))
    except Exception as exc:
        db.session.rollback()
        return _response(False, f"Failed to add chat room members: {str(exc)}", None)


def leave_chat_room(room_id: int, user_id: int) -> dict:
    try:
        room = ChatRoom.query.get(room_id)
        if room is None or room.room_status == "DELETED":
            return _response(False, "Chat room not found", None)

        member = _active_member(room.id, user_id)
        if member is None:
            return _response(False, "Permission denied", None)

        member.left_at = _now()
        db.session.commit()
        return _response(True, "Left chat room", _room_to_dict(room, include_members=True))
    except Exception as exc:
        db.session.rollback()
        return _response(False, f"Failed to leave chat room: {str(exc)}", None)


def delete_chat_room(room_id: int, user) -> dict:
    try:
        room = ChatRoom.query.get(room_id)
        if room is None or room.room_status == "DELETED":
            return _response(False, "Chat room not found", None)

        if room.room_type == INCIDENT_ROOM_TYPE:
            return _response(False, "Incident chat room cannot be deleted", None)

        if room.created_by != user.id and not _is_super_admin(user):
            return _response(False, "Permission denied", None)

        room.room_status = "DELETED"
        if room.closed_at is None:
            room.closed_at = _now()

        db.session.commit()
        return _response(True, "Chat room deleted", _room_to_dict(room, include_members=True))
    except Exception as exc:
        db.session.rollback()
        return _response(False, f"Failed to delete chat room: {str(exc)}", None)


def get_chat_messages(room_id: int, user_id: int | None = None) -> dict:
    if room_id is None:
        return _response(False, "room_id is required", None)

    try:
        room = ChatRoom.query.get(room_id)
        if room is None or room.room_status == "DELETED":
            return _response(False, "Chat room not found", None)

        if user_id is not None and not _is_room_member(room.id, user_id):
            return _response(False, "Permission denied", None)

        messages = (
            ChatMessage.query
            .filter_by(room_id=room_id)
            .filter(ChatMessage.deleted_at.is_(None))
            .order_by(ChatMessage.created_at.asc())
            .all()
        )

        return _response(
            True,
            "Chat messages fetched",
            {"room_id": room_id, "messages": [message.to_dict() for message in messages]},
        )
    except Exception as exc:
        return _response(False, f"Failed to fetch chat messages: {str(exc)}", None)


def send_chat_message(room_id: int, sender_id: int | None, content: str) -> dict:
    if sender_id is None:
        return _response(False, "sender_id is required", None)

    if not content or not content.strip():
        return _response(False, "content is required", None)

    try:
        room = ChatRoom.query.get(room_id)
        if room is None or room.room_status == "DELETED":
            return _response(False, "Chat room not found", None)

        if not _is_room_member(room.id, sender_id):
            return _response(False, "Permission denied", None)

        if room.room_status not in WRITABLE_ROOM_STATUSES:
            return _response(False, "Chat room is not open", None)

        chat_message = ChatMessage(
            room_id=room.id,
            incident_id=room.incident_id,
            sender_user_id=sender_id,
            message_type="TEXT",
            message=content.strip(),
            attachment_id=None,
            created_at=_now(),
            deleted_at=None,
        )

        db.session.add(chat_message)
        db.session.commit()
        return _response(True, "Chat message sent", chat_message.to_dict())
    except Exception as exc:
        db.session.rollback()
        return _response(False, f"Failed to send chat message: {str(exc)}", None)


def delete_chat_message(room_id: int, message_id: int, user_id: int) -> dict:
    try:
        room = ChatRoom.query.get(room_id)
        if room is None or room.room_status == "DELETED":
            return _response(False, "Chat room not found", None)

        if not _is_room_member(room.id, user_id):
            return _response(False, "Permission denied", None)

        message = ChatMessage.query.filter_by(id=message_id, room_id=room_id).first()
        if message is None or message.deleted_at is not None:
            return _response(False, "Chat message not found", None)

        if message.sender_user_id != user_id:
            user = User.query.get(user_id)
            if not _is_super_admin(user):
                return _response(False, "Permission denied", None)

        message.deleted_at = _now()
        db.session.commit()
        return _response(True, "Chat message deleted", message.to_dict())
    except Exception as exc:
        db.session.rollback()
        return _response(False, f"Failed to delete chat message: {str(exc)}", None)


def mark_chat_room_read(room_id: int, user_id: int, message_id: int | None = None) -> dict:
    try:
        room = ChatRoom.query.get(room_id)
        if room is None or room.room_status == "DELETED":
            return _response(False, "Chat room not found", None)

        if not _is_room_member(room.id, user_id):
            return _response(False, "Permission denied", None)

        query = (
            ChatMessage.query
            .filter_by(room_id=room_id)
            .filter(ChatMessage.deleted_at.is_(None))
        )

        if message_id is None:
            target_message = query.order_by(ChatMessage.created_at.desc()).first()
        else:
            target_message = query.filter(ChatMessage.id == message_id).first()

        if target_message is None:
            return _response(True, "No messages to mark as read", {"room_id": room_id, "read_count": 0})

        readable_messages = (
            ChatMessage.query
            .filter_by(room_id=room_id)
            .filter(ChatMessage.deleted_at.is_(None))
            .filter(ChatMessage.created_at <= target_message.created_at)
            .all()
        )

        read_count = 0
        for message in readable_messages:
            existing_read = ChatMessageRead.query.filter_by(
                message_id=message.id,
                user_id=user_id,
            ).first()
            if existing_read:
                continue

            db.session.add(ChatMessageRead(
                message_id=message.id,
                user_id=user_id,
                read_at=_now(),
            ))
            read_count += 1

        db.session.commit()
        return _response(
            True,
            "Chat room marked as read",
            {"room_id": room_id, "message_id": target_message.id, "read_count": read_count},
        )
    except Exception as exc:
        db.session.rollback()
        return _response(False, f"Failed to mark chat room as read: {str(exc)}", None)
