"""report analysis unit 동작과 회귀 계약을 검증하는 테스트 모듈.

격리된 픽스처로 성공 경로, 입력 오류, 권한 및 데이터베이스 부작용을 확인한다.

검증하는 데이터 흐름은 다음과 같다.
1. FileStorage/form 값 -> ReportUploadService -> incident_reports/report_attachments/report_locations
2. 분석 요청 -> report_analysis_jobs(QUEUED) -> 워커 -> AI JSON -> result_summary(COMPLETED)
3. 상태 변경 -> incident_reports.status UPDATE + report_status_histories INSERT
"""

# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: datetime에서 datetime 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime
# 설명: io에서 BytesIO 이름을 가져와 아래 로직에서 재사용한다.
from io import BytesIO
# 설명: uuid에서 uuid4 이름을 가져와 아래 로직에서 재사용한다.
from uuid import uuid4

# 설명: pytest 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import pytest
# 설명: werkzeug.datastructures에서 FileStorage 이름을 가져와 아래 로직에서 재사용한다.
from werkzeug.datastructures import FileStorage

# 설명: app에서 create_app 이름을 가져와 아래 로직에서 재사용한다.
from app import create_app
# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.models에서 IncidentReport, ReportAnalysisJob, ReportAttachment, ReportLocation, ReportStatusHistory, User 이름을 가져와 아래 로직에서 재사용한다.
from app.models import IncidentReport, ReportAnalysisJob, ReportAttachment, ReportLocation, ReportStatusHistory, User
# 설명: app.modules.report_upload.service에서 ReportUploadService 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.report_upload.service import ReportUploadService
# 설명: db_cleanup에서 cleanup_database 이름을 가져와 아래 로직에서 재사용한다.
from db_cleanup import cleanup_database


# 설명: `app` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@pytest.fixture
def app(tmp_path):
    """테스트마다 격리된 업로드 경로와 전용 MySQL 스키마를 사용하는 앱을 만든다.

    운영 데이터베이스 오접속을 막기 위해 URL을 강하게 검사하고, 테스트 전후에
    데이터를 정리해 이전 테스트의 레코드가 다음 검증에 영향을 주지 않게 한다.
    """
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
    """신고 작성과 관리자 상태 변경을 모두 수행할 수 있는 활성 사용자를 생성한다."""
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 병렬 또는 반복 실행에서도 login_id와 email의 UNIQUE 제약을 피한다.
        suffix = uuid4().hex[:8]
        # 설명: `user`에 `User` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = User(
            login_id=f"report_user_{suffix}",
            email=f"report_user_{suffix}@test.local",
            password_hash="hashed_pw",
            name="Report Tester",
            role="CONTROL_ADMIN",
            account_status="ACTIVE",
            is_email_verified=1,
            created_at=datetime.utcnow(),
        )
        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(user)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
        # 설명: 호출자에게 user.id 값을 함수 결과로 반환한다.
        return user.id


# 설명: `make_file` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def make_file(filename="귀여운 강아지.jpg", content=b"fake image content"):
    """실제 디스크 파일 없이 업로드 API가 받는 FileStorage 객체를 구성한다."""
    # 설명: 호출자에게 FileStorage(stream=BytesIO(content), filename=filename, content_type='image/jpeg') 값을 함수 결과로 반환한다.
    return FileStorage(
        stream=BytesIO(content),
        filename=filename,
        content_type="image/jpeg",
    )


# 설명: `test_create_report_preserves_original_filename_and_location_text` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_create_report_preserves_original_filename_and_location_text(app, test_user):
    """한글 원본 파일명과 사람이 입력한 위치 문자열이 손실 없이 저장되는지 검증한다."""
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `report`에 `ReportUploadService.create_report` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = ReportUploadService.create_report(
            user_id=test_user,
            data={
                "report_type": "ACCIDENT",
                "upload_purpose": "REPORT",
                "title": "파일명 보존 테스트",
                "description": "한글 파일명과 위치 텍스트 저장을 검증합니다.",
                "priority": "NORMAL",
                "latitude": "37.2636",
                "longitude": "127.0286",
                "location": "경부고속도로 수원IC 123.4K",
            },
            files=[make_file()],
        )

        # 설명: `attachment`에 `ReportAttachment.query.filter_by(report_id=report.id).one` 호출 결과를 저장해 다음 처리에서 사용한다.
        attachment = ReportAttachment.query.filter_by(report_id=report.id).one()
        # 설명: `location`에 `ReportLocation.query.filter_by(report_id=report.id).one` 호출 결과를 저장해 다음 처리에서 사용한다.
        location = ReportLocation.query.filter_by(report_id=report.id).one()

        # 표시용 원본명과 충돌 방지용 저장명은 서로 다른 책임을 가진다.
        assert attachment.original_filename == "귀여운 강아지.jpg"
        # 설명: 테스트 전제 또는 결과인 `attachment.stored_filename.endswith('.jpg')` 조건이 참인지 검증한다.
        assert attachment.stored_filename.endswith(".jpg")
        # 설명: 테스트 전제 또는 결과인 `attachment.stored_filename != attachment.original_filename` 조건이 참인지 검증한다.
        assert attachment.stored_filename != attachment.original_filename

        # 배포 환경의 마이그레이션 단계에 따라 존재할 수 있는 위치 컬럼을 모두 확인한다.
        if hasattr(location, "place_name"):
            # 설명: 테스트 전제 또는 결과인 `location.place_name == '경부고속도로 수원IC 123.4K'` 조건이 참인지 검증한다.
            assert location.place_name == "경부고속도로 수원IC 123.4K"
        # 설명: `hasattr(location, 'address_raw')` 조건 결과에 따라 실행 경로를 분기한다.
        if hasattr(location, "address_raw"):
            # 설명: 테스트 전제 또는 결과인 `location.address_raw == '경부고속도로 수원IC 123.4K'` 조건이 참인지 검증한다.
            assert location.address_raw == "경부고속도로 수원IC 123.4K"


# 설명: `test_request_report_analysis_creates_job_and_is_idempotent` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_request_report_analysis_creates_job_and_is_idempotent(app, test_user, monkeypatch):
    """분석 요청이 작업만 큐에 넣고 중복 호출에서는 기존 작업을 재사용하는지 검증한다."""
    # 설명: `calls`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    calls = []

    # 설명: `fake_request_analysis` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def fake_request_analysis(report_id, file_path):
        """동기 AI 호출이 발생하면 기록해 큐 기반 처리 계약 위반을 드러낸다."""
        # 설명: `calls.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
        calls.append((report_id, file_path))
        # 설명: 호출자에게 (True, {'status': 'queued'}) 값을 함수 결과로 반환한다.
        return True, {"status": "queued"}

    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr(
        "app.modules.ai_gateway.service.AIGatewayService.request_analysis",
        fake_request_analysis,
    )

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `report`에 `ReportUploadService.create_report` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = ReportUploadService.create_report(
            user_id=test_user,
            data={
                "report_type": "ACCIDENT",
                "upload_purpose": "ANALYSIS",
                "title": "분석 작업 생성 테스트",
                "latitude": "37.2636",
                "longitude": "127.0286",
            },
            files=[make_file(filename="incident-test.jpg")],
        )

        # 설명: `(result, status_code)`에 `ReportUploadService.request_report_analysis` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.request_report_analysis(
            report_id=report.id,
            user_id=test_user,
        )

        # 설명: 테스트 전제 또는 결과인 `status_code == 201` 조건이 참인지 검증한다.
        assert status_code == 201
        # 설명: 테스트 전제 또는 결과인 `result['success'] is True` 조건이 참인지 검증한다.
        assert result["success"] is True
        # 설명: 테스트 전제 또는 결과인 `result['report_id'] == report.id` 조건이 참인지 검증한다.
        assert result["report_id"] == report.id
        # 설명: 테스트 전제 또는 결과인 `result['job_id'] is not None` 조건이 참인지 검증한다.
        assert result["job_id"] is not None

        # 설명: `job`에 `ReportAnalysisJob.query.filter_by(report_id=report.id).one` 호출 결과를 저장해 다음 처리에서 사용한다.
        job = ReportAnalysisJob.query.filter_by(report_id=report.id).one()
        # 설명: `attachment`에 `ReportAttachment.query.filter_by(report_id=report.id).one` 호출 결과를 저장해 다음 처리에서 사용한다.
        attachment = ReportAttachment.query.filter_by(report_id=report.id).one()

        # 설명: 테스트 전제 또는 결과인 `job.attachment_id == attachment.id` 조건이 참인지 검증한다.
        assert job.attachment_id == attachment.id
        # 설명: 테스트 전제 또는 결과인 `job.job_status == 'QUEUED'` 조건이 참인지 검증한다.
        assert job.job_status == "QUEUED"
        # 설명: 테스트 전제 또는 결과인 `job.analysis_type == 'INCIDENT_DETECTION'` 조건이 참인지 검증한다.
        assert job.analysis_type == "INCIDENT_DETECTION"
        # 설명: 테스트 전제 또는 결과인 `job.requested_by == test_user` 조건이 참인지 검증한다.
        assert job.requested_by == test_user
        # HTTP 요청 단계에서는 외부 AI 서버를 호출하지 않고 워커에 실행을 위임한다.
        assert calls == []

        # 설명: `(second_result, second_status_code)`에 `ReportUploadService.request_report_analysis` 호출 결과를 저장해 다음 처리에서 사용한다.
        second_result, second_status_code = ReportUploadService.request_report_analysis(
            report_id=report.id,
            user_id=test_user,
        )

        # 같은 신고서에 활성 작업이 있으면 새 행을 만들지 않고 기존 job_id를 반환한다.
        assert second_status_code == 200
        # 설명: 테스트 전제 또는 결과인 `second_result['job_id'] == job.id` 조건이 참인지 검증한다.
        assert second_result["job_id"] == job.id
        # 설명: 테스트 전제 또는 결과인 `ReportAnalysisJob.query.filter_by(report_id=report.id).count() == 1` 조건이 참인지 검증한다.
        assert ReportAnalysisJob.query.filter_by(report_id=report.id).count() == 1
        # 설명: 테스트 전제 또는 결과인 `calls == []` 조건이 참인지 검증한다.
        assert calls == []


# 설명: `test_process_queued_report_analysis_jobs_completes_job` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_process_queued_report_analysis_jobs_completes_job(app, test_user, monkeypatch):
    """워커가 QUEUED 작업을 실행하고 결과와 진행률을 완료 상태로 저장하는지 검증한다."""
    # 설명: `calls`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    calls = []

    # 설명: `fake_request_analysis` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def fake_request_analysis(report_id, file_path, cctv_id=None, camera_id=None):
        """외부 AI 서버 대신 결정적인 탐지 결과를 반환하는 테스트 대역이다."""
        # 설명: `calls.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
        calls.append((report_id, file_path, cctv_id, camera_id))
        # 설명: 호출자에게 (True, {'status': 'OK', 'count': 1, 'detections': [{'label': 'vehicle', 'confid... 값을 함수 결과로 반환한다.
        return True, {
            "status": "OK",
            "count": 1,
            "detections": [{"label": "vehicle", "confidence": 0.9}],
        }

    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr(
        "app.modules.ai_gateway.service.AIGatewayService.request_analysis",
        fake_request_analysis,
    )

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `report`에 `ReportUploadService.create_report` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = ReportUploadService.create_report(
            user_id=test_user,
            data={
                "report_type": "ACCIDENT",
                "upload_purpose": "ANALYSIS",
                "title": "worker 분석 테스트",
                "latitude": "37.2636",
                "longitude": "127.0286",
            },
            files=[make_file(filename="worker-test.jpg")],
        )

        # 설명: `(result, status_code)`에 `ReportUploadService.request_report_analysis` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.request_report_analysis(
            report_id=report.id,
            user_id=test_user,
        )

        # 설명: 테스트 전제 또는 결과인 `status_code == 201` 조건이 참인지 검증한다.
        assert status_code == 201
        # 설명: 테스트 전제 또는 결과인 `result['success'] is True` 조건이 참인지 검증한다.
        assert result["success"] is True
        # 설명: 테스트 전제 또는 결과인 `calls == []` 조건이 참인지 검증한다.
        assert calls == []

        # 설명: `job`에 `ReportAnalysisJob.query.filter_by(report_id=report.id).one` 호출 결과를 저장해 다음 처리에서 사용한다.
        job = ReportAnalysisJob.query.filter_by(report_id=report.id).one()
        # 설명: `attachment`에 `ReportAttachment.query.filter_by(report_id=report.id).one` 호출 결과를 저장해 다음 처리에서 사용한다.
        attachment = ReportAttachment.query.filter_by(report_id=report.id).one()
        # 설명: 테스트 전제 또는 결과인 `job.job_status == 'QUEUED'` 조건이 참인지 검증한다.
        assert job.job_status == "QUEUED"

        # 설명: `(worker_result, worker_status_code)`에 `ReportUploadService.process_queued_report_analysis_jobs` 호출 결과를 저장해 다음 처리에서 사용한다.
        worker_result, worker_status_code = ReportUploadService.process_queued_report_analysis_jobs(limit=1)

        # 설명: 테스트 전제 또는 결과인 `worker_status_code == 200` 조건이 참인지 검증한다.
        assert worker_status_code == 200
        # 설명: 테스트 전제 또는 결과인 `worker_result['processed_count'] == 1` 조건이 참인지 검증한다.
        assert worker_result["processed_count"] == 1

        # 워커 커밋 이후 기존 SQLAlchemy 객체를 새로고침해 실제 DB 상태를 검증한다.
        db.session.refresh(job)
        # 설명: 테스트 전제 또는 결과인 `job.job_status == 'COMPLETED'` 조건이 참인지 검증한다.
        assert job.job_status == "COMPLETED"
        # 설명: 테스트 전제 또는 결과인 `job.progress_percent == 100` 조건이 참인지 검증한다.
        assert job.progress_percent == 100
        # 설명: 테스트 전제 또는 결과인 `job.result_summary['count'] == 1` 조건이 참인지 검증한다.
        assert job.result_summary["count"] == 1
        # 설명: 테스트 전제 또는 결과인 `calls == [(report.id, attachment.file_path, None, None)]` 조건이 참인지 검증한다.
        assert calls == [(report.id, attachment.file_path, None, None)]



# 설명: `test_update_report_status_approve_and_reject_write_history` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_update_report_status_approve_and_reject_write_history(app, test_user):
    """승인과 반려 상태 전이가 현재 상태뿐 아니라 변경 이력에도 순서대로 남는지 검증한다."""
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `user`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = db.session.get(User, test_user)
        # 설명: `report`에 `ReportUploadService.create_report` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = ReportUploadService.create_report(
            user_id=test_user,
            data={
                "report_type": "ACCIDENT",
                "upload_purpose": "REPORT",
                "title": "상태 변경 테스트",
                "description": "승인과 반려 상태 변경을 검증합니다.",
            },
            files=[make_file(filename="status-test.jpg")],
        )

        # 설명: `(approve_result, approve_status)`에 `ReportUploadService.approve_report` 호출 결과를 저장해 다음 처리에서 사용한다.
        approve_result, approve_status = ReportUploadService.approve_report(
            report_id=report.id,
            current_user=user,
            data={"memo": "승인 처리"},
        )

        # 설명: 테스트 전제 또는 결과인 `approve_status == 200` 조건이 참인지 검증한다.
        assert approve_status == 200
        # 설명: 테스트 전제 또는 결과인 `approve_result['success'] is True` 조건이 참인지 검증한다.
        assert approve_result["success"] is True
        # 설명: 테스트 전제 또는 결과인 `approve_result['data']['status'] == 'APPROVED'` 조건이 참인지 검증한다.
        assert approve_result["data"]["status"] == "APPROVED"
        # 설명: 테스트 전제 또는 결과인 `approve_result['data']['reviewed_by'] == test_user` 조건이 참인지 검증한다.
        assert approve_result["data"]["reviewed_by"] == test_user

        # 설명: `(reject_result, reject_status)`에 `ReportUploadService.reject_report` 호출 결과를 저장해 다음 처리에서 사용한다.
        reject_result, reject_status = ReportUploadService.reject_report(
            report_id=report.id,
            current_user=user,
            data={"reject_reason": "자료 보완 필요"},
        )

        # 설명: 테스트 전제 또는 결과인 `reject_status == 200` 조건이 참인지 검증한다.
        assert reject_status == 200
        # 설명: 테스트 전제 또는 결과인 `reject_result['success'] is True` 조건이 참인지 검증한다.
        assert reject_result["success"] is True
        # 설명: 테스트 전제 또는 결과인 `reject_result['data']['status'] == 'REJECTED'` 조건이 참인지 검증한다.
        assert reject_result["data"]["status"] == "REJECTED"
        # 설명: 테스트 전제 또는 결과인 `reject_result['data']['reject_reason'] == '자료 보완 필요'` 조건이 참인지 검증한다.
        assert reject_result["data"]["reject_reason"] == "자료 보완 필요"

        # 최종 상태만 확인하면 중간 승인 기록 유실을 놓칠 수 있으므로 전체 이력을 검사한다.
        histories = ReportStatusHistory.query.filter_by(report_id=report.id).order_by(ReportStatusHistory.id.asc()).all()
        # 설명: 테스트 전제 또는 결과인 `[history.new_status for history in histories] == ['APPROVED', 'REJECTED']` 조건이 참인지 검증한다.
        assert [history.new_status for history in histories] == ["APPROVED", "REJECTED"]


# 설명: `test_update_report_status_rejects_non_admin` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_update_report_status_rejects_non_admin(app, test_user):
    """일반 사용자가 관리자 전용 상태 전이를 수행하지 못하는지 검증한다."""
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `admin`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        admin = db.session.get(User, test_user)
        # 설명: `suffix`에 uuid4().hex[:8] 표현식의 계산 결과를 저장한다.
        suffix = uuid4().hex[:8]
        # 설명: `normal_user`에 `User` 호출 결과를 저장해 다음 처리에서 사용한다.
        normal_user = User(
            login_id=f"normal_report_user_{suffix}",
            email=f"normal_report_user_{suffix}@test.local",
            password_hash="hashed_pw",
            name="Normal User",
            role="USER",
            account_status="ACTIVE",
            is_email_verified=1,
            created_at=datetime.utcnow(),
        )
        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(normal_user)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: `report`에 `ReportUploadService.create_report` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = ReportUploadService.create_report(
            user_id=admin.id,
            data={
                "report_type": "ACCIDENT",
                "upload_purpose": "REPORT",
                "title": "권한 테스트",
            },
            files=[make_file(filename="permission-test.jpg")],
        )

        # 설명: `(result, status_code)`에 `ReportUploadService.update_report_status` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.update_report_status(
            report_id=report.id,
            current_user=normal_user,
            data={"status": "REVIEWING"},
        )

        # 설명: 테스트 전제 또는 결과인 `status_code == 403` 조건이 참인지 검증한다.
        assert status_code == 403
        # 설명: 테스트 전제 또는 결과인 `result['success'] is False` 조건이 참인지 검증한다.
        assert result["success"] is False


# 설명: `test_add_and_soft_delete_report_attachment` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_add_and_soft_delete_report_attachment(app, test_user):
    """첨부파일 삭제가 물리 삭제 대신 감사 정보가 남는 소프트 삭제인지 검증한다."""
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `user`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = db.session.get(User, test_user)
        # 설명: `report`에 `ReportUploadService.create_report` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = ReportUploadService.create_report(
            user_id=test_user,
            data={
                "report_type": "ACCIDENT",
                "upload_purpose": "REPORT",
                "title": "첨부파일 추가 삭제 테스트",
            },
            files=[make_file(filename="initial.jpg")],
        )

        # 설명: `(add_result, add_status)`에 `ReportUploadService.add_report_attachments` 호출 결과를 저장해 다음 처리에서 사용한다.
        add_result, add_status = ReportUploadService.add_report_attachments(
            report_id=report.id,
            current_user=user,
            files=[make_file(filename="extra.jpg", content=b"extra image")],
        )

        # 설명: 테스트 전제 또는 결과인 `add_status == 201` 조건이 참인지 검증한다.
        assert add_status == 201
        # 설명: 테스트 전제 또는 결과인 `add_result['success'] is True` 조건이 참인지 검증한다.
        assert add_result["success"] is True
        # 설명: 테스트 전제 또는 결과인 `add_result['data']['attachment_count'] == 1` 조건이 참인지 검증한다.
        assert add_result["data"]["attachment_count"] == 1

        # 설명: `attachment_id`에 add_result['data']['attachments'][0]['id'] 표현식의 계산 결과를 저장한다.
        attachment_id = add_result["data"]["attachments"][0]["id"]
        # 설명: `(delete_result, delete_status)`에 `ReportUploadService.delete_report_attachment` 호출 결과를 저장해 다음 처리에서 사용한다.
        delete_result, delete_status = ReportUploadService.delete_report_attachment(
            report_id=report.id,
            attachment_id=attachment_id,
            current_user=user,
            data={"reason": "잘못 업로드"},
        )

        # 설명: 테스트 전제 또는 결과인 `delete_status == 200` 조건이 참인지 검증한다.
        assert delete_status == 200
        # 설명: 테스트 전제 또는 결과인 `delete_result['success'] is True` 조건이 참인지 검증한다.
        assert delete_result["success"] is True

        # 삭제 사유와 수행자를 보존해야 운영 감사 및 복구 판단이 가능하다.
        attachment = db.session.get(ReportAttachment, attachment_id)
        # 설명: 테스트 전제 또는 결과인 `attachment.deleted_at is not None` 조건이 참인지 검증한다.
        assert attachment.deleted_at is not None
        # 설명: 테스트 전제 또는 결과인 `attachment.deleted_by == test_user` 조건이 참인지 검증한다.
        assert attachment.deleted_by == test_user
        # 설명: 테스트 전제 또는 결과인 `attachment.delete_reason == '잘못 업로드'` 조건이 참인지 검증한다.
        assert attachment.delete_reason == "잘못 업로드"
