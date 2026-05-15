import os
from datetime import datetime
from uuid import uuid4

import pytest

from app import create_app
from app.extensions import db
from app.models.auth_models import User
from app.utils.security import create_access_token, hash_password


@pytest.fixture
def app():
    test_database_url = os.environ.get("TEST_DATABASE_URL")
    assert test_database_url, "TEST_DATABASE_URL is required for MySQL-isolated tests."
    assert "staccato_test" in test_database_url, "Refusing to run tests outside staccato_test database."

    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": test_database_url,
            "SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
            "JWT_SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
        }
    )

    with app.app_context():
        assert "staccato_test" in str(db.engine.url), f"Unsafe test DB: {db.engine.url}"
        db.session.remove()
        db.drop_all()
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def create_test_user(role="SUPER_ADMIN", account_status="ACTIVE"):
    suffix = uuid4().hex[:12]

    user = User(
        login_id=f"mypage_{suffix}",
        email=f"mypage_{suffix}@test.local",
        password_hash=hash_password("Password123!"),
        name="마이페이지 테스트 유저",
        phone="010-1111-2222",
        role=role,
        account_status=account_status,
        is_email_verified=True,
        created_at=datetime.utcnow(),
    )

    db.session.add(user)
    db.session.commit()

    return user


def auth_headers_for(user):
    token = create_access_token(user)
    return {"Authorization": f"Bearer {token}"}


def test_update_my_profile_requires_token(client):
    response = client.patch(
        "/auth/me/profile",
        json={
            "name": "토큰 없음",
            "phone": "010-0000-0000",
        },
    )

    assert response.status_code == 401
    assert response.get_json()["message"] == "Authorization token is required."


def test_update_my_profile_success(client, app):
    with app.app_context():
        user = create_test_user()
        headers = auth_headers_for(user)

    response = client.patch(
        "/auth/me/profile",
        headers=headers,
        json={
            "name": "수정된 이름",
            "phone": "010-0000-0000",
        },
    )

    body = response.get_json()

    assert response.status_code == 200
    assert body["message"] == "Profile updated."
    assert body["user"]["name"] == "수정된 이름"
    assert body["user"]["phone"] == "010-0000-0000"
    assert body["user"]["role"] == "SUPER_ADMIN"


@pytest.mark.parametrize(
    "payload, blocked_field",
    [
        ({"role": "SUPER_ADMIN"}, "role"),
        ({"account_status": "ACTIVE"}, "account_status"),
        ({"login_id": "hacker"}, "login_id"),
        ({"email": "changed@test.local"}, "email"),
        ({"is_email_verified": False}, "is_email_verified"),
    ],
)
def test_update_my_profile_blocks_restricted_fields(client, app, payload, blocked_field):
    with app.app_context():
        user = create_test_user()
        headers = auth_headers_for(user)

    response = client.patch(
        "/auth/me/profile",
        headers=headers,
        json=payload,
    )

    body = response.get_json()

    assert response.status_code == 400
    assert blocked_field in body["message"]


def test_update_my_profile_rejects_empty_name(client, app):
    with app.app_context():
        user = create_test_user()
        headers = auth_headers_for(user)

    response = client.patch(
        "/auth/me/profile",
        headers=headers,
        json={"name": "   "},
    )

    assert response.status_code == 400
    assert response.get_json()["message"] == "Name is required."


def test_update_my_profile_rejects_too_long_name(client, app):
    with app.app_context():
        user = create_test_user()
        headers = auth_headers_for(user)

    response = client.patch(
        "/auth/me/profile",
        headers=headers,
        json={"name": "가" * 51},
    )

    assert response.status_code == 400
    assert response.get_json()["message"] == "Name must be 50 characters or less."


def test_update_my_profile_rejects_invalid_phone(client, app):
    with app.app_context():
        user = create_test_user()
        headers = auth_headers_for(user)

    response = client.patch(
        "/auth/me/profile",
        headers=headers,
        json={"phone": "010-abc-test"},
    )

    assert response.status_code == 400
    assert response.get_json()["message"] == "Phone number format is invalid."


def test_update_my_profile_allows_empty_phone_as_none(client, app):
    with app.app_context():
        user = create_test_user()
        headers = auth_headers_for(user)

    response = client.patch(
        "/auth/me/profile",
        headers=headers,
        json={"phone": ""},
    )

    body = response.get_json()

    assert response.status_code == 200
    assert body["user"]["phone"] is None


def test_update_my_profile_rejects_empty_body(client, app):
    with app.app_context():
        user = create_test_user()
        headers = auth_headers_for(user)

    response = client.patch(
        "/auth/me/profile",
        headers=headers,
        json={},
    )

    assert response.status_code == 400
    assert response.get_json()["message"] == "At least one profile field is required."


def test_update_my_profile_rejects_inactive_account(client, app):
    with app.app_context():
        user = create_test_user(account_status="PENDING")
        headers = auth_headers_for(user)

    response = client.patch(
        "/auth/me/profile",
        headers=headers,
        json={"name": "수정 시도"},
    )

    assert response.status_code == 403
    assert response.get_json()["message"] == "Account is not active."
