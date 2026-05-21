import json
from io import BytesIO

from app import create_app
from app.modules.location_search.service import LocationSearchService


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


def test_location_search_requires_keyword():
    app = create_app({
        "TESTING": True,
        "KAKAO_REST_API_KEY": "test-key",
    })

    with app.app_context():
        result, status_code = LocationSearchService.search(keyword="경", size=10)

    assert status_code == 400
    assert result["success"] is False


def test_location_search_returns_normalized_kakao_keyword_results(monkeypatch):
    app = create_app({
        "TESTING": True,
        "KAKAO_REST_API_KEY": "test-key",
    })

    def fake_urlopen(request, timeout):
        assert request.headers["Authorization"] == "KakaoAK test-key"
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

    monkeypatch.setattr(
        "app.modules.location_search.service.urlopen",
        fake_urlopen,
    )

    with app.app_context():
        result, status_code = LocationSearchService.search(keyword="경부", size=10)

    assert status_code == 200
    assert result["success"] is True
    assert result["items"][0]["name"] == "경부고속도로 수원IC"
    assert result["items"][0]["latitude"] == 37.2636
    assert result["items"][0]["longitude"] == 127.0286
    assert result["items"][0]["provider"] == "KAKAO"


def test_location_search_returns_503_without_rest_key():
    app = create_app({
        "TESTING": True,
        "KAKAO_REST_API_KEY": None,
    })

    with app.app_context():
        result, status_code = LocationSearchService.search(keyword="경부", size=10)

    assert status_code == 503
    assert result["success"] is False
