"""incident unit 동작과 회귀 계약을 검증하는 테스트 모듈.

격리된 픽스처로 성공 경로, 입력 오류, 권한 및 데이터베이스 부작용을 확인한다."""

# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: datetime에서 datetime 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime
# 설명: uuid에서 uuid4 이름을 가져와 아래 로직에서 재사용한다.
from uuid import uuid4

# 설명: pytest 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import pytest

# 설명: app에서 create_app 이름을 가져와 아래 로직에서 재사용한다.
from app import create_app
# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.models에서 IncidentReport, ReportAnalysisJob, ReportAttachment, User 이름을 가져와 아래 로직에서 재사용한다.
from app.models import IncidentReport, ReportAnalysisJob, ReportAttachment, User
# 설명: db_cleanup에서 cleanup_database 이름을 가져와 아래 로직에서 재사용한다.
from db_cleanup import cleanup_database
# 설명: app.modules.incident.service에서 IncidentService 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.incident.service import IncidentService


# 설명: `app` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@pytest.fixture
def app(tmp_path):
    # 설명: `test_database_url`에 `os.environ.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    test_database_url = os.environ.get("TEST_DATABASE_URL")
    # 설명: 테스트 전제 또는 결과인 `test_database_url` 조건이 참인지 검증한다.
    assert test_database_url, "TEST_DATABASE_URL is required for MySQL-isolated tests."
    # 설명: 테스트 전제 또는 결과인 `'staccato_test' in test_database_url` 조건이 참인지 검증한다.
    assert "staccato_test" in test_database_url, "Refusing to run tests outside staccato_test database."

    # 설명: `upload_path`에 tmp_path / 'uploads' 표현식의 계산 결과를 저장한다.
    upload_path = tmp_path / "uploads"

    # 설명: `app`에 `create_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": test_database_url,
        "UPLOAD_BASE_PATH": str(upload_path),
        "SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
        "JWT_SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
    })

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `db.create_all`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        db.create_all()
        # 설명: `cleanup_database`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        cleanup_database(db)

    # 설명: `(yield app)` 표현식을 평가해 필요한 동작을 수행한다.
    yield app

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `cleanup_database`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        cleanup_database(db)


# 설명: `test_user` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
@pytest.fixture
def test_user(app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `suffix`에 uuid4().hex[:8] 표현식의 계산 결과를 저장한다.
        suffix = uuid4().hex[:8]
        # 설명: `user`에 `User` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = User(
            login_id=f"incident_user_{suffix}",
            email=f"incident_user_{suffix}@test.local",
            password_hash="hashed_pw",
            name="Incident Tester",
            role="USER",
            account_status="ACTIVE",
            created_at=datetime.utcnow(),
        )
        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(user)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
        # 설명: `user_id`에 user.id 표현식의 계산 결과를 저장한다.
        user_id = user.id

    # 설명: 호출자에게 user_id 값을 함수 결과로 반환한다.
    return user_id


# 설명: `test_incident_creation_creates_report_attachment_and_job` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_incident_creation_creates_report_attachment_and_job(app, test_user, tmp_path, monkeypatch):
    # 설명: `calls`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    calls = []

    # 설명: `fake_request_analysis` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def fake_request_analysis(report_id, file_path):
        # 설명: `calls.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
        calls.append({
            "report_id": report_id,
            "file_path": file_path,
        })
        # 설명: 호출자에게 (True, {'job_status': 'QUEUED'}) 값을 함수 결과로 반환한다.
        return True, {"job_status": "QUEUED"}

    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr(
        "app.modules.incident.service.AIGatewayService.request_analysis",
        fake_request_analysis,
    )

    # 설명: `uploaded_file`에 tmp_path / 'incident.jpg' 표현식의 계산 결과를 저장한다.
    uploaded_file = tmp_path / "incident.jpg"
    # 설명: `uploaded_file.write_bytes`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    uploaded_file.write_bytes(b"fake image content")

    # 설명: `file_info`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    file_info = {
        "file_path": str(uploaded_file),
        "original_filename": "incident.jpg",
        "stored_filename": "incident_stored.jpg",
        "file_type": "IMAGE",
        "storage_type": "LOCAL",
        "file_size": uploaded_file.stat().st_size,
        "file_hash": "fakehash",
        "mime_type": "image/jpeg",
        "scan_status": "PENDING",
        "is_private": 1,
    }

    # 설명: `form_data`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    form_data = {
        "report_type": "ACCIDENT",
        "title": "테스트 사고 신고",
        "description": "이상상황 테스트 신고입니다.",
    }

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `result`에 `IncidentService.create_incident` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = IncidentService.create_incident(
            form_data,
            file_info,
            user_id=test_user,
        )

        # 설명: 테스트 전제 또는 결과인 `result['status'] == 'success'` 조건이 참인지 검증한다.
        assert result["status"] == "success"
        # 설명: 테스트 전제 또는 결과인 `result['report_id']` 조건이 참인지 검증한다.
        assert result["report_id"]

        # 설명: `report`에 `IncidentReport.query.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = IncidentReport.query.get(result["report_id"])
        # 설명: 테스트 전제 또는 결과인 `report is not None` 조건이 참인지 검증한다.
        assert report is not None
        # 설명: 테스트 전제 또는 결과인 `report.report_type == 'ACCIDENT'` 조건이 참인지 검증한다.
        assert report.report_type == "ACCIDENT"
        # 설명: 테스트 전제 또는 결과인 `report.report_source_type == 'MOBILE_UPLOAD'` 조건이 참인지 검증한다.
        assert report.report_source_type == "MOBILE_UPLOAD"
        # 설명: 테스트 전제 또는 결과인 `report.reporter_id == test_user` 조건이 참인지 검증한다.
        assert report.reporter_id == test_user
        # 설명: 테스트 전제 또는 결과인 `report.status == 'PENDING'` 조건이 참인지 검증한다.
        assert report.status == "PENDING"

        # 설명: `attachment`에 `ReportAttachment.query.filter_by(report_id=report.id).one` 호출 결과를 저장해 다음 처리에서 사용한다.
        attachment = ReportAttachment.query.filter_by(report_id=report.id).one()
        # 설명: 테스트 전제 또는 결과인 `attachment.original_filename == 'incident.jpg'` 조건이 참인지 검증한다.
        assert attachment.original_filename == "incident.jpg"
        # 설명: 테스트 전제 또는 결과인 `attachment.stored_filename == 'incident_stored.jpg'` 조건이 참인지 검증한다.
        assert attachment.stored_filename == "incident_stored.jpg"
        # 설명: 테스트 전제 또는 결과인 `attachment.uploaded_by == test_user` 조건이 참인지 검증한다.
        assert attachment.uploaded_by == test_user

        # 설명: `job`에 `ReportAnalysisJob.query.filter_by(report_id=report.id).one` 호출 결과를 저장해 다음 처리에서 사용한다.
        job = ReportAnalysisJob.query.filter_by(report_id=report.id).one()
        # 설명: 테스트 전제 또는 결과인 `job.attachment_id == attachment.id` 조건이 참인지 검증한다.
        assert job.attachment_id == attachment.id
        # 설명: 테스트 전제 또는 결과인 `job.job_status == 'QUEUED'` 조건이 참인지 검증한다.
        assert job.job_status == "QUEUED"
        # 설명: 테스트 전제 또는 결과인 `job.analysis_type == 'INCIDENT_DETECTION'` 조건이 참인지 검증한다.
        assert job.analysis_type == "INCIDENT_DETECTION"
        # 설명: 테스트 전제 또는 결과인 `job.requested_by == test_user` 조건이 참인지 검증한다.
        assert job.requested_by == test_user

        # 설명: 테스트 전제 또는 결과인 `calls == [{'report_id': report.id, 'file_path': str(uploaded_file)}]` 조건이 참인지 검증한다.
        assert calls == [{
            "report_id": report.id,
            "file_path": str(uploaded_file),
        }]


# 설명: `test_incident_creation_rolls_back_and_removes_uploaded_file_on_failure` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_incident_creation_rolls_back_and_removes_uploaded_file_on_failure(app, test_user, tmp_path, monkeypatch):
    # 설명: `fake_request_analysis` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def fake_request_analysis(report_id, file_path):
        # 설명: 호출자에게 (True, {'job_status': 'QUEUED'}) 값을 함수 결과로 반환한다.
        return True, {"job_status": "QUEUED"}

    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr(
        "app.modules.incident.service.AIGatewayService.request_analysis",
        fake_request_analysis,
    )

    # 설명: `uploaded_file`에 tmp_path / 'bad_incident.jpg' 표현식의 계산 결과를 저장한다.
    uploaded_file = tmp_path / "bad_incident.jpg"
    # 설명: `uploaded_file.write_bytes`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    uploaded_file.write_bytes(b"fake image content")

    # 설명: `file_info`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    file_info = {
        "file_path": str(uploaded_file),
        "original_filename": "bad_incident.jpg",
        "stored_filename": "bad_incident_stored.jpg",
        "file_type": "IMAGE",
        "storage_type": "LOCAL",
        "file_size": uploaded_file.stat().st_size,
        "file_hash": "fakehash",
        "mime_type": "image/jpeg",
        "scan_status": "PENDING",
        "is_private": 1,
    }

    # 설명: `form_data`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    form_data = {
        "report_type": "ACCIDENT",
        "title": None,
        "description": "title fallback을 검증합니다.",
    }

    # 설명: `original_add`에 db.session.add 표현식의 계산 결과를 저장한다.
    original_add = db.session.add

    # 설명: `failing_add` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def failing_add(instance):
        # 설명: `isinstance(instance, ReportAnalysisJob)` 조건 결과에 따라 실행 경로를 분기한다.
        if isinstance(instance, ReportAnalysisJob):
            # 설명: 현재 처리를 중단하고 RuntimeError('forced job insert failure')를 호출자에게 전달한다.
            raise RuntimeError("forced job insert failure")
        # 설명: 호출자에게 original_add(instance) 값을 함수 결과로 반환한다.
        return original_add(instance)

    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr(db.session, "add", failing_add)

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `pytest.raises(RuntimeError, match='forced job insert...` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
        with pytest.raises(RuntimeError, match="forced job insert failure"):
            # 설명: `IncidentService.create_incident`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            IncidentService.create_incident(
                form_data,
                file_info,
                user_id=test_user,
            )

        # 설명: 테스트 전제 또는 결과인 `IncidentReport.query.count() == 0` 조건이 참인지 검증한다.
        assert IncidentReport.query.count() == 0
        # 설명: 테스트 전제 또는 결과인 `ReportAttachment.query.count() == 0` 조건이 참인지 검증한다.
        assert ReportAttachment.query.count() == 0
        # 설명: 테스트 전제 또는 결과인 `ReportAnalysisJob.query.count() == 0` 조건이 참인지 검증한다.
        assert ReportAnalysisJob.query.count() == 0
        # 설명: 테스트 전제 또는 결과인 `not uploaded_file.exists()` 조건이 참인지 검증한다.
        assert not uploaded_file.exists()
