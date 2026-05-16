import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def build_database_url():
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return database_url

    host = os.getenv("DATABASE_HOST", "127.0.0.1")
    port = os.getenv("DATABASE_PORT", "3306")
    name = os.getenv("DATABASE_NAME", "staccato")
    user = os.getenv("DATABASE_USER", "staccato")
    password = os.getenv("DATABASE_PASSWORD", "")

    encoded_user = quote_plus(user)
    encoded_password = quote_plus(password)

    return (
        f"mysql+pymysql://{encoded_user}:{encoded_password}"
        f"@{host}:{port}/{name}?charset=utf8mb4"
    )


class Config:
    SERVICE_NAME = "flask-server"

    ENV = os.getenv("APP_ENV", os.getenv("FLASK_ENV", "development"))
    DEBUG = os.getenv("FLASK_DEBUG", "0").lower() in ["1", "true", "yes"]

    SECRET_KEY = os.getenv("SECRET_KEY", "local-dev-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_EXPIRES_HOURS = int(os.getenv("JWT_EXPIRES_HOURS", "12"))

    SQLALCHEMY_DATABASE_URI = build_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    AI_SERVER_URL = os.getenv("AI_SERVER_URL", "http://192.168.0.186:8001")
    LLM_SERVER_URL = os.getenv("LLM_SERVER_URL", "http://192.168.0.186:8002")
    ITS_SERVER_URL = os.getenv("ITS_SERVER_URL", "http://192.168.0.189:8002")

    FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://192.168.0.188:3000")
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
    SOCKETIO_CORS_ORIGINS = os.getenv("SOCKETIO_CORS_ORIGINS", CORS_ORIGINS)

    INTERNAL_API_TOKEN = os.getenv("INTERNAL_API_TOKEN", "")

    # === Storage Settings 수정 및 추가 ===
    STORAGE_ROOT = os.getenv("STORAGE_ROOT", str(BASE_DIR / "storage"))
    UPLOAD_BASE_PATH = os.getenv("UPLOAD_BASE_PATH", os.path.join(STORAGE_ROOT, "uploads"))
    THUMBNAIL_BASE_PATH = os.getenv("THUMBNAIL_BASE_PATH", os.path.join(STORAGE_ROOT, "thumbnails"))
    SNAPSHOT_BASE_PATH = os.getenv("SNAPSHOT_BASE_PATH", os.path.join(STORAGE_ROOT, "snapshots"))
    ANALYSIS_RESULT_BASE_PATH = os.getenv("ANALYSIS_RESULT_BASE_PATH", os.path.join(STORAGE_ROOT, "analysis-results"))

    # === File Restrictions 추가 ===
    UPLOAD_MAX_IMAGE_SIZE_MB = int(os.getenv("UPLOAD_MAX_IMAGE_SIZE_MB", "20"))
    UPLOAD_MAX_VIDEO_SIZE_MB = int(os.getenv("UPLOAD_MAX_VIDEO_SIZE_MB", "500"))

    # 리스트 형태로 변환하여 사용하기 편하게 설정
    ALLOWED_IMAGE_EXTENSIONS = os.getenv("ALLOWED_IMAGE_EXTENSIONS", "jpg,jpeg,png").split(",")
    ALLOWED_VIDEO_EXTENSIONS = os.getenv("ALLOWED_VIDEO_EXTENSIONS", "mp4,mov,avi").split(",")

    # Flask 자체 파일 업로드 용량 제한 (필요 시 설정)
    MAX_CONTENT_LENGTH = UPLOAD_MAX_VIDEO_SIZE_MB * 1024 * 1024

    # Kakao API keys
    # - KAKAO_MAP_JS_KEY: 프론트에서 Kakao Maps JavaScript SDK 로드 시 사용
    # - KAKAO_REST_API_KEY: 백엔드 서버 내부 REST API 호출용, 프론트 응답에 노출 금지
    KAKAO_MAP_JS_KEY = os.getenv("KAKAO_MAP_JS_KEY")
    KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY")
