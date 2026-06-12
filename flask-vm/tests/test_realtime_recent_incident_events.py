"""realtime recent incident events 동작과 회귀 계약을 검증하는 테스트 모듈.

격리된 픽스처로 성공 경로, 입력 오류, 권한 및 데이터베이스 부작용을 확인한다."""

# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: datetime에서 datetime, timedelta 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime, timedelta

# 설명: pytest 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import pytest

# 설명: app에서 create_app 이름을 가져와 아래 로직에서 재사용한다.
from app import create_app
# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.models에서 RealtimeEvent 이름을 가져와 아래 로직에서 재사용한다.
from app.models import RealtimeEvent
# 설명: app.modules.realtime.routes에서 DEFAULT_INCIDENT_MESSAGE, DEFAULT_RECENT_INCIDENT_LIMIT, MAX_RECENT_INCIDENT_LIMIT, RECENT_INCIDENT_EVENT_NAME 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.realtime.routes import (
    DEFAULT_INCIDENT_MESSAGE,
    DEFAULT_RECENT_INCIDENT_LIMIT,
    MAX_RECENT_INCIDENT_LIMIT,
    RECENT_INCIDENT_EVENT_NAME,
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


# 설명: `_create_realtime_event` 함수는 새 데이터나 리소스를 생성하는 함수다.
def _create_realtime_event(
    *,
    event_name=RECENT_INCIDENT_EVENT_NAME,
    payload_incident_id=1,
    incident_code="ITS-TEST-001",
    created_at=None,
    send_status="SENT",
):
    # 설명: `now`에 created_at or datetime.utcnow() 표현식의 계산 결과를 저장한다.
    now = created_at or datetime.utcnow()

    # 설명: `event`에 `RealtimeEvent` 호출 결과를 저장해 다음 처리에서 사용한다.
    event = RealtimeEvent(
        event_type="INCIDENT",
        event_name=event_name,
        target_user_id=None,
        target_role="CONTROL_CENTER",
        target_room=None,
        target_resource_type="incident",
        target_resource_id=payload_incident_id,
        incident_id=None,
        payload={
            "type": "INCIDENT_CREATED",
            "event_name": event_name,
            "incident_id": payload_incident_id,
            "incident_code": incident_code,
            "event_type": "STOPPED_VEHICLE",
            "severity": "HIGH",
            "incident_status": "DETECTED",
            "cctv_id": None,
            "source_cctv_id": "CCTV-001",
            "detection_log_id": payload_incident_id * 10,
            "occurred_at": "2026-05-23T08:10:00",
            "message": "갓길 정차 의심 차량 감지",
            "vehicle_class": "car",
            "track_id": 17,
            "roi_type": "SHOULDER",
            "confidence": 0.91,
            "bbox": {"x1": 10, "y1": 20, "x2": 30, "y2": 40},
            "snapshot_path": "/storage/generated/incidents/demo.jpg",
            "clip_path": "/storage/generated/incidents/demo.mp4",
        },
        send_status=send_status,
        error_message=None,
        created_at=now,
        sent_at=now if send_status == "SENT" else None,
    )
    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(event)
    # 설명: 호출자에게 event 값을 함수 결과로 반환한다.
    return event


# 설명: `test_recent_incident_events_returns_latest_incident_created_events` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_recent_incident_events_returns_latest_incident_created_events(client, app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `older`에 `_create_realtime_event` 호출 결과를 저장해 다음 처리에서 사용한다.
        older = _create_realtime_event(
            payload_incident_id=1,
            incident_code="ITS-OLD",
            created_at=datetime.utcnow() - timedelta(minutes=10),
        )
        # 설명: `newer`에 `_create_realtime_event` 호출 결과를 저장해 다음 처리에서 사용한다.
        newer = _create_realtime_event(
            payload_incident_id=2,
            incident_code="ITS-NEW",
            created_at=datetime.utcnow(),
        )
        # 설명: `_create_realtime_event`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _create_realtime_event(
            event_name="report_analysis_updated",
            payload_incident_id=3,
            incident_code="SHOULD-NOT-BE-INCLUDED",
            created_at=datetime.utcnow() + timedelta(minutes=10),
        )
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: `older_id`에 older.id 표현식의 계산 결과를 저장한다.
        older_id = older.id
        # 설명: `newer_id`에 newer.id 표현식의 계산 결과를 저장한다.
        newer_id = newer.id

    # 설명: `response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.get("/api/realtime/incidents/recent")

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
    assert response.status_code == 200
    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()

    # 설명: 테스트 전제 또는 결과인 `body['success'] is True` 조건이 참인지 검증한다.
    assert body["success"] is True
    # 설명: 테스트 전제 또는 결과인 `body['count'] == 2` 조건이 참인지 검증한다.
    assert body["count"] == 2

    # 설명: `items`에 body['items'] 표현식의 계산 결과를 저장한다.
    items = body["items"]
    # 설명: 테스트 전제 또는 결과인 `[item['realtime_event_id'] for item in items] == [newer_id, older_id]` 조건이 참인지 검증한다.
    assert [item["realtime_event_id"] for item in items] == [newer_id, older_id]
    # 설명: 테스트 전제 또는 결과인 `items[0]['incident_id'] == 2` 조건이 참인지 검증한다.
    assert items[0]["incident_id"] == 2
    # 설명: 테스트 전제 또는 결과인 `items[0]['incident_code'] == 'ITS-NEW'` 조건이 참인지 검증한다.
    assert items[0]["incident_code"] == "ITS-NEW"
    # 설명: 테스트 전제 또는 결과인 `items[0]['event_type'] == 'STOPPED_VEHICLE'` 조건이 참인지 검증한다.
    assert items[0]["event_type"] == "STOPPED_VEHICLE"
    # 설명: 테스트 전제 또는 결과인 `items[0]['severity'] == 'HIGH'` 조건이 참인지 검증한다.
    assert items[0]["severity"] == "HIGH"
    # 설명: 테스트 전제 또는 결과인 `items[0]['source_cctv_id'] == 'CCTV-001'` 조건이 참인지 검증한다.
    assert items[0]["source_cctv_id"] == "CCTV-001"
    # 설명: 테스트 전제 또는 결과인 `items[0]['message'] == '갓길 정차 의심 차량 감지'` 조건이 참인지 검증한다.
    assert items[0]["message"] == "갓길 정차 의심 차량 감지"
    # 설명: 테스트 전제 또는 결과인 `items[0]['bbox_metadata']['valid'] is True` 조건이 참인지 검증한다.
    assert items[0]["bbox_metadata"]["valid"] is True
    # 설명: 테스트 전제 또는 결과인 `items[0]['bbox_metadata']['coordinates']['x1'] == 10.0` 조건이 참인지 검증한다.
    assert items[0]["bbox_metadata"]["coordinates"]["x1"] == 10.0
    # 설명: 테스트 전제 또는 결과인 `items[0]['snapshot_path'] == '/storage/generated/incidents/demo.jpg'` 조건이 참인지 검증한다.
    assert items[0]["snapshot_path"] == "/storage/generated/incidents/demo.jpg"
    # 설명: 테스트 전제 또는 결과인 `items[0]['clip_path'] == '/storage/generated/incidents/demo.mp4'` 조건이 참인지 검증한다.
    assert items[0]["clip_path"] == "/storage/generated/incidents/demo.mp4"


# 설명: `test_recent_incident_events_respects_limit_max_100` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_recent_incident_events_respects_limit_max_100(client, app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `range(105)`의 각 항목을 `index`로 받아 반복 처리한다.
        for index in range(105):
            # 설명: `_create_realtime_event`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            _create_realtime_event(
                payload_incident_id=index + 1,
                incident_code=f"ITS-{index + 1:03d}",
                created_at=datetime.utcnow() + timedelta(seconds=index),
            )
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

    # 설명: `response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.get("/api/realtime/incidents/recent?limit=1000")

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
    assert response.status_code == 200
    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()

    # 설명: 테스트 전제 또는 결과인 `body['success'] is True` 조건이 참인지 검증한다.
    assert body["success"] is True
    # 설명: 테스트 전제 또는 결과인 `body['count'] == MAX_RECENT_INCIDENT_LIMIT` 조건이 참인지 검증한다.
    assert body["count"] == MAX_RECENT_INCIDENT_LIMIT
    # 설명: 테스트 전제 또는 결과인 `len(body['items']) == MAX_RECENT_INCIDENT_LIMIT` 조건이 참인지 검증한다.
    assert len(body["items"]) == MAX_RECENT_INCIDENT_LIMIT


# 설명: `test_recent_incident_events_uses_default_limit_for_invalid_limit` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_recent_incident_events_uses_default_limit_for_invalid_limit(client, app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `range(35)`의 각 항목을 `index`로 받아 반복 처리한다.
        for index in range(35):
            # 설명: `_create_realtime_event`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            _create_realtime_event(
                payload_incident_id=index + 1,
                incident_code=f"ITS-INVALID-LIMIT-{index + 1:03d}",
                created_at=datetime.utcnow() + timedelta(seconds=index),
            )
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

    # 설명: `response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.get("/api/realtime/incidents/recent?limit=bad")

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
    assert response.status_code == 200
    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()

    # 설명: 테스트 전제 또는 결과인 `body['success'] is True` 조건이 참인지 검증한다.
    assert body["success"] is True
    # 설명: 테스트 전제 또는 결과인 `body['count'] == DEFAULT_RECENT_INCIDENT_LIMIT` 조건이 참인지 검증한다.
    assert body["count"] == DEFAULT_RECENT_INCIDENT_LIMIT
    # 설명: 테스트 전제 또는 결과인 `len(body['items']) == DEFAULT_RECENT_INCIDENT_LIMIT` 조건이 참인지 검증한다.
    assert len(body["items"]) == DEFAULT_RECENT_INCIDENT_LIMIT


# 설명: `test_recent_incident_events_handles_empty_payload_without_incident_join` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_recent_incident_events_handles_empty_payload_without_incident_join(client, app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `event`에 `RealtimeEvent` 호출 결과를 저장해 다음 처리에서 사용한다.
        event = RealtimeEvent(
            event_type="INCIDENT",
            event_name=RECENT_INCIDENT_EVENT_NAME,
            target_user_id=None,
            target_role="CONTROL_CENTER",
            target_room=None,
            target_resource_type="incident",
            target_resource_id=None,
            incident_id=None,
            payload=None,
            send_status="FAILED",
            error_message="Socket.IO emit failed.",
            created_at=datetime.utcnow(),
            sent_at=None,
        )
        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(event)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: `event_id`에 event.id 표현식의 계산 결과를 저장한다.
        event_id = event.id

    # 설명: `response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.get("/api/realtime/incidents/recent")

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
    assert response.status_code == 200
    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()

    # 설명: 테스트 전제 또는 결과인 `body['success'] is True` 조건이 참인지 검증한다.
    assert body["success"] is True
    # 설명: 테스트 전제 또는 결과인 `body['count'] == 1` 조건이 참인지 검증한다.
    assert body["count"] == 1
    # 설명: 테스트 전제 또는 결과인 `body['items'][0]['realtime_event_id'] == event_id` 조건이 참인지 검증한다.
    assert body["items"][0]["realtime_event_id"] == event_id
    # 설명: 테스트 전제 또는 결과인 `body['items'][0]['incident_id'] is None` 조건이 참인지 검증한다.
    assert body["items"][0]["incident_id"] is None
    # 설명: 테스트 전제 또는 결과인 `body['items'][0]['message'] == DEFAULT_INCIDENT_MESSAGE` 조건이 참인지 검증한다.
    assert body["items"][0]["message"] == DEFAULT_INCIDENT_MESSAGE
    # 설명: 테스트 전제 또는 결과인 `body['items'][0]['send_status'] == 'FAILED'` 조건이 참인지 검증한다.
    assert body["items"][0]["send_status"] == "FAILED"
