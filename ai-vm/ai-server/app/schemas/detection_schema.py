from pydantic import BaseModel
from typing import List, Optional


class Roi(BaseModel):
    roi_id: int
    roi_type: str
    polygon_points: List[List[float]]


class Thresholds(BaseModel):
    confidence: float = 0.6
    lane_stop_seconds: int = 5
    shoulder_stop_seconds: int = 10
    movement_threshold_px: int = 15


class AnalyzeRequest(BaseModel):
    analysis_job_id: int
    report_id: int
    attachment_id: int
    file_path: str
    cctv_id: Optional[int] = None
    rois: List[Roi] = []
    thresholds: Thresholds = Thresholds()


class DetectionLog(BaseModel):
    object_type: str
    bbox: List[float]
    center: List[float]
    confidence: float
    frame_index: int
    model_name: str
    model_version: str


class AnalyzeResponse(BaseModel):
    success: bool
    detected: bool
    incident_type: Optional[str]
    risk_level: Optional[str]
    confidence: float
    stopped_seconds: float
    movement_delta: float
    roi_type: Optional[str]
    snapshot_path: Optional[str]
    detection_logs: List[DetectionLog]
