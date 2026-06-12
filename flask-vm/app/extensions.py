"""Flask 확장 객체를 선언하고 애플리케이션에 연결한다.

데이터베이스, CORS, Socket.IO 등 프로세스 전역 확장의 초기화 순서를 관리한다."""

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations

# 설명: json 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import json
# 설명: collections.abc에서 Iterable 이름을 가져와 아래 로직에서 재사용한다.
from collections.abc import Iterable

# 설명: flask_cors에서 CORS 이름을 가져와 아래 로직에서 재사용한다.
from flask_cors import CORS
# 설명: flask_sqlalchemy에서 SQLAlchemy 이름을 가져와 아래 로직에서 재사용한다.
from flask_sqlalchemy import SQLAlchemy
# 설명: flask_migrate에서 Migrate 이름을 가져와 아래 로직에서 재사용한다.
from flask_migrate import Migrate
# 설명: flask_socketio에서 SocketIO 이름을 가져와 아래 로직에서 재사용한다.
from flask_socketio import SocketIO


# 설명: `db`에 `SQLAlchemy` 호출 결과를 저장해 다음 처리에서 사용한다.
db = SQLAlchemy()
# 설명: `migrate`에 `Migrate` 호출 결과를 저장해 다음 처리에서 사용한다.
migrate = Migrate()
# 설명: `socketio`에 `SocketIO` 호출 결과를 저장해 다음 처리에서 사용한다.
socketio = SocketIO(
    cors_allowed_origins=[
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://192.168.0.188:3001"
    ]
)

# 설명: `_normalize_cors_origins` 함수는 입력 값을 일관된 형식으로 정규화하는 함수다.
def _normalize_cors_origins(value, fallback="*"):
    """
    Normalize CORS origin config for Flask-CORS and Flask-SocketIO.

    Supported inputs:
    - "*"
    - "http://localhost:3000,http://192.168.0.188:3000"
    - ["http://localhost:3000", "http://192.168.0.188:3000"]
    - tuple/set equivalents
    - JSON list string: '["http://localhost:3000"]'

    Empty values fall back to fallback.
    If "*" is included anywhere, wildcard is used.
    """
    # 설명: `value is None` 조건 결과에 따라 실행 경로를 분기한다.
    if value is None:
        # 설명: `value`에 fallback 표현식의 계산 결과를 저장한다.
        value = fallback

    # 설명: `isinstance(value, str)` 조건 결과에 따라 실행 경로를 분기한다.
    if isinstance(value, str):
        # 설명: `raw`에 `value.strip` 호출 결과를 저장해 다음 처리에서 사용한다.
        raw = value.strip()

        # 설명: `not raw` 조건 결과에 따라 실행 경로를 분기한다.
        if not raw:
            # 설명: `raw`에 str(fallback).strip() if fallback is not None else '' 표현식의 계산 결과를 저장한다.
            raw = str(fallback).strip() if fallback is not None else ""

        # 설명: `raw == '*'` 조건 결과에 따라 실행 경로를 분기한다.
        if raw == "*":
            # 설명: 호출자에게 '*' 값을 함수 결과로 반환한다.
            return "*"

        # 설명: `parsed`의 기준값 또는 기본값을 None로 설정한다.
        parsed = None
        # 설명: `raw.startswith('[') and raw.endswith(']')` 조건 결과에 따라 실행 경로를 분기한다.
        if raw.startswith("[") and raw.endswith("]"):
            # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
            try:
                # 설명: `parsed`에 `json.loads` 호출 결과를 저장해 다음 처리에서 사용한다.
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                # 설명: `parsed`의 기준값 또는 기본값을 None로 설정한다.
                parsed = None

        # 설명: `isinstance(parsed, list)` 조건 결과에 따라 실행 경로를 분기한다.
        if isinstance(parsed, list):
            # 설명: `candidates`에 parsed 표현식의 계산 결과를 저장한다.
            candidates = parsed
        else:
            # 설명: `candidates`에 `raw.split` 호출 결과를 저장해 다음 처리에서 사용한다.
            candidates = raw.split(",")

    # 설명: `isinstance(value, Iterable)` 조건 결과에 따라 실행 경로를 분기한다.
    elif isinstance(value, Iterable):
        # 설명: `candidates`에 `list` 호출 결과를 저장해 다음 처리에서 사용한다.
        candidates = list(value)

    else:
        # 설명: `candidates`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        candidates = [value]

    # 설명: `origins`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    origins = []
    # 설명: `candidates`의 각 항목을 `origin`로 받아 반복 처리한다.
    for origin in candidates:
        # 설명: `origin is None` 조건 결과에 따라 실행 경로를 분기한다.
        if origin is None:
            # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
            continue

        # 설명: `cleaned`에 `str(origin).strip` 호출 결과를 저장해 다음 처리에서 사용한다.
        cleaned = str(origin).strip()

        # 설명: `not cleaned` 조건 결과에 따라 실행 경로를 분기한다.
        if not cleaned:
            # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
            continue

        # 설명: `cleaned == '*'` 조건 결과에 따라 실행 경로를 분기한다.
        if cleaned == "*":
            # 설명: 호출자에게 '*' 값을 함수 결과로 반환한다.
            return "*"

        # 설명: `origins.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
        origins.append(cleaned.rstrip("/"))

    # 설명: `not origins` 조건 결과에 따라 실행 경로를 분기한다.
    if not origins:
        # 설명: 호출자에게 fallback if fallback else [] 값을 함수 결과로 반환한다.
        return fallback if fallback else []

    # 설명: 호출자에게 origins 값을 함수 결과로 반환한다.
    return origins


# 설명: `init_extensions` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def init_extensions(app):
    # 설명: `cors_origins`에 `_normalize_cors_origins` 호출 결과를 저장해 다음 처리에서 사용한다.
    cors_origins = _normalize_cors_origins(
        app.config.get("CORS_ORIGINS"),
        fallback="*",
    )
    # 설명: `socketio_cors_origins`에 `_normalize_cors_origins` 호출 결과를 저장해 다음 처리에서 사용한다.
    socketio_cors_origins = _normalize_cors_origins(
        app.config.get("SOCKETIO_CORS_ORIGINS"),
        fallback=cors_origins,
    )

    # 설명: `CORS`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    CORS(
        app,
        resources={
            r"/*": {
                "origins": cors_origins,
            }
        },
        supports_credentials=False,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    # 설명: `db.init_app`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    db.init_app(app)
    # 설명: `migrate.init_app`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    migrate.init_app(app, db)
    # 설명: `socketio.init_app`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    socketio.init_app(app, cors_allowed_origins=socketio_cors_origins)
