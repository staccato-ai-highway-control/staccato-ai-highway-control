from unittest.mock import patch

import requests

from app.clients.ai_client import check_ai_health, request_ai_analysis
from app.clients.llm_client import check_llm_health, request_llm_report, request_chatbot_answer


class MockResponse:
    def __init__(self, json_data):
        self._json_data = json_data

    def raise_for_status(self):
        return None

    def json(self):
        return self._json_data


def test_check_ai_health_success():
    mock_data = {
        "success": True,
        "service": "ai-server",
        "status": "ok",
    }

    with patch("app.clients.ai_client.requests.get") as mock_get:
        mock_get.return_value = MockResponse(mock_data)

        result = check_ai_health()

        assert result["success"] is True
        assert result["service"] == "ai-server"
        assert result["status"] == "ok"


def test_request_ai_analysis_success():
    payload = {
        "analysis_job_id": 100,
        "report_id": 20,
        "attachment_id": 55,
        "file_path": "/app/storage/uploads/demo.mp4",
    }

    mock_data = {
        "success": True,
        "detected": True,
        "incident_type": "LANE_STOP",
        "risk_level": "HIGH",
        "confidence": 0.87,
        "stopped_seconds": 12.5,
        "movement_delta": 8.2,
        "roi_type": "DRIVING_LANE",
        "snapshot_path": "/app/storage/snapshots/inc_100_001.jpg",
        "detection_logs": [],
    }

    with patch("app.clients.ai_client.requests.post") as mock_post:
        mock_post.return_value = MockResponse(mock_data)

        result = request_ai_analysis(payload)

        assert result["success"] is True
        assert result["detected"] is True
        assert result["incident_type"] == "LANE_STOP"
        assert result["risk_level"] == "HIGH"


def test_request_ai_analysis_failure():
    payload = {
        "analysis_job_id": 100,
        "report_id": 20,
        "attachment_id": 55,
        "file_path": "/app/storage/uploads/demo.mp4",
    }

    with patch("app.clients.ai_client.requests.post") as mock_post:
        mock_post.side_effect = requests.RequestException("AI server error")

        result = request_ai_analysis(payload)

        assert result["success"] is False
        assert result["error_code"] == "AI_SERVER_REQUEST_FAILED"


def test_check_llm_health_success():
    mock_data = {
        "success": True,
        "service": "llm-server",
        "status": "ok",
    }

    with patch("app.clients.llm_client.requests.get") as mock_get:
        mock_get.return_value = MockResponse(mock_data)

        result = check_llm_health()

        assert result["success"] is True
        assert result["service"] == "llm-server"
        assert result["status"] == "ok"


def test_request_llm_report_success():
    payload = {
        "incident_id": 1,
        "report_type": "INCIDENT_REPORT",
        "source_snapshot": {
            "incident_type": "LANE_STOP",
            "risk_level": "HIGH",
        },
    }

    mock_data = {
        "success": True,
        "report_title": "정차 차량 사고 보고서",
        "summary": "도로 위 정차 차량이 감지되었습니다.",
        "report_content": "사고 개요, 탐지 근거, 조치 사항을 포함한 보고서 초안입니다.",
    }

    with patch("app.clients.llm_client.requests.post") as mock_post:
        mock_post.return_value = MockResponse(mock_data)

        result = request_llm_report(payload)

        assert result["success"] is True
        assert "report_title" in result
        assert "summary" in result


def test_request_chatbot_answer_success():
    payload = {
        "incident_id": 1,
        "message": "왜 위험도가 HIGH인가요?",
    }

    mock_data = {
        "success": True,
        "answer": "정차 시간이 길고 주행 차로 내에서 감지되어 위험도가 높습니다.",
    }

    with patch("app.clients.llm_client.requests.post") as mock_post:
        mock_post.return_value = MockResponse(mock_data)

        result = request_chatbot_answer(payload)

        assert result["success"] is True
        assert "answer" in result
