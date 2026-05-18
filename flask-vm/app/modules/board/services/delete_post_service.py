# 현재 시간 import
from datetime import datetime

# DB 객체 import
from app.extensions import db

# 게시글 모델 import
from app.models.board_models import BoardPost

# -----------------------
# 게시글 삭제 함수
# -----------------------
def delete_post(post_id):

    try:

        # 삭제할 게시글 조회
        post = BoarPost.query.get(post_id)

        # 게시글이 없는 경우
        if not post:

            return {
                "success": False,
                "message": "게시글이 존재하지 않습니다."
            }, 404

        # 이미 삭제된 게시글인 경우
        if post.post_status == "deleted":

            return {
                "success": False,
                "message": "이미 삭제된 게시글입니다."
            }, 400

        # soft delete 처리(숨김 처리)
        # 실제 삭제 대신 상태 변경
        post.post_status = "deleted"

        # 삭제 시간 저장
        post.deleted_at = datetime.utcnow()

        # db에 변경 사항 저장
        db.session.commit()

        return {
            "success": True,
            "message": "게시글이 성공적으로 삭제되었습니다."
        }, 200

    except Exception as e:

        # 삭제 실패 시 롤백
        db.session.rollback()

        print(f"[게시글 삭제 오류] {e}")

        return {
            "success": False,
            "message": "게시글 삭제에 실패했습니다."
        }, 500