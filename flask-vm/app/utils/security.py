"""security 관련 공통 변환과 검증 기능을 제공한다.

라우트와 서비스가 동일한 입력 규칙 및 응답 계약을 재사용하도록 돕는다."""

# 설명: datetime에서 datetime, timedelta 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime, timedelta
# 설명: functools에서 wraps 이름을 가져와 아래 로직에서 재사용한다.
from functools import wraps

# 설명: jwt 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import jwt
# 설명: flask에서 current_app, jsonify, request 이름을 가져와 아래 로직에서 재사용한다.
from flask import current_app, jsonify, request
# 설명: werkzeug.security에서 check_password_hash, generate_password_hash 이름을 가져와 아래 로직에서 재사용한다.
from werkzeug.security import check_password_hash, generate_password_hash


# 설명: `hash_password` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def hash_password(password: str) -> str:
    # 설명: 호출자에게 generate_password_hash(password) 값을 함수 결과로 반환한다.
    return generate_password_hash(password)


# 설명: `verify_password` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def verify_password(password: str, password_hash: str) -> bool:
    # 설명: 호출자에게 check_password_hash(password_hash, password) 값을 함수 결과로 반환한다.
    return check_password_hash(password_hash, password)


# 설명: `create_access_token` 함수는 새 데이터나 리소스를 생성하는 함수다.
def create_access_token(user) -> str:
    # 설명: `expires_hours`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
    expires_hours = int(current_app.config.get("JWT_EXPIRES_HOURS", 12))
    # 설명: `now`에 `datetime.utcnow` 호출 결과를 저장해 다음 처리에서 사용한다.
    now = datetime.utcnow()

    # 설명: `payload`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "iat": now,
        "exp": now + timedelta(hours=expires_hours),
    }

    # 설명: 호출자에게 jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256') 값을 함수 결과로 반환한다.
    return jwt.encode(
        payload,
        current_app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )


# 설명: `decode_access_token` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def decode_access_token(token: str) -> dict:
    # 설명: 호출자에게 jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256']) 값을 함수 결과로 반환한다.
    return jwt.decode(
        token,
        current_app.config["JWT_SECRET_KEY"],
        algorithms=["HS256"],
    )


# 설명: `get_bearer_token` 함수는 단일 값이나 리소스를 조회하는 함수다.
def get_bearer_token():
    # 설명: `authorization`에 `request.headers.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    authorization = request.headers.get("Authorization", "")

    # 설명: `not authorization.startswith('Bearer ')` 조건 결과에 따라 실행 경로를 분기한다.
    if not authorization.startswith("Bearer "):
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: 호출자에게 authorization.replace('Bearer ', '', 1).strip() 값을 함수 결과로 반환한다.
    return authorization.replace("Bearer ", "", 1).strip()


# 설명: `require_auth` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def require_auth(fn):
    # 설명: `wrapper` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @wraps(fn)
    def wrapper(*args, **kwargs):
        # 설명: app.models.auth_models에서 User 이름을 가져와 아래 로직에서 재사용한다.
        from app.models.auth_models import User

        # 설명: `token`에 `get_bearer_token` 호출 결과를 저장해 다음 처리에서 사용한다.
        token = get_bearer_token()

        # 설명: `not token` 조건 결과에 따라 실행 경로를 분기한다.
        if not token:
            # 설명: 호출자에게 (jsonify({'message': 'Authorization token is required.'}), 401) 값을 함수 결과로 반환한다.
            return jsonify({"message": "Authorization token is required."}), 401

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `payload`에 `decode_access_token` 호출 결과를 저장해 다음 처리에서 사용한다.
            payload = decode_access_token(token)
            # 설명: `user_id`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
            user_id = int(payload["sub"])
            # 설명: `user`에 `User.query.get` 호출 결과를 저장해 다음 처리에서 사용한다.
            user = User.query.get(user_id)
        except Exception:
            # 설명: 호출자에게 (jsonify({'message': 'Invalid or expired token.'}), 401) 값을 함수 결과로 반환한다.
            return jsonify({"message": "Invalid or expired token."}), 401

        # 설명: `not user` 조건 결과에 따라 실행 경로를 분기한다.
        if not user:
            # 설명: 호출자에게 (jsonify({'message': 'User not found.'}), 404) 값을 함수 결과로 반환한다.
            return jsonify({"message": "User not found."}), 404

        # 설명: `user.account_status != 'ACTIVE'` 조건 결과에 따라 실행 경로를 분기한다.
        if user.account_status != "ACTIVE":
            # 설명: 호출자에게 (jsonify({'message': 'Account is not active.'}), 403) 값을 함수 결과로 반환한다.
            return jsonify({"message": "Account is not active."}), 403

        # 설명: `request.current_user`에 user 표현식의 계산 결과를 저장한다.
        request.current_user = user

        # 설명: 호출자에게 fn(*args, **kwargs) 값을 함수 결과로 반환한다.
        return fn(*args, **kwargs)

    # 설명: 호출자에게 wrapper 값을 함수 결과로 반환한다.
    return wrapper


# 설명: `require_roles` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def require_roles(*allowed_roles):
    # 설명: `decorator` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def decorator(fn):
        # 설명: `wrapper` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
        @wraps(fn)
        @require_auth
        def wrapper(*args, **kwargs):
            # 설명: `user`에 request.current_user 표현식의 계산 결과를 저장한다.
            user = request.current_user

            # 설명: `user.role not in allowed_roles` 조건 결과에 따라 실행 경로를 분기한다.
            if user.role not in allowed_roles:
                # 설명: 호출자에게 (jsonify({'message': 'Permission denied.'}), 403) 값을 함수 결과로 반환한다.
                return jsonify({"message": "Permission denied."}), 403

            # 설명: 호출자에게 fn(*args, **kwargs) 값을 함수 결과로 반환한다.
            return fn(*args, **kwargs)

        # 설명: 호출자에게 wrapper 값을 함수 결과로 반환한다.
        return wrapper

    # 설명: 호출자에게 decorator 값을 함수 결과로 반환한다.
    return decorator
