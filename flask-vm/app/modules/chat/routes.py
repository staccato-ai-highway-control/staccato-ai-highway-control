from flask import Blueprint, jsonify, request

from app.utils.security import require_auth
from app.modules.chat.service import (
    get_or_create_chat_room,
    get_chat_messages,
    send_chat_message,
)

chat_bp = Blueprint("chat", __name__)


def _get_current_user_id() -> int | None:
    """
    require_auth 데코레이터에서 설정한 현재 로그인 사용자 ID를 가져온다.

    app/utils/security.py의 require_auth는 인증 성공 시
    request.current_user에 User 객체를 저장한다.

    따라서 채팅 메시지의 sender_id는 요청 body에서 받지 않고,
    request.current_user.id를 사용한다.
    """
    current_user = getattr(request, "current_user", None)

    if current_user is None:
        return None

    return getattr(current_user, "id", None)


@chat_bp.post("/incidents/<int:incident_id>/chat-room")
@require_auth
def create_or_get_incident_chat_room(incident_id: int):
    """
    사고 ID 기준으로 채팅방을 생성하거나 기존 채팅방을 조회한다.

    처리 흐름:
    1. JWT 인증을 통과한 로그인 사용자를 확인한다.
    2. incident_id 기준으로 열린 채팅방을 조회한다.
    3. 없으면 채팅방을 생성한다.
    4. 로그인 사용자를 채팅방 멤버로 등록한다.
    """
    user_id = _get_current_user_id()

    if user_id is None:
        return jsonify({
            "success": False,
            "message": "Authentication user not found",
            "data": None,
        }), 401

    result = get_or_create_chat_room(
        incident_id=incident_id,
        user_id=user_id,
    )

    status_code = 200 if result.get("success") else 400
    return jsonify(result), status_code


@chat_bp.get("/chat-rooms/<int:room_id>/messages")
@require_auth
def list_chat_messages(room_id: int):
    """
    채팅방 메시지 목록을 조회한다.

    MVP 기준:
    - 로그인 사용자만 메시지 조회 가능
    - 추후 ChatRoomMember 기준으로 해당 채팅방 참여자인지 검증 가능
    """
    result = get_chat_messages(room_id)

    if result.get("success"):
        return jsonify(result), 200

    if result.get("message") == "Chat room not found":
        return jsonify(result), 404

    return jsonify(result), 400


@chat_bp.post("/chat-rooms/<int:room_id>/messages")
@require_auth
def create_chat_message(room_id: int):
    """
    채팅 메시지를 전송한다.

    보안 기준:
    - sender_id는 요청 body에서 받지 않는다.
    - sender_id를 body에서 받으면 다른 사용자 ID로 메시지를 보낼 수 있다.
    - 따라서 JWT 인증을 통과한 request.current_user.id를 sender_id로 사용한다.

    요청 body 예시:
    {
        "content": "현장 확인 부탁드립니다."
    }
    """
    payload = request.get_json(silent=True) or {}

    user_id = _get_current_user_id()

    if user_id is None:
        return jsonify({
            "success": False,
            "message": "Authentication user not found",
            "data": None,
        }), 401

    content = payload.get("content")

    result = send_chat_message(
        room_id=room_id,
        sender_id=user_id,
        content=content,
    )

    if result.get("success"):
        return jsonify(result), 200

    if result.get("message") == "Chat room not found":
        return jsonify(result), 404

    return jsonify(result), 400