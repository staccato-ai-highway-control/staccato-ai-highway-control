"""location search 도메인의 핵심 비즈니스 규칙과 데이터 처리를 구현한다.

권한 검증, 트랜잭션 경계, 외부 연동 및 응답 직렬화를 라우트와 분리해 관리한다."""

# 설명: json 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import json
# 설명: logging 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import logging
# 설명: urllib.parse에서 urlencode 이름을 가져와 아래 로직에서 재사용한다.
from urllib.parse import urlencode
# 설명: urllib.request에서 Request, urlopen 이름을 가져와 아래 로직에서 재사용한다.
from urllib.request import Request, urlopen
# 설명: urllib.error에서 HTTPError, URLError 이름을 가져와 아래 로직에서 재사용한다.
from urllib.error import HTTPError, URLError

# 설명: flask에서 current_app 이름을 가져와 아래 로직에서 재사용한다.
from flask import current_app


# 설명: `logger`에 `logging.getLogger` 호출 결과를 저장해 다음 처리에서 사용한다.
logger = logging.getLogger(__name__)


# 설명: `LocationSearchService` 클래스를 정의하고 기본 object의 동작 또는 계약을 확장한다.
class LocationSearchService:
    # 설명: `KAKAO_KEYWORD_SEARCH_URL`의 기준값 또는 기본값을 'https://dapi.kakao.com/v2/local/search/ke...로 설정한다.
    KAKAO_KEYWORD_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"
    # 설명: `KAKAO_ADDRESS_SEARCH_URL`의 기준값 또는 기본값을 'https://dapi.kakao.com/v2/local/search/ad...로 설정한다.
    KAKAO_ADDRESS_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/address.json"

    # 설명: `search` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def search(keyword, size=10):
        # 설명: `keyword`에 `str(keyword or '').strip` 호출 결과를 저장해 다음 처리에서 사용한다.
        keyword = str(keyword or "").strip()

        # 설명: `len(keyword) < 2` 조건 결과에 따라 실행 경로를 분기한다.
        if len(keyword) < 2:
            # 설명: 호출자에게 ({'success': False, 'error': '검색어는 2글자 이상 입력해주세요.', 'items': []}, 400) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "검색어는 2글자 이상 입력해주세요.",
                "items": [],
            }, 400

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `size`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
            size = int(size)
        except (TypeError, ValueError):
            # 설명: `size`의 기준값 또는 기본값을 10로 설정한다.
            size = 10

        # 설명: `size`에 `max` 호출 결과를 저장해 다음 처리에서 사용한다.
        size = max(1, min(size, 15))

        # 설명: `rest_api_key`에 `current_app.config.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        rest_api_key = current_app.config.get("KAKAO_REST_API_KEY")
        # 설명: `not rest_api_key` 조건 결과에 따라 실행 경로를 분기한다.
        if not rest_api_key:
            # 설명: 호출자에게 ({'success': False, 'error': 'Kakao REST API Key가 설정되어 있지 않습니다.', 'items': []},... 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "Kakao REST API Key가 설정되어 있지 않습니다.",
                "items": [],
            }, 503

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `keyword_items`에 `LocationSearchService._search_kakao_keyword` 호출 결과를 저장해 다음 처리에서 사용한다.
            keyword_items = LocationSearchService._search_kakao_keyword(
                rest_api_key=rest_api_key,
                keyword=keyword,
                size=size,
            )

            # 설명: `keyword_items` 조건 결과에 따라 실행 경로를 분기한다.
            if keyword_items:
                # 설명: 호출자에게 ({'success': True, 'provider': 'KAKAO', 'items': keyword_items}, 200) 값을 함수 결과로 반환한다.
                return {
                    "success": True,
                    "provider": "KAKAO",
                    "items": keyword_items,
                }, 200

            # 설명: `address_items`에 `LocationSearchService._search_kakao_address` 호출 결과를 저장해 다음 처리에서 사용한다.
            address_items = LocationSearchService._search_kakao_address(
                rest_api_key=rest_api_key,
                keyword=keyword,
                size=size,
            )

            # 설명: 호출자에게 ({'success': True, 'provider': 'KAKAO', 'items': address_items}, 200) 값을 함수 결과로 반환한다.
            return {
                "success": True,
                "provider": "KAKAO",
                "items": address_items,
            }, 200

        except HTTPError as e:
            # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            logger.exception("Kakao location search HTTP error")
            # 설명: 호출자에게 ({'success': False, 'error': '위치 검색 API 호출에 실패했습니다.', 'status_code': e.code, 'i... 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "위치 검색 API 호출에 실패했습니다.",
                "status_code": e.code,
                "items": [],
            }, 502

        except URLError:
            # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            logger.exception("Kakao location search network error")
            # 설명: 호출자에게 ({'success': False, 'error': '위치 검색 API에 연결할 수 없습니다.', 'items': []}, 502) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "위치 검색 API에 연결할 수 없습니다.",
                "items": [],
            }, 502

        except Exception:
            # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            logger.exception("Unexpected location search error")
            # 설명: 호출자에게 ({'success': False, 'error': '위치 검색 중 오류가 발생했습니다.', 'items': []}, 500) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "위치 검색 중 오류가 발생했습니다.",
                "items": [],
            }, 500

    # 설명: `_request_kakao` 함수는 외부 처리 또는 비동기 작업을 요청하는 함수다.
    @staticmethod
    def _request_kakao(rest_api_key, url, params):
        # 설명: `query`에 `urlencode` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = urlencode(params)
        # 설명: `request`에 `Request` 호출 결과를 저장해 다음 처리에서 사용한다.
        request = Request(
            f"{url}?{query}",
            headers={
                "Authorization": f"KakaoAK {rest_api_key}",
            },
            method="GET",
        )

        # 설명: `urlopen(request, timeout=3)` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
        with urlopen(request, timeout=3) as response:
            # 설명: `body`에 `response.read().decode` 호출 결과를 저장해 다음 처리에서 사용한다.
            body = response.read().decode("utf-8")
            # 설명: 호출자에게 json.loads(body) 값을 함수 결과로 반환한다.
            return json.loads(body)

    # 설명: `_search_kakao_keyword` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _search_kakao_keyword(rest_api_key, keyword, size):
        # 설명: `payload`에 `LocationSearchService._request_kakao` 호출 결과를 저장해 다음 처리에서 사용한다.
        payload = LocationSearchService._request_kakao(
            rest_api_key=rest_api_key,
            url=LocationSearchService.KAKAO_KEYWORD_SEARCH_URL,
            params={
                "query": keyword,
                "size": size,
                "sort": "accuracy",
            },
        )

        # 설명: `documents`에 `payload.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        documents = payload.get("documents", [])

        # 설명: 호출자에게 [LocationSearchService._normalize_keyword_document(document) for document in do... 값을 함수 결과로 반환한다.
        return [
            LocationSearchService._normalize_keyword_document(document)
            for document in documents
        ]

    # 설명: `_search_kakao_address` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _search_kakao_address(rest_api_key, keyword, size):
        # 설명: `payload`에 `LocationSearchService._request_kakao` 호출 결과를 저장해 다음 처리에서 사용한다.
        payload = LocationSearchService._request_kakao(
            rest_api_key=rest_api_key,
            url=LocationSearchService.KAKAO_ADDRESS_SEARCH_URL,
            params={
                "query": keyword,
                "size": size,
            },
        )

        # 설명: `documents`에 `payload.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        documents = payload.get("documents", [])

        # 설명: 호출자에게 [LocationSearchService._normalize_address_document(document) for document in do... 값을 함수 결과로 반환한다.
        return [
            LocationSearchService._normalize_address_document(document)
            for document in documents
        ]

    # 설명: `_to_float` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _to_float(value):
        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: 호출자에게 float(value) 값을 함수 결과로 반환한다.
            return float(value)
        except (TypeError, ValueError):
            # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
            return None

    # 설명: `_normalize_keyword_document` 함수는 입력 값을 일관된 형식으로 정규화하는 함수다.
    @staticmethod
    def _normalize_keyword_document(document):
        # 설명: `road_address`에 document.get('road_address_name') or '' 표현식의 계산 결과를 저장한다.
        road_address = document.get("road_address_name") or ""
        # 설명: `address`에 document.get('address_name') or '' 표현식의 계산 결과를 저장한다.
        address = document.get("address_name") or ""
        # 설명: `name`에 document.get('place_name') or road_address or address 표현식의 계산 결과를 저장한다.
        name = document.get("place_name") or road_address or address

        # 설명: 호출자에게 {'id': document.get('id'), 'name': name, 'address': road_address or address, 'r... 값을 함수 결과로 반환한다.
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

    # 설명: `_normalize_address_document` 함수는 입력 값을 일관된 형식으로 정규화하는 함수다.
    @staticmethod
    def _normalize_address_document(document):
        # 설명: `road_address`에 document.get('road_address') or {} 표현식의 계산 결과를 저장한다.
        road_address = document.get("road_address") or {}
        # 설명: `address`에 document.get('address') or {} 표현식의 계산 결과를 저장한다.
        address = document.get("address") or {}

        # 설명: `road_address_name`에 road_address.get('address_name') if road_address else '' 표현식의 계산 결과를 저장한다.
        road_address_name = road_address.get("address_name") if road_address else ""
        # 설명: `jibun_address_name`에 address.get('address_name') if address else document.get('address_name') 표현식의 계산 결과를 저장한다.
        jibun_address_name = address.get("address_name") if address else document.get("address_name")
        # 설명: `name`에 road_address_name or jibun_address_name or document.get('address_name') 표현식의 계산 결과를 저장한다.
        name = road_address_name or jibun_address_name or document.get("address_name")

        # 설명: 호출자에게 {'id': None, 'name': name, 'address': road_address_name or jibun_address_name, ... 값을 함수 결과로 반환한다.
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
