from flask import Blueprint

incident_bp = Blueprint("incident", __name__, url_prefix="/api/reports")

from app.modules.incident import routes
