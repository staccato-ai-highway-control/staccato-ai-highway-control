from flask import Blueprint, jsonify
from app.config import Config


health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health_check():
    return jsonify(
        {
            "status": "ok",
            "service": Config.SERVICE_NAME,
            "environment": Config.ENV,
        }
    )
