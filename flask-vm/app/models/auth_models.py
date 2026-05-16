from app.extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    login_id = db.Column(db.String(50), nullable=False, unique=True, index=True)
    email = db.Column(db.String(255), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(50), nullable=True)
    role = db.Column(db.String(50), nullable=False, default="VIEWER")
    account_status = db.Column(db.String(50), nullable=False, default="PENDING")
    is_email_verified = db.Column(db.Boolean, nullable=False, default=False)
    identity_provider = db.Column(db.String(30), nullable=True)
    identity_provider_user_id = db.Column(db.String(255), nullable=True)
    identity_verified_at = db.Column(db.DateTime, nullable=True)
    approved_by = db.Column(db.BigInteger, nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    last_login_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)

    def to_public_dict(self):
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


class SignupRequest(db.Model):
    __tablename__ = "signup_requests"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=False)
    request_status = db.Column(db.String(50), nullable=False, default="REQUESTED")
    requested_role = db.Column(db.String(50), nullable=False, default="VIEWER")
    request_memo = db.Column(db.Text, nullable=True)
    reviewed_by = db.Column(db.BigInteger, nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    reject_reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self, user=None):
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


class EmailVerification(db.Model):
    __tablename__ = "email_verifications"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    verification_token = db.Column(db.String(255), nullable=False, unique=True)
    verification_status = db.Column(db.String(50), nullable=False, default="PENDING")
    expires_at = db.Column(db.DateTime, nullable=False)
    verified_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)

    def to_public_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "email": self.email,
            "verification_status": self.verification_status,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class IdentityOAuthState(db.Model):
    __tablename__ = "identity_oauth_states"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    provider = db.Column(db.String(30), nullable=False)
    target_email = db.Column(db.String(255), nullable=False)
    state_hash = db.Column(db.String(255), nullable=False, unique=True)
    status = db.Column(db.String(50), nullable=False, default="PENDING")
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "provider": self.provider,
            "target_email": self.target_email,
            "status": self.status,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "used_at": self.used_at.isoformat() if self.used_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SecurityLog(db.Model):
    __tablename__ = "security_logs"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    actor_user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    action_type = db.Column(db.String(100), nullable=False)
    target_type = db.Column(db.String(100), nullable=True)
    target_id = db.Column(db.BigInteger, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(500), nullable=True)
    log_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)
