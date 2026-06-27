from __future__ import annotations

import os
from datetime import UTC, datetime

from app.extensions import db
from app.models import (
    IncidentReport,
    ReportAttachment,
    ReportModelComparisonBatch,
    ReportModelComparisonRun,
)


class ReportModelComparisonService:
    """기존 신고 분석과 분리된 다중 모델 비교 분석 Batch/Run 도메인."""

    ADMIN_ROLES = {"SUPER_ADMIN", "CONTROL_ADMIN"}
    ACTIVE_BATCH_STATUSES = {"QUEUED", "RUNNING"}
    MAX_MODEL_COUNT = 3

    MODEL_CATALOG = (
        {
            "model_id": "yolo11s",
            "model_name": "YOLO11 Small",
            "model_version": "best.pt",
            "description": "YOLO11 Small 기반 차량 탐지 모델",
        },
        {
            "model_id": "keras_yolov8",
            "model_name": "Keras YOLOv8 Vehicle Detector",
            "model_version": "best.keras",
            "description": "KerasCV YOLOv8 기반 차량 탐지 모델 (CPU)",
        },
        {
            "model_id": "rtdetr",
            "model_name": "RT-DETR Vehicle Detector",
            "model_version": "best.pt",
            "description": "RT-DETR 기반 차량 탐지 모델",
        },
    )

    @staticmethod
    def _now():
        return datetime.now(UTC)

    @classmethod
    def _is_admin(cls, current_user) -> bool:
        return bool(
            current_user
            and getattr(current_user, "role", None) in cls.ADMIN_ROLES
        )

    @classmethod
    def _require_admin(cls, current_user):
        if cls._is_admin(current_user):
            return None

        return {
            "success": False,
            "error": "비교 분석은 관리자만 요청하거나 조회할 수 있습니다.",
        }, 403

    @classmethod
    def _model_catalog_map(cls) -> dict[str, dict]:
        return {
            item["model_id"]: dict(item)
            for item in cls.MODEL_CATALOG
        }

    @staticmethod
    def _serialize_run(run: ReportModelComparisonRun) -> dict:
        data = run.to_dict()
        data["status"] = run.run_status
        return data

    @classmethod
    def _serialize_batch(
        cls,
        batch: ReportModelComparisonBatch,
        include_runs: bool = True,
    ) -> dict:
        data = batch.to_dict()
        data["status"] = batch.batch_status

        if not include_runs:
            return data

        runs = (
            ReportModelComparisonRun.query
            .filter(ReportModelComparisonRun.batch_id == batch.id)
            .order_by(
                ReportModelComparisonRun.request_order.asc(),
                ReportModelComparisonRun.id.asc(),
            )
            .all()
        )

        status_counts: dict[str, int] = {}
        serialized_runs = []

        for run in runs:
            status = str(run.run_status or "").upper() or "UNKNOWN"
            status_counts[status] = status_counts.get(status, 0) + 1
            serialized_runs.append(cls._serialize_run(run))

        data["runs"] = serialized_runs
        data["run_summary"] = {
            "total": len(serialized_runs),
            "by_status": status_counts,
        }
        return data

    @classmethod
    def list_all_batches(cls, current_user, page=1, size=20, status=None):
        denied = cls._require_admin(current_user)
        if denied:
            return denied

        from math import ceil

        page = max(1, int(page or 1))
        size = max(1, min(int(size or 20), 100))

        query = ReportModelComparisonBatch.query

        valid_statuses = {"QUEUED", "RUNNING", "COMPLETED", "PARTIAL_FAILED", "FAILED"}
        if status and status.upper() in valid_statuses:
            query = query.filter(
                ReportModelComparisonBatch.batch_status == status.upper()
            )

        total_count = query.count()
        total_pages = max(1, ceil(total_count / size))

        batches = (
            query
            .order_by(ReportModelComparisonBatch.id.desc())
            .offset((page - 1) * size)
            .limit(size)
            .all()
        )

        items = []
        for batch in batches:
            batch_dict = cls._serialize_batch(batch, include_runs=True)

            report = db.session.get(IncidentReport, batch.report_id)
            if report:
                batch_dict["report_code"] = getattr(report, "report_code", None)
                batch_dict["report_title"] = (
                    getattr(report, "title", None)
                    or getattr(report, "subject", None)
                )

            items.append(batch_dict)

        return {
            "success": True,
            "page": page,
            "size": size,
            "total_count": total_count,
            "total_pages": total_pages,
            "batches": items,
        }, 200

    @classmethod
    def list_models(cls, current_user):
        denied = cls._require_admin(current_user)
        if denied:
            return denied

        return {
            "success": True,
            "max_model_count": cls.MAX_MODEL_COUNT,
            "models": [dict(item) for item in cls.MODEL_CATALOG],
        }, 200

    @classmethod
    def create_batch(cls, report_id: int, data: dict, current_user):
        denied = cls._require_admin(current_user)
        if denied:
            return denied

        if not isinstance(data, dict):
            return {
                "success": False,
                "error": "Request body must be a JSON object.",
            }, 400

        attachment_id = data.get("attachment_id", data.get("attachmentId"))
        model_ids = data.get("model_ids", data.get("modelIds"))

        try:
            attachment_id = int(attachment_id)
        except (TypeError, ValueError):
            return {
                "success": False,
                "error": "attachment_id는 필수 정수값입니다.",
            }, 400

        if not isinstance(model_ids, list):
            return {
                "success": False,
                "error": "model_ids는 1개 이상 3개 이하의 배열이어야 합니다.",
            }, 400

        if not 1 <= len(model_ids) <= cls.MAX_MODEL_COUNT:
            return {
                "success": False,
                "error": f"모델은 1개 이상 {cls.MAX_MODEL_COUNT}개 이하로 선택해야 합니다.",
            }, 400

        normalized_model_ids = []
        for raw_model_id in model_ids:
            model_id = str(raw_model_id or "").strip().lower()

            if not model_id:
                return {
                    "success": False,
                    "error": "비어 있는 model_id는 사용할 수 없습니다.",
                }, 400

            normalized_model_ids.append(model_id)

        if len(set(normalized_model_ids)) != len(normalized_model_ids):
            return {
                "success": False,
                "error": "동일 모델을 중복 선택할 수 없습니다.",
            }, 400

        catalog = cls._model_catalog_map()
        unknown_model_ids = [
            model_id
            for model_id in normalized_model_ids
            if model_id not in catalog
        ]

        if unknown_model_ids:
            return {
                "success": False,
                "error": "지원하지 않는 모델이 포함되어 있습니다.",
                "unknown_model_ids": unknown_model_ids,
            }, 400

        report = db.session.get(IncidentReport, report_id)
        if not report or getattr(report, "deleted_at", None):
            return {
                "success": False,
                "error": "신고를 찾을 수 없거나 삭제된 신고입니다.",
            }, 404

        attachment = db.session.get(ReportAttachment, attachment_id)
        if (
            not attachment
            or attachment.report_id != report.id
            or getattr(attachment, "deleted_at", None)
        ):
            return {
                "success": False,
                "error": "해당 신고에 연결된 유효한 첨부파일을 찾을 수 없습니다.",
            }, 404

        is_video = (
            str(getattr(attachment, "mime_type", "")).lower().startswith("video/")
            or str(getattr(attachment, "file_type", "")).upper() == "VIDEO"
        )

        if not is_video:
            return {
                "success": False,
                "error": "비교 분석은 동영상 첨부파일에만 요청할 수 있습니다.",
            }, 400

        active_batches = (
            ReportModelComparisonBatch.query
            .filter(
                ReportModelComparisonBatch.report_id == report.id,
                ReportModelComparisonBatch.attachment_id == attachment.id,
                ReportModelComparisonBatch.batch_status.in_(
                    cls.ACTIVE_BATCH_STATUSES
                ),
            )
            .order_by(ReportModelComparisonBatch.id.desc())
            .all()
        )

        requested_set = set(normalized_model_ids)

        for active_batch in active_batches:
            active_runs = (
                ReportModelComparisonRun.query
                .filter(ReportModelComparisonRun.batch_id == active_batch.id)
                .all()
            )
            active_set = {run.model_id for run in active_runs}

            if active_set == requested_set:
                return {
                    "success": False,
                    "error": "동일한 모델 조합의 비교 분석이 이미 진행 중입니다.",
                    "batch": cls._serialize_batch(active_batch),
                }, 409

        now = cls._now()

        try:
            batch = ReportModelComparisonBatch(
                report_id=report.id,
                attachment_id=attachment.id,
                requested_by=getattr(current_user, "id", None),
                batch_status="QUEUED",
                selected_model_count=len(normalized_model_ids),
                created_at=now,
                updated_at=now,
            )
            db.session.add(batch)
            db.session.flush()

            for request_order, model_id in enumerate(normalized_model_ids, start=1):
                model = catalog[model_id]

                db.session.add(
                    ReportModelComparisonRun(
                        batch_id=batch.id,
                        model_id=model_id,
                        model_name=model["model_name"],
                        model_version=model["model_version"],
                        run_status="QUEUED",
                        request_order=request_order,
                        attempt_count=0,
                        created_at=now,
                        updated_at=now,
                    )
                )

            db.session.commit()

        except Exception:
            db.session.rollback()
            raise

        return {
            "success": True,
            "message": "모델 비교 분석 요청이 대기열에 등록되었습니다.",
            "batch": cls._serialize_batch(batch),
        }, 201

    @classmethod
    def list_report_batches(cls, report_id: int, current_user):
        denied = cls._require_admin(current_user)
        if denied:
            return denied

        report = db.session.get(IncidentReport, report_id)
        if not report or getattr(report, "deleted_at", None):
            return {
                "success": False,
                "error": "신고를 찾을 수 없거나 삭제된 신고입니다.",
            }, 404

        batches = (
            ReportModelComparisonBatch.query
            .filter(ReportModelComparisonBatch.report_id == report.id)
            .order_by(ReportModelComparisonBatch.id.desc())
            .limit(50)
            .all()
        )

        return {
            "success": True,
            "report_id": report.id,
            "batches": [
                cls._serialize_batch(batch)
                for batch in batches
            ],
        }, 200

    @classmethod
    def get_batch(cls, batch_id: int, current_user):
        denied = cls._require_admin(current_user)
        if denied:
            return denied

        batch = db.session.get(ReportModelComparisonBatch, batch_id)
        if not batch:
            return {
                "success": False,
                "error": "비교 분석 Batch를 찾을 수 없습니다.",
            }, 404

        return {
            "success": True,
            "batch": cls._serialize_batch(batch),
        }, 200

    @staticmethod
    def _comparison_int(value):
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _comparison_float(value):
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _comparison_detect_timeout_seconds():
        """비교 분석은 모델 지연 로드와 영상 처리를 고려해 별도 timeout을 사용한다."""
        default_seconds = 300
        minimum_seconds = 30
        maximum_seconds = 900

        try:
            configured_seconds = int(
                os.getenv(
                    "REPORT_MODEL_COMPARISON_DETECT_TIMEOUT_SECONDS",
                    str(default_seconds),
                )
            )
        except (TypeError, ValueError):
            configured_seconds = default_seconds

        return max(
            minimum_seconds,
            min(configured_seconds, maximum_seconds),
        )

    @classmethod
    def _refresh_batch_status(cls, batch_id: int, now=None):
        """하위 Run 상태를 기준으로 비교 Batch의 대표 상태를 다시 계산한다."""
        batch = db.session.get(ReportModelComparisonBatch, batch_id)

        if not batch:
            return None

        runs = (
            ReportModelComparisonRun.query
            .filter(ReportModelComparisonRun.batch_id == batch.id)
            .all()
        )

        statuses = {
            str(run.run_status or "").strip().upper()
            for run in runs
        }

        if statuses & {"QUEUED", "RUNNING"}:
            batch.batch_status = "RUNNING"
        elif statuses and statuses == {"COMPLETED"}:
            batch.batch_status = "COMPLETED"
        elif "COMPLETED" in statuses:
            batch.batch_status = "PARTIAL_FAILED"
        else:
            batch.batch_status = "FAILED"

        now = now or cls._now()

        if batch.batch_status in {
            "COMPLETED",
            "PARTIAL_FAILED",
            "FAILED",
        }:
            batch.completed_at = now

        batch.updated_at = now
        return batch

    @classmethod
    def _complete_comparison_run(
        cls,
        run: ReportModelComparisonRun,
        response: dict,
        completed_at,
    ):
        """AI-vm 성공 응답을 비교 분석 Run 결과 컬럼에 저장한다."""
        detections = response.get("detections")

        if not isinstance(detections, list):
            detections = []

        detection_count = cls._comparison_int(response.get("count"))

        if detection_count is None:
            detection_count = len(detections)

        annotated_media_url = (
            response.get("annotated_video_url")
            or response.get("annotated_image_url")
        )

        run.run_status = "COMPLETED"
        run.model_name = response.get("model_name") or run.model_name
        run.model_version = response.get("model_version") or run.model_version
        run.total_frames = cls._comparison_int(response.get("total_frames"))
        run.processed_frames = cls._comparison_int(
            response.get("frames_processed")
        )
        run.total_elapsed_ms = cls._comparison_int(
            response.get("total_elapsed_ms")
        )
        run.inference_ms = cls._comparison_int(response.get("inference_ms"))
        run.processed_fps = cls._comparison_float(
            response.get("processed_fps")
        )
        run.inference_fps = cls._comparison_float(
            response.get("inference_fps")
        )
        run.detection_count = detection_count
        run.avg_confidence = cls._comparison_float(
            response.get("avg_confidence")
        )
        run.max_confidence = cls._comparison_float(
            response.get("max_confidence")
        )
        run.class_summary = (
            response.get("class_summary")
            if isinstance(response.get("class_summary"), dict)
            else {}
        )
        run.result_summary = response
        run.annotated_media_url = annotated_media_url
        run.error_code = None
        run.error_message = None
        run.completed_at = completed_at
        run.updated_at = completed_at

    @classmethod
    def _fail_comparison_run(
        cls,
        run: ReportModelComparisonRun,
        error_code: str,
        error_message: str,
        completed_at,
        result_summary=None,
    ):
        """단일 모델 실행 실패를 기록하되 같은 Batch의 다른 모델 실행은 유지한다."""
        run.run_status = "FAILED"
        run.error_code = str(error_code or "COMPARISON_RUN_FAILED")[:100]
        run.error_message = str(error_message or "")[:4000]
        run.result_summary = (
            result_summary
            if isinstance(result_summary, dict)
            else None
        )
        run.completed_at = completed_at
        run.updated_at = completed_at

    @classmethod
    def process_comparison_run(cls, run_id: int):
        """QUEUED 상태의 비교 분석 Run 한 건을 AI-vm에 전달해 결과를 저장한다."""
        from app.modules.ai_gateway.service import AIGatewayService

        run = db.session.get(ReportModelComparisonRun, run_id)

        if not run:
            return {
                "success": False,
                "error": "비교 분석 Run을 찾을 수 없습니다.",
            }, 404

        if run.run_status != "QUEUED":
            return {
                "success": False,
                "error": "QUEUED 상태의 비교 분석 Run만 처리할 수 있습니다.",
                "run": cls._serialize_run(run),
            }, 409

        batch = db.session.get(ReportModelComparisonBatch, run.batch_id)

        if not batch:
            completed_at = cls._now()
            cls._fail_comparison_run(
                run=run,
                error_code="MISSING_COMPARISON_BATCH",
                error_message="Comparison batch not found.",
                completed_at=completed_at,
            )
            db.session.commit()

            return {
                "success": False,
                "error": "비교 분석 Batch를 찾을 수 없습니다.",
            }, 404

        report = db.session.get(IncidentReport, batch.report_id)
        attachment = db.session.get(ReportAttachment, batch.attachment_id)

        if (
            not report
            or not attachment
            or attachment.report_id != report.id
            or getattr(attachment, "deleted_at", None)
        ):
            completed_at = cls._now()
            cls._fail_comparison_run(
                run=run,
                error_code="MISSING_REPORT_OR_ATTACHMENT",
                error_message="Report or attachment not found.",
                completed_at=completed_at,
            )
            cls._refresh_batch_status(batch.id, now=completed_at)
            db.session.commit()

            return {
                "success": False,
                "error": "신고 또는 첨부파일을 찾을 수 없습니다.",
            }, 404

        started_at = cls._now()

        run.run_status = "RUNNING"
        run.attempt_count = int(run.attempt_count or 0) + 1
        run.started_at = run.started_at or started_at
        run.updated_at = started_at

        if batch.batch_status == "QUEUED":
            batch.batch_status = "RUNNING"
            batch.started_at = batch.started_at or started_at

        batch.updated_at = started_at
        db.session.commit()

        camera_id = (
            f"camera-{report.cctv_id}"
            if getattr(report, "cctv_id", None)
            else None
        )

        try:
            success, response = AIGatewayService.request_analysis(
                report_id=report.id,
                file_path=attachment.file_path,
                cctv_id=getattr(report, "cctv_id", None),
                camera_id=camera_id,
                model_id=run.model_id,
                comparison_run_id=str(run.id),
                timeout_seconds=cls._comparison_detect_timeout_seconds(),
            )
        except Exception as exc:
            success = False
            response = {
                "status": "comparison_ai_request_exception",
                "message": str(exc),
            }

        completed_at = cls._now()
        result = response if isinstance(response, dict) else {
            "raw_response": str(response),
        }

        is_completed = bool(
            success
            and (
                str(result.get("status", "")).upper() == "OK"
                or "count" in result
                or "detections" in result
            )
        )

        if is_completed:
            cls._complete_comparison_run(
                run=run,
                response=result,
                completed_at=completed_at,
            )
        else:
            cls._fail_comparison_run(
                run=run,
                error_code=result.get(
                    "status",
                    "COMPARISON_AI_REQUEST_FAILED",
                ),
                error_message=result.get(
                    "message",
                    str(result),
                ),
                completed_at=completed_at,
                result_summary=result,
            )

        cls._refresh_batch_status(batch.id, now=completed_at)
        db.session.commit()

        refreshed_batch = db.session.get(
            ReportModelComparisonBatch,
            batch.id,
        )

        return {
            "success": run.run_status == "COMPLETED",
            "batch_id": batch.id,
            "batch_status": refreshed_batch.batch_status,
            "run": cls._serialize_run(run),
        }, 200

    @classmethod
    def process_queued_comparison_runs(cls, limit=3):
        """최대 3개의 비교 분석 Run을 오래된 요청 순서대로 순차 실행한다."""
        try:
            limit = max(1, min(int(limit), cls.MAX_MODEL_COUNT))
        except (TypeError, ValueError):
            limit = cls.MAX_MODEL_COUNT

        queued_runs = (
            ReportModelComparisonRun.query
            .join(
                ReportModelComparisonBatch,
                ReportModelComparisonRun.batch_id
                == ReportModelComparisonBatch.id,
            )
            .filter(
                ReportModelComparisonRun.run_status == "QUEUED",
                ReportModelComparisonBatch.batch_status.in_(
                    cls.ACTIVE_BATCH_STATUSES
                ),
            )
            .order_by(
                ReportModelComparisonBatch.id.asc(),
                ReportModelComparisonRun.request_order.asc(),
                ReportModelComparisonRun.id.asc(),
            )
            .limit(limit)
            .all()
        )

        processed = []
        completed_count = 0
        failed_count = 0

        for queued_run in queued_runs:
            result, _status_code = cls.process_comparison_run(queued_run.id)
            processed.append(result)

            if result.get("success"):
                completed_count += 1
            else:
                failed_count += 1

        return {
            "success": failed_count == 0,
            "requested_limit": limit,
            "processed_count": len(processed),
            "completed_count": completed_count,
            "failed_count": failed_count,
            "items": processed,
        }, 200
