import os


class Settings:
    SERVICE_NAME = "its-server"
    ENV = os.getenv("FLASK_ENV", "development")
    ITS_PORT = int(os.getenv("ITS_PORT", "8002"))

    # External API placeholders
    WEATHER_API_BASE_URL = os.getenv("WEATHER_API_BASE_URL", "")
    TRAFFIC_API_BASE_URL = os.getenv("TRAFFIC_API_BASE_URL", "")
    MAP_API_BASE_URL = os.getenv("MAP_API_BASE_URL", "")

    # ITS operation constraints confirmed by provider
    ITS_MAX_PROCESSING_TIME_SECONDS = 183
    ITS_REQUEST_BATCH_SIZE = 3000
    ITS_MAX_PROCESSING_COUNT = 30000


settings = Settings()
