"""board 도메인의 핵심 비즈니스 규칙과 데이터 처리를 구현한다.

권한 검증, 트랜잭션 경계, 외부 연동 및 응답 직렬화를 라우트와 분리해 관리한다."""

# 게시글 모델 import
from app.models.board_models import BoardPost
# 설명: sqlalchemy에서 or_ 이름을 가져와 아래 로직에서 재사용한다.
from sqlalchemy import or_

# -----------------------
# 게시글 목록 조회 함수
#
# 기능:
# - 키워드 검색
# - 카테고리 필터
# - 페이징 처리
# -----------------------
def list_posts(
    keyword,
    board_type,
    author_id,
    start_date,
    end_date,
    page,
    size
):

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:

        # ---------------------------
        # 기본 Query 생성
        #
        # 삭제되지 않은 게시글만 조회
        # ---------------------------
        query = BoardPost.query.filter(
            BoardPost.post_status != "DELETED"
        )

        # ---------------------------
        # 키워드 검색
        #
        # 제목 or 내용 검색
        # ---------------------------
        if keyword:

            # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
            query = query.filter(
                or_(

                    # 제목 LIKE 검색
                    BoardPost.title.ilike(
                        f"%{keyword}%"
                    ),

                    # 내용 LIKE 검색
                    BoardPost.content.ilike(
                        f"%{keyword}%"
                    )
                )
            )

        # ----------------------------
        # 카테고리(board_type) 검색
        # ----------------------------
        if board_type:

            # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
            query = query.filter(
                BoardPost.board_type == board_type
            )


        # =====================================
        # 작성자(author_id) 검색
        # =====================================
        if author_id:

            # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
            query = query.filter(
                BoardPost.author_id == author_id
            )


        # =====================================
        # 시작 날짜 검색
        #
        # 해당 날짜 이후 게시글 조회
        # =====================================
        if start_date:

            # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
            query = query.filter(
                BoardPost.created_at >= start_date
            )

        # =====================================
        # 종료 날짜 검색
        #
        # 해당 날짜 이전 게시글 조회
        # =====================================
        if end_date:

            # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
            query = query.filter(
                BoardPost.created_at <= end_date
            )

        # ----------------------------
        # 최신순 정렬
        # ----------------------------
        query = query.order_by(
            BoardPost.created_at.desc()
        )

        # -----------------------------------
        # pagination 처리
        #
        # page:
        # 현재 페이지 번호
        #
        # per_page:
        # 페이지당 게시글 개수
        # ------------------------------------
        pagination = query.paginate(
            page=page,
            per_page=size,
            error_out=False
        )

        # 현재 페이지 게시글 목록
        posts = pagination.items


        # json 형태로 변환하여 반환
        post_list = [
            post.to_dict() for post in posts
        ]

        # 설명: 호출자에게 ({'success': True, 'data': post_list}, 200) 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "data": post_list
        }, 200

    except Exception as e:

        # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        print(f"[게시글 목록 조회 오류] {e}")

        # 설명: 호출자에게 ({'success': False, 'message': '게시글 목록 조회에 실패했습니다.'}, 500) 값을 함수 결과로 반환한다.
        return {
            "success": False,
            "message": "게시글 목록 조회에 실패했습니다."
        }, 500
