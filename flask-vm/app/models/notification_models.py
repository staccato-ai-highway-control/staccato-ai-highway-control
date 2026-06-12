"""notification models 도메인의 SQLAlchemy 영속성 모델을 정의한다.

테이블 컬럼, 관계, 제약 조건과 생성·수정 시각 등 데이터베이스 계약을 표현한다."""

# 설명: decimal에서 Decimal 이름을 가져와 아래 로직에서 재사용한다.
from decimal import Decimal

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db


# 설명: `Notification` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class Notification(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'notifications'로 설정한다.
    __tablename__ = "notifications"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    # 설명: `user_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    user_id = db.Column(db.BigInteger, nullable=True)
    # 설명: `incident_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=True)
    # 설명: `notification_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    notification_type = db.Column(db.String(50), nullable=False)
    # 설명: `title`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    title = db.Column(db.String(200), nullable=False)
    # 설명: `message`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    message = db.Column(db.Text, nullable=False)
    # 설명: `priority`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    priority = db.Column(db.String(50), nullable=False)
    # 설명: `is_read`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    is_read = db.Column(db.Integer, nullable=False)
    # 설명: `read_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    read_at = db.Column(db.DateTime, nullable=True)
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


# 설명: `NotificationDelivery` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class NotificationDelivery(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'notification_deliveries'로 설정한다.
    __tablename__ = "notification_deliveries"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    # 설명: `notification_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    notification_id = db.Column(db.BigInteger, db.ForeignKey("notifications.id"), nullable=False)
    # 설명: `user_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    # 설명: `delivery_channel`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    delivery_channel = db.Column(db.String(50), nullable=False)
    # 설명: `delivery_status`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    delivery_status = db.Column(db.String(50), nullable=False)
    # 설명: `error_message`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    error_message = db.Column(db.Text, nullable=True)
    # 설명: `delivered_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    delivered_at = db.Column(db.DateTime, nullable=True)
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
