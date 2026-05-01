from fastapi import FastAPI

from app.routers.detection_router import router as detection_router
from app.routers.health_router import router as health_router


app = FastAPI(title="staccato-ai-server")

app.include_router(health_router)
app.include_router(detection_router)
