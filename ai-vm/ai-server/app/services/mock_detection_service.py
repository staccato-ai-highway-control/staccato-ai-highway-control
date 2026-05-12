from app.schemas.detection_schema import AnalyzeRequest, AnalyzeResponse, DetectionLog


def analyze_mock(request: AnalyzeRequest) -> AnalyzeResponse:
    return AnalyzeResponse(
        success=True,
        detected=True,
        incident_type="LANE_STOP",
        risk_level="HIGH",
        confidence=0.87,
        stopped_seconds=12.5,
        movement_delta=8.2,
        roi_type="DRIVING_LANE",
        snapshot_path=f"/app/storage/snapshots/inc_{request.analysis_job_id}_001.jpg",
        detection_logs=[
            DetectionLog(
                object_type="CAR",
                bbox=[100, 200, 260, 360],
                center=[180, 280],
                confidence=0.87,
                frame_index=120,
                model_name="mock-yolo",
                model_version="v0.1",
            )
        ],
    )
