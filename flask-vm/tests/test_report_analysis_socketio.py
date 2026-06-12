"""report analysis socketio 동작과 회귀 계약을 검증하는 테스트 모듈.

격리된 픽스처로 성공 경로, 입력 오류, 권한 및 데이터베이스 부작용을 확인한다."""

# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: datetime에서 datetime, UTC, timedelta 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime, UTC, timedelta
# 설명: uuid에서 uuid4 이름을 가져와 아래 로직에서 재사용한다.
from uuid import uuid4

# 설명: jwt 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import jwt
# 설명: pytest 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import pytest

# 설명: app에서 create_app 이름을 가져와 아래 로직에서 재사용한다.
from app import create_app
# 설명: app.extensions에서 db, socketio 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db, socketio
# 설명: app.models에서 IncidentReport, ReportAnalysisJob, ReportAttachment, User 이름을 가져와 아래 로직에서 재사용한다.
from app.models import IncidentReport, ReportAnalysisJob, ReportAttachment, User
# 설명: app.modules.socketio.emitters에서 build_report_analysis_payload 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.socketio.emitters import build_report_analysis_payload
# 설명: app.modules.report_upload.service에서 ReportUploadService 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.report_upload.service import ReportUploadService
# 설명: db_cleanup에서 cleanup_database 이름을 가져와 아래 로직에서 재사용한다.
from db_cleanup import cleanup_database


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
        # 설명: `db.create_all`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        db.create_all()
        # 설명: `cleanup_database`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        cleanup_database(db)

    # 설명: `(yield app)` 표현식을 평가해 필요한 동작을 수행한다.
    yield app

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `db.session.remove`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        db.session.remove()
        # 설명: `cleanup_database`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        cleanup_database(db)


# 설명: `_create_user` 함수는 새 데이터나 리소스를 생성하는 함수다.
def _create_user(role="CONTROL_ADMIN", account_status="ACTIVE"):
    # 설명: `suffix`에 uuid4().hex[:12] 표현식의 계산 결과를 저장한다.
    suffix = uuid4().hex[:12]
    # 설명: `user`에 `User` 호출 결과를 저장해 다음 처리에서 사용한다.
    user = User(
        login_id=f"socket_user_{suffix}",
        email=f"socket_user_{suffix}@test.local",
        password_hash="hashed_pw",
        name="Socket Tester",
        role=role,
        account_status=account_status,
        is_email_verified=1,
        created_at=datetime.now(UTC),
    )
    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(user)
    # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
    db.session.commit()
    # 설명: 호출자에게 user 값을 함수 결과로 반환한다.
    return user


# 설명: `_token_for` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _token_for(app, user):
    # 설명: `now`에 `datetime.now` 호출 결과를 저장해 다음 처리에서 사용한다.
    now = datetime.now(UTC)
    # 설명: `payload`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "iat": now,
        "exp": now + timedelta(hours=1),
    }
    # 설명: 호출자에게 jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256') 값을 함수 결과로 반환한다.
    return jwt.encode(payload, app.config["JWT_SECRET_KEY"], algorithm="HS256")


# 설명: `_create_report` 함수는 새 데이터나 리소스를 생성하는 함수다.
def _create_report(reporter_id):
    # 설명: `now`에 `datetime.now` 호출 결과를 저장해 다음 처리에서 사용한다.
    now = datetime.now(UTC)
    # 설명: `report`에 `IncidentReport` 호출 결과를 저장해 다음 처리에서 사용한다.
    report = IncidentReport(
        report_code=f"REP-{uuid4().hex[:8]}",
        report_type="ACCIDENT",
        upload_purpose="ANALYSIS",
        report_source_type="WEB",
        title="Socket report",
        description="Socket report test",
        reporter_id=reporter_id,
        status="SUBMITTED",
        priority="NORMAL",
        is_demo_data=0,
        submitted_at=now,
        created_at=now,
    )
    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(report)
    # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
    db.session.commit()
    # 설명: 호출자에게 report 값을 함수 결과로 반환한다.
    return report


# 설명: `_create_attachment` 함수는 새 데이터나 리소스를 생성하는 함수다.
def _create_attachment(report_id, uploaded_by):
    # 설명: `now`에 `datetime.now` 호출 결과를 저장해 다음 처리에서 사용한다.
    now = datetime.now(UTC)
    # 설명: `attachment`에 `ReportAttachment` 호출 결과를 저장해 다음 처리에서 사용한다.
    attachment = ReportAttachment(
        report_id=report_id,
        file_type="IMAGE",
        original_filename="socket-test.jpg",
        stored_filename=f"{uuid4().hex}.jpg",
        storage_type="LOCAL",
        file_path="/tmp/socket-test.jpg",
        file_url=None,
        thumbnail_url=None,
        file_hash=uuid4().hex,
        file_size=10,
        mime_type="image/jpeg",
        scan_status="CLEAN",
        is_private=0,
        download_count=0,
        access_count=0,
        uploaded_by=uploaded_by,
        uploaded_at=now,
        created_at=now,
    )
    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(attachment)
    # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
    db.session.commit()
    # 설명: 호출자에게 attachment 값을 함수 결과로 반환한다.
    return attachment


# 설명: `test_socket_connect_rejects_missing_token` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_socket_connect_rejects_missing_token(app):
    # 설명: `client`에 `socketio.test_client` 호출 결과를 저장해 다음 처리에서 사용한다.
    client = socketio.test_client(app)

    # 설명: 테스트 전제 또는 결과인 `client.is_connected() is False` 조건이 참인지 검증한다.
    assert client.is_connected() is False


# 설명: `test_socket_connect_rejects_invalid_token` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_socket_connect_rejects_invalid_token(app):
    # 설명: `client`에 `socketio.test_client` 호출 결과를 저장해 다음 처리에서 사용한다.
    client = socketio.test_client(app, auth={"token": "invalid-token"})

    # 설명: 테스트 전제 또는 결과인 `client.is_connected() is False` 조건이 참인지 검증한다.
    assert client.is_connected() is False


# 설명: `test_socket_connect_rejects_inactive_user` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_socket_connect_rejects_inactive_user(app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `user`에 `_create_user` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = _create_user(account_status="PENDING")
        # 설명: `token`에 `_token_for` 호출 결과를 저장해 다음 처리에서 사용한다.
        token = _token_for(app, user)

    # 설명: `client`에 `socketio.test_client` 호출 결과를 저장해 다음 처리에서 사용한다.
    client = socketio.test_client(app, auth={"token": token})

    # 설명: 테스트 전제 또는 결과인 `client.is_connected() is False` 조건이 참인지 검증한다.
    assert client.is_connected() is False


# 설명: `test_socket_connect_accepts_valid_active_user` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_socket_connect_accepts_valid_active_user(app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `user`에 `_create_user` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = _create_user()
        # 설명: `token`에 `_token_for` 호출 결과를 저장해 다음 처리에서 사용한다.
        token = _token_for(app, user)

    # 설명: `client`에 `socketio.test_client` 호출 결과를 저장해 다음 처리에서 사용한다.
    client = socketio.test_client(app, auth={"token": token})

    # 설명: 테스트 전제 또는 결과인 `client.is_connected() is True` 조건이 참인지 검증한다.
    assert client.is_connected() is True
    # 설명: `events`에 `client.get_received` 호출 결과를 저장해 다음 처리에서 사용한다.
    events = client.get_received()
    # 설명: 테스트 전제 또는 결과인 `any((event['name'] == 'socket_connected' for event in events))` 조건이 참인지 검증한다.
    assert any(event["name"] == "socket_connected" for event in events)


# 설명: `test_join_report_rejects_invalid_report_id` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_join_report_rejects_invalid_report_id(app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `user`에 `_create_user` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = _create_user()
        # 설명: `token`에 `_token_for` 호출 결과를 저장해 다음 처리에서 사용한다.
        token = _token_for(app, user)

    # 설명: `client`에 `socketio.test_client` 호출 결과를 저장해 다음 처리에서 사용한다.
    client = socketio.test_client(app, auth={"token": token})
    # 설명: 테스트 전제 또는 결과인 `client.is_connected() is True` 조건이 참인지 검증한다.
    assert client.is_connected() is True

    # 설명: `client.emit`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    client.emit("join_report", {"report_id": "abc"})
    # 설명: `events`에 `client.get_received` 호출 결과를 저장해 다음 처리에서 사용한다.
    events = client.get_received()

    # 설명: 테스트 전제 또는 결과인 `any((event['name'] == 'socket_error' and event['args'][0]['code'] == 'INVALID_R...` 조건이 참인지 검증한다.
    assert any(
        event["name"] == "socket_error"
        and event["args"][0]["code"] == "INVALID_REPORT_ID"
        for event in events
    )


# 설명: `test_join_report_rejects_missing_report` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_join_report_rejects_missing_report(app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `user`에 `_create_user` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = _create_user()
        # 설명: `token`에 `_token_for` 호출 결과를 저장해 다음 처리에서 사용한다.
        token = _token_for(app, user)

    # 설명: `client`에 `socketio.test_client` 호출 결과를 저장해 다음 처리에서 사용한다.
    client = socketio.test_client(app, auth={"token": token})
    # 설명: 테스트 전제 또는 결과인 `client.is_connected() is True` 조건이 참인지 검증한다.
    assert client.is_connected() is True

    # 설명: `client.emit`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    client.emit("join_report", {"report_id": 999999999})
    # 설명: `events`에 `client.get_received` 호출 결과를 저장해 다음 처리에서 사용한다.
    events = client.get_received()

    # 설명: 테스트 전제 또는 결과인 `any((event['name'] == 'socket_error' and event['args'][0]['code'] == 'REPORT_NO...` 조건이 참인지 검증한다.
    assert any(
        event["name"] == "socket_error"
        and event["args"][0]["code"] == "REPORT_NOT_FOUND"
        for event in events
    )


# 설명: `test_join_report_rejects_forbidden_user` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_join_report_rejects_forbidden_user(app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `owner`에 `_create_user` 호출 결과를 저장해 다음 처리에서 사용한다.
        owner = _create_user(role="VIEWER")
        # 설명: `other`에 `_create_user` 호출 결과를 저장해 다음 처리에서 사용한다.
        other = _create_user(role="VIEWER")
        # 설명: `report`에 `_create_report` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = _create_report(reporter_id=owner.id)
        # 설명: `report_id`에 report.id 표현식의 계산 결과를 저장한다.
        report_id = report.id
        # 설명: `token`에 `_token_for` 호출 결과를 저장해 다음 처리에서 사용한다.
        token = _token_for(app, other)

    # 설명: `client`에 `socketio.test_client` 호출 결과를 저장해 다음 처리에서 사용한다.
    client = socketio.test_client(app, auth={"token": token})
    # 설명: 테스트 전제 또는 결과인 `client.is_connected() is True` 조건이 참인지 검증한다.
    assert client.is_connected() is True

    # 설명: `client.emit`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    client.emit("join_report", {"report_id": report_id})
    # 설명: `events`에 `client.get_received` 호출 결과를 저장해 다음 처리에서 사용한다.
    events = client.get_received()

    # 설명: 테스트 전제 또는 결과인 `any((event['name'] == 'socket_error' and event['args'][0]['code'] == 'FORBIDDEN...` 조건이 참인지 검증한다.
    assert any(
        event["name"] == "socket_error"
        and event["args"][0]["code"] == "FORBIDDEN"
        for event in events
    )


# 설명: `test_join_and_leave_report_success_for_reporter` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_join_and_leave_report_success_for_reporter(app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `user`에 `_create_user` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = _create_user(role="VIEWER")
        # 설명: `report`에 `_create_report` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = _create_report(reporter_id=user.id)
        # 설명: `report_id`에 report.id 표현식의 계산 결과를 저장한다.
        report_id = report.id
        # 설명: `token`에 `_token_for` 호출 결과를 저장해 다음 처리에서 사용한다.
        token = _token_for(app, user)

    # 설명: `client`에 `socketio.test_client` 호출 결과를 저장해 다음 처리에서 사용한다.
    client = socketio.test_client(app, auth={"token": token})
    # 설명: 테스트 전제 또는 결과인 `client.is_connected() is True` 조건이 참인지 검증한다.
    assert client.is_connected() is True

    # 설명: `client.emit`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    client.emit("join_report", {"report_id": report_id})
    # 설명: `join_events`에 `client.get_received` 호출 결과를 저장해 다음 처리에서 사용한다.
    join_events = client.get_received()

    # 설명: 테스트 전제 또는 결과인 `any((event['name'] == 'report_joined' and event['args'][0]['report_id'] == repo...` 조건이 참인지 검증한다.
    assert any(
        event["name"] == "report_joined"
        and event["args"][0]["report_id"] == report_id
        for event in join_events
    )

    # 설명: `client.emit`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    client.emit("leave_report", {"report_id": report_id})
    # 설명: `leave_events`에 `client.get_received` 호출 결과를 저장해 다음 처리에서 사용한다.
    leave_events = client.get_received()

    # 설명: 테스트 전제 또는 결과인 `any((event['name'] == 'report_left' and event['args'][0]['report_id'] == report...` 조건이 참인지 검증한다.
    assert any(
        event["name"] == "report_left"
        and event["args"][0]["report_id"] == report_id
        for event in leave_events
    )


# 설명: `test_build_report_analysis_payload_contract` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_build_report_analysis_payload_contract(app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `user`에 `_create_user` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = _create_user()
        # 설명: `report`에 `_create_report` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = _create_report(reporter_id=user.id)
        # 설명: `attachment`에 `_create_attachment` 호출 결과를 저장해 다음 처리에서 사용한다.
        attachment = _create_attachment(report_id=report.id, uploaded_by=user.id)

        # 설명: `now`에 `datetime.now` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = datetime.now(UTC)
        # 설명: `job`에 `ReportAnalysisJob` 호출 결과를 저장해 다음 처리에서 사용한다.
        job = ReportAnalysisJob(
            report_id=report.id,
            attachment_id=attachment.id,
            job_status="QUEUED",
            analysis_type="INCIDENT_DETECTION",
            ai_engine_type="YOLOV8",
            confidence_threshold=0.450,
            lane_stop_threshold=10,
            shoulder_stop_threshold=15,
            movement_threshold_px=5,
            retry_count=0,
            requested_by=user.id,
            requested_at=now,
            created_at=now,
        )
        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(job)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: `payload`에 `build_report_analysis_payload` 호출 결과를 저장해 다음 처리에서 사용한다.
        payload = build_report_analysis_payload(job)
        # 설명: `report_id`에 report.id 표현식의 계산 결과를 저장한다.
        report_id = report.id
        # 설명: `job_id`에 job.id 표현식의 계산 결과를 저장한다.
        job_id = job.id

    # 설명: 테스트 전제 또는 결과인 `payload['type'] == 'REPORT_ANALYSIS_UPDATED'` 조건이 참인지 검증한다.
    assert payload["type"] == "REPORT_ANALYSIS_UPDATED"
    # 설명: 테스트 전제 또는 결과인 `payload['report_id'] == report_id` 조건이 참인지 검증한다.
    assert payload["report_id"] == report_id
    # 설명: 테스트 전제 또는 결과인 `payload['job_id'] == job_id` 조건이 참인지 검증한다.
    assert payload["job_id"] == job_id
    # 설명: 테스트 전제 또는 결과인 `payload['job_status'] == 'QUEUED'` 조건이 참인지 검증한다.
    assert payload["job_status"] == "QUEUED"
    # 설명: 테스트 전제 또는 결과인 `payload['analysis_type'] == 'INCIDENT_DETECTION'` 조건이 참인지 검증한다.
    assert payload["analysis_type"] == "INCIDENT_DETECTION"
    # 설명: 테스트 전제 또는 결과인 `payload['severity'] == 'info'` 조건이 참인지 검증한다.
    assert payload["severity"] == "info"
    # 설명: 테스트 전제 또는 결과인 `payload['message'] == '분석 작업이 대기열에 등록되었습니다.'` 조건이 참인지 검증한다.
    assert payload["message"] == "분석 작업이 대기열에 등록되었습니다."
    # 설명: 테스트 전제 또는 결과인 `payload['updated_at'].endswith('Z')` 조건이 참인지 검증한다.
    assert payload["updated_at"].endswith("Z")


# 설명: `test_request_report_analysis_emits_update_to_joined_report_room` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_request_report_analysis_emits_update_to_joined_report_room(app, monkeypatch):
    # 설명: `fake_request_analysis` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def fake_request_analysis(report_id, file_path):
        # 설명: 호출자에게 (True, {'status': 'queued'}) 값을 함수 결과로 반환한다.
        return True, {"status": "queued"}

    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr(
        "app.modules.ai_gateway.service.AIGatewayService.request_analysis",
        fake_request_analysis,
    )

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `user`에 `_create_user` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = _create_user(role="VIEWER")
        # 설명: `user_id`에 user.id 표현식의 계산 결과를 저장한다.
        user_id = user.id
        # 설명: `report`에 `_create_report` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = _create_report(reporter_id=user_id)
        # 설명: `report_id`에 report.id 표현식의 계산 결과를 저장한다.
        report_id = report.id
        # 설명: `_create_attachment`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _create_attachment(report_id=report_id, uploaded_by=user_id)
        # 설명: `token`에 `_token_for` 호출 결과를 저장해 다음 처리에서 사용한다.
        token = _token_for(app, user)

    # 설명: `client`에 `socketio.test_client` 호출 결과를 저장해 다음 처리에서 사용한다.
    client = socketio.test_client(app, auth={"token": token})
    # 설명: 테스트 전제 또는 결과인 `client.is_connected() is True` 조건이 참인지 검증한다.
    assert client.is_connected() is True

    # 설명: `client.get_received`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    client.get_received()

    # 설명: `client.emit`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    client.emit("join_report", {"report_id": report_id})
    # 설명: `client.get_received`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    client.get_received()

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `(result, status_code)`에 `ReportUploadService.request_report_analysis` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.request_report_analysis(
            report_id=report_id,
            user_id=user_id,
        )

    # 설명: 테스트 전제 또는 결과인 `status_code == 201` 조건이 참인지 검증한다.
    assert status_code == 201
    # 설명: 테스트 전제 또는 결과인 `result['success'] is True` 조건이 참인지 검증한다.
    assert result["success"] is True

    # 설명: `events`에 `client.get_received` 호출 결과를 저장해 다음 처리에서 사용한다.
    events = client.get_received()

    # 설명: 테스트 전제 또는 결과인 `any((event['name'] == 'report_analysis_updated' and event['args'][0]['report_id...` 조건이 참인지 검증한다.
    assert any(
        event["name"] == "report_analysis_updated"
        and event["args"][0]["report_id"] == report_id
        and event["args"][0]["job_status"] == "QUEUED"
        and event["args"][0]["type"] == "REPORT_ANALYSIS_UPDATED"
        for event in events
    )


# 설명: `test_request_report_analysis_survives_socket_emit_failure` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_request_report_analysis_survives_socket_emit_failure(app, monkeypatch):
    # 설명: `fake_request_analysis` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def fake_request_analysis(report_id, file_path):
        # 설명: 호출자에게 (True, {'status': 'queued'}) 값을 함수 결과로 반환한다.
        return True, {"status": "queued"}

    # 설명: `broken_emit` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def broken_emit(*args, **kwargs):
        # 설명: 현재 처리를 중단하고 RuntimeError('socket emit failed')를 호출자에게 전달한다.
        raise RuntimeError("socket emit failed")

    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr(
        "app.modules.ai_gateway.service.AIGatewayService.request_analysis",
        fake_request_analysis,
    )
    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr(
        "app.modules.socketio.emitters.socketio.emit",
        broken_emit,
    )

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `user`에 `_create_user` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = _create_user(role="VIEWER")
        # 설명: `user_id`에 user.id 표현식의 계산 결과를 저장한다.
        user_id = user.id
        # 설명: `report`에 `_create_report` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = _create_report(reporter_id=user_id)
        # 설명: `report_id`에 report.id 표현식의 계산 결과를 저장한다.
        report_id = report.id
        # 설명: `_create_attachment`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _create_attachment(report_id=report_id, uploaded_by=user_id)

        # 설명: `(result, status_code)`에 `ReportUploadService.request_report_analysis` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.request_report_analysis(
            report_id=report_id,
            user_id=user_id,
        )

    # 설명: 테스트 전제 또는 결과인 `status_code == 201` 조건이 참인지 검증한다.
    assert status_code == 201
    # 설명: 테스트 전제 또는 결과인 `result['success'] is True` 조건이 참인지 검증한다.
    assert result["success"] is True
    # 설명: 테스트 전제 또는 결과인 `result['report_id'] == report_id` 조건이 참인지 검증한다.
    assert result["report_id"] == report_id
