import json
import logging
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from flask import current_app


logger = logging.getLogger(__name__)


class LocationSearchService:
    KAKAO_KEYWORD_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"
    KAKAO_ADDRESS_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/address.json"

    @staticmethod
    def search(keyword, size=10):
        keyword = str(keyword or "").strip()

        if len(keyword) < 2:
            return {
                "success": False,
                "error": "검색어는 2글자 이상 입력해주세요.",
                "items": [],
            }, 400

        try:
            size = int(size)
        except (TypeError, ValueError):
            size = 10

        size = max(1, min(size, 15))

        rest_api_key = current_app.config.get("KAKAO_REST_API_KEY")
        if not rest_api_key:
            return {
                "success": False,
                "error": "Kakao REST API Key가 설정되어 있지 않습니다.",
                "items": [],
            }, 503

        try:
            keyword_items = LocationSearchService._search_kakao_keyword(
                rest_api_key=rest_api_key,
                keyword=keyword,
                size=size,
            )

            if keyword_items:
                return {
                    "success": True,
                    "provider": "KAKAO",
                    "items": keyword_items,
                }, 200

            address_items = LocationSearchService._search_kakao_address(
                rest_api_key=rest_api_key,
                keyword=keyword,
                size=size,
            )

            return {
                "success": True,
                "provider": "KAKAO",
                "items": address_items,
            }, 200

        except HTTPError as e:
            logger.exception("Kakao location search HTTP error")
            return {
                "success": False,
                "error": "위치 검색 API 호출에 실패했습니다.",
                "status_code": e.code,
                "items": [],
            }, 502

        except URLError:
            logger.exception("Kakao location search network error")
            return {
                "success": False,
                "error": "위치 검색 API에 연결할 수 없습니다.",
                "items": [],
            }, 502

        except Exception:
            logger.exception("Unexpected location search error")
            return {
                "success": False,
                "error": "위치 검색 중 오류가 발생했습니다.",
                "items": [],
            }, 500

    @staticmethod
    def _request_kakao(rest_api_key, url, params):
        query = urlencode(params)
        request = Request(
            f"{url}?{query}",
            headers={
                "Authorization": f"KakaoAK {rest_api_key}",
            },
            method="GET",
        )

        with urlopen(request, timeout=3) as response:
            body = response.read().decode("utf-8")
            return json.loads(body)

    @staticmethod
    def _search_kakao_keyword(rest_api_key, keyword, size):
        payload = LocationSearchService._request_kakao(
            rest_api_key=rest_api_key,
            url=LocationSearchService.KAKAO_KEYWORD_SEARCH_URL,
            params={
                "query": keyword,
                "size": size,
                "sort": "accuracy",
            },
        )

        documents = payload.get("documents", [])

        return [
            LocationSearchService._normalize_keyword_document(document)
            for document in documents
        ]

    @staticmethod
    def _search_kakao_address(rest_api_key, keyword, size):
        payload = LocationSearchService._request_kakao(
            rest_api_key=rest_api_key,
            url=LocationSearchService.KAKAO_ADDRESS_SEARCH_URL,
            params={
                "query": keyword,
                "size": size,
            },
        )

        documents = payload.get("documents", [])

        return [
            LocationSearchService._normalize_address_document(document)
            for document in documents
        ]

    @staticmethod
    def _to_float(value):
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _normalize_keyword_document(document):
        road_address = document.get("road_address_name") or ""
        address = document.get("address_name") or ""
        name = document.get("place_name") or road_address or address

        return {
            "id": document.get("id"),
            "name": name,
            "address": road_address or address,
            "road_address": road_address,
            "jibun_address": address,
            "latitude": LocationSearchService._to_float(document.get("y")),
            "longitude": LocationSearchService._to_float(document.get("x")),
            "provider": "KAKAO",
            "category": document.get("category_name"),
            "phone": document.get("phone"),
            "place_url": document.get("place_url"),
        }

    @staticmethod
    def _normalize_address_document(document):
        road_address = document.get("road_address") or {}
        address = document.get("address") or {}

        road_address_name = road_address.get("address_name") if road_address else ""
        jibun_address_name = address.get("address_name") if address else document.get("address_name")
        name = road_address_name or jibun_address_name or document.get("address_name")

        return {
            "id": None,
            "name": name,
            "address": road_address_name or jibun_address_name,
            "road_address": road_address_name,
            "jibun_address": jibun_address_name,
            "latitude": LocationSearchService._to_float(document.get("y")),
            "longitude": LocationSearchService._to_float(document.get("x")),
            "provider": "KAKAO",
            "category": "ADDRESS",
            "phone": None,
            "place_url": None,
        }
