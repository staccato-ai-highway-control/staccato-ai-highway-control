"""incident event pipeline 동작과 회귀 계약을 검증하는 테스트 모듈.

격리된 픽스처로 성공 경로, 입력 오류, 권한 및 데이터베이스 부작용을 확인한다."""

# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: datetime에서 datetime 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime

# 설명: pytest 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import pytest

# 설명: app에서 create_app 이름을 가져와 아래 로직에서 재사용한다.
from app import create_app
# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.models에서 DetectionLog, Incident, IncidentSnapshot, RealtimeEvent 이름을 가져와 아래 로직에서 재사용한다.
from app.models import DetectionLog, Incident, IncidentSnapshot, RealtimeEvent
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


# 설명: `_payload` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _payload(**overrides):
    # 설명: `payload`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    payload = {
        "event_id": "its-test-000001",
        "event_type": "STOPPED_VEHICLE",
        "severity": "HIGH",
        "cctv_id": "CCTV-001",
        "occurred_at": "2026-05-23T08:10:00Z",
        "roi_type": "SHOULDER",
        "track_id": 17,
        "vehicle_class": "car",
        "confidence": 0.91,
        "bbox": {
            "x1": 120,
            "y1": 240,
            "x2": 280,
            "y2": 360,
        },
        "snapshot_path": "/storage/generated/incidents/test.jpg",
        "clip_path": "/storage/generated/incidents/test.mp4",
        "message": "갓길 정차 의심 차량 감지",
    }
    # 설명: `payload.update`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    payload.update(overrides)
    # 설명: 호출자에게 payload 값을 함수 결과로 반환한다.
    return payload


# 설명: `test_create_its_event_saves_incident_detection_snapshot_and_realtime_event` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_create_its_event_saves_incident_detection_snapshot_and_realtime_event(client, app):
    # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.post("/internal/its/events", json=_payload())

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 201` 조건이 참인지 검증한다.
    assert response.status_code == 201
    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()
    # 설명: 테스트 전제 또는 결과인 `body['success'] is True` 조건이 참인지 검증한다.
    assert body["success"] is True
    # 설명: 테스트 전제 또는 결과인 `body['status'] == 'created'` 조건이 참인지 검증한다.
    assert body["status"] == "created"
    # 설명: 테스트 전제 또는 결과인 `body['incident_id']` 조건이 참인지 검증한다.
    assert body["incident_id"]
    # 설명: 테스트 전제 또는 결과인 `body['detection_log_id']` 조건이 참인지 검증한다.
    assert body["detection_log_id"]
    # 설명: 테스트 전제 또는 결과인 `body['snapshot_id']` 조건이 참인지 검증한다.
    assert body["snapshot_id"]
    # 설명: 테스트 전제 또는 결과인 `body['realtime_event_id']` 조건이 참인지 검증한다.
    assert body["realtime_event_id"]
    # 설명: 테스트 전제 또는 결과인 `body['socket_emitted'] is True` 조건이 참인지 검증한다.
    assert body["socket_emitted"] is True

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `incident`에 `Incident.query.filter_by(incident_code='its-test-000001').one` 호출 결과를 저장해 다음 처리에서 사용한다.
        incident = Incident.query.filter_by(incident_code="its-test-000001").one()
        # 설명: 테스트 전제 또는 결과인 `incident.incident_type == 'STOPPED_VEHICLE'` 조건이 참인지 검증한다.
        assert incident.incident_type == "STOPPED_VEHICLE"
        # 설명: 테스트 전제 또는 결과인 `incident.incident_status == 'DETECTED'` 조건이 참인지 검증한다.
        assert incident.incident_status == "DETECTED"
        # 설명: 테스트 전제 또는 결과인 `incident.risk_level == 'HIGH'` 조건이 참인지 검증한다.
        assert incident.risk_level == "HIGH"
        # 설명: 테스트 전제 또는 결과인 `float(incident.confidence) == 0.91` 조건이 참인지 검증한다.
        assert float(incident.confidence) == 0.91
        # 설명: 테스트 전제 또는 결과인 `incident.cctv_id is None` 조건이 참인지 검증한다.
        assert incident.cctv_id is None

        # 설명: `detection_log`에 `DetectionLog.query.filter_by(incident_id=incident.id).one` 호출 결과를 저장해 다음 처리에서 사용한다.
        detection_log = DetectionLog.query.filter_by(incident_id=incident.id).one()
        # 설명: 테스트 전제 또는 결과인 `detection_log.detected_class == 'car'` 조건이 참인지 검증한다.
        assert detection_log.detected_class == "car"
        # 설명: 테스트 전제 또는 결과인 `detection_log.roi_type == 'SHOULDER'` 조건이 참인지 검증한다.
        assert detection_log.roi_type == "SHOULDER"
        # 설명: 테스트 전제 또는 결과인 `detection_log.bbox_json['x1'] == 120.0` 조건이 참인지 검증한다.
        assert detection_log.bbox_json["x1"] == 120.0
        # 설명: 테스트 전제 또는 결과인 `detection_log.raw_result_json['cctv_id'] == 'CCTV-001'` 조건이 참인지 검증한다.
        assert detection_log.raw_result_json["cctv_id"] == "CCTV-001"

        # 설명: `snapshot`에 `IncidentSnapshot.query.filter_by(incident_id=incident.id).one` 호출 결과를 저장해 다음 처리에서 사용한다.
        snapshot = IncidentSnapshot.query.filter_by(incident_id=incident.id).one()
        # 설명: 테스트 전제 또는 결과인 `snapshot.file_path == '/storage/generated/incidents/test.jpg'` 조건이 참인지 검증한다.
        assert snapshot.file_path == "/storage/generated/incidents/test.jpg"
        # 설명: 테스트 전제 또는 결과인 `snapshot.detection_log_id == detection_log.id` 조건이 참인지 검증한다.
        assert snapshot.detection_log_id == detection_log.id

        # 설명: `realtime_event`에 `RealtimeEvent.query.filter_by(incident_id=incident.id).one` 호출 결과를 저장해 다음 처리에서 사용한다.
        realtime_event = RealtimeEvent.query.filter_by(incident_id=incident.id).one()
        # 설명: 테스트 전제 또는 결과인 `realtime_event.event_name == 'incident.created'` 조건이 참인지 검증한다.
        assert realtime_event.event_name == "incident.created"
        # 설명: 테스트 전제 또는 결과인 `realtime_event.send_status == 'SENT'` 조건이 참인지 검증한다.
        assert realtime_event.send_status == "SENT"
        # 설명: 테스트 전제 또는 결과인 `realtime_event.payload['incident_id'] == incident.id` 조건이 참인지 검증한다.
        assert realtime_event.payload["incident_id"] == incident.id


# 설명: `test_create_its_event_rejects_missing_required_field` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_create_its_event_rejects_missing_required_field(client):
    # 설명: `payload`에 `_payload` 호출 결과를 저장해 다음 처리에서 사용한다.
    payload = _payload()
    # 설명: `payload.pop`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    payload.pop("event_type")

    # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.post("/internal/its/events", json=payload)

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 400` 조건이 참인지 검증한다.
    assert response.status_code == 400
    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()
    # 설명: 테스트 전제 또는 결과인 `body['success'] is False` 조건이 참인지 검증한다.
    assert body["success"] is False
    # 설명: 테스트 전제 또는 결과인 `'event_type' in body['error']` 조건이 참인지 검증한다.
    assert "event_type" in body["error"]


# 설명: `test_create_its_event_rejects_invalid_bbox` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_create_its_event_rejects_invalid_bbox(client):
    # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.post(
        "/internal/its/events",
        json=_payload(bbox={"x1": 10, "y1": 10, "x2": 5, "y2": 20}),
    )

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 400` 조건이 참인지 검증한다.
    assert response.status_code == 400
    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()
    # 설명: 테스트 전제 또는 결과인 `body['success'] is False` 조건이 참인지 검증한다.
    assert body["success"] is False
    # 설명: 테스트 전제 또는 결과인 `'bbox' in body['error']` 조건이 참인지 검증한다.
    assert "bbox" in body["error"]


# 설명: `test_create_its_event_is_idempotent_by_event_id` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_create_its_event_is_idempotent_by_event_id(client, app):
    # 설명: `first`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    first = client.post("/internal/its/events", json=_payload(event_id="its-test-duplicate"))
    # 설명: `second`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    second = client.post("/internal/its/events", json=_payload(event_id="its-test-duplicate"))

    # 설명: 테스트 전제 또는 결과인 `first.status_code == 201` 조건이 참인지 검증한다.
    assert first.status_code == 201
    # 설명: 테스트 전제 또는 결과인 `second.status_code == 200` 조건이 참인지 검증한다.
    assert second.status_code == 200

    # 설명: `second_body`에 `second.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    second_body = second.get_json()
    # 설명: 테스트 전제 또는 결과인 `second_body['success'] is True` 조건이 참인지 검증한다.
    assert second_body["success"] is True
    # 설명: 테스트 전제 또는 결과인 `second_body['status'] == 'duplicate'` 조건이 참인지 검증한다.
    assert second_body["status"] == "duplicate"
    # 설명: 테스트 전제 또는 결과인 `second_body['socket_emitted'] is False` 조건이 참인지 검증한다.
    assert second_body["socket_emitted"] is False

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: 테스트 전제 또는 결과인 `Incident.query.filter_by(incident_code='its-test-duplicate').count() == 1` 조건이 참인지 검증한다.
        assert Incident.query.filter_by(incident_code="its-test-duplicate").count() == 1


# 설명: `test_socket_emit_failure_does_not_break_api` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_socket_emit_failure_does_not_break_api(client, app, monkeypatch):
    # 설명: `raise_emit` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def raise_emit(*args, **kwargs):
        # 설명: 현재 처리를 중단하고 RuntimeError('forced socket failure')를 호출자에게 전달한다.
        raise RuntimeError("forced socket failure")

    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr(
        "app.modules.socketio.emitters.socketio.emit",
        raise_emit,
    )

    # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.post(
        "/internal/its/events",
        json=_payload(event_id="its-test-emit-failure"),
    )

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 201` 조건이 참인지 검증한다.
    assert response.status_code == 201
    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()
    # 설명: 테스트 전제 또는 결과인 `body['success'] is True` 조건이 참인지 검증한다.
    assert body["success"] is True
    # 설명: 테스트 전제 또는 결과인 `body['socket_emitted'] is False` 조건이 참인지 검증한다.
    assert body["socket_emitted"] is False

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `incident`에 `Incident.query.filter_by(incident_code='its-test-emit-failure').one` 호출 결과를 저장해 다음 처리에서 사용한다.
        incident = Incident.query.filter_by(incident_code="its-test-emit-failure").one()
        # 설명: 테스트 전제 또는 결과인 `DetectionLog.query.filter_by(incident_id=incident.id).count() == 1` 조건이 참인지 검증한다.
        assert DetectionLog.query.filter_by(incident_id=incident.id).count() == 1

        # 설명: `realtime_event`에 `RealtimeEvent.query.filter_by(incident_id=incident.id).one` 호출 결과를 저장해 다음 처리에서 사용한다.
        realtime_event = RealtimeEvent.query.filter_by(incident_id=incident.id).one()
        # 설명: 테스트 전제 또는 결과인 `realtime_event.send_status == 'FAILED'` 조건이 참인지 검증한다.
        assert realtime_event.send_status == "FAILED"
        # 설명: 테스트 전제 또는 결과인 `realtime_event.error_message == 'Socket.IO emit failed.'` 조건이 참인지 검증한다.
        assert realtime_event.error_message == "Socket.IO emit failed."


# 설명: `test_create_its_event_requires_internal_token_when_configured` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_create_its_event_requires_internal_token_when_configured(client, app):
    # 설명: `app.config['INTERNAL_API_TOKEN']`의 기준값 또는 기본값을 'test-internal-token'로 설정한다.
    app.config["INTERNAL_API_TOKEN"] = "test-internal-token"
    # 설명: `app.config['REQUIRE_INTERNAL_API_TOKEN_IN_TESTING']`의 기준값 또는 기본값을 True로 설정한다.
    app.config["REQUIRE_INTERNAL_API_TOKEN_IN_TESTING"] = True

    # 설명: `rejected`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    rejected = client.post(
        "/internal/its/events",
        json=_payload(event_id="its-requires-token"),
    )
    # 설명: 테스트 전제 또는 결과인 `rejected.status_code == 401` 조건이 참인지 검증한다.
    assert rejected.status_code == 401

    # 설명: `accepted`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    accepted = client.post(
        "/internal/its/events",
        json=_payload(event_id="its-requires-token"),
        headers={"X-Internal-API-Token": "test-internal-token"},
    )
    # 설명: 테스트 전제 또는 결과인 `accepted.status_code == 201` 조건이 참인지 검증한다.
    assert accepted.status_code == 201
    # 설명: 테스트 전제 또는 결과인 `accepted.get_json()['incident_code'] == 'its-requires-token'` 조건이 참인지 검증한다.
    assert accepted.get_json()["incident_code"] == "its-requires-token"
