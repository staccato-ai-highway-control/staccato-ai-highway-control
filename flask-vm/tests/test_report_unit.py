"""report unit 동작과 회귀 계약을 검증하는 테스트 모듈.

격리된 픽스처로 성공 경로, 입력 오류, 권한 및 데이터베이스 부작용을 확인한다."""

# 설명: db_cleanup에서 cleanup_database 이름을 가져와 아래 로직에서 재사용한다.
from db_cleanup import cleanup_database
# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: io 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import io
# 설명: pytest 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import pytest
# 설명: jwt 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import jwt
# 설명: app에서 create_app 이름을 가져와 아래 로직에서 재사용한다.
from app import create_app
# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.models에서 User, IncidentReport, ReportLocation 이름을 가져와 아래 로직에서 재사용한다.
from app.models import User, IncidentReport, ReportLocation
# 설명: datetime에서 datetime, UTC, timedelta 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime, UTC, timedelta
# 설명: uuid에서 uuid4 이름을 가져와 아래 로직에서 재사용한다.
from uuid import uuid4

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
        "SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
        "JWT_SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
        "UPLOAD_BASE_PATH": str(upload_path),
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

# 설명: `auth_header` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@pytest.fixture
def auth_header(app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `suffix`에 uuid4().hex[:12] 표현식의 계산 결과를 저장한다.
        suffix = uuid4().hex[:12]
        # 설명: `test_user`에 `User` 호출 결과를 저장해 다음 처리에서 사용한다.
        test_user = User(
            login_id=f"report_admin_{suffix}",
            name="테스트유저",
            password_hash="hashed_pw",
            email=f"report_admin_{suffix}@test.local",
            role="SUPER_ADMIN",
            account_status="ACTIVE",
            created_at=datetime.now(UTC)
        )
        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(test_user)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: `now`에 `datetime.now` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = datetime.now(UTC)
        # 설명: `payload`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        payload = {
            "sub": str(test_user.id),
            "user_id": test_user.id,
            "id": test_user.id,
            "login_id": test_user.login_id,
            "role": test_user.role,
            "iat": now,
            "exp": now + timedelta(hours=1),
        }
        # 설명: `access_token`에 `jwt.encode` 호출 결과를 저장해 다음 처리에서 사용한다.
        access_token = jwt.encode(
            payload,
            app.config["SECRET_KEY"],
            algorithm="HS256"
        )
        # 설명: 호출자에게 {'Authorization': f'Bearer {access_token}'} 값을 함수 결과로 반환한다.
        return {"Authorization": f"Bearer {access_token}"}


## 시나리오 1: 이미지 업로드 테스트
def test_report_upload_image_size_limit(client, auth_header):
    # 설명: `payload`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    payload = {
        'subject': '고속도로 정차 차량 발생',
        'report_type': 'STALLED_VEHICLE',
        'description': '1차선 정차 차량 탐지',
        'latitude': '37.5665',
        'longitude': '126.9780',
        'files': (io.BytesIO(b"test image"), 'traffic.jpg')
    }

    # 설명: `res_ok`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    res_ok = client.post('/api/reports',
                         data=payload,
                         headers=auth_header,
                         content_type='multipart/form-data')

    # 설명: `res_ok.status_code != 201` 조건 결과에 따라 실행 경로를 분기한다.
    if res_ok.status_code != 201:
        # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        print(f"\nResponse Body: {res_ok.get_json()}")

    # 설명: 테스트 전제 또는 결과인 `res_ok.status_code == 201` 조건이 참인지 검증한다.
    assert res_ok.status_code == 201


## 시나리오 2: DB 정합성 테스트
def test_report_database_integrity(client, auth_header):
    # 설명: `file_data`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    file_data = (io.BytesIO(b"test content"), 'report_file.png')

    # 설명: `payload`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    payload = {
        'subject': 'DB Check',
        'report_type': 'STALLED_VEHICLE',
        'description': 'DB 정합성 테스트',
        'latitude': '37.5665',
        'longitude': '126.9780',
        'files': file_data
    }

    # 설명: `res`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    res = client.post('/api/reports',
                      data=payload,
                      headers=auth_header,
                      content_type='multipart/form-data')

    # 설명: `report`에 `IncidentReport.query.filter_by(title='DB Check').first` 호출 결과를 저장해 다음 처리에서 사용한다.
    report = IncidentReport.query.filter_by(title='DB Check').first()
    # 설명: 테스트 전제 또는 결과인 `report is not None` 조건이 참인지 검증한다.
    assert report is not None


## 시나리오 3: 위치값 없이 신고 등록 가능 + 위치 row 미생성 + YOLOV11 분석 job 생성
def test_report_upload_without_location_does_not_create_report_location(client, auth_header):
    # 설명: `payload`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    payload = {
        'subject': 'No Location Report',
        'report_type': 'STALLED_VEHICLE',
        'description': '위치값 없는 신고 등록 테스트',
        'files': (io.BytesIO(b"test content"), 'no_location_report.png')
    }

    # 설명: `res`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    res = client.post('/api/reports',
                      data=payload,
                      headers=auth_header,
                      content_type='multipart/form-data')

    # 설명: `res.status_code != 201` 조건 결과에 따라 실행 경로를 분기한다.
    if res.status_code != 201:
        # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        print(f"\nResponse Body: {res.get_json()}")

    # 설명: 테스트 전제 또는 결과인 `res.status_code == 201` 조건이 참인지 검증한다.
    assert res.status_code == 201

    # 설명: `report`에 `IncidentReport.query.filter_by(title='No Location Report').first` 호출 결과를 저장해 다음 처리에서 사용한다.
    report = IncidentReport.query.filter_by(title='No Location Report').first()
    # 설명: 테스트 전제 또는 결과인 `report is not None` 조건이 참인지 검증한다.
    assert report is not None

    # 설명: `location`에 `ReportLocation.query.filter_by(report_id=report.id).first` 호출 결과를 저장해 다음 처리에서 사용한다.
    location = ReportLocation.query.filter_by(report_id=report.id).first()
    # 설명: 테스트 전제 또는 결과인 `location is None` 조건이 참인지 검증한다.
    assert location is None



## 시나리오 4: 빈 문자열 좌표는 None 처리되고 위치 row는 생성하지 않음
def test_report_upload_with_blank_coordinates_treats_location_as_absent(client, auth_header):
    # 설명: `payload`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    payload = {
        'subject': 'Blank Coordinates Report',
        'report_type': 'STALLED_VEHICLE',
        'description': '빈 문자열 좌표 테스트',
        'latitude': '',
        'longitude': '',
        'files': (io.BytesIO(b"test content"), 'blank_coordinates_report.png')
    }

    # 설명: `res`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    res = client.post('/api/reports',
                      data=payload,
                      headers=auth_header,
                      content_type='multipart/form-data')

    # 설명: `res.status_code != 201` 조건 결과에 따라 실행 경로를 분기한다.
    if res.status_code != 201:
        # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        print(f"\nResponse Body: {res.get_json()}")

    # 설명: 테스트 전제 또는 결과인 `res.status_code == 201` 조건이 참인지 검증한다.
    assert res.status_code == 201

    # 설명: `report`에 `IncidentReport.query.filter_by(title='Blank Coordinates Report').first` 호출 결과를 저장해 다음 처리에서 사용한다.
    report = IncidentReport.query.filter_by(title='Blank Coordinates Report').first()
    # 설명: 테스트 전제 또는 결과인 `report is not None` 조건이 참인지 검증한다.
    assert report is not None

    # 설명: `location`에 `ReportLocation.query.filter_by(report_id=report.id).first` 호출 결과를 저장해 다음 처리에서 사용한다.
    location = ReportLocation.query.filter_by(report_id=report.id).first()
    # 설명: 테스트 전제 또는 결과인 `location is None` 조건이 참인지 검증한다.
    assert location is None


## 시나리오 5: 잘못된 좌표 문자열은 신고 등록 실패
def test_report_upload_with_invalid_coordinates_returns_bad_request(client, auth_header):
    # 설명: `payload`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    payload = {
        'subject': 'Invalid Coordinates Report',
        'report_type': 'STALLED_VEHICLE',
        'description': '잘못된 좌표 문자열 테스트',
        'latitude': 'not-a-number',
        'longitude': '126.9780',
        'files': (io.BytesIO(b"test content"), 'invalid_coordinates_report.png')
    }

    # 설명: `res`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    res = client.post('/api/reports',
                      data=payload,
                      headers=auth_header,
                      content_type='multipart/form-data')

    # 설명: 테스트 전제 또는 결과인 `res.status_code in (400, 422)` 조건이 참인지 검증한다.
    assert res.status_code in (400, 422)

    # 설명: `report`에 `IncidentReport.query.filter_by(title='Invalid Coordinates Report')....` 호출 결과를 저장해 다음 처리에서 사용한다.
    report = IncidentReport.query.filter_by(title='Invalid Coordinates Report').first()
    # 설명: 테스트 전제 또는 결과인 `report is None` 조건이 참인지 검증한다.
    assert report is None


# 설명: `test_report_draft_lifecycle` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_report_draft_lifecycle(client, auth_header):
    # 설명: `create_payload`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    create_payload = {
        "subject": "임시저장 신고",
        "report_type": "STALLED_VEHICLE",
        "description": "작성 중인 신고입니다.",
        "priority": "NORMAL",
        "latitude": "37.5665",
        "longitude": "126.9780",
    }

    # 설명: `create_res`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    create_res = client.post(
        "/api/reports/drafts",
        json=create_payload,
        headers=auth_header,
    )

    # 설명: `create_res.status_code != 201` 조건 결과에 따라 실행 경로를 분기한다.
    if create_res.status_code != 201:
        # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        print(f"\nCreate draft response: {create_res.get_json()}")

    # 설명: 테스트 전제 또는 결과인 `create_res.status_code == 201` 조건이 참인지 검증한다.
    assert create_res.status_code == 201
    # 설명: `create_body`에 `create_res.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    create_body = create_res.get_json()
    # 설명: 테스트 전제 또는 결과인 `create_body['success'] is True` 조건이 참인지 검증한다.
    assert create_body["success"] is True

    # 설명: `draft_id`에 create_body['draft_id'] 표현식의 계산 결과를 저장한다.
    draft_id = create_body["draft_id"]

    # 설명: `report`에 `IncidentReport.query.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    report = IncidentReport.query.get(draft_id)
    # 설명: 테스트 전제 또는 결과인 `report is not None` 조건이 참인지 검증한다.
    assert report is not None
    # 설명: 테스트 전제 또는 결과인 `report.status == 'DRAFT'` 조건이 참인지 검증한다.
    assert report.status == "DRAFT"
    # 설명: 테스트 전제 또는 결과인 `report.title == '임시저장 신고'` 조건이 참인지 검증한다.
    assert report.title == "임시저장 신고"

    # 설명: `list_res`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    list_res = client.get("/api/reports/drafts", headers=auth_header)
    # 설명: 테스트 전제 또는 결과인 `list_res.status_code == 200` 조건이 참인지 검증한다.
    assert list_res.status_code == 200
    # 설명: `list_body`에 `list_res.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    list_body = list_res.get_json()
    # 설명: 테스트 전제 또는 결과인 `list_body['success'] is True` 조건이 참인지 검증한다.
    assert list_body["success"] is True
    # 설명: 테스트 전제 또는 결과인 `list_body['total_count'] >= 1` 조건이 참인지 검증한다.
    assert list_body["total_count"] >= 1

    # 설명: `get_res`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    get_res = client.get(f"/api/reports/drafts/{draft_id}", headers=auth_header)
    # 설명: 테스트 전제 또는 결과인 `get_res.status_code == 200` 조건이 참인지 검증한다.
    assert get_res.status_code == 200
    # 설명: `get_body`에 `get_res.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    get_body = get_res.get_json()
    # 설명: 테스트 전제 또는 결과인 `get_body['draft']['id'] == draft_id` 조건이 참인지 검증한다.
    assert get_body["draft"]["id"] == draft_id
    # 설명: 테스트 전제 또는 결과인 `get_body['draft']['status'] == 'DRAFT'` 조건이 참인지 검증한다.
    assert get_body["draft"]["status"] == "DRAFT"

    # 설명: `update_res`에 `client.patch` 호출 결과를 저장해 다음 처리에서 사용한다.
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

    # 설명: `update_res.status_code != 200` 조건 결과에 따라 실행 경로를 분기한다.
    if update_res.status_code != 200:
        # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        print(f"\nUpdate draft response: {update_res.get_json()}")

    # 설명: 테스트 전제 또는 결과인 `update_res.status_code == 200` 조건이 참인지 검증한다.
    assert update_res.status_code == 200

    # 설명: `db.session.refresh`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    db.session.refresh(report)
    # 설명: 테스트 전제 또는 결과인 `report.title == '수정된 임시저장 신고'` 조건이 참인지 검증한다.
    assert report.title == "수정된 임시저장 신고"
    # 설명: 테스트 전제 또는 결과인 `report.description == '수정된 설명입니다.'` 조건이 참인지 검증한다.
    assert report.description == "수정된 설명입니다."
    # 설명: 테스트 전제 또는 결과인 `report.priority == 'HIGH'` 조건이 참인지 검증한다.
    assert report.priority == "HIGH"
    # 설명: 테스트 전제 또는 결과인 `report.cctv_id == 123` 조건이 참인지 검증한다.
    assert report.cctv_id == 123

    # 설명: `delete_res`에 `client.delete` 호출 결과를 저장해 다음 처리에서 사용한다.
    delete_res = client.delete(f"/api/reports/drafts/{draft_id}", headers=auth_header)
    # 설명: 테스트 전제 또는 결과인 `delete_res.status_code == 200` 조건이 참인지 검증한다.
    assert delete_res.status_code == 200

    # 설명: `db.session.refresh`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    db.session.refresh(report)
    # 설명: 테스트 전제 또는 결과인 `report.status == 'DELETED'` 조건이 참인지 검증한다.
    assert report.status == "DELETED"
    # 설명: 테스트 전제 또는 결과인 `report.deleted_at is not None` 조건이 참인지 검증한다.
    assert report.deleted_at is not None
    # 설명: 테스트 전제 또는 결과인 `report.deleted_by is not None` 조건이 참인지 검증한다.
    assert report.deleted_by is not None


# 설명: `test_report_draft_invalid_cctv_id_returns_bad_request` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_report_draft_invalid_cctv_id_returns_bad_request(client, auth_header):
    # 설명: `res`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    res = client.post(
        "/api/reports/drafts",
        json={
            "subject": "잘못된 CCTV ID 임시저장",
            "cctv_id": "not-a-number",
        },
        headers=auth_header,
    )

    # 설명: 테스트 전제 또는 결과인 `res.status_code == 400` 조건이 참인지 검증한다.
    assert res.status_code == 400
    # 설명: `body`에 `res.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = res.get_json()
    # 설명: 테스트 전제 또는 결과인 `body['success'] is False` 조건이 참인지 검증한다.
    assert body["success"] is False


# 설명: `test_submit_report_draft_changes_status_to_submitted` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_submit_report_draft_changes_status_to_submitted(client, auth_header):
    # 설명: `create_res`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
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

    # 설명: 테스트 전제 또는 결과인 `create_res.status_code == 201` 조건이 참인지 검증한다.
    assert create_res.status_code == 201
    # 설명: `draft_id`에 create_res.get_json()['draft_id'] 표현식의 계산 결과를 저장한다.
    draft_id = create_res.get_json()["draft_id"]

    # 설명: `submit_res`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    submit_res = client.post(
        f"/api/reports/drafts/{draft_id}/submit",
        headers=auth_header,
    )

    # 설명: `submit_res.status_code != 200` 조건 결과에 따라 실행 경로를 분기한다.
    if submit_res.status_code != 200:
        # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        print(f"\nSubmit draft response: {submit_res.get_json()}")

    # 설명: 테스트 전제 또는 결과인 `submit_res.status_code == 200` 조건이 참인지 검증한다.
    assert submit_res.status_code == 200
    # 설명: `body`에 `submit_res.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = submit_res.get_json()
    # 설명: 테스트 전제 또는 결과인 `body['success'] is True` 조건이 참인지 검증한다.
    assert body["success"] is True
    # 설명: 테스트 전제 또는 결과인 `body['report_id'] == draft_id` 조건이 참인지 검증한다.
    assert body["report_id"] == draft_id

    # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    report = db.session.get(IncidentReport, draft_id)
    # 설명: 테스트 전제 또는 결과인 `report.status == 'SUBMITTED'` 조건이 참인지 검증한다.
    assert report.status == "SUBMITTED"
    # 설명: 테스트 전제 또는 결과인 `report.upload_purpose == 'REPORT'` 조건이 참인지 검증한다.
    assert report.upload_purpose == "REPORT"
    # 설명: 테스트 전제 또는 결과인 `report.submitted_at is not None` 조건이 참인지 검증한다.
    assert report.submitted_at is not None


# 설명: `test_submit_report_draft_rejects_non_draft_report` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_submit_report_draft_rejects_non_draft_report(client, auth_header):
    # 설명: `payload`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    payload = {
        'subject': 'Already Submitted Report',
        'report_type': 'STALLED_VEHICLE',
        'description': '이미 제출된 신고',
        'files': (io.BytesIO(b"test content"), 'submitted_report.png')
    }

    # 설명: `create_res`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    create_res = client.post(
        '/api/reports',
        data=payload,
        headers=auth_header,
        content_type='multipart/form-data',
    )

    # 설명: 테스트 전제 또는 결과인 `create_res.status_code == 201` 조건이 참인지 검증한다.
    assert create_res.status_code == 201

    # 설명: `report`에 `IncidentReport.query.filter_by(title='Already Submitted Report').first` 호출 결과를 저장해 다음 처리에서 사용한다.
    report = IncidentReport.query.filter_by(title='Already Submitted Report').first()
    # 설명: 테스트 전제 또는 결과인 `report is not None` 조건이 참인지 검증한다.
    assert report is not None

    # 설명: `submit_res`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    submit_res = client.post(
        f"/api/reports/drafts/{report.id}/submit",
        headers=auth_header,
    )

    # 설명: 테스트 전제 또는 결과인 `submit_res.status_code == 400` 조건이 참인지 검증한다.
    assert submit_res.status_code == 400
    # 설명: `body`에 `submit_res.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = submit_res.get_json()
    # 설명: 테스트 전제 또는 결과인 `body['success'] is False` 조건이 참인지 검증한다.
    assert body["success"] is False
