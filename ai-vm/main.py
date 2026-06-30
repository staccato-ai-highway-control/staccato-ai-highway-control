# 역할: FastAPI 애플리케이션을 uvicorn으로 실행하는 서버 진입점입니다.
import os

import uvicorn

from app.main import app


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5001"))
    host = os.environ.get("AI_VM_HOST", "127.0.0.1")
    uvicorn.run("app.main:app", host=host, port=port)
