"""board 도메인의 핵심 비즈니스 규칙과 데이터 처리를 구현한다.

권한 검증, 트랜잭션 경계, 외부 연동 및 응답 직렬화를 라우트와 분리해 관리한다."""

# 현재 시간 import
from datetime import datetime

# DB 객체 import
from app.extensions import db

# 게시글 모델 import
from app.models.board_models import BoardPost


# 설명: `DELETED_STATUS`의 기준값 또는 기본값을 'DELETED'로 설정한다.
DELETED_STATUS = "DELETED"
# 설명: `SUPER_ADMIN_ROLE`의 기준값 또는 기본값을 'SUPER_ADMIN'로 설정한다.
SUPER_ADMIN_ROLE = "SUPER_ADMIN"


# -----------------------
# 게시글 삭제 함수
# -----------------------
def delete_post(post_id, current_user):

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:

        # 삭제할 게시글 조회
        post = BoardPost.query.get(post_id)

        # 게시글이 없는 경우
        if not post:

            # 설명: 호출자에게 ({'success': False, 'message': '게시글이 존재하지 않습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "message": "게시글이 존재하지 않습니다."
            }, 404

        # 이미 삭제된 게시글인 경우
        if post.post_status == DELETED_STATUS:

            # 설명: 호출자에게 ({'success': False, 'message': '이미 삭제된 게시글입니다.'}, 400) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "message": "이미 삭제된 게시글입니다."
            }, 400

        # 설명: `current_user_id`에 current_user.id 표현식의 계산 결과를 저장한다.
        current_user_id = current_user.id
        # 설명: `current_user_role`에 current_user.role 표현식의 계산 결과를 저장한다.
        current_user_role = current_user.role

        # 작성자 또는 SUPER_ADMIN만 삭제 가능
        if post.author_id != current_user_id and current_user_role != SUPER_ADMIN_ROLE:

            # 설명: 호출자에게 ({'success': False, 'message': '게시글 삭제 권한이 없습니다.'}, 403) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "message": "게시글 삭제 권한이 없습니다."
            }, 403

        # soft delete 처리(숨김 처리)
        # 실제 삭제 대신 상태 변경
        post.post_status = DELETED_STATUS

        # 삭제 시간 저장
        post.deleted_at = datetime.utcnow()

        # db에 변경 사항 저장
        db.session.commit()

        # 설명: 호출자에게 ({'success': True, 'message': '게시글이 성공적으로 삭제되었습니다.'}, 200) 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "message": "게시글이 성공적으로 삭제되었습니다."
        }, 200

    except Exception as e:

        # 삭제 실패 시 롤백
        db.session.rollback()

        # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        print(f"[게시글 삭제 오류] {e}")

        # 설명: 호출자에게 ({'success': False, 'message': '게시글 삭제에 실패했습니다.'}, 500) 값을 함수 결과로 반환한다.
        return {
            "success": False,
            "message": "게시글 삭제에 실패했습니다."
        }, 500
