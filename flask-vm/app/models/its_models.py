"""its models 도메인의 SQLAlchemy 영속성 모델을 정의한다.

테이블 컬럼, 관계, 제약 조건과 생성·수정 시각 등 데이터베이스 계약을 표현한다."""

# 설명: decimal에서 Decimal 이름을 가져와 아래 로직에서 재사용한다.
from decimal import Decimal

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db


# 설명: `ItsWeatherSnapshot` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class ItsWeatherSnapshot(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'its_weather_snapshots'로 설정한다.
    __tablename__ = "its_weather_snapshots"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    # 설명: `incident_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=True)
    # 설명: `provider`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    provider = db.Column(db.String(100), nullable=True)
    # 설명: `location_name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    location_name = db.Column(db.String(255), nullable=True)
    # 설명: `latitude`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    latitude = db.Column(db.Numeric(10, 7), nullable=True)
    # 설명: `longitude`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    longitude = db.Column(db.Numeric(10, 7), nullable=True)
    # 설명: `temperature`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    temperature = db.Column(db.Numeric(5, 2), nullable=True)
    # 설명: `precipitation`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    precipitation = db.Column(db.Numeric(8, 2), nullable=True)
    # 설명: `wind_speed`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    wind_speed = db.Column(db.Numeric(8, 2), nullable=True)
    # 설명: `visibility`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    visibility = db.Column(db.Numeric(8, 2), nullable=True)
    # 설명: `weather_condition`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    weather_condition = db.Column(db.String(100), nullable=True)
    # 설명: `raw_response_json`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    raw_response_json = db.Column(db.JSON, nullable=True)
    # 설명: `observed_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    observed_at = db.Column(db.DateTime, nullable=False)
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


# 설명: `ItsTrafficSnapshot` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class ItsTrafficSnapshot(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'its_traffic_snapshots'로 설정한다.
    __tablename__ = "its_traffic_snapshots"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    # 설명: `incident_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=True)
    # 설명: `provider`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    provider = db.Column(db.String(100), nullable=True)
    # 설명: `road_name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    road_name = db.Column(db.String(100), nullable=True)
    # 설명: `direction`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    direction = db.Column(db.String(50), nullable=True)
    # 설명: `speed_avg`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    speed_avg = db.Column(db.Numeric(8, 2), nullable=True)
    # 설명: `traffic_volume`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    traffic_volume = db.Column(db.Integer, nullable=True)
    # 설명: `congestion_level`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    congestion_level = db.Column(db.String(50), nullable=False)
    # 설명: `raw_response_json`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    raw_response_json = db.Column(db.JSON, nullable=True)
    # 설명: `observed_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    observed_at = db.Column(db.DateTime, nullable=False)
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


# 설명: `ItsRiskScore` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class ItsRiskScore(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'its_risk_scores'로 설정한다.
    __tablename__ = "its_risk_scores"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    # 설명: `incident_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=False)
    # 설명: `weather_snapshot_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    weather_snapshot_id = db.Column(db.BigInteger, db.ForeignKey("its_weather_snapshots.id"), nullable=True)
    # 설명: `traffic_snapshot_id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    traffic_snapshot_id = db.Column(db.BigInteger, db.ForeignKey("its_traffic_snapshots.id"), nullable=True)
    # 설명: `risk_score`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    risk_score = db.Column(db.Numeric(6, 3), nullable=False)
    # 설명: `risk_level`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    risk_level = db.Column(db.String(50), nullable=False)
    # 설명: `score_detail_json`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    score_detail_json = db.Column(db.JSON, nullable=True)
    # 설명: `calculated_at`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    calculated_at = db.Column(db.DateTime, nullable=False)
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


# 설명: `ExternalApiLog` 클래스를 정의하고 db.Model의 동작 또는 계약을 확장한다.
class ExternalApiLog(db.Model):
    # 설명: `__tablename__`의 기준값 또는 기본값을 'external_api_logs'로 설정한다.
    __tablename__ = "external_api_logs"

    # 설명: `id`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    # 설명: `service_name`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    service_name = db.Column(db.String(100), nullable=False)
    # 설명: `endpoint`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    endpoint = db.Column(db.String(500), nullable=False)
    # 설명: `method`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    method = db.Column(db.String(20), nullable=False)
    # 설명: `request_json`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    request_json = db.Column(db.JSON, nullable=True)
    # 설명: `response_status_code`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    response_status_code = db.Column(db.Integer, nullable=True)
    # 설명: `response_json`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    response_json = db.Column(db.JSON, nullable=True)
    # 설명: `latency_ms`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    latency_ms = db.Column(db.Integer, nullable=True)
    # 설명: `is_success`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    is_success = db.Column(db.Integer, nullable=False)
    # 설명: `error_message`에 `db.Column` 호출 결과를 저장해 다음 처리에서 사용한다.
    error_message = db.Column(db.Text, nullable=True)
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
