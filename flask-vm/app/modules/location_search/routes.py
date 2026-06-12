"""location search 도메인의 HTTP API 엔드포인트를 정의한다.

요청 인증과 입력 변환을 수행한 뒤 서비스 결과를 안정적인 JSON 응답으로 전달한다."""

# 설명: logging 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import logging

# 설명: flask에서 Blueprint, jsonify, request 이름을 가져와 아래 로직에서 재사용한다.
from flask import Blueprint, jsonify, request

# 설명: app.modules.location_search.service에서 LocationSearchService 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.location_search.service import LocationSearchService
# 설명: app.utils.security에서 require_auth 이름을 가져와 아래 로직에서 재사용한다.
from app.utils.security import require_auth


# 설명: `logger`에 `logging.getLogger` 호출 결과를 저장해 다음 처리에서 사용한다.
logger = logging.getLogger(__name__)

# 설명: `location_search_bp`에 `Blueprint` 호출 결과를 저장해 다음 처리에서 사용한다.
location_search_bp = Blueprint(
    "location_search",
    __name__,
    url_prefix="/api/locations",
)


# 설명: `health` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@location_search_bp.get("/health")
def health():
    # 설명: 호출자에게 ({'status': 'location search module ok'}, 200) 값을 함수 결과로 반환한다.
    return {"status": "location search module ok"}, 200


# 설명: `search_locations` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@location_search_bp.get("/search")
@require_auth
def search_locations():
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `keyword`에 request.args.get('keyword') or request.args.get('q') 표현식의 계산 결과를 저장한다.
        keyword = request.args.get("keyword") or request.args.get("q")
        # 설명: `size`에 `request.args.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        size = request.args.get("size", 10)

        # 설명: `(result, status_code)`에 `LocationSearchService.search` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = LocationSearchService.search(
            keyword=keyword,
            size=size,
        )
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code

    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("위치 검색 요청 처리 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.', 'items': []}), 500) 값을 함수 결과로 반환한다.
        return jsonify({
            "success": False,
            "error": "서버 내부 오류가 발생했습니다.",
            "items": [],
        }), 500
