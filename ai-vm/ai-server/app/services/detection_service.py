from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from app.detector import Detection, detector
from app.schemas.detection_schema import AnalyzeRequest, AnalyzeResponse, DetectionLog


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
MAX_VIDEO_FRAMES_TO_SCAN = 90
VIDEO_FRAME_STRIDE = 15


def analyze_file(request: AnalyzeRequest) -> AnalyzeResponse:
    path = Path(request.file_path)
    if not path.exists() or not path.is_file():
        return _empty_response(success=False)

    try:
        frames = _load_frames(path)
        if not frames:
            return _empty_response(success=False)

        best: tuple[int, np.ndarray, list[Detection]] | None = None
        for frame_index, frame in frames:
            detections = detector.detect(
                frame,
                confidence=request.thresholds.confidence,
            )
            if best is None or _max_confidence(detections) > _max_confidence(best[2]):
                best = (frame_index, frame, detections)

        if best is None:
            return _empty_response(success=True)

        frame_index, _frame, detections = best
        return _response_from_detections(
            request=request,
            detections=detections,
            frame_index=frame_index,
        )
    except RuntimeError:
        return _empty_response(success=False)
    except Exception:
        return _empty_response(success=False)


def _load_frames(path: Path) -> list[tuple[int, np.ndarray]]:
    suffix = path.suffix.lower()
    if suffix in IMAGE_EXTENSIONS:
        image = cv2.imread(str(path))
        return [(0, image)] if image is not None else []

    if suffix not in VIDEO_EXTENSIONS:
        return []

    capture = cv2.VideoCapture(str(path))
    try:
        if not capture.isOpened():
            return []

        frames: list[tuple[int, np.ndarray]] = []
        frame_index = 0
        scanned = 0

        while scanned < MAX_VIDEO_FRAMES_TO_SCAN:
            ok, frame = capture.read()
            if not ok or frame is None:
                break

            if frame_index % VIDEO_FRAME_STRIDE == 0:
                frames.append((frame_index, frame))
                scanned += 1

            frame_index += 1

        return frames
    finally:
        capture.release()


def _response_from_detections(
    *,
    request: AnalyzeRequest,
    detections: list[Detection],
    frame_index: int,
) -> AnalyzeResponse:
    if not detections:
        return _empty_response(success=True)

    primary = max(detections, key=lambda item: item.confidence)
    roi_type = _roi_type_for_detection(request, primary)

    return AnalyzeResponse(
        success=True,
        detected=True,
        incident_type="VEHICLE_DETECTED",
        risk_level="MEDIUM" if roi_type else "LOW",
        confidence=primary.confidence,
        stopped_seconds=0.0,
        movement_delta=0.0,
        roi_type=roi_type,
        snapshot_path=None,
        detection_logs=[
            _to_detection_log(detection, frame_index)
            for detection in detections[:50]
        ],
    )


def _to_detection_log(detection: Detection, frame_index: int) -> DetectionLog:
    x1, y1, x2, y2 = detection.bbox
    return DetectionLog(
        object_type=detection.class_name.upper(),
        bbox=detection.bbox,
        center=[(x1 + x2) / 2.0, (y1 + y2) / 2.0],
        confidence=detection.confidence,
        frame_index=frame_index,
        model_name=detector.current_model_name or "yolo",
        model_version="runtime",
    )


def _roi_type_for_detection(request: AnalyzeRequest, detection: Detection) -> str | None:
    if not request.rois:
        return None

    x1, _y1, x2, y2 = detection.bbox
    point = ((x1 + x2) / 2.0, y2)
    for roi in request.rois:
        polygon = np.array(roi.polygon_points, dtype=np.float32)
        if len(polygon) >= 3 and cv2.pointPolygonTest(polygon, point, False) >= 0:
            return roi.roi_type

    return None


def _max_confidence(detections: list[Detection]) -> float:
    if not detections:
        return 0.0
    return max(item.confidence for item in detections)


def _empty_response(success: bool) -> AnalyzeResponse:
    return AnalyzeResponse(
        success=success,
        detected=False,
        incident_type=None,
        risk_level=None,
        confidence=0.0,
        stopped_seconds=0.0,
        movement_delta=0.0,
        roi_type=None,
        snapshot_path=None,
        detection_logs=[],
    )
