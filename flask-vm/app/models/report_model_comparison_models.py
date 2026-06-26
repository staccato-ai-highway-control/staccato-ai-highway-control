from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from app.extensions import db


def _to_dict(model) -> dict:
    data = {}

    for column in model.__table__.columns:
        value = getattr(model, column.name)

        if isinstance(value, datetime):
            value = value.isoformat()
        elif isinstance(value, Decimal):
            value = float(value)

        data[column.name] = value

    return data


class ReportModelComparisonBatch(db.Model):
    """한 신고 첨부파일에 대한 최대 3개 모델 비교 분석 요청 묶음."""

    __tablename__ = "report_model_comparison_batches"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)

    report_id = db.Column(
        db.BigInteger,
        db.ForeignKey("incident_reports.id"),
        nullable=False,
    )
    attachment_id = db.Column(
        db.BigInteger,
        db.ForeignKey("report_attachments.id"),
        nullable=False,
    )
    requested_by = db.Column(
        db.BigInteger,
        db.ForeignKey("users.id"),
        nullable=True,
    )

    batch_status = db.Column(db.String(30), nullable=False)
    selected_model_count = db.Column(db.Integer, nullable=False)

    created_at = db.Column(db.DateTime, nullable=False)
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self) -> dict:
        return _to_dict(self)


class ReportModelComparisonRun(db.Model):
    """비교 Batch 안에서 특정 모델 하나를 실행한 결과."""

    __tablename__ = "report_model_comparison_runs"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)

    batch_id = db.Column(
        db.BigInteger,
        db.ForeignKey("report_model_comparison_batches.id"),
        nullable=False,
    )

    model_id = db.Column(db.String(100), nullable=False)
    model_name = db.Column(db.String(100), nullable=True)
    model_version = db.Column(db.String(100), nullable=True)

    run_status = db.Column(db.String(30), nullable=False)
    request_order = db.Column(db.Integer, nullable=False)
    attempt_count = db.Column(db.Integer, nullable=False, default=0)

    total_frames = db.Column(db.Integer, nullable=True)
    processed_frames = db.Column(db.Integer, nullable=True)
    total_elapsed_ms = db.Column(db.Integer, nullable=True)
    inference_ms = db.Column(db.Integer, nullable=True)
    processed_fps = db.Column(db.Numeric(10, 2), nullable=True)
    inference_fps = db.Column(db.Numeric(10, 2), nullable=True)

    detection_count = db.Column(db.Integer, nullable=True)
    avg_confidence = db.Column(db.Numeric(6, 5), nullable=True)
    max_confidence = db.Column(db.Numeric(6, 5), nullable=True)
    class_summary = db.Column(db.JSON, nullable=True)

    result_summary = db.Column(db.JSON, nullable=True)
    annotated_media_url = db.Column(db.String(500), nullable=True)

    error_code = db.Column(db.String(100), nullable=True)
    error_message = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, nullable=False)
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self) -> dict:
        return _to_dict(self)
