"""report support models 도메인의 SQLAlchemy 영속성 모델을 정의한다.

테이블 컬럼, 관계, 제약 조건과 생성·수정 시각 등 데이터베이스 계약을 표현한다."""

# 설명: decimal에서 Decimal 이름을 가져와 아래 로직에서 재사용한다.
from decimal import Decimal

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db


# 설명: `ReportLocation` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class ReportLocation(db.Model):
    """신고 위치의 좌표, 주소 원문, 확인 상태를 저장하는 자식 엔터티.

    신고 하나에 위치 후보가 여러 개 존재할 수 있어 ``report_id``로 1:N 연결한다.
    위경도 Numeric(10,7)은 약 1cm 수준의 소수 자릿수를 보존하며 Python에서는 Decimal이다.
    """

    # 설명: `__tablename__`의 기준값 또는 기본값을 'report_locations'로 설정한다.
    __tablename__ = "report_locations"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    # 설명: `report_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    report_id = db.Column(db.BigInteger, db.ForeignKey("incident_reports.id"), nullable=False)
    # 설명: `cctv_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    cctv_id = db.Column(db.BigInteger, nullable=True)
    # 설명: `location_source`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    location_source = db.Column(db.String(30), nullable=False)
    # 입력 문자열은 서비스에서 Decimal로 검증한 후 DECIMAL(10,7)에 저장한다.
    latitude = db.Column(db.Numeric(10, 7), nullable=True)
    # 설명: `longitude`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    longitude = db.Column(db.Numeric(10, 7), nullable=True)
    # 설명: `road_address`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    road_address = db.Column(db.String(255), nullable=True)
    # 설명: `jibun_address`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    jibun_address = db.Column(db.String(255), nullable=True)
    # 설명: `place_name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    place_name = db.Column(db.String(255), nullable=True)
    # 설명: `road_name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    road_name = db.Column(db.String(100), nullable=True)
    # 설명: `tunnel_name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    tunnel_name = db.Column(db.String(100), nullable=True)
    # 설명: `direction`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    direction = db.Column(db.String(30), nullable=True)
    # 설명: `lane_info`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    lane_info = db.Column(db.String(50), nullable=True)
    # 설명: `address_provider`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    address_provider = db.Column(db.String(30), nullable=True)
    # 공급자별 원본 주소 구조가 달라질 수 있어 정규화 전 값은 JSON으로 보존한다.
    address_raw = db.Column(db.JSON, nullable=True)
    # 설명: `confidence`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    confidence = db.Column(db.Numeric(4, 3), nullable=True)
    # 설명: `is_location_confirmed`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    is_location_confirmed = db.Column(db.Integer, nullable=False)
    # 설명: `confirmed_by`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    confirmed_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    # 설명: `confirmed_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    confirmed_at = db.Column(db.DateTime, nullable=True)
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


# 설명: `ReportMemo` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class ReportMemo(db.Model):
    """신고별 운영 메모를 작성자와 함께 보관하는 1:N 자식 엔터티."""

    # 설명: `__tablename__`의 기준값 또는 기본값을 'report_memos'로 설정한다.
    __tablename__ = "report_memos"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    # 설명: `report_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    report_id = db.Column(db.BigInteger, db.ForeignKey("incident_reports.id"), nullable=False)
    # 설명: `author_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    author_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=False)
    # 설명: `memo_type`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    memo_type = db.Column(db.String(30), nullable=False)
    # 설명: `content`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    content = db.Column(db.Text, nullable=False)
    # 설명: `created_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    created_at = db.Column(db.DateTime, nullable=False)
    # 설명: `updated_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    updated_at = db.Column(db.DateTime, nullable=True)
    # 설명: `deleted_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    deleted_at = db.Column(db.DateTime, nullable=True)

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


# 설명: `ReportStatusHistory` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class ReportStatusHistory(db.Model):
    """신고 상태 변경 전후 값과 변경자를 append-only 형태로 기록한다.

    현재 상태는 incident_reports.status에 있고, 이 테이블은 감사와 변경 순서 복원에 쓴다.
    """

    # 설명: `__tablename__`의 기준값 또는 기본값을 'report_status_histories'로 설정한다.
    __tablename__ = "report_status_histories"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    # 설명: `report_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    report_id = db.Column(db.BigInteger, db.ForeignKey("incident_reports.id"), nullable=False)
    # 최초 상태 이력은 이전 값이 없을 수 있어 previous_status만 NULL을 허용한다.
    previous_status = db.Column(db.String(30), nullable=True)
    # 설명: `new_status`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    new_status = db.Column(db.String(30), nullable=False)
    # 설명: `changed_by`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    changed_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=False)
    # 설명: `change_reason`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    change_reason = db.Column(db.Text, nullable=True)
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
