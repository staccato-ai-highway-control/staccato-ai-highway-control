"""mypage auth unit 동작과 회귀 계약을 검증하는 테스트 모듈.

격리된 픽스처로 성공 경로, 입력 오류, 권한 및 데이터베이스 부작용을 확인한다."""

# 설명: db_cleanup에서 cleanup_database 이름을 가져와 아래 로직에서 재사용한다.
from db_cleanup import cleanup_database
# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: datetime에서 datetime 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime
# 설명: uuid에서 uuid4 이름을 가져와 아래 로직에서 재사용한다.
from uuid import uuid4

# 설명: pytest 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import pytest

# 설명: app에서 create_app 이름을 가져와 아래 로직에서 재사용한다.
from app import create_app
# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.models.auth_models에서 User 이름을 가져와 아래 로직에서 재사용한다.
from app.models.auth_models import User
# 설명: app.utils.security에서 create_access_token, hash_password 이름을 가져와 아래 로직에서 재사용한다.
from app.utils.security import create_access_token, hash_password


# 설명: `app` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@pytest.fixture
def app():
    # 설명: `test_database_url`에 `os.environ.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    test_database_url = os.environ.get("TEST_DATABASE_URL")
    # 설명: 테스트 전제 또는 결과인 `test_database_url` 조건이 참인지 검증한다.
    assert test_database_url, "TEST_DATABASE_URL is required for MySQL-isolated tests."
    # 설명: 테스트 전제 또는 결과인 `'staccato_test' in test_database_url` 조건이 참인지 검증한다.
    assert "staccato_test" in test_database_url, "Refusing to run tests outside staccato_test database."

    # 설명: `app`에 `create_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": test_database_url,
            "SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
            "JWT_SECRET_KEY": "test-very-long-secret-key-32-chars-at-least",
        }
    )

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: 테스트 전제 또는 결과인 `'staccato_test' in str(db.engine.url)` 조건이 참인지 검증한다.
        assert "staccato_test" in str(db.engine.url), f"Unsafe test DB: {db.engine.url}"
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
@pytest.fixture
def client(app):
    # 설명: 호출자에게 app.test_client() 값을 함수 결과로 반환한다.
    return app.test_client()


# 설명: `create_test_user` 함수는 새 데이터나 리소스를 생성하는 함수다.
def create_test_user(role="SUPER_ADMIN", account_status="ACTIVE"):
    # 설명: `suffix`에 uuid4().hex[:12] 표현식의 계산 결과를 저장한다.
    suffix = uuid4().hex[:12]

    # 설명: `user`에 `User` 호출 결과를 저장해 다음 처리에서 사용한다.
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

    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(user)
    # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
    db.session.commit()

    # 설명: 호출자에게 user 값을 함수 결과로 반환한다.
    return user


# 설명: `auth_headers_for` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def auth_headers_for(user):
    # 설명: `token`에 `create_access_token` 호출 결과를 저장해 다음 처리에서 사용한다.
    token = create_access_token(user)
    # 설명: 호출자에게 {'Authorization': f'Bearer {token}'} 값을 함수 결과로 반환한다.
    return {"Authorization": f"Bearer {token}"}


# 설명: `test_update_my_profile_requires_token` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_update_my_profile_requires_token(client):
    # 설명: `response`에 `client.patch` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.patch(
        "/auth/me/profile",
        json={
            "name": "토큰 없음",
            "phone": "010-0000-0000",
        },
    )

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 401` 조건이 참인지 검증한다.
    assert response.status_code == 401
    # 설명: 테스트 전제 또는 결과인 `response.get_json()['message'] == 'Authorization token is required.'` 조건이 참인지 검증한다.
    assert response.get_json()["message"] == "Authorization token is required."


# 설명: `test_update_my_profile_success` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_update_my_profile_success(client, app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `user`에 `create_test_user` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = create_test_user()
        # 설명: `headers`에 `auth_headers_for` 호출 결과를 저장해 다음 처리에서 사용한다.
        headers = auth_headers_for(user)

    # 설명: `response`에 `client.patch` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.patch(
        "/auth/me/profile",
        headers=headers,
        json={
            "name": "수정된 이름",
            "phone": "010-0000-0000",
        },
    )

    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
    assert response.status_code == 200
    # 설명: 테스트 전제 또는 결과인 `body['message'] == 'Profile updated.'` 조건이 참인지 검증한다.
    assert body["message"] == "Profile updated."
    # 설명: 테스트 전제 또는 결과인 `body['user']['name'] == '수정된 이름'` 조건이 참인지 검증한다.
    assert body["user"]["name"] == "수정된 이름"
    # 설명: 테스트 전제 또는 결과인 `body['user']['phone'] == '010-0000-0000'` 조건이 참인지 검증한다.
    assert body["user"]["phone"] == "010-0000-0000"
    # 설명: 테스트 전제 또는 결과인 `body['user']['role'] == 'SUPER_ADMIN'` 조건이 참인지 검증한다.
    assert body["user"]["role"] == "SUPER_ADMIN"


# 설명: `test_update_my_profile_blocks_restricted_fields` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
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
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `user`에 `create_test_user` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = create_test_user()
        # 설명: `headers`에 `auth_headers_for` 호출 결과를 저장해 다음 처리에서 사용한다.
        headers = auth_headers_for(user)

    # 설명: `response`에 `client.patch` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.patch(
        "/auth/me/profile",
        headers=headers,
        json=payload,
    )

    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 400` 조건이 참인지 검증한다.
    assert response.status_code == 400
    # 설명: 테스트 전제 또는 결과인 `blocked_field in body['message']` 조건이 참인지 검증한다.
    assert blocked_field in body["message"]


# 설명: `test_update_my_profile_rejects_empty_name` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_update_my_profile_rejects_empty_name(client, app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `user`에 `create_test_user` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = create_test_user()
        # 설명: `headers`에 `auth_headers_for` 호출 결과를 저장해 다음 처리에서 사용한다.
        headers = auth_headers_for(user)

    # 설명: `response`에 `client.patch` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.patch(
        "/auth/me/profile",
        headers=headers,
        json={"name": "   "},
    )

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 400` 조건이 참인지 검증한다.
    assert response.status_code == 400
    # 설명: 테스트 전제 또는 결과인 `response.get_json()['message'] == 'Name is required.'` 조건이 참인지 검증한다.
    assert response.get_json()["message"] == "Name is required."


# 설명: `test_update_my_profile_rejects_too_long_name` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_update_my_profile_rejects_too_long_name(client, app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `user`에 `create_test_user` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = create_test_user()
        # 설명: `headers`에 `auth_headers_for` 호출 결과를 저장해 다음 처리에서 사용한다.
        headers = auth_headers_for(user)

    # 설명: `response`에 `client.patch` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.patch(
        "/auth/me/profile",
        headers=headers,
        json={"name": "가" * 51},
    )

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 400` 조건이 참인지 검증한다.
    assert response.status_code == 400
    # 설명: 테스트 전제 또는 결과인 `response.get_json()['message'] == 'Name must be 50 characters or less.'` 조건이 참인지 검증한다.
    assert response.get_json()["message"] == "Name must be 50 characters or less."


# 설명: `test_update_my_profile_rejects_invalid_phone` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_update_my_profile_rejects_invalid_phone(client, app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `user`에 `create_test_user` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = create_test_user()
        # 설명: `headers`에 `auth_headers_for` 호출 결과를 저장해 다음 처리에서 사용한다.
        headers = auth_headers_for(user)

    # 설명: `response`에 `client.patch` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.patch(
        "/auth/me/profile",
        headers=headers,
        json={"phone": "010-abc-test"},
    )

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 400` 조건이 참인지 검증한다.
    assert response.status_code == 400
    # 설명: 테스트 전제 또는 결과인 `response.get_json()['message'] == 'Phone number format is invalid.'` 조건이 참인지 검증한다.
    assert response.get_json()["message"] == "Phone number format is invalid."


# 설명: `test_update_my_profile_allows_empty_phone_as_none` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_update_my_profile_allows_empty_phone_as_none(client, app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `user`에 `create_test_user` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = create_test_user()
        # 설명: `headers`에 `auth_headers_for` 호출 결과를 저장해 다음 처리에서 사용한다.
        headers = auth_headers_for(user)

    # 설명: `response`에 `client.patch` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.patch(
        "/auth/me/profile",
        headers=headers,
        json={"phone": ""},
    )

    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
    assert response.status_code == 200
    # 설명: 테스트 전제 또는 결과인 `body['user']['phone'] is None` 조건이 참인지 검증한다.
    assert body["user"]["phone"] is None


# 설명: `test_update_my_profile_rejects_empty_body` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_update_my_profile_rejects_empty_body(client, app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `user`에 `create_test_user` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = create_test_user()
        # 설명: `headers`에 `auth_headers_for` 호출 결과를 저장해 다음 처리에서 사용한다.
        headers = auth_headers_for(user)

    # 설명: `response`에 `client.patch` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.patch(
        "/auth/me/profile",
        headers=headers,
        json={},
    )

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 400` 조건이 참인지 검증한다.
    assert response.status_code == 400
    # 설명: 테스트 전제 또는 결과인 `response.get_json()['message'] == 'At least one profile field is required.'` 조건이 참인지 검증한다.
    assert response.get_json()["message"] == "At least one profile field is required."


# 설명: `test_update_my_profile_rejects_inactive_account` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_update_my_profile_rejects_inactive_account(client, app):
    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `user`에 `create_test_user` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = create_test_user(account_status="PENDING")
        # 설명: `headers`에 `auth_headers_for` 호출 결과를 저장해 다음 처리에서 사용한다.
        headers = auth_headers_for(user)

    # 설명: `response`에 `client.patch` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = client.patch(
        "/auth/me/profile",
        headers=headers,
        json={"name": "수정 시도"},
    )

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 403` 조건이 참인지 검증한다.
    assert response.status_code == 403
    # 설명: 테스트 전제 또는 결과인 `response.get_json()['message'] == 'Account is not active.'` 조건이 참인지 검증한다.
    assert response.get_json()["message"] == "Account is not active."
