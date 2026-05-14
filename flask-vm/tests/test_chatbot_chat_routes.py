from app import create_app


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


def test_chat_room_and_messages():
    app = create_app()

    with app.test_client() as client:
        room_response = client.post("/incidents/1/chat-room")
        assert room_response.status_code == 200

        message_response = client.post(
            "/chat-rooms/1/messages",
            json={
                "sender_id": 1,
                "content": "현재 사고 확인 중입니다.",
            },
        )
        assert message_response.status_code == 200

        list_response = client.get("/chat-rooms/1/messages")
        assert list_response.status_code == 200

        body = list_response.get_json()
        assert body["success"] is True
        assert len(body["data"]["messages"]) >= 1