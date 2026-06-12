"""frontend config 도메인의 HTTP API 엔드포인트를 정의한다.

요청 인증과 입력 변환을 수행한 뒤 서비스 결과를 안정적인 JSON 응답으로 전달한다."""

# 설명: flask에서 Blueprint, current_app, jsonify 이름을 가져와 아래 로직에서 재사용한다.
from flask import Blueprint, current_app, jsonify

# 설명: `frontend_config_bp`에 `Blueprint` 호출 결과를 저장해 다음 처리에서 사용한다.
frontend_config_bp = Blueprint("frontend_config", __name__, url_prefix="/api/config")


# 설명: `get_public_config` 함수는 단일 값이나 리소스를 조회하는 함수다.
@frontend_config_bp.get("/public")
def get_public_config():
    # 설명: 호출자에게 jsonify({'kakaoMapJsKey': current_app.config.get('KAKAO_MAP_JS_KEY')}) 값을 함수 결과로 반환한다.
    return jsonify({
        "kakaoMapJsKey": current_app.config.get("KAKAO_MAP_JS_KEY"),
    })
