from unittest.mock import patch
from datetime import datetime
from uuid import uuid4

from app import create_app
from app.extensions import db
from app.models.chat_models import (
    ChatMessage,
    ChatMessageRead,
    ChatRoom,
    ChatbotConversation,
    ChatbotMessage,
)
from app.models.chat_support_models import ChatRoomMember
from app.models.auth_models import User
from app.models.incident_models import Incident
from app.modules.chat.service import assign_incident_chat_room
from app.utils.security import create_access_token


def _create_chat_test_user(app, role="CONTROL_ADMIN"):
    """채팅 API 인증 테스트용 ACTIVE 사용자와 JWT를 생성한다."""
    with app.app_context():
        suffix = uuid4().hex[:12]

        user = User(
            login_id=f"chat_test_user_{suffix}",
            email=f"chat-test-{suffix}@example.com",
            password_hash="test-password-hash",
            name="채팅테스트",
            role=role,
            account_status="ACTIVE",
            is_email_verified=True,
            created_at=datetime.utcnow(),
            updated_at=None,
        )

        db.session.add(user)
        db.session.commit()

        token = create_access_token(user)
        return user.id, token


def _create_chat_test_incident(app):
    with app.app_context():
        incident = Incident(
            incident_code=f"TEST-INC-{uuid4().hex[:12]}",
            incident_type="TEST",
            incident_status="DETECTED",
            risk_level="LOW",
            detected_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )

        db.session.add(incident)
        db.session.commit()
        return incident.id


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_chatbot_answer_route():
    app = create_app()

    payload = {
        "message": "이 사고 요약해줘",
        "incident_context": {
            "incident_type": "LANE_STOP",
            "risk_level": "HIGH",
        },
    }

    mock_result = {
        "success": True,
        "message": "Chatbot answer generated",
        "data": {
            "answer": "차로 정차와 높은 위험도를 기준으로 요약했습니다.",
        },
    }

    with patch("app.modules.chatbot.service.generate_chatbot_answer", return_value=mock_result) as mock_generate:
        with app.test_client() as client:
            response = client.post("/chatbot/answer", json=payload)

    assert response.status_code == 200
    body = response.get_json()
    assert body["success"] is True
    assert body["data"]["answer"] == mock_result["data"]["answer"]
    mock_generate.assert_called_once_with({
        "message": "이 사고 요약해줘",
        "incident_context": payload["incident_context"],
    })


def test_chatbot_answer_upstream_failure_returns_502():
    app = create_app()

    mock_result = {
        "success": False,
        "error_code": "LLM_CHATBOT_REQUEST_FAILED",
        "message": "LLM server timeout",
    }

    with patch("app.modules.chatbot.service.generate_chatbot_answer", return_value=mock_result):
        with app.test_client() as client:
            response = client.post("/chatbot/answer", json={"message": "상황 설명해줘"})

    assert response.status_code == 502
    assert response.get_json()["error_code"] == "LLM_CHATBOT_REQUEST_FAILED"


def test_chat_room_requires_auth():
    app = create_app()

    with app.test_client() as client:
        response = client.post("/incidents/1/chat-room")

    assert response.status_code == 401


def test_chat_room_and_messages():
    app = create_app()
    user_id, token = _create_chat_test_user(app)
    incident_id = _create_chat_test_incident(app)

    with app.test_client() as client:
        room_response = client.post(
            f"/incidents/{incident_id}/chat-room",
            headers=_auth_headers(token),
        )
        assert room_response.status_code == 200

        room_body = room_response.get_json()
        assert room_body["success"] is True
        room_id = room_body["data"]["id"]

        message_response = client.post(
            f"/chat-rooms/{room_id}/messages",
            json={"content": "현재 사고 확인 중입니다."},
            headers=_auth_headers(token),
        )
        assert message_response.status_code in (200, 201)

        message_body = message_response.get_json()
        assert message_body["success"] is True
        assert message_body["data"]["sender_user_id"] == user_id
        assert message_body["data"]["message"] == "현재 사고 확인 중입니다."

        list_response = client.get(
            f"/chat-rooms/{room_id}/messages",
            headers=_auth_headers(token),
        )
        assert list_response.status_code == 200

        body = list_response.get_json()
        assert body["success"] is True
        assert len(body["data"]["messages"]) >= 1


def test_incident_assignment_creates_incident_room_and_members():
    app = create_app()
    control_user_id, _ = _create_chat_test_user(app, role="CONTROL_ADMIN")
    responder_user_id, _ = _create_chat_test_user(app, role="RESPONDER")
    admin_user_id, _ = _create_chat_test_user(app, role="SUPER_ADMIN")
    incident_id = _create_chat_test_incident(app)

    with app.app_context():
        result = assign_incident_chat_room(
            incident_id=incident_id,
            control_user_id=control_user_id,
            responder_user_id=responder_user_id,
            admin_user_ids=[admin_user_id],
        )

        assert result["success"] is True
        room = ChatRoom.query.get(result["data"]["id"])
        assert room.room_type == "INCIDENT"
        assert room.incident_id == incident_id
        assert room.room_status == "OPEN"

        member_user_ids = {
            member.user_id
            for member in ChatRoomMember.query.filter_by(room_id=room.id, left_at=None).all()
        }
        assert {control_user_id, responder_user_id, admin_user_id}.issubset(member_user_ids)


def test_incident_room_is_not_duplicated_for_same_incident():
    app = create_app()
    control_user_id, _ = _create_chat_test_user(app)
    responder_user_id, _ = _create_chat_test_user(app, role="RESPONDER")
    incident_id = _create_chat_test_incident(app)

    with app.app_context():
        first = assign_incident_chat_room(incident_id, control_user_id, responder_user_id)
        second = assign_incident_chat_room(incident_id, control_user_id, responder_user_id)

        assert first["success"] is True
        assert second["success"] is True
        assert first["data"]["id"] == second["data"]["id"]
        assert ChatRoom.query.filter_by(incident_id=incident_id, room_type="INCIDENT").count() == 1


def test_incident_resolved_closes_chat_room_and_blocks_messages():
    app = create_app()
    control_user_id, token = _create_chat_test_user(app)
    responder_user_id, _ = _create_chat_test_user(app, role="RESPONDER")
    incident_id = _create_chat_test_incident(app)

    with app.app_context():
        result = assign_incident_chat_room(incident_id, control_user_id, responder_user_id)
        room_id = result["data"]["id"]

    with app.test_client() as client:
        close_response = client.patch(
            f"/incidents/{incident_id}/chat-room/status",
            json={"incident_status": "RESOLVED"},
            headers=_auth_headers(token),
        )
        assert close_response.status_code == 200
        assert close_response.get_json()["data"]["room_status"] == "CLOSED"

        message_response = client.post(
            f"/chat-rooms/{room_id}/messages",
            json={"content": "종료 후 메시지"},
            headers=_auth_headers(token),
        )
        assert message_response.status_code == 400
        assert message_response.get_json()["success"] is False


def test_non_member_cannot_list_or_send_messages():
    app = create_app()
    creator_id, creator_token = _create_chat_test_user(app)
    outsider_id, outsider_token = _create_chat_test_user(app)
    del outsider_id

    with app.test_client() as client:
        room_response = client.post(
            "/chat-rooms",
            json={"room_type": "GROUP", "member_ids": []},
            headers=_auth_headers(creator_token),
        )
        assert room_response.status_code == 400

        member_id, _ = _create_chat_test_user(app)
        room_response = client.post(
            "/chat-rooms",
            json={"room_type": "GROUP", "member_ids": [member_id]},
            headers=_auth_headers(creator_token),
        )
        assert room_response.status_code == 201
        room_id = room_response.get_json()["data"]["id"]

        list_response = client.get(
            f"/chat-rooms/{room_id}/messages",
            headers=_auth_headers(outsider_token),
        )
        assert list_response.status_code == 403

        send_response = client.post(
            f"/chat-rooms/{room_id}/messages",
            json={"content": "권한 없는 메시지"},
            headers=_auth_headers(outsider_token),
        )
        assert send_response.status_code == 403

    assert creator_id


def test_group_and_dm_chat_room_creation():
    app = create_app()
    creator_id, token = _create_chat_test_user(app)
    member_id, _ = _create_chat_test_user(app)

    with app.test_client() as client:
        group_response = client.post(
            "/chat-rooms",
            json={"room_type": "GROUP", "member_ids": [member_id]},
            headers=_auth_headers(token),
        )
        assert group_response.status_code == 201
        assert group_response.get_json()["data"]["room_type"] == "GROUP"

        dm_response = client.post(
            "/chat-rooms",
            json={"room_type": "DM", "member_ids": [member_id]},
            headers=_auth_headers(token),
        )
        assert dm_response.status_code == 201
        assert dm_response.get_json()["data"]["room_type"] == "DM"

    assert creator_id


def test_chat_room_soft_delete_uses_deleted_status():
    app = create_app()
    _, token = _create_chat_test_user(app)
    member_id, _ = _create_chat_test_user(app)

    with app.test_client() as client:
        room_response = client.post(
            "/chat-rooms",
            json={"room_type": "GROUP", "member_ids": [member_id]},
            headers=_auth_headers(token),
        )
        room_id = room_response.get_json()["data"]["id"]

        delete_response = client.delete(
            f"/chat-rooms/{room_id}",
            headers=_auth_headers(token),
        )
        assert delete_response.status_code == 200
        assert delete_response.get_json()["data"]["room_status"] == "DELETED"

    with app.app_context():
        room = ChatRoom.query.get(room_id)
        assert room.room_status == "DELETED"
        assert room.closed_at is not None


def test_message_soft_delete_sets_deleted_at():
    app = create_app()
    user_id, token = _create_chat_test_user(app)
    member_id, _ = _create_chat_test_user(app)

    with app.test_client() as client:
        room_response = client.post(
            "/chat-rooms",
            json={"room_type": "GROUP", "member_ids": [member_id]},
            headers=_auth_headers(token),
        )
        room_id = room_response.get_json()["data"]["id"]

        message_response = client.post(
            f"/chat-rooms/{room_id}/messages",
            json={"content": "삭제할 메시지"},
            headers=_auth_headers(token),
        )
        message_id = message_response.get_json()["data"]["id"]

        delete_response = client.delete(
            f"/chat-rooms/{room_id}/messages/{message_id}",
            headers=_auth_headers(token),
        )
        assert delete_response.status_code == 200

    with app.app_context():
        message = ChatMessage.query.get(message_id)
        assert message.sender_user_id == user_id
        assert message.deleted_at is not None


def test_mark_chat_room_read_api():
    app = create_app()
    creator_id, creator_token = _create_chat_test_user(app)
    member_id, member_token = _create_chat_test_user(app)

    with app.test_client() as client:
        room_response = client.post(
            "/chat-rooms",
            json={"room_type": "GROUP", "member_ids": [member_id]},
            headers=_auth_headers(creator_token),
        )
        room_id = room_response.get_json()["data"]["id"]

        first_response = client.post(
            f"/chat-rooms/{room_id}/messages",
            json={"content": "첫 메시지"},
            headers=_auth_headers(creator_token),
        )
        second_response = client.post(
            f"/chat-rooms/{room_id}/messages",
            json={"content": "두 번째 메시지"},
            headers=_auth_headers(creator_token),
        )
        assert first_response.status_code == 200
        second_message_id = second_response.get_json()["data"]["id"]

        read_response = client.patch(
            f"/chat-rooms/{room_id}/read",
            json={"message_id": second_message_id},
            headers=_auth_headers(member_token),
        )
        assert read_response.status_code == 200
        assert read_response.get_json()["success"] is True

    with app.app_context():
        read_count = ChatMessageRead.query.filter_by(user_id=member_id).count()
        assert read_count >= 1

    assert creator_id



def _create_chatbot_session(client, incident_id, token):
    response = client.post(
        f"/incidents/{incident_id}/chatbot-sessions",
        headers=_auth_headers(token),
    )
    assert response.status_code == 200, response.get_json()
    return response.get_json()["data"]


def test_chatbot_session_requires_auth():
    app = create_app()
    incident_id = _create_chat_test_incident(app)

    with app.test_client() as client:
        response = client.post(f"/incidents/{incident_id}/chatbot-sessions")

    assert response.status_code == 401


def test_create_incident_chatbot_session_success():
    app = create_app()
    user_id, token = _create_chat_test_user(app, role="VIEWER")
    incident_id = _create_chat_test_incident(app)

    with app.test_client() as client:
        session = _create_chatbot_session(client, incident_id, token)

    assert session["incident_id"] == incident_id
    assert session["user_id"] == user_id
    assert session["status"] == "OPEN"
    assert session["created_at"]


def test_open_chatbot_session_is_reused_for_same_user_and_incident():
    app = create_app()
    _, token = _create_chat_test_user(app, role="VIEWER")
    incident_id = _create_chat_test_incident(app)

    with app.test_client() as client:
        first = _create_chatbot_session(client, incident_id, token)
        second = _create_chatbot_session(client, incident_id, token)

    assert first["id"] == second["id"]
    with app.app_context():
        assert ChatbotConversation.query.filter_by(incident_id=incident_id).count() == 1


def test_list_incident_chatbot_sessions():
    app = create_app()
    _, token = _create_chat_test_user(app, role="VIEWER")
    incident_id = _create_chat_test_incident(app)

    with app.test_client() as client:
        created = _create_chatbot_session(client, incident_id, token)
        response = client.get(
            f"/incidents/{incident_id}/chatbot-sessions",
            headers=_auth_headers(token),
        )

    assert response.status_code == 200
    sessions = response.get_json()["data"]
    assert any(session["id"] == created["id"] for session in sessions)


def test_get_chatbot_session_detail():
    app = create_app()
    _, token = _create_chat_test_user(app, role="VIEWER")
    incident_id = _create_chat_test_incident(app)

    with app.test_client() as client:
        session = _create_chatbot_session(client, incident_id, token)
        response = client.get(
            f"/chatbot-sessions/{session['id']}",
            headers=_auth_headers(token),
        )

    assert response.status_code == 200
    body = response.get_json()
    assert body["data"]["id"] == session["id"]
    assert body["data"]["incident"]["id"] == incident_id


def test_list_chatbot_session_messages():
    app = create_app()
    user_id, token = _create_chat_test_user(app, role="VIEWER")
    incident_id = _create_chat_test_incident(app)

    with app.test_client() as client:
        session = _create_chatbot_session(client, incident_id, token)

    with app.app_context():
        db.session.add(ChatbotMessage(
            conversation_id=session["id"],
            incident_id=incident_id,
            user_id=user_id,
            sender_type="USER",
            message="기존 질문",
            created_at=datetime.utcnow(),
        ))
        db.session.commit()

    with app.test_client() as client:
        response = client.get(
            f"/chatbot-sessions/{session['id']}/messages",
            headers=_auth_headers(token),
        )

    assert response.status_code == 200
    messages = response.get_json()["data"]["messages"]
    assert messages[0]["sender_type"] == "USER"
    assert messages[0]["message"] == "기존 질문"


def test_send_chatbot_session_message_saves_user_and_bot_messages():
    app = create_app()
    user_id, token = _create_chat_test_user(app, role="VIEWER")
    incident_id = _create_chat_test_incident(app)
    mock_result = {
        "success": True,
        "data": {
            "answer": "주행 차로 정차와 감지 신뢰도를 기준으로 HIGH입니다.",
            "model_name": "test-llm",
        },
    }

    with app.test_client() as client:
        session = _create_chatbot_session(client, incident_id, token)
        with patch("app.modules.chatbot.service.generate_chatbot_answer", return_value=mock_result) as mock_generate:
            response = client.post(
                f"/chatbot-sessions/{session['id']}/messages",
                json={"message": "왜 HIGH인가요?"},
                headers=_auth_headers(token),
            )

    assert response.status_code == 200
    body = response.get_json()
    assert body["data"]["answer"] == mock_result["data"]["answer"]
    assert body["data"]["user_message"]["sender_type"] == "USER"
    assert body["data"]["bot_message"]["sender_type"] == "BOT"
    mock_payload = mock_generate.call_args.args[0]
    assert mock_payload["source_snapshot"]["incident"]["id"] == incident_id

    with app.app_context():
        messages = ChatbotMessage.query.filter_by(conversation_id=session["id"]).order_by(ChatbotMessage.created_at.asc()).all()
        assert len(messages) == 2
        assert messages[0].sender_type == "USER"
        assert messages[0].user_id == user_id
        assert messages[1].sender_type == "BOT"
        assert messages[1].message == mock_result["data"]["answer"]
        assert messages[1].context_json["generation_status"] == "SUCCEEDED"


def test_closed_chatbot_session_blocks_questions():
    app = create_app()
    _, token = _create_chat_test_user(app, role="VIEWER")
    incident_id = _create_chat_test_incident(app)

    with app.test_client() as client:
        session = _create_chatbot_session(client, incident_id, token)
        close_response = client.patch(
            f"/chatbot-sessions/{session['id']}/close",
            headers=_auth_headers(token),
        )
        assert close_response.status_code == 200

        response = client.post(
            f"/chatbot-sessions/{session['id']}/messages",
            json={"message": "닫힌 뒤 질문"},
            headers=_auth_headers(token),
        )

    assert response.status_code == 400
    assert response.get_json()["message"] == "Chatbot session is closed"


def test_close_chatbot_session_api():
    app = create_app()
    _, token = _create_chat_test_user(app, role="VIEWER")
    incident_id = _create_chat_test_incident(app)

    with app.test_client() as client:
        session = _create_chatbot_session(client, incident_id, token)
        response = client.patch(
            f"/chatbot-sessions/{session['id']}/close",
            headers=_auth_headers(token),
        )

    assert response.status_code == 200
    assert response.get_json()["data"]["status"] == "CLOSED"
    with app.app_context():
        stored = ChatbotConversation.query.get(session["id"])
        assert stored.conversation_status == "CLOSED"
        assert stored.closed_at is not None


def test_other_user_cannot_access_my_chatbot_session():
    app = create_app()
    _, owner_token = _create_chat_test_user(app, role="VIEWER")
    _, other_token = _create_chat_test_user(app, role="VIEWER")
    incident_id = _create_chat_test_incident(app)

    with app.test_client() as client:
        session = _create_chatbot_session(client, incident_id, owner_token)
        response = client.get(
            f"/chatbot-sessions/{session['id']}",
            headers=_auth_headers(other_token),
        )

    assert response.status_code == 403


def test_chatbot_session_message_upstream_failure_returns_502_and_stores_failed_bot_message():
    app = create_app()
    _, token = _create_chat_test_user(app, role="VIEWER")
    incident_id = _create_chat_test_incident(app)
    mock_result = {
        "success": False,
        "error_code": "LLM_CHATBOT_REQUEST_FAILED",
        "message": "LLM timeout",
    }

    with app.test_client() as client:
        session = _create_chatbot_session(client, incident_id, token)
        with patch("app.modules.chatbot.service.generate_chatbot_answer", return_value=mock_result):
            response = client.post(
                f"/chatbot-sessions/{session['id']}/messages",
                json={"message": "실패 테스트"},
                headers=_auth_headers(token),
            )

    assert response.status_code == 502
    assert response.get_json()["error_code"] == "LLM_CHATBOT_REQUEST_FAILED"
    with app.app_context():
        bot_message = ChatbotMessage.query.filter_by(
            conversation_id=session["id"],
            sender_type="BOT",
        ).first()
        assert bot_message is not None
        assert bot_message.context_json["generation_status"] == "FAILED"


def test_incident_chatbot_answer_route_still_works():
    app = create_app()
    incident_id = _create_chat_test_incident(app)
    mock_result = {
        "success": True,
        "data": {"answer": "사고 기준 답변입니다."},
    }

    with patch("app.modules.chatbot.service.generate_chatbot_answer", return_value=mock_result) as mock_generate:
        with app.test_client() as client:
            response = client.post(
                f"/incidents/{incident_id}/chatbot/answer",
                json={"message": "사고 설명해줘", "incident_context": {"risk_level": "HIGH"}},
            )

    assert response.status_code == 200
    assert response.get_json()["data"]["answer"] == "사고 기준 답변입니다."
    mock_payload = mock_generate.call_args.args[0]
    assert mock_payload["incident_context"]["incident_id"] == incident_id
