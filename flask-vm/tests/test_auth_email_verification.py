import os
from datetime import datetime, timedelta
from unittest.mock import patch
from uuid import uuid4

import pytest

from app import create_app
from app.extensions import db
from app.models import EmailVerification, User


def _get_test_database_url():
    test_database_url = os.environ.get("TEST_DATABASE_URL")

    if not test_database_url:
        pytest.fail("TEST_DATABASE_URL is required for pytest.")

    if "staccato_test" not in test_database_url:
        pytest.fail("TEST_DATABASE_URL must point to staccato_test.")

    if "staccato_test_runner" not in test_database_url:
        pytest.fail("TEST_DATABASE_URL must use staccato_test_runner.")

    return test_database_url


@pytest.fixture()
def app_context():
    test_database_url = _get_test_database_url()

    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": test_database_url,
        }
    )

    with app.app_context():
        db.session.remove()
        db.drop_all()
        db.create_all()

        yield app

        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app_context):
    return app_context.test_client()


def unique_email():
    return f"email-test-{uuid4().hex[:8]}@example.com"


def unique_verification_code():
    code_int = 123456
    return code_int, str(code_int)


def signup_user(client, email):
    response = client.post(
        "/auth/signup",
        json={
            "login_id": f"user_{uuid4().hex[:8]}",
            "password": "Password123!",
            "name": "이메일인증테스트",
            "email": email,
            "phone": "01012345678",
        },
    )

    assert response.status_code in (200, 201), response.get_json()

    body = response.get_json()
    data = body.get("data", body)

    assert "email_verification" in data, body

    return data


def test_health_endpoint_returns_ok(client):
    response = client.get("/health")

    assert response.status_code == 200


def test_signup_creates_pending_user_and_verification_link(client):
    email = unique_email()
    code_int, _ = unique_verification_code()

    with patch("app.modules.auth.service.secrets.randbelow", return_value=code_int):
        data = signup_user(client, email)

    verification = data["email_verification"]

    assert verification["email"] == email
    assert verification["id"]
    assert verification["expires_at"]
    assert "email_delivery" in verification

    user = User.query.filter_by(email=email).first()
    assert user is not None
    assert user.is_email_verified is False

    email_verification = EmailVerification.query.filter_by(user_id=user.id).first()
    assert email_verification is not None


def test_verify_email_token_marks_user_as_verified(client):
    email = unique_email()
    code_int, code = unique_verification_code()

    with patch("app.modules.auth.service.secrets.randbelow", return_value=code_int):
        signup_user(client, email)

    response = client.post(
        "/auth/verify-email",
        json={"email": email, "token": code},
    )

    assert response.status_code == 200, response.get_json()

    body = response.get_json()
    assert body["message"] == "Email verified."

    user = body["data"]["user"]
    assert user["email"] == email
    assert user["is_email_verified"] is True

    db_user = User.query.filter_by(email=email).first()
    assert db_user is not None
    assert db_user.is_email_verified is True
