"""bug report 기능의 Flask 모듈 패키지.

라우트와 비즈니스 로직의 import 경계를 제공하며 초기화 부작용은 최소화한다."""

# 설명: app.modules.bug_report.routes에서 bug_report_bp 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.bug_report.routes import bug_report_bp


# 설명: `__all__`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
__all__ = ["bug_report_bp"]
