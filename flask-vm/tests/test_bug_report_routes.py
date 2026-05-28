from io import BytesIO

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


def test_update_bug_report_route(monkeypatch):
    app = create_app({"TESTING": True})

    def fake_update_bug_report(bug_report_id, payload):
        assert bug_report_id == 10
        assert payload["title"] == "수정된 버그"
        return {
            "success": True,
            "message": "Bug report updated.",
            "data": {
                "id": bug_report_id,
                "title": payload["title"],
                "status": "IN_PROGRESS",
            },
        }, 200

    monkeypatch.setattr(
        "app.modules.bug_report.routes.update_bug_report",
        fake_update_bug_report,
    )

    with app.test_client() as client:
        response = client.patch(
            "/api/bug-reports/10",
            json={
                "title": "수정된 버그",
                "status": "IN_PROGRESS",
            },
        )

    body = response.get_json()
    assert response.status_code == 200
    assert body["success"] is True
    assert body["data"]["id"] == 10
    assert body["data"]["title"] == "수정된 버그"


def test_close_bug_report_route(monkeypatch):
    app = create_app({"TESTING": True})

    def fake_close_bug_report(bug_report_id):
        assert bug_report_id == 10
        return {
            "success": True,
            "message": "Bug report closed.",
            "bug_report_id": bug_report_id,
            "data": {
                "id": bug_report_id,
                "status": "CLOSED",
            },
        }, 200

    monkeypatch.setattr(
        "app.modules.bug_report.routes.close_bug_report",
        fake_close_bug_report,
    )

    with app.test_client() as client:
        response = client.delete("/api/bug-reports/10")

    body = response.get_json()
    assert response.status_code == 200
    assert body["success"] is True
    assert body["bug_report_id"] == 10
    assert body["data"]["status"] == "CLOSED"


def test_bug_report_attachment_route_uploads_files(monkeypatch):
    app = create_app({"TESTING": True})

    def fake_create_bug_report_attachments(bug_report_id, files):
        assert bug_report_id == 10
        assert len(files) == 1
        assert files[0].filename == "screenshot.png"
        return {
            "success": True,
            "message": "Bug report attachments uploaded.",
            "bug_report_id": bug_report_id,
            "count": 1,
            "items": [
                {
                    "id": 1,
                    "bug_report_id": bug_report_id,
                    "original_filename": "screenshot.png",
                    "download_url": "/api/bug-reports/attachments/1/download",
                }
            ],
        }, 201

    monkeypatch.setattr(
        "app.modules.bug_report.routes.create_bug_report_attachments",
        fake_create_bug_report_attachments,
    )

    with app.test_client() as client:
        response = client.post(
            "/api/bug-reports/10/attachments",
            data={
                "files": (BytesIO(b"fake image"), "screenshot.png"),
            },
            content_type="multipart/form-data",
        )

    body = response.get_json()
    assert response.status_code == 201
    assert body["success"] is True
    assert body["bug_report_id"] == 10
    assert body["count"] == 1
    assert body["items"][0]["download_url"] == "/api/bug-reports/attachments/1/download"


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
    assert ("/api/bug-reports/<int:bug_report_id>", ("PATCH",)) in routes
    assert ("/api/bug-reports/<int:bug_report_id>", ("DELETE",)) in routes
    assert (
        "/api/bug-reports/<int:bug_report_id>/attachments",
        ("POST",),
    ) in routes
    assert (
        "/api/bug-reports/attachments/<int:attachment_id>/download",
        ("GET",),
    ) in routes
