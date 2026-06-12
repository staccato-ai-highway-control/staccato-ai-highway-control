"""실행 환경에서 사용하는 Flask 설정과 데이터베이스 연결 정보를 정의한다.

환경 변수를 기본값과 함께 정규화하여 애플리케이션 팩토리에 제공한다."""

# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: pathlib에서 Path 이름을 가져와 아래 로직에서 재사용한다.
from pathlib import Path
# 설명: urllib.parse에서 quote_plus 이름을 가져와 아래 로직에서 재사용한다.
from urllib.parse import quote_plus

# 설명: dotenv에서 load_dotenv 이름을 가져와 아래 로직에서 재사용한다.
from dotenv import load_dotenv

# 설명: `BASE_DIR`에 Path(__file__).resolve().parent.parent 표현식의 계산 결과를 저장한다.
BASE_DIR = Path(__file__).resolve().parent.parent
# 설명: `load_dotenv`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
load_dotenv(BASE_DIR / ".env")


# 설명: `build_database_url` 함수는 후속 처리에 사용할 구조를 조립하는 함수다.
def build_database_url():
    # 설명: `database_url`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    database_url = os.getenv("DATABASE_URL")
    # 설명: `database_url` 조건 결과에 따라 실행 경로를 분기한다.
    if database_url:
        # 설명: 호출자에게 database_url 값을 함수 결과로 반환한다.
        return database_url

    # 설명: `host`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    host = os.getenv("DATABASE_HOST", "127.0.0.1")
    # 설명: `port`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    port = os.getenv("DATABASE_PORT", "3306")
    # 설명: `name`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    name = os.getenv("DATABASE_NAME", "staccato")
    # 설명: `user`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    user = os.getenv("DATABASE_USER", "staccato")
    # 설명: `password`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    password = os.getenv("DATABASE_PASSWORD", "")

    # 설명: `encoded_user`에 `quote_plus` 호출 결과를 저장해 다음 처리에서 사용한다.
    encoded_user = quote_plus(user)
    # 설명: `encoded_password`에 `quote_plus` 호출 결과를 저장해 다음 처리에서 사용한다.
    encoded_password = quote_plus(password)

    # 설명: 호출자에게 f'mysql+pymysql://{encoded_user}:{encoded_password}@{host}:{port}/{name}?charse... 값을 함수 결과로 반환한다.
    return (
        f"mysql+pymysql://{encoded_user}:{encoded_password}"
        f"@{host}:{port}/{name}?charset=utf8mb4"
    )


# 설명: `Config` 클래스를 정의하고 기본 object의 동작 또는 계약을 확장한다.
class Config:
    # 설명: `SERVICE_NAME`의 기준값 또는 기본값을 'flask-server'로 설정한다.
    SERVICE_NAME = "flask-server"

    # 설명: `ENV`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    ENV = os.getenv("APP_ENV", os.getenv("FLASK_ENV", "development"))
    # 설명: `DEBUG`에 os.getenv('FLASK_DEBUG', '0').lower() in ['1', 'true', 'yes'] 표현식의 계산 결과를 저장한다.
    DEBUG = os.getenv("FLASK_DEBUG", "0").lower() in ["1", "true", "yes"]

    # 설명: `SECRET_KEY`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    SECRET_KEY = os.getenv("SECRET_KEY", "local-dev-secret-key")
    # 설명: `JWT_SECRET_KEY`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    # 설명: `JWT_EXPIRES_HOURS`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
    JWT_EXPIRES_HOURS = int(os.getenv("JWT_EXPIRES_HOURS", "12"))

    # 설명: `SQLALCHEMY_DATABASE_URI`에 `build_database_url` 호출 결과를 저장해 다음 처리에서 사용한다.
    SQLALCHEMY_DATABASE_URI = build_database_url()
    # 설명: `SQLALCHEMY_TRACK_MODIFICATIONS`의 기준값 또는 기본값을 False로 설정한다.
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # 설명: `AI_SERVER_URL`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    AI_SERVER_URL = os.getenv("AI_SERVER_URL", "http://192.168.0.186:5001")
    # 설명: `ITS_SERVER_URL`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    ITS_SERVER_URL = os.getenv("ITS_SERVER_URL", "")

    # 설명: `FRONTEND_BASE_URL`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://192.168.0.188:3000")
    # 설명: `CORS_ORIGINS`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
    # 설명: `SOCKETIO_CORS_ORIGINS`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    SOCKETIO_CORS_ORIGINS = os.getenv("SOCKETIO_CORS_ORIGINS", CORS_ORIGINS)

    # 설명: `INTERNAL_API_TOKEN`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    INTERNAL_API_TOKEN = os.getenv("INTERNAL_API_TOKEN", "")

    # === Storage Settings 수정 및 추가 ===
    STORAGE_ROOT = os.getenv("STORAGE_ROOT", str(BASE_DIR / "storage"))
    # 설명: `UPLOAD_BASE_PATH`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    UPLOAD_BASE_PATH = os.getenv("UPLOAD_BASE_PATH", os.path.join(STORAGE_ROOT, "uploads"))
    # 설명: `THUMBNAIL_BASE_PATH`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    THUMBNAIL_BASE_PATH = os.getenv("THUMBNAIL_BASE_PATH", os.path.join(STORAGE_ROOT, "thumbnails"))
    # 설명: `SNAPSHOT_BASE_PATH`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    SNAPSHOT_BASE_PATH = os.getenv("SNAPSHOT_BASE_PATH", os.path.join(STORAGE_ROOT, "snapshots"))
    # 설명: `ANALYSIS_RESULT_BASE_PATH`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    ANALYSIS_RESULT_BASE_PATH = os.getenv("ANALYSIS_RESULT_BASE_PATH", os.path.join(STORAGE_ROOT, "analysis-results"))

    # === File Restrictions 추가 ===
    UPLOAD_MAX_IMAGE_SIZE_MB = int(os.getenv("UPLOAD_MAX_IMAGE_SIZE_MB", "20"))
    # 설명: `UPLOAD_MAX_VIDEO_SIZE_MB`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
    UPLOAD_MAX_VIDEO_SIZE_MB = int(os.getenv("UPLOAD_MAX_VIDEO_SIZE_MB", "500"))

    # 리스트 형태로 변환하여 사용하기 편하게 설정
    ALLOWED_IMAGE_EXTENSIONS = os.getenv("ALLOWED_IMAGE_EXTENSIONS", "jpg,jpeg,png").split(",")
    # 설명: `ALLOWED_VIDEO_EXTENSIONS`에 `os.getenv('ALLOWED_VIDEO_EXTENSIONS', 'mp4,mov,avi').split` 호출 결과를 저장해 다음 처리에서 사용한다.
    ALLOWED_VIDEO_EXTENSIONS = os.getenv("ALLOWED_VIDEO_EXTENSIONS", "mp4,mov,avi").split(",")

    # Flask 자체 파일 업로드 용량 제한 (필요 시 설정)
    MAX_CONTENT_LENGTH = UPLOAD_MAX_VIDEO_SIZE_MB * 1024 * 1024

    # Kakao API keys
    # - KAKAO_MAP_JS_KEY: 프론트에서 Kakao Maps JavaScript SDK 로드 시 사용
    # - KAKAO_REST_API_KEY: 백엔드 서버 내부 REST API 호출용, 프론트 응답에 노출 금지
    KAKAO_MAP_JS_KEY = os.getenv("KAKAO_MAP_JS_KEY")
    # 설명: `KAKAO_REST_API_KEY`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
    KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY")
