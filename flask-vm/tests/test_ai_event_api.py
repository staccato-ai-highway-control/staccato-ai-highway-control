"""ai event api 동작과 회귀 계약을 검증하는 테스트 모듈.

격리된 픽스처로 성공 경로, 입력 오류, 권한 및 데이터베이스 부작용을 확인한다."""

# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
from datetime import datetime, timedelta

import jwt
# 설명: pytest 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import pytest

# 설명: app에서 create_app 이름을 가져와 아래 로직에서 재사용한다.
from app import create_app
# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.models에서 AiEvent, Incident 이름을 가져와 아래 로직에서 재사용한다.
from app.models import AiEvent, Incident, User
# 설명: app.modules.incident_event.service에서 IncidentEventService, IncidentEventValidationError 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.incident_event.service import (
    IncidentEventService,
    IncidentEventValidationError,
)
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




def _auth_header(app, role="CONTROL_ADMIN"):
    with app.app_context():
        suffix = str(datetime.utcnow().timestamp()).replace(".", "_")
        user = User(
            login_id=f"ai_event_{role.lower()}_{suffix}",
            email=f"ai_event_{role.lower()}_{suffix}@test.local",
            password_hash="hashed_pw",
            name="AI Event Test User",
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
    return _auth_header(app, "CONTROL_ADMIN")


@pytest.fixture
def viewer_header(app):
    return _auth_header(app, "VIEWER")


# 설명: `_payload` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _payload(**overrides):
    # 설명: `payload`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    payload = {
        "event_id": "evt_20260526_0001",
        "camera_id": "camera-1",
        "event_type": "STOPPED_VEHICLE",
        "severity": "WARNING",
        "timestamp": "2026-05-26T10:45:12+09:00",
        "track_id": 7,
        "roi_id": "shoulder_1",
        "lane_type": "SHOULDER",
        "bbox": [820, 430, 940, 510],
        "snapshot_url": "http://127.0.0.1:5001/events/evt_20260526_0001.jpg",
        "video_url": "http://127.0.0.1:5001/events/evt_20260526_0001.mp4",
        "stream_url": "http://127.0.0.1:5001/streams/camera-1.mjpeg",
        "message": "Stopped vehicle detected in shoulder ROI",
        "detections": [{"class": "car", "confidence": 0.94}],
    }
    # 설명: `payload.update`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    payload.update(overrides)
    # 설명: 호출자에게 payload 값을 함수 결과로 반환한다.
    return payload


# 설명: `test_post_api_events_persists_event_media_bbox_and_raw_json` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_post_api_events_persists_event_media_bbox_and_raw_json(client, app):
    # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.post("/api/events", json=_payload())

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 201` 조건이 참인지 검증한다.
    assert response.status_code == 201
    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()
    # 설명: 테스트 전제 또는 결과인 `body['ok'] is True` 조건이 참인지 검증한다.
    assert body["ok"] is True
    # 설명: 테스트 전제 또는 결과인 `body['success'] is True` 조건이 참인지 검증한다.
    assert body["success"] is True
    # 설명: 테스트 전제 또는 결과인 `body['status'] == 'created'` 조건이 참인지 검증한다.
    assert body["status"] == "created"
    # 설명: 테스트 전제 또는 결과인 `body['event']['event_id'] == 'evt_20260526_0001'` 조건이 참인지 검증한다.
    assert body["event"]["event_id"] == "evt_20260526_0001"
    assert body["event"]["video_url"] == "/api/ai-media/events/evt_20260526_0001/video"
    assert body["event"]["snapshot_url"] == "/api/ai-media/events/evt_20260526_0001/snapshot"
    assert body["event"]["stream_url"] == "/api/ai-media/events/evt_20260526_0001/stream"
    assert "192.168.0.186:5001" not in str(body["event"])
    # 설명: 테스트 전제 또는 결과인 `body['event']['bbox'] == [820, 430, 940, 510]` 조건이 참인지 검증한다.
    assert body["event"]["bbox"] == [820, 430, 940, 510]
    # 설명: 테스트 전제 또는 결과인 `body['event']['bbox_metadata']['valid'] is True` 조건이 참인지 검증한다.
    assert body["event"]["bbox_metadata"]["valid"] is True
    # 설명: 테스트 전제 또는 결과인 `body['event']['bbox_metadata']['format'] == 'xyxy'` 조건이 참인지 검증한다.
    assert body["event"]["bbox_metadata"]["format"] == "xyxy"
    # 설명: 테스트 전제 또는 결과인 `body['event']['detection_count'] == 1` 조건이 참인지 검증한다.
    assert body["event"]["detection_count"] == 1
    # 설명: 테스트 전제 또는 결과인 `body['event']['detections'][0]['bbox_metadata']['present'] is False` 조건이 참인지 검증한다.
    assert body["event"]["detections"][0]["bbox_metadata"]["present"] is False
    # 설명: 테스트 전제 또는 결과인 `body['event']['raw_event_json']['detections'][0]['class'] == 'car'` 조건이 참인지 검증한다.
    assert body["event"]["raw_event_json"]["detections"][0]["class"] == "car"

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `event`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        event = db.session.get(AiEvent, "evt_20260526_0001")
        # 설명: 테스트 전제 또는 결과인 `event is not None` 조건이 참인지 검증한다.
        assert event is not None
        # 설명: 테스트 전제 또는 결과인 `event.camera_id == 'camera-1'` 조건이 참인지 검증한다.
        assert event.camera_id == "camera-1"
        # 설명: 테스트 전제 또는 결과인 `event.event_type == 'STOPPED_VEHICLE'` 조건이 참인지 검증한다.
        assert event.event_type == "STOPPED_VEHICLE"
        assert event.video_url == "/api/ai-media/events/evt_20260526_0001/video"
        assert event.snapshot_url == "/api/ai-media/events/evt_20260526_0001/snapshot"
        assert event.stream_url == "/api/ai-media/events/evt_20260526_0001/stream"
        assert event.raw_event_json["video_url"] == "http://127.0.0.1:5001/events/evt_20260526_0001.mp4"
        # 설명: 테스트 전제 또는 결과인 `event.bbox_json == [820, 430, 940, 510]` 조건이 참인지 검증한다.
        assert event.bbox_json == [820, 430, 940, 510]
        # 설명: 테스트 전제 또는 결과인 `event.raw_event_json['message'] == 'Stopped vehicle detected in shoulder ROI'` 조건이 참인지 검증한다.
        assert event.raw_event_json["message"] == "Stopped vehicle detected in shoulder ROI"

        # 설명: `incident`에 `Incident.query.filter_by(incident_code='evt_20260526_0001').one` 호출 결과를 저장해 다음 처리에서 사용한다.
        incident = Incident.query.filter_by(incident_code="evt_20260526_0001").one()
        # 설명: 테스트 전제 또는 결과인 `incident.incident_type == 'STOPPED_VEHICLE'` 조건이 참인지 검증한다.
        assert incident.incident_type == "STOPPED_VEHICLE"
        # 설명: 테스트 전제 또는 결과인 `incident.incident_status == 'DETECTED'` 조건이 참인지 검증한다.
        assert incident.incident_status == "DETECTED"
        # 설명: 테스트 전제 또는 결과인 `incident.risk_level == 'MEDIUM'` 조건이 참인지 검증한다.
        assert incident.risk_level == "MEDIUM"


# 설명: `test_get_api_events_detail_and_replay_return_saved_event` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_get_api_events_detail_and_replay_return_saved_event(client, admin_header):
    # 설명: `client.post`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    client.post("/api/events", json=_payload())

    # 설명: `list_response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    list_response = client.get("/api/events", headers=admin_header)
    # 설명: 테스트 전제 또는 결과인 `list_response.status_code == 200` 조건이 참인지 검증한다.
    assert list_response.status_code == 200
    # 설명: `list_body`에 `list_response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    list_body = list_response.get_json()
    # 설명: 테스트 전제 또는 결과인 `list_body['count'] == 1` 조건이 참인지 검증한다.
    assert list_body["count"] == 1
    # 설명: 테스트 전제 또는 결과인 `list_body['events'][0]['event_id'] == 'evt_20260526_0001'` 조건이 참인지 검증한다.
    assert list_body["events"][0]["event_id"] == "evt_20260526_0001"

    # 설명: `detail_response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    detail_response = client.get("/api/events/evt_20260526_0001", headers=admin_header)
    # 설명: 테스트 전제 또는 결과인 `detail_response.status_code == 200` 조건이 참인지 검증한다.
    assert detail_response.status_code == 200
    # 설명: `detail_body`에 `detail_response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    detail_body = detail_response.get_json()
    # 설명: 테스트 전제 또는 결과인 `detail_body['event']['camera_id'] == 'camera-1'` 조건이 참인지 검증한다.
    assert detail_body["event"]["camera_id"] == "camera-1"

    # 설명: `replay_response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    replay_response = client.get("/api/replays/evt_20260526_0001", headers=admin_header)
    # 설명: 테스트 전제 또는 결과인 `replay_response.status_code == 200` 조건이 참인지 검증한다.
    assert replay_response.status_code == 200
    # 설명: `replay_body`에 `replay_response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    replay_body = replay_response.get_json()
    assert replay_body["replay"]["video_url"] == "/api/ai-media/events/evt_20260526_0001/video"
    assert replay_body["replay"]["snapshot_url"] == "/api/ai-media/events/evt_20260526_0001/snapshot"
    # 설명: 테스트 전제 또는 결과인 `replay_body['replay']['event']['raw_event_json']['event_id'] == 'evt_20260526_0...` 조건이 참인지 검증한다.
    assert replay_body["replay"]["event"]["raw_event_json"]["event_id"] == "evt_20260526_0001"


# 설명: `test_post_api_events_requires_minimum_fields` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_post_api_events_requires_minimum_fields(client):
    # 설명: `payload`에 `_payload` 호출 결과를 저장해 다음 처리에서 사용한다.
    payload = _payload()
    # 설명: `payload.pop`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    payload.pop("timestamp")

    # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.post("/api/events", json=payload)

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 400` 조건이 참인지 검증한다.
    assert response.status_code == 400
    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()
    # 설명: 테스트 전제 또는 결과인 `body['ok'] is False` 조건이 참인지 검증한다.
    assert body["ok"] is False
    # 설명: 테스트 전제 또는 결과인 `'timestamp' in body['error']` 조건이 참인지 검증한다.
    assert "timestamp" in body["error"]


# 설명: `test_post_api_events_updates_existing_event_by_event_id` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_post_api_events_updates_existing_event_by_event_id(client, app):
    # 설명: `first`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    first = client.post("/api/events", json=_payload())
    # 설명: `second`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    second = client.post(
        "/api/events",
        json=_payload(
            video_url="http://127.0.0.1:5001/events/evt_20260526_0001_v2.mp4",
            message="Updated media URL",
        ),
    )

    # 설명: 테스트 전제 또는 결과인 `first.status_code == 201` 조건이 참인지 검증한다.
    assert first.status_code == 201
    # 설명: 테스트 전제 또는 결과인 `second.status_code == 200` 조건이 참인지 검증한다.
    assert second.status_code == 200
    # 설명: 테스트 전제 또는 결과인 `second.get_json()['status'] == 'updated'` 조건이 참인지 검증한다.
    assert second.get_json()["status"] == "updated"
    # 설명: 테스트 전제 또는 결과인 `second.get_json()['event']['message'] == 'Updated media URL'` 조건이 참인지 검증한다.
    assert second.get_json()["event"]["message"] == "Updated media URL"

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: 테스트 전제 또는 결과인 `AiEvent.query.count() == 1` 조건이 참인지 검증한다.
        assert AiEvent.query.count() == 1
        # 설명: `event`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        event = db.session.get(AiEvent, "evt_20260526_0001")
        assert event.video_url == "/api/ai-media/events/evt_20260526_0001/video"
        assert event.raw_event_json["video_url"].endswith("_v2.mp4")


# 설명: `test_post_api_events_requires_internal_token_when_configured` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_post_api_events_requires_internal_token_when_configured(client, app):
    # 설명: `app.config['INTERNAL_API_TOKEN']`의 기준값 또는 기본값을 'test-internal-token'로 설정한다.
    app.config["INTERNAL_API_TOKEN"] = "test-internal-token"
    # 설명: `app.config['REQUIRE_INTERNAL_API_TOKEN_IN_TESTING']`의 기준값 또는 기본값을 True로 설정한다.
    app.config["REQUIRE_INTERNAL_API_TOKEN_IN_TESTING"] = True

    # 설명: `rejected`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    rejected = client.post(
        "/api/events",
        json=_payload(event_id="evt_requires_token"),
    )
    # 설명: 테스트 전제 또는 결과인 `rejected.status_code == 401` 조건이 참인지 검증한다.
    assert rejected.status_code == 401

    # 설명: `accepted`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    accepted = client.post(
        "/api/events",
        json=_payload(event_id="evt_requires_token"),
        headers={"X-Internal-API-Token": "test-internal-token"},
    )
    # 설명: 테스트 전제 또는 결과인 `accepted.status_code == 201` 조건이 참인지 검증한다.
    assert accepted.status_code == 201
    # 설명: 테스트 전제 또는 결과인 `accepted.get_json()['incident']['incident_code'] == 'evt_requires_token'` 조건이 참인지 검증한다.
    assert accepted.get_json()["incident"]["incident_code"] == "evt_requires_token"



# 설명: `test_post_api_events_rolls_back_ai_event_when_incident_creation_fails` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_post_api_events_rolls_back_ai_event_when_incident_creation_fails(
    client,
    app,
    monkeypatch,
):
    # 설명: `fail_create_from_its_event` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def fail_create_from_its_event(payload, *, commit=True, emit_socket=True):
        # 설명: 현재 처리를 중단하고 IncidentEventValidationError('forced incident failure')를 호출자에게 전달한다.
        raise IncidentEventValidationError("forced incident failure")

    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr(
        IncidentEventService,
        "create_from_its_event",
        staticmethod(fail_create_from_its_event),
    )

    # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.post(
        "/api/events",
        json=_payload(event_id="evt_atomic_failure"),
    )

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 400` 조건이 참인지 검증한다.
    assert response.status_code == 400
    # 설명: 테스트 전제 또는 결과인 `'forced incident failure' in response.get_json()['error']` 조건이 참인지 검증한다.
    assert "forced incident failure" in response.get_json()["error"]

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: 테스트 전제 또는 결과인 `db.session.get(AiEvent, 'evt_atomic_failure') is None` 조건이 참인지 검증한다.
        assert db.session.get(AiEvent, "evt_atomic_failure") is None
        # 설명: 테스트 전제 또는 결과인 `Incident.query.filter_by(incident_code='evt_atomic_failure').count() == 0` 조건이 참인지 검증한다.
        assert Incident.query.filter_by(incident_code="evt_atomic_failure").count() == 0


def test_get_api_events_requires_browser_auth_and_role(client, admin_header, viewer_header):
    created = client.post("/api/events", json=_payload(event_id="evt_authz"))
    assert created.status_code == 201

    assert client.get("/api/events").status_code == 401
    assert client.get("/api/events", headers=viewer_header).status_code == 403
    assert client.get("/api/events", headers=admin_header).status_code == 200
    assert client.get("/api/replays/evt_authz", headers=admin_header).status_code == 200
