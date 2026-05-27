from unittest.mock import patch

import requests

from app.clients.ai_client import check_ai_health, request_ai_analysis


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
