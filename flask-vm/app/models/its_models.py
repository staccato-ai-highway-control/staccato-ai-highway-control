from decimal import Decimal

from app.extensions import db


class ItsWeatherSnapshot(db.Model):
    __tablename__ = "its_weather_snapshots"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=True)
    provider = db.Column(db.String(100), nullable=True)
    location_name = db.Column(db.String(255), nullable=True)
    latitude = db.Column(db.Numeric(10, 7), nullable=True)
    longitude = db.Column(db.Numeric(10, 7), nullable=True)
    temperature = db.Column(db.Numeric(5, 2), nullable=True)
    precipitation = db.Column(db.Numeric(8, 2), nullable=True)
    wind_speed = db.Column(db.Numeric(8, 2), nullable=True)
    visibility = db.Column(db.Numeric(8, 2), nullable=True)
    weather_condition = db.Column(db.String(100), nullable=True)
    raw_response_json = db.Column(db.JSON, nullable=True)
    observed_at = db.Column(db.DateTime, nullable=False)
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


class ItsTrafficSnapshot(db.Model):
    __tablename__ = "its_traffic_snapshots"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=True)
    provider = db.Column(db.String(100), nullable=True)
    road_name = db.Column(db.String(100), nullable=True)
    direction = db.Column(db.String(50), nullable=True)
    speed_avg = db.Column(db.Numeric(8, 2), nullable=True)
    traffic_volume = db.Column(db.Integer, nullable=True)
    congestion_level = db.Column(db.String(50), nullable=False)
    raw_response_json = db.Column(db.JSON, nullable=True)
    observed_at = db.Column(db.DateTime, nullable=False)
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


class ItsRiskScore(db.Model):
    __tablename__ = "its_risk_scores"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=False)
    weather_snapshot_id = db.Column(db.BigInteger, db.ForeignKey("its_weather_snapshots.id"), nullable=True)
    traffic_snapshot_id = db.Column(db.BigInteger, db.ForeignKey("its_traffic_snapshots.id"), nullable=True)
    risk_score = db.Column(db.Numeric(6, 3), nullable=False)
    risk_level = db.Column(db.String(50), nullable=False)
    score_detail_json = db.Column(db.JSON, nullable=True)
    calculated_at = db.Column(db.DateTime, nullable=False)
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


class ExternalApiLog(db.Model):
    __tablename__ = "external_api_logs"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    service_name = db.Column(db.String(100), nullable=False)
    endpoint = db.Column(db.String(500), nullable=False)
    method = db.Column(db.String(20), nullable=False)
    request_json = db.Column(db.JSON, nullable=True)
    response_status_code = db.Column(db.Integer, nullable=True)
    response_json = db.Column(db.JSON, nullable=True)
    latency_ms = db.Column(db.Integer, nullable=True)
    is_success = db.Column(db.Integer, nullable=False)
    error_message = db.Column(db.Text, nullable=True)
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

