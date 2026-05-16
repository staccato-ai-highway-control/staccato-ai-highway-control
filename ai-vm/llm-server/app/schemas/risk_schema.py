from typing import Any

from pydantic import BaseModel, Field


class RiskSummaryRequest(BaseModel):
    incident_id: int | None = None
    incident_type: str | None = None
    risk_level: str | None = None
    stopped_seconds: float | None = None
    roi_type: str | None = None
    incident_context: dict[str, Any] = Field(default_factory=dict)
