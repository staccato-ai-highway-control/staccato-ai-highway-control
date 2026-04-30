import os


class Settings:
    SERVICE_NAME = "ai-server"
    ENV = os.getenv("FLASK_ENV", "development")
    AI_PORT = int(os.getenv("AI_PORT", "8001"))
    STORAGE_ROOT = os.getenv("STORAGE_ROOT", "/app/storage")
    MODEL_DIR = os.getenv("MODEL_DIR", "/app/storage/models")
    SNAPSHOT_DIR = os.getenv("SNAPSHOT_DIR", "/app/storage/snapshots")


settings = Settings()
