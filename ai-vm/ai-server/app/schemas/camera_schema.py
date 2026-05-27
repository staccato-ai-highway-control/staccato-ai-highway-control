from pydantic import BaseModel, Field


class CameraStartPayload(BaseModel):
    source_url: str = Field(..., min_length=1)
    name: str | None = None
    target_fps: float = Field(default=10.0, gt=0, le=60)
    analysis_fps: float = Field(default=2.0, ge=0, le=30)
    analysis_queue_size: int = Field(default=4, ge=1, le=120)
    buffer_seconds: float = Field(default=12.0, gt=0, le=300)
    stale_timeout_seconds: float = Field(default=10.0, gt=0, le=300)
    reconnect_backoff_seconds: float = Field(default=3.0, gt=0, le=60)


class ManualEventPayload(BaseModel):
    source_url: str | None = None
    name: str | None = None
    event_type: str = "STOPPED_VEHICLE"
    severity: str = "WARNING"
    message: str | None = None
    pre_seconds: float | None = Field(default=None, gt=0, le=60)
    post_seconds: float | None = Field(default=None, gt=0, le=60)
    target_fps: float = Field(default=10.0, gt=0, le=60)
    analysis_fps: float = Field(default=0.2, ge=0, le=30)


class RoiSettingsPayload(BaseModel):
    rois: dict[str, list[list[float]]] = Field(default_factory=dict)
