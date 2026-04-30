from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter(prefix="/detections", tags=["detections"])


class AnalyzeUploadRequest(BaseModel):
    job_id: int
    upload_id: int
    file_path: str
    upload_type: str
    cctv_id: Optional[int] = None
    incident_id: Optional[int] = None
    request_payload_json: Optional[Dict[str, Any]] = None


@router.post("/analyze-upload")
def analyze_upload(payload: AnalyzeUploadRequest):
    """
    MVP용 AI 분석 Mock Endpoint.

    실제 모델 연동 전까지 Flask Server가 AI Server 호출 흐름을 검증할 수 있도록
    고정된 형태의 분석 결과를 반환한다.
    """

    detected = payload.upload_type in {"IMAGE", "VIDEO"}

    detections: List[Dict[str, Any]] = []

    if detected:
        detections.append(
            {
                "detected_class": "stopped_vehicle",
                "confidence": 0.9321,
                "bbox_json": {
                    "x": 120,
                    "y": 180,
                    "width": 260,
                    "height": 140,
                },
                "roi_type": "DRIVING_LANE",
                "movement_delta_px": 1.25,
                "stopped_duration_seconds": 180,
                "frame_timestamp_ms": 0,
            }
        )

    return {
        "status": "success",
        "job_id": payload.job_id,
        "upload_id": payload.upload_id,
        "detected": detected,
        "incident_type": "LANE_STOP" if detected else None,
        "risk_level": "HIGH" if detected else "LOW",
        "confidence": 0.9321 if detected else 0.0,
        "stopped_duration_seconds": 180 if detected else 0,
        "model_name": "staccato-mock-detector",
        "model_version": "0.1.0",
        "detections": detections,
    }
