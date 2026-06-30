"""cctv routes 동작과 회귀 계약을 검증하는 테스트 모듈.

격리된 픽스처로 성공 경로, 입력 오류, 권한 및 데이터베이스 부작용을 확인한다."""

# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: datetime에서 datetime 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime, timedelta

# 설명: pytest 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import jwt
import pytest

# 설명: app에서 create_app 이름을 가져와 아래 로직에서 재사용한다.
from app import create_app
# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.models에서 Cctv, CctvRoi, CctvSlot, CctvStatusLog 이름을 가져와 아래 로직에서 재사용한다.
from app.models import Cctv, CctvRoi, CctvSlot, CctvStatusLog
from app.models.auth_models import User
# 설명: db_cleanup에서 cleanup_database 이름을 가져와 아래 로직에서 재사용한다.
from db_cleanup import cleanup_database


# 설명: `app` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@pytest.fixture
def app():
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


# 설명: `client` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@pytest.fixture
def client(app):
    # 설명: 호출자에게 app.test_client() 값을 함수 결과로 반환한다.
    return app.test_client()


# 설명: `_create_cctv` 함수는 새 데이터나 리소스를 생성하는 함수다.


def _auth_header(app, role: str):
    with app.app_context():
        user = User(
            login_id=f"cctv_{role.lower()}_{datetime.utcnow().timestamp()}".replace(".", "_"),
            email=f"cctv_{role.lower()}_{datetime.utcnow().timestamp()}@test.local",
            password_hash="hashed_pw",
            name="CCTV Test User",
            role=role,
            account_status="ACTIVE",
            created_at=datetime.utcnow(),
        )
        db.session.add(user)
        db.session.commit()

        token = jwt.encode(
            {
                "sub": str(user.id),
                "email": user.email,
                "role": user.role,
                "iat": datetime.utcnow(),
                "exp": datetime.utcnow() + timedelta(hours=1),
            },
            app.config["JWT_SECRET_KEY"],
            algorithm="HS256",
        )
        return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_header(app):
    return _auth_header(app, "SUPER_ADMIN")


@pytest.fixture
def viewer_header(app):
    return _auth_header(app, "VIEWER")


def _create_cctv(*, code: str, name: str, is_active: int, road_name: str = "Road-1"):
    # 설명: `item`에 `Cctv` 호출 결과를 저장해 다음 처리에서 사용한다.
    item = Cctv(
        cctv_code=code,
        cctv_name=name,
        stream_url=f"http://127.0.0.1/streams/{code}.mjpeg",
        location_name=f"Location-{code}",
        road_name=road_name,
        direction="N",
        latitude=37.1234567,
        longitude=127.1234567,
        is_active=is_active,
        installed_at=None,
        created_at=datetime.utcnow(),
        updated_at=None,
    )
    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(item)
    # 설명: `db.session.flush`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    db.session.flush()
    # 설명: 호출자에게 item 값을 함수 결과로 반환한다.
    return item


# 설명: `_create_roi` 함수는 새 데이터나 리소스를 생성하는 함수다.
def _create_roi(cctv_id: int, *, roi_type: str = "SHOULDER", is_active: int = 1):
    # 설명: `item`에 `CctvRoi` 호출 결과를 저장해 다음 처리에서 사용한다.
    item = CctvRoi(
        cctv_id=cctv_id,
        roi_type=roi_type,
        roi_name=f"{roi_type} ROI",
        polygon_json=[
            {"x": 10, "y": 20},
            {"x": 100, "y": 20},
            {"x": 100, "y": 120},
            {"x": 10, "y": 120},
        ],
        is_active=is_active,
        created_at=datetime.utcnow(),
        updated_at=None,
    )
    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(item)
    # 설명: `db.session.flush`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    db.session.flush()
    # 설명: 호출자에게 item 값을 함수 결과로 반환한다.
    return item


# 설명: `_create_status_log` 함수는 새 데이터나 리소스를 생성하는 함수다.
def _create_status_log(cctv_id: int, *, status: str = "ONLINE"):
    # 설명: `item`에 `CctvStatusLog` 호출 결과를 저장해 다음 처리에서 사용한다.
    item = CctvStatusLog(
        cctv_id=cctv_id,
        status=status,
        message=f"{status} status",
        checked_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(item)
    # 설명: `db.session.flush`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    db.session.flush()
    # 설명: 호출자에게 item 값을 함수 결과로 반환한다.
    return item


# 설명: `test_get_cctvs_returns_items` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_get_cctvs_returns_items(client, app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `_create_cctv`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _create_cctv(code="CCTV-001", name="Camera 1", is_active=1)
        # 설명: `_create_cctv`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _create_cctv(code="CCTV-002", name="Camera 2", is_active=0)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

    # 설명: `response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.get("/api/cctvs")

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
    assert response.status_code == 200
    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()
    # 설명: 테스트 전제 또는 결과인 `body['success'] is True` 조건이 참인지 검증한다.
    assert body["success"] is True
    # 설명: 테스트 전제 또는 결과인 `body['count'] == 2` 조건이 참인지 검증한다.
    assert body["count"] == 2
    # 설명: 테스트 전제 또는 결과인 `body['items'][0]['cctv_code'] == 'CCTV-001'` 조건이 참인지 검증한다.
    assert body["items"][0]["cctv_code"] == "CCTV-001"
    # 설명: 테스트 전제 또는 결과인 `body['items'][0]['camera_id'] == 'CCTV-001'` 조건이 참인지 검증한다.
    assert body["items"][0]["camera_id"] == "CCTV-001"
    # 설명: 테스트 전제 또는 결과인 `body['items'][0]['camera_name'] == 'Camera 1'` 조건이 참인지 검증한다.
    assert body["items"][0]["camera_name"] == "Camera 1"
    # 설명: 테스트 전제 또는 결과인 `body['items'][0]['stream_url'] == 'http://127.0.0.1/streams/CCTV-001.mjpeg'` 조건이 참인지 검증한다.
    assert body["items"][0]["stream_url"] == "http://127.0.0.1/streams/CCTV-001.mjpeg"


# 설명: `test_get_cctvs_filters_by_is_active` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_get_cctvs_filters_by_is_active(client, app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `_create_cctv`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _create_cctv(code="CCTV-001", name="Camera 1", is_active=1)
        # 설명: `_create_cctv`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _create_cctv(code="CCTV-002", name="Camera 2", is_active=0)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

    # 설명: `response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.get("/api/cctvs?is_active=true")

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
    assert response.status_code == 200
    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()
    # 설명: 테스트 전제 또는 결과인 `body['count'] == 1` 조건이 참인지 검증한다.
    assert body["count"] == 1
    # 설명: 테스트 전제 또는 결과인 `body['items'][0]['cctv_code'] == 'CCTV-001'` 조건이 참인지 검증한다.
    assert body["items"][0]["cctv_code"] == "CCTV-001"


# 설명: `test_get_cctv_detail_and_code_lookup` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_get_cctv_detail_and_code_lookup(client, app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `item`에 `_create_cctv` 호출 결과를 저장해 다음 처리에서 사용한다.
        item = _create_cctv(code="CCTV-009", name="Camera 9", is_active=1, road_name="Road-9")
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
        # 설명: `cctv_id`에 item.id 표현식의 계산 결과를 저장한다.
        cctv_id = item.id

    # 설명: `detail_response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    detail_response = client.get(f"/api/cctvs/{cctv_id}")
    # 설명: 테스트 전제 또는 결과인 `detail_response.status_code == 200` 조건이 참인지 검증한다.
    assert detail_response.status_code == 200
    # 설명: 테스트 전제 또는 결과인 `detail_response.get_json()['item']['cctv_name'] == 'Camera 9'` 조건이 참인지 검증한다.
    assert detail_response.get_json()["item"]["cctv_name"] == "Camera 9"
    # 설명: 테스트 전제 또는 결과인 `detail_response.get_json()['item']['camera_id'] == 'CCTV-009'` 조건이 참인지 검증한다.
    assert detail_response.get_json()["item"]["camera_id"] == "CCTV-009"

    # 설명: `code_response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    code_response = client.get("/api/cctvs/code/CCTV-009")
    # 설명: 테스트 전제 또는 결과인 `code_response.status_code == 200` 조건이 참인지 검증한다.
    assert code_response.status_code == 200
    # 설명: 테스트 전제 또는 결과인 `code_response.get_json()['item']['road_name'] == 'Road-9'` 조건이 참인지 검증한다.
    assert code_response.get_json()["item"]["road_name"] == "Road-9"

    # 설명: `cameras_response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    cameras_response = client.get("/api/cameras")
    # 설명: 테스트 전제 또는 결과인 `cameras_response.status_code == 200` 조건이 참인지 검증한다.
    assert cameras_response.status_code == 200
    # 설명: 테스트 전제 또는 결과인 `cameras_response.get_json()['cameras'][0]['camera_id'] == 'CCTV-009'` 조건이 참인지 검증한다.
    assert cameras_response.get_json()["cameras"][0]["camera_id"] == "CCTV-009"

    # 설명: `camera_response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    camera_response = client.get("/api/cameras/CCTV-009")
    # 설명: 테스트 전제 또는 결과인 `camera_response.status_code == 200` 조건이 참인지 검증한다.
    assert camera_response.status_code == 200
    # 설명: 테스트 전제 또는 결과인 `camera_response.get_json()['camera']['stream_url'].endswith('CCTV-009.mjpeg')` 조건이 참인지 검증한다.
    assert camera_response.get_json()["camera"]["stream_url"].endswith("CCTV-009.mjpeg")


# 설명: `test_cctv_rois_and_stream_status` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_cctv_rois_and_stream_status(client, app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `cctv`에 `_create_cctv` 호출 결과를 저장해 다음 처리에서 사용한다.
        cctv = _create_cctv(code="CCTV-ROI", name="ROI Camera", is_active=1)
        # 설명: `_create_roi`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _create_roi(cctv.id, roi_type="SHOULDER")
        # 설명: `_create_status_log`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _create_status_log(cctv.id, status="ONLINE")
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
        # 설명: `cctv_id`에 cctv.id 표현식의 계산 결과를 저장한다.
        cctv_id = cctv.id

    # 설명: `rois_response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    rois_response = client.get(f"/api/cctvs/{cctv_id}/rois")
    # 설명: 테스트 전제 또는 결과인 `rois_response.status_code == 200` 조건이 참인지 검증한다.
    assert rois_response.status_code == 200
    # 설명: `rois_body`에 `rois_response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    rois_body = rois_response.get_json()
    # 설명: 테스트 전제 또는 결과인 `rois_body['count'] == 1` 조건이 참인지 검증한다.
    assert rois_body["count"] == 1
    # 설명: 테스트 전제 또는 결과인 `rois_body['items'][0]['roi_type'] == 'SHOULDER'` 조건이 참인지 검증한다.
    assert rois_body["items"][0]["roi_type"] == "SHOULDER"
    # 설명: 테스트 전제 또는 결과인 `rois_body['items'][0]['roi_id']` 조건이 참인지 검증한다.
    assert rois_body["items"][0]["roi_id"]
    # 설명: 테스트 전제 또는 결과인 `rois_body['items'][0]['points'][0]['x'] == 10` 조건이 참인지 검증한다.
    assert rois_body["items"][0]["points"][0]["x"] == 10

    # 설명: `status_response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    status_response = client.get(f"/api/cctvs/{cctv_id}/stream-status")
    # 설명: 테스트 전제 또는 결과인 `status_response.status_code == 200` 조건이 참인지 검증한다.
    assert status_response.status_code == 200
    # 설명: `status_body`에 `status_response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    status_body = status_response.get_json()
    # 설명: 테스트 전제 또는 결과인 `status_body['item']['status'] == 'ONLINE'` 조건이 참인지 검증한다.
    assert status_body["item"]["status"] == "ONLINE"
    # 설명: 테스트 전제 또는 결과인 `status_body['item']['camera_id'] == 'CCTV-ROI'` 조건이 참인지 검증한다.
    assert status_body["item"]["camera_id"] == "CCTV-ROI"

    # 설명: `statuses_response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    statuses_response = client.get("/api/cctvs/stream-status")
    # 설명: 테스트 전제 또는 결과인 `statuses_response.status_code == 200` 조건이 참인지 검증한다.
    assert statuses_response.status_code == 200
    # 설명: 테스트 전제 또는 결과인 `statuses_response.get_json()['items'][0]['status'] == 'ONLINE'` 조건이 참인지 검증한다.
    assert statuses_response.get_json()["items"][0]["status"] == "ONLINE"


# 설명: `test_cctv_slots_can_be_saved_and_loaded` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_cctv_slots_can_be_saved_and_loaded(client, app, admin_header):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `_create_cctv`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _create_cctv(code="CCTV-SLOT", name="Slot Camera", is_active=1)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

    # 설명: `response`에 `client.put` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.put(
        "/api/cctv-slots",
        headers=admin_header,
        json={
            "slots": [
                {
                    "slot_number": 1,
                    "camera_id": "CCTV-SLOT",
                    "display_name": "Main Slot",
                    "layout": {"x": 0, "y": 0, "w": 2, "h": 1},
                }
            ]
        },
    )

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
    assert response.status_code == 200
    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()
    # 설명: 테스트 전제 또는 결과인 `body['success'] is True` 조건이 참인지 검증한다.
    assert body["success"] is True
    # 설명: 테스트 전제 또는 결과인 `body['items'][0]['slot_number'] == 1` 조건이 참인지 검증한다.
    assert body["items"][0]["slot_number"] == 1
    # 설명: 테스트 전제 또는 결과인 `body['items'][0]['camera_id'] == 'CCTV-SLOT'` 조건이 참인지 검증한다.
    assert body["items"][0]["camera_id"] == "CCTV-SLOT"

    # 설명: `list_response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    list_response = client.get("/api/cctv-slots")
    # 설명: 테스트 전제 또는 결과인 `list_response.status_code == 200` 조건이 참인지 검증한다.
    assert list_response.status_code == 200
    # 설명: 테스트 전제 또는 결과인 `list_response.get_json()['items'][0]['cctv']['camera_id'] == 'CCTV-SLOT'` 조건이 참인지 검증한다.
    assert list_response.get_json()["items"][0]["cctv"]["camera_id"] == "CCTV-SLOT"

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: 테스트 전제 또는 결과인 `CctvSlot.query.count() == 1` 조건이 참인지 검증한다.
        assert CctvSlot.query.count() == 1


# 설명: `test_cctv_create_update_patch_and_delete` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_cctv_create_update_patch_and_delete(client, app, admin_header):
    # 설명: `create_response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    create_response = client.post(
        "/api/cctvs",
        headers=admin_header,
        json={
            "cctv_code": "CCTV-CRUD",
            "cctv_name": "CRUD Camera",
            "stream_url": "http://127.0.0.1/streams/CCTV-CRUD.mjpeg",
            "road_name": "Road-CRUD",
            "is_active": 1,
        },
    )

    # 설명: 테스트 전제 또는 결과인 `create_response.status_code == 201` 조건이 참인지 검증한다.
    assert create_response.status_code == 201
    # 설명: `cctv_id`에 create_response.get_json()['item']['id'] 표현식의 계산 결과를 저장한다.
    cctv_id = create_response.get_json()["item"]["id"]

    # 설명: `patch_response`에 `client.patch` 호출 결과를 저장해 다음 처리에서 사용한다.
    patch_response = client.patch(
        f"/api/cctvs/{cctv_id}",
        headers=admin_header,
        json={"is_active": 0, "cctv_name": "CRUD Camera Updated"},
    )
    # 설명: 테스트 전제 또는 결과인 `patch_response.status_code == 200` 조건이 참인지 검증한다.
    assert patch_response.status_code == 200
    # 설명: 테스트 전제 또는 결과인 `patch_response.get_json()['item']['active'] is False` 조건이 참인지 검증한다.
    assert patch_response.get_json()["item"]["active"] is False
    # 설명: 테스트 전제 또는 결과인 `patch_response.get_json()['item']['cctv_name'] == 'CRUD Camera Updated'` 조건이 참인지 검증한다.
    assert patch_response.get_json()["item"]["cctv_name"] == "CRUD Camera Updated"

    # 설명: `put_response`에 `client.put` 호출 결과를 저장해 다음 처리에서 사용한다.
    put_response = client.put(
        f"/api/cctvs/{cctv_id}",
        headers=admin_header,
        json={
            "stream_url": "http://127.0.0.1/streams/CCTV-CRUD-updated.mjpeg",
            "location_name": "Updated Location",
        },
    )
    # 설명: 테스트 전제 또는 결과인 `put_response.status_code == 200` 조건이 참인지 검증한다.
    assert put_response.status_code == 200
    # 설명: 테스트 전제 또는 결과인 `put_response.get_json()['item']['stream_url'].endswith('updated.mjpeg')` 조건이 참인지 검증한다.
    assert put_response.get_json()["item"]["stream_url"].endswith("updated.mjpeg")

    # 설명: `delete_response`에 `client.delete` 호출 결과를 저장해 다음 처리에서 사용한다.
    delete_response = client.delete(f"/api/cctvs/{cctv_id}", headers=admin_header)
    # 설명: 테스트 전제 또는 결과인 `delete_response.status_code == 200` 조건이 참인지 검증한다.
    assert delete_response.status_code == 200
    # 설명: 테스트 전제 또는 결과인 `delete_response.get_json()['deleted_id'] == cctv_id` 조건이 참인지 검증한다.
    assert delete_response.get_json()["deleted_id"] == cctv_id




# 설명: `test_cctv_code_database_unique_constraint` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_cctv_code_database_unique_constraint(app):
    # 설명: datetime에서 datetime 이름을 가져와 아래 로직에서 재사용한다.
    from datetime import datetime, timedelta

    # 설명: pytest 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
    import pytest
    # 설명: sqlalchemy에서 text 이름을 가져와 아래 로직에서 재사용한다.
    from sqlalchemy import text
    # 설명: sqlalchemy.exc에서 IntegrityError 이름을 가져와 아래 로직에서 재사용한다.
    from sqlalchemy.exc import IntegrityError

    # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
    from app.extensions import db
    # 설명: app.models에서 Cctv 이름을 가져와 아래 로직에서 재사용한다.
    from app.models import Cctv

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # FK 추가나 전체 DB drop은 하지 않습니다.
        # 기존 test DB는 db.create_all()만으로 기존 테이블에 unique를 ALTER하지 않으므로,
        # 이 테스트에 필요한 cctvs.cctv_code unique index만 보장합니다.
        db.session.execute(text("""
            DELETE FROM cctvs
            WHERE cctv_code = 'CCTV-UNIQUE-001'
        """))
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: `duplicate_count`에 `db.session.execute(text('\n SELECT COUNT(*)\n FROM (\n SELECT cctv_...` 호출 결과를 저장해 다음 처리에서 사용한다.
        duplicate_count = db.session.execute(text("""
            SELECT COUNT(*)
            FROM (
                SELECT cctv_code
                FROM cctvs
                GROUP BY cctv_code
                HAVING COUNT(*) > 1
            ) duplicated_codes
        """)).scalar()

        # 설명: 테스트 전제 또는 결과인 `duplicate_count == 0` 조건이 참인지 검증한다.
        assert duplicate_count == 0

        # 설명: `existing_index`에 `db.session.execute(text("\n SELECT COUNT(*)\n FROM information_sche...` 호출 결과를 저장해 다음 처리에서 사용한다.
        existing_index = db.session.execute(text("""
            SELECT COUNT(*)
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = 'cctvs'
              AND index_name = 'uq_cctvs_cctv_code'
        """)).scalar()

        # 설명: `not existing_index` 조건 결과에 따라 실행 경로를 분기한다.
        if not existing_index:
            # 설명: `db.session.execute`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            db.session.execute(text("""
                ALTER TABLE cctvs
                ADD UNIQUE KEY uq_cctvs_cctv_code (cctv_code)
            """))
            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()

        # 설명: `first`에 `Cctv` 호출 결과를 저장해 다음 처리에서 사용한다.
        first = Cctv(
            cctv_code="CCTV-UNIQUE-001",
            cctv_name="Unique CCTV 1",
            road_name="테스트 도로",
            direction="상행",
            location_name="테스트 위치 1",
            stream_url="rtsp://example.com/unique-1",
            is_active=True,
            created_at=datetime.utcnow(),
        )
        # 설명: `second`에 `Cctv` 호출 결과를 저장해 다음 처리에서 사용한다.
        second = Cctv(
            cctv_code="CCTV-UNIQUE-001",
            cctv_name="Unique CCTV 2",
            road_name="테스트 도로",
            direction="하행",
            location_name="테스트 위치 2",
            stream_url="rtsp://example.com/unique-2",
            is_active=True,
            created_at=datetime.utcnow(),
        )

        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(first)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(second)
        # 설명: `pytest.raises(IntegrityError)` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
        with pytest.raises(IntegrityError):
            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()

        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()


def test_cctv_rois_accept_code_identifier(client, app, admin_header):
    """ROI API는 숫자 PK와 CCTV 코드 식별자를 모두 허용해야 합니다."""
    with app.app_context():
        cctv = _create_cctv(
            code="CCTV-ROI-CODE",
            name="ROI Code Camera",
            is_active=1,
        )
        db.session.commit()
        cctv_id = cctv.id

    payload = {
        "items": [
            {
                "roi_type": "SHOULDER",
                "roi_name": "Shoulder ROI",
                "polygon_json": [[10, 20], [100, 20], [100, 120]],
                "is_active": True,
            }
        ]
    }

    put_response = client.put("/api/cctvs/CCTV-ROI-CODE/rois", headers=admin_header, json=payload)
    assert put_response.status_code == 200
    assert put_response.get_json()["cctv_id"] == cctv_id
    assert put_response.get_json()["count"] == 1

    code_get_response = client.get("/api/cctvs/CCTV-ROI-CODE/rois")
    assert code_get_response.status_code == 200
    assert code_get_response.get_json()["cctv_id"] == cctv_id
    assert code_get_response.get_json()["items"][0]["roi_type"] == "SHOULDER"

    id_get_response = client.get(f"/api/cctvs/{cctv_id}/rois")
    assert id_get_response.status_code == 200
    assert id_get_response.get_json()["count"] == 1


def test_cctv_write_requires_admin_role(client, app, viewer_header):
    create_response = client.post("/api/cctvs", json={"cctv_code": "CCTV-NOAUTH", "cctv_name": "No Auth"})
    assert create_response.status_code == 401

    viewer_response = client.post(
        "/api/cctvs",
        headers=viewer_header,
        json={"cctv_code": "CCTV-VIEWER", "cctv_name": "Viewer"},
    )
    assert viewer_response.status_code == 403


def test_cctv_roi_update_requires_admin_and_valid_polygon(client, app, admin_header, viewer_header):
    with app.app_context():
        cctv = _create_cctv(code="CCTV-ROI-AUTH", name="ROI Auth Camera", is_active=1)
        db.session.commit()
        cctv_id = cctv.id

    payload = {
        "items": [
            {
                "roi_type": "SHOULDER",
                "polygon_json": [[10, 20], [100, 20], [100, 120]],
            }
        ]
    }

    assert client.put(f"/api/cctvs/{cctv_id}/rois", json=payload).status_code == 401
    assert client.put(f"/api/cctvs/{cctv_id}/rois", headers=viewer_header, json=payload).status_code == 403

    bad_payload = {"items": [{"roi_type": "SHOULDER", "polygon_json": [[-1, 20], [100, 20], [100, 120]]}]}
    bad_response = client.put(f"/api/cctvs/{cctv_id}/rois", headers=admin_header, json=bad_payload)
    assert bad_response.status_code == 400

    ok_response = client.put(f"/api/cctvs/{cctv_id}/rois", headers=admin_header, json=payload)
    assert ok_response.status_code == 200


def test_manual_event_requires_admin_and_filters_payload(client, app, admin_header, viewer_header, monkeypatch):
    with app.app_context():
        cctv = _create_cctv(code="CCTV-MANUAL", name="Manual Camera", is_active=1)
        db.session.commit()

    assert client.post("/api/cctvs/CCTV-MANUAL/manual-events", json={}).status_code == 401
    assert client.post("/api/cctvs/CCTV-MANUAL/manual-events", headers=viewer_header, json={}).status_code == 403

    captured = {}

    class Response:
        ok = True
        status_code = 201

        def json(self):
            return {"ok": True}

    def fake_post(url, json, headers, timeout):
        captured["payload"] = json
        captured["headers"] = headers
        return Response()

    monkeypatch.setattr("app.modules.cctv.routes.http_requests.post", fake_post)
    response = client.post(
        "/api/cctvs/CCTV-MANUAL/manual-events",
        headers=admin_header,
        json={"event_type": "MANUAL_EVENT", "source": "WEB", "admin_only": "blocked"},
    )

    assert response.status_code == 201
    assert captured["payload"]["event_type"] == "MANUAL_EVENT"
    assert "admin_only" not in captured["payload"]



def test_cctvs_ai_vm_source_requires_auth_and_uses_internal_bearer(client, app, admin_header, monkeypatch):
    app.config["AI_VM_BASE_URL"] = "http://127.0.0.1:5001"
    app.config["INTERNAL_API_TOKEN"] = "test-internal-token"

    unauthenticated = client.get("/api/cctvs?source=ai-vm")
    assert unauthenticated.status_code == 401

    captured = {}

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def read(self):
            return b'{"items":[{"camera_id":"AI-1","camera_name":"AI Camera"}]}'

    def fake_urlopen(req, timeout):
        captured["url"] = req.full_url
        captured["authorization"] = req.get_header("Authorization")
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr("app.modules.cctv.routes.urllib.request.urlopen", fake_urlopen)
    response = client.get("/api/cctvs?source=ai-vm", headers=admin_header)

    assert response.status_code == 200
    body = response.get_json()
    assert body["success"] is True
    assert body["source"] == "ITS"
    assert body["count"] == 1
    assert body["items"][0]["camera_id"] == "AI-1"
    assert captured["url"] == "http://127.0.0.1:5001/traffic/api/cctv"
    assert captured["authorization"] == "Bearer test-internal-token"
    assert captured["timeout"] == 15


def test_cameras_ai_vm_source_uses_internal_bearer(client, app, admin_header, monkeypatch):
    app.config["AI_VM_BASE_URL"] = "http://127.0.0.1:5001"
    app.config["INTERNAL_API_TOKEN"] = "test-internal-token"
    captured = {}

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def read(self):
            return b'{"items":[{"camera_id":"AI-2","camera_name":"AI Camera 2"}]}'

    def fake_urlopen(req, timeout):
        captured["url"] = req.full_url
        captured["authorization"] = req.get_header("Authorization")
        return FakeResponse()

    monkeypatch.setattr("app.modules.cctv.routes.urllib.request.urlopen", fake_urlopen)
    response = client.get("/api/cameras?source=its", headers=admin_header)

    assert response.status_code == 200
    body = response.get_json()
    assert body["success"] is True
    assert body["ok"] is True
    assert body["cameras"][0]["camera_id"] == "AI-2"
    assert captured["url"] == "http://127.0.0.1:5001/traffic/api/cctv"
    assert captured["authorization"] == "Bearer test-internal-token"
