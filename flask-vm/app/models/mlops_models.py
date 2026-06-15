"""mlops models 도메인의 SQLAlchemy 영속성 모델을 정의한다.

테이블 컬럼, 관계, 제약 조건과 생성·수정 시각 등 데이터베이스 계약을 표현한다."""

# 설명: decimal에서 Decimal 이름을 가져와 아래 로직에서 재사용한다.
from decimal import Decimal

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db


# 설명: `AiModel` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class AiModel(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'ai_models'로 설정한다.
    __tablename__ = "ai_models"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    # 설명: `model_name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    model_name = db.Column(db.String(100), nullable=False)
    # 설명: `task_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    task_type = db.Column(db.String(50), nullable=False)
    # 설명: `description`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    description = db.Column(db.Text, nullable=True)
    # 설명: `owner_user_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    owner_user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    # 설명: `is_active`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    is_active = db.Column(db.Integer, nullable=False)
    # 설명: `created_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_at = db.Column(db.DateTime, nullable=False)
    # 설명: `updated_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    updated_at = db.Column(db.DateTime, nullable=True)

    # 설명: `to_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def to_dict(self):
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


# 설명: `TrainingDataset` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class TrainingDataset(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'training_datasets'로 설정한다.
    __tablename__ = "training_datasets"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    # 설명: `dataset_name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    dataset_name = db.Column(db.String(100), nullable=False)
    # 설명: `dataset_version`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    dataset_version = db.Column(db.String(50), nullable=False)
    # 설명: `storage_path`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    storage_path = db.Column(db.String(500), nullable=False)
    # 설명: `sample_count`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    sample_count = db.Column(db.Integer, nullable=True)
    # 설명: `positive_count`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    positive_count = db.Column(db.Integer, nullable=True)
    # 설명: `negative_count`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    negative_count = db.Column(db.Integer, nullable=True)
    # 설명: `label_schema_json`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    label_schema_json = db.Column(db.JSON, nullable=True)
    # 설명: `created_by`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_by = db.Column(db.BigInteger, nullable=True)
    # 설명: `created_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_at = db.Column(db.DateTime, nullable=False)

    # 설명: `to_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def to_dict(self):
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


# 설명: `AiModelVersion` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class AiModelVersion(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'ai_model_versions'로 설정한다.
    __tablename__ = "ai_model_versions"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    # 설명: `model_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    model_id = db.Column(db.BigInteger, db.ForeignKey("ai_models.id"), nullable=False)
    # 설명: `version`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    version = db.Column(db.String(50), nullable=False)
    # 설명: `dataset_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    dataset_id = db.Column(db.BigInteger, db.ForeignKey("training_datasets.id"), nullable=True)
    # 설명: `model_file_path`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    model_file_path = db.Column(db.String(500), nullable=False)
    # 설명: `config_json`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    config_json = db.Column(db.JSON, nullable=True)
    # 설명: `metrics_json`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    metrics_json = db.Column(db.JSON, nullable=True)
    # 설명: `is_deployed`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    is_deployed = db.Column(db.Integer, nullable=False)
    # 설명: `deployed_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    deployed_at = db.Column(db.DateTime, nullable=True)
    # 설명: `created_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_at = db.Column(db.DateTime, nullable=False)

    # 설명: `to_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def to_dict(self):
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


# 설명: `TrainingJob` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class TrainingJob(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'training_jobs'로 설정한다.
    __tablename__ = "training_jobs"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    # 설명: `model_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    model_id = db.Column(db.BigInteger, db.ForeignKey("ai_models.id"), nullable=False)
    # 설명: `dataset_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    dataset_id = db.Column(db.BigInteger, db.ForeignKey("training_datasets.id"), nullable=True)
    # 설명: `base_model_version_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    base_model_version_id = db.Column(db.BigInteger, db.ForeignKey("ai_model_versions.id"), nullable=True)
    # 설명: `output_model_version_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    output_model_version_id = db.Column(db.BigInteger, db.ForeignKey("ai_model_versions.id"), nullable=True)
    # 설명: `requested_by`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    requested_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    # 설명: `job_status`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    job_status = db.Column(db.String(50), nullable=False)
    # 설명: `hyperparameter_json`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    hyperparameter_json = db.Column(db.JSON, nullable=True)
    # 설명: `result_metrics_json`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    result_metrics_json = db.Column(db.JSON, nullable=True)
    # 설명: `log_path`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    log_path = db.Column(db.String(500), nullable=True)
    # 설명: `error_message`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    error_message = db.Column(db.Text, nullable=True)
    # 설명: `started_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    started_at = db.Column(db.DateTime, nullable=True)
    # 설명: `finished_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    finished_at = db.Column(db.DateTime, nullable=True)
    # 설명: `created_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_at = db.Column(db.DateTime, nullable=False)
    # 설명: `updated_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    updated_at = db.Column(db.DateTime, nullable=True)

    # 설명: `to_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def to_dict(self):
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
