from datetime import datetime, timedelta
import hashlib
import json
import os
import re
import secrets
import urllib.error
import urllib.parse
import urllib.request

from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.modules.auth.email_service import EmailService
from app.models.auth_models import EmailVerification, IdentityOAuthState, SecurityLog, SignupRequest, User
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
    def _hash_oauth_state(raw_state):
        return hashlib.sha256(raw_state.encode("utf-8")).hexdigest()

    @staticmethod
    def _build_identity_result_redirect(provider, status, message=None):
        base_url = AuthService._get_frontend_base_url()
        query = {
            "identity": provider,
            "status": status,
        }

        if message:
            query["message"] = message

        return f"{base_url}/pending-approval?{urllib.parse.urlencode(query)}"

    @staticmethod
    def _get_google_oauth_config():
        enabled = os.getenv("GOOGLE_IDENTITY_ENABLED", "false").lower() == "true"
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")

        if not enabled:
            raise AuthError("Google identity verification is disabled.", 503)

        if not client_id or not client_secret or not redirect_uri:
            raise AuthError("Google OAuth is not configured.", 500)

        return {
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
        }

    @staticmethod
    def _exchange_google_code_for_token(code):
        config = AuthService._get_google_oauth_config()

        payload = urllib.parse.urlencode({
            "code": code,
            "client_id": config["client_id"],
            "client_secret": config["client_secret"],
            "redirect_uri": config["redirect_uri"],
            "grant_type": "authorization_code",
        }).encode("utf-8")

        req = urllib.request.Request(
            "https://oauth2.googleapis.com/token",
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as res:
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise AuthError(f"Google token exchange failed: {detail}", 502)
        except Exception as error:
            raise AuthError(f"Google token exchange failed: {error}", 502)

    @staticmethod
    def _fetch_google_userinfo(access_token):
        req = urllib.request.Request(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            method="GET",
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as res:
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise AuthError(f"Google userinfo request failed: {detail}", 502)
        except Exception as error:
            raise AuthError(f"Google userinfo request failed: {error}", 502)

    @staticmethod
    def _get_frontend_base_url():
        return os.getenv("FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")


    @staticmethod
    def _create_email_verification(user, now=None):
        now = now or datetime.utcnow()

        pending_verifications = EmailVerification.query.filter_by(
            user_id=user.id,
            verification_status="PENDING",
        ).all()

        for verification in pending_verifications:
            verification.verification_status = "CANCELLED"

        raw_token = f"{secrets.randbelow(1000000):06d}"
        token_hash = AuthService._hash_email_token(raw_token)

        verification = EmailVerification(
            user_id=user.id,
            email=user.email,
            verification_token=token_hash,
            verification_status="PENDING",
            expires_at=now + timedelta(minutes=10),
            created_at=now,
        )

        db.session.add(verification)

        return raw_token, verification

    @staticmethod
    def signup(data, ip_address=None, user_agent=None):
        login_id = (
            data.get("login_id")
            or data.get("loginId")
            or ""
        ).strip().lower()
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        name = (data.get("name") or "").strip()
        phone = (data.get("phone") or "").strip() or None
        requested_role = data.get("requested_role") or "VIEWER"

        if not login_id:
            raise AuthError("Login ID is required.", 400)

        if not re.fullmatch(r"[a-z0-9_-]{4,20}", login_id):
            raise AuthError(
                "Login ID must be 4-20 characters and contain only lowercase letters, numbers, underscores, or hyphens.",
                400,
            )

        if "@" in login_id:
            raise AuthError("Login ID cannot be an email address.", 400)

        if not email:
            raise AuthError("Email is required.", 400)

        if not password or len(password) < 8:
            raise AuthError("Password must be at least 8 characters.", 400)

        if not name:
            raise AuthError("Name is required.", 400)

        existing_login_id = User.query.filter_by(login_id=login_id).first()

        if existing_login_id:
            raise AuthError("Login ID already exists.", 409)

        existing_user = User.query.filter_by(email=email).first()

        if existing_user:
            raise AuthError("Email already exists.", 409)

        now = datetime.utcnow()

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
        email_delivery = EmailService.send_verification_email(
            user.email,
            raw_token,
        )

        return {
            "user": user.to_public_dict(),
            "signup_request_id": signup_request.id,
            "email_verification": {
                "id": verification.id,
                "email": verification.email,
                "expires_at": verification.expires_at.isoformat(),
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

    @staticmethod
    def verify_email(data, ip_address=None, user_agent=None):
        data = data or {}

        raw_code = (
            data.get("code")
            or data.get("verification_code")
            or data.get("token")
            or ""
        ).strip()

        email = (data.get("email") or "").strip().lower()

        if not raw_code:
            raise AuthError("Verification code is required.", 400)

        if not raw_code.isdigit() or len(raw_code) != 6:
            raise AuthError("Verification code must be 6 digits.", 400)

        if not email:
            raise AuthError("Email is required.", 400)

        token_hash = AuthService._hash_email_token(raw_code)

        verification = EmailVerification.query.filter_by(
            email=email,
            verification_token=token_hash,
        ).first()

        if not verification:
            raise AuthError("Invalid verification code.", 404)

        if verification.verification_status == "VERIFIED":
            raise AuthError("Email is already verified.", 409)

        if verification.verification_status in ["CANCELLED", "EXPIRED"]:
            raise AuthError(
                f"Verification code is not valid. Current status: {verification.verification_status}",
                409,
            )

        now = datetime.utcnow()

        if verification.expires_at < now:
            verification.verification_status = "EXPIRED"
            db.session.commit()
            raise AuthError("Verification code has expired.", 410)

        user = db.session.get(User, verification.user_id)

        if not user:
            raise AuthError("User not found.", 404)

        if user.account_status == "DELETED":
            raise AuthError("Account is withdrawn.", 403)

        user.is_email_verified = True
        user.identity_provider = "EMAIL"
        user.identity_provider_user_id = None
        user.identity_verified_at = now
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
        email_delivery = EmailService.send_verification_email(
            user.email,
            raw_token,
        )

        return {
            "email": user.email,
            "email_verification": {
                "id": verification.id,
                "email": verification.email,
                "expires_at": verification.expires_at.isoformat(),
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

    @staticmethod
    def start_google_identity_verification(data, ip_address=None, user_agent=None):
        config = AuthService._get_google_oauth_config()

        email = (data.get("email") or "").strip().lower()

        if not email:
            raise AuthError("Email is required.", 400)

        user = User.query.filter_by(email=email).first()

        if not user:
            raise AuthError("User not found. Please sign up first.", 404)

        if user.account_status == "DELETED":
            raise AuthError("Account is withdrawn.", 403)

        if user.is_email_verified:
            raise AuthError("Identity is already verified.", 409)

        now = datetime.utcnow()

        pending_states = IdentityOAuthState.query.filter_by(
            provider="GOOGLE",
            target_email=email,
            status="PENDING",
        ).all()

        for pending_state in pending_states:
            if pending_state.expires_at < now:
                pending_state.status = "EXPIRED"
            else:
                pending_state.status = "CANCELLED"

        expires_minutes = int(os.getenv("GOOGLE_OAUTH_STATE_EXPIRES_MINUTES", "10"))

        raw_state = secrets.token_urlsafe(32)
        state_hash = AuthService._hash_oauth_state(raw_state)

        oauth_state = IdentityOAuthState(
            provider="GOOGLE",
            target_email=email,
            state_hash=state_hash,
            status="PENDING",
            expires_at=now + timedelta(minutes=expires_minutes),
            created_at=now,
        )

        db.session.add(oauth_state)

        AuthService.create_security_log(
            action_type="GOOGLE_IDENTITY_STARTED",
            actor_user_id=user.id,
            target_type="USER",
            target_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message=f"Google identity verification started for user {user.email}.",
        )

        db.session.commit()

        query = urllib.parse.urlencode({
            "client_id": config["client_id"],
            "redirect_uri": config["redirect_uri"],
            "response_type": "code",
            "scope": "openid email profile",
            "state": raw_state,
            "include_granted_scopes": "true",
        })

        authorization_url = f"https://accounts.google.com/o/oauth2/v2/auth?{query}"

        return {
            "provider": "GOOGLE",
            "email": email,
            "authorization_url": authorization_url,
            "expires_at": oauth_state.expires_at.isoformat(),
        }

    @staticmethod
    def complete_google_identity_verification(args, ip_address=None, user_agent=None):
        code = (args.get("code") or "").strip()
        raw_state = (args.get("state") or "").strip()

        if not code:
            raise AuthError("Google authorization code is required.", 400)

        if not raw_state:
            raise AuthError("OAuth state is required.", 400)

        state_hash = AuthService._hash_oauth_state(raw_state)

        oauth_state = IdentityOAuthState.query.filter_by(
            provider="GOOGLE",
            state_hash=state_hash,
        ).first()

        if not oauth_state:
            raise AuthError("Invalid OAuth state.", 404)

        now = datetime.utcnow()

        if oauth_state.status != "PENDING":
            raise AuthError(f"OAuth state is not valid. Current status: {oauth_state.status}", 409)

        if oauth_state.expires_at < now:
            oauth_state.status = "EXPIRED"
            db.session.commit()
            raise AuthError("OAuth state has expired.", 410)

        user = User.query.filter_by(email=oauth_state.target_email).first()

        if not user:
            raise AuthError("User not found.", 404)

        if user.account_status == "DELETED":
            raise AuthError("Account is withdrawn.", 403)

        token_response = AuthService._exchange_google_code_for_token(code)
        access_token = token_response.get("access_token")

        if not access_token:
            raise AuthError("Google access token was not returned.", 502)

        google_user = AuthService._fetch_google_userinfo(access_token)

        google_sub = (google_user.get("sub") or "").strip()
        google_email = (google_user.get("email") or "").strip().lower()
        email_verified_raw = google_user.get("email_verified")

        email_verified = str(email_verified_raw).lower() in ["true", "1"]

        if not google_sub:
            raise AuthError("Google account identifier was not returned.", 502)

        if not google_email:
            raise AuthError("Google email was not returned.", 502)

        if not email_verified:
            raise AuthError("Google email is not verified.", 403)

        if google_email != user.email.lower():
            raise AuthError("Google email does not match signup email.", 409)

        user.is_email_verified = True
        user.identity_provider = "GOOGLE"
        user.identity_provider_user_id = google_sub
        user.identity_verified_at = now
        user.updated_at = now

        oauth_state.status = "USED"
        oauth_state.used_at = now

        AuthService.create_security_log(
            action_type="GOOGLE_IDENTITY_VERIFIED",
            actor_user_id=user.id,
            target_type="USER",
            target_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            log_message=f"Google identity verified for user {user.email}.",
        )

        db.session.commit()

        return {
            "user": user.to_public_dict(),
            "redirect_url": AuthService._build_identity_result_redirect(
                provider="google",
                status="verified",
            ),
        }

    @staticmethod
    def login(data, ip_address=None, user_agent=None):
        login_id = (
            data.get("login_id")
            or data.get("loginId")
            or data.get("identifier")
            or data.get("email")
            or ""
        ).strip().lower()
        password = data.get("password") or ""

        if not login_id or not password:
            raise AuthError("Login ID and password are required.", 400)

        user = User.query.filter_by(login_id=login_id).first()

        if not user or not verify_password(password, user.password_hash):
            AuthService.create_security_log(
                action_type="LOGIN_FAILED",
                actor_user_id=user.id if user else None,
                target_type="USER",
                target_id=user.id if user else None,
                ip_address=ip_address,
                user_agent=user_agent,
                log_message="Invalid login ID or password.",
            )
            db.session.commit()
            raise AuthError("아이디 또는 비밀번호가 올바르지 않습니다.", 401)

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
            user = db.session.get(User, signup_request.user_id)
            result.append(signup_request.to_dict(user=user))

        return result

    @staticmethod
    def approve_signup_request(
        signup_request_id,
        reviewer_user,
        ip_address=None,
        user_agent=None,
    ):
        signup_request = db.session.get(SignupRequest, signup_request_id)

        if not signup_request:
            raise AuthError("Signup request not found.", 404)

        if signup_request.request_status != "REQUESTED":
            raise AuthError("Signup request is already reviewed.", 409)

        user = db.session.get(User, signup_request.user_id)

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
        signup_request = db.session.get(SignupRequest, signup_request_id)

        if not signup_request:
            raise AuthError("Signup request not found.", 404)

        if signup_request.request_status != "REQUESTED":
            raise AuthError("Signup request is already reviewed.", 409)

        user = db.session.get(User, signup_request.user_id)

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
