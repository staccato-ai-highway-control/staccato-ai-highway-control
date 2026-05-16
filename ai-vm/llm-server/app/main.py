from fastapi import FastAPI

from app.routers.chatbot import router as chatbot_router
from app.routers.health import router as health_router
from app.routers.reports import router as reports_router
from app.routers.risk_summary import router as risk_summary_router

app = FastAPI(
    title="STACCATO LLM Server",
    version="0.1.0",
)

app.include_router(health_router)
app.include_router(chatbot_router)
app.include_router(reports_router)
app.include_router(risk_summary_router)
