from __future__ import annotations

from typing import Any


def active_report_analysis_detections(
    detections_by_frame: dict[int, list[dict[str, Any]]],
    frame_index: int,
    *,
    hold_frames: int,
    persistent_annotation_hold_frames: int,
) -> list[dict[str, Any]]:
    """Return detection boxes that must be visible on one output-video frame.

    Normal detections are shown briefly.
    Confirmed stopped-vehicle annotations remain visible until the next
    analysis sample frame.
    """
    active_detections: list[dict[str, Any]] = []

    for sampled_frame_index, frame_detections in detections_by_frame.items():
        frame_age = frame_index - sampled_frame_index

        for detection in frame_detections:
            detection_hold_frames = (
                persistent_annotation_hold_frames
                if detection.get("persistent_annotation")
                else hold_frames
            )

            if 0 <= frame_age <= detection_hold_frames:
                active_detections.append(detection)

    return active_detections
