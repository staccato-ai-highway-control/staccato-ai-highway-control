from db_cleanup import cleanup_database
import os
import io
import pytest
import jwt
from app import create_app
from app.extensions import db
from app.models import User, IncidentReport, ReportLocation, ReportAnalysisJob, ReportAttachment
from datetime import datetime, UTC, timedelta
from uuid import uuid4

@pytest.fixture
def app(tmp_path):
    test_database_url = os.environ.get("TEST_DATABASE_URL")
    assert test_database_url, "TEST_DATABASE_URL is required for MySQL-isolated tests."
    assert "staccato_test" in test_database_url, "Refusing to run tests outside staccato_test database."

    upload_path = tmp_path / "uploads"

    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": test_database_url,
        "SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
        "JWT_SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
        "UPLOAD_BASE_PATH": str(upload_path),
    })

    with app.app_context():
        assert "staccato_test" in str(db.engine.url), f"Unsafe test DB: {db.engine.url}"
        db.session.remove()
        cleanup_database(db)
        db.create_all()
        yield app
        db.session.remove()
        cleanup_database(db)


@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def auth_header(app):
    with app.app_context():
        suffix = uuid4().hex[:12]
        test_user = User(
            login_id=f"report_admin_{suffix}",
            name="테스트유저",
            password_hash="hashed_pw",
            email=f"report_admin_{suffix}@test.local",
            role="SUPER_ADMIN",
            account_status="ACTIVE",
            created_at=datetime.now(UTC)
        )
        db.session.add(test_user)
        db.session.commit()

        now = datetime.now(UTC)
        payload = {
            "sub": str(test_user.id),
            "user_id": test_user.id,
            "id": test_user.id,
            "login_id": test_user.login_id,
            "role": test_user.role,
            "iat": now,
            "exp": now + timedelta(hours=1),
        }
        access_token = jwt.encode(
            payload,
            app.config["SECRET_KEY"],
            algorithm="HS256"
        )
        return {"Authorization": f"Bearer {access_token}"}


## 시나리오 1: 이미지 업로드 테스트
def test_report_upload_image_size_limit(client, auth_header):
    payload = {
        'subject': '고속도로 정차 차량 발생',
        'report_type': 'STALLED_VEHICLE',
        'description': '1차선 정차 차량 탐지',
        'latitude': '37.5665',
        'longitude': '126.9780',
        'files': (io.BytesIO(b"test image"), 'traffic.jpg')
    }

    res_ok = client.post('/api/reports',
                         data=payload,
                         headers=auth_header,
                         content_type='multipart/form-data')

    if res_ok.status_code != 201:
        print(f"\nResponse Body: {res_ok.get_json()}")

    assert res_ok.status_code == 201


## 시나리오 2: DB 정합성 테스트
def test_report_database_integrity(client, auth_header):
    file_data = (io.BytesIO(b"test content"), 'report_file.png')

    payload = {
        'subject': 'DB Check',
        'report_type': 'STALLED_VEHICLE',
        'description': 'DB 정합성 테스트',
        'latitude': '37.5665',
        'longitude': '126.9780',
        'files': file_data
    }

    res = client.post('/api/reports',
                      data=payload,
                      headers=auth_header,
                      content_type='multipart/form-data')

    report = IncidentReport.query.filter_by(title='DB Check').first()
    assert report is not None


## 시나리오 3: 위치값 없이 신고 등록 가능 + 위치 row 미생성 + YOLOV11 분석 job 생성
def test_report_upload_without_location_does_not_create_report_location(client, auth_header):
    payload = {
        'subject': 'No Location Report',
        'report_type': 'STALLED_VEHICLE',
        'description': '위치값 없는 신고 등록 테스트',
        'files': (io.BytesIO(b"test content"), 'no_location_report.png')
    }

    res = client.post('/api/reports',
                      data=payload,
                      headers=auth_header,
                      content_type='multipart/form-data')

    if res.status_code != 201:
        print(f"\nResponse Body: {res.get_json()}")

    assert res.status_code == 201

    report = IncidentReport.query.filter_by(title='No Location Report').first()
    assert report is not None

    location = ReportLocation.query.filter_by(report_id=report.id).first()
    assert location is None



## 시나리오 4: 빈 문자열 좌표는 None 처리되고 위치 row는 생성하지 않음
def test_report_upload_with_blank_coordinates_treats_location_as_absent(client, auth_header):
    payload = {
        'subject': 'Blank Coordinates Report',
        'report_type': 'STALLED_VEHICLE',
        'description': '빈 문자열 좌표 테스트',
        'latitude': '',
        'longitude': '',
        'files': (io.BytesIO(b"test content"), 'blank_coordinates_report.png')
    }

    res = client.post('/api/reports',
                      data=payload,
                      headers=auth_header,
                      content_type='multipart/form-data')

    if res.status_code != 201:
        print(f"\nResponse Body: {res.get_json()}")

    assert res.status_code == 201

    report = IncidentReport.query.filter_by(title='Blank Coordinates Report').first()
    assert report is not None

    location = ReportLocation.query.filter_by(report_id=report.id).first()
    assert location is None


## 시나리오 5: 잘못된 좌표 문자열은 신고 등록 실패
def test_report_upload_with_invalid_coordinates_returns_bad_request(client, auth_header):
    payload = {
        'subject': 'Invalid Coordinates Report',
        'report_type': 'STALLED_VEHICLE',
        'description': '잘못된 좌표 문자열 테스트',
        'latitude': 'not-a-number',
        'longitude': '126.9780',
        'files': (io.BytesIO(b"test content"), 'invalid_coordinates_report.png')
    }

    res = client.post('/api/reports',
                      data=payload,
                      headers=auth_header,
                      content_type='multipart/form-data')

    assert res.status_code in (400, 422)

    report = IncidentReport.query.filter_by(title='Invalid Coordinates Report').first()
    assert report is None



# -----------------------
# 신고 목록/상세 보강 API 테스트
# -----------------------
def _create_route_user(app, role="VIEWER", prefix="route_user"):
    with app.app_context():
        suffix = uuid4().hex[:12]
        user = User(
            login_id=f"{prefix}_{suffix}",
            name=f"{prefix} user",
            password_hash="hashed_pw",
            email=f"{prefix}_{suffix}@test.local",
            role=role,
            account_status="ACTIVE",
            is_email_verified=1,
            created_at=datetime.now(UTC),
        )
        db.session.add(user)
        db.session.commit()

        now = datetime.now(UTC)
        payload = {
            "sub": str(user.id),
            "role": user.role,
            "iat": now,
            "exp": now + timedelta(hours=1),
        }
        access_token = jwt.encode(
            payload,
            app.config["JWT_SECRET_KEY"],
            algorithm="HS256",
        )
        return user.id, {"Authorization": f"Bearer {access_token}"}


def _create_route_report(
    reporter_id,
    title="정차 의심 영상 등록",
    status="SUBMITTED",
    report_type="STOPPED_VEHICLE",
    priority="HIGH",
    risk_level="HIGH",
    cctv_id=None,
    converted_incident_id=None,
):
    now = datetime.now(UTC)
    report = IncidentReport(
        report_code=f"REP-{uuid4().hex[:10].upper()}",
        report_type=report_type,
        upload_purpose="AI_ANALYSIS",
        report_source_type="WEB",
        title=title,
        description="테스트 영상 등록",
        reporter_id=reporter_id,
        cctv_id=cctv_id,
        status=status,
        priority=priority,
        risk_level=risk_level,
        risk_score=80,
        converted_incident_id=converted_incident_id,
        is_demo_data=0,
        submitted_at=now,
        created_at=now,
        updated_at=now,
    )
    db.session.add(report)
    db.session.commit()
    return report


def test_list_reports_default_pagination_and_meta(client, app):
    user_id, headers = _create_route_user(app)
    with app.app_context():
        _create_route_report(user_id, title="기본 페이지 1")
        _create_route_report(user_id, title="기본 페이지 2")

    response = client.get("/api/reports", headers=headers)
    body = response.get_json()

    assert response.status_code == 200
    assert body["success"] is True
    assert "items" in body["data"]
    assert body["data"]["page"] == 1
    assert body["data"]["size"] == 10
    assert body["data"]["total_count"] == 2
    assert body["data"]["total_pages"] == 1
    assert body["reports"] == body["data"]["items"]


def test_list_reports_requested_page_size_and_filters(client, app):
    user_id, headers = _create_route_user(app)
    with app.app_context():
        _create_route_report(
            user_id,
            title="정차 차량 신고",
            status="SUBMITTED",
            report_type="STOPPED_VEHICLE",
            priority="HIGH",
        )
        _create_route_report(
            user_id,
            title="낙하물 신고",
            status="REVIEWING",
            report_type="DEBRIS",
            priority="NORMAL",
        )

    response = client.get(
        "/api/reports?status=SUBMITTED&keyword=정차&report_type=STOPPED_VEHICLE&page=1&size=1",
        headers=headers,
    )
    body = response.get_json()

    assert response.status_code == 200
    assert body["data"]["page"] == 1
    assert body["data"]["size"] == 1
    assert body["data"]["total_count"] == 1
    assert body["data"]["items"][0]["title"] == "정차 차량 신고"
    assert body["data"]["items"][0]["report_type"] == "STOPPED_VEHICLE"


def test_list_reports_mine_true_returns_current_user_reports_only(client, app):
    current_user_id, headers = _create_route_user(app, prefix="mine_current")
    other_user_id, _ = _create_route_user(app, prefix="mine_other")
    with app.app_context():
        _create_route_report(current_user_id, title="내 신고")
        _create_route_report(other_user_id, title="다른 사용자 신고")

    response = client.get("/api/reports?mine=true&page=1&size=10", headers=headers)
    body = response.get_json()

    assert response.status_code == 200
    assert body["success"] is True
    assert body["data"]["total_count"] == 1
    assert all(item["reporter_id"] == current_user_id for item in body["data"]["items"])


def test_list_my_reports_returns_current_user_reports_only(client, app):
    current_user_id, headers = _create_route_user(app, prefix="my_current")
    other_user_id, _ = _create_route_user(app, prefix="my_other")
    with app.app_context():
        _create_route_report(current_user_id, title="내 신고 A")
        _create_route_report(other_user_id, title="다른 신고 B")

    response = client.get("/api/reports/my?page=1&size=5", headers=headers)
    body = response.get_json()

    assert response.status_code == 200
    assert body["data"]["page"] == 1
    assert body["data"]["size"] == 5
    assert body["data"]["total_count"] == 1
    assert all(item["reporter_id"] == current_user_id for item in body["data"]["items"])


def test_update_report_owner_success_and_allowed_fields(client, app):
    user_id, headers = _create_route_user(app, prefix="update_owner")
    with app.app_context():
        report = _create_route_report(user_id, title="수정 전", priority="NORMAL")
        report_id = report.id

    response = client.patch(
        f"/api/reports/{report_id}",
        json={
            "title": "수정된 신고 제목",
            "description": "수정된 설명",
            "priority": "HIGH",
            "location": "경부고속도로 서울 방향",
            "latitude": "37.123",
            "longitude": "127.123",
            "files": ["ignored"],
        },
        headers=headers,
    )
    body = response.get_json()

    assert response.status_code == 200
    assert body["success"] is True
    assert body["data"]["title"] == "수정된 신고 제목"
    assert body["data"]["description"] == "수정된 설명"
    assert body["data"]["priority"] == "HIGH"
    assert "attachments" in body["data"]

    with app.app_context():
        updated = db.session.get(IncidentReport, report_id)
        location = ReportLocation.query.filter_by(report_id=report_id).one()
        assert updated.title == "수정된 신고 제목"
        assert updated.priority == "HIGH"
        assert location.place_name == "경부고속도로 서울 방향"


def test_update_report_admin_success_and_forbidden_or_missing_or_closed(client, app):
    owner_id, _ = _create_route_user(app, prefix="update_owner2")
    admin_id, admin_headers = _create_route_user(app, role="CONTROL_ADMIN", prefix="update_admin")
    other_id, other_headers = _create_route_user(app, prefix="update_other")
    with app.app_context():
        report = _create_route_report(owner_id, title="관리자 수정 전")
        closed = _create_route_report(owner_id, title="닫힌 신고", status="CLOSED")
        report_id = report.id
        closed_id = closed.id

    admin_response = client.patch(
        f"/api/reports/{report_id}",
        json={"title": "관리자 수정 성공"},
        headers=admin_headers,
    )
    assert admin_response.status_code == 200
    assert admin_response.get_json()["data"]["title"] == "관리자 수정 성공"

    forbidden_response = client.patch(
        f"/api/reports/{report_id}",
        json={"title": "권한 없음"},
        headers=other_headers,
    )
    assert forbidden_response.status_code == 403

    missing_response = client.patch(
        "/api/reports/99999999",
        json={"title": "없음"},
        headers=admin_headers,
    )
    assert missing_response.status_code == 404

    closed_response = client.patch(
        f"/api/reports/{closed_id}",
        json={"title": "닫힌 신고 수정"},
        headers=admin_headers,
    )
    assert closed_response.status_code == 400


def test_delete_report_owner_success_soft_delete(client, app):
    user_id, headers = _create_route_user(app, prefix="delete_owner")
    with app.app_context():
        report = _create_route_report(user_id, title="삭제 대상")
        report_id = report.id

    response = client.delete(f"/api/reports/{report_id}", headers=headers)
    body = response.get_json()

    assert response.status_code == 200
    assert body["success"] is True

    with app.app_context():
        deleted = db.session.get(IncidentReport, report_id)
        assert deleted.status == "CANCELLED"
        assert deleted.deleted_at is not None
        assert deleted.deleted_by == user_id


def test_delete_report_admin_forbidden_missing_converted_and_active_job(client, app):
    owner_id, _ = _create_route_user(app, prefix="delete_owner2")
    admin_id, admin_headers = _create_route_user(app, role="SUPER_ADMIN", prefix="delete_admin")
    other_id, other_headers = _create_route_user(app, prefix="delete_other")
    with app.app_context():
        report = _create_route_report(owner_id, title="관리자 삭제 대상")
        forbidden_report = _create_route_report(owner_id, title="권한 테스트")
        converted_report = _create_route_report(owner_id, title="전환된 신고", converted_incident_id=123)
        active_job_report = _create_route_report(owner_id, title="분석 중 신고")
        attachment = ReportAttachment(
            report_id=active_job_report.id,
            file_type="IMAGE",
            original_filename="active-job.png",
            stored_filename="active-job.png",
            storage_type="LOCAL",
            file_path="/tmp/active-job.png",
            file_hash="hash",
            file_size=10,
            mime_type="image/png",
            scan_status="PENDING",
            is_private=0,
            download_count=0,
            access_count=0,
            uploaded_by=owner_id,
            uploaded_at=datetime.now(UTC),
            created_at=datetime.now(UTC),
        )
        db.session.add(attachment)
        db.session.flush()
        job = ReportAnalysisJob(
            report_id=active_job_report.id,
            attachment_id=attachment.id,
            job_status="QUEUED",
            analysis_type="INCIDENT_DETECTION",
            ai_engine_type="YOLOV11",
            confidence_threshold=0.450,
            lane_stop_threshold=10,
            shoulder_stop_threshold=15,
            movement_threshold_px=5,
            retry_count=0,
            requested_by=owner_id,
            requested_at=datetime.now(UTC),
            created_at=datetime.now(UTC),
        )
        db.session.add(job)
        db.session.commit()
        report_id = report.id
        forbidden_id = forbidden_report.id
        converted_id = converted_report.id
        active_job_id = active_job_report.id

    admin_response = client.delete(f"/api/reports/{report_id}", headers=admin_headers)
    assert admin_response.status_code == 200

    forbidden_response = client.delete(f"/api/reports/{forbidden_id}", headers=other_headers)
    assert forbidden_response.status_code == 403

    missing_response = client.delete("/api/reports/99999999", headers=admin_headers)
    assert missing_response.status_code == 404

    converted_response = client.delete(f"/api/reports/{converted_id}", headers=admin_headers)
    assert converted_response.status_code == 409

    active_job_response = client.delete(f"/api/reports/{active_job_id}", headers=admin_headers)
    assert active_job_response.status_code == 409
