"""report analysis comparison routes 동작과 회귀 계약을 검증하는 테스트 모듈.

격리된 픽스처로 성공 경로, 입력 오류, 권한 및 데이터베이스 부작용을 확인한다."""

# 설명: db_cleanup에서 cleanup_database 이름을 가져와 아래 로직에서 재사용한다.
from db_cleanup import cleanup_database
# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: jwt 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import jwt
# 설명: pytest 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import pytest
# 설명: datetime에서 UTC, datetime, timedelta 이름을 가져와 아래 로직에서 재사용한다.
from datetime import UTC, datetime, timedelta
# 설명: uuid에서 uuid4 이름을 가져와 아래 로직에서 재사용한다.
from uuid import uuid4

# 설명: app에서 create_app 이름을 가져와 아래 로직에서 재사용한다.
from app import create_app
# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.models에서 User, IncidentReport, ReportAttachment, ReportAnalysisJob 이름을 가져와 아래 로직에서 재사용한다.
from app.models import User, IncidentReport, ReportAttachment, ReportAnalysisJob


# 설명: `app` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@pytest.fixture
def app(tmp_path):
    # 설명: `test_database_url`에 `os.environ.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    test_database_url = os.environ.get("TEST_DATABASE_URL")
    # 설명: 테스트 전제 또는 결과인 `test_database_url` 조건이 참인지 검증한다.
    assert test_database_url, "TEST_DATABASE_URL is required for MySQL-isolated tests."
    # 설명: 테스트 전제 또는 결과인 `'staccato_test' in test_database_url` 조건이 참인지 검증한다.
    assert "staccato_test" in test_database_url, "Refusing to run tests outside staccato_test database."

    # 설명: `app`에 `create_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": test_database_url,
        "SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
        "JWT_SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
        "UPLOAD_BASE_PATH": str(tmp_path / "uploads"),
    })

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: 테스트 전제 또는 결과인 `'staccato_test' in str(db.engine.url)` 조건이 참인지 검증한다.
        assert "staccato_test" in str(db.engine.url), f"Unsafe test DB: {db.engine.url}"
        # 설명: `db.session.remove`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        db.session.remove()
        # 설명: `cleanup_database`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        cleanup_database(db)
        # 설명: `db.create_all`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        db.create_all()
        # 설명: `(yield app)` 표현식을 평가해 필요한 동작을 수행한다.
        yield app
        # 설명: `db.session.remove`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        db.session.remove()
        # 설명: `cleanup_database`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        cleanup_database(db)


# 설명: `client` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@pytest.fixture
def client(app):
    # 설명: 호출자에게 app.test_client() 값을 함수 결과로 반환한다.
    return app.test_client()


# 설명: `auth_user_and_header` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@pytest.fixture
def auth_user_and_header(app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `suffix`에 uuid4().hex[:12] 표현식의 계산 결과를 저장한다.
        suffix = uuid4().hex[:12]
        # 설명: `user`에 `User` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = User(
            login_id=f"analysis_compare_admin_{suffix}",
            name="비교분석관리자",
            password_hash="hashed_pw",
            email=f"analysis_compare_admin_{suffix}@test.local",
            role="SUPER_ADMIN",
            account_status="ACTIVE",
            created_at=datetime.now(UTC),
        )
        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(user)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: `now`에 `datetime.now` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = datetime.now(UTC)
        # 설명: `payload`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        payload = {
            "sub": str(user.id),
            "user_id": user.id,
            "id": user.id,
            "login_id": user.login_id,
            "role": user.role,
            "iat": now,
            "exp": now + timedelta(hours=1),
        }
        # 설명: `token`에 `jwt.encode` 호출 결과를 저장해 다음 처리에서 사용한다.
        token = jwt.encode(payload, app.config["SECRET_KEY"], algorithm="HS256")
        # 설명: 호출자에게 (user, {'Authorization': f'Bearer {token}'}) 값을 함수 결과로 반환한다.
        return user, {"Authorization": f"Bearer {token}"}


# 설명: `_create_completed_analysis_job` 함수는 새 데이터나 리소스를 생성하는 함수다.
def _create_completed_analysis_job(user, title, count, confidence):
    # 설명: `now`에 `datetime.now` 호출 결과를 저장해 다음 처리에서 사용한다.
    now = datetime.now(UTC)

    # 설명: `report`에 `IncidentReport` 호출 결과를 저장해 다음 처리에서 사용한다.
    report = IncidentReport(
        report_code=f"REP-CMP-{uuid4().hex[:8].upper()}",
        report_type="STALLED_VEHICLE",
        upload_purpose="ANALYSIS",
        report_source_type="WEB",
        title=title,
        description="비교분석 테스트 신고",
        reporter_id=user.id,
        status="SUBMITTED",
        priority="NORMAL",
        risk_level="MEDIUM",
        risk_score=count * 10,
        is_demo_data=0,
        submitted_at=now,
        created_at=now,
        updated_at=now,
    )
    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(report)
    # 설명: `db.session.flush`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    db.session.flush()

    # 설명: `attachment`에 `ReportAttachment` 호출 결과를 저장해 다음 처리에서 사용한다.
    attachment = ReportAttachment(
        report_id=report.id,
        file_type="IMAGE",
        original_filename=f"{title}.jpg",
        stored_filename=f"{uuid4().hex}.jpg",
        storage_type="LOCAL",
        file_path=f"/tmp/{uuid4().hex}.jpg",
        file_hash=uuid4().hex,
        file_size=1024,
        mime_type="image/jpeg",
        scan_status="PENDING",
        is_private=1,
        download_count=0,
        access_count=0,
        uploaded_by=user.id,
        uploaded_at=now,
        created_at=now,
    )
    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(attachment)
    # 설명: `db.session.flush`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    db.session.flush()

    # 설명: `detections`에 [{'label': 'vehicle', 'confidence': confidence} for _ in range(count)] 표현식의 계산 결과를 저장한다.
    detections = [
        {
            "label": "vehicle",
            "confidence": confidence,
        }
        for _ in range(count)
    ]

    # 설명: `job`에 `ReportAnalysisJob` 호출 결과를 저장해 다음 처리에서 사용한다.
    job = ReportAnalysisJob(
        report_id=report.id,
        attachment_id=attachment.id,
        job_status="COMPLETED",
        analysis_type="INCIDENT_DETECTION",
        ai_engine_type="YOLOV11",
        primary_model_name="YOLO11",
        primary_model_version="current.pt",
        confidence_threshold=0.450,
        lane_stop_threshold=10,
        shoulder_stop_threshold=15,
        movement_threshold_px=5,
        total_frames=1,
        processed_frames=1,
        progress_percent=100,
        retry_count=0,
        result_summary={
            "status": "OK",
            "count": count,
            "detections": detections,
        },
        requested_by=user.id,
        requested_at=now,
        started_at=now,
        completed_at=now,
        created_at=now,
        updated_at=now,
    )
    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(job)
    # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
    db.session.commit()

    # 설명: 호출자에게 (report, attachment, job) 값을 함수 결과로 반환한다.
    return report, attachment, job


# 설명: `test_list_analysis_comparison_candidates_returns_completed_jobs` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_list_analysis_comparison_candidates_returns_completed_jobs(client, auth_user_and_header):
    # 설명: `(user, headers)`에 auth_user_and_header 표현식의 계산 결과를 저장한다.
    user, headers = auth_user_and_header

    # 설명: `_create_completed_analysis_job`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    _create_completed_analysis_job(user, "비교 후보 A", count=1, confidence=0.91)
    # 설명: `_create_completed_analysis_job`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    _create_completed_analysis_job(user, "비교 후보 B", count=3, confidence=0.82)

    # 설명: `response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.get(
        "/api/reports/analysis-comparisons/candidates?page=1&size=10",
        headers=headers,
    )

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
    assert response.status_code == 200
    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()
    # 설명: 테스트 전제 또는 결과인 `body['success'] is True` 조건이 참인지 검증한다.
    assert body["success"] is True
    # 설명: 테스트 전제 또는 결과인 `body['total_count'] >= 2` 조건이 참인지 검증한다.
    assert body["total_count"] >= 2
    # 설명: 테스트 전제 또는 결과인 `len(body['items']) >= 2` 조건이 참인지 검증한다.
    assert len(body["items"]) >= 2
    # 설명: 테스트 전제 또는 결과인 `all((item['job_status'] == 'COMPLETED' for item in body['items']))` 조건이 참인지 검증한다.
    assert all(item["job_status"] == "COMPLETED" for item in body["items"])


# 설명: `test_compare_analysis_jobs_returns_metrics` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_compare_analysis_jobs_returns_metrics(client, auth_user_and_header):
    # 설명: `(user, headers)`에 auth_user_and_header 표현식의 계산 결과를 저장한다.
    user, headers = auth_user_and_header

    # 설명: `(_, _, first_job)`에 `_create_completed_analysis_job` 호출 결과를 저장해 다음 처리에서 사용한다.
    _, _, first_job = _create_completed_analysis_job(user, "비교 대상 A", count=1, confidence=0.95)
    # 설명: `(_, _, second_job)`에 `_create_completed_analysis_job` 호출 결과를 저장해 다음 처리에서 사용한다.
    _, _, second_job = _create_completed_analysis_job(user, "비교 대상 B", count=4, confidence=0.75)

    # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.post(
        "/api/reports/analysis-comparisons",
        json={"job_ids": [first_job.id, second_job.id]},
        headers=headers,
    )

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
    assert response.status_code == 200
    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()
    # 설명: 테스트 전제 또는 결과인 `body['success'] is True` 조건이 참인지 검증한다.
    assert body["success"] is True
    # 설명: 테스트 전제 또는 결과인 `body['count'] == 2` 조건이 참인지 검증한다.
    assert body["count"] == 2
    # 설명: 테스트 전제 또는 결과인 `body['job_ids'] == [first_job.id, second_job.id]` 조건이 참인지 검증한다.
    assert body["job_ids"] == [first_job.id, second_job.id]
    # 설명: 테스트 전제 또는 결과인 `body['comparison']['metrics']['detection_count']['min'] == 1.0` 조건이 참인지 검증한다.
    assert body["comparison"]["metrics"]["detection_count"]["min"] == 1.0
    # 설명: 테스트 전제 또는 결과인 `body['comparison']['metrics']['detection_count']['max'] == 4.0` 조건이 참인지 검증한다.
    assert body["comparison"]["metrics"]["detection_count"]["max"] == 4.0
    # 설명: 테스트 전제 또는 결과인 `body['comparison']['metrics']['detection_count']['delta'] == 3.0` 조건이 참인지 검증한다.
    assert body["comparison"]["metrics"]["detection_count"]["delta"] == 3.0


# 설명: `test_compare_analysis_jobs_requires_at_least_two_jobs` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_compare_analysis_jobs_requires_at_least_two_jobs(client, auth_user_and_header):
    # 설명: `(_, headers)`에 auth_user_and_header 표현식의 계산 결과를 저장한다.
    _, headers = auth_user_and_header

    # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.post(
        "/api/reports/analysis-comparisons",
        json={"job_ids": [1]},
        headers=headers,
    )

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 400` 조건이 참인지 검증한다.
    assert response.status_code == 400
    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()
    # 설명: 테스트 전제 또는 결과인 `body['success'] is False` 조건이 참인지 검증한다.
    assert body["success"] is False
