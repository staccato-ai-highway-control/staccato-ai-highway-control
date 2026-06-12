"""socketio 기능의 Flask 모듈 패키지.

라우트와 비즈니스 로직의 import 경계를 제공하며 초기화 부작용은 최소화한다."""

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations

# Importing events registers Socket.IO handlers via decorators.
from app.modules.socketio import events  # noqa: F401
