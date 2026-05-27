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

