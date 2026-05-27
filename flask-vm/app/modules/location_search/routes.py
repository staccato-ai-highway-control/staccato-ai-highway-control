import logging

from flask import Blueprint, jsonify, request

from app.modules.location_search.service import LocationSearchService
from app.utils.security import require_auth


logger = logging.getLogger(__name__)

location_search_bp = Blueprint(
    "location_search",
    __name__,
    url_prefix="/api/locations",
)


@location_search_bp.get("/health")
def health():
    return {"status": "location search module ok"}, 200


@location_search_bp.get("/search")
@require_auth
def search_locations():
    try:
        keyword = request.args.get("keyword") or request.args.get("q")
        size = request.args.get("size", 10)

        result, status_code = LocationSearchService.search(
            keyword=keyword,
            size=size,
        )
        return jsonify(result), status_code

    except Exception:
        logger.exception("위치 검색 요청 처리 중 오류 발생")
        return jsonify({
            "success": False,
            "error": "서버 내부 오류가 발생했습니다.",
            "items": [],
        }), 500
