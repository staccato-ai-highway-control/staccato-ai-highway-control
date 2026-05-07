from flask import Flask

from app.config import Config
from app.extensions import init_extensions
from app.routes.auth_routes import auth_bp
from app.routes.health_routes import health_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    init_extensions(app)

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)

    return app