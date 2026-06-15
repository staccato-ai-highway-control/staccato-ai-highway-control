"""board 도메인의 핵심 비즈니스 규칙과 데이터 처리를 구현한다.

권한 검증, 트랜잭션 경계, 외부 연동 및 응답 직렬화를 라우트와 분리해 관리한다."""

# =========================================
# UUID
#
# 파일명 중복 방지용
# =========================================
import uuid

# =========================================
# OS
#
# 파일 경로 처리용
# =========================================
import os

# 설명: flask에서 current_app 이름을 가져와 아래 로직에서 재사용한다.
from flask import current_app

# =========================================
# datetime
#
# 생성 시간 저장용
# =========================================
from datetime import datetime

# =========================================
# secure_filename
#
# 안전한 파일명 처리용
# =========================================
from werkzeug.utils import secure_filename

# =========================================
# DB import
# =========================================
from app.extensions import db

# =========================================
# 게시글 / 첨부파일 모델 import
# =========================================
from app.models.board_models import (
    BoardPost,
    BoardAttachment
)

# =========================================
# 허용 파일 확장자
#
# 실행 파일 업로드 방지 목적
# =========================================
ALLOWED_EXTENSIONS = {
    "pdf",
    "png",
    "jpg",
    "jpeg"
}


# =========================================
# 파일 확장자 검사 함수
#
# 허용된 확장자인지 확인
# =========================================
def allowed_file(filename):

    # 설명: 호출자에게 '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS 값을 함수 결과로 반환한다.
    return (

        # 파일명에 . 존재 여부 확인
        "." in filename

        and

        # 확장자 추출 후 허용 목록 검사
        filename.rsplit(".", 1)[1].lower()

        in ALLOWED_EXTENSIONS
    )


# =========================================
# 게시글 생성 서비스
#
# 기능:
# - 게시글 생성
# - 첨부파일 업로드
# - 상단 고정 처리
# =========================================
def create_board_post(request):

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:

        # =====================================
        # form-data 데이터 받기
        # =====================================

        # 게시판 종류
        #
        # 예:
        # NOTICE
        # POLICY
        # MANUAL
        board_type = request.form.get(
            "board_type"
        )

        # 게시글 제목
        title = request.form.get(
            "title"
        )

        # 게시글 내용
        content = request.form.get(
            "content"
        )

        # =====================================
        # 상단 고정 여부
        #
        # 0 = 일반 게시글
        # 1 = 상단 고정 게시글
        # =====================================
        is_pinned = request.form.get(
            "is_pinned",
            default=0,
            type=int
        )

        # =====================================
        # 첨부파일 받기
        #
        # key 이름: file
        # =====================================
        file = request.files.get(
            "file"
        )


        # =====================================
        # 현재 로그인 사용자
        # =====================================
        current_user = request.current_user

        # 로그인 사용자 ID
        current_user_id = current_user.id

        # 로그인 사용자 이름
        current_user_name = current_user.name

        # 로그인 사용자 권한
        current_user_role = current_user.role


        # =====================================
        # 필수값 검증
        # =====================================
        if not title or not content:

            # 설명: 호출자에게 ({'success': False, 'message': '제목과 내용을 입력해주세요.'}, 400) 값을 함수 결과로 반환한다.
            return {

                "success": False,

                "message": "제목과 내용을 입력해주세요."

            }, 400

        # =====================================
        # 상단 고정 권한 검사
        #
        # SUPER_ADMIN만 가능
        # =====================================
        if is_pinned == 1:

            # 최고 관리자가 아닌 경우
            if current_user_role != "SUPER_ADMIN":

                # 설명: 호출자에게 ({'success': False, 'message': '상단 고정 권한이 없습니다.'}, 403) 값을 함수 결과로 반환한다.
                return {

                    "success": False,

                    "message": "상단 고정 권한이 없습니다."

                }, 403

        # =====================================
        # 게시글 생성
        # =====================================
        post = BoardPost(

            # 게시판 종류
            board_type=board_type,

            # 제목
            title=title,

            # 내용
            content=content,

            # 작성자 ID
            author_id=current_user_id,

            # 게시글 상태
            post_status="ACTIVE",

            # 상단 고정 여부
            is_pinned=is_pinned,

            # 조회수 기본값
            view_count=0,

            # 생성 시간
            created_at=datetime.utcnow()
        )

        # =====================================
        # DB session 추가
        # =====================================
        db.session.add(post)

        # =====================================
        # INSERT 먼저 실행
        #
        # post.id 생성 목적
        # =====================================
        db.session.flush()

        # =====================================
        # 첨부파일 처리
        # =====================================
        if file:

            # =================================
            # 파일명 없는 경우
            # =================================
            if file.filename == "":

                # 설명: 호출자에게 ({'success': False, 'message': '파일명이 없습니다.'}, 400) 값을 함수 결과로 반환한다.
                return {

                    "success": False,

                    "message": "파일명이 없습니다."

                }, 400

            # =================================
            # 파일 확장자 검사
            # =================================
            if not allowed_file(file.filename):

                # 설명: 호출자에게 ({'success': False, 'message': '허용되지 않은 파일 형식입니다.'}, 400) 값을 함수 결과로 반환한다.
                return {

                    "success": False,

                    "message": "허용되지 않은 파일 형식입니다."

                }, 400

            # =================================
            # 원본 파일명 보안 처리
            # =================================
            original_filename = secure_filename(
                file.filename
            )

            # =================================
            # 파일 확장자 추출
            # =================================
            extension = original_filename.split(".")[-1]

            # =================================
            # UUID 기반 저장 파일명 생성
            #
            # 파일명 중복 방지 목적
            # =================================
            stored_filename = (
                f"{uuid.uuid4()}.{extension}"
            )

            # =================================
            # 업로드 폴더 경로
            #
            # 팀 공통 규칙 적용
            # =================================
            upload_folder = current_app.config.get(
                "BOARD_UPLOAD_FOLDER",
                "storage/uploads/board"
            )

            # 설명: `os.makedirs`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            os.makedirs(upload_folder, exist_ok=True)

            # =================================
            # 최종 저장 경로 생성
            # =================================
            file_path = os.path.join(
                upload_folder,
                stored_filename
            )

            # =================================
            # 파일 저장
            # =================================
            file.save(file_path)

            # =================================
            # 첨부파일 DB 저장
            # =================================
            attachment = BoardAttachment(

                # 연결 게시글 ID
                post_id=post.id,

                # 업로드 사용자 ID
                uploaded_by=current_user_id,

                # 원본 파일명
                original_filename=original_filename,

                # 저장 파일명
                stored_filename=stored_filename,

                # 저장 경로
                file_path=file_path,

                # 파일 크기
                #
                # 추후 확장 가능
                file_size=0,

                # MIME TYPE
                mime_type=file.mimetype,

                # 다운로드 수
                download_count=0,

                # 생성 시간
                created_at=datetime.utcnow()
            )

            # DB session 추가
            db.session.add(attachment)

        # =====================================
        # 최종 commit
        # =====================================
        db.session.commit()

        # =====================================
        # 성공 응답 반환
        # =====================================
        return {

            "success": True,

            "message": "게시글 생성 성공",

            "data": {

                # 게시글 ID
                "post_id": post.id,

                # 작성자 이름
                "author_name": current_user_name,

                # 상단 고정 여부
                "is_pinned": post.is_pinned
            }

        }, 201

    except Exception as e:

        # =====================================
        # 오류 발생 시 rollback
        # =====================================
        db.session.rollback()

        # 서버 로그 출력
        print(f"[게시글 생성 오류] {e}")

        # 실패 응답 반환
        return {

            "success": False,

            "message": "게시글 생성 실패"

        }, 500
