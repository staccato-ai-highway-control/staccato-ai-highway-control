# DB 객체 import
from app.extensions import db

# 게시글 모델 import
from app.models.board_models import BoardPost, BoardAttachment

# -----------------------
# 게시글 상세 조회 함수
# -----------------------
def detail_post(post_id):

    try:

        # 게시글 id로 조회
        post = BoardPost.query.get(post_id)

        # 게시글이 없는 경우
        if not post:

            return {
                "success": False,
                "message": "게시글이 존재하지 않습니다."
            }, 404

        # 삭제된 게시글 접근 방지
        if post.post_status == "DELETED":

            return {
                "success": False,
                "message": "삭제된 게시글입니다."
            }, 404

        # 조회수 증가
        post.view_count += 1

        # DB 반영
        db.session.commit()


        # 첨부파일 조회
        attachments = BoardAttachment.query.filter_by(
            post_id=post.id,
            deleted_at=None
        ).all()


        return {
            "success": True,
            "data": {
                "post": post.to_dict(),
                "attachments": [
                    attachment.to_dict()
                    for attachment in attachments
                ]
            }
        }, 200

    except Exception as e:

        db.session.rollback()

        print(f"[게시글 상세 조회 오류] {e}")

        return {
            "success": False,
            "message": "게시글 조회 실패"
        }, 500