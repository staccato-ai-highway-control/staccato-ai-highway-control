import os
from typing import Any


VEHICLE_CLASSES = {"car", "bus", "truck"}


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


def _bbox_values(detection: dict[str, Any]) -> tuple[float, float, float, float] | None:
    bbox = detection.get("bbox")
    if not isinstance(bbox, list) or len(bbox) != 4:
        return None

    try:
        x1, y1, x2, y2 = [float(value) for value in bbox]
    except (TypeError, ValueError):
        return None

    if x2 <= x1 or y2 <= y1:
        return None

    return x1, y1, x2, y2


def _class_name(detection: dict[str, Any]) -> str:
    value = (
        detection.get("class_name")
        or detection.get("label")
        or detection.get("name")
        or ""
    )
    return str(value).strip().lower()


def postprocess_report_analysis_detections(
    detections: list[dict[str, Any]],
    frame_width: int | float | None,
    frame_height: int | float | None,
) -> dict[str, Any]:
    enabled = _env_bool("REPORT_ANALYSIS_POSTPROCESS_ENABLED", False)

    if not enabled:
        return {
            "enabled": False,
            "raw_count": len(detections),
            "filtered_count": len(detections),
            "incident_candidate_count": 0,
            "filtered_detections": detections,
            "incident_candidates": [],
            "display_detections": detections,
            "config": {
                "display_mode": "raw",
            },
        }

    min_confidence = _env_float("REPORT_ANALYSIS_POSTPROCESS_MIN_CONFIDENCE", 0.50)
    min_box_width = _env_int("REPORT_ANALYSIS_POSTPROCESS_MIN_BOX_WIDTH", 20)
    min_box_height = _env_int("REPORT_ANALYSIS_POSTPROCESS_MIN_BOX_HEIGHT", 20)
    min_area_ratio = _env_float("REPORT_ANALYSIS_POSTPROCESS_MIN_AREA_RATIO", 0.0006)
    top_exclude_ratio = _env_float("REPORT_ANALYSIS_POSTPROCESS_TOP_EXCLUDE_RATIO", 0.35)

    candidate_min_confidence = _env_float(
        "REPORT_ANALYSIS_POSTPROCESS_CANDIDATE_MIN_CONFIDENCE",
        0.55,
    )
    candidate_min_center_y_ratio = _env_float(
        "REPORT_ANALYSIS_POSTPROCESS_CANDIDATE_MIN_CENTER_Y_RATIO",
        0.45,
    )
    candidate_min_area_ratio = _env_float(
        "REPORT_ANALYSIS_POSTPROCESS_CANDIDATE_MIN_AREA_RATIO",
        0.0015,
    )

    display_mode = os.getenv(
        "REPORT_ANALYSIS_POSTPROCESS_DISPLAY_MODE",
        "candidates",
    ).strip().lower()

    width = float(frame_width or 0)
    height = float(frame_height or 0)
    frame_area = width * height if width > 0 and height > 0 else 0

    filtered: list[dict[str, Any]] = []
    candidates: list[dict[str, Any]] = []

    for detection in detections:
        class_name = _class_name(detection)
        if class_name not in VEHICLE_CLASSES:
            continue

        confidence = detection.get("confidence")
        if not isinstance(confidence, (int, float)):
            confidence = 0.0

        if confidence < min_confidence:
            continue

        bbox = _bbox_values(detection)
        if bbox is None:
            continue

        x1, y1, x2, y2 = bbox
        box_width = x2 - x1
        box_height = y2 - y1
        box_area = box_width * box_height
        center_y = (y1 + y2) / 2

        if box_width < min_box_width or box_height < min_box_height:
            continue

        if frame_area > 0 and box_area / frame_area < min_area_ratio:
            continue

        if height > 0 and center_y < height * top_exclude_ratio:
            continue

        normalized = dict(detection)
        normalized["raw_class_name"] = detection.get("class_name") or class_name
        normalized["normalized_class"] = "vehicle"
        # 화면 표시용 class_name/label은 원본 모델 결과를 유지합니다.
        # car / bus / truck을 그대로 보여주고, vehicle은 내부 판단용으로만 사용합니다.
        normalized["class_name"] = detection.get("class_name") or class_name
        normalized["label"] = detection.get("label") or detection.get("class_name") or class_name
        normalized["postprocess_passed"] = True
        normalized["box_color"] = "green"

        filtered.append(normalized)

        area_ratio = box_area / frame_area if frame_area > 0 else 0
        is_candidate = (
            confidence >= candidate_min_confidence
            and (height <= 0 or center_y >= height * candidate_min_center_y_ratio)
            and (frame_area <= 0 or area_ratio >= candidate_min_area_ratio)
        )

        if is_candidate:
            normalized["box_color"] = "red"
            normalized["incident_type"] = "STOPPED_OR_COLLISION_CANDIDATE"
            normalized["risk_level"] = "HIGH"
            normalized["risk_reason"] = (
                "vehicle bbox is inside the road-risk area and satisfies "
                "confidence/size thresholds"
            )

            if filtered:
                filtered[-1] = normalized

            candidate = dict(normalized)
            candidates.append(candidate)

    if display_mode == "filtered":
        display_detections = filtered
    elif display_mode == "candidates":
        display_detections = candidates
    else:
        display_detections = candidates or filtered

    return {
        "enabled": True,
        "raw_count": len(detections),
        "filtered_count": len(filtered),
        "incident_candidate_count": len(candidates),
        "filtered_detections": filtered,
        "incident_candidates": candidates,
        "display_detections": display_detections,
        "config": {
            "display_mode": display_mode,
            "min_confidence": min_confidence,
            "min_box_width": min_box_width,
            "min_box_height": min_box_height,
            "min_area_ratio": min_area_ratio,
            "top_exclude_ratio": top_exclude_ratio,
            "candidate_min_confidence": candidate_min_confidence,
            "candidate_min_center_y_ratio": candidate_min_center_y_ratio,
            "candidate_min_area_ratio": candidate_min_area_ratio,
        },
    }
