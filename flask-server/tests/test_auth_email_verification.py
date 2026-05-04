import os
import uuid
from urllib.parse import parse_qs, urlparse

import requests


API_BASE_URL = os.getenv("TEST_API_BASE_URL", "http://localhost:5000").rstrip("/")


def api_url(path: str) -> str:
    return f"{API_BASE_URL}{path}"


def unique_email() -> str:
    return f"pytest-auth-{uuid.uuid4().hex[:10]}@example.com"


def extract_token(verification_link: str) -> str:
    parsed = urlparse(verification_link)
    token = parse_qs(parsed.query).get("token", [""])[0]
    assert token, "verification_link must contain token query parameter"
    return token


def signup_user(email: str) -> dict:
    payload = {
        "email": email,
        "password": "Test12345!",
        "name": "Pytest Auth User",
        "phone": "010-9999-0000",
        "requested_role": "VIEWER",
        "request_memo": "pytest email verification flow",
    }

    response = requests.post(
        api_url("/auth/signup"),
        json=payload,
        timeout=10,
    )

    assert response.status_code == 201
    body = response.json()

    assert body["message"] == "Signup request created."
    assert body["data"]["user"]["email"] == email
    assert body["data"]["user"]["account_status"] == "PENDING"
    assert body["data"]["user"]["is_email_verified"] is False
    assert body["data"]["email_verification"]["email"] == email
    assert body["data"]["email_verification"]["verification_link"]

    return body["data"]


def test_health_endpoint_returns_ok():
    response = requests.get(api_url("/health"), timeout=10)

    assert response.status_code == 200

    body = response.json()
    assert body["environment"] == "development"
    assert body["service"] == "flask-server"
    assert body["status"] == "ok"


def test_signup_creates_pending_user_and_verification_link():
    email = unique_email()

    data = signup_user(email)

    verification = data["email_verification"]
    verification_link = verification["verification_link"]

    assert "token=" in verification_link
    assert verification["email"] == email
    assert "email_delivery" in verification


def test_verify_email_token_marks_user_as_verified():
    email = unique_email()
    signup_data = signup_user(email)

    verification_link = signup_data["email_verification"]["verification_link"]
    token = extract_token(verification_link)

    response = requests.post(
        api_url("/auth/verify-email"),
        json={"token": token},
        timeout=10,
    )

    assert response.status_code == 200

    body = response.json()
    assert body["message"] == "Email verified."

    user = body["data"]["user"]
    assert user["email"] == email
    assert user["is_email_verified"] is True
