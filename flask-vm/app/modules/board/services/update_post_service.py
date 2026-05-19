# 현재 시간 import
from datetime import datetime

# DB 객체 import
from app.extensions import db

# 게시글 모델 import
from app.models.board_models import BoardPost, BoardAttachment

# -----------------------
# 게시글 수정 함수
# -----------------------
def update_post(post_id, data, file):
    try:

        # 수정할 게시글 조회
        post = BoardPost.query.get(post_id)

        # 게시글이 없는 경우
        if not post:

            return {
                "success": False,
                "message": "게시글이 존재하지 않습니다."
            }, 404

        # 삭제된 게시글 수정 방지
        if post.post_status == "deleted":

            return {
                "success": False,
                "message": "삭제된 게시글입니다."
            }, 400

        
        # 게시글 제목 수정
        # 값이 없으면 기존값 유지
        post.title = data.get(
            "title", 
            post.title
        )

        # 내용 수정
        post.content = data.get(
            "content",
            post.content
        )

        # 게시판 종류 수정
        post.board_type = data.get(
            "board_type",
            post.board_type
        )

        # 상단 고정 여부 수정
        post.is_pinned = int(
            data.get(
                "is_pinned",
                post.is_pinned
            )
        )

        # 수정 시간 저장
        post.updated_at = datetime.utcnow()


        # =====================================
        # 삭제할 첨부파일 id 목록 받기
        #
        # 예:
        # "1,3,5"
        # =====================================
        delete_attachment_ids = data.get(
            "delete_attachment_ids"
        )

        # =====================================
        # 기존 첨부파일 삭제 처리
        #
        # delete_attachment_ids 값이 존재하는 경우:
        # - attachment id 리스트로 변환
        # - 현재 게시글(post.id)의 첨부파일만 조회
        # - soft delete 처리
        # =====================================
        if delete_attachment_ids:

            # 문자열 → 리스트 변환
            delete_ids = [
                int(id)
                for id in delete_attachment_ids.split(",")
            ]

            # 삭제 대상 첨부파일 조회
            attachments = BoardAttachment.query.filter(
                BoardAttachment.id.in_(delete_ids),
                BoardAttachment.post_id == post.id,
                BoardAttachment.deleted_at.is_(None)
            ).all()

            # 첨부파일 soft delete 처리
            for attachment in attachments:

                attachment.deleted_at = datetime.utcnow()

        # =====================================
        # 새 첨부파일 추가 처리
        #
        # 수정 요청에 새 파일(file)이 포함된 경우:
        # - BoardAttachment 생성
        # - 게시글(post.id) 연결
        # =====================================

        if file:

            attachment = BoardAttachment(

                # 게시글 id 연결
                post_id=post.id,

                # 업로드 사용자 id
                uploaded_by=post.author_id,

                # 원본 파일명
                original_filename=file.filename,

                # 저장 파일명
                stored_filename=file.filename,

                # 파일 저장 경로
                file_path=f"/uploads/{file.filename}",

                # MIME 타입
                mime_type=file.content_type,

                # 파일 크기
                file_size=0,

                # 다운로드 수 초기값
                download_count=0,

                # 생성 시간
                created_at=datetime.utcnow()
            )

            # DB 저장
            db.session.add(
                attachment
            )


        # db에 변경 사항 저장
        db.session.commit()

        return {
            "success": True,
            "message": "게시글이 성공적으로 수정되었습니다.",
            "data": post.to_dict()
        }, 200

    except Exception as e:
        
        # 수정 실패 시 롤백
        db.session.rollback()

        print(f"[게시글 수정 오류] {e}")

        return {
            "success": False,
            "message": "게시글 수정에 실패했습니다."
        }, 500