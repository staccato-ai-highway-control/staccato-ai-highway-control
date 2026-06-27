from __future__ import annotations

import json
import os
import subprocess
import tempfile
from pathlib import Path
from threading import Lock
from typing import Any

import cv2
import numpy as np

from .config import YOLO_CONFIDENCE, YOLO_DEVICE, YOLO_IMGSZ
from .detector import Detection, YoloDetector


class RTDETRDetector(YoloDetector):
    """Ultralytics RT-DETR을 기존 Detection 형식으로 변환한다."""

    def __init__(
        self,
        *,
        model_path: str,
        target_classes: set[str] | None = None,
        default_confidence: float = YOLO_CONFIDENCE,
        default_imgsz: int = YOLO_IMGSZ,
        device: str | None = YOLO_DEVICE,
    ) -> None:
        super().__init__(
            model_paths=[model_path],
            target_classes=target_classes,
            default_confidence=default_confidence,
            default_imgsz=default_imgsz,
            device=device,
            enable_far_crop=False,
        )

    def _ensure_model_loaded(self) -> Any:
        if self._model is not None:
            return self._model

        with self._lock:
            if self._model is not None:
                return self._model

            try:
                from ultralytics import RTDETR
            except ImportError as exc:
                self._load_error = "ultralytics RTDETR runtime is unavailable."
                raise RuntimeError(self._load_error) from exc

            errors: list[str] = []

            for model_path in self.model_paths:
                try:
                    self._model = RTDETR(model_path)
                    self._model_name = model_path
                    self._load_error = None
                    return self._model
                except Exception as exc:
                    errors.append(f"{model_path}: {exc}")

            self._load_error = "Failed to load RT-DETR model. " + " | ".join(errors)
            raise RuntimeError(self._load_error)


class KerasYoloV8Detector:
    """KerasCV YOLOv8을 별도 CPU 프로세스에서 실행한다."""

    def __init__(
        self,
        *,
        model_path: str,
        worker_python: str,
        worker_script: str,
        class_names: dict[int, str],
        default_confidence: float = YOLO_CONFIDENCE,
        default_imgsz: int = YOLO_IMGSZ,
    ) -> None:
        self.model_path = Path(model_path)
        self.worker_python = Path(worker_python)
        self.worker_script = Path(worker_script)
        self.class_names = class_names
        self.default_confidence = default_confidence
        self.default_imgsz = default_imgsz

        self._predict_lock = Lock()
        self._load_error: str | None = None

    @property
    def model_name(self) -> str:
        return str(self.model_path)

    @property
    def current_model_name(self) -> str:
        return str(self.model_path)

    @property
    def load_error(self) -> str | None:
        return self._load_error

    def detect(
        self,
        frame: np.ndarray,
        confidence: float | None = None,
        iou: float | None = None,
        imgsz: int | None = None,
        frame_id: int | None = None,
        lock_already_held: bool = False,
    ) -> list[Detection]:
        del iou, frame_id, lock_already_held

        if frame is None or frame.size == 0:
            return []

        if not self.model_path.is_file():
            raise RuntimeError(f"Keras model file is unavailable: {self.model_path}")

        if not self.worker_python.is_file():
            raise RuntimeError(
                f"Keras Python runtime is unavailable: {self.worker_python}"
            )

        if not self.worker_script.is_file():
            raise RuntimeError(
                f"Keras worker script is unavailable: {self.worker_script}"
            )

        effective_confidence = (
            confidence
            if confidence is not None
            else self.default_confidence
        )
        image_size = int(imgsz or self.default_imgsz)

        original_height, original_width = frame.shape[:2]

        resized = cv2.resize(
            frame,
            (image_size, image_size),
            interpolation=cv2.INTER_LINEAR,
        )
        resized_rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype("float32")

        with self._predict_lock:
            with tempfile.TemporaryDirectory(prefix="staccato-keras-") as temp_dir:
                temp_path = Path(temp_dir)
                input_path = temp_path / "frame.npy"
                output_path = temp_path / "result.json"

                np.save(input_path, resized_rgb)

                env = os.environ.copy()
                env.update(
                    {
                        "CUDA_VISIBLE_DEVICES": "-1",
                        "TF_CPP_MIN_LOG_LEVEL": "2",
                        "OMP_NUM_THREADS": "1",
                        "TF_NUM_INTRAOP_THREADS": "1",
                        "TF_NUM_INTEROP_THREADS": "1",
                    }
                )

                command = [
                    str(self.worker_python),
                    str(self.worker_script),
                    "--model",
                    str(self.model_path),
                    "--input",
                    str(input_path),
                    "--output",
                    str(output_path),
                ]

                try:
                    completed = subprocess.run(
                        command,
                        check=False,
                        capture_output=True,
                        text=True,
                        timeout=180,
                        env=env,
                    )
                except subprocess.TimeoutExpired as exc:
                    self._load_error = "Keras inference timed out."
                    raise RuntimeError(self._load_error) from exc

                if completed.returncode != 0:
                    detail = (
                        completed.stderr.strip()
                        or completed.stdout.strip()
                        or "unknown Keras worker error"
                    )
                    self._load_error = detail[-1200:]
                    raise RuntimeError(
                        "Keras inference failed: "
                        f"{self._load_error}"
                    )

                if not output_path.is_file():
                    self._load_error = "Keras worker did not create an output file."
                    raise RuntimeError(self._load_error)

                payload = json.loads(output_path.read_text(encoding="utf-8"))

        detections: list[Detection] = []

        scale_x = original_width / image_size
        scale_y = original_height / image_size

        for item in payload.get("detections", []):
            class_id = int(item.get("class_id", -1))
            class_name = self.class_names.get(class_id)

            if not class_name:
                continue

            score = float(item.get("confidence", 0.0))

            if score < effective_confidence:
                continue

            bbox = item.get("bbox", [])

            if not isinstance(bbox, list) or len(bbox) != 4:
                continue

            x1, y1, x2, y2 = [float(value) for value in bbox]

            x1 = max(0.0, min(original_width, x1 * scale_x))
            y1 = max(0.0, min(original_height, y1 * scale_y))
            x2 = max(0.0, min(original_width, x2 * scale_x))
            y2 = max(0.0, min(original_height, y2 * scale_y))

            if x2 <= x1 or y2 <= y1:
                continue

            detections.append(
                Detection(
                    bbox=[x1, y1, x2, y2],
                    class_id=class_id,
                    class_name=class_name,
                    confidence=score,
                    source="full_frame",
                )
            )

        self._load_error = None
        return detections
