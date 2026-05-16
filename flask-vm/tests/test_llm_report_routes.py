from datetime import datetime
from uuid import uuid4
from unittest.mock import patch

from app import create_app
from app.extensions import db
from app.models.auth_models import User
from app.models.incident_models import DetectionLog, Incident, IncidentSnapshot
from app.models.incident_support_models import IncidentMemo
from app.models.its_support_models import RiskContextSnapshot
from app.models.llm_models import LlmReport
from app.utils.security import create_access_token


def _create_user(app, role="CONTROL_ADMIN"):
    with app.app_context():
        suffix = uuid4().hex[:12]
        user = User(
            login_id=f"llm_report_user_{suffix}",
            email=f"llm-report-{suffix}@example.com",
            password_hash="test-password-hash",
            name="보고서테스트",
            role=role,
            account_status="ACTIVE",
            is_email_verified=True,
            created_at=datetime.utcnow(),
            updated_at=None,
        )
        db.session.add(user)
        db.session.commit()
        return user.id, create_access_token(user)


def _create_incident(app):
    with app.app_context():
        incident = Incident(
            incident_code=f"LLM-INC-{uuid4().hex[:12]}",
            incident_type="LANE_STOP",
            incident_status="DETECTED",
            risk_level="HIGH",
            confidence=0.91,
            stopped_duration_seconds=30,
            location_name="테스트 도로",
            detected_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )
        db.session.add(incident)
        db.session.flush()

        db.session.add(DetectionLog(
            incident_id=incident.id,
            model_name="yolo-test",
            model_version="v1",
            detected_class="stopped_vehicle",
            confidence=0.88,
            roi_type="DRIVING_LANE",
            movement_delta_px=2.5,
            stopped_duration_seconds=30,
            frame_timestamp_ms=1500,
            detected_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
        ))
        db.session.add(IncidentSnapshot(
            incident_id=incident.id,
            file_path="/snapshots/test.jpg",
            thumbnail_path="/snapshots/test-thumb.jpg",
            captured_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
        ))
        db.session.add(IncidentMemo(
            incident_id=incident.id,
            author_user_id=None,
            memo_type="CONTROL",
            memo="현장 확인 필요",
            created_at=datetime.utcnow(),
        ))
        db.session.add(RiskContextSnapshot(
            incident_id=incident.id,
            context_json={"weather": "clear"},
            created_at=datetime.utcnow(),
        ))
        db.session.commit()
        return incident.id


def _headers(token):
    return {"Authorization": f"Bearer {token}"}


def _mock_success(title="정차 차량 사고 보고서", summary="주행 차로 정차 감지", content="보고서 본문"):
    return {
        "success": True,
        "data": {
            "report_title": title,
            "summary": summary,
            "report_content": content,
            "model_name": "test-llm",
            "token_usage": {"total_tokens": 10},
        },
    }


def _create_report(client, incident_id, token, mock_result=None):
    with patch("app.modules.llm_report.service.generate_llm_report", return_value=mock_result or _mock_success()):
        response = client.post(
            f"/incidents/{incident_id}/llm-reports",
            json={"report_type": "INCIDENT_REPORT", "prompt_version": "v1", "llm_provider": "LOCAL_LLM"},
            headers=_headers(token),
        )
    assert response.status_code == 200, response.get_json()
    return response.get_json()["data"]


def test_llm_report_create_requires_auth():
    app = create_app()
    incident_id = _create_incident(app)

    with app.test_client() as client:
        response = client.post(f"/incidents/{incident_id}/llm-reports", json={"report_type": "INCIDENT_REPORT"})

    assert response.status_code == 401


def test_viewer_cannot_create_llm_report():
    app = create_app()
    _, token = _create_user(app, role="VIEWER")
    incident_id = _create_incident(app)

    with app.test_client() as client:
        response = client.post(
            f"/incidents/{incident_id}/llm-reports",
            json={"report_type": "INCIDENT_REPORT"},
            headers=_headers(token),
        )

    assert response.status_code == 403


def test_admin_creates_llm_report_success_and_draft_saved():
    app = create_app()
    _, token = _create_user(app, role="CONTROL_ADMIN")
    incident_id = _create_incident(app)

    with app.test_client() as client:
        report = _create_report(client, incident_id, token)

    assert report["incident_id"] == incident_id
    assert report["report_title"] == "정차 차량 사고 보고서"
    assert report["summary"] == "주행 차로 정차 감지"
    assert report["generation_status"] == "DRAFT"

    with app.app_context():
        stored = LlmReport.query.get(report["id"])
        assert stored.report_status == "DRAFT"
        assert stored.report_content == "보고서 본문"


def test_create_llm_report_incident_not_found():
    app = create_app()
    _, token = _create_user(app, role="SUPER_ADMIN")

    with app.test_client() as client:
        response = client.post(
            "/incidents/999999/llm-reports",
            json={"report_type": "INCIDENT_REPORT"},
            headers=_headers(token),
        )

    assert response.status_code == 404


def test_llm_report_source_snapshot_is_built():
    app = create_app()
    _, token = _create_user(app, role="CONTROL_ADMIN")
    incident_id = _create_incident(app)

    with app.test_client() as client:
        with patch("app.modules.llm_report.service.generate_llm_report", return_value=_mock_success()) as mock_generate:
            response = client.post(
                f"/incidents/{incident_id}/llm-reports",
                json={"report_type": "INCIDENT_REPORT"},
                headers=_headers(token),
            )

    assert response.status_code == 200
    payload = mock_generate.call_args.args[0]
    snapshot = payload["source_snapshot"]
    assert snapshot["incident"]["id"] == incident_id
    assert snapshot["incident"]["incident_type"] == "LANE_STOP"
    assert len(snapshot["detection_logs"]) == 1
    assert len(snapshot["incident_snapshots"]) == 1
    assert len(snapshot["incident_memos"]) == 1
    assert snapshot["risk_context_snapshot"]["context_json"] == {"weather": "clear"}


def test_llm_upstream_failure_saves_failed_report_and_returns_502():
    app = create_app()
    _, token = _create_user(app, role="CONTROL_ADMIN")
    incident_id = _create_incident(app)
    mock_result = {"success": False, "error_code": "LLM_SERVER_REQUEST_FAILED", "message": "timeout"}

    with app.test_client() as client:
        with patch("app.modules.llm_report.service.generate_llm_report", return_value=mock_result):
            response = client.post(
                f"/incidents/{incident_id}/llm-reports",
                json={"report_type": "INCIDENT_REPORT"},
                headers=_headers(token),
            )

    assert response.status_code == 502
    body = response.get_json()
    assert body["data"]["generation_status"] == "FAILED"
    with app.app_context():
        stored = LlmReport.query.get(body["data"]["id"])
        assert stored.report_status == "FAILED"
        assert stored.error_message == "timeout"


def test_list_incident_llm_reports():
    app = create_app()
    _, token = _create_user(app, role="CONTROL_ADMIN")
    incident_id = _create_incident(app)

    with app.test_client() as client:
        created = _create_report(client, incident_id, token)
        response = client.get(f"/incidents/{incident_id}/llm-reports", headers=_headers(token))

    assert response.status_code == 200
    reports = response.get_json()["data"]
    assert any(report["id"] == created["id"] for report in reports)


def test_get_llm_report_detail():
    app = create_app()
    _, token = _create_user(app, role="CONTROL_ADMIN")
    incident_id = _create_incident(app)

    with app.test_client() as client:
        created = _create_report(client, incident_id, token)
        response = client.get(f"/llm-reports/{created['id']}", headers=_headers(token))

    assert response.status_code == 200
    detail = response.get_json()["data"]
    assert detail["id"] == created["id"]
    assert detail["source_snapshot"]["incident"]["id"] == incident_id


def test_update_llm_report():
    app = create_app()
    _, token = _create_user(app, role="CONTROL_ADMIN")
    incident_id = _create_incident(app)

    with app.test_client() as client:
        created = _create_report(client, incident_id, token)
        response = client.patch(
            f"/llm-reports/{created['id']}",
            json={"report_title": "수정 제목", "summary": "수정 요약", "report_content": "수정 본문"},
            headers=_headers(token),
        )

    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["report_title"] == "수정 제목"
    assert data["summary"] == "수정 요약"
    assert data["report_content"] == "수정 본문"
    assert data["generation_status"] == "EDITED"


def test_confirm_llm_report():
    app = create_app()
    _, token = _create_user(app, role="SUPER_ADMIN")
    incident_id = _create_incident(app)

    with app.test_client() as client:
        created = _create_report(client, incident_id, token)
        response = client.post(f"/llm-reports/{created['id']}/confirm", headers=_headers(token))

    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["generation_status"] == "CONFIRMED"
    assert data["confirmed_at"] is not None


def test_regenerate_llm_report_updates_existing_report():
    app = create_app()
    _, token = _create_user(app, role="CONTROL_ADMIN")
    incident_id = _create_incident(app)

    with app.test_client() as client:
        created = _create_report(client, incident_id, token)
        with patch("app.modules.llm_report.service.generate_llm_report", return_value=_mock_success(title="재생성 제목", summary="재생성 요약", content="재생성 본문")):
            response = client.post(f"/llm-reports/{created['id']}/regenerate", headers=_headers(token))

    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["id"] == created["id"]
    assert data["report_title"] == "재생성 제목"
    assert data["summary"] == "재생성 요약"
    assert data["report_content"] == "재생성 본문"


def test_delete_llm_report_soft_delete_status():
    app = create_app()
    _, token = _create_user(app, role="CONTROL_ADMIN")
    incident_id = _create_incident(app)

    with app.test_client() as client:
        created = _create_report(client, incident_id, token)
        response = client.delete(f"/llm-reports/{created['id']}", headers=_headers(token))

    assert response.status_code == 200
    assert response.get_json()["data"]["generation_status"] == "DELETED"
    with app.app_context():
        stored = LlmReport.query.get(created["id"])
        assert stored.report_status == "DELETED"
