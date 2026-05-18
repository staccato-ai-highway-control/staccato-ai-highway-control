# 현재 시간 import
from datetime import datetime

# DB 객체 import
from app.extensions import db

# 게시글 모델 import
from app.models.board_models import BoardPost

# -----------------------
# 게시글 수정 함수
# -----------------------
def update_post(post_id, data):

    try:

        # 수정할 게시글 조회
        post = BoardPost.query.get(post_id)

        # 게시글이 없는 경우
        if not post:

            return {
                "success": False,
                "message": "게시글이 존재하지 않습니다."
            }, 404

        # 삭제된 게시글 수정 방지
        if post.post_status == "deleted":

            return {
                "success": False,
                "message": "삭제된 게시글입니다."
            }, 400


        # 게시글 제목 수정
        # 값이 없으면 기존값 유지
        post.title = data.get(
            "title",
            post.title
        )

        # 내용 수정
        post.content = data.get(
            "content",
            post.content
        )

        # 게시판 종류 수정
        post.board_type = data.get(
            "board_type",
            post.board_type
        )

        # 상단 고정 여부 수정
        post.is_pinned = data.get(
            "is_pinned",
            post.is_pinned
        )

        # 수정 시간 저장
        post.updated_at = datetime.utcnow()

        # db에 변경 사항 저장
        db.session.commit()

        return {
            "success": True,
            "message": "게시글이 성공적으로 수정되었습니다.",
            "data": post.to_dict()
        }, 200

    except Exception as e:

        # 수정 실패 시 롤백
        db.session.rollback()

        print(f"[게시글 수정 오류] {e}")

        return {
            "success": False,
            "message": "게시글 수정에 실패했습니다."
        }, 500
