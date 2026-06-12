"""chat 도메인의 HTTP API 엔드포인트를 정의한다.

요청 인증과 입력 변환을 수행한 뒤 서비스 결과를 안정적인 JSON 응답으로 전달한다."""

# 설명: flask에서 Blueprint, jsonify, request 이름을 가져와 아래 로직에서 재사용한다.
from flask import Blueprint, jsonify, request

# 설명: app.utils.security에서 require_auth 이름을 가져와 아래 로직에서 재사용한다.
from app.utils.security import require_auth
# 설명: app.modules.chat.service에서 add_chat_room_members, assign_incident_chat_room, close_incident_chat_room_for_status, create_general_chat_room, delete_chat_message, delete_chat_room, get_chat_messages, get_chat_room_detail, get_or_create_chat_room, leave_chat_room, list_my_chat_rooms, mark_chat_room_read, send_chat_message 이름을 가져와 아래 로직에서 재사용한다.
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

# 설명: `chat_bp`에 `Blueprint` 호출 결과를 저장해 다음 처리에서 사용한다.
chat_bp = Blueprint("chat", __name__)


# 설명: `_get_current_user` 함수는 단일 값이나 리소스를 조회하는 함수다.
def _get_current_user():
    """require_auth가 request에 주입한 현재 사용자 객체를 가져온다."""
    # 설명: 호출자에게 getattr(request, 'current_user', None) 값을 함수 결과로 반환한다.
    return getattr(request, "current_user", None)


# 설명: `_get_current_user_id` 함수는 단일 값이나 리소스를 조회하는 함수다.
def _get_current_user_id() -> int | None:
    # 설명: `current_user`에 `_get_current_user` 호출 결과를 저장해 다음 처리에서 사용한다.
    current_user = _get_current_user()
    # 설명: `current_user is None` 조건 결과에 따라 실행 경로를 분기한다.
    if current_user is None:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None
    # 설명: 호출자에게 getattr(current_user, 'id', None) 값을 함수 결과로 반환한다.
    return getattr(current_user, "id", None)


# 설명: `_status_code` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _status_code(result: dict) -> int:
    """서비스 공통 응답을 API HTTP status code로 변환한다."""
    # 설명: `result.get('success')` 조건 결과에 따라 실행 경로를 분기한다.
    if result.get("success"):
        # 설명: 호출자에게 200 값을 함수 결과로 반환한다.
        return 200

    # 설명: `message`에 `result.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    message = result.get("message")
    # 설명: `message in {'Chat room not found', 'Chat message not found'}` 조건 결과에 따라 실행 경로를 분기한다.
    if message in {"Chat room not found", "Chat message not found"}:
        # 설명: 호출자에게 404 값을 함수 결과로 반환한다.
        return 404
    # 설명: `message == 'Permission denied'` 조건 결과에 따라 실행 경로를 분기한다.
    if message == "Permission denied":
        # 설명: 호출자에게 403 값을 함수 결과로 반환한다.
        return 403
    # 설명: 호출자에게 400 값을 함수 결과로 반환한다.
    return 400


# 설명: `_member_ids_from_payload` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _member_ids_from_payload(payload: dict) -> list[int]:
    """member_id 단건 입력과 member_ids 배열 입력을 같은 형태로 정규화한다."""
    # 설명: `member_ids`에 `payload.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    member_ids = payload.get("member_ids")
    # 설명: `member_ids is None and payload.get('member_id') is not None` 조건 결과에 따라 실행 경로를 분기한다.
    if member_ids is None and payload.get("member_id") is not None:
        # 설명: `member_ids`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        member_ids = [payload.get("member_id")]
    # 설명: `member_ids is None` 조건 결과에 따라 실행 경로를 분기한다.
    if member_ids is None:
        # 설명: 호출자에게 [] 값을 함수 결과로 반환한다.
        return []
    # 설명: `not isinstance(member_ids, list)` 조건 결과에 따라 실행 경로를 분기한다.
    if not isinstance(member_ids, list):
        # 설명: 호출자에게 [] 값을 함수 결과로 반환한다.
        return []
    # 설명: 호출자에게 [member_id for member_id in member_ids if member_id is not None] 값을 함수 결과로 반환한다.
    return [member_id for member_id in member_ids if member_id is not None]


# 설명: `create_or_get_incident_chat_room` 함수는 새 데이터나 리소스를 생성하는 함수다.
@chat_bp.post("/incidents/<int:incident_id>/chat-room")
@require_auth
def create_or_get_incident_chat_room(incident_id: int):
    """기존 호환 API: 사고 ID 기준 INCIDENT 채팅방을 생성하거나 반환한다."""
    # 설명: `user_id`에 `_get_current_user_id` 호출 결과를 저장해 다음 처리에서 사용한다.
    user_id = _get_current_user_id()
    # 설명: `user_id is None` 조건 결과에 따라 실행 경로를 분기한다.
    if user_id is None:
        # 설명: 호출자에게 (jsonify({'success': False, 'message': 'Authentication user not found', 'data':... 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "message": "Authentication user not found", "data": None}), 401

    # 설명: `result`에 `get_or_create_chat_room` 호출 결과를 저장해 다음 처리에서 사용한다.
    result = get_or_create_chat_room(incident_id=incident_id, user_id=user_id)
    # 설명: 호출자에게 (jsonify(result), _status_code(result)) 값을 함수 결과로 반환한다.
    return jsonify(result), _status_code(result)


# 설명: `assign_incident_room` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@chat_bp.post("/incidents/<int:incident_id>/chat-room/assign")
@require_auth
def assign_incident_room(incident_id: int):
    """사건 담당자 배정 시 호출해 관제/출동/관리자 멤버를 자동 등록한다."""
    # 설명: `payload`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
    payload = request.get_json(silent=True) or {}
    # 설명: `result`에 `assign_incident_chat_room` 호출 결과를 저장해 다음 처리에서 사용한다.
    result = assign_incident_chat_room(
        incident_id=incident_id,
        control_user_id=_get_current_user_id(),
        responder_user_id=payload.get("responder_user_id"),
        admin_user_ids=payload.get("admin_user_ids") or [],
    )
    # 설명: 호출자에게 (jsonify(result), _status_code(result)) 값을 함수 결과로 반환한다.
    return jsonify(result), _status_code(result)


# 설명: `create_chat_room` 함수는 새 데이터나 리소스를 생성하는 함수다.
@chat_bp.post("/chat-rooms")
@require_auth
def create_chat_room():
    """사건과 무관한 GROUP 또는 DM 채팅방을 생성한다."""
    # 설명: `payload`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
    payload = request.get_json(silent=True) or {}
    # 설명: `user_id`에 `_get_current_user_id` 호출 결과를 저장해 다음 처리에서 사용한다.
    user_id = _get_current_user_id()

    # 설명: `result`에 `create_general_chat_room` 호출 결과를 저장해 다음 처리에서 사용한다.
    result = create_general_chat_room(
        creator_id=user_id,
        room_type=payload.get("room_type"),
        member_ids=_member_ids_from_payload(payload),
    )
    # 설명: `status_code`에 201 if result.get('success') else _status_code(result) 표현식의 계산 결과를 저장한다.
    status_code = 201 if result.get("success") else _status_code(result)
    # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
    return jsonify(result), status_code


# 설명: `list_chat_rooms` 함수는 조건에 맞는 목록을 조회하는 함수다.
@chat_bp.get("/chat-rooms")
@require_auth
def list_chat_rooms():
    # 설명: `result`에 `list_my_chat_rooms` 호출 결과를 저장해 다음 처리에서 사용한다.
    result = list_my_chat_rooms(_get_current_user_id())
    # 설명: 호출자에게 (jsonify(result), _status_code(result)) 값을 함수 결과로 반환한다.
    return jsonify(result), _status_code(result)


# 설명: `get_chat_room` 함수는 단일 값이나 리소스를 조회하는 함수다.
@chat_bp.get("/chat-rooms/<int:room_id>")
@require_auth
def get_chat_room(room_id: int):
    # 설명: `result`에 `get_chat_room_detail` 호출 결과를 저장해 다음 처리에서 사용한다.
    result = get_chat_room_detail(room_id, _get_current_user_id())
    # 설명: 호출자에게 (jsonify(result), _status_code(result)) 값을 함수 결과로 반환한다.
    return jsonify(result), _status_code(result)


# 설명: `remove_chat_room` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@chat_bp.delete("/chat-rooms/<int:room_id>")
@require_auth
def remove_chat_room(room_id: int):
    """모델 변경 없이 room_status=DELETED로 일반 채팅방을 soft delete한다."""
    # 설명: `result`에 `delete_chat_room` 호출 결과를 저장해 다음 처리에서 사용한다.
    result = delete_chat_room(room_id, _get_current_user())
    # 설명: 호출자에게 (jsonify(result), _status_code(result)) 값을 함수 결과로 반환한다.
    return jsonify(result), _status_code(result)


# 설명: `add_members` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@chat_bp.post("/chat-rooms/<int:room_id>/members")
@require_auth
def add_members(room_id: int):
    # 설명: `payload`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
    payload = request.get_json(silent=True) or {}
    # 설명: `result`에 `add_chat_room_members` 호출 결과를 저장해 다음 처리에서 사용한다.
    result = add_chat_room_members(
        room_id=room_id,
        current_user_id=_get_current_user_id(),
        member_ids=_member_ids_from_payload(payload),
    )
    # 설명: 호출자에게 (jsonify(result), _status_code(result)) 값을 함수 결과로 반환한다.
    return jsonify(result), _status_code(result)


# 설명: `leave_room` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@chat_bp.delete("/chat-rooms/<int:room_id>/members/me")
@require_auth
def leave_room(room_id: int):
    # 설명: `result`에 `leave_chat_room` 호출 결과를 저장해 다음 처리에서 사용한다.
    result = leave_chat_room(room_id, _get_current_user_id())
    # 설명: 호출자에게 (jsonify(result), _status_code(result)) 값을 함수 결과로 반환한다.
    return jsonify(result), _status_code(result)


# 설명: `list_chat_messages` 함수는 조건에 맞는 목록을 조회하는 함수다.
@chat_bp.get("/chat-rooms/<int:room_id>/messages")
@require_auth
def list_chat_messages(room_id: int):
    """참여자 권한 확인 후 삭제되지 않은 메시지만 조회한다."""
    # 설명: `result`에 `get_chat_messages` 호출 결과를 저장해 다음 처리에서 사용한다.
    result = get_chat_messages(room_id, user_id=_get_current_user_id())
    # 설명: 호출자에게 (jsonify(result), _status_code(result)) 값을 함수 결과로 반환한다.
    return jsonify(result), _status_code(result)


# 설명: `create_chat_message` 함수는 새 데이터나 리소스를 생성하는 함수다.
@chat_bp.post("/chat-rooms/<int:room_id>/messages")
@require_auth
def create_chat_message(room_id: int):
    """참여자만 OPEN 채팅방에 TEXT 메시지를 전송할 수 있다."""
    # 설명: `payload`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
    payload = request.get_json(silent=True) or {}
    # 설명: `result`에 `send_chat_message` 호출 결과를 저장해 다음 처리에서 사용한다.
    result = send_chat_message(
        room_id=room_id,
        sender_id=_get_current_user_id(),
        content=payload.get("content"),
    )
    # 설명: 호출자에게 (jsonify(result), _status_code(result)) 값을 함수 결과로 반환한다.
    return jsonify(result), _status_code(result)


# 설명: `remove_chat_message` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@chat_bp.delete("/chat-rooms/<int:room_id>/messages/<int:message_id>")
@require_auth
def remove_chat_message(room_id: int, message_id: int):
    # 설명: `result`에 `delete_chat_message` 호출 결과를 저장해 다음 처리에서 사용한다.
    result = delete_chat_message(
        room_id=room_id,
        message_id=message_id,
        user_id=_get_current_user_id(),
    )
    # 설명: 호출자에게 (jsonify(result), _status_code(result)) 값을 함수 결과로 반환한다.
    return jsonify(result), _status_code(result)


# 설명: `read_chat_room` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@chat_bp.patch("/chat-rooms/<int:room_id>/read")
@require_auth
def read_chat_room(room_id: int):
    """message_id가 있으면 해당 메시지까지, 없으면 최신 메시지까지 읽음 처리한다."""
    # 설명: `payload`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
    payload = request.get_json(silent=True) or {}
    # 설명: `result`에 `mark_chat_room_read` 호출 결과를 저장해 다음 처리에서 사용한다.
    result = mark_chat_room_read(
        room_id=room_id,
        user_id=_get_current_user_id(),
        message_id=payload.get("message_id"),
    )
    # 설명: 호출자에게 (jsonify(result), _status_code(result)) 값을 함수 결과로 반환한다.
    return jsonify(result), _status_code(result)


# 설명: `update_incident_chat_room_status` 함수는 기존 데이터의 허용된 값을 변경하는 함수다.
@chat_bp.patch("/incidents/<int:incident_id>/chat-room/status")
@require_auth
def update_incident_chat_room_status(incident_id: int):
    """사건 종료 상태를 받아 연결된 INCIDENT 채팅방을 CLOSED 처리한다."""
    # 설명: `payload`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
    payload = request.get_json(silent=True) or {}
    # 설명: `result`에 `close_incident_chat_room_for_status` 호출 결과를 저장해 다음 처리에서 사용한다.
    result = close_incident_chat_room_for_status(
        incident_id=incident_id,
        incident_status=payload.get("incident_status"),
    )
    # 설명: 호출자에게 (jsonify(result), _status_code(result)) 값을 함수 결과로 반환한다.
    return jsonify(result), _status_code(result)
