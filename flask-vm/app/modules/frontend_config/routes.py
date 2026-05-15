from flask import Blueprint, current_app, jsonify

frontend_config_bp = Blueprint("frontend_config", __name__, url_prefix="/api/config")


@frontend_config_bp.get("/public")
def get_public_config():
    return jsonify({
        "kakaoMapJsKey": current_app.config.get("KAKAO_MAP_JS_KEY"),
    })
