import os
import sys
import uuid
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("MAIL_ENABLED", "false")
os.environ.setdefault("EMAIL_VERIFICATION_REQUIRED", "true")

from app import create_app
from app.extensions import db
from app.models.auth_models import EmailVerification, SecurityLog, SignupRequest, User


def unique_email() -> str:
    return f"pytest-auth-{uuid.uuid4().hex[:10]}@example.com"


def extract_token(verification_link: str) -> str:
    parsed = urlparse(verification_link)
    token = parse_qs(parsed.query).get("token", [""])[0]
    assert token, "verification_link must contain token query parameter"
    return token


def unique_verification_code() -> tuple[int, str]:
    code_int = int(uuid.uuid4().hex[:8], 16) % 1000000
    return code_int, f"{code_int:06d}"


def cleanup_auth_test_user(email: str):
    app = create_app()

    with app.app_context():
        db.session.rollback()

        user = User.query.filter_by(email=email).first()

        if user:
            EmailVerification.query.filter_by(user_id=user.id).delete(synchronize_session=False)
            SignupRequest.query.filter_by(user_id=user.id).delete(synchronize_session=False)
            SecurityLog.query.filter_by(actor_user_id=user.id).delete(synchronize_session=False)
            User.query.filter_by(id=user.id).delete(synchronize_session=False)

        db.session.commit()


def signup_user(client, email: str) -> dict:
    login_id = "pytest_" + uuid.uuid4().hex[:10]
    payload = {
        "login_id": login_id,
        "email": email,
        "password": "Test12345!",
        "name": "Pytest Auth User",
        "phone": "010-9999-0000",
        "requested_role": "VIEWER",
        "request_memo": "pytest email verification flow",
    }

    response = client.post("/auth/signup", json=payload)

    assert response.status_code == 201, response.get_json()
    body = response.get_json()

    assert body["message"] == "Signup request created."
    assert body["data"]["user"]["email"] == email
    assert body["data"]["user"]["account_status"] == "PENDING"
    assert body["data"]["user"]["is_email_verified"] is False
    assert body["data"]["email_verification"]["email"] == email
    assert body["data"]["email_verification"]["id"]

    return body["data"]


def test_health_endpoint_returns_ok():
    app = create_app()

    with app.test_client() as client:
        response = client.get("/health")

    assert response.status_code == 200

    body = response.get_json()
    assert body["environment"] == "development"
    assert body["service"] == "flask-server"
    assert body["status"] == "ok"


def test_signup_creates_pending_user_and_verification_link():
    app = create_app()
    email = unique_email()
    code_int, _ = unique_verification_code()

    try:
        with app.test_client() as client:
            with patch("app.modules.auth.service.secrets.randbelow", return_value=code_int):
                data = signup_user(client, email)

        verification = data["email_verification"]

        assert verification["email"] == email
        assert verification["id"]
        assert verification["expires_at"]
        assert "email_delivery" in verification
    finally:
        cleanup_auth_test_user(email)


def test_verify_email_token_marks_user_as_verified():
    app = create_app()
    email = unique_email()
    code_int, code = unique_verification_code()

    try:
        with app.test_client() as client:
            with patch("app.modules.auth.service.secrets.randbelow", return_value=code_int):
                signup_user(client, email)

            response = client.post("/auth/verify-email", json={"email": email, "token": code})

        assert response.status_code == 200, response.get_json()

        body = response.get_json()
        assert body["message"] == "Email verified."

        user = body["data"]["user"]
        assert user["email"] == email
        assert user["is_email_verified"] is True
    finally:
        cleanup_auth_test_user(email)
