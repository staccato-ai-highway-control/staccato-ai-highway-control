"""chat 도메인의 핵심 비즈니스 규칙과 데이터 처리를 구현한다.

권한 검증, 트랜잭션 경계, 외부 연동 및 응답 직렬화를 라우트와 분리해 관리한다."""

# 설명: datetime에서 datetime, timezone 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime, timezone

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.models.auth_models에서 User 이름을 가져와 아래 로직에서 재사용한다.
from app.models.auth_models import User
# 설명: app.models.chat_models에서 ChatMessage, ChatMessageRead, ChatRoom 이름을 가져와 아래 로직에서 재사용한다.
from app.models.chat_models import ChatMessage, ChatMessageRead, ChatRoom
# 설명: app.models.chat_support_models에서 ChatRoomMember 이름을 가져와 아래 로직에서 재사용한다.
from app.models.chat_support_models import ChatRoomMember

# 채팅방 상태는 기존 모델 필드(room_status, closed_at)만 사용한다.
INCIDENT_ROOM_TYPE = "INCIDENT"
# 설명: `GENERAL_ROOM_TYPES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
GENERAL_ROOM_TYPES = {"GROUP", "DM"}
# 설명: `WRITABLE_ROOM_STATUSES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
WRITABLE_ROOM_STATUSES = {"OPEN"}
# 설명: `CLOSED_INCIDENT_STATUSES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
CLOSED_INCIDENT_STATUSES = {"RESOLVED", "CLOSED", "FALSE_POSITIVE"}
# 설명: `ADMIN_ROLES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
ADMIN_ROLES = {"SUPER_ADMIN"}


# 설명: `_now` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _now():
    # 설명: 호출자에게 datetime.now(timezone.utc) 값을 함수 결과로 반환한다.
    return datetime.now(timezone.utc)


# 설명: `_response` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _response(success: bool, message: str, data=None) -> dict:
    # 설명: 호출자에게 {'success': success, 'message': message, 'data': data} 값을 함수 결과로 반환한다.
    return {"success": success, "message": message, "data": data}


# 설명: `_is_super_admin` 함수는 조건의 참/거짓을 판정하는 함수다.
def _is_super_admin(user) -> bool:
    # 설명: 호출자에게 getattr(user, 'role', None) in ADMIN_ROLES 값을 함수 결과로 반환한다.
    return getattr(user, "role", None) in ADMIN_ROLES


# 설명: `_active_member` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _active_member(room_id: int, user_id: int | None):
    """left_at이 없는 현재 참여자만 유효 멤버로 본다."""
    # 설명: `user_id is None` 조건 결과에 따라 실행 경로를 분기한다.
    if user_id is None:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: 호출자에게 ChatRoomMember.query.filter_by(room_id=room_id, user_id=user_id, left_at=None).... 값을 함수 결과로 반환한다.
    return ChatRoomMember.query.filter_by(
        room_id=room_id,
        user_id=user_id,
        left_at=None,
    ).first()


# 설명: `_is_room_member` 함수는 조건의 참/거짓을 판정하는 함수다.
def _is_room_member(room_id: int, user_id: int | None) -> bool:
    # 설명: 호출자에게 _active_member(room_id, user_id) is not None 값을 함수 결과로 반환한다.
    return _active_member(room_id, user_id) is not None


# 설명: `_ensure_room_member` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _ensure_room_member(room_id: int, user_id: int | None, member_role: str = "MEMBER"):
    """멤버를 중복 생성하지 않고 필요할 때만 추가한다. commit은 호출자가 관리한다."""
    # 설명: `user_id is None` 조건 결과에 따라 실행 경로를 분기한다.
    if user_id is None:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `existing_member`에 `_active_member` 호출 결과를 저장해 다음 처리에서 사용한다.
    existing_member = _active_member(room_id, user_id)
    # 설명: `existing_member` 조건 결과에 따라 실행 경로를 분기한다.
    if existing_member:
        # 설명: 호출자에게 existing_member 값을 함수 결과로 반환한다.
        return existing_member

    # 설명: `member`에 `ChatRoomMember` 호출 결과를 저장해 다음 처리에서 사용한다.
    member = ChatRoomMember(
        room_id=room_id,
        user_id=user_id,
        member_role=member_role,
        joined_at=_now(),
        left_at=None,
    )
    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(member)
    # 설명: 호출자에게 member 값을 함수 결과로 반환한다.
    return member


# 설명: `_room_members` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _room_members(room_id: int):
    # 설명: 호출자에게 ChatRoomMember.query.filter_by(room_id=room_id, left_at=None).order_by(ChatRoom... 값을 함수 결과로 반환한다.
    return (
        ChatRoomMember.query
        .filter_by(room_id=room_id, left_at=None)
        .order_by(ChatRoomMember.joined_at.asc())
        .all()
    )


# 설명: `_room_to_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _room_to_dict(room: ChatRoom, include_members: bool = False) -> dict:
    # 설명: `data`에 `room.to_dict` 호출 결과를 저장해 다음 처리에서 사용한다.
    data = room.to_dict()
    # 설명: `include_members` 조건 결과에 따라 실행 경로를 분기한다.
    if include_members:
        # 설명: `data['members']`에 [member.to_dict() for member in _room_members(room.id)] 표현식의 계산 결과를 저장한다.
        data["members"] = [member.to_dict() for member in _room_members(room.id)]
    # 설명: 호출자에게 data 값을 함수 결과로 반환한다.
    return data


# 설명: `_find_incident_room` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _find_incident_room(incident_id: int):
    """사건 이력 보존을 위해 OPEN/CLOSED INCIDENT 방은 재사용한다."""
    # 설명: 호출자에게 ChatRoom.query.filter_by(incident_id=incident_id, room_type=INCIDENT_ROOM_TYPE)... 값을 함수 결과로 반환한다.
    return (
        ChatRoom.query
        .filter_by(incident_id=incident_id, room_type=INCIDENT_ROOM_TYPE)
        .filter(ChatRoom.room_status.in_(["OPEN", "CLOSED"]))
        .order_by(ChatRoom.created_at.asc())
        .first()
    )


# 설명: `ensure_incident_chat_room` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def ensure_incident_chat_room(
    incident_id: int,
    control_user_id: int | None = None,
    responder_user_id: int | None = None,
    admin_user_ids: list[int] | None = None,
):
    """사건 방을 준비하고 lifecycle 멤버를 추가한다. 외부 트랜잭션 결합을 위해 commit하지 않는다."""
    # 설명: `room`에 `_find_incident_room` 호출 결과를 저장해 다음 처리에서 사용한다.
    room = _find_incident_room(incident_id)

    # 설명: `room is None` 조건 결과에 따라 실행 경로를 분기한다.
    if room is None:
        # 설명: `room`에 `ChatRoom` 호출 결과를 저장해 다음 처리에서 사용한다.
        room = ChatRoom(
            incident_id=incident_id,
            room_type=INCIDENT_ROOM_TYPE,
            room_status="OPEN",
            created_by=control_user_id,
            created_at=_now(),
            closed_at=None,
        )
        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(room)
        # 설명: `db.session.flush`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        db.session.flush()

    # 설명: `_ensure_room_member`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    _ensure_room_member(room.id, control_user_id, "CONTROL")
    # 설명: `_ensure_room_member`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    _ensure_room_member(room.id, responder_user_id, "RESPONDER")

    # 설명: `admin_user_ids or []`의 각 항목을 `admin_user_id`로 받아 반복 처리한다.
    for admin_user_id in admin_user_ids or []:
        # 설명: `_ensure_room_member`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _ensure_room_member(room.id, admin_user_id, "ADMIN")

    # 설명: 호출자에게 room 값을 함수 결과로 반환한다.
    return room


# 설명: `close_incident_chat_room` 함수는 대상을 종료 상태로 전환하는 함수다.
def close_incident_chat_room(incident_id: int):
    """사건 방을 CLOSED 처리한다. 외부 트랜잭션 결합을 위해 commit하지 않는다."""
    # 설명: `room`에 `_find_incident_room` 호출 결과를 저장해 다음 처리에서 사용한다.
    room = _find_incident_room(incident_id)
    # 설명: `room is None` 조건 결과에 따라 실행 경로를 분기한다.
    if room is None:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `room.room_status != 'CLOSED'` 조건 결과에 따라 실행 경로를 분기한다.
    if room.room_status != "CLOSED":
        # 설명: `room.room_status`의 기준값 또는 기본값을 'CLOSED'로 설정한다.
        room.room_status = "CLOSED"
        # 설명: `room.closed_at`에 `_now` 호출 결과를 저장해 다음 처리에서 사용한다.
        room.closed_at = _now()

    # 설명: 호출자에게 room 값을 함수 결과로 반환한다.
    return room


# 설명: `sync_incident_chat_room_for_status` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def sync_incident_chat_room_for_status(incident_id: int, incident_status: str):
    """사건 상태가 종료 계열이면 연결된 채팅방도 CLOSED로 동기화한다."""
    # 설명: `incident_status not in CLOSED_INCIDENT_STATUSES` 조건 결과에 따라 실행 경로를 분기한다.
    if incident_status not in CLOSED_INCIDENT_STATUSES:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None
    # 설명: 호출자에게 close_incident_chat_room(incident_id) 값을 함수 결과로 반환한다.
    return close_incident_chat_room(incident_id)


# 설명: `assign_incident_chat_room` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def assign_incident_chat_room(
    incident_id: int,
    control_user_id: int,
    responder_user_id: int,
    admin_user_ids: list[int] | None = None,
) -> dict:
    """담당자 배정 API용 래퍼. 방 생성과 멤버 추가를 한 번에 commit한다."""
    # 설명: `incident_id is None` 조건 결과에 따라 실행 경로를 분기한다.
    if incident_id is None:
        # 설명: 호출자에게 _response(False, 'incident_id is required', None) 값을 함수 결과로 반환한다.
        return _response(False, "incident_id is required", None)
    # 설명: `control_user_id is None` 조건 결과에 따라 실행 경로를 분기한다.
    if control_user_id is None:
        # 설명: 호출자에게 _response(False, 'control_user_id is required', None) 값을 함수 결과로 반환한다.
        return _response(False, "control_user_id is required", None)
    # 설명: `responder_user_id is None` 조건 결과에 따라 실행 경로를 분기한다.
    if responder_user_id is None:
        # 설명: 호출자에게 _response(False, 'responder_user_id is required', None) 값을 함수 결과로 반환한다.
        return _response(False, "responder_user_id is required", None)

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `room`에 `ensure_incident_chat_room` 호출 결과를 저장해 다음 처리에서 사용한다.
        room = ensure_incident_chat_room(
            incident_id=incident_id,
            control_user_id=control_user_id,
            responder_user_id=responder_user_id,
            admin_user_ids=admin_user_ids,
        )
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
        # 설명: 호출자에게 _response(True, 'Incident chat room ready', _room_to_dict(room, include_members... 값을 함수 결과로 반환한다.
        return _response(True, "Incident chat room ready", _room_to_dict(room, include_members=True))
    except Exception as exc:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()
        # 설명: 호출자에게 _response(False, f'Failed to assign incident chat room: {str(exc)}', None) 값을 함수 결과로 반환한다.
        return _response(False, f"Failed to assign incident chat room: {str(exc)}", None)


# 설명: `close_incident_chat_room_for_status` 함수는 대상을 종료 상태로 전환하는 함수다.
def close_incident_chat_room_for_status(incident_id: int, incident_status: str) -> dict:
    # 설명: `incident_id is None` 조건 결과에 따라 실행 경로를 분기한다.
    if incident_id is None:
        # 설명: 호출자에게 _response(False, 'incident_id is required', None) 값을 함수 결과로 반환한다.
        return _response(False, "incident_id is required", None)

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `room`에 `sync_incident_chat_room_for_status` 호출 결과를 저장해 다음 처리에서 사용한다.
        room = sync_incident_chat_room_for_status(incident_id, incident_status)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: `room is None` 조건 결과에 따라 실행 경로를 분기한다.
        if room is None:
            # 설명: 호출자에게 _response(True, 'No incident chat room changed', None) 값을 함수 결과로 반환한다.
            return _response(True, "No incident chat room changed", None)

        # 설명: 호출자에게 _response(True, 'Incident chat room closed', _room_to_dict(room, include_member... 값을 함수 결과로 반환한다.
        return _response(True, "Incident chat room closed", _room_to_dict(room, include_members=True))
    except Exception as exc:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()
        # 설명: 호출자에게 _response(False, f'Failed to close incident chat room: {str(exc)}', None) 값을 함수 결과로 반환한다.
        return _response(False, f"Failed to close incident chat room: {str(exc)}", None)


# 설명: `get_or_create_chat_room` 함수는 단일 값이나 리소스를 조회하는 함수다.
def get_or_create_chat_room(incident_id: int, user_id: int | None = None) -> dict:
    """기존 사고 채팅방 생성 API 호환용 서비스 함수다."""
    # 설명: `incident_id is None` 조건 결과에 따라 실행 경로를 분기한다.
    if incident_id is None:
        # 설명: 호출자에게 _response(False, 'incident_id is required', None) 값을 함수 결과로 반환한다.
        return _response(False, "incident_id is required", None)

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `room`에 `ensure_incident_chat_room` 호출 결과를 저장해 다음 처리에서 사용한다.
        room = ensure_incident_chat_room(
            incident_id=incident_id,
            control_user_id=user_id,
        )
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
        # 설명: 호출자에게 _response(True, 'Chat room ready', _room_to_dict(room, include_members=True)) 값을 함수 결과로 반환한다.
        return _response(True, "Chat room ready", _room_to_dict(room, include_members=True))
    except Exception as exc:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()
        # 설명: 호출자에게 _response(False, f'Failed to prepare chat room: {str(exc)}', None) 값을 함수 결과로 반환한다.
        return _response(False, f"Failed to prepare chat room: {str(exc)}", None)


# 설명: `create_general_chat_room` 함수는 새 데이터나 리소스를 생성하는 함수다.
def create_general_chat_room(creator_id: int, room_type: str, member_ids: list[int] | None = None) -> dict:
    """사건과 무관한 GROUP/DM 방을 만들고 생성자를 CREATOR 멤버로 등록한다."""
    # 설명: `creator_id is None` 조건 결과에 따라 실행 경로를 분기한다.
    if creator_id is None:
        # 설명: 호출자에게 _response(False, 'creator_id is required', None) 값을 함수 결과로 반환한다.
        return _response(False, "creator_id is required", None)

    # 설명: `normalized_type`에 `(room_type or '').upper` 호출 결과를 저장해 다음 처리에서 사용한다.
    normalized_type = (room_type or "").upper()
    # 설명: `normalized_type not in GENERAL_ROOM_TYPES` 조건 결과에 따라 실행 경로를 분기한다.
    if normalized_type not in GENERAL_ROOM_TYPES:
        # 설명: 호출자에게 _response(False, 'room_type must be GROUP or DM', None) 값을 함수 결과로 반환한다.
        return _response(False, "room_type must be GROUP or DM", None)

    # 설명: `unique_member_ids`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    unique_member_ids = []
    # 설명: `member_ids or []`의 각 항목을 `member_id`로 받아 반복 처리한다.
    for member_id in member_ids or []:
        # 설명: `member_id and member_id != creator_id and (member_id not in unique_member_ids)` 조건 결과에 따라 실행 경로를 분기한다.
        if member_id and member_id != creator_id and member_id not in unique_member_ids:
            # 설명: `unique_member_ids.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
            unique_member_ids.append(member_id)

    # 설명: `normalized_type == 'DM' and len(unique_member_ids) != 1` 조건 결과에 따라 실행 경로를 분기한다.
    if normalized_type == "DM" and len(unique_member_ids) != 1:
        # 설명: 호출자에게 _response(False, 'DM room requires exactly one other member', None) 값을 함수 결과로 반환한다.
        return _response(False, "DM room requires exactly one other member", None)

    # 설명: `normalized_type == 'GROUP' and (not unique_member_ids)` 조건 결과에 따라 실행 경로를 분기한다.
    if normalized_type == "GROUP" and not unique_member_ids:
        # 설명: 호출자에게 _response(False, 'GROUP room requires at least one member', None) 값을 함수 결과로 반환한다.
        return _response(False, "GROUP room requires at least one member", None)

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `room`에 `ChatRoom` 호출 결과를 저장해 다음 처리에서 사용한다.
        room = ChatRoom(
            incident_id=None,
            room_type=normalized_type,
            room_status="OPEN",
            created_by=creator_id,
            created_at=_now(),
            closed_at=None,
        )
        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(room)
        # 설명: `db.session.flush`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        db.session.flush()

        # 설명: `_ensure_room_member`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _ensure_room_member(room.id, creator_id, "CREATOR")
        # 설명: `unique_member_ids`의 각 항목을 `member_id`로 받아 반복 처리한다.
        for member_id in unique_member_ids:
            # 설명: `_ensure_room_member`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            _ensure_room_member(room.id, member_id, "MEMBER")

        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
        # 설명: 호출자에게 _response(True, 'Chat room created', _room_to_dict(room, include_members=True)) 값을 함수 결과로 반환한다.
        return _response(True, "Chat room created", _room_to_dict(room, include_members=True))
    except Exception as exc:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()
        # 설명: 호출자에게 _response(False, f'Failed to create chat room: {str(exc)}', None) 값을 함수 결과로 반환한다.
        return _response(False, f"Failed to create chat room: {str(exc)}", None)


# 설명: `list_my_chat_rooms` 함수는 조건에 맞는 목록을 조회하는 함수다.
def list_my_chat_rooms(user_id: int) -> dict:
    """내가 현재 참여 중이고 DELETED가 아닌 채팅방만 반환한다."""
    # 설명: `user_id is None` 조건 결과에 따라 실행 경로를 분기한다.
    if user_id is None:
        # 설명: 호출자에게 _response(False, 'user_id is required', None) 값을 함수 결과로 반환한다.
        return _response(False, "user_id is required", None)

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `rooms`에 `ChatRoom.query.join(ChatRoomMember, ChatRoom.id == ChatRoomMember.r...` 호출 결과를 저장해 다음 처리에서 사용한다.
        rooms = (
            ChatRoom.query
            .join(ChatRoomMember, ChatRoom.id == ChatRoomMember.room_id)
            .filter(ChatRoomMember.user_id == user_id)
            .filter(ChatRoomMember.left_at.is_(None))
            .filter(ChatRoom.room_status != "DELETED")
            .order_by(ChatRoom.created_at.desc())
            .all()
        )
        # 설명: 호출자에게 _response(True, 'Chat rooms fetched', [_room_to_dict(room, include_members=True... 값을 함수 결과로 반환한다.
        return _response(True, "Chat rooms fetched", [_room_to_dict(room, include_members=True) for room in rooms])
    except Exception as exc:
        # 설명: 호출자에게 _response(False, f'Failed to fetch chat rooms: {str(exc)}', None) 값을 함수 결과로 반환한다.
        return _response(False, f"Failed to fetch chat rooms: {str(exc)}", None)


# 설명: `get_chat_room_detail` 함수는 단일 값이나 리소스를 조회하는 함수다.
def get_chat_room_detail(room_id: int, user_id: int) -> dict:
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `room`에 `ChatRoom.query.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        room = ChatRoom.query.get(room_id)
        # 설명: `room is None or room.room_status == 'DELETED'` 조건 결과에 따라 실행 경로를 분기한다.
        if room is None or room.room_status == "DELETED":
            # 설명: 호출자에게 _response(False, 'Chat room not found', None) 값을 함수 결과로 반환한다.
            return _response(False, "Chat room not found", None)

        # 설명: `not _is_room_member(room.id, user_id)` 조건 결과에 따라 실행 경로를 분기한다.
        if not _is_room_member(room.id, user_id):
            # 설명: 호출자에게 _response(False, 'Permission denied', None) 값을 함수 결과로 반환한다.
            return _response(False, "Permission denied", None)

        # 설명: 호출자에게 _response(True, 'Chat room fetched', _room_to_dict(room, include_members=True)) 값을 함수 결과로 반환한다.
        return _response(True, "Chat room fetched", _room_to_dict(room, include_members=True))
    except Exception as exc:
        # 설명: 호출자에게 _response(False, f'Failed to fetch chat room: {str(exc)}', None) 값을 함수 결과로 반환한다.
        return _response(False, f"Failed to fetch chat room: {str(exc)}", None)


# 설명: `add_chat_room_members` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def add_chat_room_members(room_id: int, current_user_id: int, member_ids: list[int]) -> dict:
    # 설명: `not member_ids` 조건 결과에 따라 실행 경로를 분기한다.
    if not member_ids:
        # 설명: 호출자에게 _response(False, 'member_ids is required', None) 값을 함수 결과로 반환한다.
        return _response(False, "member_ids is required", None)

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `room`에 `ChatRoom.query.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        room = ChatRoom.query.get(room_id)
        # 설명: `room is None or room.room_status == 'DELETED'` 조건 결과에 따라 실행 경로를 분기한다.
        if room is None or room.room_status == "DELETED":
            # 설명: 호출자에게 _response(False, 'Chat room not found', None) 값을 함수 결과로 반환한다.
            return _response(False, "Chat room not found", None)

        # 설명: `not _is_room_member(room.id, current_user_id)` 조건 결과에 따라 실행 경로를 분기한다.
        if not _is_room_member(room.id, current_user_id):
            # 설명: 호출자에게 _response(False, 'Permission denied', None) 값을 함수 결과로 반환한다.
            return _response(False, "Permission denied", None)

        # 설명: `member_ids`의 각 항목을 `member_id`로 받아 반복 처리한다.
        for member_id in member_ids:
            # 설명: `_ensure_room_member`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            _ensure_room_member(room.id, member_id, "MEMBER")

        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
        # 설명: 호출자에게 _response(True, 'Chat room members added', _room_to_dict(room, include_members=... 값을 함수 결과로 반환한다.
        return _response(True, "Chat room members added", _room_to_dict(room, include_members=True))
    except Exception as exc:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()
        # 설명: 호출자에게 _response(False, f'Failed to add chat room members: {str(exc)}', None) 값을 함수 결과로 반환한다.
        return _response(False, f"Failed to add chat room members: {str(exc)}", None)


# 설명: `leave_chat_room` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def leave_chat_room(room_id: int, user_id: int) -> dict:
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `room`에 `ChatRoom.query.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        room = ChatRoom.query.get(room_id)
        # 설명: `room is None or room.room_status == 'DELETED'` 조건 결과에 따라 실행 경로를 분기한다.
        if room is None or room.room_status == "DELETED":
            # 설명: 호출자에게 _response(False, 'Chat room not found', None) 값을 함수 결과로 반환한다.
            return _response(False, "Chat room not found", None)

        # 설명: `member`에 `_active_member` 호출 결과를 저장해 다음 처리에서 사용한다.
        member = _active_member(room.id, user_id)
        # 설명: `member is None` 조건 결과에 따라 실행 경로를 분기한다.
        if member is None:
            # 설명: 호출자에게 _response(False, 'Permission denied', None) 값을 함수 결과로 반환한다.
            return _response(False, "Permission denied", None)

        # 설명: `member.left_at`에 `_now` 호출 결과를 저장해 다음 처리에서 사용한다.
        member.left_at = _now()
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
        # 설명: 호출자에게 _response(True, 'Left chat room', _room_to_dict(room, include_members=True)) 값을 함수 결과로 반환한다.
        return _response(True, "Left chat room", _room_to_dict(room, include_members=True))
    except Exception as exc:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()
        # 설명: 호출자에게 _response(False, f'Failed to leave chat room: {str(exc)}', None) 값을 함수 결과로 반환한다.
        return _response(False, f"Failed to leave chat room: {str(exc)}", None)


# 설명: `delete_chat_room` 함수는 대상을 삭제 또는 소프트 삭제 처리하는 함수다.
def delete_chat_room(room_id: int, user) -> dict:
    """일반 채팅방만 room_status=DELETED로 soft delete한다. INCIDENT 방은 삭제 금지다."""
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `room`에 `ChatRoom.query.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        room = ChatRoom.query.get(room_id)
        # 설명: `room is None or room.room_status == 'DELETED'` 조건 결과에 따라 실행 경로를 분기한다.
        if room is None or room.room_status == "DELETED":
            # 설명: 호출자에게 _response(False, 'Chat room not found', None) 값을 함수 결과로 반환한다.
            return _response(False, "Chat room not found", None)

        # 설명: `room.room_type == INCIDENT_ROOM_TYPE` 조건 결과에 따라 실행 경로를 분기한다.
        if room.room_type == INCIDENT_ROOM_TYPE:
            # 설명: 호출자에게 _response(False, 'Incident chat room cannot be deleted', None) 값을 함수 결과로 반환한다.
            return _response(False, "Incident chat room cannot be deleted", None)

        # 설명: `room.created_by != user.id and (not _is_super_admin(user))` 조건 결과에 따라 실행 경로를 분기한다.
        if room.created_by != user.id and not _is_super_admin(user):
            # 설명: 호출자에게 _response(False, 'Permission denied', None) 값을 함수 결과로 반환한다.
            return _response(False, "Permission denied", None)

        # 설명: `room.room_status`의 기준값 또는 기본값을 'DELETED'로 설정한다.
        room.room_status = "DELETED"
        # 설명: `room.closed_at is None` 조건 결과에 따라 실행 경로를 분기한다.
        if room.closed_at is None:
            # 설명: `room.closed_at`에 `_now` 호출 결과를 저장해 다음 처리에서 사용한다.
            room.closed_at = _now()

        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
        # 설명: 호출자에게 _response(True, 'Chat room deleted', _room_to_dict(room, include_members=True)) 값을 함수 결과로 반환한다.
        return _response(True, "Chat room deleted", _room_to_dict(room, include_members=True))
    except Exception as exc:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()
        # 설명: 호출자에게 _response(False, f'Failed to delete chat room: {str(exc)}', None) 값을 함수 결과로 반환한다.
        return _response(False, f"Failed to delete chat room: {str(exc)}", None)


# 설명: `get_chat_messages` 함수는 단일 값이나 리소스를 조회하는 함수다.
def get_chat_messages(room_id: int, user_id: int | None = None) -> dict:
    """참여자만 메시지 이력을 조회한다. CLOSED 방도 조회는 허용한다."""
    # 설명: `room_id is None` 조건 결과에 따라 실행 경로를 분기한다.
    if room_id is None:
        # 설명: 호출자에게 _response(False, 'room_id is required', None) 값을 함수 결과로 반환한다.
        return _response(False, "room_id is required", None)

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `room`에 `ChatRoom.query.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        room = ChatRoom.query.get(room_id)
        # 설명: `room is None or room.room_status == 'DELETED'` 조건 결과에 따라 실행 경로를 분기한다.
        if room is None or room.room_status == "DELETED":
            # 설명: 호출자에게 _response(False, 'Chat room not found', None) 값을 함수 결과로 반환한다.
            return _response(False, "Chat room not found", None)

        # 설명: `user_id is not None and (not _is_room_member(room.id, user_id))` 조건 결과에 따라 실행 경로를 분기한다.
        if user_id is not None and not _is_room_member(room.id, user_id):
            # 설명: 호출자에게 _response(False, 'Permission denied', None) 값을 함수 결과로 반환한다.
            return _response(False, "Permission denied", None)

        # 설명: `messages`에 `ChatMessage.query.filter_by(room_id=room_id).filter(ChatMessage.del...` 호출 결과를 저장해 다음 처리에서 사용한다.
        messages = (
            ChatMessage.query
            .filter_by(room_id=room_id)
            .filter(ChatMessage.deleted_at.is_(None))
            .order_by(ChatMessage.created_at.asc())
            .all()
        )

        # 설명: 호출자에게 _response(True, 'Chat messages fetched', {'room_id': room_id, 'messages': [mess... 값을 함수 결과로 반환한다.
        return _response(
            True,
            "Chat messages fetched",
            {"room_id": room_id, "messages": [message.to_dict() for message in messages]},
        )
    except Exception as exc:
        # 설명: 호출자에게 _response(False, f'Failed to fetch chat messages: {str(exc)}', None) 값을 함수 결과로 반환한다.
        return _response(False, f"Failed to fetch chat messages: {str(exc)}", None)


# 설명: `send_chat_message` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def send_chat_message(room_id: int, sender_id: int | None, content: str) -> dict:
    """참여자만 OPEN 방에 메시지를 저장한다. CLOSED/DELETED 방은 전송 차단한다."""
    # 설명: `sender_id is None` 조건 결과에 따라 실행 경로를 분기한다.
    if sender_id is None:
        # 설명: 호출자에게 _response(False, 'sender_id is required', None) 값을 함수 결과로 반환한다.
        return _response(False, "sender_id is required", None)

    # 설명: `not content or not content.strip()` 조건 결과에 따라 실행 경로를 분기한다.
    if not content or not content.strip():
        # 설명: 호출자에게 _response(False, 'content is required', None) 값을 함수 결과로 반환한다.
        return _response(False, "content is required", None)

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `room`에 `ChatRoom.query.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        room = ChatRoom.query.get(room_id)
        # 설명: `room is None or room.room_status == 'DELETED'` 조건 결과에 따라 실행 경로를 분기한다.
        if room is None or room.room_status == "DELETED":
            # 설명: 호출자에게 _response(False, 'Chat room not found', None) 값을 함수 결과로 반환한다.
            return _response(False, "Chat room not found", None)

        # 설명: `not _is_room_member(room.id, sender_id)` 조건 결과에 따라 실행 경로를 분기한다.
        if not _is_room_member(room.id, sender_id):
            # 설명: 호출자에게 _response(False, 'Permission denied', None) 값을 함수 결과로 반환한다.
            return _response(False, "Permission denied", None)

        # 설명: `room.room_status not in WRITABLE_ROOM_STATUSES` 조건 결과에 따라 실행 경로를 분기한다.
        if room.room_status not in WRITABLE_ROOM_STATUSES:
            # 설명: 호출자에게 _response(False, 'Chat room is not open', None) 값을 함수 결과로 반환한다.
            return _response(False, "Chat room is not open", None)

        # 설명: `chat_message`에 `ChatMessage` 호출 결과를 저장해 다음 처리에서 사용한다.
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

        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(chat_message)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
        # 설명: 호출자에게 _response(True, 'Chat message sent', chat_message.to_dict()) 값을 함수 결과로 반환한다.
        return _response(True, "Chat message sent", chat_message.to_dict())
    except Exception as exc:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()
        # 설명: 호출자에게 _response(False, f'Failed to send chat message: {str(exc)}', None) 값을 함수 결과로 반환한다.
        return _response(False, f"Failed to send chat message: {str(exc)}", None)


# 설명: `delete_chat_message` 함수는 대상을 삭제 또는 소프트 삭제 처리하는 함수다.
def delete_chat_message(room_id: int, message_id: int, user_id: int) -> dict:
    """메시지는 실제 삭제하지 않고 기존 deleted_at 필드로 soft delete한다."""
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `room`에 `ChatRoom.query.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        room = ChatRoom.query.get(room_id)
        # 설명: `room is None or room.room_status == 'DELETED'` 조건 결과에 따라 실행 경로를 분기한다.
        if room is None or room.room_status == "DELETED":
            # 설명: 호출자에게 _response(False, 'Chat room not found', None) 값을 함수 결과로 반환한다.
            return _response(False, "Chat room not found", None)

        # 설명: `not _is_room_member(room.id, user_id)` 조건 결과에 따라 실행 경로를 분기한다.
        if not _is_room_member(room.id, user_id):
            # 설명: 호출자에게 _response(False, 'Permission denied', None) 값을 함수 결과로 반환한다.
            return _response(False, "Permission denied", None)

        # 설명: `message`에 `ChatMessage.query.filter_by(id=message_id, room_id=room_id).first` 호출 결과를 저장해 다음 처리에서 사용한다.
        message = ChatMessage.query.filter_by(id=message_id, room_id=room_id).first()
        # 설명: `message is None or message.deleted_at is not None` 조건 결과에 따라 실행 경로를 분기한다.
        if message is None or message.deleted_at is not None:
            # 설명: 호출자에게 _response(False, 'Chat message not found', None) 값을 함수 결과로 반환한다.
            return _response(False, "Chat message not found", None)

        # 설명: `message.sender_user_id != user_id` 조건 결과에 따라 실행 경로를 분기한다.
        if message.sender_user_id != user_id:
            # 설명: `user`에 `User.query.get` 호출 결과를 저장해 다음 처리에서 사용한다.
            user = User.query.get(user_id)
            # 설명: `not _is_super_admin(user)` 조건 결과에 따라 실행 경로를 분기한다.
            if not _is_super_admin(user):
                # 설명: 호출자에게 _response(False, 'Permission denied', None) 값을 함수 결과로 반환한다.
                return _response(False, "Permission denied", None)

        # 설명: `message.deleted_at`에 `_now` 호출 결과를 저장해 다음 처리에서 사용한다.
        message.deleted_at = _now()
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
        # 설명: 호출자에게 _response(True, 'Chat message deleted', message.to_dict()) 값을 함수 결과로 반환한다.
        return _response(True, "Chat message deleted", message.to_dict())
    except Exception as exc:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()
        # 설명: 호출자에게 _response(False, f'Failed to delete chat message: {str(exc)}', None) 값을 함수 결과로 반환한다.
        return _response(False, f"Failed to delete chat message: {str(exc)}", None)


# 설명: `mark_chat_room_read` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def mark_chat_room_read(room_id: int, user_id: int, message_id: int | None = None) -> dict:
    """지정 메시지 또는 최신 메시지까지 ChatMessageRead 이력을 생성한다."""
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `room`에 `ChatRoom.query.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        room = ChatRoom.query.get(room_id)
        # 설명: `room is None or room.room_status == 'DELETED'` 조건 결과에 따라 실행 경로를 분기한다.
        if room is None or room.room_status == "DELETED":
            # 설명: 호출자에게 _response(False, 'Chat room not found', None) 값을 함수 결과로 반환한다.
            return _response(False, "Chat room not found", None)

        # 설명: `not _is_room_member(room.id, user_id)` 조건 결과에 따라 실행 경로를 분기한다.
        if not _is_room_member(room.id, user_id):
            # 설명: 호출자에게 _response(False, 'Permission denied', None) 값을 함수 결과로 반환한다.
            return _response(False, "Permission denied", None)

        # 설명: `query`에 `ChatMessage.query.filter_by(room_id=room_id).filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = (
            ChatMessage.query
            .filter_by(room_id=room_id)
            .filter(ChatMessage.deleted_at.is_(None))
        )

        # 설명: `message_id is None` 조건 결과에 따라 실행 경로를 분기한다.
        if message_id is None:
            # 설명: `target_message`에 `query.order_by(ChatMessage.created_at.desc()).first` 호출 결과를 저장해 다음 처리에서 사용한다.
            target_message = query.order_by(ChatMessage.created_at.desc()).first()
        else:
            # 설명: `target_message`에 `query.filter(ChatMessage.id == message_id).first` 호출 결과를 저장해 다음 처리에서 사용한다.
            target_message = query.filter(ChatMessage.id == message_id).first()

        # 설명: `target_message is None` 조건 결과에 따라 실행 경로를 분기한다.
        if target_message is None:
            # 설명: 호출자에게 _response(True, 'No messages to mark as read', {'room_id': room_id, 'read_count... 값을 함수 결과로 반환한다.
            return _response(True, "No messages to mark as read", {"room_id": room_id, "read_count": 0})

        # 설명: `readable_messages`에 `ChatMessage.query.filter_by(room_id=room_id).filter(ChatMessage.del...` 호출 결과를 저장해 다음 처리에서 사용한다.
        readable_messages = (
            ChatMessage.query
            .filter_by(room_id=room_id)
            .filter(ChatMessage.deleted_at.is_(None))
            .filter(ChatMessage.created_at <= target_message.created_at)
            .all()
        )

        # 설명: `read_count`의 기준값 또는 기본값을 0로 설정한다.
        read_count = 0
        # 설명: `readable_messages`의 각 항목을 `message`로 받아 반복 처리한다.
        for message in readable_messages:
            # 설명: `existing_read`에 `ChatMessageRead.query.filter_by(message_id=message.id, user_id=user...` 호출 결과를 저장해 다음 처리에서 사용한다.
            existing_read = ChatMessageRead.query.filter_by(
                message_id=message.id,
                user_id=user_id,
            ).first()
            # 설명: `existing_read` 조건 결과에 따라 실행 경로를 분기한다.
            if existing_read:
                # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
                continue

            # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
            db.session.add(ChatMessageRead(
                message_id=message.id,
                user_id=user_id,
                read_at=_now(),
            ))
            # 설명: `read_count`의 기준값 또는 기본값을 1로 설정한다.
            read_count += 1

        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
        # 설명: 호출자에게 _response(True, 'Chat room marked as read', {'room_id': room_id, 'message_id': ... 값을 함수 결과로 반환한다.
        return _response(
            True,
            "Chat room marked as read",
            {"room_id": room_id, "message_id": target_message.id, "read_count": read_count},
        )
    except Exception as exc:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()
        # 설명: 호출자에게 _response(False, f'Failed to mark chat room as read: {str(exc)}', None) 값을 함수 결과로 반환한다.
        return _response(False, f"Failed to mark chat room as read: {str(exc)}", None)
