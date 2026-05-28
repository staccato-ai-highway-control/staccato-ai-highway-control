from app import create_app


def test_create_bug_report_route_allows_anonymous_user(monkeypatch):
    app = create_app({"TESTING": True})

    def fake_create_bug_report(payload):
        assert payload["title"] == "버그 제목"
        assert payload["description"] == "버그 내용"
        return {
            "success": True,
            "message": "Bug report created.",
            "data": {
                "id": 1,
                "reporter_id": None,
                "title": payload["title"],
                "description": payload["description"],
            },
        }, 201

    monkeypatch.setattr(
        "app.modules.bug_report.routes.create_bug_report",
        fake_create_bug_report,
    )

    with app.test_client() as client:
        response = client.post(
            "/api/bug-reports",
            json={
                "title": "버그 제목",
                "description": "버그 내용",
            },
        )

    body = response.get_json()
    assert response.status_code == 201
    assert body["success"] is True
    assert body["data"]["reporter_id"] is None


def test_list_bug_reports_route_returns_pagination(monkeypatch):
    app = create_app({"TESTING": True})

    def fake_list_bug_reports(args):
        assert args.get("page") == "2"
        assert args.get("size") == "5"
        return {
            "success": True,
            "data": {
                "items": [],
                "page": 2,
                "size": 5,
                "total_count": 0,
                "total_pages": 0,
            },
        }, 200

    monkeypatch.setattr(
        "app.modules.bug_report.routes.list_bug_reports",
        fake_list_bug_reports,
    )

    with app.test_client() as client:
        response = client.get("/api/bug-reports?page=2&size=5")

    body = response.get_json()
    assert response.status_code == 200
    assert body["success"] is True
    assert body["data"]["page"] == 2
    assert body["data"]["size"] == 5


def test_get_bug_report_detail_route(monkeypatch):
    app = create_app({"TESTING": True})

    def fake_get_bug_report_detail(bug_report_id):
        assert bug_report_id == 10
        return {
            "success": True,
            "data": {
                "id": bug_report_id,
                "title": "상세 제목",
                "attachments": [],
            },
        }, 200

    monkeypatch.setattr(
        "app.modules.bug_report.routes.get_bug_report_detail",
        fake_get_bug_report_detail,
    )

    with app.test_client() as client:
        response = client.get("/api/bug-reports/10")

    body = response.get_json()
    assert response.status_code == 200
    assert body["success"] is True
    assert body["data"]["id"] == 10
    assert body["data"]["attachments"] == []


def test_bug_report_attachment_route_is_todo():
    app = create_app({"TESTING": True})

    with app.test_client() as client:
        response = client.post("/api/bug-reports/10/attachments")

    body = response.get_json()
    assert response.status_code == 501
    assert body["success"] is False
    assert body["bug_report_id"] == 10


def test_bug_report_routes_are_registered():
    app = create_app({"TESTING": True})
    routes = {
        (str(rule), tuple(sorted(rule.methods - {"HEAD", "OPTIONS"})))
        for rule in app.url_map.iter_rules()
        if "bug-reports" in str(rule)
    }

    assert ("/api/bug-reports", ("GET",)) in routes
    assert ("/api/bug-reports", ("POST",)) in routes
    assert ("/api/bug-reports/<int:bug_report_id>", ("GET",)) in routes
    assert (
        "/api/bug-reports/<int:bug_report_id>/attachments",
        ("POST",),
    ) in routes
