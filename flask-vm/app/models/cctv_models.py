"""cctv models 도메인의 SQLAlchemy 영속성 모델을 정의한다.

테이블 컬럼, 관계, 제약 조건과 생성·수정 시각 등 데이터베이스 계약을 표현한다."""

# 설명: decimal에서 Decimal 이름을 가져와 아래 로직에서 재사용한다.
from decimal import Decimal

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db


# 설명: `Cctv` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class Cctv(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'cctvs'로 설정한다.
    __tablename__ = "cctvs"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    # 설명: `cctv_code`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    cctv_code = db.Column(db.String(50), nullable=False, unique=True)
    # 설명: `cctv_name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    cctv_name = db.Column(db.String(100), nullable=False)
    # 설명: `stream_url`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    stream_url = db.Column(db.String(500), nullable=True)
    # 설명: `location_name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    location_name = db.Column(db.String(255), nullable=True)
    # 설명: `road_name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    road_name = db.Column(db.String(100), nullable=True)
    # 설명: `direction`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    direction = db.Column(db.String(50), nullable=True)
    # 설명: `latitude`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    latitude = db.Column(db.Numeric(10, 7), nullable=True)
    # 설명: `longitude`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    longitude = db.Column(db.Numeric(10, 7), nullable=True)
    # 설명: `is_active`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    is_active = db.Column(db.Integer, nullable=False)
    # 설명: `installed_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    installed_at = db.Column(db.Date, nullable=True)
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


# 설명: `CctvRoi` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class CctvRoi(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'cctv_rois'로 설정한다.
    __tablename__ = "cctv_rois"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    # 설명: `cctv_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    cctv_id = db.Column(db.BigInteger, db.ForeignKey("cctvs.id"), nullable=False)
    # 설명: `roi_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    roi_type = db.Column(db.String(50), nullable=False)
    # 설명: `roi_name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    roi_name = db.Column(db.String(100), nullable=False)
    # 설명: `polygon_json`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    polygon_json = db.Column(db.JSON, nullable=False)
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


# 설명: `CctvStatusLog` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class CctvStatusLog(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'cctv_status_logs'로 설정한다.
    __tablename__ = "cctv_status_logs"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    # 설명: `cctv_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    cctv_id = db.Column(db.BigInteger, db.ForeignKey("cctvs.id"), nullable=False)
    # 설명: `status`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    status = db.Column(db.String(50), nullable=False)
    # 설명: `message`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    message = db.Column(db.Text, nullable=True)
    # 설명: `checked_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    checked_at = db.Column(db.DateTime, nullable=False)
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


# 설명: `CctvSlot` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class CctvSlot(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'cctv_slots'로 설정한다.
    __tablename__ = "cctv_slots"

    # 설명: `slot_number`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    slot_number = db.Column(db.Integer, primary_key=True)
    # 설명: `cctv_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    cctv_id = db.Column(
        db.BigInteger,
        db.ForeignKey("cctvs.id", ondelete="SET NULL"),
        nullable=True,
    )
    # 설명: `cctv_code`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    cctv_code = db.Column(db.String(50), nullable=True)
    # 설명: `display_name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    display_name = db.Column(db.String(100), nullable=True)
    # 설명: `layout_json`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    layout_json = db.Column(db.JSON, nullable=True)
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
