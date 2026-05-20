import io

from app import create_app


# -----------------------
# 테스트용 app 생성
# -----------------------
def setup_app():

    app = create_app()

    app.config["TESTING"] = True

    return app


def test_list_posts():

    app = setup_app()

    client = app.test_client()

    response = client.get(
        "/board/posts"
    )

    assert response.status_code == 401


def test_detail_post():

    app = setup_app()

    client = app.test_client()

    response = client.get(
        "/board/posts/1"
    )

    assert response.status_code == 401


def test_create_comment():

    app = setup_app()

    client = app.test_client()

    payload = {
        "content": "테스트 댓글"
    }

    response = client.post(
        "/board/posts/1/comments",
        json=payload
    )

    assert response.status_code == 401


def test_create_reply_comment():

    app = setup_app()

    client = app.test_client()

    payload = {
        "content": "테스트 대댓글",
        "parent_comment_id": 1
    }

    response = client.post(
        "/board/posts/1/comments",
        json=payload
    )

    assert response.status_code == 401


def test_delete_comment():

    app = setup_app()

    client = app.test_client()

    response = client.delete(
        "/board/comments/1"
    )

    assert response.status_code == 401


def test_list_comments():

    app = setup_app()

    client = app.test_client()

    response = client.get(
        "/board/posts/1/comments"
    )

    assert response.status_code == 401


def test_create_post_with_file():

    app = setup_app()

    client = app.test_client()

    data = {
        "title": "파일 테스트",
        "content": "첨부파일 포함",
        "board_type": "NOTICE",
        "file": (
            io.BytesIO(b"test file"),
            "test.txt"
        )
    }

    response = client.post(
        "/board/posts",
        data=data,
        content_type="multipart/form-data"
    )

    assert response.status_code == 401


def get_auth_headers(client):

    login_response = client.post(
        "/auth/login",
        json={
            "email": "superadmin",
            "password": "Staccato2AI#"
        }
    )

    token = login_response.json[
        "access_token"
    ]

    return {
        "Authorization": f"Bearer {token}"
    }


def test_create_comment_with_auth():

    app = setup_app()

    client = app.test_client()

    headers = get_auth_headers(
        client
    )

    response = client.post(
        "/board/posts/1/comments",
        json={
            "content": "로그인 댓글"
        },
        headers=headers
    )

    assert response.status_code == 201


def test_create_reply_comment_with_auth():

    app = setup_app()

    client = app.test_client()

    headers = get_auth_headers(
        client
    )

    # 부모 댓글 생성
    parent_response = client.post(
        "/board/posts/1/comments",
        json={
            "content": "부모 댓글"
        },
        headers=headers
    )

    parent_comment_id = parent_response.json[
        "data"
    ]["id"]

    # 대댓글 생성
    response = client.post(
        "/board/posts/1/comments",
        json={
            "content": "로그인 대댓글",
            "parent_comment_id": parent_comment_id
        },
        headers=headers
    )

    print(response.json)

    assert response.status_code == 201


def test_delete_comment_with_auth():

    app = setup_app()

    client = app.test_client()

    headers = get_auth_headers(
        client
    )

    # 삭제용 댓글 생성
    create_response = client.post(
        "/board/posts/1/comments",
        json={
            "content": "삭제 테스트 댓글"
        },
        headers=headers
    )

    comment_id = create_response.json[
        "data"
    ]["id"]

    # 댓글 삭제
    response = client.delete(
        f"/board/comments/{comment_id}",
        headers=headers
    )

    print(response.json)

    assert response.status_code == 200


def test_create_post_with_file_auth():

    app = setup_app()

    client = app.test_client()

    headers = get_auth_headers(
        client
    )

    data = {
        "title": "파일 테스트",
        "content": "첨부파일 포함",
        "board_type": "NOTICE",
        "file": (
            io.BytesIO(b"test file"),
            "test.pdf"
        )
    }

    response = client.post(
        "/board/posts",
        data=data,
        headers=headers,
        content_type="multipart/form-data"
    )

    assert response.status_code == 201


def test_download_attachment_with_auth():

    app = setup_app()

    client = app.test_client()

    headers = get_auth_headers(
        client
    )

    # =====================================
    # 먼저 파일 첨부 게시글 생성
    # =====================================
    data = {
        "title": "다운로드 테스트",
        "content": "파일 포함 게시글",
        "board_type": "NOTICE",
        "file": (
            io.BytesIO(b"download test"),
            "download.pdf"
        )
    }

    create_response = client.post(
        "/board/posts",
        data=data,
        headers=headers,
        content_type="multipart/form-data"
    )

    print(create_response.json)

    # =====================================
    # 생성된 게시글 id
    # =====================================
    post_id = create_response.json[
        "data"
    ]["post_id"]

    # =====================================
    # 첨부파일 조회
    # =====================================
    from app.models.board_models import (
        BoardAttachment
    )

    with app.app_context():

        attachment = BoardAttachment.query.filter_by(
            post_id=post_id
        ).first()

    # =====================================
    # 다운로드 요청
    # =====================================
    response = client.get(
        f"/board/attachments/{attachment.id}/download",
        headers=headers
    )

    print(response.status_code)

    assert response.status_code == 200