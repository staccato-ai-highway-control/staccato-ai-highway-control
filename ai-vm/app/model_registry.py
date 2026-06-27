from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from threading import Lock

from .config import YOLO_MODEL_PATHS
from .detector import YoloDetector


class UnknownReportModelError(ValueError):
    """지원하지 않는 비교 분석 model_id 요청."""


class ReportModelUnavailableError(RuntimeError):
    """등록 모델 파일이 없거나 사용할 수 없는 경우."""


@dataclass(frozen=True)
class ReportModelSpec:
    model_id: str
    model_name: str
    model_version: str
    model_path: Path


def _ai_vm_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _report_model_root() -> Path:
    configured_root = os.getenv("REPORT_MODEL_ROOT", "").strip()

    if configured_root:
        return Path(configured_root).expanduser()

    return _ai_vm_root() / "models"


def _configured_model_path(model_id: str) -> Path:
    """설정 경로를 우선 사용하고, 없으면 비교 분석 모델 루트를 사용한다."""
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

    fallback_path = (
        _report_model_root()
        / normalized_model_id
        / "best.pt"
    )

    if fallback_path.is_file():
        return fallback_path

    if matched_paths:
        return matched_paths[0]

    return fallback_path


class ReportModelRegistry:
    """비교 분석 전용 YOLO Detector를 모델 ID별로 지연 로드한다.

    기존 CCTV/신고 분석 전역 detector를 교체하지 않는다.
    """

    def __init__(self) -> None:
        self._lock = Lock()
        self._detectors: dict[str, YoloDetector] = {}

        self._specs: dict[str, ReportModelSpec] = {
            "yolo11s": ReportModelSpec(
                model_id="yolo11s",
                model_name="YOLO11 Small",
                model_version="best.pt",
                model_path=_configured_model_path("yolo11s"),
            ),
            "yolo11n": ReportModelSpec(
                model_id="yolo11n",
                model_name="YOLO11 Nano",
                model_version="best.pt",
                model_path=_configured_model_path("yolo11n"),
            ),
            "yolo8n": ReportModelSpec(
                model_id="yolo8n",
                model_name="YOLOv8 Nano",
                model_version="best.pt",
                model_path=_configured_model_path("yolo8n"),
            ),
        }

    def list_models(self) -> list[dict]:
        return [
            {
                "model_id": spec.model_id,
                "model_name": spec.model_name,
                "model_version": spec.model_version,
                "model_path": str(spec.model_path),
                "available": spec.model_path.is_file(),
            }
            for spec in self._specs.values()
        ]

    def get(self, model_id: str) -> tuple[ReportModelSpec, YoloDetector]:
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
                detector = YoloDetector(
                    model_paths=[str(spec.model_path)],
                )
                self._detectors[normalized_model_id] = detector

        return spec, detector


report_model_registry = ReportModelRegistry()
