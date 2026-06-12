"""report upload 도메인의 HTTP API 엔드포인트를 정의한다.

요청 인증과 입력 변환을 수행한 뒤 서비스 결과를 안정적인 JSON 응답으로 전달한다."""

# 설명: logging 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import logging

# 설명: flask에서 Blueprint, jsonify, request 이름을 가져와 아래 로직에서 재사용한다.
from flask import Blueprint, jsonify, request

# 설명: app.modules.report_upload.service에서 ReportUploadService 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.report_upload.service import ReportUploadService
# 설명: app.utils.security에서 require_auth 이름을 가져와 아래 로직에서 재사용한다.
from app.utils.security import require_auth


# 설명: `logger`에 `logging.getLogger` 호출 결과를 저장해 다음 처리에서 사용한다.
logger = logging.getLogger(__name__)

# 설명: `report_upload_bp`에 `Blueprint` 호출 결과를 저장해 다음 처리에서 사용한다.
report_upload_bp = Blueprint("report_upload", __name__, url_prefix="/api/reports")


# 설명: `health` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@report_upload_bp.route("/health", methods=["GET"])
def health():
    # 설명: 호출자에게 ({'status': 'report upload module ok'}, 200) 값을 함수 결과로 반환한다.
    return {"status": "report upload module ok"}, 200


# 설명: `list_reports` 함수는 조건에 맞는 목록을 조회하는 함수다.
@report_upload_bp.route("", methods=["GET"])
@require_auth
def list_reports():
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `(result, status_code)`에 `ReportUploadService.list_reports` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.list_reports(
            request.args,
            current_user=request.current_user,
        )
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code

    except ValueError as e:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': str(e)}), 400) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": str(e)}), 400

    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("리포트 목록 조회 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `list_my_reports` 함수는 조건에 맞는 목록을 조회하는 함수다.
@report_upload_bp.route("/my", methods=["GET"])
@require_auth
def list_my_reports():
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `(result, status_code)`에 `ReportUploadService.list_reports` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.list_reports(
            request.args,
            current_user=request.current_user,
            mine_only=True,
        )
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code

    except ValueError as e:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': str(e)}), 400) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": str(e)}), 400

    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("내 리포트 목록 조회 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500



# 설명: `preview_report_attachment` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@report_upload_bp.route("/attachments/<int:attachment_id>/preview", methods=["GET"])
@require_auth
def preview_report_attachment(attachment_id):
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `(result, status_code)`에 `ReportUploadService.get_attachment_file` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.get_attachment_file(
            attachment_id=attachment_id,
            current_user=request.current_user,
            as_download=False,
        )

        # 설명: `status_code == 200` 조건 결과에 따라 실행 경로를 분기한다.
        if status_code == 200:
            # 설명: 호출자에게 result 값을 함수 결과로 반환한다.
            return result

        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code
    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("리포트 첨부파일 미리보기 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `download_report_attachment` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@report_upload_bp.route("/attachments/<int:attachment_id>/download", methods=["GET"])
@require_auth
def download_report_attachment(attachment_id):
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `(result, status_code)`에 `ReportUploadService.get_attachment_file` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.get_attachment_file(
            attachment_id=attachment_id,
            current_user=request.current_user,
            as_download=True,
        )

        # 설명: `status_code == 200` 조건 결과에 따라 실행 경로를 분기한다.
        if status_code == 200:
            # 설명: 호출자에게 result 값을 함수 결과로 반환한다.
            return result

        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code
    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("리포트 첨부파일 다운로드 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `create_report_draft` 함수는 새 임시저장 신고를 생성하는 함수다.
@report_upload_bp.route("/drafts", methods=["POST"])
@require_auth
def create_report_draft():
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `data`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
        data = request.get_json(silent=True) or {}
        # 설명: `not isinstance(data, dict)` 조건 결과에 따라 실행 경로를 분기한다.
        if not isinstance(data, dict):
            # 설명: 호출자에게 (jsonify({'success': False, 'error': 'Request body must be a JSON object.'}), 400) 값을 함수 결과로 반환한다.
            return jsonify({"success": False, "error": "Request body must be a JSON object."}), 400

        # 설명: `(result, status_code)`에 `ReportUploadService.create_report_draft` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.create_report_draft(
            current_user=request.current_user,
            data=data,
        )
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code
    except ValueError as e:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': str(e)}), 400) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("신고 임시저장 생성 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `list_report_drafts` 함수는 조건에 맞는 목록을 조회하는 함수다.
@report_upload_bp.route("/drafts", methods=["GET"])
@require_auth
def list_report_drafts():
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `(result, status_code)`에 `ReportUploadService.list_report_drafts` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.list_report_drafts(
            request.args,
            current_user=request.current_user,
        )
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code
    except ValueError as e:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': str(e)}), 400) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("신고 임시저장 목록 조회 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500



# 설명: `submit_report_draft` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@report_upload_bp.route("/drafts/<int:draft_id>/submit", methods=["POST"])
@require_auth
def submit_report_draft(draft_id):
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `(result, status_code)`에 `ReportUploadService.submit_report_draft` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.submit_report_draft(
            draft_id=draft_id,
            current_user=request.current_user,
        )
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code
    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("임시저장 신고 최종 제출 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `get_report_draft` 함수는 단일 값이나 리소스를 조회하는 함수다.
@report_upload_bp.route("/drafts/<int:draft_id>", methods=["GET"])
@require_auth
def get_report_draft(draft_id):
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `(result, status_code)`에 `ReportUploadService.get_report_draft` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.get_report_draft(
            draft_id=draft_id,
            current_user=request.current_user,
        )
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code
    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("신고 임시저장 상세 조회 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `update_report_draft` 함수는 기존 데이터의 허용된 값을 변경하는 함수다.
@report_upload_bp.route("/drafts/<int:draft_id>", methods=["PATCH"])
@require_auth
def update_report_draft(draft_id):
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `data`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
        data = request.get_json(silent=True) or {}
        # 설명: `not isinstance(data, dict)` 조건 결과에 따라 실행 경로를 분기한다.
        if not isinstance(data, dict):
            # 설명: 호출자에게 (jsonify({'success': False, 'error': 'Request body must be a JSON object.'}), 400) 값을 함수 결과로 반환한다.
            return jsonify({"success": False, "error": "Request body must be a JSON object."}), 400

        # 설명: `(result, status_code)`에 `ReportUploadService.update_report_draft` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.update_report_draft(
            draft_id=draft_id,
            current_user=request.current_user,
            data=data,
        )
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code
    except ValueError as e:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': str(e)}), 400) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("신고 임시저장 수정 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `delete_report_draft` 함수는 대상을 삭제 또는 소프트 삭제 처리하는 함수다.
@report_upload_bp.route("/drafts/<int:draft_id>", methods=["DELETE"])
@require_auth
def delete_report_draft(draft_id):
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `(result, status_code)`에 `ReportUploadService.delete_report_draft` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.delete_report_draft(
            draft_id=draft_id,
            current_user=request.current_user,
        )
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code
    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("신고 임시저장 삭제 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `get_report` 함수는 단일 값이나 리소스를 조회하는 함수다.
@report_upload_bp.route("/<int:report_id>", methods=["GET"])
@require_auth
def get_report(report_id):
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `(result, status_code)`에 `ReportUploadService.get_report` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.get_report(report_id, request.current_user)
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code

    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("리포트 상세 조회 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `create_report` 함수는 새 데이터나 리소스를 생성하는 함수다.
@report_upload_bp.route("", methods=["POST"])
@require_auth
def create_report():
    """multipart/form-data 신고 요청을 DB 엔터티와 파일 저장 작업으로 전달한다.

    텍스트 필드는 ``request.form``에서 모두 문자열로 들어오며, ``files`` 필드는
    ``FileStorage`` 목록이다. 인증 데코레이터가 넣은 ``request.current_user.id``가
    incident_reports.reporter_id와 report_attachments.uploaded_by에 저장된다.
    """
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `user_id`에 request.current_user.id 표현식의 계산 결과를 저장한다.
        user_id = request.current_user.id
        # HTTP multipart 경계: form 값은 dict[str, str], 파일은 list[FileStorage]다.
        data = request.form.to_dict()
        # 설명: `files`에 `request.files.getlist` 호출 결과를 저장해 다음 처리에서 사용한다.
        files = request.files.getlist("files")

        # 설명: `not files` 조건 결과에 따라 실행 경로를 분기한다.
        if not files:
            # 설명: 호출자에게 (jsonify({'success': False, 'error': '파일이 업로드되지 않았습니다.'}), 400) 값을 함수 결과로 반환한다.
            return jsonify({"success": False, "error": "파일이 업로드되지 않았습니다."}), 400

        # 설명: `report`에 `ReportUploadService.create_report` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = ReportUploadService.create_report(user_id, data, files)
        # 설명: `report_data`에 `ReportUploadService._report_response` 호출 결과를 저장해 다음 처리에서 사용한다.
        report_data = ReportUploadService._report_response(
            report,
            current_user=request.current_user,
        )

        # 설명: 호출자에게 (jsonify({'success': True, 'message': '리포트가 성공적으로 접수되었습니다.', 'report_code': rep... 값을 함수 결과로 반환한다.
        return jsonify({
            "success": True,
            "message": "리포트가 성공적으로 접수되었습니다.",
            "report_code": report.report_code,
            "report_id": report.id,
            "reporter_id": report.reporter_id,
            "author_id": report.reporter_id,
            "analysis_status": report_data.get("analysis_status"),
            "allowed_actions": report_data.get("allowed_actions"),
            "data": report_data,
        }), 201

    except ValueError as e:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': str(e)}), 400) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": str(e)}), 400

    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("리포트 생성 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `update_report` 함수는 기존 데이터의 허용된 값을 변경하는 함수다.
@report_upload_bp.route("/<int:report_id>", methods=["PATCH"])
@require_auth
def update_report(report_id):
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `data`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
        data = request.get_json(silent=True) or {}
        # 설명: `not isinstance(data, dict)` 조건 결과에 따라 실행 경로를 분기한다.
        if not isinstance(data, dict):
            # 설명: 호출자에게 (jsonify({'success': False, 'error': 'Request body must be a JSON object.'}), 400) 값을 함수 결과로 반환한다.
            return jsonify({"success": False, "error": "Request body must be a JSON object."}), 400

        # 설명: `(result, status_code)`에 `ReportUploadService.update_report` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.update_report(
            report_id=report_id,
            current_user=request.current_user,
            data=data,
        )
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code

    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("리포트 수정 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `delete_report` 함수는 신고를 소프트 삭제 상태로 전환하는 함수다.
@report_upload_bp.route("/<int:report_id>", methods=["DELETE"])
@require_auth
def delete_report(report_id):
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `(result, status_code)`에 `ReportUploadService.delete_report` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.delete_report(
            report_id=report_id,
            current_user=request.current_user,
        )
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code

    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("리포트 삭제 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `update_report_status` 함수는 기존 데이터의 허용된 값을 변경하는 함수다.
@report_upload_bp.route("/<int:report_id>/status", methods=["PATCH"])
@require_auth
def update_report_status(report_id):
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `data`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
        data = request.get_json(silent=True) or {}
        # 설명: `not isinstance(data, dict)` 조건 결과에 따라 실행 경로를 분기한다.
        if not isinstance(data, dict):
            # 설명: 호출자에게 (jsonify({'success': False, 'error': 'Request body must be a JSON object.'}), 400) 값을 함수 결과로 반환한다.
            return jsonify({"success": False, "error": "Request body must be a JSON object."}), 400

        # 설명: `(result, status_code)`에 `ReportUploadService.update_report_status` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.update_report_status(
            report_id=report_id,
            current_user=request.current_user,
            data=data,
        )
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code

    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("리포트 상태 변경 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `approve_report` 함수는 대상을 승인 상태로 전환하는 함수다.
@report_upload_bp.route("/<int:report_id>/approve", methods=["POST"])
@require_auth
def approve_report(report_id):
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `data`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
        data = request.get_json(silent=True) or {}
        # 설명: `not isinstance(data, dict)` 조건 결과에 따라 실행 경로를 분기한다.
        if not isinstance(data, dict):
            # 설명: 호출자에게 (jsonify({'success': False, 'error': 'Request body must be a JSON object.'}), 400) 값을 함수 결과로 반환한다.
            return jsonify({"success": False, "error": "Request body must be a JSON object."}), 400

        # 설명: `(result, status_code)`에 `ReportUploadService.approve_report` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.approve_report(
            report_id=report_id,
            current_user=request.current_user,
            data=data,
        )
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code

    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("리포트 승인 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `reject_report` 함수는 대상을 반려 상태로 전환하는 함수다.
@report_upload_bp.route("/<int:report_id>/reject", methods=["POST"])
@require_auth
def reject_report(report_id):
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `data`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
        data = request.get_json(silent=True) or {}
        # 설명: `not isinstance(data, dict)` 조건 결과에 따라 실행 경로를 분기한다.
        if not isinstance(data, dict):
            # 설명: 호출자에게 (jsonify({'success': False, 'error': 'Request body must be a JSON object.'}), 400) 값을 함수 결과로 반환한다.
            return jsonify({"success": False, "error": "Request body must be a JSON object."}), 400

        # 설명: `(result, status_code)`에 `ReportUploadService.reject_report` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.reject_report(
            report_id=report_id,
            current_user=request.current_user,
            data=data,
        )
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code

    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("리포트 반려 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `add_report_attachments` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@report_upload_bp.route("/<int:report_id>/attachments", methods=["POST"])
@require_auth
def add_report_attachments(report_id):
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `files`에 `request.files.getlist` 호출 결과를 저장해 다음 처리에서 사용한다.
        files = request.files.getlist("files")
        # 설명: `not files and request.files.get('file')` 조건 결과에 따라 실행 경로를 분기한다.
        if not files and request.files.get("file"):
            # 설명: `files`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
            files = [request.files["file"]]

        # 설명: `(result, status_code)`에 `ReportUploadService.add_report_attachments` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.add_report_attachments(
            report_id=report_id,
            current_user=request.current_user,
            files=files,
        )
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code

    except ValueError as e:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': str(e)}), 400) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": str(e)}), 400

    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("리포트 첨부파일 추가 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `delete_report_attachment` 함수는 대상을 삭제 또는 소프트 삭제 처리하는 함수다.
@report_upload_bp.route("/<int:report_id>/attachments/<int:attachment_id>", methods=["DELETE"])
@require_auth
def delete_report_attachment(report_id, attachment_id):
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `data`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
        data = request.get_json(silent=True) or {}
        # 설명: `not isinstance(data, dict)` 조건 결과에 따라 실행 경로를 분기한다.
        if not isinstance(data, dict):
            # 설명: 호출자에게 (jsonify({'success': False, 'error': 'Request body must be a JSON object.'}), 400) 값을 함수 결과로 반환한다.
            return jsonify({"success": False, "error": "Request body must be a JSON object."}), 400

        # 설명: `(result, status_code)`에 `ReportUploadService.delete_report_attachment` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.delete_report_attachment(
            report_id=report_id,
            attachment_id=attachment_id,
            current_user=request.current_user,
            data=data,
        )
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code

    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("리포트 첨부파일 삭제 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `get_report_analysis_status` 함수는 단일 값이나 리소스를 조회하는 함수다.
@report_upload_bp.route("/<int:report_id>/analysis-status", methods=["GET"])
@require_auth
def get_report_analysis_status(report_id):
    """URL의 정수 report_id로 최신 분석 job과 JSON 결과 요약을 조회한다."""
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `(result, status_code)`에 `ReportUploadService.get_analysis_status` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.get_analysis_status(report_id, request.current_user)
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code

    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("리포트 분석 상태 조회 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `list_report_analysis_jobs` 함수는 조건에 맞는 목록을 조회하는 함수다.
@report_upload_bp.route("/<int:report_id>/analysis-jobs", methods=["GET"])
@require_auth
def list_report_analysis_jobs(report_id):
    """신고에 연결된 모든 분석 작업을 최신순 JSON 배열로 반환한다."""
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `(result, status_code)`에 `ReportUploadService.list_analysis_jobs` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.list_analysis_jobs(report_id, request.current_user)
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code

    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("리포트 분석 작업 목록 조회 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500



# 설명: `list_analysis_comparison_candidates` 함수는 조건에 맞는 목록을 조회하는 함수다.
@report_upload_bp.route("/analysis-comparisons/candidates", methods=["GET"])
@require_auth
def list_analysis_comparison_candidates():
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `(result, status_code)`에 `ReportUploadService.list_analysis_comparison_candidates` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.list_analysis_comparison_candidates(
            request.args,
            current_user=request.current_user,
        )
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code
    except ValueError as e:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': str(e)}), 400) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("비교분석 후보 목록 조회 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `compare_analysis_jobs` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@report_upload_bp.route("/analysis-comparisons", methods=["POST"])
@require_auth
def compare_analysis_jobs():
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `data`에 request.get_json(silent=True) or {} 표현식의 계산 결과를 저장한다.
        data = request.get_json(silent=True) or {}
        # 설명: `not isinstance(data, dict)` 조건 결과에 따라 실행 경로를 분기한다.
        if not isinstance(data, dict):
            # 설명: 호출자에게 (jsonify({'success': False, 'error': 'Request body must be a JSON object.'}), 400) 값을 함수 결과로 반환한다.
            return jsonify({"success": False, "error": "Request body must be a JSON object."}), 400

        # 설명: `(result, status_code)`에 `ReportUploadService.compare_analysis_jobs` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.compare_analysis_jobs(
            data=data,
            current_user=request.current_user,
        )
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code
    except ValueError as e:
        # 설명: 호출자에게 (jsonify({'success': False, 'error': str(e)}), 400) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("분석 job 비교 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `get_report_analysis_job` 함수는 단일 값이나 리소스를 조회하는 함수다.
@report_upload_bp.route("/analysis-jobs/<int:job_id>", methods=["GET"])
@require_auth
def get_report_analysis_job(job_id):
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `(result, status_code)`에 `ReportUploadService.get_analysis_job` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.get_analysis_job(job_id, request.current_user)
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code

    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("리포트 분석 작업 상세 조회 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500

        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `retry_report_analysis_job` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
@report_upload_bp.route("/analysis-jobs/<int:job_id>/retry", methods=["POST"])
@require_auth
def retry_report_analysis_job(job_id):
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `(result, status_code)`에 `ReportUploadService.retry_analysis_job` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.retry_analysis_job(
            job_id=job_id,
            current_user=request.current_user,
        )
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code

    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("리포트 분석 작업 재시도 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500


# 설명: `request_report_analysis` 함수는 외부 처리 또는 비동기 작업을 요청하는 함수다.
@report_upload_bp.route("/<int:report_id>/analyze", methods=["POST"])
@require_auth
def request_report_analysis(report_id):
    """분석을 즉시 실행하지 않고 첨부별 QUEUED DB 작업을 생성한다.

    응답의 job_id를 폴링 API나 Socket.IO report_analysis_updated 이벤트에서 사용한다.
    """
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `(result, status_code)`에 `ReportUploadService.request_report_analysis` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.request_report_analysis(
            report_id=report_id,
            current_user=request.current_user,
        )
        # 설명: 호출자에게 (jsonify(result), status_code) 값을 함수 결과로 반환한다.
        return jsonify(result), status_code

    except Exception:
        # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        logger.exception("리포트 분석 요청 중 오류 발생")
        # 설명: 호출자에게 (jsonify({'success': False, 'error': '서버 내부 오류가 발생했습니다.'}), 500) 값을 함수 결과로 반환한다.
        return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500
