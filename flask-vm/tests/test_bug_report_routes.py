from io import BytesIO
from types import SimpleNamespace

from app import create_app
from flask_sqlalchemy.query import Query


def _authenticated_app(monkeypatch, role="VIEWER"):
    app = create_app({"TESTING": True})
    user = SimpleNamespace(
        id=1,
        role=role,
        account_status="ACTIVE",
    )
    monkeypatch.setattr(
        "app.utils.security.decode_access_token",
        lambda token: {"sub": "1"},
    )
    monkeypatch.setattr(
        Query,
        "get",
        lambda query, user_id: user,
    )
    return app, {"Authorization": "Bearer test-token"}, user


def test_create_bug_report_route_requires_authentication():
    app = create_app({"TESTING": True})

    with app.test_client() as client:
        response = client.post(
            "/api/bug-reports",
            json={"title": "버그 제목", "description": "버그 내용"},
        )

    body = response.get_json()
    assert response.status_code == 401
    assert body["success"] is False
    assert body["status_code"] == 401
    assert body["error_code"] == "UNAUTHORIZED"


def test_create_bug_report_route_passes_authenticated_owner(monkeypatch):
    app, headers, user = _authenticated_app(monkeypatch)

    def fake_create_bug_report(payload, current_user):
        assert current_user is user
        return {
            "success": True,
            "data": {
                "id": 1,
                "reporter_id": current_user.id,
                "author_id": current_user.id,
                "allowed_actions": {"update": True},
                "title": payload["title"],
            },
        }, 201

    monkeypatch.setattr(
        "app.modules.bug_report.routes.create_bug_report",
        fake_create_bug_report,
    )

    with app.test_client() as client:
        response = client.post(
            "/api/bug-reports",
            json={"title": "버그 제목", "description": "버그 내용"},
            headers=headers,
        )

    body = response.get_json()
    assert response.status_code == 201
    assert body["data"]["reporter_id"] == user.id
    assert body["data"]["allowed_actions"]["update"] is True


def test_list_bug_reports_route_passes_authenticated_user(monkeypatch):
    app, headers, user = _authenticated_app(monkeypatch)

    def fake_list_bug_reports(args, current_user):
        assert current_user is user
        assert args.get("page") == "2"
        return {"success": True, "data": {"items": [], "page": 2}}, 200

    monkeypatch.setattr(
        "app.modules.bug_report.routes.list_bug_reports",
        fake_list_bug_reports,
    )

    with app.test_client() as client:
        response = client.get("/api/bug-reports?page=2", headers=headers)

    assert response.status_code == 200
    assert response.get_json()["data"]["page"] == 2


def test_get_bug_report_detail_route_passes_authenticated_user(monkeypatch):
    app, headers, user = _authenticated_app(monkeypatch)

    def fake_get_bug_report_detail(bug_report_id, current_user):
        assert bug_report_id == 10
        assert current_user is user
        return {
            "success": True,
            "data": {
                "id": bug_report_id,
                "reporter_id": user.id,
                "allowed_actions": {"view": True},
            },
        }, 200

    monkeypatch.setattr(
        "app.modules.bug_report.routes.get_bug_report_detail",
        fake_get_bug_report_detail,
    )

    with app.test_client() as client:
        response = client.get("/api/bug-reports/10", headers=headers)

    assert response.status_code == 200
    assert response.get_json()["data"]["allowed_actions"]["view"] is True


def test_update_bug_report_route_passes_authenticated_owner(monkeypatch):
    app, headers, user = _authenticated_app(monkeypatch)

    def fake_update_bug_report(bug_report_id, payload, current_user):
        assert bug_report_id == 10
        assert current_user is user
        return {
            "success": True,
            "data": {
                "id": bug_report_id,
                "title": payload["title"],
                "reporter_id": current_user.id,
                "allowed_actions": {"update": True, "close": True},
            },
        }, 200

    monkeypatch.setattr(
        "app.modules.bug_report.routes.update_bug_report",
        fake_update_bug_report,
    )

    with app.test_client() as client:
        response = client.patch(
            "/api/bug-reports/10",
            json={"title": "수정된 버그"},
            headers=headers,
        )

    assert response.status_code == 200
    assert response.get_json()["data"]["allowed_actions"]["close"] is True


def test_close_bug_report_route_passes_authenticated_owner(monkeypatch):
    app, headers, user = _authenticated_app(monkeypatch)

    def fake_close_bug_report(bug_report_id, current_user):
        assert bug_report_id == 10
        assert current_user is user
        return {
            "success": True,
            "data": {
                "id": bug_report_id,
                "status": "CLOSED",
                "reporter_id": user.id,
                "allowed_actions": {"close": False},
            },
        }, 200

    monkeypatch.setattr(
        "app.modules.bug_report.routes.close_bug_report",
        fake_close_bug_report,
    )

    with app.test_client() as client:
        response = client.delete("/api/bug-reports/10", headers=headers)

    assert response.status_code == 200
    assert response.get_json()["data"]["status"] == "CLOSED"


def test_bug_report_attachment_route_passes_authenticated_owner(monkeypatch):
    app, headers, user = _authenticated_app(monkeypatch)

    def fake_create_bug_report_attachments(bug_report_id, files, current_user):
        assert bug_report_id == 10
        assert current_user is user
        assert files[0].filename == "screenshot.png"
        return {
            "success": True,
            "bug_report_id": bug_report_id,
            "items": [{"id": 1, "uploaded_by": current_user.id}],
        }, 201

    monkeypatch.setattr(
        "app.modules.bug_report.routes.create_bug_report_attachments",
        fake_create_bug_report_attachments,
    )

    with app.test_client() as client:
        response = client.post(
            "/api/bug-reports/10/attachments",
            data={"files": (BytesIO(b"fake image"), "screenshot.png")},
            content_type="multipart/form-data",
            headers=headers,
        )

    assert response.status_code == 201
    assert response.get_json()["items"][0]["uploaded_by"] == user.id


def test_bug_report_routes_are_registered():
    app = create_app({"TESTING": True})
    routes = {
        (str(rule), tuple(sorted(rule.methods - {"HEAD", "OPTIONS"})))
        for rule in app.url_map.iter_rules()
        if "bug-reports" in str(rule)
    }

    assert ("/api/bug-reports", ("GET",)) in routes
    assert ("/api/bug-reports", ("POST",)) in routes
    assert ("/api/bug-reports/my", ("GET",)) in routes
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
