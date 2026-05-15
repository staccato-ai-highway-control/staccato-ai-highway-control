from typing import Any

from pydantic import BaseModel, Field


class ReportGenerateRequest(BaseModel):
    incident_id: int | None = None
    incident_type: str | None = None
    risk_level: str | None = None
    location: str | None = None
    detected_at: str | None = None
    summary: str | None = None
    incident_context: dict[str, Any] = Field(default_factory=dict)
