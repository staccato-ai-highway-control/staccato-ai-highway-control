"""replay routes 동작과 회귀 계약을 검증하는 테스트 모듈.

격리된 픽스처로 성공 경로, 입력 오류, 권한 및 데이터베이스 부작용을 확인한다."""

# 설명: app에서 create_app 이름을 가져와 아래 로직에서 재사용한다.
from app import create_app


# 설명: `test_list_replays_route_success` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_list_replays_route_success(monkeypatch):
    # 설명: `app`에 `create_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app = create_app({"TESTING": True})

    # 설명: `fake_list_replays` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def fake_list_replays(page, size, filters):
        # 설명: 테스트 전제 또는 결과인 `page == 1` 조건이 참인지 검증한다.
        assert page == 1
        # 설명: 테스트 전제 또는 결과인 `size == 20` 조건이 참인지 검증한다.
        assert size == 20
        # 설명: 테스트 전제 또는 결과인 `filters['source_type'] is None` 조건이 참인지 검증한다.
        assert filters["source_type"] is None
        # 설명: 호출자에게 {'success': True, 'message': '이벤트 리플레이 목록 조회 성공', 'data': {'items': [{'incident... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "message": "이벤트 리플레이 목록 조회 성공",
            "data": {
                "items": [
                    {
                        "incident_id": 1,
                        "incident_code": "INC-1",
                        "source_type": "STREAM",
                        "snapshot_url": None,
                        "replay_url": None,
                        "has_snapshot": False,
                        "has_video": False,
                    }
                ],
                "page": page,
                "size": size,
                "total_count": 1,
                "total_pages": 1,
            },
        }

    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr("app.modules.replay.routes.list_replays", fake_list_replays)

    # 설명: `app.test_client()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.test_client() as client:
        # 설명: `response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        response = client.get("/api/replays")

    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()
    # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
    assert response.status_code == 200
    # 설명: 테스트 전제 또는 결과인 `body['success'] is True` 조건이 참인지 검증한다.
    assert body["success"] is True
    # 설명: 테스트 전제 또는 결과인 `body['data']['items'][0]['incident_id'] == 1` 조건이 참인지 검증한다.
    assert body["data"]["items"][0]["incident_id"] == 1


# 설명: `test_get_replay_detail_not_found` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_get_replay_detail_not_found(monkeypatch):
    # 설명: `app`에 `create_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app = create_app({"TESTING": True})

    # 설명: `fake_get_replay_detail` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def fake_get_replay_detail(incident_id):
        # 설명: 테스트 전제 또는 결과인 `incident_id == 999` 조건이 참인지 검증한다.
        assert incident_id == 999
        # 설명: 호출자에게 {'success': False, 'error_code': 'REPLAY_NOT_FOUND', 'message': '이벤트 리플레이를 찾을 수... 값을 함수 결과로 반환한다.
        return {
            "success": False,
            "error_code": "REPLAY_NOT_FOUND",
            "message": "이벤트 리플레이를 찾을 수 없습니다.",
            "details": None,
        }

    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr("app.modules.replay.routes.get_replay_detail", fake_get_replay_detail)

    # 설명: `app.test_client()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.test_client() as client:
        # 설명: `response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        response = client.get("/api/replays/999")

    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()
    # 설명: 테스트 전제 또는 결과인 `response.status_code == 404` 조건이 참인지 검증한다.
    assert response.status_code == 404
    # 설명: 테스트 전제 또는 결과인 `body['success'] is False` 조건이 참인지 검증한다.
    assert body["success"] is False
    # 설명: 테스트 전제 또는 결과인 `body['error_code'] == 'REPLAY_NOT_FOUND'` 조건이 참인지 검증한다.
    assert body["error_code"] == "REPLAY_NOT_FOUND"


# 설명: `test_replay_routes_do_not_require_auth` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_replay_routes_do_not_require_auth(monkeypatch):
    # 설명: `app`에 `create_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app = create_app({"TESTING": True})

    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr(
        "app.modules.replay.routes.list_replays",
        lambda page, size, filters: {
            "success": True,
            "message": "이벤트 리플레이 목록 조회 성공",
            "data": {
                "items": [],
                "page": page,
                "size": size,
                "total_count": 0,
                "total_pages": 0,
            },
        },
    )

    # 설명: `app.test_client()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.test_client() as client:
        # 설명: `response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        response = client.get("/api/replays")

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
    assert response.status_code == 200


# 설명: `test_replay_routes_are_registered` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_replay_routes_are_registered():
    # 설명: `app`에 `create_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app = create_app({"TESTING": True})
    # 설명: `routes`에 {(str(rule), tuple(sorted(rule.methods - {'HEAD', 'OPTIONS'}))) for r... 표현식의 계산 결과를 저장한다.
    routes = {
        (str(rule), tuple(sorted(rule.methods - {"HEAD", "OPTIONS"})))
        for rule in app.url_map.iter_rules()
        if "replay" in str(rule)
    }

    # 설명: 테스트 전제 또는 결과인 `('/api/replays', ('GET',)) in routes` 조건이 참인지 검증한다.
    assert ("/api/replays", ("GET",)) in routes
    # 설명: 테스트 전제 또는 결과인 `('/api/replays/<int:incident_id>', ('GET',)) in routes` 조건이 참인지 검증한다.
    assert ("/api/replays/<int:incident_id>", ("GET",)) in routes
