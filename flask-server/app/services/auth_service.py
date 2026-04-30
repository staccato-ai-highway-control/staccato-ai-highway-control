from datetime import datetime

from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.auth_models import SecurityLog, SignupRequest, User
from app.utils.security import create_access_token, hash_password, verify_password


class AuthError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class AuthService:
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

        db.session.add(log)
        return log

    @staticmethod
    def signup(data, ip_address=None, user_agent=None):
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        name = (data.get("name") or "").strip()
        phone = (data.get("phone") or "").strip() or None
        requested_role = data.get("requested_role") or "VIEWER"

        if not email:
            raise AuthError("Email is required.", 400)

        if not password or len(password) < 8:
            raise AuthError("Password must be at least 8 characters.", 400)

        if not name:
            raise AuthError("Name is required.", 400)

        existing_user = User.query.filter_by(email=email).first()

        if existing_user:
            raise AuthError("Email already exists.", 409)

        now = datetime.utcnow()

        user = User(
            email=email,
            password_hash=hash_password(password),
            name=name,
            phone=phone,
            role=requested_role,
            account_status="PENDING",
            is_email_verified=False,
            created_at=now,
        )

        db.session.add(user)
        db.session.flush()

        signup_request = SignupRequest(
            user_id=user.id,
            request_status="REQUESTED",
            requested_role=requested_role,
            request_memo=data.get("request_memo"),
            created_at=now,
        )

        db.session.add(signup_request)

        AuthService.create_security_log(
            action_type="SIGNUP_REQUESTED",
            actor_user_id=user.id,
            target_type="USER",
            target_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message="User signup requested.",
        )

        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise AuthError("Failed to create signup request.", 409)

        return {
            "user": user.to_public_dict(),
            "signup_request_id": signup_request.id,
        }

    @staticmethod
    def login(data, ip_address=None, user_agent=None):
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not email or not password:
            raise AuthError("Email and password are required.", 400)

        user = User.query.filter_by(email=email).first()

        if not user or not verify_password(password, user.password_hash):
            raise AuthError("Invalid email or password.", 401)

        if user.account_status != "ACTIVE":
            raise AuthError(
                f"Account is not active. Current status: {user.account_status}",
                403,
            )

        user.last_login_at = datetime.utcnow()

        AuthService.create_security_log(
            action_type="LOGIN_SUCCESS",
            actor_user_id=user.id,
            target_type="USER",
            target_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message="User logged in successfully.",
        )

        token = create_access_token(user)

        db.session.commit()

        return {
            "access_token": token,
            "token_type": "Bearer",
            "user": user.to_public_dict(),
        }
