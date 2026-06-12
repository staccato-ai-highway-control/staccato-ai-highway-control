"""location search unit 동작과 회귀 계약을 검증하는 테스트 모듈.

격리된 픽스처로 성공 경로, 입력 오류, 권한 및 데이터베이스 부작용을 확인한다."""

# 설명: json 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import json
# 설명: io에서 BytesIO 이름을 가져와 아래 로직에서 재사용한다.
from io import BytesIO

# 설명: app에서 create_app 이름을 가져와 아래 로직에서 재사용한다.
from app import create_app
# 설명: app.modules.location_search.service에서 LocationSearchService 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.location_search.service import LocationSearchService


# 설명: `FakeResponse` 클래스를 정의하고 기본 object의 동작 또는 계약을 확장한다.
class FakeResponse:
    # 설명: `__init__` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def __init__(self, payload):
        # 설명: `self.payload`에 payload 표현식의 계산 결과를 저장한다.
        self.payload = payload

    # 설명: `__enter__` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def __enter__(self):
        # 설명: 호출자에게 self 값을 함수 결과로 반환한다.
        return self

    # 설명: `__exit__` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def __exit__(self, exc_type, exc, tb):
        # 설명: 호출자에게 False 값을 함수 결과로 반환한다.
        return False

    # 설명: `read` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def read(self):
        # 설명: 호출자에게 json.dumps(self.payload).encode('utf-8') 값을 함수 결과로 반환한다.
        return json.dumps(self.payload).encode("utf-8")


# 설명: `test_location_search_requires_keyword` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_location_search_requires_keyword():
    # 설명: `app`에 `create_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app = create_app({
        "TESTING": True,
        "KAKAO_REST_API_KEY": "test-key",
    })

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `(result, status_code)`에 `LocationSearchService.search` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = LocationSearchService.search(keyword="경", size=10)

    # 설명: 테스트 전제 또는 결과인 `status_code == 400` 조건이 참인지 검증한다.
    assert status_code == 400
    # 설명: 테스트 전제 또는 결과인 `result['success'] is False` 조건이 참인지 검증한다.
    assert result["success"] is False


# 설명: `test_location_search_returns_normalized_kakao_keyword_results` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_location_search_returns_normalized_kakao_keyword_results(monkeypatch):
    # 설명: `app`에 `create_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app = create_app({
        "TESTING": True,
        "KAKAO_REST_API_KEY": "test-key",
    })

    # 설명: `fake_urlopen` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def fake_urlopen(request, timeout):
        # 설명: 테스트 전제 또는 결과인 `request.headers['Authorization'] == 'KakaoAK test-key'` 조건이 참인지 검증한다.
        assert request.headers["Authorization"] == "KakaoAK test-key"
        # 설명: 호출자에게 FakeResponse({'documents': [{'id': '123', 'place_name': '경부고속도로 수원IC', 'road_ad... 값을 함수 결과로 반환한다.
        return FakeResponse({
            "documents": [
                {
                    "id": "123",
                    "place_name": "경부고속도로 수원IC",
                    "road_address_name": "경기도 수원시 권선구",
                    "address_name": "경기 수원시 권선구",
                    "x": "127.0286",
                    "y": "37.2636",
                    "category_name": "교통,수송 > 도로시설",
                    "phone": "",
                    "place_url": "https://place.map.kakao.com/123",
                }
            ]
        })

    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr(
        "app.modules.location_search.service.urlopen",
        fake_urlopen,
    )

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `(result, status_code)`에 `LocationSearchService.search` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = LocationSearchService.search(keyword="경부", size=10)

    # 설명: 테스트 전제 또는 결과인 `status_code == 200` 조건이 참인지 검증한다.
    assert status_code == 200
    # 설명: 테스트 전제 또는 결과인 `result['success'] is True` 조건이 참인지 검증한다.
    assert result["success"] is True
    # 설명: 테스트 전제 또는 결과인 `result['items'][0]['name'] == '경부고속도로 수원IC'` 조건이 참인지 검증한다.
    assert result["items"][0]["name"] == "경부고속도로 수원IC"
    # 설명: 테스트 전제 또는 결과인 `result['items'][0]['latitude'] == 37.2636` 조건이 참인지 검증한다.
    assert result["items"][0]["latitude"] == 37.2636
    # 설명: 테스트 전제 또는 결과인 `result['items'][0]['longitude'] == 127.0286` 조건이 참인지 검증한다.
    assert result["items"][0]["longitude"] == 127.0286
    # 설명: 테스트 전제 또는 결과인 `result['items'][0]['provider'] == 'KAKAO'` 조건이 참인지 검증한다.
    assert result["items"][0]["provider"] == "KAKAO"


# 설명: `test_location_search_returns_503_without_rest_key` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_location_search_returns_503_without_rest_key():
    # 설명: `app`에 `create_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app = create_app({
        "TESTING": True,
        "KAKAO_REST_API_KEY": None,
    })

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `(result, status_code)`에 `LocationSearchService.search` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = LocationSearchService.search(keyword="경부", size=10)

    # 설명: 테스트 전제 또는 결과인 `status_code == 503` 조건이 참인지 검증한다.
    assert status_code == 503
    # 설명: 테스트 전제 또는 결과인 `result['success'] is False` 조건이 참인지 검증한다.
    assert result["success"] is False
