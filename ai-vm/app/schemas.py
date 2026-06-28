# 역할: FastAPI 요청 body를 검증하는 Pydantic 모델을 정의합니다.
from pydantic import BaseModel
from pydantic import Field


# 로그인 요청의 ID와 비밀번호를 검증합니다.
class LoginPayload(BaseModel):
    login_id: str = ""
    password: str = ""


# 카메라 시작 요청의 스트림 URL과 FPS/버퍼 옵션을 검증합니다.
class CameraStartPayload(BaseModel):
    source_url: str = Field(..., min_length=1)
    name: str | None = None
    target_fps: float = Field(default=10.0, gt=0, le=60)
    analysis_fps: float = Field(default=2.0, ge=0, le=30)
    analysis_queue_size: int = Field(default=4, ge=1, le=120)
    buffer_seconds: float = Field(default=12.0, gt=0, le=300)
    stale_timeout_seconds: float = Field(default=10.0, gt=0, le=300)
    reconnect_backoff_seconds: float = Field(default=3.0, gt=0, le=60)


# 수동 이벤트 생성 요청의 클립 시간과 이벤트 정보를 검증합니다.
class ManualEventPayload(BaseModel):
    source_url: str | None = None
    name: str | None = None
    event_type: str = "LANE_STOP"
    severity: str = "WARNING"
    message: str | None = None
    pre_seconds: float | None = Field(default=None, gt=0, le=60)
    post_seconds: float | None = Field(default=None, gt=0, le=60)
    target_fps: float = Field(default=10.0, gt=0, le=60)
    analysis_fps: float = Field(default=0.2, ge=0, le=30)


# ROI 좌표 저장 요청의 다각형 좌표를 검증합니다.
class RoiSettingsPayload(BaseModel):
    rois: dict[str, list[list[float]]] = Field(default_factory=dict)
