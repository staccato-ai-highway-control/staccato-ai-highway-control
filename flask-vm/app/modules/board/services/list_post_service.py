# -----------------------
# 게시글 목록 조회 함수
# -----------------------
def get_posts():

    try:
        # 삭제 되지 않은 게시글만 조회
        posts = BoarPost.query.filter(
            BoarPost.post_status != "deleted"
        ).order_by(

            # 최신순 정렬
            BoarPost.created_at.desc()

        ).all()

        #json 형태로 변환하여 반환
        post_list = [
            post.to_dict() for post in posts
        ]

        return {
            "success": True,
            "data": post_list
        }, 200

    except Exception as e:

        print(f"[게시글 목록 조회 오류] {e}")

        return {
            "success": False,
            "message": "게시글 목록 조회에 실패했습니다."
        }, 500