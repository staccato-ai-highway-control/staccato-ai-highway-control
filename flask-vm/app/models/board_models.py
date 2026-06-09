from decimal import Decimal

from app.extensions import db


class BoardPost(db.Model):
    __tablename__ = "board_posts"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    board_type = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    author_id = db.Column(db.BigInteger, nullable=True)
    post_status = db.Column(db.String(50), nullable=False)
    is_pinned = db.Column(db.Integer, nullable=False)
    view_count = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)

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


class BoardComment(db.Model):
    __tablename__ = "board_comments"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    post_id = db.Column(db.BigInteger, db.ForeignKey("board_posts.id"), nullable=False)
    parent_comment_id = db.Column(db.BigInteger, db.ForeignKey("board_comments.id"), nullable=True)
    author_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    content = db.Column(db.Text, nullable=False)
    comment_status = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)

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


class BoardAttachment(db.Model):
    __tablename__ = "board_attachments"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    post_id = db.Column(db.BigInteger, db.ForeignKey("board_posts.id"), nullable=True)
    comment_id = db.Column(db.BigInteger, db.ForeignKey("board_comments.id"), nullable=True)
    uploaded_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    original_filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_url = db.Column(db.String(500), nullable=True)
    file_size = db.Column(db.BigInteger, nullable=True)
    mime_type = db.Column(db.String(100), nullable=True)
    download_count = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)
    deleted_at = db.Column(db.DateTime, nullable=True)

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

