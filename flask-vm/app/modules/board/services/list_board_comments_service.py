# 게시글 / 댓글 모델 import
from app.models.board_models import (
    BoardPost,
    BoardComment
)

DELETED_STATUS = "DELETED"


# -----------------------
# 댓글 목록 조회 함수
# -----------------------
def list_board_comments(post_id):

    try:

        # =====================================
        # 게시글 조회
        # =====================================
        post = BoardPost.query.get(
            post_id
        )

        # 게시글 없는 경우
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
        # 일반 댓글 조회
        #
        # 조건:
        # - parent_comment_id == None
        # - 최신순 정렬
        # =====================================
        comments = BoardComment.query.filter(
            BoardComment.post_id == post.id,
            BoardComment.parent_comment_id.is_(None)
        ).order_by(
            BoardComment.created_at.desc()
        ).all()

        result = []

        # =====================================
        # 댓글 + 대댓글 구조 생성
        # =====================================
        for comment in comments:

            # 대댓글 조회
            replies = BoardComment.query.filter(
                BoardComment.parent_comment_id == comment.id
            ).order_by(

                # 대댓글은 오래된 순 추천
                BoardComment.created_at.asc()

            ).all()

            # 댓글 데이터
            comment_data = comment.to_dict()

            # replies 추가
            comment_data["replies"] = [
                reply.to_dict()
                for reply in replies
            ]

            result.append(
                comment_data
            )

        return {
            "success": True,
            "data": result
        }, 200

    except Exception as e:

        print(f"[댓글 목록 조회 오류] {e}")

        return {
            "success": False,
            "message": "댓글 목록 조회 실패"
        }, 500