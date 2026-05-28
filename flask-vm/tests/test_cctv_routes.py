import os
from datetime import datetime

import pytest

from app import create_app
from app.extensions import db
from app.models import Cctv, CctvRoi, CctvSlot, CctvStatusLog
from db_cleanup import cleanup_database


@pytest.fixture
def app():
    test_database_url = os.environ.get("TEST_DATABASE_URL")
    assert test_database_url, "TEST_DATABASE_URL is required for MySQL-isolated tests."
    assert "staccato_test" in test_database_url, "Refusing to run tests outside staccato_test database."

    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": test_database_url,
        "SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
        "JWT_SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
    })

    with app.app_context():
        db.create_all()
        cleanup_database(db)

    yield app

    with app.app_context():
        cleanup_database(db)


@pytest.fixture
def client(app):
    return app.test_client()


def _create_cctv(*, code: str, name: str, is_active: int, road_name: str = "Road-1"):
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
    db.session.add(item)
    db.session.flush()
    return item


def _create_roi(cctv_id: int, *, roi_type: str = "SHOULDER", is_active: int = 1):
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
    db.session.add(item)
    db.session.flush()
    return item


def _create_status_log(cctv_id: int, *, status: str = "ONLINE"):
    item = CctvStatusLog(
        cctv_id=cctv_id,
        status=status,
        message=f"{status} status",
        checked_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    db.session.add(item)
    db.session.flush()
    return item


def test_get_cctvs_returns_items(client, app):
    with app.app_context():
        _create_cctv(code="CCTV-001", name="Camera 1", is_active=1)
        _create_cctv(code="CCTV-002", name="Camera 2", is_active=0)
        db.session.commit()

    response = client.get("/api/cctvs")

    assert response.status_code == 200
    body = response.get_json()
    assert body["success"] is True
    assert body["count"] == 2
    assert body["items"][0]["cctv_code"] == "CCTV-001"
    assert body["items"][0]["camera_id"] == "CCTV-001"
    assert body["items"][0]["camera_name"] == "Camera 1"
    assert body["items"][0]["stream_url"] == "http://127.0.0.1/streams/CCTV-001.mjpeg"


def test_get_cctvs_filters_by_is_active(client, app):
    with app.app_context():
        _create_cctv(code="CCTV-001", name="Camera 1", is_active=1)
        _create_cctv(code="CCTV-002", name="Camera 2", is_active=0)
        db.session.commit()

    response = client.get("/api/cctvs?is_active=true")

    assert response.status_code == 200
    body = response.get_json()
    assert body["count"] == 1
    assert body["items"][0]["cctv_code"] == "CCTV-001"


def test_get_cctv_detail_and_code_lookup(client, app):
    with app.app_context():
        item = _create_cctv(code="CCTV-009", name="Camera 9", is_active=1, road_name="Road-9")
        db.session.commit()
        cctv_id = item.id

    detail_response = client.get(f"/api/cctvs/{cctv_id}")
    assert detail_response.status_code == 200
    assert detail_response.get_json()["item"]["cctv_name"] == "Camera 9"
    assert detail_response.get_json()["item"]["camera_id"] == "CCTV-009"

    code_response = client.get("/api/cctvs/code/CCTV-009")
    assert code_response.status_code == 200
    assert code_response.get_json()["item"]["road_name"] == "Road-9"

    cameras_response = client.get("/api/cameras")
    assert cameras_response.status_code == 200
    assert cameras_response.get_json()["cameras"][0]["camera_id"] == "CCTV-009"

    camera_response = client.get("/api/cameras/CCTV-009")
    assert camera_response.status_code == 200
    assert camera_response.get_json()["camera"]["stream_url"].endswith("CCTV-009.mjpeg")


def test_cctv_rois_and_stream_status(client, app):
    with app.app_context():
        cctv = _create_cctv(code="CCTV-ROI", name="ROI Camera", is_active=1)
        _create_roi(cctv.id, roi_type="SHOULDER")
        _create_status_log(cctv.id, status="ONLINE")
        db.session.commit()
        cctv_id = cctv.id

    rois_response = client.get(f"/api/cctvs/{cctv_id}/rois")
    assert rois_response.status_code == 200
    rois_body = rois_response.get_json()
    assert rois_body["count"] == 1
    assert rois_body["items"][0]["roi_type"] == "SHOULDER"
    assert rois_body["items"][0]["roi_id"]
    assert rois_body["items"][0]["points"][0]["x"] == 10

    status_response = client.get(f"/api/cctvs/{cctv_id}/stream-status")
    assert status_response.status_code == 200
    status_body = status_response.get_json()
    assert status_body["item"]["status"] == "ONLINE"
    assert status_body["item"]["camera_id"] == "CCTV-ROI"

    statuses_response = client.get("/api/cctvs/stream-status")
    assert statuses_response.status_code == 200
    assert statuses_response.get_json()["items"][0]["status"] == "ONLINE"


def test_cctv_slots_can_be_saved_and_loaded(client, app):
    with app.app_context():
        _create_cctv(code="CCTV-SLOT", name="Slot Camera", is_active=1)
        db.session.commit()

    response = client.put(
        "/api/cctv-slots",
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

    assert response.status_code == 200
    body = response.get_json()
    assert body["success"] is True
    assert body["items"][0]["slot_number"] == 1
    assert body["items"][0]["camera_id"] == "CCTV-SLOT"

    list_response = client.get("/api/cctv-slots")
    assert list_response.status_code == 200
    assert list_response.get_json()["items"][0]["cctv"]["camera_id"] == "CCTV-SLOT"

    with app.app_context():
        assert CctvSlot.query.count() == 1


def test_cctv_create_update_patch_and_delete(client, app):
    create_response = client.post(
        "/api/cctvs",
        json={
            "cctv_code": "CCTV-CRUD",
            "cctv_name": "CRUD Camera",
            "stream_url": "http://127.0.0.1/streams/CCTV-CRUD.mjpeg",
            "road_name": "Road-CRUD",
            "is_active": 1,
        },
    )

    assert create_response.status_code == 201
    cctv_id = create_response.get_json()["item"]["id"]

    patch_response = client.patch(
        f"/api/cctvs/{cctv_id}",
        json={"is_active": 0, "cctv_name": "CRUD Camera Updated"},
    )
    assert patch_response.status_code == 200
    assert patch_response.get_json()["item"]["active"] is False
    assert patch_response.get_json()["item"]["cctv_name"] == "CRUD Camera Updated"

    put_response = client.put(
        f"/api/cctvs/{cctv_id}",
        json={
            "stream_url": "http://127.0.0.1/streams/CCTV-CRUD-updated.mjpeg",
            "location_name": "Updated Location",
        },
    )
    assert put_response.status_code == 200
    assert put_response.get_json()["item"]["stream_url"].endswith("updated.mjpeg")

    delete_response = client.delete(f"/api/cctvs/{cctv_id}")
    assert delete_response.status_code == 200
    assert delete_response.get_json()["deleted_id"] == cctv_id
