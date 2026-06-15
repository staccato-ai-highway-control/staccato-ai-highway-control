from __future__ import annotations
# 역할: YOLO 모델을 지연 로드하고 프레임에서 차량 탐지 결과를 표준 형식으로 변환합니다.

from dataclasses import dataclass
from threading import Lock
from typing import Any

import numpy as np

from .config import (
    YOLO_CONFIDENCE,
    YOLO_DEVICE,
    YOLO_FAR_CONFIDENCE,
    YOLO_FAR_DETECT_INTERVAL,
    YOLO_FAR_IOU,
    YOLO_FAR_MAX_BOX_HEIGHT,
    YOLO_FAR_MAX_BOX_WIDTH,
    YOLO_FAR_MAX_DET,
    YOLO_FAR_MIN_BOX_HEIGHT,
    YOLO_FAR_MIN_BOX_WIDTH,
    YOLO_FAR_RESIZE_SCALE,
    YOLO_FAR_TOP_RATIO,
    YOLO_IMGSZ,
    YOLO_IOU,
    YOLO_MODEL_PATHS,
    YOLO_TARGET_CLASSES,
)


# YOLO 탐지 결과 하나를 API에서 쓰는 공통 형식으로 표현합니다.
@dataclass(frozen=True)
class Detection:
    bbox: list[float]
    class_id: int
    class_name: str
    confidence: float
    track_id: int | None = None
    source: str = "full_frame"

    # 객체 상태를 JSON 응답에 맞는 dict로 변환합니다.
    def to_dict(self) -> dict[str, Any]:
        return {
            "bbox": self.bbox,
            "bbox_format": "xyxy",
            "class_id": self.class_id,
            "class_name": self.class_name,
            "confidence": self.confidence,
            "track_id": self.track_id,
            "source": self.source,
        }


# YOLO 모델 로드, 추론, 결과 파싱, 원거리 crop 보강 탐지를 담당합니다.
class YoloDetector:
    # 객체 생성에 필요한 설정값과 내부 상태를 초기화합니다.
    def __init__(
        self,
        model_paths: list[str] | None = None,
        target_classes: set[str] | None = None,
        default_confidence: float = YOLO_CONFIDENCE,
        default_iou: float = YOLO_IOU,
        default_imgsz: int = YOLO_IMGSZ,
        device: str | None = YOLO_DEVICE,
    ) -> None:
        self.model_paths = model_paths or YOLO_MODEL_PATHS
        self.target_classes = target_classes or YOLO_TARGET_CLASSES
        self.default_confidence = default_confidence
        self.default_iou = default_iou
        self.default_imgsz = default_imgsz
        self.device = device

        self._model: Any | None = None
        self._model_name: str | None = None
        self._load_error: str | None = None
        self._lock = Lock()
        self._predict_lock = Lock()

    # model_name 기능을 수행하는 함수입니다.
    @property
    def model_name(self) -> str | None:
        self._ensure_model_loaded()
        return self._model_name

    # current_model_name 기능을 수행하는 함수입니다.
    @property
    def current_model_name(self) -> str | None:
        return self._model_name

    # load_error 기능을 수행하는 함수입니다.
    @property
    def load_error(self) -> str | None:
        return self._load_error

    # 프레임에 대해 YOLO 추론을 실행하고 Detection 목록을 반환합니다.
    def detect(
        self,
        frame: np.ndarray,
        confidence: float | None = None,
        iou: float | None = None,
        imgsz: int | None = None,
        frame_id: int | None = None,
        lock_already_held: bool = False,
    ) -> list[Detection]:
        model = self._ensure_model_loaded()
        effective_confidence = confidence if confidence is not None else self.default_confidence
        effective_iou = iou if iou is not None else self.default_iou
        effective_imgsz = imgsz or self.default_imgsz
        if lock_already_held:
            return self._detect_locked(
                model=model,
                frame=frame,
                confidence=effective_confidence,
                iou=effective_iou,
                imgsz=effective_imgsz,
                frame_id=frame_id,
            )

        with self._predict_lock:
            return self._detect_locked(
                model=model,
                frame=frame,
                confidence=effective_confidence,
                iou=effective_iou,
                imgsz=effective_imgsz,
                frame_id=frame_id,
            )

    # acquire_predict_slot 기능을 수행하는 함수입니다.
    def acquire_predict_slot(self, timeout: float | None = None) -> bool:
        if timeout is None:
            self._predict_lock.acquire()
            return True
        return self._predict_lock.acquire(timeout=timeout)

    # release_predict_slot 기능을 수행하는 함수입니다.
    def release_predict_slot(self) -> None:
        self._predict_lock.release()

    # _detect_locked 내부 보조 함수로 주요 처리 흐름을 분리합니다.
    def _detect_locked(
        self,
        *,
        model: Any,
        frame: np.ndarray,
        confidence: float,
        iou: float,
        imgsz: int,
        frame_id: int | None,
    ) -> list[Detection]:
        results = model.predict(
            source=frame,
            conf=confidence,
            iou=iou,
            imgsz=imgsz,
            verbose=False,
            **self._device_kwargs(),
        )
        detections = self._parse_result(results[0], source="full_frame") if results else []

        if self._should_run_far_crop(frame_id):
            detections.extend(
                self._detect_far_crop(
                    model=model,
                    frame=frame,
                    imgsz=imgsz,
                )
            )

        return detections

    # _ensure_model_loaded 내부 보조 함수로 주요 처리 흐름을 분리합니다.
    def _ensure_model_loaded(self) -> Any:
        if self._model is not None:
            return self._model

        with self._lock:
            if self._model is not None:
                return self._model

            try:
                from ultralytics import YOLO
            except ImportError as exc:
                self._load_error = (
                    "ultralytics is not installed. Run `uv pip install -r requirements.txt "
                    "--python .\\.venv\\Scripts\\python.exe`."
                )
                raise RuntimeError(self._load_error) from exc

            errors: list[str] = []
            for model_path in self.model_paths:
                try:
                    self._model = YOLO(model_path)
                    self._model_name = model_path
                    self._load_error = None
                    return self._model
                except Exception as exc:
                    errors.append(f"{model_path}: {exc}")

            self._load_error = "Failed to load YOLO model. " + " | ".join(errors)
            raise RuntimeError(self._load_error)

    # _parse_result 내부 보조 함수로 주요 처리 흐름을 분리합니다.
    def _parse_result(
        self,
        result: Any,
        *,
        source: str,
        offset_x: float = 0.0,
        offset_y: float = 0.0,
        scale: float = 1.0,
        min_width: float | None = None,
        min_height: float | None = None,
        max_width: float | None = None,
        max_height: float | None = None,
    ) -> list[Detection]:
        boxes = getattr(result, "boxes", None)
        if boxes is None or len(boxes) == 0:
            return []

        names = getattr(result, "names", {}) or {}
        detections: list[Detection] = []

        xyxy_values = boxes.xyxy.cpu().tolist()
        class_values = boxes.cls.cpu().tolist()
        confidence_values = boxes.conf.cpu().tolist()
        track_values = None
        if getattr(boxes, "id", None) is not None:
            track_values = boxes.id.cpu().tolist()

        for index, xyxy in enumerate(xyxy_values):
            class_id = int(class_values[index])
            class_name = str(names.get(class_id, class_id)).lower()
            if self.target_classes and class_name not in self.target_classes:
                continue

            x1, y1, x2, y2 = [
                (float(value) / scale)
                for value in xyxy
            ]
            x1 += offset_x
            x2 += offset_x
            y1 += offset_y
            y2 += offset_y

            width = x2 - x1
            height = y2 - y1
            if min_width is not None and width < min_width:
                continue
            if min_height is not None and height < min_height:
                continue
            if max_width is not None and width > max_width:
                continue
            if max_height is not None and height > max_height:
                continue

            track_id = None
            if track_values is not None and track_values[index] is not None:
                track_id = int(track_values[index])

            detections.append(
                Detection(
                    bbox=[round(value, 2) for value in [x1, y1, x2, y2]],
                    class_id=class_id,
                    class_name=class_name,
                    confidence=round(float(confidence_values[index]), 4),
                    track_id=track_id,
                    source=source,
                )
            )

        return detections

    # _detect_far_crop 내부 보조 함수로 주요 처리 흐름을 분리합니다.
    def _detect_far_crop(
        self,
        *,
        model: Any,
        frame: np.ndarray,
        imgsz: int,
    ) -> list[Detection]:
        height, width = frame.shape[:2]
        crop_bottom = int(height * YOLO_FAR_TOP_RATIO)
        far_crop = frame[:crop_bottom, :width]
        if far_crop.size <= 0:
            return []

        far_resized = far_crop
        if YOLO_FAR_RESIZE_SCALE != 1.0:
            import cv2

            far_resized = cv2.resize(
                far_crop,
                None,
                fx=YOLO_FAR_RESIZE_SCALE,
                fy=YOLO_FAR_RESIZE_SCALE,
                interpolation=cv2.INTER_CUBIC,
            )

        results = model.predict(
            source=far_resized,
            conf=YOLO_FAR_CONFIDENCE,
            iou=YOLO_FAR_IOU,
            imgsz=imgsz,
            agnostic_nms=True,
            max_det=YOLO_FAR_MAX_DET,
            verbose=False,
            **self._device_kwargs(),
        )
        if not results:
            return []

        return self._parse_result(
            results[0],
            source="far_crop",
            scale=YOLO_FAR_RESIZE_SCALE,
            min_width=YOLO_FAR_MIN_BOX_WIDTH,
            min_height=YOLO_FAR_MIN_BOX_HEIGHT,
            max_width=YOLO_FAR_MAX_BOX_WIDTH,
            max_height=YOLO_FAR_MAX_BOX_HEIGHT,
        )

    # _should_run_far_crop 내부 보조 함수로 주요 처리 흐름을 분리합니다.
    @staticmethod
    def _should_run_far_crop(frame_id: int | None) -> bool:
        if YOLO_FAR_DETECT_INTERVAL <= 1:
            return True
        if frame_id is None:
            return True
        return frame_id % YOLO_FAR_DETECT_INTERVAL == 0

    # _device_kwargs 내부 보조 함수로 주요 처리 흐름을 분리합니다.
    def _device_kwargs(self) -> dict[str, str]:
        return {"device": self.device} if self.device else {}


detector = YoloDetector()
