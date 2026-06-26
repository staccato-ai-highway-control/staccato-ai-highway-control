from __future__ import annotations

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
            "model_version": None,
            "description": "YOLO11 Small 기반 차량 탐지 모델",
        },
        {
            "model_id": "yolo11n",
            "model_name": "YOLO11 Nano",
            "model_version": None,
            "description": "YOLO11 Nano 기반 차량 탐지 모델",
        },
        {
            "model_id": "yolo8n",
            "model_name": "YOLOv8 Nano",
            "model_version": None,
            "description": "YOLOv8 Nano 기반 차량 탐지 모델",
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
