from datetime import datetime
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

import pytest

from app import create_app
from app.extensions import db
from app.models.auth_models import IdentityOAuthState, SecurityLog, User
from app.modules.auth.service import AuthError, AuthService
from app.utils.security import hash_password


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

    app = create_app()
    app.config["TESTING"] = True

    with app.app_context():
        yield app


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
    _make_test_user(email=email, is_email_verified=True)

    try:
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
