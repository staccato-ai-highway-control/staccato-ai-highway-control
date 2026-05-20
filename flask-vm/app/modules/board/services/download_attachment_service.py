import os

# 파일 응답 함수
from flask import send_file

# DB import
from app.extensions import db

# 첨부파일 모델
from app.models.board_models import BoardAttachment


DELETED_STATUS = "DELETED"


# -----------------------
# 파일 다운로드 함수
# -----------------------
def download_attachment(
    attachment_id
):

    try:

        # =====================================
        # 파일 조회
        # =====================================
        attachment = BoardAttachment.query.get(
            attachment_id
        )

        # 파일 없는 경우
        if not attachment:

            return {
                "success": False,
                "message": "파일이 존재하지 않습니다."
            }, 404

        # 삭제된 파일인 경우
        if attachment.deleted_at:

            return {
                "success": False,
                "message": "삭제된 파일입니다."
            }, 400

        # =====================================
        # 다운로드 수 증가
        # =====================================
        attachment.download_count += 1

        db.session.commit()

        # =====================================
        # 파일 다운로드 응답
        # =====================================
        # 절대 경로 변환
        absolute_path = os.path.abspath(
            attachment.file_path
        )

        # 파일 다운로드 응답
        return send_file(

            absolute_path,

            as_attachment=True,

            download_name=attachment.original_filename
        )

    except Exception as e:

        print(f"[파일 다운로드 오류] {e}")

        return {
            "success": False,
            "message": "파일 다운로드 실패"
        }, 500