"""health 도메인의 HTTP API 엔드포인트를 정의한다.

요청 인증과 입력 변환을 수행한 뒤 서비스 결과를 안정적인 JSON 응답으로 전달한다."""

# 설명: flask에서 Blueprint, jsonify 이름을 가져와 아래 로직에서 재사용한다.
from flask import Blueprint, jsonify
# 설명: app.config에서 Config 이름을 가져와 아래 로직에서 재사용한다.
from app.config import Config


# 설명: `health_bp`에 `Blueprint` 호출 결과를 저장해 다음 처리에서 사용한다.
health_bp = Blueprint("health", __name__)


# 설명: `health_check` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@health_bp.get("/health")
def health_check():
    # 설명: 호출자에게 jsonify({'status': 'ok', 'service': Config.SERVICE_NAME, 'environment': Config.... 값을 함수 결과로 반환한다.
    return jsonify(
        {
            "status": "ok",
            "service": Config.SERVICE_NAME,
            "environment": Config.ENV,
        }
    )
