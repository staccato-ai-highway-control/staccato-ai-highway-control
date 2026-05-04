from datetime import datetime, timedelta
import hashlib
import os
import secrets

from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.services.email_service import EmailService
from app.models.auth_models import EmailVerification, SecurityLog, SignupRequest, User
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
    def _hash_email_token(raw_token):
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    @staticmethod
    def _get_frontend_base_url():
        return os.getenv("FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")

    @staticmethod
    def _build_email_verification_link(raw_token):
        return f"{AuthService._get_frontend_base_url()}/auth/verify-email?token={raw_token}"

    @staticmethod
    def _create_email_verification(user, now=None):
        now = now or datetime.utcnow()

        pending_verifications = EmailVerification.query.filter_by(
            user_id=user.id,
            verification_status="PENDING",
        ).all()

        for verification in pending_verifications:
            verification.verification_status = "CANCELLED"

        raw_token = secrets.token_urlsafe(32)
        token_hash = AuthService._hash_email_token(raw_token)

        verification = EmailVerification(
            user_id=user.id,
            email=user.email,
            verification_token=token_hash,
            verification_status="PENDING",
            expires_at=now + timedelta(hours=24),
            created_at=now,
        )

        db.session.add(verification)

        return raw_token, verification

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

        raw_token, verification = AuthService._create_email_verification(user, now=now)

        AuthService.create_security_log(
            action_type="SIGNUP_REQUESTED",
            actor_user_id=user.id,
            target_type="USER",
            target_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message="User signup requested.",
        )

        AuthService.create_security_log(
            action_type="EMAIL_VERIFICATION_CREATED",
            actor_user_id=user.id,
            target_type="EMAIL_VERIFICATION",
            target_id=None,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message="Email verification token created.",
        )

        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise AuthError("Failed to create signup request.", 409)

        verification_link = AuthService._build_email_verification_link(raw_token)
        email_delivery = EmailService.send_verification_email(
            user.email,
            verification_link,
        )

        return {
            "user": user.to_public_dict(),
            "signup_request_id": signup_request.id,
            "email_verification": {
                "id": verification.id,
                "email": verification.email,
                "expires_at": verification.expires_at.isoformat(),
                "verification_link": verification_link,
                "email_delivery": email_delivery,
                "note": (
                    "Email verification link sent via SMTP."
                    if email_delivery.get("sent")
                    else "Development mode only or SMTP delivery failed. Use verification_link for testing."
                ),
            },
        }

    @staticmethod
    def verify_email(data, ip_address=None, user_agent=None):
        raw_token = (data.get("token") or "").strip()

        if not raw_token:
            raise AuthError("Verification token is required.", 400)

        token_hash = AuthService._hash_email_token(raw_token)

        verification = EmailVerification.query.filter_by(
            verification_token=token_hash
        ).first()

        if not verification:
            raise AuthError("Invalid verification token.", 404)

        if verification.verification_status == "VERIFIED":
            raise AuthError("Email is already verified.", 409)

        if verification.verification_status in ["CANCELLED", "EXPIRED"]:
            raise AuthError(
                f"Verification token is not valid. Current status: {verification.verification_status}",
                409,
            )

        now = datetime.utcnow()

        if verification.expires_at < now:
            verification.verification_status = "EXPIRED"
            db.session.commit()
            raise AuthError("Verification token has expired.", 410)

        user = User.query.get(verification.user_id)

        if not user:
            raise AuthError("User not found.", 404)

        if user.account_status == "DELETED":
            raise AuthError("Account is withdrawn.", 403)

        user.is_email_verified = True
        user.updated_at = now

        verification.verification_status = "VERIFIED"
        verification.verified_at = now

        AuthService.create_security_log(
            action_type="EMAIL_VERIFIED",
            actor_user_id=user.id,
            target_type="USER",
            target_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message=f"Email verified for user {user.email}.",
        )

        db.session.commit()

        return {
            "user": user.to_public_dict(),
            "email_verification": verification.to_public_dict(),
        }

    @staticmethod
    def resend_email_verification(data, ip_address=None, user_agent=None):
        email = (data.get("email") or "").strip().lower()

        if not email:
            raise AuthError("Email is required.", 400)

        user = User.query.filter_by(email=email).first()

        if not user:
            raise AuthError("User not found.", 404)

        if user.account_status == "DELETED":
            raise AuthError("Account is withdrawn.", 403)

        if user.is_email_verified:
            raise AuthError("Email is already verified.", 409)

        now = datetime.utcnow()
        raw_token, verification = AuthService._create_email_verification(user, now=now)

        AuthService.create_security_log(
            action_type="EMAIL_VERIFICATION_RESENT",
            actor_user_id=user.id,
            target_type="EMAIL_VERIFICATION",
            target_id=None,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message=f"Email verification token resent for user {user.email}.",
        )

        db.session.commit()

        verification_link = AuthService._build_email_verification_link(raw_token)
        email_delivery = EmailService.send_verification_email(
            user.email,
            verification_link,
        )

        return {
            "email": user.email,
            "email_verification": {
                "id": verification.id,
                "email": verification.email,
                "expires_at": verification.expires_at.isoformat(),
                "verification_link": verification_link,
                "email_delivery": email_delivery,
                "note": (
                    "Email verification link sent via SMTP."
                    if email_delivery.get("sent")
                    else "Development mode only or SMTP delivery failed. Use verification_link for testing."
                ),
            },
        }

    @staticmethod
    def login(data, ip_address=None, user_agent=None):
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not email or not password:
            raise AuthError("Email and password are required.", 400)

        user = User.query.filter_by(email=email).first()

        if not user or not verify_password(password, user.password_hash):
            AuthService.create_security_log(
                action_type="LOGIN_FAILED",
                actor_user_id=user.id if user else None,
                target_type="USER",
                target_id=user.id if user else None,
                ip_address=ip_address,
                user_agent=user_agent,
                log_message="Invalid email or password.",
            )
            db.session.commit()
            raise AuthError("Invalid email or password.", 401)

        if user.account_status != "ACTIVE":
            raise AuthError(
                f"Account is not active. Current status: {user.account_status}",
                403,
            )

        email_verification_required = os.getenv(
            "EMAIL_VERIFICATION_REQUIRED",
            "false",
        ).lower() == "true"

        if email_verification_required and not user.is_email_verified:
            raise AuthError("Email is not verified.", 403)

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

    @staticmethod
    def change_my_password(
        user,
        data,
        ip_address=None,
        user_agent=None,
    ):
        current_password = data.get("current_password") or ""
        new_password = data.get("new_password") or ""

        if not current_password:
            raise AuthError("Current password is required.", 400)

        if not new_password or len(new_password) < 8:
            raise AuthError("New password must be at least 8 characters.", 400)

        if not verify_password(current_password, user.password_hash):
            AuthService.create_security_log(
                action_type="PASSWORD_CHANGE_FAILED",
                actor_user_id=user.id,
                target_type="USER",
                target_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                log_message="Current password verification failed.",
            )
            db.session.commit()
            raise AuthError("Current password is incorrect.", 401)

        if verify_password(new_password, user.password_hash):
            raise AuthError("New password must be different from current password.", 400)

        user.password_hash = hash_password(new_password)
        user.updated_at = datetime.utcnow()

        AuthService.create_security_log(
            action_type="PASSWORD_CHANGED",
            actor_user_id=user.id,
            target_type="USER",
            target_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message="User password changed.",
        )

        db.session.commit()

        return user.to_public_dict()

    @staticmethod
    def withdraw_my_account(
        user,
        data,
        ip_address=None,
        user_agent=None,
    ):
        password = data.get("password") or ""

        if not password:
            raise AuthError("Password is required.", 400)

        if not verify_password(password, user.password_hash):
            AuthService.create_security_log(
                action_type="ACCOUNT_WITHDRAW_FAILED",
                actor_user_id=user.id,
                target_type="USER",
                target_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                log_message="Password verification failed during account withdrawal.",
            )
            db.session.commit()
            raise AuthError("Password is incorrect.", 401)

        user.account_status = "DELETED"
        user.updated_at = datetime.utcnow()

        AuthService.create_security_log(
            action_type="ACCOUNT_WITHDRAWN",
            actor_user_id=user.id,
            target_type="USER",
            target_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message="User account was deactivated by withdrawal.",
        )

        db.session.commit()

        return user.to_public_dict()

    @staticmethod
    def list_users():
        users = User.query.order_by(User.id.desc()).all()
        return [user.to_public_dict() for user in users]

    @staticmethod
    def list_signup_requests(request_status=None):
        query = SignupRequest.query.order_by(SignupRequest.id.desc())

        if request_status:
            query = query.filter_by(request_status=request_status)

        signup_requests = query.all()

        result = []

        for signup_request in signup_requests:
            user = User.query.get(signup_request.user_id)
            result.append(signup_request.to_dict(user=user))

        return result

    @staticmethod
    def approve_signup_request(
        signup_request_id,
        reviewer_user,
        ip_address=None,
        user_agent=None,
    ):
        signup_request = SignupRequest.query.get(signup_request_id)

        if not signup_request:
            raise AuthError("Signup request not found.", 404)

        if signup_request.request_status != "REQUESTED":
            raise AuthError("Signup request is already reviewed.", 409)

        user = User.query.get(signup_request.user_id)

        if not user:
            raise AuthError("Target user not found.", 404)

        now = datetime.utcnow()

        signup_request.request_status = "APPROVED"
        signup_request.reviewed_by = reviewer_user.id
        signup_request.reviewed_at = now

        user.account_status = "ACTIVE"
        user.approved_by = reviewer_user.id
        user.approved_at = now
        user.role = signup_request.requested_role

        AuthService.create_security_log(
            action_type="SIGNUP_APPROVED",
            actor_user_id=reviewer_user.id,
            target_type="USER",
            target_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message=f"Signup request approved for user {user.email}.",
        )

        db.session.commit()

        return {
            "signup_request": signup_request.to_dict(user=user),
            "user": user.to_public_dict(),
        }

    @staticmethod
    def reject_signup_request(
        signup_request_id,
        reviewer_user,
        reject_reason=None,
        ip_address=None,
        user_agent=None,
    ):
        signup_request = SignupRequest.query.get(signup_request_id)

        if not signup_request:
            raise AuthError("Signup request not found.", 404)

        if signup_request.request_status != "REQUESTED":
            raise AuthError("Signup request is already reviewed.", 409)

        user = User.query.get(signup_request.user_id)

        if not user:
            raise AuthError("Target user not found.", 404)

        now = datetime.utcnow()

        signup_request.request_status = "REJECTED"
        signup_request.reviewed_by = reviewer_user.id
        signup_request.reviewed_at = now
        signup_request.reject_reason = reject_reason

        user.account_status = "REJECTED"
        user.is_email_verified = False

        AuthService.create_security_log(
            action_type="SIGNUP_REJECTED",
            actor_user_id=reviewer_user.id,
            target_type="USER",
            target_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message=f"Signup request rejected for user {user.email}.",
        )

        db.session.commit()

        return {
            "signup_request": signup_request.to_dict(user=user),
            "user": user.to_public_dict(),
        }
