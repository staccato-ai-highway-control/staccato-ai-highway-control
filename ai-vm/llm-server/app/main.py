from fastapi import FastAPI
from app.routers import health, reports, chatbot, risk_summary

app = FastAPI(
    title="STACCATO LLM Server",
    version="0.1.0"
)

app.include_router(health.router)
app.include_router(reports.router)
app.include_router(chatbot.router)
app.include_router(risk_summary.router)
