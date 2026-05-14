from datetime import datetime, timezone

_chat_rooms: dict[int, dict] = {}
_chat_messages: dict[int, list[dict]] = {}


def get_or_create_chat_room(incident_id: int) -> dict:
    room_id = incident_id

    if room_id not in _chat_rooms:
        _chat_rooms[room_id] = {
            "id": room_id,
            "incident_id": incident_id,
            "title": f"Incident {incident_id} Chat Room",
            "status": "OPEN",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        _chat_messages[room_id] = []

    return {
        "success": True,
        "message": "Chat room ready",
        "data": _chat_rooms[room_id],
    }


def get_chat_messages(room_id: int) -> dict:
    return {
        "success": True,
        "message": "Chat messages fetched",
        "data": {
            "room_id": room_id,
            "messages": _chat_messages.get(room_id, []),
        },
    }


def send_chat_message(room_id: int, sender_id: int | None, content: str) -> dict:
    if not content or not content.strip():
        return {
            "success": False,
            "message": "content is required",
            "data": None,
        }

    if room_id not in _chat_rooms:
        _chat_rooms[room_id] = {
            "id": room_id,
            "incident_id": room_id,
            "title": f"Incident {room_id} Chat Room",
            "status": "OPEN",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        _chat_messages[room_id] = []

    message = {
        "id": len(_chat_messages[room_id]) + 1,
        "room_id": room_id,
        "sender_id": sender_id,
        "content": content.strip(),
        "message_type": "TEXT",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    _chat_messages[room_id].append(message)

    return {
        "success": True,
        "message": "Chat message sent",
        "data": message,
    }
