from app.services.llm_service import (
    get_llm_health,
    generate_chatbot_answer,
    generate_report,
    generate_risk_summary,
)


def test_get_llm_health_service():
    result = get_llm_health()

    assert result["success"] is True
    assert result["service"] == "llm-server"
    assert result["status"] == "ok"


def test_generate_chatbot_answer_service():
    payload = {
        "message": "이 사고 요약해줘",
        "incident_context": {
            "incident_type": "LANE_STOP",
            "risk_level": "HIGH",
            "location": "경부고속도로 상행 12km",
            "stopped_seconds": 12.5,
        },
    }

    result = generate_chatbot_answer(payload)

    assert result["success"] is True
    assert result["data"]["llm_provider"] == "MOCK"
    assert result["data"]["llm_model"] == "mock-llm"
    assert "answer" in result["data"]


def test_generate_report_service():
    payload = {
        "incident_id": 1,
        "incident_type": "LANE_STOP",
        "risk_level": "HIGH",
        "location": "경부고속도로 상행 12km",
        "summary": "주행 차로 내 정차 차량 감지",
    }

    result = generate_report(payload)

    assert result["success"] is True
    assert result["data"]["llm_provider"] == "MOCK"
    assert "report_content" in result["data"]


def test_generate_risk_summary_service():
    payload = {
        "incident_id": 1,
        "incident_type": "LANE_STOP",
        "risk_level": "HIGH",
        "stopped_seconds": 12.5,
    }

    result = generate_risk_summary(payload)

    assert result["success"] is True
    assert result["data"]["llm_provider"] == "MOCK"
    assert "risk_reason" in result["data"]
