"""bug report routes 동작과 회귀 계약을 검증하는 테스트 모듈.

격리된 픽스처로 성공 경로, 입력 오류, 권한 및 데이터베이스 부작용을 확인한다."""

# 설명: io에서 BytesIO 이름을 가져와 아래 로직에서 재사용한다.
from io import BytesIO
# 설명: types에서 SimpleNamespace 이름을 가져와 아래 로직에서 재사용한다.
from types import SimpleNamespace

# 설명: app에서 create_app 이름을 가져와 아래 로직에서 재사용한다.
from app import create_app
# 설명: flask_sqlalchemy.query에서 Query 이름을 가져와 아래 로직에서 재사용한다.
from flask_sqlalchemy.query import Query


# 설명: `_authenticated_app` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _authenticated_app(monkeypatch, role="VIEWER"):
    # 설명: `app`에 `create_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app = create_app({"TESTING": True})
    # 설명: `user`에 `SimpleNamespace` 호출 결과를 저장해 다음 처리에서 사용한다.
    user = SimpleNamespace(
        id=1,
        role=role,
        account_status="ACTIVE",
    )
    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr(
        "app.utils.security.decode_access_token",
        lambda token: {"sub": "1"},
    )
    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr(
        Query,
        "get",
        lambda query, user_id: user,
    )
    # 설명: 호출자에게 (app, {'Authorization': 'Bearer test-token'}, user) 값을 함수 결과로 반환한다.
    return app, {"Authorization": "Bearer test-token"}, user


# 설명: `test_create_bug_report_route_requires_authentication` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_create_bug_report_route_requires_authentication():
    # 설명: `app`에 `create_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app = create_app({"TESTING": True})

    # 설명: `app.test_client()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.test_client() as client:
        # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
        response = client.post(
            "/api/bug-reports",
            json={"title": "버그 제목", "description": "버그 내용"},
        )

    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()
    # 설명: 테스트 전제 또는 결과인 `response.status_code == 401` 조건이 참인지 검증한다.
    assert response.status_code == 401
    # 설명: 테스트 전제 또는 결과인 `body['success'] is False` 조건이 참인지 검증한다.
    assert body["success"] is False
    # 설명: 테스트 전제 또는 결과인 `body['status_code'] == 401` 조건이 참인지 검증한다.
    assert body["status_code"] == 401
    # 설명: 테스트 전제 또는 결과인 `body['error_code'] == 'UNAUTHORIZED'` 조건이 참인지 검증한다.
    assert body["error_code"] == "UNAUTHORIZED"


# 설명: `test_create_bug_report_route_passes_authenticated_owner` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_create_bug_report_route_passes_authenticated_owner(monkeypatch):
    # 설명: `(app, headers, user)`에 `_authenticated_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app, headers, user = _authenticated_app(monkeypatch)

    # 설명: `fake_create_bug_report` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def fake_create_bug_report(payload, current_user):
        # 설명: 테스트 전제 또는 결과인 `current_user is user` 조건이 참인지 검증한다.
        assert current_user is user
        # 설명: 호출자에게 ({'success': True, 'data': {'id': 1, 'reporter_id': current_user.id, 'author_id... 값을 함수 결과로 반환한다.
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

    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr(
        "app.modules.bug_report.routes.create_bug_report",
        fake_create_bug_report,
    )

    # 설명: `app.test_client()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.test_client() as client:
        # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
        response = client.post(
            "/api/bug-reports",
            json={"title": "버그 제목", "description": "버그 내용"},
            headers=headers,
        )

    # 설명: `body`에 `response.get_json` 호출 결과를 저장해 다음 처리에서 사용한다.
    body = response.get_json()
    # 설명: 테스트 전제 또는 결과인 `response.status_code == 201` 조건이 참인지 검증한다.
    assert response.status_code == 201
    # 설명: 테스트 전제 또는 결과인 `body['data']['reporter_id'] == user.id` 조건이 참인지 검증한다.
    assert body["data"]["reporter_id"] == user.id
    # 설명: 테스트 전제 또는 결과인 `body['data']['allowed_actions']['update'] is True` 조건이 참인지 검증한다.
    assert body["data"]["allowed_actions"]["update"] is True


# 설명: `test_list_bug_reports_route_passes_authenticated_user` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_list_bug_reports_route_passes_authenticated_user(monkeypatch):
    # 설명: `(app, headers, user)`에 `_authenticated_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app, headers, user = _authenticated_app(monkeypatch)

    # 설명: `fake_list_bug_reports` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def fake_list_bug_reports(args, current_user):
        # 설명: 테스트 전제 또는 결과인 `current_user is user` 조건이 참인지 검증한다.
        assert current_user is user
        # 설명: 테스트 전제 또는 결과인 `args.get('page') == '2'` 조건이 참인지 검증한다.
        assert args.get("page") == "2"
        # 설명: 호출자에게 ({'success': True, 'data': {'items': [], 'page': 2}}, 200) 값을 함수 결과로 반환한다.
        return {"success": True, "data": {"items": [], "page": 2}}, 200

    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr(
        "app.modules.bug_report.routes.list_bug_reports",
        fake_list_bug_reports,
    )

    # 설명: `app.test_client()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.test_client() as client:
        # 설명: `response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        response = client.get("/api/bug-reports?page=2", headers=headers)

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
    assert response.status_code == 200
    # 설명: 테스트 전제 또는 결과인 `response.get_json()['data']['page'] == 2` 조건이 참인지 검증한다.
    assert response.get_json()["data"]["page"] == 2


# 설명: `test_get_bug_report_detail_route_passes_authenticated_user` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_get_bug_report_detail_route_passes_authenticated_user(monkeypatch):
    # 설명: `(app, headers, user)`에 `_authenticated_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app, headers, user = _authenticated_app(monkeypatch)

    # 설명: `fake_get_bug_report_detail` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def fake_get_bug_report_detail(bug_report_id, current_user):
        # 설명: 테스트 전제 또는 결과인 `bug_report_id == 10` 조건이 참인지 검증한다.
        assert bug_report_id == 10
        # 설명: 테스트 전제 또는 결과인 `current_user is user` 조건이 참인지 검증한다.
        assert current_user is user
        # 설명: 호출자에게 ({'success': True, 'data': {'id': bug_report_id, 'reporter_id': user.id, 'allow... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "data": {
                "id": bug_report_id,
                "reporter_id": user.id,
                "allowed_actions": {"view": True},
            },
        }, 200

    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr(
        "app.modules.bug_report.routes.get_bug_report_detail",
        fake_get_bug_report_detail,
    )

    # 설명: `app.test_client()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.test_client() as client:
        # 설명: `response`에 `client.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        response = client.get("/api/bug-reports/10", headers=headers)

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
    assert response.status_code == 200
    # 설명: 테스트 전제 또는 결과인 `response.get_json()['data']['allowed_actions']['view'] is True` 조건이 참인지 검증한다.
    assert response.get_json()["data"]["allowed_actions"]["view"] is True


# 설명: `test_update_bug_report_route_passes_authenticated_owner` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_update_bug_report_route_passes_authenticated_owner(monkeypatch):
    # 설명: `(app, headers, user)`에 `_authenticated_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app, headers, user = _authenticated_app(monkeypatch)

    # 설명: `fake_update_bug_report` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def fake_update_bug_report(bug_report_id, payload, current_user):
        # 설명: 테스트 전제 또는 결과인 `bug_report_id == 10` 조건이 참인지 검증한다.
        assert bug_report_id == 10
        # 설명: 테스트 전제 또는 결과인 `current_user is user` 조건이 참인지 검증한다.
        assert current_user is user
        # 설명: 호출자에게 ({'success': True, 'data': {'id': bug_report_id, 'title': payload['title'], 're... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "data": {
                "id": bug_report_id,
                "title": payload["title"],
                "reporter_id": current_user.id,
                "allowed_actions": {"update": True, "close": True},
            },
        }, 200

    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr(
        "app.modules.bug_report.routes.update_bug_report",
        fake_update_bug_report,
    )

    # 설명: `app.test_client()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.test_client() as client:
        # 설명: `response`에 `client.patch` 호출 결과를 저장해 다음 처리에서 사용한다.
        response = client.patch(
            "/api/bug-reports/10",
            json={"title": "수정된 버그"},
            headers=headers,
        )

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
    assert response.status_code == 200
    # 설명: 테스트 전제 또는 결과인 `response.get_json()['data']['allowed_actions']['close'] is True` 조건이 참인지 검증한다.
    assert response.get_json()["data"]["allowed_actions"]["close"] is True


# 설명: `test_close_bug_report_route_passes_authenticated_owner` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_close_bug_report_route_passes_authenticated_owner(monkeypatch):
    # 설명: `(app, headers, user)`에 `_authenticated_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app, headers, user = _authenticated_app(monkeypatch)

    # 설명: `fake_close_bug_report` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def fake_close_bug_report(bug_report_id, current_user):
        # 설명: 테스트 전제 또는 결과인 `bug_report_id == 10` 조건이 참인지 검증한다.
        assert bug_report_id == 10
        # 설명: 테스트 전제 또는 결과인 `current_user is user` 조건이 참인지 검증한다.
        assert current_user is user
        # 설명: 호출자에게 ({'success': True, 'data': {'id': bug_report_id, 'status': 'CLOSED', 'reporter_... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "data": {
                "id": bug_report_id,
                "status": "CLOSED",
                "reporter_id": user.id,
                "allowed_actions": {"close": False},
            },
        }, 200

    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr(
        "app.modules.bug_report.routes.close_bug_report",
        fake_close_bug_report,
    )

    # 설명: `app.test_client()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.test_client() as client:
        # 설명: `response`에 `client.delete` 호출 결과를 저장해 다음 처리에서 사용한다.
        response = client.delete("/api/bug-reports/10", headers=headers)

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 200` 조건이 참인지 검증한다.
    assert response.status_code == 200
    # 설명: 테스트 전제 또는 결과인 `response.get_json()['data']['status'] == 'CLOSED'` 조건이 참인지 검증한다.
    assert response.get_json()["data"]["status"] == "CLOSED"


# 설명: `test_bug_report_attachment_route_passes_authenticated_owner` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_bug_report_attachment_route_passes_authenticated_owner(monkeypatch):
    # 설명: `(app, headers, user)`에 `_authenticated_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app, headers, user = _authenticated_app(monkeypatch)

    # 설명: `fake_create_bug_report_attachments` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def fake_create_bug_report_attachments(bug_report_id, files, current_user):
        # 설명: 테스트 전제 또는 결과인 `bug_report_id == 10` 조건이 참인지 검증한다.
        assert bug_report_id == 10
        # 설명: 테스트 전제 또는 결과인 `current_user is user` 조건이 참인지 검증한다.
        assert current_user is user
        # 설명: 테스트 전제 또는 결과인 `files[0].filename == 'screenshot.png'` 조건이 참인지 검증한다.
        assert files[0].filename == "screenshot.png"
        # 설명: 호출자에게 ({'success': True, 'bug_report_id': bug_report_id, 'items': [{'id': 1, 'uploade... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "bug_report_id": bug_report_id,
            "items": [{"id": 1, "uploaded_by": current_user.id}],
        }, 201

    # 설명: `monkeypatch.setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    monkeypatch.setattr(
        "app.modules.bug_report.routes.create_bug_report_attachments",
        fake_create_bug_report_attachments,
    )

    # 설명: `app.test_client()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.test_client() as client:
        # 설명: `response`에 `client.post` 호출 결과를 저장해 다음 처리에서 사용한다.
        response = client.post(
            "/api/bug-reports/10/attachments",
            data={"files": (BytesIO(b"fake image"), "screenshot.png")},
            content_type="multipart/form-data",
            headers=headers,
        )

    # 설명: 테스트 전제 또는 결과인 `response.status_code == 201` 조건이 참인지 검증한다.
    assert response.status_code == 201
    # 설명: 테스트 전제 또는 결과인 `response.get_json()['items'][0]['uploaded_by'] == user.id` 조건이 참인지 검증한다.
    assert response.get_json()["items"][0]["uploaded_by"] == user.id


# 설명: `test_bug_report_routes_are_registered` 함수는 예상 동작과 회귀 조건을 검증하는 테스트 함수다.
def test_bug_report_routes_are_registered():
    # 설명: `app`에 `create_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app = create_app({"TESTING": True})
    # 설명: `routes`에 {(str(rule), tuple(sorted(rule.methods - {'HEAD', 'OPTIONS'}))) for r... 표현식의 계산 결과를 저장한다.
    routes = {
        (str(rule), tuple(sorted(rule.methods - {"HEAD", "OPTIONS"})))
        for rule in app.url_map.iter_rules()
        if "bug-reports" in str(rule)
    }

    # 설명: 테스트 전제 또는 결과인 `('/api/bug-reports', ('GET',)) in routes` 조건이 참인지 검증한다.
    assert ("/api/bug-reports", ("GET",)) in routes
    # 설명: 테스트 전제 또는 결과인 `('/api/bug-reports', ('POST',)) in routes` 조건이 참인지 검증한다.
    assert ("/api/bug-reports", ("POST",)) in routes
    # 설명: 테스트 전제 또는 결과인 `('/api/bug-reports/my', ('GET',)) in routes` 조건이 참인지 검증한다.
    assert ("/api/bug-reports/my", ("GET",)) in routes
    # 설명: 테스트 전제 또는 결과인 `('/api/bug-reports/<int:bug_report_id>', ('GET',)) in routes` 조건이 참인지 검증한다.
    assert ("/api/bug-reports/<int:bug_report_id>", ("GET",)) in routes
    # 설명: 테스트 전제 또는 결과인 `('/api/bug-reports/<int:bug_report_id>', ('PATCH',)) in routes` 조건이 참인지 검증한다.
    assert ("/api/bug-reports/<int:bug_report_id>", ("PATCH",)) in routes
    # 설명: 테스트 전제 또는 결과인 `('/api/bug-reports/<int:bug_report_id>', ('DELETE',)) in routes` 조건이 참인지 검증한다.
    assert ("/api/bug-reports/<int:bug_report_id>", ("DELETE",)) in routes
    # 설명: 테스트 전제 또는 결과인 `('/api/bug-reports/<int:bug_report_id>/attachments', ('POST',)) in routes` 조건이 참인지 검증한다.
    assert (
        "/api/bug-reports/<int:bug_report_id>/attachments",
        ("POST",),
    ) in routes
    # 설명: 테스트 전제 또는 결과인 `('/api/bug-reports/attachments/<int:attachment_id>/download', ('GET',)) in routes` 조건이 참인지 검증한다.
    assert (
        "/api/bug-reports/attachments/<int:attachment_id>/download",
        ("GET",),
    ) in routes
