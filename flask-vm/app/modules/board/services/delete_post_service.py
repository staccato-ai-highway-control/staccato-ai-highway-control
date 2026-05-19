# 현재 시간 import
from datetime import datetime

# DB 객체 import
from app.extensions import db

# 게시글 모델 import
from app.models.board_models import (
    BoardPost,
    BoardAttachment
)

DELETED_STATUS = "DELETED"
SUPER_ADMIN_ROLE = "SUPER_ADMIN"


# -----------------------
# 게시글 삭제 함수
# -----------------------
def delete_post(post_id, current_user):

    try:

        # 삭제할 게시글 조회
        post = BoardPost.query.get(post_id)

        # 게시글이 없는 경우
        if not post:

            return {
                "success": False,
                "message": "게시글이 존재하지 않습니다."
            }, 404

        # 이미 삭제된 게시글인 경우
        if post.post_status == DELETED_STATUS:

            return {
                "success": False,
                "message": "이미 삭제된 게시글입니다."
            }, 400

        current_user_id = current_user.id
        current_user_role = current_user.role

        # 작성자 또는 SUPER_ADMIN만 삭제 가능
        if (
            post.author_id != current_user_id
            and
            current_user_role != SUPER_ADMIN_ROLE
        ):

            return {
                "success": False,
                "message": "게시글 삭제 권한이 없습니다."
            }, 403