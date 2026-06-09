from app import create_app


def test_list_replays_route_success(monkeypatch):
    app = create_app({"TESTING": True})

    def fake_list_replays(page, size, filters):
        assert page == 1
        assert size == 20
        assert filters["source_type"] is None
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

    monkeypatch.setattr("app.modules.replay.routes.list_replays", fake_list_replays)

    with app.test_client() as client:
        response = client.get("/api/replays")

    body = response.get_json()
    assert response.status_code == 200
    assert body["success"] is True
    assert body["data"]["items"][0]["incident_id"] == 1


def test_get_replay_detail_not_found(monkeypatch):
    app = create_app({"TESTING": True})

    def fake_get_replay_detail(incident_id):
        assert incident_id == 999
        return {
            "success": False,
            "error_code": "REPLAY_NOT_FOUND",
            "message": "이벤트 리플레이를 찾을 수 없습니다.",
            "details": None,
        }

    monkeypatch.setattr("app.modules.replay.routes.get_replay_detail", fake_get_replay_detail)

    with app.test_client() as client:
        response = client.get("/api/replays/999")

    body = response.get_json()
    assert response.status_code == 404
    assert body["success"] is False
    assert body["error_code"] == "REPLAY_NOT_FOUND"


def test_replay_routes_do_not_require_auth(monkeypatch):
    app = create_app({"TESTING": True})

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

    with app.test_client() as client:
        response = client.get("/api/replays")

    assert response.status_code == 200


def test_replay_routes_are_registered():
    app = create_app({"TESTING": True})
    routes = {
        (str(rule), tuple(sorted(rule.methods - {"HEAD", "OPTIONS"})))
        for rule in app.url_map.iter_rules()
        if "replay" in str(rule)
    }

    assert ("/api/replays", ("GET",)) in routes
    assert ("/api/replays/<int:incident_id>", ("GET",)) in routes
