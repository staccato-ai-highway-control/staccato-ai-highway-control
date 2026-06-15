from __future__ import annotations
# 역할: 이벤트 스냅샷/영상 위에 bbox, 라벨, ROI 보조 시각화를 그립니다.

from typing import Any

import cv2
import numpy as np

from .config import ROI_BASE_HEIGHT, ROI_BASE_WIDTH
from .roi_config import get_camera_rois


EVENT_COLORS = {
    "STOPPED_VEHICLE": (0, 0, 255),
    "SHOULDER_STOP": (0, 165, 255),
}


# render_event_overlay 기능을 수행하는 함수입니다.
def render_event_overlay(frame: np.ndarray, event: dict[str, Any]) -> np.ndarray:
    rendered = frame.copy()
    _draw_event_box(rendered, event)
    return rendered


# _draw_rois 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _draw_rois(frame: np.ndarray, camera_id: str | None = None) -> None:
    height, width = frame.shape[:2]
    x_scale = width / ROI_BASE_WIDTH
    y_scale = height / ROI_BASE_HEIGHT

    roi_styles = {
        "LEFT_SHOULDER": (0, 255, 255),
        "RIGHT_SHOULDER": (255, 0, 0),
        "MEDIAN": (255, 0, 255),
    }

    overlay = frame.copy()
    rois = get_camera_rois(camera_id or "")
    for roi_id, points in rois.items():
        color = roi_styles.get(roi_id, (255, 255, 255))
        scaled_points = np.array(
            [[int(x * x_scale), int(y * y_scale)] for x, y in points],
            dtype=np.int32,
        )
        cv2.fillPoly(overlay, [scaled_points], color)
        cv2.polylines(frame, [scaled_points], True, color, 2)

    cv2.addWeighted(overlay, 0.18, frame, 0.82, 0, dst=frame)


# _draw_event_box 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _draw_event_box(frame: np.ndarray, event: dict[str, Any]) -> None:
    bbox = event.get("bbox")
    if not bbox or len(bbox) != 4:
        return

    x1, y1, x2, y2 = [int(value) for value in bbox]
    event_type = str(event.get("event_type") or "EVENT")
    color = EVENT_COLORS.get(event_type, (0, 255, 0))
    track_id = event.get("track_id")
    roi_id = event.get("roi_id")

    label_parts = [event_type]
    if track_id is not None:
        label_parts.append(f"ID:{track_id}")
    if roi_id:
        label_parts.append(str(roi_id))
    label = " | ".join(label_parts)

    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 3)
    cv2.circle(frame, (int((x1 + x2) / 2), y2), 5, (0, 255, 255), -1)
    cv2.putText(
        frame,
        label,
        (x1, max(24, y1 - 10)),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        color,
        2,
        cv2.LINE_AA,
    )

    message = str(event.get("message") or "")
    if message:
        cv2.putText(
            frame,
            message[:96],
            (x1, min(frame.shape[0] - 12, y2 + 24)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )


# _draw_detections 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _draw_detections(frame: np.ndarray, event: dict[str, Any]) -> None:
    detections = event.get("detections")
    if not isinstance(detections, list):
        return

    for detection in detections:
        if not isinstance(detection, dict):
            continue

        bbox = detection.get("bbox")
        if not bbox or len(bbox) != 4:
            continue

        x1, y1, x2, y2 = [int(value) for value in bbox]
        class_name = str(detection.get("class_name") or "object")
        confidence = detection.get("confidence")
        track_id = detection.get("track_id")
        source = str(detection.get("source") or "full_frame")

        label_parts = ["FAR" if source == "far_crop" else class_name]
        if source == "far_crop":
            label_parts.append(class_name)
        if confidence is not None:
            label_parts.append(f"{float(confidence):.2f}")
        if track_id is not None:
            label_parts.append(f"ID:{track_id}")
        label = " ".join(label_parts)

        color = (0, 165, 255) if source == "far_crop" else (0, 255, 0)
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        cv2.putText(
            frame,
            label,
            (x1, max(20, y1 - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            color,
            2,
            cv2.LINE_AA,
        )
