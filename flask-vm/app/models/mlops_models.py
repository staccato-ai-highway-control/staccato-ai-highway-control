from decimal import Decimal

from app.extensions import db


class AiModel(db.Model):
    __tablename__ = "ai_models"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    model_name = db.Column(db.String(100), nullable=False)
    task_type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=True)
    owner_user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    is_active = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        data = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            if hasattr(value, "isoformat"):
                value = value.isoformat()
            elif isinstance(value, Decimal):
                value = float(value)
            data[column.name] = value
        return data


class TrainingDataset(db.Model):
    __tablename__ = "training_datasets"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    dataset_name = db.Column(db.String(100), nullable=False)
    dataset_version = db.Column(db.String(50), nullable=False)
    storage_path = db.Column(db.String(500), nullable=False)
    sample_count = db.Column(db.Integer, nullable=True)
    positive_count = db.Column(db.Integer, nullable=True)
    negative_count = db.Column(db.Integer, nullable=True)
    label_schema_json = db.Column(db.JSON, nullable=True)
    created_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)

    def to_dict(self):
        data = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            if hasattr(value, "isoformat"):
                value = value.isoformat()
            elif isinstance(value, Decimal):
                value = float(value)
            data[column.name] = value
        return data


class AiModelVersion(db.Model):
    __tablename__ = "ai_model_versions"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    model_id = db.Column(db.BigInteger, db.ForeignKey("ai_models.id"), nullable=False)
    version = db.Column(db.String(50), nullable=False)
    dataset_id = db.Column(db.BigInteger, db.ForeignKey("training_datasets.id"), nullable=True)
    model_file_path = db.Column(db.String(500), nullable=False)
    config_json = db.Column(db.JSON, nullable=True)
    metrics_json = db.Column(db.JSON, nullable=True)
    is_deployed = db.Column(db.Integer, nullable=False)
    deployed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)

    def to_dict(self):
        data = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            if hasattr(value, "isoformat"):
                value = value.isoformat()
            elif isinstance(value, Decimal):
                value = float(value)
            data[column.name] = value
        return data


class TrainingJob(db.Model):
    __tablename__ = "training_jobs"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    model_id = db.Column(db.BigInteger, db.ForeignKey("ai_models.id"), nullable=False)
    dataset_id = db.Column(db.BigInteger, db.ForeignKey("training_datasets.id"), nullable=True)
    base_model_version_id = db.Column(db.BigInteger, db.ForeignKey("ai_model_versions.id"), nullable=True)
    output_model_version_id = db.Column(db.BigInteger, db.ForeignKey("ai_model_versions.id"), nullable=True)
    requested_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    job_status = db.Column(db.String(50), nullable=False)
    hyperparameter_json = db.Column(db.JSON, nullable=True)
    result_metrics_json = db.Column(db.JSON, nullable=True)
    log_path = db.Column(db.String(500), nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    started_at = db.Column(db.DateTime, nullable=True)
    finished_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        data = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            if hasattr(value, "isoformat"):
                value = value.isoformat()
            elif isinstance(value, Decimal):
                value = float(value)
            data[column.name] = value
        return data

