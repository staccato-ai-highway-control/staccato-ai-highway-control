# 현재 시간 import
from datetime import datetime

# DB import
from app.extensions import db

# 댓글 모델 import
from app.models.board_models import BoardComment


DELETED_STATUS = "DELETED"
SUPER_ADMIN_ROLE = "SUPER_ADMIN"


# -----------------------
# 댓글 삭제 함수
# -----------------------
def delete_board_comment(
    comment_id,
    current_user
):

    try:

        # =====================================
        # 댓글 조회
        # =====================================
        comment = BoardComment.query.get(
            comment_id
        )

        # 댓글 없는 경우
        if not comment:

            return {
                "success": False,
                "message": "댓글이 존재하지 않습니다."
            }, 404

        # 이미 삭제된 댓글인 경우
        if comment.comment_status == DELETED_STATUS:

            return {
                "success": False,
                "message": "이미 삭제된 댓글입니다."
            }, 400

        current_user_id = current_user.id
        current_user_role = current_user.role

        # =====================================
        # 권한 체크
        #
        # 작성자 또는 SUPER_ADMIN만 가능
        # =====================================
        if (
            comment.author_id != current_user_id
            and
            current_user_role != SUPER_ADMIN_ROLE
        ):

            return {
                "success": False,
                "message": "댓글 삭제 권한이 없습니다."
            }, 403

        # =====================================
        # soft delete 처리
        # =====================================
        comment.comment_status = DELETED_STATUS

        # 삭제 안내 문구
        comment.content = "삭제된 댓글입니다."

        # 삭제 시간 저장
        comment.deleted_at = datetime.utcnow()

        # DB 반영
        db.session.commit()

        return {
            "success": True,
            "message": "댓글이 삭제되었습니다."
        }, 200

    except Exception as e:

        # rollback
        db.session.rollback()

        print(f"[댓글 삭제 오류] {e}")

        return {
            "success": False,
            "message": "댓글 삭제에 실패했습니다."
        }, 500