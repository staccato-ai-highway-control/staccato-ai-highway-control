from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_llm_health():
    response = client.get("/internal/llm/health")

    assert response.status_code == 200

    body = response.json()
    assert body["success"] is True
    assert body["service"] == "llm-server"
    assert body["status"] == "ok"
    assert "llm_provider" in body


def test_chatbot_answer():
    payload = {
        "message": "이 사고 요약해줘",
        "incident_context": {
            "incident_type": "LANE_STOP",
            "risk_level": "HIGH",
            "location": "경부고속도로 상행 12km",
            "stopped_seconds": 12.5,
        },
    }

    response = client.post("/internal/llm/chatbot/answer", json=payload)

    assert response.status_code == 200

    body = response.json()
    assert body["success"] is True
    assert body["message"] == "Mock chatbot answer generated"
    assert body["data"]["llm_provider"] == "MOCK"
    assert body["data"]["llm_model"] == "mock-llm"
    assert "answer" in body["data"]
    assert "경부고속도로" in body["data"]["answer"]


def test_report_generate():
    payload = {
        "incident_id": 1,
        "incident_type": "LANE_STOP",
        "risk_level": "HIGH",
        "location": "경부고속도로 상행 12km",
        "summary": "주행 차로 내 정차 차량 감지",
    }

    response = client.post("/internal/llm/reports/generate", json=payload)

    assert response.status_code == 200

    body = response.json()
    assert body["success"] is True
    assert body["message"] == "Mock report generated"
    assert body["data"]["llm_provider"] == "MOCK"
    assert "report_title" in body["data"]
    assert "report_content" in body["data"]


def test_risk_summary():
    payload = {
        "incident_id": 1,
        "incident_type": "LANE_STOP",
        "risk_level": "HIGH",
        "stopped_seconds": 12.5,
        "roi_type": "DRIVING_LANE",
    }

    response = client.post("/internal/llm/risk-summary", json=payload)

    assert response.status_code == 200

    body = response.json()
    assert body["success"] is True
    assert body["message"] == "Mock risk summary generated"
    assert body["data"]["llm_provider"] == "MOCK"
    assert "risk_reason" in body["data"]
