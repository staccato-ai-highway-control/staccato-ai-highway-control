from flask import Flask

from app.config import Config
from app.extensions import init_extensions
from app.routes.ai_detection_routes import ai_detection_bp
from app.routes.auth_routes import auth_bp
from app.routes.cctv_routes import cctv_bp
from app.routes.health_routes import health_bp
from app.routes.incident_routes import incident_bp
from app.routes.notification_routes import notification_bp
from app.routes.report_routes import report_bp
from app.routes.llm_report_routes import llm_report_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    init_extensions(app)

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(cctv_bp)
    app.register_blueprint(incident_bp)
    app.register_blueprint(notification_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(ai_detection_bp)
    app.register_blueprint(llm_report_bp)

    return app
