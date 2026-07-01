"""보안 로그 전용 API 모듈."""

from app.modules.security_logs.routes import security_logs_bp

__all__ = ["security_logs_bp"]
