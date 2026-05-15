# 현재 시간 저장용 import
# 게시글 생성 시간 / 수정 시간 저장할 때 사용
from datetime import datetime

# db 객체 import
# commit(), rollback() 등에 사용
from app.extensions import db

# 게시판 모델 import
from app.modules.board.models import BoarPost


# -----------------------
# 게시글 생성 함수
# -----------------------
def create_board_post(data):

    # try:
    # 예외(에러) 발생 가능성이 있는 코드 실행
    try:


        # 새로운 게시글 객체 생성
        post = BoarPost(

            # 게시판 종류
            # 예: 공지/ 메뉴얼/ 정책
            board_type=data.get('board_type'),

            # 게시글 제목
            title=data.get('title'),

            # 게시글 내용
            content=data.get('content'),

            # 작성자 id
            author_id=data.get('author_id'),

            # 게시글 상태
            # 기본 active 상태
            post_status="active",

            # 상단 고정 여부
            # 값 없으면 기본 0
            is_pinned=data.get('is_pinned', 0),

            # 초기 조회수
            view_count=0,

            # 생성 시간 저장
            created_at=datetime.utcnow()
        )

        # db 저장 대기 상태로 추가
        db.session.add(post)

        # 실제 db에 저장
        db.session.commit()

        # 성공 결과 반환
        return {
            "success": True,
            "message": "게시글이 성공적으로 생성되었습니다.",
            "data": post.to_dict()
        }, 201

    # except:
    # 에러 발생 시 실행
    except Exception as e:

        # db 작업 실패 시 롤백하여 이전 상태로 복구
        # db 꼬임 방지
        db.session.rollback()

        # 서버 로그 출력
        print(f"[게시글 생성 오류] {e}")

        # 실패 응답 반환
        return {
            "success": False,
            "message": "게시글 생성에 실패했습니다."
        }, 500