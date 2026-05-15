# =========================================
# 게시판 API 라우터 파일
#
# 역할:
# - API 주소(URL) 관리
# - 프론트 요청(Request) 받기
# - 서비스 함수 호출
# - JSON 응답(Response) 반환
# =========================================
# flask 기능 import
from flask import Blueprint, request, jsonify

# 게시글 생성 서비스 import
from app.modules.board.services.create_post_service import create_board_post

# 게시글 목록 조회 서비스 import
from app,modules.board.services.list_posts_service import list_posts

# 게시글 상세 조회 서비스 import
from app.modules.board.services.detail_post_service import detail_post

# 게시글 수정 서비스 import
from app.modules.board.services.update_post_service import update_post

# 게시글 삭제 서비스 import
from app.modules.board.services.delete_post_service import delete_post

# =========================================
# Blueprint 생성
#
# "board"
# → Blueprint 이름
#
# url_prefix="/board"
# → 모든 API 주소 앞에 /board 자동 추가
#
# 예:
# "/posts"
# →
# 실제 주소:
# "/board/posts"
# =========================================
board_bp = Blueprint(
    "board", 
    __name__, 
    url_prefix="/board"
)


# =========================================
# 게시글 생성 API
#
# POST /board/posts
#
# 프론트에서 게시글 작성 요청 시 실행
# =========================================
@board_bp.route("/posts", methods=["POST"])
def create():
   
   try:

        # 프론트에서 보낸 JSON 데이터 받기
        #
        # 예:
        # {
        #   "title": "공지사항",
        #   "content": "내용"
        # }
        data = request.json

        # 게시글 생성 서비스 실행
        result, status_code = create_board_post(data)

        # JSON 응답 반환
        return jsonify(result), status_code

    except Exception as e:

        # 서버 로그 출력
        print(f"[게시글 생성 API 오류] {e}")

        return jsonify({
            "success": False,
            "message": "서버 오류 발생"
        }), 500

# =========================================
# 게시글 목록 조회 API
#
# GET /board/posts
# =========================================
@board_bp.route("/posts", methods=["GET"])
def get_posts_list():

    try:

        # 게시글 목록 조회 서비스 실행
        result, status_code = list_posts()

        # JSON 응답 반환
        return jsonify(result), status_code

    except Exception as e:

        # 서버 로그 출력
        print(f"[게시글 목록 조회 API 오류] {e}")

        return jsonify({
            "success": False,
            "message": "서버 오류 발생"
        }), 500

# =========================================
# 게시글 상세 조회 API
#
# GET /board/posts/1
# =========================================
@board_bp.route("/posts/<int:post_id>", methods=["GET"])
def get_post_detail(post_id):

    try:

        # 게시글 상세 조회 서비스 실행
        result, status_code = detail_post(post_id)

        # JSON 응답 반환
        return jsonify(result), status_code

    except Exception as e:

        # 서버 로그 출력
        print(f"[게시글 상세 조회 API 오류] {e}")

        return jsonify({
            "success": False,
            "message": "서버 오류 발생"
        }), 500

# =========================================
# 게시글 수정 API
#
# PUT /board/posts/1
# =========================================
@board_bp.route("/posts/<int:post_id>", methods=["PUT"])
def update(post_id):

    try:

        # 프론트에서 수정 데이터 받기
        data = request.json

        # 게시글 수정 서비스 실행
        result, status_code = update_post(
            post_id, 
            data
        )

        # JSON 응답 반환
        return jsonify(result), status_code

    except Exception as e:

        # 서버 로그 출력
        print(f"[게시글 수정 API 오류] {e}")

        return jsonify({
            "success": False,
            "message": "서버 오류 발생"
        }), 500

# =========================================
# 게시글 삭제 API
#
# DELETE /board/posts/1
# =========================================
@board_bp.route("/posts/<int:post_id>", methods=["DELETE"])
def delete(post_id):
    
    try:

        # 게시글 삭제 서비스 실행
        result, status_code = delete_post(post_id)

        # JSON 응답 반환
        return jsonify(result), status_code

    except Exception as e:

        # 서버 로그 출력
        print(f"[게시글 삭제 API 오류] {e}")

        return jsonify({
            "success": False,
            "message": "서버 오류 발생"
        }), 500