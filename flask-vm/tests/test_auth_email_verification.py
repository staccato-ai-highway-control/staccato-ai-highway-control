"""auth email verification 동작과 회귀 계약을 검증하는 테스트 모듈.

격리된 픽스처로 성공 경로, 입력 오류, 권한 및 데이터베이스 부작용을 확인한다."""

# 설명: db_cleanup에서 cleanup_database 이름을 가져와 아래 로직에서 재사용한다.
from db_cleanup import cleanup_database
# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: datetime에서 datetime, timedelta 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime, timedelta
# 설명: unittest.mock에서 patch 이름을 가져와 아래 로직에서 재사용한다.
from unittest.mock import patch
# 설명: uuid에서 uuid4 이름을 가져와 아래 로직에서 재사용한다.
from uuid import uuid4

# 설명: pytest 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import pytest

# 설명: app에서 create_app 이름을 가져와 아래 로직에서 재사용한다.
from app import create_app
# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.models에서 EmailVerification, User 이름을 가져와 아래 로직에서 재사용한다.
from app.models import EmailVerification, User
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
def app_context():
    # 설명: `test_database_url`에 `_get_test_database_url` 호출 결과를 저장해 다음 처리에서 사용한다.
    test_database_url = _get_test_database_url()

    # 설명: `app`에 `create_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": test_database_url,
        }
    )

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


# 설명: `client` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@pytest.fixture()
def client(app_context):
    # 설명: 호출자에게 app_context.test_client() 값을 함수 결과로 반환한다.
    return app_context.test_client()


# 설명: `unique_email` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def unique_email():
    # 설명: 호출자에게 f'email-test-{uuid4().hex[:8]}@example.com' 값을 함수 결과로 반환한다.
    return f"email-test-{uuid4().hex[:8]}@example.com"


# 설명: `unique_verification_code` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def unique_verification_code():
    # 설명: `code_int`의 기준값 또는 기본값을 123456로 설정한다.
    code_int = 123456
    # 설명: 호출자에게 (code_int, str(code_int)) 값을 함수 결과로 반환한다.
    return code_int, str(code_int)


# 설명: `signup_user` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def signup_user(client, email):
    # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
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

    # 설명: 테스트 전제 또는 결과인 `response.status_code in (200, 201)` 조건이 참인지 검증한다.
    assert response.status_code in (200, 201), response.get_json()

    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()
    # 설명: `data`에 `body.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    data = body.get("data", body)

    # 설명: 테스트 전제 또는 결과인 `'email_verification' in data` 조건이 참인지 검증한다.
    assert "email_verification" in data, body

    # 설명: 호출자에게 data 값을 함수 결과로 반환한다.
    return data


# 설명: `test_health_endpoint_returns_ok` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_health_endpoint_returns_ok(client):
    # 설명: `response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.get("/health")

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
    assert response.status_code == 200


# 설명: `test_signup_creates_pending_user_and_verification_link` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_signup_creates_pending_user_and_verification_link(client):
    # 설명: `email`에 `unique_email` 호출 결과를 저장해 다음 처리에서 사용한다.
    email = unique_email()
    # 설명: `(code_int, _)`에 `unique_verification_code` 호출 결과를 저장해 다음 처리에서 사용한다.
    code_int, _ = unique_verification_code()

    # 설명: `patch('app.modules.auth.service.secrets.randbelow', ...` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with patch("app.modules.auth.service.secrets.randbelow", return_value=code_int):
        # 설명: `data`에 `signup_user` 호출 결과를 저장해 다음 처리에서 사용한다.
        data = signup_user(client, email)

    # 설명: `verification`에 data['email_verification'] 표현식의 계산 결과를 저장한다.
    verification = data["email_verification"]

    # 설명: 테스트 전제 또는 결과인 `verification['email'] == email` 조건이 참인지 검증한다.
    assert verification["email"] == email
    # 설명: 테스트 전제 또는 결과인 `verification['id']` 조건이 참인지 검증한다.
    assert verification["id"]
    # 설명: 테스트 전제 또는 결과인 `verification['expires_at']` 조건이 참인지 검증한다.
    assert verification["expires_at"]
    # 설명: 테스트 전제 또는 결과인 `'email_delivery' in verification` 조건이 참인지 검증한다.
    assert "email_delivery" in verification

    # 설명: `user`에 `User.query.filter_by(email=email).first` 호출 결과를 저장해 다음 처리에서 사용한다.
    user = User.query.filter_by(email=email).first()
    # 설명: 테스트 전제 또는 결과인 `user is not None` 조건이 참인지 검증한다.
    assert user is not None
    # 설명: 테스트 전제 또는 결과인 `user.is_email_verified is False` 조건이 참인지 검증한다.
    assert user.is_email_verified is False

    # 설명: `email_verification`에 `EmailVerification.query.filter_by(user_id=user.id).first` 호출 결과를 저장해 다음 처리에서 사용한다.
    email_verification = EmailVerification.query.filter_by(user_id=user.id).first()
    # 설명: 테스트 전제 또는 결과인 `email_verification is not None` 조건이 참인지 검증한다.
    assert email_verification is not None


# 설명: `test_verify_email_token_marks_user_as_verified` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_verify_email_token_marks_user_as_verified(client):
    # 설명: `email`에 `unique_email` 호출 결과를 저장해 다음 처리에서 사용한다.
    email = unique_email()
    # 설명: `(code_int, code)`에 `unique_verification_code` 호출 결과를 저장해 다음 처리에서 사용한다.
    code_int, code = unique_verification_code()

    # 설명: `patch('app.modules.auth.service.secrets.randbelow', ...` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with patch("app.modules.auth.service.secrets.randbelow", return_value=code_int):
        # 설명: `signup_user`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        signup_user(client, email)

    # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.post(
        "/auth/verify-email",
        json={"email": email, "token": code},
    )

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
    assert response.status_code == 200, response.get_json()

    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()
    # 설명: 테스트 전제 또는 결과인 `body['message'] == 'Email verified.'` 조건이 참인지 검증한다.
    assert body["message"] == "Email verified."

    # 설명: `user`에 body['data']['user'] 표현식의 계산 결과를 저장한다.
    user = body["data"]["user"]
    # 설명: 테스트 전제 또는 결과인 `user['email'] == email` 조건이 참인지 검증한다.
    assert user["email"] == email
    # 설명: 테스트 전제 또는 결과인 `user['is_email_verified'] is True` 조건이 참인지 검증한다.
    assert user["is_email_verified"] is True

    # 설명: `db_user`에 `User.query.filter_by(email=email).first` 호출 결과를 저장해 다음 처리에서 사용한다.
    db_user = User.query.filter_by(email=email).first()
    # 설명: 테스트 전제 또는 결과인 `db_user is not None` 조건이 참인지 검증한다.
    assert db_user is not None
    # 설명: 테스트 전제 또는 결과인 `db_user.is_email_verified is True` 조건이 참인지 검증한다.
    assert db_user.is_email_verified is True


# 설명: `create_login_policy_user` 함수는 새 데이터나 리소스를 생성하는 함수다.
def create_login_policy_user(
    login_id=None,
    password="Password123!",
    is_email_verified=True,
    account_status="ACTIVE",
):
    # 설명: `suffix`에 uuid4().hex[:8] 표현식의 계산 결과를 저장한다.
    suffix = uuid4().hex[:8]

    # 설명: `user`에 `User` 호출 결과를 저장해 다음 처리에서 사용한다.
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

    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(user)
    # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
    db.session.commit()

    # 설명: 호출자에게 user 값을 함수 결과로 반환한다.
    return user


# 설명: `test_login_rejects_unverified_email_user` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_login_rejects_unverified_email_user(client):
    # 설명: `user`에 `create_login_policy_user` 호출 결과를 저장해 다음 처리에서 사용한다.
    user = create_login_policy_user(
        is_email_verified=False,
        account_status="ACTIVE",
    )

    # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.post(
        "/auth/login",
        json={
            "login_id": user.login_id,
            "password": "Password123!",
        },
    )

    # 설명: 테스트 전제 또는 결과인 `response.status_code in (400, 401, 403)` 조건이 참인지 검증한다.
    assert response.status_code in (400, 401, 403), response.get_json()
    # 설명: 테스트 전제 또는 결과인 `response.status_code != 200` 조건이 참인지 검증한다.
    assert response.status_code != 200


# 설명: `test_login_rejects_pending_account` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_login_rejects_pending_account(client):
    # 설명: `user`에 `create_login_policy_user` 호출 결과를 저장해 다음 처리에서 사용한다.
    user = create_login_policy_user(
        is_email_verified=True,
        account_status="PENDING",
    )

    # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.post(
        "/auth/login",
        json={
            "login_id": user.login_id,
            "password": "Password123!",
        },
    )

    # 설명: 테스트 전제 또는 결과인 `response.status_code in (400, 401, 403)` 조건이 참인지 검증한다.
    assert response.status_code in (400, 401, 403), response.get_json()
    # 설명: 테스트 전제 또는 결과인 `response.status_code != 200` 조건이 참인지 검증한다.
    assert response.status_code != 200


# 설명: `test_login_allows_verified_active_user` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_login_allows_verified_active_user(client):
    # 설명: `user`에 `create_login_policy_user` 호출 결과를 저장해 다음 처리에서 사용한다.
    user = create_login_policy_user(
        is_email_verified=True,
        account_status="ACTIVE",
    )

    # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.post(
        "/auth/login",
        json={
            "login_id": user.login_id,
            "password": "Password123!",
        },
    )

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
    assert response.status_code == 200, response.get_json()



# 설명: `test_signup_with_google_identity_method_skips_email_verification` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_signup_with_google_identity_method_skips_email_verification(client):
    # 설명: `(code_int, _)`에 `unique_verification_code` 호출 결과를 저장해 다음 처리에서 사용한다.
    code_int, _ = unique_verification_code()
    # 설명: `email`에 f'google-identity-signup-{code_int}@example.com' 표현식의 계산 결과를 저장한다.
    email = f"google-identity-signup-{code_int}@example.com"

    # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
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

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 201` 조건이 참인지 검증한다.
    assert response.status_code == 201

    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()
    # 설명: `data`에 body['data'] 표현식의 계산 결과를 저장한다.
    data = body["data"]

    # 설명: 테스트 전제 또는 결과인 `data['identity_method'] == 'GOOGLE'` 조건이 참인지 검증한다.
    assert data["identity_method"] == "GOOGLE"
    # 설명: 테스트 전제 또는 결과인 `data['email_verification'] is None` 조건이 참인지 검증한다.
    assert data["email_verification"] is None

    # 설명: `user`에 `User.query.filter_by(email=email).first` 호출 결과를 저장해 다음 처리에서 사용한다.
    user = User.query.filter_by(email=email).first()
    # 설명: 테스트 전제 또는 결과인 `user is not None` 조건이 참인지 검증한다.
    assert user is not None
    # 설명: 테스트 전제 또는 결과인 `user.is_email_verified is False` 조건이 참인지 검증한다.
    assert user.is_email_verified is False

    # 설명: `email_verification`에 `EmailVerification.query.filter_by(user_id=user.id).first` 호출 결과를 저장해 다음 처리에서 사용한다.
    email_verification = EmailVerification.query.filter_by(user_id=user.id).first()
    # 설명: 테스트 전제 또는 결과인 `email_verification is None` 조건이 참인지 검증한다.
    assert email_verification is None


# 설명: `test_signup_rejects_unsupported_identity_method` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_signup_rejects_unsupported_identity_method(client):
    # 설명: `(code_int, _)`에 `unique_verification_code` 호출 결과를 저장해 다음 처리에서 사용한다.
    code_int, _ = unique_verification_code()

    # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
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

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 400` 조건이 참인지 검증한다.
    assert response.status_code == 400
    # 설명: 테스트 전제 또는 결과인 `response.get_json()['code'] == 'UNSUPPORTED_IDENTITY_METHOD'` 조건이 참인지 검증한다.
    assert response.get_json()["code"] == "UNSUPPORTED_IDENTITY_METHOD"
