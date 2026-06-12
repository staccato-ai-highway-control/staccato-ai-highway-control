"""Flask 애플리케이션을 로컬 또는 서버 프로세스로 실행하는 진입점.

환경 파일을 먼저 읽은 뒤 애플리케이션 팩토리와 Socket.IO 서버를 초기화한다."""

# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: pathlib에서 Path 이름을 가져와 아래 로직에서 재사용한다.
from pathlib import Path

# 설명: app에서 create_app 이름을 가져와 아래 로직에서 재사용한다.
from app import create_app
# 설명: app.extensions에서 socketio 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import socketio


# 설명: `load_local_env` 함수는 설정이나 저장 데이터를 읽어오는 함수다.
def load_local_env():
    # 설명: `env_path`에 Path(__file__).resolve().parent / '.env' 표현식의 계산 결과를 저장한다.
    env_path = Path(__file__).resolve().parent / ".env"

    # 설명: `not env_path.exists()` 조건 결과에 따라 실행 경로를 분기한다.
    if not env_path.exists():
        # 설명: 현재 함수의 처리를 종료하고 호출자에게 별도 값을 반환하지 않는다.
        return

    # 설명: `env_path.read_text(encoding='utf-8').splitlines()`의 각 항목을 `raw_line`로 받아 반복 처리한다.
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        # 설명: `line`에 `raw_line.strip` 호출 결과를 저장해 다음 처리에서 사용한다.
        line = raw_line.strip()

        # 설명: `not line or line.startswith('#') or '=' not in line` 조건 결과에 따라 실행 경로를 분기한다.
        if not line or line.startswith("#") or "=" not in line:
            # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
            continue

        # 설명: `(key, value)`에 `line.split` 호출 결과를 저장해 다음 처리에서 사용한다.
        key, value = line.split("=", 1)
        # 설명: `key`에 `key.strip` 호출 결과를 저장해 다음 처리에서 사용한다.
        key = key.strip()
        # 설명: `value`에 `value.strip().strip('"').strip` 호출 결과를 저장해 다음 처리에서 사용한다.
        value = value.strip().strip('"').strip("'")

        # 설명: `key` 조건 결과에 따라 실행 경로를 분기한다.
        if key:
            # 설명: `os.environ.setdefault`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            os.environ.setdefault(key, value)


# 설명: `load_local_env`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
load_local_env()

# 설명: `app`에 `create_app` 호출 결과를 저장해 다음 처리에서 사용한다.
app = create_app()

# 설명: 파일을 직접 실행한 경우에만 개발용 Socket.IO 서버를 시작한다.
if __name__ == "__main__":
    # 설명: `port`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
    port = int(os.getenv("FLASK_RUN_PORT") or os.getenv("PORT", "5000"))

    # 설명: `socketio.run`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    socketio.run(
        app,
        host="0.0.0.0",
        port=port,
        debug=True,
        use_reloader=False,
        allow_unsafe_werkzeug=True,
    )
