"""incident models 도메인의 SQLAlchemy 영속성 모델을 정의한다.

테이블 컬럼, 관계, 제약 조건과 생성·수정 시각 등 데이터베이스 계약을 표현한다."""

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db


# 설명: `Incident` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class Incident(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'incidents'로 설정한다.
    __tablename__ = "incidents"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)

    # 설명: `incident_code`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    incident_code = db.Column(db.String(50), nullable=False, unique=True)

    # 설명: `report_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    report_id = db.Column(db.BigInteger, db.ForeignKey("incident_reports.id"), nullable=True)
    # 설명: `cctv_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    cctv_id = db.Column(db.BigInteger, nullable=True)

    # 설명: `incident_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    incident_type = db.Column(db.String(50), nullable=False)
    # 설명: `incident_status`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    incident_status = db.Column(db.String(50), nullable=False, default="DETECTED")
    # 설명: `risk_level`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    risk_level = db.Column(db.String(50), nullable=False, default="MEDIUM")

    # 설명: `confidence`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    confidence = db.Column(db.Numeric(5, 4), nullable=True)
    # 설명: `stopped_duration_seconds`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    stopped_duration_seconds = db.Column(db.Integer, nullable=True)

    # 설명: `location_name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    location_name = db.Column(db.String(255), nullable=True)
    # 설명: `latitude`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    latitude = db.Column(db.Numeric(10, 7), nullable=True)
    # 설명: `longitude`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    longitude = db.Column(db.Numeric(10, 7), nullable=True)

    # 설명: `detected_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    detected_at = db.Column(db.DateTime, nullable=False)
    # 설명: `resolved_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    resolved_at = db.Column(db.DateTime, nullable=True)

    # 설명: `created_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_at = db.Column(db.DateTime, nullable=False)
    # 설명: `updated_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    updated_at = db.Column(db.DateTime, nullable=True)
    # 설명: `deleted_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    deleted_at = db.Column(db.DateTime, nullable=True)

    # 설명: `to_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def to_dict(self):
        # 설명: 호출자에게 {'id': self.id, 'incident_code': self.incident_code, 'report_id': self.report_i... 값을 함수 결과로 반환한다.
        return {
            "id": self.id,
            "incident_code": self.incident_code,
            "report_id": self.report_id,
            "cctv_id": self.cctv_id,
            "incident_type": self.incident_type,
            "incident_status": self.incident_status,
            "risk_level": self.risk_level,
            "confidence": float(self.confidence) if self.confidence is not None else None,
            "stopped_duration_seconds": self.stopped_duration_seconds,
            "location_name": self.location_name,
            "latitude": float(self.latitude) if self.latitude is not None else None,
            "longitude": float(self.longitude) if self.longitude is not None else None,
            "detected_at": self.detected_at.isoformat() if self.detected_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "deleted_at": self.deleted_at.isoformat() if self.deleted_at else None,
        }


# 설명: `DetectionLog` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class DetectionLog(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'detection_logs'로 설정한다.
    __tablename__ = "detection_logs"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)

    # 설명: `incident_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=False)
    # 설명: `report_analysis_job_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    report_analysis_job_id = db.Column(
        db.BigInteger,
        db.ForeignKey("report_analysis_jobs.id"),
        nullable=True,
    )

    # 설명: `model_name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    model_name = db.Column(db.String(100), nullable=True)
    # 설명: `model_version`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    model_version = db.Column(db.String(50), nullable=True)

    # 설명: `detected_class`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    detected_class = db.Column(db.String(100), nullable=True)
    # 설명: `confidence`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    confidence = db.Column(db.Numeric(5, 4), nullable=True)

    # 설명: `bbox_json`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    bbox_json = db.Column(db.JSON, nullable=True)
    # 설명: `roi_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    roi_type = db.Column(db.String(50), nullable=False, default="UNKNOWN")

    # 설명: `movement_delta_px`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    movement_delta_px = db.Column(db.Numeric(10, 3), nullable=True)
    # 설명: `stopped_duration_seconds`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    stopped_duration_seconds = db.Column(db.Integer, nullable=True)
    # 설명: `frame_timestamp_ms`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    frame_timestamp_ms = db.Column(db.BigInteger, nullable=True)

    # 설명: `raw_result_json`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    raw_result_json = db.Column(db.JSON, nullable=True)

    # 설명: `detected_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    detected_at = db.Column(db.DateTime, nullable=False)
    # 설명: `created_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_at = db.Column(db.DateTime, nullable=False)

    # 설명: `to_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def to_dict(self):
        # 설명: 호출자에게 {'id': self.id, 'incident_id': self.incident_id, 'report_analysis_job_id': self... 값을 함수 결과로 반환한다.
        return {
            "id": self.id,
            "incident_id": self.incident_id,
            "report_analysis_job_id": self.report_analysis_job_id,
            "model_name": self.model_name,
            "model_version": self.model_version,
            "detected_class": self.detected_class,
            "confidence": float(self.confidence) if self.confidence is not None else None,
            "bbox_json": self.bbox_json,
            "roi_type": self.roi_type,
            "movement_delta_px": float(self.movement_delta_px) if self.movement_delta_px is not None else None,
            "stopped_duration_seconds": self.stopped_duration_seconds,
            "frame_timestamp_ms": self.frame_timestamp_ms,
            "raw_result_json": self.raw_result_json,
            "detected_at": self.detected_at.isoformat() if self.detected_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# 설명: `IncidentSnapshot` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class IncidentSnapshot(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'incident_snapshots'로 설정한다.
    __tablename__ = "incident_snapshots"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)

    # 설명: `incident_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=False)
    # 설명: `detection_log_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    detection_log_id = db.Column(db.BigInteger, db.ForeignKey("detection_logs.id"), nullable=True)

    # 설명: `file_path`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    file_path = db.Column(db.String(500), nullable=False)
    # 설명: `thumbnail_path`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    thumbnail_path = db.Column(db.String(500), nullable=True)
    # 설명: `bbox_json`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    bbox_json = db.Column(db.JSON, nullable=True)

    # 설명: `captured_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    captured_at = db.Column(db.DateTime, nullable=False)
    # 설명: `created_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_at = db.Column(db.DateTime, nullable=False)

    # 설명: `to_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def to_dict(self):
        # 설명: 호출자에게 {'id': self.id, 'incident_id': self.incident_id, 'detection_log_id': self.detec... 값을 함수 결과로 반환한다.
        return {
            "id": self.id,
            "incident_id": self.incident_id,
            "detection_log_id": self.detection_log_id,
            "file_path": self.file_path,
            "thumbnail_path": self.thumbnail_path,
            "bbox_json": self.bbox_json,
            "captured_at": self.captured_at.isoformat() if self.captured_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
