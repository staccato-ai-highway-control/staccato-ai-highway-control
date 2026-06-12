"""realtime models 도메인의 SQLAlchemy 영속성 모델을 정의한다.

테이블 컬럼, 관계, 제약 조건과 생성·수정 시각 등 데이터베이스 계약을 표현한다."""

# 설명: decimal에서 Decimal 이름을 가져와 아래 로직에서 재사용한다.
from decimal import Decimal

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db


# 설명: `RealtimeEvent` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class RealtimeEvent(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'realtime_events'로 설정한다.
    __tablename__ = "realtime_events"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    # 설명: `event_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    event_type = db.Column(db.String(50), nullable=False)
    # 설명: `event_name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    event_name = db.Column(db.String(100), nullable=False)
    # 설명: `target_user_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    target_user_id = db.Column(db.BigInteger, nullable=True)
    # 설명: `target_role`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    target_role = db.Column(db.String(30), nullable=True)
    # 설명: `target_room`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    target_room = db.Column(db.String(100), nullable=True)
    # 설명: `target_resource_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    target_resource_type = db.Column(db.String(50), nullable=True)
    # 설명: `target_resource_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    target_resource_id = db.Column(db.BigInteger, nullable=True)
    # 설명: `incident_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=True)
    # 설명: `payload`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    payload = db.Column(db.JSON, nullable=True)
    # 설명: `send_status`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    send_status = db.Column(db.String(30), nullable=False, default="PENDING")
    # 설명: `error_message`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    error_message = db.Column(db.Text, nullable=True)
    # 설명: `created_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_at = db.Column(db.DateTime, nullable=False)
    # 설명: `sent_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    sent_at = db.Column(db.DateTime, nullable=True)

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
