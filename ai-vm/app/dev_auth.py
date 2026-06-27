# 역할: 개발/연동용 로그인과 Bearer 토큰 응답을 처리합니다.
from .config import DEV_ACCESS_TOKEN, DEV_LOGIN_ID, DEV_PASSWORD


# is_valid_dev_login 기능을 수행하는 함수입니다.
def is_valid_dev_login(login_id: str, password: str) -> bool:
    return login_id == DEV_LOGIN_ID and password == DEV_PASSWORD


# get_dev_auth_response 기능을 수행하는 함수입니다.
def get_dev_auth_response() -> dict:
    return {
        "success": True,
        "data": {
            "access_token": DEV_ACCESS_TOKEN,
            "token_type": "bearer",
            "user": {
                "id": "dev-admin",
                "login_id": DEV_LOGIN_ID,
                "email": "admin@staccato.local",
                "name": "Dev Admin",
                "role": "SUPER_ADMIN",
                "account_status": "ACTIVE",
                "is_email_verified": True,
            },
        },
    }


# expected_authorization_header 기능을 수행하는 함수입니다.
def expected_authorization_header() -> str:
    return f"Bearer {DEV_ACCESS_TOKEN}"

