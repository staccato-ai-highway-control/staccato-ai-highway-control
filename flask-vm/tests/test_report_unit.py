from db_cleanup import cleanup_database
import os
import io
import pytest
import jwt
from app import create_app
from app.extensions import db
from app.models import User, IncidentReport, ReportLocation
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


def test_report_draft_lifecycle(client, auth_header):
    create_payload = {
        "subject": "임시저장 신고",
        "report_type": "STALLED_VEHICLE",
        "description": "작성 중인 신고입니다.",
        "priority": "NORMAL",
        "latitude": "37.5665",
        "longitude": "126.9780",
    }

    create_res = client.post(
        "/api/reports/drafts",
        json=create_payload,
        headers=auth_header,
    )

    if create_res.status_code != 201:
        print(f"\nCreate draft response: {create_res.get_json()}")

    assert create_res.status_code == 201
    create_body = create_res.get_json()
    assert create_body["success"] is True

    draft_id = create_body["draft_id"]

    report = IncidentReport.query.get(draft_id)
    assert report is not None
    assert report.status == "DRAFT"
    assert report.title == "임시저장 신고"

    list_res = client.get("/api/reports/drafts", headers=auth_header)
    assert list_res.status_code == 200
    list_body = list_res.get_json()
    assert list_body["success"] is True
    assert list_body["total_count"] >= 1

    get_res = client.get(f"/api/reports/drafts/{draft_id}", headers=auth_header)
    assert get_res.status_code == 200
    get_body = get_res.get_json()
    assert get_body["draft"]["id"] == draft_id
    assert get_body["draft"]["status"] == "DRAFT"

    update_res = client.patch(
        f"/api/reports/drafts/{draft_id}",
        json={
            "title": "수정된 임시저장 신고",
            "description": "수정된 설명입니다.",
            "priority": "HIGH",
            "cctv_id": "123",
        },
        headers=auth_header,
    )

    if update_res.status_code != 200:
        print(f"\nUpdate draft response: {update_res.get_json()}")

    assert update_res.status_code == 200

    db.session.refresh(report)
    assert report.title == "수정된 임시저장 신고"
    assert report.description == "수정된 설명입니다."
    assert report.priority == "HIGH"
    assert report.cctv_id == 123

    delete_res = client.delete(f"/api/reports/drafts/{draft_id}", headers=auth_header)
    assert delete_res.status_code == 200

    db.session.refresh(report)
    assert report.status == "DELETED"
    assert report.deleted_at is not None
    assert report.deleted_by is not None


def test_report_draft_invalid_cctv_id_returns_bad_request(client, auth_header):
    res = client.post(
        "/api/reports/drafts",
        json={
            "subject": "잘못된 CCTV ID 임시저장",
            "cctv_id": "not-a-number",
        },
        headers=auth_header,
    )

    assert res.status_code == 400
    body = res.get_json()
    assert body["success"] is False


def test_submit_report_draft_changes_status_to_submitted(client, auth_header):
    create_res = client.post(
        "/api/reports/drafts",
        json={
            "subject": "제출할 임시저장 신고",
            "report_type": "STALLED_VEHICLE",
            "description": "최종 제출 테스트",
            "priority": "NORMAL",
        },
        headers=auth_header,
    )

    assert create_res.status_code == 201
    draft_id = create_res.get_json()["draft_id"]

    submit_res = client.post(
        f"/api/reports/drafts/{draft_id}/submit",
        headers=auth_header,
    )

    if submit_res.status_code != 200:
        print(f"\nSubmit draft response: {submit_res.get_json()}")

    assert submit_res.status_code == 200
    body = submit_res.get_json()
    assert body["success"] is True
    assert body["report_id"] == draft_id

    report = db.session.get(IncidentReport, draft_id)
    assert report.status == "SUBMITTED"
    assert report.upload_purpose == "REPORT"
    assert report.submitted_at is not None


def test_submit_report_draft_rejects_non_draft_report(client, auth_header):
    payload = {
        'subject': 'Already Submitted Report',
        'report_type': 'STALLED_VEHICLE',
        'description': '이미 제출된 신고',
        'files': (io.BytesIO(b"test content"), 'submitted_report.png')
    }

    create_res = client.post(
        '/api/reports',
        data=payload,
        headers=auth_header,
        content_type='multipart/form-data',
    )

    assert create_res.status_code == 201

    report = IncidentReport.query.filter_by(title='Already Submitted Report').first()
    assert report is not None

    submit_res = client.post(
        f"/api/reports/drafts/{report.id}/submit",
        headers=auth_header,
    )

    assert submit_res.status_code == 400
    body = submit_res.get_json()
    assert body["success"] is False

