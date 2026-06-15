"""resource models 도메인의 SQLAlchemy 영속성 모델을 정의한다.

테이블 컬럼, 관계, 제약 조건과 생성·수정 시각 등 데이터베이스 계약을 표현한다."""

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db


# 설명: `RESOURCE_CATEGORY_LABELS`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
RESOURCE_CATEGORY_LABELS = {
    "RESUME": "조원 이력서",
    "COVER_LETTER": "자기소개서",
    "PRESENTATION": "프로젝트 발표자료",
    "MEETING_NOTE": "회의록",
    "ACCESS_LOG": "접속 로그",
}


# 설명: `ProjectResource` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class ProjectResource(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'project_resources'로 설정한다.
    __tablename__ = "project_resources"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    # 설명: `title`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    title = db.Column(db.String(200), nullable=False)
    # 설명: `description`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    description = db.Column(db.Text, nullable=True)
    # 설명: `category`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    category = db.Column(db.String(50), nullable=False)
    # 설명: `author_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    author_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    # 설명: `author_name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    author_name = db.Column(db.String(100), nullable=True)
    # 설명: `file_name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    file_name = db.Column(db.String(255), nullable=True)
    # 설명: `file_path`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    file_path = db.Column(db.String(500), nullable=True)
    # 설명: `file_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    file_type = db.Column(db.String(20), nullable=True)
    # 설명: `file_size`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    file_size = db.Column(db.BigInteger, nullable=True)
    # 설명: `visibility`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    visibility = db.Column(db.String(50), nullable=False, default="ADMIN_ALL")
    # 설명: `created_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_at = db.Column(db.DateTime, nullable=False)
    # 설명: `updated_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    updated_at = db.Column(db.DateTime, nullable=True)
    # 설명: `deleted_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    deleted_at = db.Column(db.DateTime, nullable=True)

    # 설명: `to_list_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def to_list_dict(self):
        # 설명: 호출자에게 {'id': self.id, 'title': self.title, 'description': self.description, 'category... 값을 함수 결과로 반환한다.
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

    # 설명: `to_detail_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def to_detail_dict(self):
        # 설명: `data`에 `self.to_list_dict` 호출 결과를 저장해 다음 처리에서 사용한다.
        data = self.to_list_dict()
        # 설명: `data['download_url']`에 f'/api/resources/{self.id}/download' if self.file_name and self.file_... 표현식의 계산 결과를 저장한다.
        data["download_url"] = (
            f"/api/resources/{self.id}/download"
            if self.file_name and self.file_path
            else None
        )
        # 설명: 호출자에게 data 값을 함수 결과로 반환한다.
        return data
