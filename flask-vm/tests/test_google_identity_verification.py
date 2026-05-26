from db_cleanup import cleanup_database
import os
from datetime import datetime
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

import pytest

from app import create_app
from app.extensions import db
from app.models.auth_models import IdentityOAuthState, SecurityLog, User
from app.modules.auth.service import AuthError, AuthService
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
def app_context(monkeypatch):
    monkeypatch.setenv("GOOGLE_IDENTITY_ENABLED", "true")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-google-client-id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-google-client-secret")
    monkeypatch.setenv(
        "GOOGLE_REDIRECT_URI",
        "http://localhost:5000/auth/identity/google/callback",
    )
    monkeypatch.setenv("FRONTEND_BASE_URL", "http://localhost:3000")

    test_database_url = _get_test_database_url()
    monkeypatch.setenv("DATABASE_URL", test_database_url)

    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": test_database_url,
        }
    )
    app.config["TESTING"] = True

    with app.app_context():
        db.session.remove()
        cleanup_database(db)
        db.create_all()

        yield app

        db.session.remove()
        cleanup_database(db)


def _make_test_user(email: str, is_email_verified: bool = False) -> User:
    user = User(
        login_id=f"g{uuid4().hex[:12]}",
        email=email,
        password_hash=hash_password("Password123!"),
        name="Google Test User",
        phone=None,
        role="VIEWER",
        account_status="PENDING",
        is_email_verified=is_email_verified,
        created_at=datetime.utcnow(),
    )

    db.session.add(user)
    db.session.commit()

    return user


def _cleanup_test_user(email: str):
    db.session.rollback()

    user = User.query.filter_by(email=email).first()

    if user:
        SecurityLog.query.filter_by(actor_user_id=user.id).delete(
            synchronize_session=False
        )

    IdentityOAuthState.query.filter_by(target_email=email).delete(
        synchronize_session=False
    )

    if user:
        User.query.filter_by(id=user.id).delete(synchronize_session=False)

    db.session.commit()


def _extract_state_from_authorization_url(authorization_url: str) -> str:
    query = parse_qs(urlparse(authorization_url).query)
    return query["state"][0]


def test_start_google_identity_verification_creates_oauth_state(app_context):
    email = f"google-start-{uuid4().hex[:8]}@example.com"
    _make_test_user(email=email)

    try:
        result = AuthService.start_google_identity_verification(
            {"email": email},
            ip_address="127.0.0.1",
            user_agent="pytest",
        )

        assert result["provider"] == "GOOGLE"
        assert result["email"] == email
        assert result["authorization_url"].startswith(
            "https://accounts.google.com/o/oauth2/v2/auth?"
        )
        assert "expires_at" in result

        oauth_state = IdentityOAuthState.query.filter_by(
            provider="GOOGLE",
            target_email=email,
            status="PENDING",
        ).first()

        assert oauth_state is not None
        assert oauth_state.state_hash
        assert oauth_state.expires_at is not None

    finally:
        _cleanup_test_user(email)


def test_complete_google_identity_verification_marks_user_as_verified(
    app_context,
    monkeypatch,
):
    email = f"google-complete-{uuid4().hex[:8]}@example.com"
    user = _make_test_user(email=email)

    try:
        start_result = AuthService.start_google_identity_verification(
            {"email": email},
            ip_address="127.0.0.1",
            user_agent="pytest",
        )
        raw_state = _extract_state_from_authorization_url(
            start_result["authorization_url"]
        )

        monkeypatch.setattr(
            AuthService,
            "_exchange_google_code_for_token",
            staticmethod(lambda code: {"access_token": "fake-access-token"}),
        )
        monkeypatch.setattr(
            AuthService,
            "_fetch_google_userinfo",
            staticmethod(
                lambda access_token: {
                    "sub": "google-sub-123",
                    "email": email,
                    "email_verified": True,
                }
            ),
        )

        result = AuthService.complete_google_identity_verification(
            {"code": "fake-google-code", "state": raw_state},
            ip_address="127.0.0.1",
            user_agent="pytest",
        )

        db.session.refresh(user)

        oauth_state = IdentityOAuthState.query.filter_by(
            provider="GOOGLE",
            target_email=email,
        ).first()

        assert user.is_email_verified is True
        assert user.identity_provider == "GOOGLE"
        assert user.identity_provider_user_id == "google-sub-123"
        assert user.identity_verified_at is not None

        assert oauth_state.status == "USED"
        assert oauth_state.used_at is not None

        assert result["user"]["email"] == email
        assert result["redirect_url"].startswith(
            "http://localhost:3000/pending-approval?"
        )

    finally:
        _cleanup_test_user(email)


def test_start_google_identity_verification_rejects_already_verified_user(
    app_context,
):
    email = f"google-already-verified-{uuid4().hex[:8]}@example.com"
    user = _make_test_user(email=email, is_email_verified=True)

    try:
        user.identity_provider = "GOOGLE"
        user.identity_provider_user_id = "google-sub-already-verified"
        user.identity_verified_at = datetime.utcnow()
        db.session.commit()

        with pytest.raises(AuthError) as error:
            AuthService.start_google_identity_verification(
                {"email": email},
                ip_address="127.0.0.1",
                user_agent="pytest",
            )

        assert error.value.status_code == 409
        assert error.value.message == "Identity is already verified."

    finally:
        _cleanup_test_user(email)


def test_signup_google_identity_route_starts_without_auth_header(app_context):
    email = f"signup-google-route-{uuid4().hex[:8]}@example.com"
    _make_test_user(email=email)

    try:
        client = app_context.test_client()

        response = client.post(
            "/auth/signup/identity/google/start",
            json={"email": email},
        )

        assert response.status_code == 200

        body = response.get_json()
        assert body["message"] == "Google signup identity verification started."
        assert body["data"]["provider"] == "GOOGLE"
        assert body["data"]["email"] == email
        assert body["data"]["authorization_url"].startswith(
            "https://accounts.google.com/o/oauth2/v2/auth?"
        )
        assert "expires_at" in body["data"]

        oauth_state = IdentityOAuthState.query.filter_by(
            provider="GOOGLE",
            target_email=email,
            status="PENDING",
        ).first()

        assert oauth_state is not None
        assert oauth_state.state_hash
        assert oauth_state.expires_at is not None

    finally:
        _cleanup_test_user(email)


def test_signup_google_identity_route_rejects_already_verified_user(app_context):
    email = f"signup-google-route-verified-{uuid4().hex[:8]}@example.com"
    user = _make_test_user(email=email, is_email_verified=True)

    try:
        user.identity_provider = "GOOGLE"
        user.identity_provider_user_id = "google-sub-already-verified-route"
        user.identity_verified_at = datetime.utcnow()
        db.session.commit()

        client = app_context.test_client()

        response = client.post(
            "/auth/signup/identity/google/start",
            json={"email": email},
        )

        assert response.status_code == 409
        assert response.get_json()["message"] == "Identity is already verified."

    finally:
        _cleanup_test_user(email)
