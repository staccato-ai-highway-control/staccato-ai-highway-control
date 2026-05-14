from datetime import datetime

from app import create_app
from app.extensions import db
from app.models.auth_models import User
from app.utils.security import create_access_token


def _create_chat_test_user(app):
    """
    채팅 API 인증 테스트용 ACTIVE 사용자와 JWT를 생성한다.

    require_auth는 request.current_user에 User 객체를 넣고,
    account_status가 ACTIVE인지 검사한다.
    """
    with app.app_context():
        user = User(
            login_id="chat_test_user",
            email="chat-test@example.com",
            password_hash="test-password-hash",
            name="채팅테스트",
            role="CONTROL_ADMIN",
            account_status="ACTIVE",
            is_email_verified=True,
            created_at=datetime.utcnow(),
            updated_at=None,
        )

        db.session.add(user)
        db.session.commit()

        token = create_access_token(user)

        return user.id, token


def test_chatbot_answer_route():
    app = create_app()

    payload = {
        "message": "이 사고 요약해줘",
        "incident_context": {
            "incident_type": "LANE_STOP",
            "risk_level": "HIGH",
        },
    }

    with app.test_client() as client:
        response = client.post("/chatbot/answer", json=payload)

    assert response.status_code == 200
    body = response.get_json()
    assert body["success"] is True
    assert "data" in body


def test_chat_room_requires_auth():
    app = create_app()

    with app.test_client() as client:
        response = client.post("/incidents/1/chat-room")

    assert response.status_code == 401


def test_chat_room_and_messages():
    app = create_app()
    user_id, token = _create_chat_test_user(app)

    headers = {
        "Authorization": f"Bearer {token}",
    }

    with app.test_client() as client:
        room_response = client.post(
            "/incidents/1/chat-room",
            headers=headers,
        )
        assert room_response.status_code == 200

        room_body = room_response.get_json()
        assert room_body["success"] is True

        room_id = room_body["data"]["id"]

        message_response = client.post(
            f"/chat-rooms/{room_id}/messages",
            json={
                "content": "현재 사고 확인 중입니다.",
            },
            headers=headers,
        )
        assert message_response.status_code in (200, 201)

        message_body = message_response.get_json()
        assert message_body["success"] is True
        assert message_body["data"]["sender_user_id"] == user_id
        assert message_body["data"]["message"] == "현재 사고 확인 중입니다."

        list_response = client.get(
            f"/chat-rooms/{room_id}/messages",
            headers=headers,
        )
        assert list_response.status_code == 200

        body = list_response.get_json()
        assert body["success"] is True
        assert len(body["data"]["messages"]) >= 1