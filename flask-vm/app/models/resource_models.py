from app.extensions import db


RESOURCE_CATEGORY_LABELS = {
    "RESUME": "조원 이력서",
    "COVER_LETTER": "자기소개서",
    "PRESENTATION": "프로젝트 발표자료",
    "MEETING_NOTE": "회의록",
    "ACCESS_LOG": "접속 로그",
}


class ProjectResource(db.Model):
    __tablename__ = "project_resources"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), nullable=False)
    author_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    author_name = db.Column(db.String(100), nullable=True)
    file_name = db.Column(db.String(255), nullable=True)
    file_path = db.Column(db.String(500), nullable=True)
    file_type = db.Column(db.String(20), nullable=True)
    file_size = db.Column(db.BigInteger, nullable=True)
    visibility = db.Column(db.String(50), nullable=False, default="ADMIN_ALL")
    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)

    def to_list_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "category_label": RESOURCE_CATEGORY_LABELS.get(self.category, self.category),
            "author_id": self.author_id,
            "author_name": self.author_name,
            "file_name": self.file_name,
            "file_type": self.file_type,
            "file_size": self.file_size,
            "visibility": self.visibility,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def to_detail_dict(self):
        data = self.to_list_dict()
        data["download_url"] = (
            f"/api/resources/{self.id}/download"
            if self.file_name and self.file_path
            else None
        )
        return data
