# 현재 시간 import
from datetime import datetime

# DB 객체 import
from app.extensions import db

# 게시글 / 댓글 모델 import
from app.models.board_models import (
    BoardPost,
    BoardComment
)

# 상태값 상수
ACTIVE_STATUS = "ACTIVE"
DELETED_STATUS = "DELETED"


# -----------------------
# 댓글 생성 함수
# -----------------------
def create_board_comment(
    post_id,
    data,
    current_user
):

    try:

        # =====================================
        # 요청 데이터 예외 처리
        # =====================================
        if data is None:

            data = {}

        # =====================================
        # 게시글 조회
        # =====================================
        post = BoardPost.query.get(
            post_id
        )

        # 게시글이 없는 경우
        if not post:

            return {
                "success": False,
                "message": "게시글이 존재하지 않습니다."
            }, 404

        # 삭제된 게시글인 경우
        if post.post_status == DELETED_STATUS:

            return {
                "success": False,
                "message": "삭제된 게시글입니다."
            }, 400

        # =====================================
        # 댓글 내용 조회
        # =====================================
        content = data.get(
            "content",
            ""
        ).strip()

        # 댓글 내용 검증
        if not content:

            return {
                "success": False,
                "message": "댓글 내용을 입력해주세요."
            }, 400

        # =====================================
        # 부모 댓글 id 조회
        #
        # NULL:
        # 일반 댓글
        #
        # 값 존재:
        # 대댓글
        # =====================================
        parent_comment_id = data.get(
            "parent_comment_id"
        )

        # =====================================
        # 대댓글 검증
        # =====================================
        if parent_comment_id:

            # 원본 댓글 조회
            parent_comment = BoardComment.query.get(
                parent_comment_id
            )

            # 원본 댓글이 없는 경우
            if not parent_comment:

                return {
                    "success": False,
                    "message": "원본 댓글을 찾을 수 없습니다."
                }, 404

            # 삭제된 댓글인 경우
            if parent_comment.comment_status == DELETED_STATUS:

                return {
                    "success": False,
                    "message": "삭제된 댓글에는 답글을 작성할 수 없습니다."
                }, 400

        # =====================================
        # 댓글 생성
        # =====================================
        comment = BoardComment(

            # 게시글 id
            post_id=post.id,

            # 원본 댓글 id
            parent_comment_id=parent_comment_id,

            # 작성자 id
            author_id=current_user.id,

            # 댓글 내용
            content=content,

            # 댓글 상태
            comment_status=ACTIVE_STATUS,

            # 생성 시간
            created_at=datetime.utcnow()
        )

        # DB 저장
        db.session.add(
            comment
        )

        # commit
        db.session.commit()

        return {
            "success": True,
            "message": "댓글이 성공적으로 작성되었습니다.",
            "data": comment.to_dict()
        }, 201

    except Exception as e:

        # rollback
        db.session.rollback()

        print(f"[댓글 생성 오류] {e}")

        return {
            "success": False,
            "message": "댓글 작성에 실패했습니다."
        }, 500