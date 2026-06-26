from db_cleanup import cleanup_database
import os
from datetime import datetime, timedelta
from unittest.mock import patch
from uuid import uuid4

import pytest

from app import create_app
from app.extensions import db
from app.models import EmailVerification, User
from app.utils.security import hash_password


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
        cleanup_database(db)
        db.create_all()

        yield app

        db.session.remove()
        cleanup_database(db)


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


def create_login_policy_user(
    login_id=None,
    password="Password123!",
    is_email_verified=True,
    account_status="ACTIVE",
):
    suffix = uuid4().hex[:8]

    user = User(
        login_id=login_id or f"login_policy_{suffix}",
        password_hash=hash_password(password),
        name="로그인 정책 테스트 유저",
        email=f"login-policy-{suffix}@example.com",
        phone="01012345678",
        role="USER",
        account_status=account_status,
        is_email_verified=is_email_verified,
        created_at=datetime.utcnow(),
    )

    db.session.add(user)
    db.session.commit()

    return user


def test_login_rejects_unverified_email_user(client):
    user = create_login_policy_user(
        is_email_verified=False,
        account_status="ACTIVE",
    )

    response = client.post(
        "/auth/login",
        json={
            "login_id": user.login_id,
            "password": "Password123!",
        },
    )

    assert response.status_code in (400, 401, 403), response.get_json()
    assert response.status_code != 200


def test_login_rejects_pending_account(client):
    user = create_login_policy_user(
        is_email_verified=True,
        account_status="PENDING",
    )

    response = client.post(
        "/auth/login",
        json={
            "login_id": user.login_id,
            "password": "Password123!",
        },
    )

    assert response.status_code in (400, 401, 403), response.get_json()
    assert response.status_code != 200


def test_login_allows_verified_active_user(client):
    user = create_login_policy_user(
        is_email_verified=True,
        account_status="ACTIVE",
    )

    response = client.post(
        "/auth/login",
        json={
            "login_id": user.login_id,
            "password": "Password123!",
        },
    )

    assert response.status_code == 200, response.get_json()



def test_signup_with_google_identity_method_skips_email_verification(client):
    code_int, _ = unique_verification_code()
    email = f"google-identity-signup-{code_int}@example.com"

    response = client.post(
        "/auth/signup",
        json={
            "login_id": f"google_user_{code_int}",
            "email": email,
            "password": "Password123!",
            "name": "Google Identity Signup",
            "phone": "01012345678",
            "requested_role": "VIEWER",
            "request_memo": "google identity signup test",
            "agreed": True,
            "identity_method": "GOOGLE",
        },
    )

    assert response.status_code == 201

    body = response.get_json()
    data = body["data"]

    assert data["identity_method"] == "GOOGLE"
    assert data["email_verification"] is None

    user = User.query.filter_by(email=email).first()
    assert user is not None
    assert user.is_email_verified is False

    email_verification = EmailVerification.query.filter_by(user_id=user.id).first()
    assert email_verification is None


def test_signup_rejects_unsupported_identity_method(client):
    code_int, _ = unique_verification_code()

    response = client.post(
        "/auth/signup",
        json={
            "login_id": f"bad_identity_{code_int}",
            "email": f"bad-identity-{code_int}@example.com",
            "password": "Password123!",
            "name": "Bad Identity Method",
            "phone": "01012345678",
            "requested_role": "VIEWER",
            "request_memo": "bad identity method test",
            "agreed": True,
            "identity_method": "KAKAO",
        },
    )

    assert response.status_code == 400
    assert response.get_json()["code"] == "UNSUPPORTED_IDENTITY_METHOD"
