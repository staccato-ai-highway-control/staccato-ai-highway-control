"""dashboard 도메인의 핵심 비즈니스 규칙과 데이터 처리를 구현한다.

권한 검증, 트랜잭션 경계, 외부 연동 및 응답 직렬화를 라우트와 분리해 관리한다."""

# 설명: sqlalchemy에서 or_ 이름을 가져와 아래 로직에서 재사용한다.
from sqlalchemy import or_

# 설명: app.models에서 Notification, SignupRequest, User 이름을 가져와 아래 로직에서 재사용한다.
from app.models import Notification, SignupRequest, User


# 설명: `SUPER_ADMIN_ROLE`의 기준값 또는 기본값을 'SUPER_ADMIN'로 설정한다.
SUPER_ADMIN_ROLE = "SUPER_ADMIN"
# 설명: `PENDING_SIGNUP_STATUSES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
PENDING_SIGNUP_STATUSES = ("REQUESTED", "PENDING")


# 설명: `get_dashboard_summary` 함수는 단일 값이나 리소스를 조회하는 함수다.
def get_dashboard_summary(current_user):
    # 설명: `users_summary`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    users_summary = {
        "total": None,
        "pending_signup": None,
    }

    # 설명: `current_user.role == SUPER_ADMIN_ROLE` 조건 결과에 따라 실행 경로를 분기한다.
    if current_user.role == SUPER_ADMIN_ROLE:
        # 설명: `users_summary`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        users_summary = {
            "total": User.query.count(),
            "pending_signup": SignupRequest.query.filter(
                SignupRequest.request_status.in_(PENDING_SIGNUP_STATUSES)
            ).count(),
        }

    # 설명: `unread_count`에 `Notification.query.filter(Notification.user_id == current_user.id, ...` 호출 결과를 저장해 다음 처리에서 사용한다.
    unread_count = Notification.query.filter(
        Notification.user_id == current_user.id,
        or_(Notification.is_read == 0, Notification.is_read.is_(False)),
    ).count()

    # 설명: 호출자에게 {'users': users_summary, 'notifications': {'unread_count': unread_count}} 값을 함수 결과로 반환한다.
    return {
        "users": users_summary,
        "notifications": {
            "unread_count": unread_count,
        },
    }
