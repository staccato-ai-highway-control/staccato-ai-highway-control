"""auth 도메인의 핵심 비즈니스 규칙과 데이터 처리를 구현한다.

권한 검증, 트랜잭션 경계, 외부 연동 및 응답 직렬화를 라우트와 분리해 관리한다."""

# 설명: datetime에서 datetime, timedelta 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime, timedelta
# 설명: hashlib 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import hashlib
# 설명: json 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import json
# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: re 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import re
# 설명: secrets 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import secrets
# 설명: urllib.error 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import urllib.error
# 설명: urllib.parse 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import urllib.parse
# 설명: urllib.request 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import urllib.request

# 설명: sqlalchemy.exc에서 IntegrityError 이름을 가져와 아래 로직에서 재사용한다.
from sqlalchemy.exc import IntegrityError

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.modules.auth.email_service에서 EmailService 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.auth.email_service import EmailService
# 설명: app.models.auth_models에서 EmailVerification, IdentityOAuthState, SecurityLog, SignupRequest, User 이름을 가져와 아래 로직에서 재사용한다.
from app.models.auth_models import EmailVerification, IdentityOAuthState, SecurityLog, SignupRequest, User
# 설명: app.utils.security에서 create_access_token, hash_password, verify_password 이름을 가져와 아래 로직에서 재사용한다.
from app.utils.security import create_access_token, hash_password, verify_password


# 설명: `AuthError` 클래스를 정의하고 Exception의 동작 또는 계약을 확장한다.
class AuthError(Exception):
    # 설명: `__init__` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def __init__(self, message, status_code=400, code=None, extra=None):
        # 설명: `super().__init__`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        super().__init__(message)
        # 설명: `self.message`에 message 표현식의 계산 결과를 저장한다.
        self.message = message
        # 설명: `self.status_code`에 status_code 표현식의 계산 결과를 저장한다.
        self.status_code = status_code
        # 설명: `self.code`에 code 표현식의 계산 결과를 저장한다.
        self.code = code
        # 설명: `self.extra`에 extra or {} 표현식의 계산 결과를 저장한다.
        self.extra = extra or {}

    # 설명: `to_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def to_dict(self):
        # 설명: `body`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        body = {"message": self.message}

        # 설명: `self.code` 조건 결과에 따라 실행 경로를 분기한다.
        if self.code:
            # 설명: `body['code']`에 self.code 표현식의 계산 결과를 저장한다.
            body["code"] = self.code

        # 설명: `body.update`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        body.update(self.extra)

        # 설명: 호출자에게 body 값을 함수 결과로 반환한다.
        return body


# 설명: `AuthService` 클래스를 정의하고 기본 object의 동작 또는 계약을 확장한다.
class AuthService:
    # 설명: `create_security_log` 함수는 새 데이터나 리소스를 생성하는 함수다.
    @staticmethod
    def create_security_log(
        action_type,
        actor_user_id=None,
        target_type=None,
        target_id=None,
        ip_address=None,
        user_agent=None,
        log_message=None,
    ):
        # 설명: `log`에 `SecurityLog` 호출 결과를 저장해 다음 처리에서 사용한다.
        log = SecurityLog(
            actor_user_id=actor_user_id,
            action_type=action_type,
            target_type=target_type,
            target_id=target_id,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message=log_message,
            created_at=datetime.utcnow(),
        )

        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(log)
        # 설명: 호출자에게 log 값을 함수 결과로 반환한다.
        return log

    # 설명: `_hash_email_token` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _hash_email_token(raw_token):
        # 설명: 호출자에게 hashlib.sha256(raw_token.encode('utf-8')).hexdigest() 값을 함수 결과로 반환한다.
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    # 설명: `_hash_oauth_state` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _hash_oauth_state(raw_state):
        # 설명: 호출자에게 hashlib.sha256(raw_state.encode('utf-8')).hexdigest() 값을 함수 결과로 반환한다.
        return hashlib.sha256(raw_state.encode("utf-8")).hexdigest()

    # 설명: `_build_identity_result_redirect` 함수는 후속 처리에 사용할 구조를 조립하는 함수다.
    @staticmethod
    def _build_identity_result_redirect(provider, status, message=None):
        # 설명: `base_url`에 `AuthService._get_frontend_base_url` 호출 결과를 저장해 다음 처리에서 사용한다.
        base_url = AuthService._get_frontend_base_url()
        # 설명: `query`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        query = {
            "identity": provider,
            "status": status,
        }

        # 설명: `message` 조건 결과에 따라 실행 경로를 분기한다.
        if message:
            # 설명: `query['message']`에 message 표현식의 계산 결과를 저장한다.
            query["message"] = message

        # 설명: 호출자에게 f'{base_url}/pending-approval?{urllib.parse.urlencode(query)}' 값을 함수 결과로 반환한다.
        return f"{base_url}/pending-approval?{urllib.parse.urlencode(query)}"

    # 설명: `_get_google_oauth_config` 함수는 단일 값이나 리소스를 조회하는 함수다.
    @staticmethod
    def _get_google_oauth_config():
        # 설명: `enabled`에 os.getenv('GOOGLE_IDENTITY_ENABLED', 'false').lower() == 'true' 표현식의 계산 결과를 저장한다.
        enabled = os.getenv("GOOGLE_IDENTITY_ENABLED", "false").lower() == "true"
        # 설명: `client_id`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        # 설명: `client_secret`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        # 설명: `redirect_uri`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
        redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")

        # 설명: `not enabled` 조건 결과에 따라 실행 경로를 분기한다.
        if not enabled:
            # 설명: 현재 처리를 중단하고 AuthError('Google identity verification is disabled.', 503)를 호출자에게 전달한다.
            raise AuthError("Google identity verification is disabled.", 503)

        # 설명: `not client_id or not client_secret or (not redirect_uri)` 조건 결과에 따라 실행 경로를 분기한다.
        if not client_id or not client_secret or not redirect_uri:
            # 설명: 현재 처리를 중단하고 AuthError('Google OAuth is not configured.', 500)를 호출자에게 전달한다.
            raise AuthError("Google OAuth is not configured.", 500)

        # 설명: 호출자에게 {'client_id': client_id, 'client_secret': client_secret, 'redirect_uri': redire... 값을 함수 결과로 반환한다.
        return {
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
        }

    # 설명: `_exchange_google_code_for_token` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _exchange_google_code_for_token(code):
        # 설명: `config`에 `AuthService._get_google_oauth_config` 호출 결과를 저장해 다음 처리에서 사용한다.
        config = AuthService._get_google_oauth_config()

        # 설명: `payload`에 `urllib.parse.urlencode({'code': code, 'client_id': config['client_i...` 호출 결과를 저장해 다음 처리에서 사용한다.
        payload = urllib.parse.urlencode({
            "code": code,
            "client_id": config["client_id"],
            "client_secret": config["client_secret"],
            "redirect_uri": config["redirect_uri"],
            "grant_type": "authorization_code",
        }).encode("utf-8")

        # 설명: `req`에 `urllib.request.Request` 호출 결과를 저장해 다음 처리에서 사용한다.
        req = urllib.request.Request(
            "https://oauth2.googleapis.com/token",
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `urllib.request.urlopen(req, timeout=10)` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
            with urllib.request.urlopen(req, timeout=10) as res:
                # 설명: 호출자에게 json.loads(res.read().decode('utf-8')) 값을 함수 결과로 반환한다.
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            # 설명: `detail`에 `error.read().decode` 호출 결과를 저장해 다음 처리에서 사용한다.
            detail = error.read().decode("utf-8", errors="replace")
            # 설명: 현재 처리를 중단하고 AuthError(f'Google token exchange failed: {detail}', 502)를 호출자에게 전달한다.
            raise AuthError(f"Google token exchange failed: {detail}", 502)
        except Exception as error:
            # 설명: 현재 처리를 중단하고 AuthError(f'Google token exchange failed: {error}', 502)를 호출자에게 전달한다.
            raise AuthError(f"Google token exchange failed: {error}", 502)

    # 설명: `_fetch_google_userinfo` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _fetch_google_userinfo(access_token):
        # 설명: `req`에 `urllib.request.Request` 호출 결과를 저장해 다음 처리에서 사용한다.
        req = urllib.request.Request(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            method="GET",
        )

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `urllib.request.urlopen(req, timeout=10)` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
            with urllib.request.urlopen(req, timeout=10) as res:
                # 설명: 호출자에게 json.loads(res.read().decode('utf-8')) 값을 함수 결과로 반환한다.
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            # 설명: `detail`에 `error.read().decode` 호출 결과를 저장해 다음 처리에서 사용한다.
            detail = error.read().decode("utf-8", errors="replace")
            # 설명: 현재 처리를 중단하고 AuthError(f'Google userinfo request failed: {detail}', 502)를 호출자에게 전달한다.
            raise AuthError(f"Google userinfo request failed: {detail}", 502)
        except Exception as error:
            # 설명: 현재 처리를 중단하고 AuthError(f'Google userinfo request failed: {error}', 502)를 호출자에게 전달한다.
            raise AuthError(f"Google userinfo request failed: {error}", 502)

    # 설명: `_get_frontend_base_url` 함수는 단일 값이나 리소스를 조회하는 함수다.
    @staticmethod
    def _get_frontend_base_url():
        # 설명: 호출자에게 os.getenv('FRONTEND_BASE_URL', 'http://localhost:3000').rstrip('/') 값을 함수 결과로 반환한다.
        return os.getenv("FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")

    # 설명: `_get_email_verification_cooldown_seconds` 함수는 단일 값이나 리소스를 조회하는 함수다.
    @staticmethod
    def _get_email_verification_cooldown_seconds():
        # 설명: 호출자에게 int(os.getenv('EMAIL_VERIFICATION_COOLDOWN_SECONDS', '60')) 값을 함수 결과로 반환한다.
        return int(os.getenv("EMAIL_VERIFICATION_COOLDOWN_SECONDS", "60"))

    # 설명: `_get_retry_after_seconds` 함수는 단일 값이나 리소스를 조회하는 함수다.
    @staticmethod
    def _get_retry_after_seconds(last_sent_at, now=None):
        # 설명: `not last_sent_at` 조건 결과에 따라 실행 경로를 분기한다.
        if not last_sent_at:
            # 설명: 호출자에게 0 값을 함수 결과로 반환한다.
            return 0

        # 설명: `now`에 now or datetime.utcnow() 표현식의 계산 결과를 저장한다.
        now = now or datetime.utcnow()
        # 설명: `cooldown_seconds`에 `AuthService._get_email_verification_cooldown_seconds` 호출 결과를 저장해 다음 처리에서 사용한다.
        cooldown_seconds = AuthService._get_email_verification_cooldown_seconds()

        # 설명: `elapsed_seconds`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
        elapsed_seconds = int((now - last_sent_at).total_seconds())
        # 설명: 호출자에게 max(cooldown_seconds - elapsed_seconds, 0) 값을 함수 결과로 반환한다.
        return max(cooldown_seconds - elapsed_seconds, 0)


    # 설명: `_create_email_verification` 함수는 새 데이터나 리소스를 생성하는 함수다.
    @staticmethod
    def _create_email_verification(user, now=None):
        # 설명: `now`에 now or datetime.utcnow() 표현식의 계산 결과를 저장한다.
        now = now or datetime.utcnow()

        # 설명: `pending_verifications`에 `EmailVerification.query.filter_by(user_id=user.id, verification_sta...` 호출 결과를 저장해 다음 처리에서 사용한다.
        pending_verifications = EmailVerification.query.filter_by(
            user_id=user.id,
            verification_status="PENDING",
        ).all()

        # 설명: `pending_verifications`의 각 항목을 `verification`로 받아 반복 처리한다.
        for verification in pending_verifications:
            # 설명: `verification.verification_status`의 기준값 또는 기본값을 'CANCELLED'로 설정한다.
            verification.verification_status = "CANCELLED"

        # 설명: `raw_token`에 f'{secrets.randbelow(1000000):06d}' 표현식의 계산 결과를 저장한다.
        raw_token = f"{secrets.randbelow(1000000):06d}"
        # 설명: `token_hash`에 `AuthService._hash_email_token` 호출 결과를 저장해 다음 처리에서 사용한다.
        token_hash = AuthService._hash_email_token(raw_token)

        # 설명: `verification`에 `EmailVerification` 호출 결과를 저장해 다음 처리에서 사용한다.
        verification = EmailVerification(
            user_id=user.id,
            email=user.email,
            verification_token=token_hash,
            verification_status="PENDING",
            expires_at=now + timedelta(minutes=10),
            created_at=now,
        )

        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(verification)

        # 설명: 호출자에게 (raw_token, verification) 값을 함수 결과로 반환한다.
        return raw_token, verification

    # 설명: `signup` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def signup(data, ip_address=None, user_agent=None):
        # 설명: `login_id`에 `(data.get('login_id') or data.get('loginId') or '').strip().lower` 호출 결과를 저장해 다음 처리에서 사용한다.
        login_id = (
            data.get("login_id")
            or data.get("loginId")
            or ""
        ).strip().lower()
        # 설명: `email`에 `(data.get('email') or '').strip().lower` 호출 결과를 저장해 다음 처리에서 사용한다.
        email = (data.get("email") or "").strip().lower()
        # 설명: `password`에 data.get('password') or '' 표현식의 계산 결과를 저장한다.
        password = data.get("password") or ""
        # 설명: `name`에 `(data.get('name') or '').strip` 호출 결과를 저장해 다음 처리에서 사용한다.
        name = (data.get("name") or "").strip()
        # 설명: `phone`에 (data.get('phone') or '').strip() or None 표현식의 계산 결과를 저장한다.
        phone = (data.get("phone") or "").strip() or None
        # 회원가입 요청의 role 값은 권한 상승에 사용하지 않고 서버 기본 역할로 고정한다.
        requested_role = "VIEWER"

        # 설명: `not login_id` 조건 결과에 따라 실행 경로를 분기한다.
        if not login_id:
            # 설명: 현재 처리를 중단하고 AuthError('Login ID is required.', 400)를 호출자에게 전달한다.
            raise AuthError("Login ID is required.", 400)

        # 설명: `not re.fullmatch('[a-z0-9_-]{4,20}', login_id)` 조건 결과에 따라 실행 경로를 분기한다.
        if not re.fullmatch(r"[a-z0-9_-]{4,20}", login_id):
            # 설명: 현재 처리를 중단하고 AuthError('Login ID must be 4-20 characters and contain only lowercase letters,...를 호출자에게 전달한다.
            raise AuthError(
                "Login ID must be 4-20 characters and contain only lowercase letters, numbers, underscores, or hyphens.",
                400,
            )

        # 설명: `'@' in login_id` 조건 결과에 따라 실행 경로를 분기한다.
        if "@" in login_id:
            # 설명: 현재 처리를 중단하고 AuthError('Login ID cannot be an email address.', 400)를 호출자에게 전달한다.
            raise AuthError("Login ID cannot be an email address.", 400)

        # 설명: `not email` 조건 결과에 따라 실행 경로를 분기한다.
        if not email:
            # 설명: 현재 처리를 중단하고 AuthError('Email is required.', 400)를 호출자에게 전달한다.
            raise AuthError("Email is required.", 400)

        # 설명: `not password or len(password) < 8` 조건 결과에 따라 실행 경로를 분기한다.
        if not password or len(password) < 8:
            # 설명: 현재 처리를 중단하고 AuthError('Password must be at least 8 characters.', 400)를 호출자에게 전달한다.
            raise AuthError("Password must be at least 8 characters.", 400)

        # 설명: `not name` 조건 결과에 따라 실행 경로를 분기한다.
        if not name:
            # 설명: 현재 처리를 중단하고 AuthError('Name is required.', 400)를 호출자에게 전달한다.
            raise AuthError("Name is required.", 400)

        # 설명: `existing_login_id`에 `User.query.filter_by(login_id=login_id).first` 호출 결과를 저장해 다음 처리에서 사용한다.
        existing_login_id = User.query.filter_by(login_id=login_id).first()

        # 설명: `existing_login_id` 조건 결과에 따라 실행 경로를 분기한다.
        if existing_login_id:
            # 설명: 현재 처리를 중단하고 AuthError('이미 사용 중인 아이디입니다.', 409, code='LOGIN_ID_ALREADY_IN_USE')를 호출자에게 전달한다.
            raise AuthError(
                "이미 사용 중인 아이디입니다.",
                409,
                code="LOGIN_ID_ALREADY_IN_USE",
            )

        # 설명: `existing_user`에 `User.query.filter_by(email=email).first` 호출 결과를 저장해 다음 처리에서 사용한다.
        existing_user = User.query.filter_by(email=email).first()

        # 설명: `existing_user` 조건 결과에 따라 실행 경로를 분기한다.
        if existing_user:
            # 설명: 현재 처리를 중단하고 AuthError('이미 사용 중인 이메일입니다.', 409, code='EMAIL_ALREADY_IN_USE')를 호출자에게 전달한다.
            raise AuthError(
                "이미 사용 중인 이메일입니다.",
                409,
                code="EMAIL_ALREADY_IN_USE",
            )

        # 설명: `now`에 `datetime.utcnow` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = datetime.utcnow()

        # 설명: `identity_method`에 `(data.get('identity_method') or data.get('identityMethod') or 'EMAI...` 호출 결과를 저장해 다음 처리에서 사용한다.
        identity_method = (
            data.get("identity_method")
            or data.get("identityMethod")
            or "EMAIL"
        ).strip().upper()

        # 설명: `identity_method not in {'EMAIL', 'GOOGLE'}` 조건 결과에 따라 실행 경로를 분기한다.
        if identity_method not in {"EMAIL", "GOOGLE"}:
            # 설명: 현재 처리를 중단하고 AuthError('Unsupported identity verification method.', 400, code='UNSUPPORTED_I...를 호출자에게 전달한다.
            raise AuthError(
                "Unsupported identity verification method.",
                400,
                code="UNSUPPORTED_IDENTITY_METHOD",
            )

        # 설명: `user`에 `User` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = User(
            login_id=login_id,
            email=email,
            password_hash=hash_password(password),
            name=name,
            phone=phone,
            role=requested_role,
            account_status="PENDING",
            is_email_verified=False,
            created_at=now,
        )

        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(user)
        # 설명: `db.session.flush`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        db.session.flush()

        # 설명: `signup_request`에 `SignupRequest` 호출 결과를 저장해 다음 처리에서 사용한다.
        signup_request = SignupRequest(
            user_id=user.id,
            request_status="REQUESTED",
            requested_role=requested_role,
            request_memo=data.get("request_memo"),
            created_at=now,
        )

        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(signup_request)

        # 설명: `email_verification_required`에 identity_method == 'EMAIL' 표현식의 계산 결과를 저장한다.
        email_verification_required = identity_method == "EMAIL"
        # 설명: `raw_token`의 기준값 또는 기본값을 None로 설정한다.
        raw_token = None
        # 설명: `verification`의 기준값 또는 기본값을 None로 설정한다.
        verification = None

        # 설명: `email_verification_required` 조건 결과에 따라 실행 경로를 분기한다.
        if email_verification_required:
            # 설명: `(raw_token, verification)`에 `AuthService._create_email_verification` 호출 결과를 저장해 다음 처리에서 사용한다.
            raw_token, verification = AuthService._create_email_verification(user, now=now)

        # 설명: `AuthService.create_security_log`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        AuthService.create_security_log(
            action_type="SIGNUP_REQUESTED",
            actor_user_id=user.id,
            target_type="USER",
            target_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message="User signup requested.",
        )

        # 설명: `email_verification_required` 조건 결과에 따라 실행 경로를 분기한다.
        if email_verification_required:
            # 설명: `AuthService.create_security_log`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            AuthService.create_security_log(
                action_type="EMAIL_VERIFICATION_CREATED",
                actor_user_id=user.id,
                target_type="EMAIL_VERIFICATION",
                target_id=None,
                ip_address=ip_address,
                user_agent=user_agent,
                log_message="Email verification token created.",
            )

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()
        except IntegrityError:
            # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
            db.session.rollback()
            # 설명: 현재 처리를 중단하고 AuthError('Failed to create signup request.', 409)를 호출자에게 전달한다.
            raise AuthError("Failed to create signup request.", 409)

        # 설명: `email_verification_data`의 기준값 또는 기본값을 None로 설정한다.
        email_verification_data = None

        # 설명: `email_verification_required and raw_token and verification` 조건 결과에 따라 실행 경로를 분기한다.
        if email_verification_required and raw_token and verification:
            # 설명: `email_delivery`에 `EmailService.send_verification_email` 호출 결과를 저장해 다음 처리에서 사용한다.
            email_delivery = EmailService.send_verification_email(
                user.email,
                raw_token,
            )

            # 설명: `email_verification_data`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
            email_verification_data = {
                "id": verification.id,
                "email": verification.email,
                "expires_at": verification.expires_at.isoformat(),
                "retry_after": AuthService._get_email_verification_cooldown_seconds(),
                "email_delivery": {
                    "sent": email_delivery.get("sent", False),
                    "reason": email_delivery.get("reason"),
                },
                "note": (
                    "Email verification code sent via SMTP."
                    if email_delivery.get("sent")
                    else "Email delivery failed. Please check SMTP settings or request resend."
                ),
            }

        # 설명: 호출자에게 {'user': user.to_public_dict(), 'signup_request_id': signup_request.id, 'identi... 값을 함수 결과로 반환한다.
        return {
            "user": user.to_public_dict(),
            "signup_request_id": signup_request.id,
            "identity_method": identity_method,
            "email_verification": email_verification_data,
        }

    # 설명: `verify_email` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def verify_email(data, ip_address=None, user_agent=None):
        # 설명: `data`에 data or {} 표현식의 계산 결과를 저장한다.
        data = data or {}

        # 설명: `raw_code`에 `(data.get('code') or data.get('verification_code') or data.get('tok...` 호출 결과를 저장해 다음 처리에서 사용한다.
        raw_code = (
            data.get("code")
            or data.get("verification_code")
            or data.get("token")
            or ""
        ).strip()

        # 설명: `email`에 `(data.get('email') or '').strip().lower` 호출 결과를 저장해 다음 처리에서 사용한다.
        email = (data.get("email") or "").strip().lower()

        # 설명: `not raw_code` 조건 결과에 따라 실행 경로를 분기한다.
        if not raw_code:
            # 설명: 현재 처리를 중단하고 AuthError('Verification code is required.', 400)를 호출자에게 전달한다.
            raise AuthError("Verification code is required.", 400)

        # 설명: `not raw_code.isdigit() or len(raw_code) != 6` 조건 결과에 따라 실행 경로를 분기한다.
        if not raw_code.isdigit() or len(raw_code) != 6:
            # 설명: 현재 처리를 중단하고 AuthError('Verification code must be 6 digits.', 400)를 호출자에게 전달한다.
            raise AuthError("Verification code must be 6 digits.", 400)

        # 설명: `not email` 조건 결과에 따라 실행 경로를 분기한다.
        if not email:
            # 설명: 현재 처리를 중단하고 AuthError('Email is required.', 400)를 호출자에게 전달한다.
            raise AuthError("Email is required.", 400)

        # 설명: `token_hash`에 `AuthService._hash_email_token` 호출 결과를 저장해 다음 처리에서 사용한다.
        token_hash = AuthService._hash_email_token(raw_code)

        # 설명: `verification`에 `EmailVerification.query.filter_by(email=email, verification_token=t...` 호출 결과를 저장해 다음 처리에서 사용한다.
        verification = EmailVerification.query.filter_by(
            email=email,
            verification_token=token_hash,
        ).first()

        # 설명: `not verification` 조건 결과에 따라 실행 경로를 분기한다.
        if not verification:
            # 설명: 현재 처리를 중단하고 AuthError('Invalid verification code.', 404)를 호출자에게 전달한다.
            raise AuthError("Invalid verification code.", 404)

        # 설명: `verification.verification_status == 'VERIFIED'` 조건 결과에 따라 실행 경로를 분기한다.
        if verification.verification_status == "VERIFIED":
            # 설명: 현재 처리를 중단하고 AuthError('Email is already verified.', 409)를 호출자에게 전달한다.
            raise AuthError("Email is already verified.", 409)

        # 설명: `verification.verification_status in ['CANCELLED', 'EXPIRED']` 조건 결과에 따라 실행 경로를 분기한다.
        if verification.verification_status in ["CANCELLED", "EXPIRED"]:
            # 설명: 현재 처리를 중단하고 AuthError(f'Verification code is not valid. Current status: {verification.verif...를 호출자에게 전달한다.
            raise AuthError(
                f"Verification code is not valid. Current status: {verification.verification_status}",
                409,
            )

        # 설명: `now`에 `datetime.utcnow` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = datetime.utcnow()

        # 설명: `verification.expires_at < now` 조건 결과에 따라 실행 경로를 분기한다.
        if verification.expires_at < now:
            # 설명: `verification.verification_status`의 기준값 또는 기본값을 'EXPIRED'로 설정한다.
            verification.verification_status = "EXPIRED"
            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()
            # 설명: 현재 처리를 중단하고 AuthError('Verification code has expired.', 410)를 호출자에게 전달한다.
            raise AuthError("Verification code has expired.", 410)

        # 설명: `user`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = db.session.get(User, verification.user_id)

        # 설명: `not user` 조건 결과에 따라 실행 경로를 분기한다.
        if not user:
            # 설명: 현재 처리를 중단하고 AuthError('User not found.', 404)를 호출자에게 전달한다.
            raise AuthError("User not found.", 404)

        # 설명: `user.account_status == 'DELETED'` 조건 결과에 따라 실행 경로를 분기한다.
        if user.account_status == "DELETED":
            # 설명: 현재 처리를 중단하고 AuthError('Account is withdrawn.', 403)를 호출자에게 전달한다.
            raise AuthError("Account is withdrawn.", 403)

        # 설명: `user.is_email_verified`의 기준값 또는 기본값을 True로 설정한다.
        user.is_email_verified = True
        # 설명: `user.identity_provider`의 기준값 또는 기본값을 'EMAIL'로 설정한다.
        user.identity_provider = "EMAIL"
        # 설명: `user.identity_provider_user_id`의 기준값 또는 기본값을 None로 설정한다.
        user.identity_provider_user_id = None
        # 설명: `user.identity_verified_at`에 now 표현식의 계산 결과를 저장한다.
        user.identity_verified_at = now
        # 설명: `user.updated_at`에 now 표현식의 계산 결과를 저장한다.
        user.updated_at = now

        # 설명: `verification.verification_status`의 기준값 또는 기본값을 'VERIFIED'로 설정한다.
        verification.verification_status = "VERIFIED"
        # 설명: `verification.verified_at`에 now 표현식의 계산 결과를 저장한다.
        verification.verified_at = now

        # 설명: `AuthService.create_security_log`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        AuthService.create_security_log(
            action_type="EMAIL_VERIFIED",
            actor_user_id=user.id,
            target_type="USER",
            target_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message=f"Email verified for user {user.email}.",
        )

        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: 호출자에게 {'user': user.to_public_dict(), 'email_verification': verification.to_public_di... 값을 함수 결과로 반환한다.
        return {
            "user": user.to_public_dict(),
            "email_verification": verification.to_public_dict(),
        }

    # 설명: `resend_email_verification` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def resend_email_verification(data, ip_address=None, user_agent=None):
        # 설명: `data`에 data or {} 표현식의 계산 결과를 저장한다.
        data = data or {}
        # 설명: `email`에 `(data.get('email') or '').strip().lower` 호출 결과를 저장해 다음 처리에서 사용한다.
        email = (data.get("email") or "").strip().lower()

        # 설명: `not email` 조건 결과에 따라 실행 경로를 분기한다.
        if not email:
            # 설명: 현재 처리를 중단하고 AuthError('이메일을 입력해 주세요.', 400, code='EMAIL_REQUIRED')를 호출자에게 전달한다.
            raise AuthError(
                "이메일을 입력해 주세요.",
                400,
                code="EMAIL_REQUIRED",
            )

        # 설명: `user`에 `User.query.filter_by(email=email).first` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = User.query.filter_by(email=email).first()

        # 설명: `not user` 조건 결과에 따라 실행 경로를 분기한다.
        if not user:
            # 설명: 현재 처리를 중단하고 AuthError('먼저 회원가입을 진행해 주세요.', 404, code='USER_NOT_FOUND')를 호출자에게 전달한다.
            raise AuthError(
                "먼저 회원가입을 진행해 주세요.",
                404,
                code="USER_NOT_FOUND",
            )

        # 설명: `user.account_status == 'DELETED'` 조건 결과에 따라 실행 경로를 분기한다.
        if user.account_status == "DELETED":
            # 설명: 현재 처리를 중단하고 AuthError('탈퇴한 계정입니다.', 403, code='ACCOUNT_WITHDRAWN')를 호출자에게 전달한다.
            raise AuthError(
                "탈퇴한 계정입니다.",
                403,
                code="ACCOUNT_WITHDRAWN",
            )

        # 설명: `user.is_email_verified` 조건 결과에 따라 실행 경로를 분기한다.
        if user.is_email_verified:
            # 설명: 현재 처리를 중단하고 AuthError('이미 인증이 완료된 이메일입니다.', 409, code='EMAIL_ALREADY_VERIFIED')를 호출자에게 전달한다.
            raise AuthError(
                "이미 인증이 완료된 이메일입니다.",
                409,
                code="EMAIL_ALREADY_VERIFIED",
            )

        # 설명: `now`에 `datetime.utcnow` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = datetime.utcnow()

        # 설명: `latest_pending_verification`에 `EmailVerification.query.filter_by(user_id=user.id, verification_sta...` 호출 결과를 저장해 다음 처리에서 사용한다.
        latest_pending_verification = (
            EmailVerification.query.filter_by(
                user_id=user.id,
                verification_status="PENDING",
            )
            .order_by(EmailVerification.created_at.desc())
            .first()
        )

        # 설명: `latest_pending_verification` 조건 결과에 따라 실행 경로를 분기한다.
        if latest_pending_verification:
            # 설명: `retry_after`에 `AuthService._get_retry_after_seconds` 호출 결과를 저장해 다음 처리에서 사용한다.
            retry_after = AuthService._get_retry_after_seconds(
                latest_pending_verification.created_at,
                now=now,
            )

            # 설명: `retry_after > 0` 조건 결과에 따라 실행 경로를 분기한다.
            if retry_after > 0:
                # 설명: 현재 처리를 중단하고 AuthError(f'인증번호는 {retry_after}초 후 다시 요청할 수 있습니다.', 429, code='EMAIL_VERIFICATI...를 호출자에게 전달한다.
                raise AuthError(
                    f"인증번호는 {retry_after}초 후 다시 요청할 수 있습니다.",
                    429,
                    code="EMAIL_VERIFICATION_COOLDOWN",
                    extra={"retry_after": retry_after},
                )

        # 설명: `(raw_token, verification)`에 `AuthService._create_email_verification` 호출 결과를 저장해 다음 처리에서 사용한다.
        raw_token, verification = AuthService._create_email_verification(user, now=now)

        # 설명: `AuthService.create_security_log`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        AuthService.create_security_log(
            action_type="EMAIL_VERIFICATION_RESENT",
            actor_user_id=user.id,
            target_type="EMAIL_VERIFICATION",
            target_id=None,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message=f"Email verification token resent for user {user.email}.",
        )

        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: `email_delivery`에 `EmailService.send_verification_email` 호출 결과를 저장해 다음 처리에서 사용한다.
        email_delivery = EmailService.send_verification_email(
            user.email,
            raw_token,
        )

        # 설명: 호출자에게 {'code': 'EMAIL_VERIFICATION_RESENT', 'email': user.email, 'email_verification'... 값을 함수 결과로 반환한다.
        return {
            "code": "EMAIL_VERIFICATION_RESENT",
            "email": user.email,
            "email_verification": {
                "id": verification.id,
                "email": verification.email,
                "expires_at": verification.expires_at.isoformat(),
                "retry_after": AuthService._get_email_verification_cooldown_seconds(),
                "email_delivery": {
                    "sent": email_delivery.get("sent", False),
                    "reason": email_delivery.get("reason"),
                },
                "note": (
                    "Email verification code sent via SMTP."
                    if email_delivery.get("sent")
                    else "Email delivery failed. Please check SMTP settings or request resend."
                ),
            },
        }

    # 설명: `start_google_identity_verification` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def start_google_identity_verification(data, ip_address=None, user_agent=None):
        # 설명: `config`에 `AuthService._get_google_oauth_config` 호출 결과를 저장해 다음 처리에서 사용한다.
        config = AuthService._get_google_oauth_config()

        # 설명: `email`에 `(data.get('email') or '').strip().lower` 호출 결과를 저장해 다음 처리에서 사용한다.
        email = (data.get("email") or "").strip().lower()

        # 설명: `not email` 조건 결과에 따라 실행 경로를 분기한다.
        if not email:
            # 설명: 현재 처리를 중단하고 AuthError('Email is required.', 400)를 호출자에게 전달한다.
            raise AuthError("Email is required.", 400)

        # 설명: `user`에 `User.query.filter_by(email=email).first` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = User.query.filter_by(email=email).first()

        # 설명: `not user` 조건 결과에 따라 실행 경로를 분기한다.
        if not user:
            # 설명: 현재 처리를 중단하고 AuthError('User not found. Please sign up first.', 404)를 호출자에게 전달한다.
            raise AuthError("User not found. Please sign up first.", 404)

        # 설명: `user.account_status == 'DELETED'` 조건 결과에 따라 실행 경로를 분기한다.
        if user.account_status == "DELETED":
            # 설명: 현재 처리를 중단하고 AuthError('Account is withdrawn.', 403)를 호출자에게 전달한다.
            raise AuthError("Account is withdrawn.", 403)

        # 설명: `user.identity_provider == 'GOOGLE' and user.identity_verified_at` 조건 결과에 따라 실행 경로를 분기한다.
        if user.identity_provider == "GOOGLE" and user.identity_verified_at:
            # 설명: 현재 처리를 중단하고 AuthError('Identity is already verified.', 409)를 호출자에게 전달한다.
            raise AuthError("Identity is already verified.", 409)

        # 설명: `now`에 `datetime.utcnow` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = datetime.utcnow()

        # 설명: `pending_states`에 `IdentityOAuthState.query.filter_by(provider='GOOGLE', target_email=...` 호출 결과를 저장해 다음 처리에서 사용한다.
        pending_states = IdentityOAuthState.query.filter_by(
            provider="GOOGLE",
            target_email=email,
            status="PENDING",
        ).all()

        # 설명: `pending_states`의 각 항목을 `pending_state`로 받아 반복 처리한다.
        for pending_state in pending_states:
            # 설명: `pending_state.expires_at < now` 조건 결과에 따라 실행 경로를 분기한다.
            if pending_state.expires_at < now:
                # 설명: `pending_state.status`의 기준값 또는 기본값을 'EXPIRED'로 설정한다.
                pending_state.status = "EXPIRED"
            else:
                # 설명: `pending_state.status`의 기준값 또는 기본값을 'CANCELLED'로 설정한다.
                pending_state.status = "CANCELLED"

        # 설명: `expires_minutes`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
        expires_minutes = int(os.getenv("GOOGLE_OAUTH_STATE_EXPIRES_MINUTES", "10"))

        # 설명: `raw_state`에 `secrets.token_urlsafe` 호출 결과를 저장해 다음 처리에서 사용한다.
        raw_state = secrets.token_urlsafe(32)
        # 설명: `state_hash`에 `AuthService._hash_oauth_state` 호출 결과를 저장해 다음 처리에서 사용한다.
        state_hash = AuthService._hash_oauth_state(raw_state)

        # 설명: `oauth_state`에 `IdentityOAuthState` 호출 결과를 저장해 다음 처리에서 사용한다.
        oauth_state = IdentityOAuthState(
            provider="GOOGLE",
            target_email=email,
            state_hash=state_hash,
            status="PENDING",
            expires_at=now + timedelta(minutes=expires_minutes),
            created_at=now,
        )

        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(oauth_state)

        # 설명: `AuthService.create_security_log`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        AuthService.create_security_log(
            action_type="GOOGLE_IDENTITY_STARTED",
            actor_user_id=user.id,
            target_type="USER",
            target_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message=f"Google identity verification started for user {user.email}.",
        )

        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: `query`에 `urllib.parse.urlencode` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = urllib.parse.urlencode({
            "client_id": config["client_id"],
            "redirect_uri": config["redirect_uri"],
            "response_type": "code",
            "scope": "openid email profile",
            "state": raw_state,
            "include_granted_scopes": "true",
            "prompt": "select_account",
        })

        # 설명: `authorization_url`에 f'https://accounts.google.com/o/oauth2/v2/auth?{query}' 표현식의 계산 결과를 저장한다.
        authorization_url = f"https://accounts.google.com/o/oauth2/v2/auth?{query}"

        # 설명: 호출자에게 {'provider': 'GOOGLE', 'email': email, 'authorization_url': authorization_url, ... 값을 함수 결과로 반환한다.
        return {
            "provider": "GOOGLE",
            "email": email,
            "authorization_url": authorization_url,
            "expires_at": oauth_state.expires_at.isoformat(),
        }

    # 설명: `complete_google_identity_verification` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def complete_google_identity_verification(args, ip_address=None, user_agent=None):
        # 설명: `code`에 `(args.get('code') or '').strip` 호출 결과를 저장해 다음 처리에서 사용한다.
        code = (args.get("code") or "").strip()
        # 설명: `raw_state`에 `(args.get('state') or '').strip` 호출 결과를 저장해 다음 처리에서 사용한다.
        raw_state = (args.get("state") or "").strip()

        # 설명: `not code` 조건 결과에 따라 실행 경로를 분기한다.
        if not code:
            # 설명: 현재 처리를 중단하고 AuthError('Google authorization code is required.', 400)를 호출자에게 전달한다.
            raise AuthError("Google authorization code is required.", 400)

        # 설명: `not raw_state` 조건 결과에 따라 실행 경로를 분기한다.
        if not raw_state:
            # 설명: 현재 처리를 중단하고 AuthError('OAuth state is required.', 400)를 호출자에게 전달한다.
            raise AuthError("OAuth state is required.", 400)

        # 설명: `state_hash`에 `AuthService._hash_oauth_state` 호출 결과를 저장해 다음 처리에서 사용한다.
        state_hash = AuthService._hash_oauth_state(raw_state)

        # 설명: `oauth_state`에 `IdentityOAuthState.query.filter_by(provider='GOOGLE', state_hash=st...` 호출 결과를 저장해 다음 처리에서 사용한다.
        oauth_state = IdentityOAuthState.query.filter_by(
            provider="GOOGLE",
            state_hash=state_hash,
        ).first()

        # 설명: `not oauth_state` 조건 결과에 따라 실행 경로를 분기한다.
        if not oauth_state:
            # 설명: 현재 처리를 중단하고 AuthError('Invalid OAuth state.', 404)를 호출자에게 전달한다.
            raise AuthError("Invalid OAuth state.", 404)

        # 설명: `now`에 `datetime.utcnow` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = datetime.utcnow()

        # 설명: `oauth_state.status != 'PENDING'` 조건 결과에 따라 실행 경로를 분기한다.
        if oauth_state.status != "PENDING":
            # 설명: 현재 처리를 중단하고 AuthError(f'OAuth state is not valid. Current status: {oauth_state.status}', 409)를 호출자에게 전달한다.
            raise AuthError(f"OAuth state is not valid. Current status: {oauth_state.status}", 409)

        # 설명: `oauth_state.expires_at < now` 조건 결과에 따라 실행 경로를 분기한다.
        if oauth_state.expires_at < now:
            # 설명: `oauth_state.status`의 기준값 또는 기본값을 'EXPIRED'로 설정한다.
            oauth_state.status = "EXPIRED"
            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()
            # 설명: 현재 처리를 중단하고 AuthError('OAuth state has expired.', 410)를 호출자에게 전달한다.
            raise AuthError("OAuth state has expired.", 410)

        # 설명: `user`에 `User.query.filter_by(email=oauth_state.target_email).first` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = User.query.filter_by(email=oauth_state.target_email).first()

        # 설명: `not user` 조건 결과에 따라 실행 경로를 분기한다.
        if not user:
            # 설명: 현재 처리를 중단하고 AuthError('User not found.', 404)를 호출자에게 전달한다.
            raise AuthError("User not found.", 404)

        # 설명: `user.account_status == 'DELETED'` 조건 결과에 따라 실행 경로를 분기한다.
        if user.account_status == "DELETED":
            # 설명: 현재 처리를 중단하고 AuthError('Account is withdrawn.', 403)를 호출자에게 전달한다.
            raise AuthError("Account is withdrawn.", 403)

        # 설명: `token_response`에 `AuthService._exchange_google_code_for_token` 호출 결과를 저장해 다음 처리에서 사용한다.
        token_response = AuthService._exchange_google_code_for_token(code)
        # 설명: `access_token`에 `token_response.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        access_token = token_response.get("access_token")

        # 설명: `not access_token` 조건 결과에 따라 실행 경로를 분기한다.
        if not access_token:
            # 설명: 현재 처리를 중단하고 AuthError('Google access token was not returned.', 502)를 호출자에게 전달한다.
            raise AuthError("Google access token was not returned.", 502)

        # 설명: `google_user`에 `AuthService._fetch_google_userinfo` 호출 결과를 저장해 다음 처리에서 사용한다.
        google_user = AuthService._fetch_google_userinfo(access_token)

        # 설명: `google_sub`에 `(google_user.get('sub') or '').strip` 호출 결과를 저장해 다음 처리에서 사용한다.
        google_sub = (google_user.get("sub") or "").strip()
        # 설명: `google_email`에 `(google_user.get('email') or '').strip().lower` 호출 결과를 저장해 다음 처리에서 사용한다.
        google_email = (google_user.get("email") or "").strip().lower()
        # 설명: `email_verified_raw`에 `google_user.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        email_verified_raw = google_user.get("email_verified")

        # 설명: `email_verified`에 str(email_verified_raw).lower() in ['true', '1'] 표현식의 계산 결과를 저장한다.
        email_verified = str(email_verified_raw).lower() in ["true", "1"]

        # 설명: `not google_sub` 조건 결과에 따라 실행 경로를 분기한다.
        if not google_sub:
            # 설명: 현재 처리를 중단하고 AuthError('Google account identifier was not returned.', 502)를 호출자에게 전달한다.
            raise AuthError("Google account identifier was not returned.", 502)

        # 설명: `not google_email` 조건 결과에 따라 실행 경로를 분기한다.
        if not google_email:
            # 설명: 현재 처리를 중단하고 AuthError('Google email was not returned.', 502)를 호출자에게 전달한다.
            raise AuthError("Google email was not returned.", 502)

        # 설명: `not email_verified` 조건 결과에 따라 실행 경로를 분기한다.
        if not email_verified:
            # 설명: 현재 처리를 중단하고 AuthError('Google email is not verified.', 403)를 호출자에게 전달한다.
            raise AuthError("Google email is not verified.", 403)

        # 설명: `google_email != user.email.lower()` 조건 결과에 따라 실행 경로를 분기한다.
        if google_email != user.email.lower():
            # 설명: 현재 처리를 중단하고 AuthError('Google email does not match signup email.', 409)를 호출자에게 전달한다.
            raise AuthError("Google email does not match signup email.", 409)

        # 설명: `user.is_email_verified`의 기준값 또는 기본값을 True로 설정한다.
        user.is_email_verified = True
        # 설명: `user.identity_provider`의 기준값 또는 기본값을 'GOOGLE'로 설정한다.
        user.identity_provider = "GOOGLE"
        # 설명: `user.identity_provider_user_id`에 google_sub 표현식의 계산 결과를 저장한다.
        user.identity_provider_user_id = google_sub
        # 설명: `user.identity_verified_at`에 now 표현식의 계산 결과를 저장한다.
        user.identity_verified_at = now
        # 설명: `user.updated_at`에 now 표현식의 계산 결과를 저장한다.
        user.updated_at = now

        # 설명: `oauth_state.status`의 기준값 또는 기본값을 'USED'로 설정한다.
        oauth_state.status = "USED"
        # 설명: `oauth_state.used_at`에 now 표현식의 계산 결과를 저장한다.
        oauth_state.used_at = now

        # 설명: `AuthService.create_security_log`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        AuthService.create_security_log(
            action_type="GOOGLE_IDENTITY_VERIFIED",
            actor_user_id=user.id,
            target_type="USER",
            target_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message=f"Google identity verified for user {user.email}.",
        )

        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: 호출자에게 {'user': user.to_public_dict(), 'redirect_url': AuthService._build_identity_res... 값을 함수 결과로 반환한다.
        return {
            "user": user.to_public_dict(),
            "redirect_url": AuthService._build_identity_result_redirect(
                provider="google",
                status="verified",
            ),
        }

    # 설명: `login` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def login(data, ip_address=None, user_agent=None):
        # 설명: `login_id`에 `(data.get('login_id') or data.get('loginId') or data.get('identifie...` 호출 결과를 저장해 다음 처리에서 사용한다.
        login_id = (
            data.get("login_id")
            or data.get("loginId")
            or data.get("identifier")
            or data.get("email")
            or ""
        ).strip().lower()
        # 설명: `password`에 data.get('password') or '' 표현식의 계산 결과를 저장한다.
        password = data.get("password") or ""

        # 설명: `not login_id or not password` 조건 결과에 따라 실행 경로를 분기한다.
        if not login_id or not password:
            # 설명: 현재 처리를 중단하고 AuthError('Login ID and password are required.', 400)를 호출자에게 전달한다.
            raise AuthError("Login ID and password are required.", 400)

        # 설명: `user`에 `User.query.filter_by(login_id=login_id).first` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = User.query.filter_by(login_id=login_id).first()

        # 설명: `not user or not verify_password(password, user.password_hash)` 조건 결과에 따라 실행 경로를 분기한다.
        if not user or not verify_password(password, user.password_hash):
            # 설명: `AuthService.create_security_log`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            AuthService.create_security_log(
                action_type="LOGIN_FAILED",
                actor_user_id=user.id if user else None,
                target_type="USER",
                target_id=user.id if user else None,
                ip_address=ip_address,
                user_agent=user_agent,
                log_message="Invalid login ID or password.",
            )
            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()
            # 설명: 현재 처리를 중단하고 AuthError('아이디 또는 비밀번호가 올바르지 않습니다.', 401)를 호출자에게 전달한다.
            raise AuthError("아이디 또는 비밀번호가 올바르지 않습니다.", 401)

        # 설명: `user.account_status != 'ACTIVE'` 조건 결과에 따라 실행 경로를 분기한다.
        if user.account_status != "ACTIVE":
            # 설명: 현재 처리를 중단하고 AuthError(f'Account is not active. Current status: {user.account_status}', 403)를 호출자에게 전달한다.
            raise AuthError(
                f"Account is not active. Current status: {user.account_status}",
                403,
            )

        # 설명: `email_verification_required`에 os.getenv('EMAIL_VERIFICATION_REQUIRED', 'false').lower() == 'true' 표현식의 계산 결과를 저장한다.
        email_verification_required = os.getenv(
            "EMAIL_VERIFICATION_REQUIRED",
            "false",
        ).lower() == "true"

        # 설명: `email_verification_required and (not user.is_email_verified)` 조건 결과에 따라 실행 경로를 분기한다.
        if email_verification_required and not user.is_email_verified:
            # 설명: 현재 처리를 중단하고 AuthError('Email is not verified.', 403)를 호출자에게 전달한다.
            raise AuthError("Email is not verified.", 403)

        # 설명: `user.last_login_at`에 `datetime.utcnow` 호출 결과를 저장해 다음 처리에서 사용한다.
        user.last_login_at = datetime.utcnow()

        # 설명: `AuthService.create_security_log`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        AuthService.create_security_log(
            action_type="LOGIN_SUCCESS",
            actor_user_id=user.id,
            target_type="USER",
            target_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message="User logged in successfully.",
        )

        # 설명: `token`에 `create_access_token` 호출 결과를 저장해 다음 처리에서 사용한다.
        token = create_access_token(user)

        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: 호출자에게 {'access_token': token, 'token_type': 'Bearer', 'user': user.to_public_dict()} 값을 함수 결과로 반환한다.
        return {
            "access_token": token,
            "token_type": "Bearer",
            "user": user.to_public_dict(),
        }


    # 설명: `update_my_profile` 함수는 기존 데이터의 허용된 값을 변경하는 함수다.
    @staticmethod
    def update_my_profile(user, data, ip_address=None, user_agent=None):
        """Update current user's editable profile fields for MyPage."""
        # 설명: `user is None` 조건 결과에 따라 실행 경로를 분기한다.
        if user is None:
            # 설명: 현재 처리를 중단하고 AuthError('Authentication is required.', 401)를 호출자에게 전달한다.
            raise AuthError("Authentication is required.", 401)

        # 설명: `user.account_status == 'DELETED'` 조건 결과에 따라 실행 경로를 분기한다.
        if user.account_status == "DELETED":
            # 설명: 현재 처리를 중단하고 AuthError('Account is withdrawn.', 403)를 호출자에게 전달한다.
            raise AuthError("Account is withdrawn.", 403)

        # 설명: `user.account_status != 'ACTIVE'` 조건 결과에 따라 실행 경로를 분기한다.
        if user.account_status != "ACTIVE":
            # 설명: 현재 처리를 중단하고 AuthError('Only active accounts can update profile.', 403)를 호출자에게 전달한다.
            raise AuthError("Only active accounts can update profile.", 403)

        # 설명: `not isinstance(data, dict)` 조건 결과에 따라 실행 경로를 분기한다.
        if not isinstance(data, dict):
            # 설명: 현재 처리를 중단하고 AuthError('Request body must be a JSON object.', 400)를 호출자에게 전달한다.
            raise AuthError("Request body must be a JSON object.", 400)

        # 설명: `allowed_fields`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        allowed_fields = {"name", "phone"}
        # 설명: `requested_fields`에 `set` 호출 결과를 저장해 다음 처리에서 사용한다.
        requested_fields = set(data.keys())
        # 설명: `blocked_fields`에 requested_fields - allowed_fields 표현식의 계산 결과를 저장한다.
        blocked_fields = requested_fields - allowed_fields

        # 설명: `blocked_fields` 조건 결과에 따라 실행 경로를 분기한다.
        if blocked_fields:
            # 설명: `blocked`에 `', '.join` 호출 결과를 저장해 다음 처리에서 사용한다.
            blocked = ", ".join(sorted(blocked_fields))
            # 설명: 현재 처리를 중단하고 AuthError(f'Cannot update restricted fields: {blocked}', 400)를 호출자에게 전달한다.
            raise AuthError(f"Cannot update restricted fields: {blocked}", 400)

        # 설명: `not requested_fields` 조건 결과에 따라 실행 경로를 분기한다.
        if not requested_fields:
            # 설명: 현재 처리를 중단하고 AuthError('At least one profile field is required.', 400)를 호출자에게 전달한다.
            raise AuthError("At least one profile field is required.", 400)

        # 설명: `changed`의 기준값 또는 기본값을 False로 설정한다.
        changed = False

        # 설명: `'name' in data` 조건 결과에 따라 실행 경로를 분기한다.
        if "name" in data:
            # 설명: `name`에 `(data.get('name') or '').strip` 호출 결과를 저장해 다음 처리에서 사용한다.
            name = (data.get("name") or "").strip()

            # 설명: `not name` 조건 결과에 따라 실행 경로를 분기한다.
            if not name:
                # 설명: 현재 처리를 중단하고 AuthError('Name is required.', 400)를 호출자에게 전달한다.
                raise AuthError("Name is required.", 400)

            # 설명: `len(name) > 50` 조건 결과에 따라 실행 경로를 분기한다.
            if len(name) > 50:
                # 설명: 현재 처리를 중단하고 AuthError('Name must be 50 characters or less.', 400)를 호출자에게 전달한다.
                raise AuthError("Name must be 50 characters or less.", 400)

            # 설명: `user.name != name` 조건 결과에 따라 실행 경로를 분기한다.
            if user.name != name:
                # 설명: `user.name`에 name 표현식의 계산 결과를 저장한다.
                user.name = name
                # 설명: `changed`의 기준값 또는 기본값을 True로 설정한다.
                changed = True

        # 설명: `'phone' in data` 조건 결과에 따라 실행 경로를 분기한다.
        if "phone" in data:
            # 설명: `raw_phone`에 `data.get` 호출 결과를 저장해 다음 처리에서 사용한다.
            raw_phone = data.get("phone")

            # 설명: `raw_phone is None or str(raw_phone).strip() == ''` 조건 결과에 따라 실행 경로를 분기한다.
            if raw_phone is None or str(raw_phone).strip() == "":
                # 설명: `phone`의 기준값 또는 기본값을 None로 설정한다.
                phone = None
            else:
                # 설명: `phone`에 `str(raw_phone).strip` 호출 결과를 저장해 다음 처리에서 사용한다.
                phone = str(raw_phone).strip()

                # 설명: `len(phone) > 20` 조건 결과에 따라 실행 경로를 분기한다.
                if len(phone) > 20:
                    # 설명: 현재 처리를 중단하고 AuthError('Phone number must be 20 characters or less.', 400)를 호출자에게 전달한다.
                    raise AuthError("Phone number must be 20 characters or less.", 400)

                # 설명: `not re.fullmatch('[0-9+()\\-\\s]+', phone)` 조건 결과에 따라 실행 경로를 분기한다.
                if not re.fullmatch(r"[0-9+()\-\s]+", phone):
                    # 설명: 현재 처리를 중단하고 AuthError('Phone number format is invalid.', 400)를 호출자에게 전달한다.
                    raise AuthError("Phone number format is invalid.", 400)

            # 설명: `user.phone != phone` 조건 결과에 따라 실행 경로를 분기한다.
            if user.phone != phone:
                # 설명: `user.phone`에 phone 표현식의 계산 결과를 저장한다.
                user.phone = phone
                # 설명: `changed`의 기준값 또는 기본값을 True로 설정한다.
                changed = True

        # 설명: `changed` 조건 결과에 따라 실행 경로를 분기한다.
        if changed:
            # 설명: `user.updated_at`에 `datetime.utcnow` 호출 결과를 저장해 다음 처리에서 사용한다.
            user.updated_at = datetime.utcnow()
            # 설명: `AuthService.create_security_log`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            AuthService.create_security_log(
                action_type="MY_PROFILE_UPDATED",
                actor_user_id=user.id,
                target_type="USER",
                target_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                log_message="User updated own profile.",
            )

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()
        except Exception:
            # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
            db.session.rollback()
            # 설명: 현재 처리를 중단하고 AuthError('Failed to update profile.', 500)를 호출자에게 전달한다.
            raise AuthError("Failed to update profile.", 500)

        # 설명: 호출자에게 user.to_public_dict() 값을 함수 결과로 반환한다.
        return user.to_public_dict()

    # 설명: `change_my_password` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def change_my_password(
        user,
        data,
        ip_address=None,
        user_agent=None,
    ):
        # 설명: `current_password`에 data.get('current_password') or '' 표현식의 계산 결과를 저장한다.
        current_password = data.get("current_password") or ""
        # 설명: `new_password`에 data.get('new_password') or '' 표현식의 계산 결과를 저장한다.
        new_password = data.get("new_password") or ""

        # 설명: `not current_password` 조건 결과에 따라 실행 경로를 분기한다.
        if not current_password:
            # 설명: 현재 처리를 중단하고 AuthError('Current password is required.', 400)를 호출자에게 전달한다.
            raise AuthError("Current password is required.", 400)

        # 설명: `not new_password or len(new_password) < 8` 조건 결과에 따라 실행 경로를 분기한다.
        if not new_password or len(new_password) < 8:
            # 설명: 현재 처리를 중단하고 AuthError('New password must be at least 8 characters.', 400)를 호출자에게 전달한다.
            raise AuthError("New password must be at least 8 characters.", 400)

        # 설명: `not verify_password(current_password, user.password_hash)` 조건 결과에 따라 실행 경로를 분기한다.
        if not verify_password(current_password, user.password_hash):
            # 설명: `AuthService.create_security_log`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            AuthService.create_security_log(
                action_type="PASSWORD_CHANGE_FAILED",
                actor_user_id=user.id,
                target_type="USER",
                target_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                log_message="Current password verification failed.",
            )
            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()
            # 설명: 현재 처리를 중단하고 AuthError('Current password is incorrect.', 401)를 호출자에게 전달한다.
            raise AuthError("Current password is incorrect.", 401)

        # 설명: `verify_password(new_password, user.password_hash)` 조건 결과에 따라 실행 경로를 분기한다.
        if verify_password(new_password, user.password_hash):
            # 설명: 현재 처리를 중단하고 AuthError('New password must be different from current password.', 400)를 호출자에게 전달한다.
            raise AuthError("New password must be different from current password.", 400)

        # 설명: `user.password_hash`에 `hash_password` 호출 결과를 저장해 다음 처리에서 사용한다.
        user.password_hash = hash_password(new_password)
        # 설명: `user.updated_at`에 `datetime.utcnow` 호출 결과를 저장해 다음 처리에서 사용한다.
        user.updated_at = datetime.utcnow()

        # 설명: `AuthService.create_security_log`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        AuthService.create_security_log(
            action_type="PASSWORD_CHANGED",
            actor_user_id=user.id,
            target_type="USER",
            target_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message="User password changed.",
        )

        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: 호출자에게 user.to_public_dict() 값을 함수 결과로 반환한다.
        return user.to_public_dict()

    # 설명: `withdraw_my_account` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def withdraw_my_account(
        user,
        data,
        ip_address=None,
        user_agent=None,
    ):
        # 설명: `password`에 data.get('password') or '' 표현식의 계산 결과를 저장한다.
        password = data.get("password") or ""

        # 설명: `not password` 조건 결과에 따라 실행 경로를 분기한다.
        if not password:
            # 설명: 현재 처리를 중단하고 AuthError('Password is required.', 400)를 호출자에게 전달한다.
            raise AuthError("Password is required.", 400)

        # 설명: `not verify_password(password, user.password_hash)` 조건 결과에 따라 실행 경로를 분기한다.
        if not verify_password(password, user.password_hash):
            # 설명: `AuthService.create_security_log`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            AuthService.create_security_log(
                action_type="ACCOUNT_WITHDRAW_FAILED",
                actor_user_id=user.id,
                target_type="USER",
                target_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                log_message="Password verification failed during account withdrawal.",
            )
            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()
            # 설명: 현재 처리를 중단하고 AuthError('Password is incorrect.', 401)를 호출자에게 전달한다.
            raise AuthError("Password is incorrect.", 401)

        # 설명: `user.account_status`의 기준값 또는 기본값을 'DELETED'로 설정한다.
        user.account_status = "DELETED"
        # 설명: `user.updated_at`에 `datetime.utcnow` 호출 결과를 저장해 다음 처리에서 사용한다.
        user.updated_at = datetime.utcnow()

        # 설명: `AuthService.create_security_log`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        AuthService.create_security_log(
            action_type="ACCOUNT_WITHDRAWN",
            actor_user_id=user.id,
            target_type="USER",
            target_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message="User account was deactivated by withdrawal.",
        )

        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: 호출자에게 user.to_public_dict() 값을 함수 결과로 반환한다.
        return user.to_public_dict()

    # 설명: `list_users` 함수는 조건에 맞는 목록을 조회하는 함수다.
    @staticmethod
    def list_users():
        # 설명: `users`에 `User.query.order_by(User.id.desc()).all` 호출 결과를 저장해 다음 처리에서 사용한다.
        users = User.query.order_by(User.id.desc()).all()
        # 설명: 호출자에게 [user.to_public_dict() for user in users] 값을 함수 결과로 반환한다.
        return [user.to_public_dict() for user in users]

    # 설명: `list_signup_requests` 함수는 조건에 맞는 목록을 조회하는 함수다.
    @staticmethod
    def list_signup_requests(request_status=None):
        # 설명: `query`에 `SignupRequest.query.order_by` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = SignupRequest.query.order_by(SignupRequest.id.desc())

        # 설명: `request_status` 조건 결과에 따라 실행 경로를 분기한다.
        if request_status:
            # 설명: `query`에 `query.filter_by` 호출 결과를 저장해 다음 처리에서 사용한다.
            query = query.filter_by(request_status=request_status)

        # 설명: `signup_requests`에 `query.all` 호출 결과를 저장해 다음 처리에서 사용한다.
        signup_requests = query.all()

        # 설명: `result`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        result = []

        # 설명: `signup_requests`의 각 항목을 `signup_request`로 받아 반복 처리한다.
        for signup_request in signup_requests:
            # 설명: `user`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
            user = db.session.get(User, signup_request.user_id)
            # 설명: `result.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
            result.append(signup_request.to_dict(user=user))

        # 설명: 호출자에게 result 값을 함수 결과로 반환한다.
        return result

    # 설명: `approve_signup_request` 함수는 대상을 승인 상태로 전환하는 함수다.
    @staticmethod
    def approve_signup_request(
        signup_request_id,
        reviewer_user,
        ip_address=None,
        user_agent=None,
    ):
        # 설명: `signup_request`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        signup_request = db.session.get(SignupRequest, signup_request_id)

        # 설명: `not signup_request` 조건 결과에 따라 실행 경로를 분기한다.
        if not signup_request:
            # 설명: 현재 처리를 중단하고 AuthError('Signup request not found.', 404)를 호출자에게 전달한다.
            raise AuthError("Signup request not found.", 404)

        # 설명: `signup_request.request_status != 'REQUESTED'` 조건 결과에 따라 실행 경로를 분기한다.
        if signup_request.request_status != "REQUESTED":
            # 설명: 현재 처리를 중단하고 AuthError('Signup request is already reviewed.', 409)를 호출자에게 전달한다.
            raise AuthError("Signup request is already reviewed.", 409)

        # 설명: `user`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = db.session.get(User, signup_request.user_id)

        # 설명: `not user` 조건 결과에 따라 실행 경로를 분기한다.
        if not user:
            # 설명: 현재 처리를 중단하고 AuthError('Target user not found.', 404)를 호출자에게 전달한다.
            raise AuthError("Target user not found.", 404)

        # 설명: `now`에 `datetime.utcnow` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = datetime.utcnow()

        # 설명: `signup_request.request_status`의 기준값 또는 기본값을 'APPROVED'로 설정한다.
        signup_request.request_status = "APPROVED"
        # 설명: `signup_request.reviewed_by`에 reviewer_user.id 표현식의 계산 결과를 저장한다.
        signup_request.reviewed_by = reviewer_user.id
        # 설명: `signup_request.reviewed_at`에 now 표현식의 계산 결과를 저장한다.
        signup_request.reviewed_at = now

        # 설명: `user.account_status`의 기준값 또는 기본값을 'ACTIVE'로 설정한다.
        user.account_status = "ACTIVE"
        # 설명: `user.approved_by`에 reviewer_user.id 표현식의 계산 결과를 저장한다.
        user.approved_by = reviewer_user.id
        # 설명: `user.approved_at`에 now 표현식의 계산 결과를 저장한다.
        user.approved_at = now
        # 승인 단계에서도 기존 요청 role을 반영하지 않고 일반 사용자 역할로 고정한다.
        signup_request.requested_role = "VIEWER"
        user.role = "VIEWER"

        # 설명: `AuthService.create_security_log`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        AuthService.create_security_log(
            action_type="SIGNUP_APPROVED",
            actor_user_id=reviewer_user.id,
            target_type="USER",
            target_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message=f"Signup request approved for user {user.email}.",
        )

        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: 호출자에게 {'signup_request': signup_request.to_dict(user=user), 'user': user.to_public_di... 값을 함수 결과로 반환한다.
        return {
            "signup_request": signup_request.to_dict(user=user),
            "user": user.to_public_dict(),
        }

    # 설명: `reject_signup_request` 함수는 대상을 반려 상태로 전환하는 함수다.
    @staticmethod
    def reject_signup_request(
        signup_request_id,
        reviewer_user,
        reject_reason=None,
        ip_address=None,
        user_agent=None,
    ):
        # 설명: `signup_request`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        signup_request = db.session.get(SignupRequest, signup_request_id)

        # 설명: `not signup_request` 조건 결과에 따라 실행 경로를 분기한다.
        if not signup_request:
            # 설명: 현재 처리를 중단하고 AuthError('Signup request not found.', 404)를 호출자에게 전달한다.
            raise AuthError("Signup request not found.", 404)

        # 설명: `signup_request.request_status != 'REQUESTED'` 조건 결과에 따라 실행 경로를 분기한다.
        if signup_request.request_status != "REQUESTED":
            # 설명: 현재 처리를 중단하고 AuthError('Signup request is already reviewed.', 409)를 호출자에게 전달한다.
            raise AuthError("Signup request is already reviewed.", 409)

        # 설명: `user`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        user = db.session.get(User, signup_request.user_id)

        # 설명: `not user` 조건 결과에 따라 실행 경로를 분기한다.
        if not user:
            # 설명: 현재 처리를 중단하고 AuthError('Target user not found.', 404)를 호출자에게 전달한다.
            raise AuthError("Target user not found.", 404)

        # 설명: `now`에 `datetime.utcnow` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = datetime.utcnow()

        # 설명: `signup_request.request_status`의 기준값 또는 기본값을 'REJECTED'로 설정한다.
        signup_request.request_status = "REJECTED"
        # 설명: `signup_request.reviewed_by`에 reviewer_user.id 표현식의 계산 결과를 저장한다.
        signup_request.reviewed_by = reviewer_user.id
        # 설명: `signup_request.reviewed_at`에 now 표현식의 계산 결과를 저장한다.
        signup_request.reviewed_at = now
        # 설명: `signup_request.reject_reason`에 reject_reason 표현식의 계산 결과를 저장한다.
        signup_request.reject_reason = reject_reason

        # 설명: `user.account_status`의 기준값 또는 기본값을 'REJECTED'로 설정한다.
        user.account_status = "REJECTED"
        # 설명: `user.is_email_verified`의 기준값 또는 기본값을 False로 설정한다.
        user.is_email_verified = False

        # 설명: `AuthService.create_security_log`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        AuthService.create_security_log(
            action_type="SIGNUP_REJECTED",
            actor_user_id=reviewer_user.id,
            target_type="USER",
            target_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message=f"Signup request rejected for user {user.email}.",
        )

        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: 호출자에게 {'signup_request': signup_request.to_dict(user=user), 'user': user.to_public_di... 값을 함수 결과로 반환한다.
        return {
            "signup_request": signup_request.to_dict(user=user),
            "user": user.to_public_dict(),
        }
