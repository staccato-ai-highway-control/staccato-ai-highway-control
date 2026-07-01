"""보안 로그 API의 SUPER_ADMIN 전용 접근 제어를 검증한다."""

import os
from datetime import datetime
from uuid import uuid4

import pytest

from db_cleanup import cleanup_database
from app import create_app
from app.extensions import db
from app.models import ProjectResource, User
from app.utils.security import create_access_token, hash_password


def _get_test_database_url():
    test_database_url = os.environ.get("TEST_DATABASE_URL")
    if not test_database_url:
        pytest.fail("TEST_DATABASE_URL is required for pytest.")
    if "staccato_test" not in test_database_url:
        pytest.fail("TEST_DATABASE_URL must point to staccato_test.")
    if "staccato_test_runner" not in test_database_url:
        pytest.fail("TEST_DATABASE_URL must use staccato_test_runner.")
    return test_database_url


@pytest.fixture()
def app_context():
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": _get_test_database_url(),
        }
    )

    with app.app_context():
        db.session.remove()
        cleanup_database(db)
        db.create_all()

        yield app

        db.session.remove()
        cleanup_database(db)


@pytest.fixture()
def client(app_context):
    return app_context.test_client()


def _create_user(role: str) -> User:
    suffix = uuid4().hex[:10]
    user = User(
        login_id=f"security_log_{role.lower()}_{suffix}",
        password_hash=hash_password("Password123!"),
        name=f"{role} 테스트 사용자",
        email=f"security-log-{role.lower()}-{suffix}@example.com",
        phone="01012345678",
        role=role,
        account_status="ACTIVE",
        is_email_verified=True,
        created_at=datetime.utcnow(),
    )
    db.session.add(user)
    db.session.commit()
    return user


def _auth_headers(user: User) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {create_access_token(user)}",
    }


def _create_resource(
    tmp_path,
    user: User,
    category: str,
    title: str,
) -> ProjectResource:
    file_path = tmp_path / f"{uuid4().hex}.txt"
    file_path.write_text(f"{title} sample", encoding="utf-8")

    now = datetime.utcnow()
    resource = ProjectResource(
        title=title,
        description=f"{title} description",
        category=category,
        author_id=user.id,
        author_name=user.name,
        file_name=file_path.name,
        file_path=str(file_path),
        file_type="txt",
        file_size=file_path.stat().st_size,
        visibility=(
            "SUPER_ADMIN_ONLY"
            if category == "ACCESS_LOG"
            else "ADMIN_ALL"
        ),
        created_at=now,
        updated_at=now,
    )
    db.session.add(resource)
    db.session.commit()
    return resource


def test_security_log_routes_require_authentication(client):
    for path in (
        "/api/security-logs",
        "/api/security-logs/1",
        "/api/security-logs/1/download",
    ):
        response = client.get(path)
        assert response.status_code == 401, response.get_json()


@pytest.mark.parametrize(
    "role",
    ("CONTROL_ADMIN", "MAINTAINER", "AUTH_ADMIN", "USER"),
)
def test_security_log_routes_forbid_non_super_admin_roles(client, role):
    user = _create_user(role)

    response = client.get(
        "/api/security-logs",
        headers=_auth_headers(user),
    )

    assert response.status_code == 403, response.get_json()


def test_super_admin_can_list_detail_and_download_security_logs(
    client,
    tmp_path,
):
    super_admin = _create_user("SUPER_ADMIN")
    resource = _create_resource(
        tmp_path,
        super_admin,
        "ACCESS_LOG",
        "관리자 접속 로그",
    )
    headers = _auth_headers(super_admin)

    list_response = client.get("/api/security-logs", headers=headers)
    assert list_response.status_code == 200, list_response.get_json()

    items = list_response.get_json()["items"]
    assert [item["id"] for item in items] == [resource.id]

    detail_response = client.get(
        f"/api/security-logs/{resource.id}",
        headers=headers,
    )
    assert detail_response.status_code == 200, detail_response.get_json()
    assert detail_response.get_json()["download_url"] == (
        f"/api/security-logs/{resource.id}/download"
    )

    download_response = client.get(
        f"/api/security-logs/{resource.id}/download",
        headers=headers,
    )
    assert download_response.status_code == 200
    assert "attachment" in download_response.headers["Content-Disposition"]


def test_generic_resources_hide_access_log_records(client, tmp_path):
    control_admin = _create_user("CONTROL_ADMIN")
    headers = _auth_headers(control_admin)

    normal_resource = _create_resource(
        tmp_path,
        control_admin,
        "MEETING_NOTE",
        "일반 회의록",
    )
    security_log = _create_resource(
        tmp_path,
        control_admin,
        "ACCESS_LOG",
        "접근 감사 로그",
    )

    list_response = client.get("/api/resources", headers=headers)
    assert list_response.status_code == 200, list_response.get_json()

    listed_ids = {
        item["id"]
        for item in list_response.get_json()["items"]
    }
    assert normal_resource.id in listed_ids
    assert security_log.id not in listed_ids

    category_response = client.get(
        "/api/resources?category=ACCESS_LOG",
        headers=headers,
    )
    assert category_response.status_code == 404, category_response.get_json()

    for method, path in (
        ("get", f"/api/resources/{security_log.id}"),
        ("get", f"/api/resources/{security_log.id}/download"),
        ("delete", f"/api/resources/{security_log.id}"),
    ):
        response = getattr(client, method)(path, headers=headers)
        assert response.status_code == 404, response.get_json()


def test_generic_resources_cannot_create_or_convert_access_log(
    client,
    tmp_path,
):
    control_admin = _create_user("CONTROL_ADMIN")
    headers = _auth_headers(control_admin)

    create_response = client.post(
        "/api/resources",
        headers=headers,
        data={
            "title": "우회 생성 시도",
            "category": "ACCESS_LOG",
        },
    )
    assert create_response.status_code == 403, create_response.get_json()

    normal_resource = _create_resource(
        tmp_path,
        control_admin,
        "MEETING_NOTE",
        "카테고리 변경 대상",
    )

    update_response = client.patch(
        f"/api/resources/{normal_resource.id}",
        headers=headers,
        data={"category": "ACCESS_LOG"},
    )
    assert update_response.status_code == 403, update_response.get_json()

    db.session.expire_all()
    persisted = db.session.get(ProjectResource, normal_resource.id)
    assert persisted.category == "MEETING_NOTE"
