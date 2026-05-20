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


def test_create_comment_with_auth():

    app = setup_app()

    client = app.test_client()

    # 로그인 요청
    login_response = client.post(
        "/auth/login",
        json={
            "email": "superadmin",
            "password": "Staccato2AI#"
        }
    )

    print(login_response.json)

    # 토큰 추출
    token = login_response.json[
        "access_token"
    ]

    # 인증 헤더
    headers = {
        "Authorization": f"Bearer {token}"
    }

    # 댓글 생성 테스트
    response = client.post(
        "/board/posts/1/comments",
        json={
            "content": "테스트 댓글"
        },
        headers=headers
    )

    assert response.status_code == 201