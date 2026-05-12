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
    STORAGE_ROOT = os.getenv("STORAGE_ROOT", str(BASE_DIR / "storage"))
