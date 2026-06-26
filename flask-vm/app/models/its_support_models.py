from decimal import Decimal

from app.extensions import db


class ItsApiSource(db.Model):
    __tablename__ = "its_api_sources"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    source_name = db.Column(db.String(100), nullable=False)
    source_type = db.Column(db.String(50), nullable=False)
    base_url = db.Column(db.String(500), nullable=True)
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=True)

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


class RiskContextSnapshot(db.Model):
    __tablename__ = "risk_context_snapshots"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=False)
    weather_snapshot_id = db.Column(db.BigInteger, db.ForeignKey("its_weather_snapshots.id"), nullable=True)
    traffic_snapshot_id = db.Column(db.BigInteger, db.ForeignKey("its_traffic_snapshots.id"), nullable=True)
    context_json = db.Column(db.JSON, nullable=True)
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


class RiskCalculationLog(db.Model):
    __tablename__ = "risk_calculation_logs"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, nullable=False)
    incident_id = db.Column(db.BigInteger, db.ForeignKey("incidents.id"), nullable=False)
    risk_score_id = db.Column(db.BigInteger, db.ForeignKey("its_risk_scores.id"), nullable=True)
    calculation_type = db.Column(db.String(50), nullable=False)
    input_json = db.Column(db.JSON, nullable=True)
    result_json = db.Column(db.JSON, nullable=True)
    calculated_by = db.Column(db.String(100), nullable=True)
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

