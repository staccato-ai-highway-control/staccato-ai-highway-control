"""dashboard 기능의 Flask 모듈 패키지.

라우트와 비즈니스 로직의 import 경계를 제공하며 초기화 부작용은 최소화한다."""

# 설명: flask에서 Blueprint 이름을 가져와 아래 로직에서 재사용한다.
from flask import Blueprint


# 설명: `dashboard_bp`에 `Blueprint` 호출 결과를 저장해 다음 처리에서 사용한다.
dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")

# 설명: 상대 패키지에서 routes 이름을 가져와 아래 로직에서 재사용한다.
from . import routes  # noqa: E402,F401
