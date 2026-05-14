from app.extensions import db


class LlmReport(db.Model):
    __tablename__ = "llm_reports"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)

    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=False)
    generated_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)

    report_type = db.Column(db.String(50), nullable=False, default="INCIDENT_SUMMARY")
    report_status = db.Column(db.String(50), nullable=False, default="DRAFT")

    title = db.Column(db.String(200), nullable=False)
    prompt_text = db.Column(db.Text, nullable=True)
    report_content = db.Column(db.Text, nullable=True)

    model_name = db.Column(db.String(100), nullable=True)
    token_usage_json = db.Column(db.JSON, nullable=True)
    llm_response_json = db.Column(db.JSON, nullable=True)

    error_message = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)
    confirmed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "incident_id": self.incident_id,
            "generated_by": self.generated_by,
            "report_type": self.report_type,
            "report_status": self.report_status,
            "title": self.title,
            "prompt_text": self.prompt_text,
            "report_content": self.report_content,
            "model_name": self.model_name,
            "token_usage_json": self.token_usage_json,
            "llm_response_json": self.llm_response_json,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "confirmed_at": self.confirmed_at.isoformat() if self.confirmed_at else None,
        }
