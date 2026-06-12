"""dashboard 도메인의 HTTP API 엔드포인트를 정의한다.

요청 인증과 입력 변환을 수행한 뒤 서비스 결과를 안정적인 JSON 응답으로 전달한다."""

# 설명: flask에서 jsonify, request 이름을 가져와 아래 로직에서 재사용한다.
from flask import jsonify, request

# 설명: app.modules.dashboard에서 dashboard_bp 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.dashboard import dashboard_bp
# 설명: app.modules.dashboard.service에서 get_dashboard_summary 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.dashboard.service import get_dashboard_summary
# 설명: app.utils.security에서 require_auth 이름을 가져와 아래 로직에서 재사용한다.
from app.utils.security import require_auth


# 설명: `dashboard_summary` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@dashboard_bp.get("/summary")
@require_auth
def dashboard_summary():
    # 설명: `result`에 `get_dashboard_summary` 호출 결과를 저장해 다음 처리에서 사용한다.
    result = get_dashboard_summary(request.current_user)

    # 설명: 호출자에게 (jsonify({'success': True, 'data': result}), 200) 값을 함수 결과로 반환한다.
    return jsonify({
        "success": True,
        "data": result,
    }), 200
