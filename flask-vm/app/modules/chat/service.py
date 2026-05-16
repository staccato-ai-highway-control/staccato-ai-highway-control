from datetime import datetime, timezone

from app.extensions import db
from app.models.chat_models import ChatRoom, ChatMessage
from app.models.chat_support_models import ChatRoomMember


def _now():
    """
    현재 UTC 시간을 반환한다.

    DB의 created_at, joined_at 같은 시간 컬럼에 공통으로 사용한다.
    """
    return datetime.now(timezone.utc)


def _response(success: bool, message: str, data=None) -> dict:
    """
    채팅 서비스의 공통 응답 포맷을 생성한다.
    """
    return {
        "success": success,
        "message": message,
        "data": data,
    }


def _ensure_room_member(room_id: int, user_id: int | None, member_role: str = "MEMBER") -> None:
    """
    사용자를 채팅방 멤버로 등록한다.

    이미 참여 중인 멤버가 있으면 중복 생성하지 않는다.
    이 함수에서는 commit하지 않고, 호출한 함수에서 한 번에 commit한다.
    """
    if user_id is None:
        return

    existing_member = ChatRoomMember.query.filter_by(
        room_id=room_id,
        user_id=user_id,
        left_at=None,
    ).first()

    if existing_member:
        return

    member = ChatRoomMember(
        room_id=room_id,
        user_id=user_id,
        member_role=member_role,
        joined_at=_now(),
        left_at=None,
    )

    db.session.add(member)


def get_or_create_chat_room(incident_id: int, user_id: int | None = None) -> dict:
    """
    사고 ID 기준으로 채팅방을 조회하거나 생성한다.

    기존 메모리 딕셔너리 방식과 달리 ChatRoom DB 테이블에 저장한다.
    chat_rooms.id는 autoincrement PK이므로 incident_id와 room_id를 같게 두지 않는다.
    """
    if incident_id is None:
        return _response(False, "incident_id is required", None)

    try:
        room = (
            ChatRoom.query
            .filter_by(
                incident_id=incident_id,
                room_type="INCIDENT",
            )
            .filter(ChatRoom.closed_at.is_(None))
            .first()
        )

        if room is None:
            room = ChatRoom(
                incident_id=incident_id,
                room_type="INCIDENT",
                room_status="OPEN",
                created_by=user_id,
                created_at=_now(),
                closed_at=None,
            )
            db.session.add(room)
            db.session.flush()

        _ensure_room_member(
            room_id=room.id,
            user_id=user_id,
            member_role="CREATOR" if room.created_by == user_id else "MEMBER",
        )

        db.session.commit()

        return _response(
            True,
            "Chat room ready",
            room.to_dict(),
        )

    except Exception as exc:
        db.session.rollback()
        return _response(
            False,
            f"Failed to prepare chat room: {str(exc)}",
            None,
        )


def get_chat_messages(room_id: int) -> dict:
    """
    채팅방 메시지 목록을 조회한다.

    deleted_at이 없는 메시지만 created_at 오름차순으로 반환한다.
    DB 오류가 발생하면 공통 응답 포맷으로 실패 응답을 반환한다.
    """
    if room_id is None:
        return _response(False, "room_id is required", None)

    try:
        room = ChatRoom.query.get(room_id)

        if room is None:
            return _response(False, "Chat room not found", None)

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
            {
                "room_id": room_id,
                "messages": [message.to_dict() for message in messages],
            },
        )

    except Exception as exc:
        return _response(
            False,
            f"Failed to fetch chat messages: {str(exc)}",
            None,
        )

def send_chat_message(room_id: int, sender_id: int | None, content: str) -> dict:
    """
    채팅 메시지를 DB에 저장한다.

    sender_id는 요청 body가 아니라 인증 사용자 정보에서 전달받아야 한다.
    """
    if sender_id is None:
        return _response(False, "sender_id is required", None)

    if not content or not content.strip():
        return _response(False, "content is required", None)

    try:
        room = ChatRoom.query.get(room_id)

        if room is None:
            return _response(False, "Chat room not found", None)

        if room.room_status != "OPEN":
            return _response(False, "Chat room is not open", None)

        _ensure_room_member(
            room_id=room.id,
            user_id=sender_id,
            member_role="MEMBER",
        )

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

        return _response(
            True,
            "Chat message sent",
            chat_message.to_dict(),
        )

    except Exception as exc:
        db.session.rollback()
        return _response(
            False,
            f"Failed to send chat message: {str(exc)}",
            None,
        )
