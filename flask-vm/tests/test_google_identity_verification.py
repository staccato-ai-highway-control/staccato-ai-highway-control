"""google identity verification 동작과 회귀 계약을 검증하는 테스트 모듈.

격리된 픽스처로 성공 경로, 입력 오류, 권한 및 데이터베이스 부작용을 확인한다."""

# 설명: db_cleanup에서 cleanup_database 이름을 가져와 아래 로직에서 재사용한다.
from db_cleanup import cleanup_database
# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: datetime에서 datetime 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime
# 설명: urllib.parse에서 parse_qs, urlparse 이름을 가져와 아래 로직에서 재사용한다.
from urllib.parse import parse_qs, urlparse
# 설명: uuid에서 uuid4 이름을 가져와 아래 로직에서 재사용한다.
from uuid import uuid4

# 설명: pytest 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import pytest

# 설명: app에서 create_app 이름을 가져와 아래 로직에서 재사용한다.
from app import create_app
# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.models.auth_models에서 IdentityOAuthState, SecurityLog, User 이름을 가져와 아래 로직에서 재사용한다.
from app.models.auth_models import IdentityOAuthState, SecurityLog, User
# 설명: app.modules.auth.service에서 AuthError, AuthService 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.auth.service import AuthError, AuthService
# 설명: app.utils.security에서 hash_password 이름을 가져와 아래 로직에서 재사용한다.
from app.utils.security import hash_password




# 설명: `_get_test_database_url` 함수는 단일 값이나 리소스를 조회하는 함수다.
def _get_test_database_url():
    # 설명: `test_database_url`에 `os.environ.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    test_database_url = os.environ.get("TEST_DATABASE_URL")

    # 설명: `not test_database_url` 조건 결과에 따라 실행 경로를 분기한다.
    if not test_database_url:
        # 설명: `pytest.fail`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        pytest.fail("TEST_DATABASE_URL is required for pytest.")

    # 설명: `'staccato_test' not in test_database_url` 조건 결과에 따라 실행 경로를 분기한다.
    if "staccato_test" not in test_database_url:
        # 설명: `pytest.fail`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        pytest.fail("TEST_DATABASE_URL must point to staccato_test.")

    # 설명: `'staccato_test_runner' not in test_database_url` 조건 결과에 따라 실행 경로를 분기한다.
    if "staccato_test_runner" not in test_database_url:
        # 설명: `pytest.fail`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        pytest.fail("TEST_DATABASE_URL must use staccato_test_runner.")

    # 설명: 호출자에게 test_database_url 값을 함수 결과로 반환한다.
    return test_database_url

# 설명: `app_context` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@pytest.fixture()
def app_context(monkeypatch):
    # 설명: `monkeypatch.setenv`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setenv("GOOGLE_IDENTITY_ENABLED", "true")
    # 설명: `monkeypatch.setenv`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-google-client-id")
    # 설명: `monkeypatch.setenv`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-google-client-secret")
    # 설명: `monkeypatch.setenv`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setenv(
        "GOOGLE_REDIRECT_URI",
        "http://localhost:5000/auth/identity/google/callback",
    )
    # 설명: `monkeypatch.setenv`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setenv("FRONTEND_BASE_URL", "http://localhost:3000")

    # 설명: `test_database_url`에 `_get_test_database_url` 호출 결과를 저장해 다음 처리에서 사용한다.
    test_database_url = _get_test_database_url()
    # 설명: `monkeypatch.setenv`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setenv("DATABASE_URL", test_database_url)

    # 설명: `app`에 `create_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": test_database_url,
        }
    )
    # 설명: `app.config['TESTING']`의 기준값 또는 기본값을 True로 설정한다.
    app.config["TESTING"] = True

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `db.session.remove`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        db.session.remove()
        # 설명: `cleanup_database`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        cleanup_database(db)
        # 설명: `db.create_all`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        db.create_all()

        # 설명: `(yield app)` 표현식을 평가해 필요한 동작을 수행한다.
        yield app

        # 설명: `db.session.remove`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        db.session.remove()
        # 설명: `cleanup_database`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        cleanup_database(db)


# 설명: `_make_test_user` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _make_test_user(email: str, is_email_verified: bool = False) -> User:
    # 설명: `user`에 `User` 호출 결과를 저장해 다음 처리에서 사용한다.
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

    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(user)
    # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
    db.session.commit()

    # 설명: 호출자에게 user 값을 함수 결과로 반환한다.
    return user


# 설명: `_cleanup_test_user` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _cleanup_test_user(email: str):
    # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
    db.session.rollback()

    # 설명: `user`에 `User.query.filter_by(email=email).first` 호출 결과를 저장해 다음 처리에서 사용한다.
    user = User.query.filter_by(email=email).first()

    # 설명: `user` 조건 결과에 따라 실행 경로를 분기한다.
    if user:
        # 설명: `SecurityLog.query.filter_by(actor_user_id=user.id).delete`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        SecurityLog.query.filter_by(actor_user_id=user.id).delete(
            synchronize_session=False
        )

    # 설명: `IdentityOAuthState.query.filter_by(target_email=email).delete`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    IdentityOAuthState.query.filter_by(target_email=email).delete(
        synchronize_session=False
    )

    # 설명: `user` 조건 결과에 따라 실행 경로를 분기한다.
    if user:
        # 설명: `User.query.filter_by(id=user.id).delete`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        User.query.filter_by(id=user.id).delete(synchronize_session=False)

    # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
    db.session.commit()


# 설명: `_extract_state_from_authorization_url` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _extract_state_from_authorization_url(authorization_url: str) -> str:
    # 설명: `query`에 `parse_qs` 호출 결과를 저장해 다음 처리에서 사용한다.
    query = parse_qs(urlparse(authorization_url).query)
    # 설명: 호출자에게 query['state'][0] 값을 함수 결과로 반환한다.
    return query["state"][0]


# 설명: `test_start_google_identity_verification_creates_oauth_state` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_start_google_identity_verification_creates_oauth_state(app_context):
    # 설명: `email`에 f'google-start-{uuid4().hex[:8]}@example.com' 표현식의 계산 결과를 저장한다.
    email = f"google-start-{uuid4().hex[:8]}@example.com"
    # 설명: `_make_test_user`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    _make_test_user(email=email)

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `result`에 `AuthService.start_google_identity_verification` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = AuthService.start_google_identity_verification(
            {"email": email},
            ip_address="127.0.0.1",
            user_agent="pytest",
        )

        # 설명: 테스트 전제 또는 결과인 `result['provider'] == 'GOOGLE'` 조건이 참인지 검증한다.
        assert result["provider"] == "GOOGLE"
        # 설명: 테스트 전제 또는 결과인 `result['email'] == email` 조건이 참인지 검증한다.
        assert result["email"] == email
        # 설명: 테스트 전제 또는 결과인 `result['authorization_url'].startswith('https://accounts.google.com/o/oauth2/v2...` 조건이 참인지 검증한다.
        assert result["authorization_url"].startswith(
            "https://accounts.google.com/o/oauth2/v2/auth?"
        )

        # 설명: `query`에 `parse_qs` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = parse_qs(urlparse(result["authorization_url"]).query)
        # 설명: 테스트 전제 또는 결과인 `query['prompt'] == ['select_account']` 조건이 참인지 검증한다.
        assert query["prompt"] == ["select_account"]

        # 설명: 테스트 전제 또는 결과인 `'expires_at' in result` 조건이 참인지 검증한다.
        assert "expires_at" in result

        # 설명: `oauth_state`에 `IdentityOAuthState.query.filter_by(provider='GOOGLE', target_email=...` 호출 결과를 저장해 다음 처리에서 사용한다.
        oauth_state = IdentityOAuthState.query.filter_by(
            provider="GOOGLE",
            target_email=email,
            status="PENDING",
        ).first()

        # 설명: 테스트 전제 또는 결과인 `oauth_state is not None` 조건이 참인지 검증한다.
        assert oauth_state is not None
        # 설명: 테스트 전제 또는 결과인 `oauth_state.state_hash` 조건이 참인지 검증한다.
        assert oauth_state.state_hash
        # 설명: 테스트 전제 또는 결과인 `oauth_state.expires_at is not None` 조건이 참인지 검증한다.
        assert oauth_state.expires_at is not None

    finally:
        # 설명: `_cleanup_test_user`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _cleanup_test_user(email)


# 설명: `test_complete_google_identity_verification_marks_user_as_verified` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_complete_google_identity_verification_marks_user_as_verified(
    app_context,
    monkeypatch,
):
    # 설명: `email`에 f'google-complete-{uuid4().hex[:8]}@example.com' 표현식의 계산 결과를 저장한다.
    email = f"google-complete-{uuid4().hex[:8]}@example.com"
    # 설명: `user`에 `_make_test_user` 호출 결과를 저장해 다음 처리에서 사용한다.
    user = _make_test_user(email=email)

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `start_result`에 `AuthService.start_google_identity_verification` 호출 결과를 저장해 다음 처리에서 사용한다.
        start_result = AuthService.start_google_identity_verification(
            {"email": email},
            ip_address="127.0.0.1",
            user_agent="pytest",
        )
        # 설명: `raw_state`에 `_extract_state_from_authorization_url` 호출 결과를 저장해 다음 처리에서 사용한다.
        raw_state = _extract_state_from_authorization_url(
            start_result["authorization_url"]
        )

        # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        monkeypatch.setattr(
            AuthService,
            "_exchange_google_code_for_token",
            staticmethod(lambda code: {"access_token": "fake-access-token"}),
        )
        # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
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

        # 설명: `result`에 `AuthService.complete_google_identity_verification` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = AuthService.complete_google_identity_verification(
            {"code": "fake-google-code", "state": raw_state},
            ip_address="127.0.0.1",
            user_agent="pytest",
        )

        # 설명: `db.session.refresh`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        db.session.refresh(user)

        # 설명: `oauth_state`에 `IdentityOAuthState.query.filter_by(provider='GOOGLE', target_email=...` 호출 결과를 저장해 다음 처리에서 사용한다.
        oauth_state = IdentityOAuthState.query.filter_by(
            provider="GOOGLE",
            target_email=email,
        ).first()

        # 설명: 테스트 전제 또는 결과인 `user.is_email_verified is True` 조건이 참인지 검증한다.
        assert user.is_email_verified is True
        # 설명: 테스트 전제 또는 결과인 `user.identity_provider == 'GOOGLE'` 조건이 참인지 검증한다.
        assert user.identity_provider == "GOOGLE"
        # 설명: 테스트 전제 또는 결과인 `user.identity_provider_user_id == 'google-sub-123'` 조건이 참인지 검증한다.
        assert user.identity_provider_user_id == "google-sub-123"
        # 설명: 테스트 전제 또는 결과인 `user.identity_verified_at is not None` 조건이 참인지 검증한다.
        assert user.identity_verified_at is not None

        # 설명: 테스트 전제 또는 결과인 `oauth_state.status == 'USED'` 조건이 참인지 검증한다.
        assert oauth_state.status == "USED"
        # 설명: 테스트 전제 또는 결과인 `oauth_state.used_at is not None` 조건이 참인지 검증한다.
        assert oauth_state.used_at is not None

        # 설명: 테스트 전제 또는 결과인 `result['user']['email'] == email` 조건이 참인지 검증한다.
        assert result["user"]["email"] == email
        # 설명: 테스트 전제 또는 결과인 `result['redirect_url'].startswith('http://localhost:3000/pending-approval?')` 조건이 참인지 검증한다.
        assert result["redirect_url"].startswith(
            "http://localhost:3000/pending-approval?"
        )

    finally:
        # 설명: `_cleanup_test_user`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _cleanup_test_user(email)


# 설명: `test_start_google_identity_verification_rejects_already_verified_user` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_start_google_identity_verification_rejects_already_verified_user(
    app_context,
):
    # 설명: `email`에 f'google-already-verified-{uuid4().hex[:8]}@example.com' 표현식의 계산 결과를 저장한다.
    email = f"google-already-verified-{uuid4().hex[:8]}@example.com"
    # 설명: `user`에 `_make_test_user` 호출 결과를 저장해 다음 처리에서 사용한다.
    user = _make_test_user(email=email, is_email_verified=True)

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `user.identity_provider`의 기준값 또는 기본값을 'GOOGLE'로 설정한다.
        user.identity_provider = "GOOGLE"
        # 설명: `user.identity_provider_user_id`의 기준값 또는 기본값을 'google-sub-already-verified'로 설정한다.
        user.identity_provider_user_id = "google-sub-already-verified"
        # 설명: `user.identity_verified_at`에 `datetime.utcnow` 호출 결과를 저장해 다음 처리에서 사용한다.
        user.identity_verified_at = datetime.utcnow()
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: `pytest.raises(AuthError)` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
        with pytest.raises(AuthError) as error:
            # 설명: `AuthService.start_google_identity_verification`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            AuthService.start_google_identity_verification(
                {"email": email},
                ip_address="127.0.0.1",
                user_agent="pytest",
            )

        # 설명: 테스트 전제 또는 결과인 `error.value.status_code == 409` 조건이 참인지 검증한다.
        assert error.value.status_code == 409
        # 설명: 테스트 전제 또는 결과인 `error.value.message == 'Identity is already verified.'` 조건이 참인지 검증한다.
        assert error.value.message == "Identity is already verified."

    finally:
        # 설명: `_cleanup_test_user`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _cleanup_test_user(email)


# 설명: `test_signup_google_identity_route_starts_without_auth_header` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_signup_google_identity_route_starts_without_auth_header(app_context):
    # 설명: `email`에 f'signup-google-route-{uuid4().hex[:8]}@example.com' 표현식의 계산 결과를 저장한다.
    email = f"signup-google-route-{uuid4().hex[:8]}@example.com"
    # 설명: `_make_test_user`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    _make_test_user(email=email)

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `client`에 `app_context.test_client` 호출 결과를 저장해 다음 처리에서 사용한다.
        client = app_context.test_client()

        # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
        response = client.post(
            "/auth/signup/identity/google/start",
            json={"email": email},
        )

        # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
        assert response.status_code == 200

        # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
        body = response.get_json()
        # 설명: 테스트 전제 또는 결과인 `body['message'] == 'Google signup identity verification started.'` 조건이 참인지 검증한다.
        assert body["message"] == "Google signup identity verification started."
        # 설명: 테스트 전제 또는 결과인 `body['data']['provider'] == 'GOOGLE'` 조건이 참인지 검증한다.
        assert body["data"]["provider"] == "GOOGLE"
        # 설명: 테스트 전제 또는 결과인 `body['data']['email'] == email` 조건이 참인지 검증한다.
        assert body["data"]["email"] == email
        # 설명: 테스트 전제 또는 결과인 `body['data']['authorization_url'].startswith('https://accounts.google.com/o/oau...` 조건이 참인지 검증한다.
        assert body["data"]["authorization_url"].startswith(
            "https://accounts.google.com/o/oauth2/v2/auth?"
        )
        # 설명: 테스트 전제 또는 결과인 `'expires_at' in body['data']` 조건이 참인지 검증한다.
        assert "expires_at" in body["data"]

        # 설명: `oauth_state`에 `IdentityOAuthState.query.filter_by(provider='GOOGLE', target_email=...` 호출 결과를 저장해 다음 처리에서 사용한다.
        oauth_state = IdentityOAuthState.query.filter_by(
            provider="GOOGLE",
            target_email=email,
            status="PENDING",
        ).first()

        # 설명: 테스트 전제 또는 결과인 `oauth_state is not None` 조건이 참인지 검증한다.
        assert oauth_state is not None
        # 설명: 테스트 전제 또는 결과인 `oauth_state.state_hash` 조건이 참인지 검증한다.
        assert oauth_state.state_hash
        # 설명: 테스트 전제 또는 결과인 `oauth_state.expires_at is not None` 조건이 참인지 검증한다.
        assert oauth_state.expires_at is not None

    finally:
        # 설명: `_cleanup_test_user`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _cleanup_test_user(email)


# 설명: `test_signup_google_identity_route_rejects_already_verified_user` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_signup_google_identity_route_rejects_already_verified_user(app_context):
    # 설명: `email`에 f'signup-google-route-verified-{uuid4().hex[:8]}@example.com' 표현식의 계산 결과를 저장한다.
    email = f"signup-google-route-verified-{uuid4().hex[:8]}@example.com"
    # 설명: `user`에 `_make_test_user` 호출 결과를 저장해 다음 처리에서 사용한다.
    user = _make_test_user(email=email, is_email_verified=True)

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `user.identity_provider`의 기준값 또는 기본값을 'GOOGLE'로 설정한다.
        user.identity_provider = "GOOGLE"
        # 설명: `user.identity_provider_user_id`의 기준값 또는 기본값을 'google-sub-already-verified-route'로 설정한다.
        user.identity_provider_user_id = "google-sub-already-verified-route"
        # 설명: `user.identity_verified_at`에 `datetime.utcnow` 호출 결과를 저장해 다음 처리에서 사용한다.
        user.identity_verified_at = datetime.utcnow()
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: `client`에 `app_context.test_client` 호출 결과를 저장해 다음 처리에서 사용한다.
        client = app_context.test_client()

        # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
        response = client.post(
            "/auth/signup/identity/google/start",
            json={"email": email},
        )

        # 설명: 테스트 전제 또는 결과인 `response.status_code == 409` 조건이 참인지 검증한다.
        assert response.status_code == 409
        # 설명: 테스트 전제 또는 결과인 `response.get_json()['message'] == 'Identity is already verified.'` 조건이 참인지 검증한다.
        assert response.get_json()["message"] == "Identity is already verified."

    finally:
        # 설명: `_cleanup_test_user`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        _cleanup_test_user(email)
