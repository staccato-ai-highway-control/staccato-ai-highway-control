import os
from datetime import datetime

import pytest

from app import create_app
from app.extensions import db
from app.models import Cctv
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
