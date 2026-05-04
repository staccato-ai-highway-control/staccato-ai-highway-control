import os
import sys
import uuid
from pathlib import Path
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("MAIL_ENABLED", "false")
os.environ.setdefault("EMAIL_VERIFICATION_REQUIRED", "true")

from app import create_app


def unique_email() -> str:
    return f"pytest-auth-{uuid.uuid4().hex[:10]}@example.com"


def extract_token(verification_link: str) -> str:
    parsed = urlparse(verification_link)
    token = parse_qs(parsed.query).get("token", [""])[0]
    assert token, "verification_link must contain token query parameter"
    return token


def signup_user(client, email: str) -> dict:
    payload = {
        "email": email,
        "password": "Test12345!",
        "name": "Pytest Auth User",
        "phone": "010-9999-0000",
        "requested_role": "VIEWER",
        "request_memo": "pytest email verification flow",
    }

    response = client.post("/auth/signup", json=payload)

    assert response.status_code == 201
    body = response.get_json()

    assert body["message"] == "Signup request created."
    assert body["data"]["user"]["email"] == email
    assert body["data"]["user"]["account_status"] == "PENDING"
    assert body["data"]["user"]["is_email_verified"] is False
    assert body["data"]["email_verification"]["email"] == email
    assert body["data"]["email_verification"]["verification_link"]

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

    with app.test_client() as client:
        data = signup_user(client, email)

    verification = data["email_verification"]
    verification_link = verification["verification_link"]

    assert "token=" in verification_link
    assert verification["email"] == email
    assert "email_delivery" in verification


def test_verify_email_token_marks_user_as_verified():
    app = create_app()
    email = unique_email()

    with app.test_client() as client:
        signup_data = signup_user(client, email)

        verification_link = signup_data["email_verification"]["verification_link"]
        token = extract_token(verification_link)

        response = client.post("/auth/verify-email", json={"token": token})

    assert response.status_code == 200

    body = response.get_json()
    assert body["message"] == "Email verified."

    user = body["data"]["user"]
    assert user["email"] == email
    assert user["is_email_verified"] is True

