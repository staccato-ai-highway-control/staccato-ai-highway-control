from decimal import Decimal

from app.extensions import db


class LlmReportVersion(db.Model):
    __tablename__ = "llm_report_versions"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    report_id = db.Column(db.BigInteger, db.ForeignKey("llm_reports.id"), nullable=False)
    version_no = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    report_content = db.Column(db.Text, nullable=True)
    edited_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    change_summary = db.Column(db.Text, nullable=True)
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


class LlmReportStatusHistory(db.Model):
    __tablename__ = "llm_report_status_histories"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    report_id = db.Column(db.BigInteger, db.ForeignKey("llm_reports.id"), nullable=False)
    previous_status = db.Column(db.String(50), nullable=True)
    new_status = db.Column(db.String(50), nullable=False)
    changed_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    change_reason = db.Column(db.Text, nullable=True)
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

