import os


class Config:
    SERVICE_NAME = "flask-server"
    ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"

    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://staccato_user:staccato_password@db-server:3306/staccato",
    )

    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    AI_SERVER_URL = os.getenv("AI_SERVER_URL", "http://ai-server:8001")
    ITS_SERVER_URL = os.getenv("ITS_SERVER_URL", "http://its-server:8002")

    STORAGE_ROOT = os.getenv("STORAGE_ROOT", "/app/storage")
