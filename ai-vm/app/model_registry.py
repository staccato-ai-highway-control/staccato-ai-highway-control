from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any

from .comparison_detectors import KerasYoloV8Detector, RTDETRDetector
from .config import YOLO_MODEL_PATHS
from .detector import YoloDetector


class UnknownReportModelError(ValueError):
    """지원하지 않는 비교 분석 model_id 요청."""


class ReportModelUnavailableError(RuntimeError):
    """등록 모델 파일 또는 런타임을 사용할 수 없는 경우."""


@dataclass(frozen=True)
class ReportModelSpec:
    model_id: str
    model_name: str
    model_version: str
    model_path: Path
    runtime: str


def _ai_vm_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _report_model_root() -> Path:
    configured_root = os.getenv("REPORT_MODEL_ROOT", "").strip()

    if configured_root:
        return Path(configured_root).expanduser()

    return _ai_vm_root() / "models"


def _configured_model_path(model_id: str) -> Path:
    normalized_model_id = str(model_id).strip().lower()
    matched_paths: list[Path] = []

    for raw_path in YOLO_MODEL_PATHS:
        candidate = Path(str(raw_path)).expanduser()

        if not candidate.is_absolute():
            candidate = _ai_vm_root() / candidate

        path_parts = {
            part.strip().lower()
            for part in candidate.parts
        }

        if normalized_model_id in path_parts:
            matched_paths.append(candidate)

    for candidate in matched_paths:
        if candidate.is_file():
            return candidate

    fallback_path = _report_model_root() / normalized_model_id / "best.pt"

    if fallback_path.is_file():
        return fallback_path

    if matched_paths:
        return matched_paths[0]

    return fallback_path


def _keras_python_path() -> Path:
    configured = os.getenv("KERAS_COMPARISON_PYTHON", "").strip()

    if configured:
        return Path(configured).expanduser()

    return _ai_vm_root() / ".venv-keras" / "bin" / "python"


class ReportModelRegistry:
    """비교 분석 전용 모델을 모델 ID별로 지연 로드한다."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._detectors: dict[str, Any] = {}

        model_root = _report_model_root()

        self._specs: dict[str, ReportModelSpec] = {
            "yolo11s": ReportModelSpec(
                model_id="yolo11s",
                model_name="YOLO11 Small",
                model_version="best.pt",
                model_path=_configured_model_path("yolo11s"),
                runtime="ultralytics-yolo",
            ),
            "keras_yolov8": ReportModelSpec(
                model_id="keras_yolov8",
                model_name="Keras YOLOv8 Vehicle Detector",
                model_version="best.keras",
                model_path=(
                    model_root
                    / "candidates"
                    / "custom-best"
                    / "best.keras"
                ),
                runtime="keras-cv-cpu",
            ),
            "rtdetr": ReportModelSpec(
                model_id="rtdetr",
                model_name="RT-DETR Vehicle Detector",
                model_version="best.pt",
                model_path=(
                    model_root
                    / "candidates"
                    / "rtdetr"
                    / "best.pt"
                ),
                runtime="ultralytics-rtdetr",
            ),
        }

    def list_models(self) -> list[dict]:
        return [
            {
                "model_id": spec.model_id,
                "model_name": spec.model_name,
                "model_version": spec.model_version,
                "model_path": str(spec.model_path),
                "runtime": spec.runtime,
                "available": spec.model_path.is_file(),
            }
            for spec in self._specs.values()
        ]

    def get(self, model_id: str) -> tuple[ReportModelSpec, Any]:
        normalized_model_id = str(model_id or "").strip().lower()

        if normalized_model_id not in self._specs:
            supported_models = ", ".join(sorted(self._specs))
            raise UnknownReportModelError(
                f"Unsupported model_id: {normalized_model_id or '(empty)'}. "
                f"Supported values: {supported_models}"
            )

        spec = self._specs[normalized_model_id]

        if not spec.model_path.is_file():
            raise ReportModelUnavailableError(
                f"Model file is unavailable: {spec.model_path}"
            )

        with self._lock:
            detector = self._detectors.get(normalized_model_id)

            if detector is None:
                detector = self._create_detector(spec)
                self._detectors[normalized_model_id] = detector

        return spec, detector

    def _create_detector(self, spec: ReportModelSpec) -> Any:
        if spec.model_id == "yolo11s":
            return YoloDetector(
                model_paths=[str(spec.model_path)],
                enable_far_crop=False,
            )

        if spec.model_id == "rtdetr":
            return RTDETRDetector(
                model_path=str(spec.model_path),
            )

        if spec.model_id == "keras_yolov8":
            return KerasYoloV8Detector(
                model_path=str(spec.model_path),
                worker_python=str(_keras_python_path()),
                worker_script=str(_ai_vm_root() / "app" / "keras_worker.py"),
                class_names={
                    0: "car",
                    1: "truck",
                    2: "bus",
                },
            )

        raise ReportModelUnavailableError(
            f"Model runtime is not configured: {spec.model_id}"
        )


report_model_registry = ReportModelRegistry()
