"""board 도메인의 핵심 비즈니스 규칙과 데이터 처리를 구현한다.

권한 검증, 트랜잭션 경계, 외부 연동 및 응답 직렬화를 라우트와 분리해 관리한다."""

# DB 객체 import
from app.extensions import db

# 게시글 모델 import
from app.models.board_models import BoardPost

# -----------------------
# 게시글 상세 조회 함수
# -----------------------
def detail_post(post_id):

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:

        # 게시글 id로 조회
        post = BoardPost.query.get(post_id)

        # 게시글이 없는 경우
        if not post:

            # 설명: 호출자에게 ({'success': False, 'message': '게시글이 존재하지 않습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "message": "게시글이 존재하지 않습니다."
            }, 404

        # 삭제된 게시글 접근 방지
        if post.post_status == "DELETED":

            # 설명: 호출자에게 ({'success': False, 'message': '삭제된 게시글입니다.'}, 404) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "message": "삭제된 게시글입니다."
            }, 404

        # 조회수 증가
        post.view_count += 1

        # DB 반영
        db.session.commit()

        # 설명: 호출자에게 ({'success': True, 'data': post.to_dict()}, 200) 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "data": post.to_dict()
        }, 200

    except Exception as e:

        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()

        # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        print(f"[게시글 상세 조회 오류] {e}")

        # 설명: 호출자에게 ({'success': False, 'message': '게시글 조회 실패'}, 500) 값을 함수 결과로 반환한다.
        return {
            "success": False,
            "message": "게시글 조회 실패"
        }, 500
