from types import SimpleNamespace

from app import create_app
from app.modules.bug_report.service import _allowed_actions as bug_allowed_actions
from app.modules.report_upload.service import ReportUploadService
from app.utils.bbox import build_bbox_metadata


def test_api_errors_use_stable_401_403_404_500_contracts():
    app = create_app({"TESTING": True, "PROPAGATE_EXCEPTIONS": False})

    @app.get("/_test/forbidden")
    def forbidden():
        return {"message": "Permission denied."}, 403

    @app.get("/_test/server-error")
    def server_error():
        raise RuntimeError("forced test error")

    with app.test_client() as client:
        responses = {
            401: client.get("/auth/me"),
            403: client.get("/_test/forbidden"),
            404: client.get("/api/does-not-exist"),
            500: client.get("/_test/server-error"),
        }

    expected_codes = {
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        500: "INTERNAL_SERVER_ERROR",
    }
    for status_code, response in responses.items():
        body = response.get_json()
        assert response.status_code == status_code
        assert body["success"] is False
        assert body["status_code"] == status_code
        assert body["error_code"] == expected_codes[status_code]
        assert body["message"]
        assert body["error"]


def test_report_allowed_actions_are_server_calculated():
    report = SimpleNamespace(
        reporter_id=7,
        status="SUBMITTED",
        deleted_at=None,
        converted_incident_id=None,
    )
    owner = SimpleNamespace(id=7, role="VIEWER")
    admin = SimpleNamespace(id=8, role="CONTROL_ADMIN")

    owner_actions = ReportUploadService._allowed_actions(report, owner)
    admin_actions = ReportUploadService._allowed_actions(report, admin)

    assert owner_actions["update"] is True
    assert owner_actions["approve"] is False
    assert owner_actions["analyze"] is False
    assert admin_actions["approve"] is True
    assert admin_actions["analyze"] is True


def test_bug_report_allowed_actions_require_owner_or_admin():
    bug_report = SimpleNamespace(reporter_id=7, status="OPEN")
    owner = SimpleNamespace(id=7, role="VIEWER")
    stranger = SimpleNamespace(id=8, role="VIEWER")

    assert bug_allowed_actions(bug_report, owner)["update"] is True
    assert bug_allowed_actions(bug_report, stranger)["update"] is False


def test_analysis_status_is_normalized_for_frontend():
    assert ReportUploadService._normalize_analysis_status("PROCESSING") == "RUNNING"
    assert ReportUploadService._normalize_analysis_status("STARTED") == "RUNNING"
    assert ReportUploadService._normalize_analysis_status("QUEUED") == "QUEUED"
    assert ReportUploadService._normalize_analysis_status("COMPLETED") == "COMPLETED"


def test_bbox_metadata_distinguishes_missing_invalid_and_valid():
    missing = build_bbox_metadata(None)
    invalid = build_bbox_metadata([10, 10, 5, 20])
    valid = build_bbox_metadata([10, 20, 30, 40], frame_width=1920, frame_height=1080)

    assert missing["present"] is False
    assert missing["valid"] is False
    assert missing["error"] is None
    assert invalid["present"] is True
    assert invalid["valid"] is False
    assert invalid["error"] == "INVALID_BBOX_FORMAT"
    assert valid["valid"] is True
    assert valid["format"] == "xyxy"
    assert valid["coordinates"] == {
        "x1": 10.0,
        "y1": 20.0,
        "x2": 30.0,
        "y2": 40.0,
    }
