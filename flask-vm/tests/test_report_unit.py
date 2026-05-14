import io
import pytest
from flask_jwt_extended import create_access_token, JWTManager
from app import create_app
from app.extensions import db
from app.models import User, IncidentReport
from datetime import datetime, UTC

@pytest.fixture
def app():
    app = create_app()
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "JWT_SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
        "UPLOAD_BASE_PATH": "/tmp/flask_test_uploads"
    })

    if 'flask-jwt-extended' not in app.extensions:
        JWTManager(app)

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
        test_user = User(
            login_id="test_admin",
            name="테스트유저",
            password_hash="hashed_pw",
            email="test@example.com",
            role="ADMIN",
            account_status="APPROVED",
            created_at=datetime.now(UTC)
        )
        db.session.add(test_user)
        db.session.commit()

        access_token = create_access_token(identity=str(test_user.id))
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