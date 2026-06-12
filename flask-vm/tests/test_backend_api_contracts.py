"""backend api contracts 동작과 회귀 계약을 검증하는 테스트 모듈.

격리된 픽스처로 성공 경로, 입력 오류, 권한 및 데이터베이스 부작용을 확인한다."""

# 설명: types에서 SimpleNamespace 이름을 가져와 아래 로직에서 재사용한다.
from types import SimpleNamespace

# 설명: app에서 create_app 이름을 가져와 아래 로직에서 재사용한다.
from app import create_app
# 설명: app.modules.bug_report.service에서 bug_allowed_actions 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.bug_report.service import _allowed_actions as bug_allowed_actions
# 설명: app.modules.report_upload.service에서 ReportUploadService 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.report_upload.service import ReportUploadService
# 설명: app.utils.bbox에서 build_bbox_metadata 이름을 가져와 아래 로직에서 재사용한다.
from app.utils.bbox import build_bbox_metadata


# 설명: `test_api_errors_use_stable_401_403_404_500_contracts` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_api_errors_use_stable_401_403_404_500_contracts():
    # 설명: `app`에 `create_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app = create_app({"TESTING": True, "PROPAGATE_EXCEPTIONS": False})

    # 설명: `forbidden` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @app.get("/_test/forbidden")
    def forbidden():
        # 설명: 호출자에게 ({'message': 'Permission denied.'}, 403) 값을 함수 결과로 반환한다.
        return {"message": "Permission denied."}, 403

    # 설명: `server_error` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @app.get("/_test/server-error")
    def server_error():
        # 설명: 현재 처리를 중단하고 RuntimeError('forced test error')를 호출자에게 전달한다.
        raise RuntimeError("forced test error")

    # 설명: `app.test_client()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.test_client() as client:
        # 설명: `responses`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        responses = {
            401: client.get("/auth/me"),
            403: client.get("/_test/forbidden"),
            404: client.get("/api/does-not-exist"),
            500: client.get("/_test/server-error"),
        }

    # 설명: `expected_codes`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    expected_codes = {
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        500: "INTERNAL_SERVER_ERROR",
    }
    # 설명: `responses.items()`의 각 항목을 `(status_code, response)`로 받아 반복 처리한다.
    for status_code, response in responses.items():
        # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
        body = response.get_json()
        # 설명: 테스트 전제 또는 결과인 `response.status_code == status_code` 조건이 참인지 검증한다.
        assert response.status_code == status_code
        # 설명: 테스트 전제 또는 결과인 `body['success'] is False` 조건이 참인지 검증한다.
        assert body["success"] is False
        # 설명: 테스트 전제 또는 결과인 `body['status_code'] == status_code` 조건이 참인지 검증한다.
        assert body["status_code"] == status_code
        # 설명: 테스트 전제 또는 결과인 `body['error_code'] == expected_codes[status_code]` 조건이 참인지 검증한다.
        assert body["error_code"] == expected_codes[status_code]
        # 설명: 테스트 전제 또는 결과인 `body['message']` 조건이 참인지 검증한다.
        assert body["message"]
        # 설명: 테스트 전제 또는 결과인 `body['error']` 조건이 참인지 검증한다.
        assert body["error"]


# 설명: `test_report_allowed_actions_are_server_calculated` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_report_allowed_actions_are_server_calculated():
    # 설명: `report`에 `SimpleNamespace` 호출 결과를 저장해 다음 처리에서 사용한다.
    report = SimpleNamespace(
        reporter_id=7,
        status="SUBMITTED",
        deleted_at=None,
        converted_incident_id=None,
    )
    # 설명: `owner`에 `SimpleNamespace` 호출 결과를 저장해 다음 처리에서 사용한다.
    owner = SimpleNamespace(id=7, role="VIEWER")
    # 설명: `admin`에 `SimpleNamespace` 호출 결과를 저장해 다음 처리에서 사용한다.
    admin = SimpleNamespace(id=8, role="CONTROL_ADMIN")

    # 설명: `owner_actions`에 `ReportUploadService._allowed_actions` 호출 결과를 저장해 다음 처리에서 사용한다.
    owner_actions = ReportUploadService._allowed_actions(report, owner)
    # 설명: `admin_actions`에 `ReportUploadService._allowed_actions` 호출 결과를 저장해 다음 처리에서 사용한다.
    admin_actions = ReportUploadService._allowed_actions(report, admin)

    # 설명: 테스트 전제 또는 결과인 `owner_actions['update'] is True` 조건이 참인지 검증한다.
    assert owner_actions["update"] is True
    # 설명: 테스트 전제 또는 결과인 `owner_actions['approve'] is False` 조건이 참인지 검증한다.
    assert owner_actions["approve"] is False
    # 설명: 테스트 전제 또는 결과인 `owner_actions['analyze'] is False` 조건이 참인지 검증한다.
    assert owner_actions["analyze"] is False
    # 설명: 테스트 전제 또는 결과인 `admin_actions['approve'] is True` 조건이 참인지 검증한다.
    assert admin_actions["approve"] is True
    # 설명: 테스트 전제 또는 결과인 `admin_actions['analyze'] is True` 조건이 참인지 검증한다.
    assert admin_actions["analyze"] is True


# 설명: `test_bug_report_allowed_actions_require_owner_or_admin` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_bug_report_allowed_actions_require_owner_or_admin():
    # 설명: `bug_report`에 `SimpleNamespace` 호출 결과를 저장해 다음 처리에서 사용한다.
    bug_report = SimpleNamespace(reporter_id=7, status="OPEN")
    # 설명: `owner`에 `SimpleNamespace` 호출 결과를 저장해 다음 처리에서 사용한다.
    owner = SimpleNamespace(id=7, role="VIEWER")
    # 설명: `stranger`에 `SimpleNamespace` 호출 결과를 저장해 다음 처리에서 사용한다.
    stranger = SimpleNamespace(id=8, role="VIEWER")

    # 설명: 테스트 전제 또는 결과인 `bug_allowed_actions(bug_report, owner)['update'] is True` 조건이 참인지 검증한다.
    assert bug_allowed_actions(bug_report, owner)["update"] is True
    # 설명: 테스트 전제 또는 결과인 `bug_allowed_actions(bug_report, stranger)['update'] is False` 조건이 참인지 검증한다.
    assert bug_allowed_actions(bug_report, stranger)["update"] is False


# 설명: `test_analysis_status_is_normalized_for_frontend` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_analysis_status_is_normalized_for_frontend():
    # 설명: 테스트 전제 또는 결과인 `ReportUploadService._normalize_analysis_status('PROCESSING') == 'RUNNING'` 조건이 참인지 검증한다.
    assert ReportUploadService._normalize_analysis_status("PROCESSING") == "RUNNING"
    # 설명: 테스트 전제 또는 결과인 `ReportUploadService._normalize_analysis_status('STARTED') == 'RUNNING'` 조건이 참인지 검증한다.
    assert ReportUploadService._normalize_analysis_status("STARTED") == "RUNNING"
    # 설명: 테스트 전제 또는 결과인 `ReportUploadService._normalize_analysis_status('QUEUED') == 'QUEUED'` 조건이 참인지 검증한다.
    assert ReportUploadService._normalize_analysis_status("QUEUED") == "QUEUED"
    # 설명: 테스트 전제 또는 결과인 `ReportUploadService._normalize_analysis_status('COMPLETED') == 'COMPLETED'` 조건이 참인지 검증한다.
    assert ReportUploadService._normalize_analysis_status("COMPLETED") == "COMPLETED"


# 설명: `test_bbox_metadata_distinguishes_missing_invalid_and_valid` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_bbox_metadata_distinguishes_missing_invalid_and_valid():
    # 설명: `missing`에 `build_bbox_metadata` 호출 결과를 저장해 다음 처리에서 사용한다.
    missing = build_bbox_metadata(None)
    # 설명: `invalid`에 `build_bbox_metadata` 호출 결과를 저장해 다음 처리에서 사용한다.
    invalid = build_bbox_metadata([10, 10, 5, 20])
    # 설명: `valid`에 `build_bbox_metadata` 호출 결과를 저장해 다음 처리에서 사용한다.
    valid = build_bbox_metadata([10, 20, 30, 40], frame_width=1920, frame_height=1080)

    # 설명: 테스트 전제 또는 결과인 `missing['present'] is False` 조건이 참인지 검증한다.
    assert missing["present"] is False
    # 설명: 테스트 전제 또는 결과인 `missing['valid'] is False` 조건이 참인지 검증한다.
    assert missing["valid"] is False
    # 설명: 테스트 전제 또는 결과인 `missing['error'] is None` 조건이 참인지 검증한다.
    assert missing["error"] is None
    # 설명: 테스트 전제 또는 결과인 `invalid['present'] is True` 조건이 참인지 검증한다.
    assert invalid["present"] is True
    # 설명: 테스트 전제 또는 결과인 `invalid['valid'] is False` 조건이 참인지 검증한다.
    assert invalid["valid"] is False
    # 설명: 테스트 전제 또는 결과인 `invalid['error'] == 'INVALID_BBOX_FORMAT'` 조건이 참인지 검증한다.
    assert invalid["error"] == "INVALID_BBOX_FORMAT"
    # 설명: 테스트 전제 또는 결과인 `valid['valid'] is True` 조건이 참인지 검증한다.
    assert valid["valid"] is True
    # 설명: 테스트 전제 또는 결과인 `valid['format'] == 'xyxy'` 조건이 참인지 검증한다.
    assert valid["format"] == "xyxy"
    # 설명: 테스트 전제 또는 결과인 `valid['coordinates'] == {'x1': 10.0, 'y1': 20.0, 'x2': 30.0, 'y2': 40.0}` 조건이 참인지 검증한다.
    assert valid["coordinates"] == {
        "x1": 10.0,
        "y1": 20.0,
        "x2": 30.0,
        "y2": 40.0,
    }
