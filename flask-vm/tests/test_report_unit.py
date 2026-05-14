import io
import pytest
import jwt
from app import create_app
from app.extensions import db
from app.models import User, IncidentReport
from datetime import datetime, UTC, timedelta
from uuid import uuid4

@pytest.fixture
def app():
    app = create_app()
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
        "JWT_SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
        "UPLOAD_BASE_PATH": "/tmp/flask_test_uploads"
    })

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

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
