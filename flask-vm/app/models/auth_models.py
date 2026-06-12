"""auth models 도메인의 SQLAlchemy 영속성 모델을 정의한다.

테이블 컬럼, 관계, 제약 조건과 생성·수정 시각 등 데이터베이스 계약을 표현한다."""

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db


# 설명: `User` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class User(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'users'로 설정한다.
    __tablename__ = "users"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    # 설명: `login_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    login_id = db.Column(db.String(50), nullable=False, unique=True, index=True)
    # 설명: `email`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    email = db.Column(db.String(255), nullable=False, unique=True)
    # 설명: `password_hash`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    password_hash = db.Column(db.String(255), nullable=False)
    # 설명: `name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    name = db.Column(db.String(100), nullable=False)
    # 설명: `phone`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    phone = db.Column(db.String(50), nullable=True)
    # 설명: `role`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    role = db.Column(db.String(50), nullable=False, default="VIEWER")
    # 설명: `account_status`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    account_status = db.Column(db.String(50), nullable=False, default="PENDING")
    # 설명: `is_email_verified`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    is_email_verified = db.Column(db.Boolean, nullable=False, default=False)
    # 설명: `identity_provider`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    identity_provider = db.Column(db.String(30), nullable=True)
    # 설명: `identity_provider_user_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    identity_provider_user_id = db.Column(db.String(255), nullable=True)
    # 설명: `identity_verified_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    identity_verified_at = db.Column(db.DateTime, nullable=True)
    # 설명: `approved_by`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    approved_by = db.Column(db.BigInteger, nullable=True)
    # 설명: `approved_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    approved_at = db.Column(db.DateTime, nullable=True)
    # 설명: `last_login_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    last_login_at = db.Column(db.DateTime, nullable=True)
    # 설명: `created_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_at = db.Column(db.DateTime, nullable=False)
    # 설명: `updated_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    updated_at = db.Column(db.DateTime, nullable=True)

    # 설명: `to_public_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def to_public_dict(self):
        # 설명: 호출자에게 {'id': self.id, 'login_id': self.login_id, 'email': self.email, 'name': self.na... 값을 함수 결과로 반환한다.
        return {
            "id": self.id,
            "login_id": self.login_id,
            "email": self.email,
            "name": self.name,
            "phone": self.phone,
            "role": self.role,
            "account_status": self.account_status,
            "is_email_verified": bool(self.is_email_verified),
            "identity_provider": self.identity_provider,
            "identity_provider_user_id": self.identity_provider_user_id,
            "identity_verified_at": self.identity_verified_at.isoformat() if self.identity_verified_at else None,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
        }


# 설명: `SignupRequest` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class SignupRequest(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'signup_requests'로 설정한다.
    __tablename__ = "signup_requests"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    # 설명: `user_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    user_id = db.Column(db.BigInteger, nullable=False)
    # 설명: `request_status`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    request_status = db.Column(db.String(50), nullable=False, default="REQUESTED")
    # 설명: `requested_role`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    requested_role = db.Column(db.String(50), nullable=False, default="VIEWER")
    # 설명: `request_memo`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    request_memo = db.Column(db.Text, nullable=True)
    # 설명: `reviewed_by`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    reviewed_by = db.Column(db.BigInteger, nullable=True)
    # 설명: `reviewed_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    reviewed_at = db.Column(db.DateTime, nullable=True)
    # 설명: `reject_reason`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    reject_reason = db.Column(db.Text, nullable=True)
    # 설명: `created_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_at = db.Column(db.DateTime, nullable=False)
    # 설명: `updated_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    updated_at = db.Column(db.DateTime, nullable=True)

    # 설명: `to_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def to_dict(self, user=None):
        # 설명: 호출자에게 {'id': self.id, 'user_id': self.user_id, 'request_status': self.request_status,... 값을 함수 결과로 반환한다.
        return {
            "id": self.id,
            "user_id": self.user_id,
            "request_status": self.request_status,
            "requested_role": self.requested_role,
            "request_memo": self.request_memo,
            "reviewed_by": self.reviewed_by,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "reject_reason": self.reject_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "user": user.to_public_dict() if user else None,
        }


# 설명: `EmailVerification` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class EmailVerification(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'email_verifications'로 설정한다.
    __tablename__ = "email_verifications"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    # 설명: `user_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    user_id = db.Column(db.BigInteger, nullable=False)
    # 설명: `email`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    email = db.Column(db.String(255), nullable=False)
    # 설명: `verification_token`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    verification_token = db.Column(db.String(255), nullable=False, unique=True)
    # 설명: `verification_status`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    verification_status = db.Column(db.String(50), nullable=False, default="PENDING")
    # 설명: `expires_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    expires_at = db.Column(db.DateTime, nullable=False)
    # 설명: `verified_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    verified_at = db.Column(db.DateTime, nullable=True)
    # 설명: `created_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_at = db.Column(db.DateTime, nullable=False)

    # 설명: `to_public_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def to_public_dict(self):
        # 설명: 호출자에게 {'id': self.id, 'user_id': self.user_id, 'email': self.email, 'verification_sta... 값을 함수 결과로 반환한다.
        return {
            "id": self.id,
            "user_id": self.user_id,
            "email": self.email,
            "verification_status": self.verification_status,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# 설명: `IdentityOAuthState` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class IdentityOAuthState(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'identity_oauth_states'로 설정한다.
    __tablename__ = "identity_oauth_states"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    # 설명: `provider`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    provider = db.Column(db.String(30), nullable=False)
    # 설명: `target_email`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    target_email = db.Column(db.String(255), nullable=False)
    # 설명: `state_hash`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    state_hash = db.Column(db.String(255), nullable=False, unique=True)
    # 설명: `status`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    status = db.Column(db.String(50), nullable=False, default="PENDING")
    # 설명: `expires_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    expires_at = db.Column(db.DateTime, nullable=False)
    # 설명: `used_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    used_at = db.Column(db.DateTime, nullable=True)
    # 설명: `created_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_at = db.Column(db.DateTime, nullable=False)

    # 설명: `to_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def to_dict(self):
        # 설명: 호출자에게 {'id': self.id, 'provider': self.provider, 'target_email': self.target_email, '... 값을 함수 결과로 반환한다.
        return {
            "id": self.id,
            "provider": self.provider,
            "target_email": self.target_email,
            "status": self.status,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "used_at": self.used_at.isoformat() if self.used_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# 설명: `SecurityLog` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class SecurityLog(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'security_logs'로 설정한다.
    __tablename__ = "security_logs"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    # 설명: `actor_user_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    actor_user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    # 설명: `action_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    action_type = db.Column(db.String(100), nullable=False)
    # 설명: `target_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    target_type = db.Column(db.String(100), nullable=True)
    # 설명: `target_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    target_id = db.Column(db.BigInteger, nullable=True)
    # 설명: `ip_address`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    ip_address = db.Column(db.String(45), nullable=True)
    # 설명: `user_agent`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    user_agent = db.Column(db.String(500), nullable=True)
    # 설명: `log_message`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    log_message = db.Column(db.Text, nullable=True)
    # 설명: `created_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_at = db.Column(db.DateTime, nullable=False)
