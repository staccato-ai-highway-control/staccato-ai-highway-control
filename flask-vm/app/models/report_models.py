"""report models 도메인의 SQLAlchemy 영속성 모델을 정의한다.

테이블 컬럼, 관계, 제약 조건과 생성·수정 시각 등 데이터베이스 계약을 표현한다."""

# 설명: decimal에서 Decimal 이름을 가져와 아래 로직에서 재사용한다.
from decimal import Decimal

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db


# 설명: `IncidentReport` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class IncidentReport(db.Model):
    """신고 한 건의 본문, 처리 상태, 담당자 및 수명주기를 저장하는 부모 엔터티.

    ``id``는 첨부파일, 위치, 분석 작업, 상태 이력에서 ``report_id``로 참조한다.
    SQLAlchemy relationship을 선언하지 않았으므로 자식 데이터는 서비스에서
    ``ReportAttachment.query.filter_by(report_id=...)``처럼 명시적으로 조회한다.
    """

    # 설명: `__tablename__`의 기준값 또는 기본값을 'incident_reports'로 설정한다.
    __tablename__ = "incident_reports"

    # BigInteger PK는 Python에서 int로 다뤄지며 DB가 자동 증가 값을 생성한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)

    # String(n)은 VARCHAR(n), Text는 길이가 큰 자유 서술 값으로 저장된다.
    report_code = db.Column(db.String(50), nullable=False)
    # 설명: `report_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    report_type = db.Column(db.String(50), nullable=False)
    # 설명: `upload_purpose`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    upload_purpose = db.Column(db.String(30), nullable=False)
    # 설명: `report_source_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    report_source_type = db.Column(db.String(30), nullable=False)
    # 설명: `title`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    title = db.Column(db.String(200), nullable=False)
    # 설명: `description`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    description = db.Column(db.Text, nullable=True)
    # users.id를 참조하는 FK들이다. reporter_id는 필수, 검토/종료/삭제 담당자는 선택값이다.
    reporter_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=False)
    # cctv_id는 현재 물리 FK가 아니므로 CCTV 삭제/무결성은 서비스 계층에서 관리한다.
    cctv_id = db.Column(db.BigInteger, nullable=True)
    # 설명: `status`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    status = db.Column(db.String(30), nullable=False)
    # 설명: `priority`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    priority = db.Column(db.String(20), nullable=False)
    # 설명: `risk_level`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    risk_level = db.Column(db.String(20), nullable=True)
    # 설명: `risk_score`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    risk_score = db.Column(db.Integer, nullable=True)
    # 설명: `reviewed_by`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    reviewed_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    # 설명: `closed_by`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    closed_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    # 설명: `reject_reason`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    reject_reason = db.Column(db.Text, nullable=True)
    # 설명: `is_demo_data`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    is_demo_data = db.Column(db.Integer, nullable=False)
    # 설명: `converted_incident_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    converted_incident_id = db.Column(db.BigInteger, nullable=True)
    # DateTime은 DB에는 날짜/시간으로, JSON 응답에서는 ISO 8601 문자열로 변환된다.
    submitted_at = db.Column(db.DateTime, nullable=False)
    # 설명: `reviewed_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    reviewed_at = db.Column(db.DateTime, nullable=True)
    # 설명: `closed_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    closed_at = db.Column(db.DateTime, nullable=True)
    # 설명: `deleted_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    deleted_at = db.Column(db.DateTime, nullable=True)
    # 신고 본문은 물리 삭제하지 않고 deleted_at/deleted_by로 소프트 삭제 이력을 남긴다.
    deleted_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    # 설명: `created_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_at = db.Column(db.DateTime, nullable=False)
    # 설명: `updated_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    updated_at = db.Column(db.DateTime, nullable=True)

    # 설명: `to_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def to_dict(self):
        """ORM 값을 JSON 직렬화 가능한 기본 타입으로 변환한다.

        BigInteger/Integer/String은 그대로 유지하고, DateTime은 ISO 문자열,
        Numeric에서 반환될 수 있는 Decimal은 float로 바꾼다.
        """
        # 설명: `data`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        data = {}
        # 설명: `self.__table__.columns`의 각 항목을 `column`로 받아 반복 처리한다.
        for column in self.__table__.columns:
            # 설명: `value`에 `getattr` 호출 결과를 저장해 다음 처리에서 사용한다.
            value = getattr(self, column.name)
            # 설명: `hasattr(value, 'isoformat')` 조건 결과에 따라 실행 경로를 분기한다.
            if hasattr(value, "isoformat"):
                # 설명: `value`에 `value.isoformat` 호출 결과를 저장해 다음 처리에서 사용한다.
                value = value.isoformat()
            # 설명: `isinstance(value, Decimal)` 조건 결과에 따라 실행 경로를 분기한다.
            elif isinstance(value, Decimal):
                # 설명: `value`에 `float` 호출 결과를 저장해 다음 처리에서 사용한다.
                value = float(value)
            # 설명: `data[column.name]`에 value 표현식의 계산 결과를 저장한다.
            data[column.name] = value
        # 설명: 호출자에게 data 값을 함수 결과로 반환한다.
        return data


# 설명: `ReportAttachment` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class ReportAttachment(db.Model):
    """신고에 첨부된 실제 파일의 저장 위치와 미디어 메타데이터를 보관한다.

    파일 바이트 자체는 DB가 아니라 ``file_path``가 가리키는 스토리지에 저장된다.
    ``report_id``가 부모 신고를, ``uploaded_by/deleted_by``가 사용자를 참조한다.
    """

    # 설명: `__tablename__`의 기준값 또는 기본값을 'report_attachments'로 설정한다.
    __tablename__ = "report_attachments"

    # 부모 1건에 첨부 N건이 연결되는 1:N 구조다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    # 설명: `report_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    report_id = db.Column(db.BigInteger, db.ForeignKey("incident_reports.id"), nullable=False)
    # 설명: `file_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    file_type = db.Column(db.String(30), nullable=False)
    # 설명: `original_filename`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    original_filename = db.Column(db.String(255), nullable=False)
    # 설명: `stored_filename`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    stored_filename = db.Column(db.String(255), nullable=False)
    # 설명: `storage_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    storage_type = db.Column(db.String(30), nullable=False)
    # 설명: `file_path`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    file_path = db.Column(db.String(500), nullable=False)
    # 설명: `file_url`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    file_url = db.Column(db.String(500), nullable=True)
    # 설명: `thumbnail_url`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    thumbnail_url = db.Column(db.String(500), nullable=True)
    # 설명: `file_hash`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    file_hash = db.Column(db.String(255), nullable=False)
    # 설명: `file_size`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    file_size = db.Column(db.BigInteger, nullable=False)
    # 설명: `mime_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    mime_type = db.Column(db.String(100), nullable=False)
    # 설명: `scan_status`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    scan_status = db.Column(db.String(30), nullable=False)
    # 설명: `is_private`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    is_private = db.Column(db.Integer, nullable=False)
    # 설명: `download_count`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    download_count = db.Column(db.Integer, nullable=False)
    # 설명: `access_count`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    access_count = db.Column(db.Integer, nullable=False)
    # Numeric(precision, scale)은 부동소수점 오차를 피하는 DECIMAL이며 Python에서는 Decimal이다.
    duration_seconds = db.Column(db.Numeric(8, 2), nullable=True)
    # 설명: `fps`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    fps = db.Column(db.Numeric(5, 2), nullable=True)
    # 설명: `resolution_width`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    resolution_width = db.Column(db.Integer, nullable=True)
    # 설명: `resolution_height`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    resolution_height = db.Column(db.Integer, nullable=True)
    # 설명: `exif_latitude`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    exif_latitude = db.Column(db.Numeric(10, 7), nullable=True)
    # 설명: `exif_longitude`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    exif_longitude = db.Column(db.Numeric(10, 7), nullable=True)
    # 설명: `recorded_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    recorded_at = db.Column(db.DateTime, nullable=True)
    # 설명: `uploaded_by`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    uploaded_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=False)
    # 설명: `uploaded_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    uploaded_at = db.Column(db.DateTime, nullable=False)
    # 첨부 행도 물리 삭제하지 않아 분석 이력과 감사 참조가 끊기지 않게 한다.
    deleted_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    # 설명: `delete_reason`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    delete_reason = db.Column(db.Text, nullable=True)
    # 설명: `deleted_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    deleted_at = db.Column(db.DateTime, nullable=True)
    # 설명: `created_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_at = db.Column(db.DateTime, nullable=False)

    # 설명: `to_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def to_dict(self):
        """첨부 메타데이터를 API 응답용 타입으로 변환한다."""
        # 설명: `data`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        data = {}
        # 설명: `self.__table__.columns`의 각 항목을 `column`로 받아 반복 처리한다.
        for column in self.__table__.columns:
            # 설명: `value`에 `getattr` 호출 결과를 저장해 다음 처리에서 사용한다.
            value = getattr(self, column.name)
            # 설명: `hasattr(value, 'isoformat')` 조건 결과에 따라 실행 경로를 분기한다.
            if hasattr(value, "isoformat"):
                # 설명: `value`에 `value.isoformat` 호출 결과를 저장해 다음 처리에서 사용한다.
                value = value.isoformat()
            # 설명: `isinstance(value, Decimal)` 조건 결과에 따라 실행 경로를 분기한다.
            elif isinstance(value, Decimal):
                # 설명: `value`에 `float` 호출 결과를 저장해 다음 처리에서 사용한다.
                value = float(value)
            # 설명: `data[column.name]`에 value 표현식의 계산 결과를 저장한다.
            data[column.name] = value
        # 설명: 호출자에게 data 값을 함수 결과로 반환한다.
        return data


# 설명: `ReportAnalysisJob` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class ReportAnalysisJob(db.Model):
    """첨부파일 한 건에 대한 AI 분석 실행과 결과를 추적하는 작업 엔터티.

    ``report_id``와 ``attachment_id``를 함께 사용해 분석 대상을 특정한다.
    하나의 첨부에는 재시도/재분석으로 여러 job이 생길 수 있고, 활성 상태
    (QUEUED/RUNNING/PROCESSING/STARTED)는 서비스에서 중복 생성을 막는다.
    """

    # 설명: `__tablename__`의 기준값 또는 기본값을 'report_analysis_jobs'로 설정한다.
    __tablename__ = "report_analysis_jobs"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    # 설명: `report_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    report_id = db.Column(db.BigInteger, db.ForeignKey("incident_reports.id"), nullable=False)
    # 설명: `attachment_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    attachment_id = db.Column(db.BigInteger, db.ForeignKey("report_attachments.id"), nullable=False)
    # 상태 문자열은 QUEUED -> PROCESSING -> COMPLETED/FAILED 순으로 전이된다.
    job_status = db.Column(db.String(30), nullable=False)
    # 설명: `analysis_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    analysis_type = db.Column(db.String(30), nullable=False)
    # 설명: `ai_engine_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    ai_engine_type = db.Column(db.String(30), nullable=False)
    # 설명: `primary_model_name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    primary_model_name = db.Column(db.String(100), nullable=True)
    # 설명: `primary_model_version`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    primary_model_version = db.Column(db.String(50), nullable=True)
    # 설명: `secondary_model_name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    secondary_model_name = db.Column(db.String(100), nullable=True)
    # 설명: `secondary_model_version`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    secondary_model_version = db.Column(db.String(50), nullable=True)
    # 설명: `model_strategy`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    model_strategy = db.Column(db.String(30), nullable=True)
    # 0.450 같은 임계값은 DECIMAL(4,3)으로 저장해 비교 시 정밀도를 유지한다.
    confidence_threshold = db.Column(db.Numeric(4, 3), nullable=False)
    # 설명: `lane_stop_threshold`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    lane_stop_threshold = db.Column(db.Integer, nullable=False)
    # 설명: `shoulder_stop_threshold`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    shoulder_stop_threshold = db.Column(db.Integer, nullable=False)
    # 설명: `movement_threshold_px`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    movement_threshold_px = db.Column(db.Integer, nullable=False)
    # 설명: `sample_fps`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    sample_fps = db.Column(db.Numeric(5, 2), nullable=True)
    # 설명: `total_frames`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    total_frames = db.Column(db.Integer, nullable=True)
    # 설명: `processed_frames`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    processed_frames = db.Column(db.Integer, nullable=True)
    # 설명: `progress_percent`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    progress_percent = db.Column(db.Numeric(5, 2), nullable=True)
    # 설명: `retry_count`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    retry_count = db.Column(db.Integer, nullable=False)
    # 설명: `latency_ms`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    latency_ms = db.Column(db.Integer, nullable=True)
    # AI 서버의 detections/count/status 등 가변 응답은 JSON 문서로 보존한다.
    # 자주 검색하거나 상태 판단에 쓰는 값은 별도 정형 컬럼에도 중복 저장한다.
    result_summary = db.Column(db.JSON, nullable=True)
    # 설명: `raw_result_path`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    raw_result_path = db.Column(db.String(500), nullable=True)
    # 설명: `created_incident_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_incident_id = db.Column(db.BigInteger, nullable=True)
    # 설명: `requested_by`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    requested_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=False)
    # 설명: `requested_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    requested_at = db.Column(db.DateTime, nullable=False)
    # 설명: `started_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    started_at = db.Column(db.DateTime, nullable=True)
    # 설명: `completed_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    completed_at = db.Column(db.DateTime, nullable=True)
    # 설명: `failed_reason_code`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    failed_reason_code = db.Column(db.String(50), nullable=True)
    # 설명: `error_message`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    error_message = db.Column(db.Text, nullable=True)
    # 설명: `created_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_at = db.Column(db.DateTime, nullable=False)
    # 설명: `updated_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    updated_at = db.Column(db.DateTime, nullable=True)

    # 설명: `to_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def to_dict(self):
        """분석 작업의 Decimal/DateTime을 JSON 응답에 맞게 정규화한다."""
        # 설명: `data`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        data = {}
        # 설명: `self.__table__.columns`의 각 항목을 `column`로 받아 반복 처리한다.
        for column in self.__table__.columns:
            # 설명: `value`에 `getattr` 호출 결과를 저장해 다음 처리에서 사용한다.
            value = getattr(self, column.name)
            # 설명: `hasattr(value, 'isoformat')` 조건 결과에 따라 실행 경로를 분기한다.
            if hasattr(value, "isoformat"):
                # 설명: `value`에 `value.isoformat` 호출 결과를 저장해 다음 처리에서 사용한다.
                value = value.isoformat()
            # 설명: `isinstance(value, Decimal)` 조건 결과에 따라 실행 경로를 분기한다.
            elif isinstance(value, Decimal):
                # 설명: `value`에 `float` 호출 결과를 저장해 다음 처리에서 사용한다.
                value = float(value)
            # 설명: `data[column.name]`에 value 표현식의 계산 결과를 저장한다.
            data[column.name] = value
        # 설명: 호출자에게 data 값을 함수 결과로 반환한다.
        return data
