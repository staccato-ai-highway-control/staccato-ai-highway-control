from fastapi import FastAPI
from app.routes.llm_routes import router as llm_router

app = FastAPI(
    title="STACCATO LLM Server",
    description="LLM report generation server for STACCATO",
    version="0.1.0",
)

app.include_router(llm_router)


@app.get("/")
def root():
    return {
        "service": "staccato-llm-server",
        "status": "running",
    }
