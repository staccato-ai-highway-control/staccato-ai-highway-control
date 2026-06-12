"""버그 신고 HTTP 요청을 서비스 계층의 비즈니스 처리로 연결한다.

이 모듈은 DB를 직접 조회하지 않는다. Flask 요청에서 URL·JSON·파일·인증 사용자를
꺼내 service 함수에 전달하고, 서비스의 ``(payload, status_code)`` 결과를 HTTP 응답으로 바꾼다.
"""

# 타입 힌트 평가를 지연해 실행 시점의 순환 import 가능성을 줄인다.
from __future__ import annotations

# Blueprint는 URL 그룹을 만들고, request/jsonify는 HTTP 입력과 JSON 출력을 담당한다.
from flask import Blueprint, jsonify, request

# 인증 데코레이터는 Bearer 토큰을 검증하고 request.current_user를 주입한다.
from app.utils.security import require_auth

# 라우트는 아래 서비스 함수에 입력을 전달하며 직접 SQLAlchemy 쿼리를 실행하지 않는다.
from app.modules.bug_report.service import (
    close_bug_report,
    create_bug_report,
    create_bug_report_attachments,
    get_bug_report_attachment_file,
    get_bug_report_detail,
    list_bug_reports,
    list_my_bug_reports,
    update_bug_report,
)


# 이 Blueprint에 등록된 모든 상대 URL 앞에는 /api/bug-reports가 붙는다.
bug_report_bp = Blueprint(
    # Flask 내부 endpoint 이름에 사용할 Blueprint 식별자다.
    "bug_report",
    # 현재 모듈명을 전달해 Flask가 import 위치를 판단하게 한다.
    __name__,
    # 외부 클라이언트가 호출하는 공통 API URL 접두사다.
    url_prefix="/api/bug-reports",
)


# POST /api/bug-reports 요청을 새 신고 생성 함수에 연결한다.
@bug_report_bp.post("")
# 토큰 검증에 성공한 요청만 함수까지 도달하게 한다.
@require_auth
def create_bug_report_api():
    """JSON 본문과 인증 사용자를 새 버그 신고 생성 서비스에 전달한다."""
    # silent=True는 JSON이 없거나 잘못되어도 Flask 예외 대신 None을 반환하게 한다.
    payload = request.get_json(silent=True)
    # current_user는 인증 데코레이터가 DB에서 조회한 User ORM 객체다.
    current_user = request.current_user
    # 서비스는 입력 검증과 INSERT를 수행하고 (응답 dict, HTTP 상태) 튜플을 반환한다.
    result, status_code = create_bug_report(payload, current_user)
    # Python dict를 JSON 본문으로 직렬화하고 서비스가 선택한 상태 코드를 유지한다.
    return jsonify(result), status_code


# GET /api/bug-reports 요청을 전체 목록 조회 함수에 연결한다.
@bug_report_bp.get("")
# 사용자 역할에 따라 조회 범위와 allowed_actions가 달라지므로 인증이 필요하다.
@require_auth
def list_bug_reports_api():
    """페이지·필터 쿼리와 인증 사용자를 전체 목록 서비스에 전달한다."""
    # request.args는 page, size, status 등의 문자열 값을 담는 읽기 전용 MultiDict다.
    query_args = request.args
    # 서비스가 문자열 쿼리를 내부 정수·상태 타입으로 검증하고 DB 조회 조건을 만든다.
    result, status_code = list_bug_reports(query_args, request.current_user)
    # items와 페이지 메타데이터가 들어 있는 dict를 JSON 응답으로 반환한다.
    return jsonify(result), status_code


# GET /api/bug-reports/my 요청을 현재 사용자 소유 목록 조회 함수에 연결한다.
@bug_report_bp.get("/my")
# 누구의 신고인지 판별할 current_user.id가 필요하므로 인증을 강제한다.
@require_auth
def list_my_bug_reports_api():
    """현재 사용자가 작성한 버그 신고만 페이지 단위로 조회한다."""
    # URL 쿼리 문자열은 서비스에서 페이지와 필터 값으로 해석된다.
    query_args = request.args
    # User ORM 객체의 id를 기준으로 reporter_id 조건이 추가된다.
    current_user = request.current_user
    # 서비스가 소유자 범위 조회 결과와 적절한 HTTP 상태를 반환한다.
    result, status_code = list_my_bug_reports(query_args, current_user)
    # 라우트에서 결과 구조를 바꾸지 않아 API 계약을 서비스 한곳에서 관리한다.
    return jsonify(result), status_code


# <int:bug_report_id> 변환기는 URL 문자열을 Python int로 바꿔 함수 인자로 넘긴다.
@bug_report_bp.get("/<int:bug_report_id>")
# 상세 정보와 첨부파일 권한을 판단하기 위해 인증 사용자가 필요하다.
@require_auth
def get_bug_report_detail_api(bug_report_id: int):
    """정수형 신고 ID와 현재 사용자를 상세 조회 서비스로 전달한다."""
    # 서비스는 PK 존재, 소프트 삭제, 조회 권한을 확인한 뒤 연결 데이터를 직렬화한다.
    result, status_code = get_bug_report_detail(bug_report_id, request.current_user)
    # 성공 데이터 또는 403/404 오류를 같은 JSON 계약으로 반환한다.
    return jsonify(result), status_code


# PATCH는 전체 행 교체가 아니라 JSON에 포함된 필드만 부분 수정한다.
@bug_report_bp.patch("/<int:bug_report_id>")
# 작성자 또는 관리자 역할인지 확인하기 위해 인증을 요구한다.
@require_auth
def update_bug_report_api(bug_report_id: int):
    """부분 수정 JSON을 대상 버그 신고의 업데이트 서비스로 전달한다."""
    # JSON 미제공 또는 파싱 실패는 None이 되어 서비스의 400 검증 경로로 들어간다.
    payload = request.get_json(silent=True)
    # 서비스는 수정 가능 필드, 상태, 소유권을 검증한 뒤 DB UPDATE를 commit한다.
    result, status_code = update_bug_report(
        # URL에서 변환된 bug_reports 기본 키다.
        bug_report_id,
        # 클라이언트가 변경을 요청한 필드 dict 또는 None이다.
        payload,
        # 수정 권한과 감사용 사용자 ID를 제공하는 User ORM 객체다.
        request.current_user,
    )
    # 갱신 데이터나 검증 오류를 서비스 상태 코드와 함께 반환한다.
    return jsonify(result), status_code


# HTTP DELETE를 사용하지만 서비스는 행을 제거하지 않고 CLOSED 상태로 전환한다.
@bug_report_bp.delete("/<int:bug_report_id>")
# 종료 가능한 소유자 또는 관리자 여부를 확인해야 하므로 인증이 필요하다.
@require_auth
def close_bug_report_api(bug_report_id: int):
    """버그 신고를 이력 보존 가능한 종료 상태로 변경한다."""
    # 서비스는 현재 상태와 권한을 검사한 뒤 status/closed_at 등을 갱신한다.
    result, status_code = close_bug_report(bug_report_id, request.current_user)
    # CLOSED 데이터 또는 권한·존재 오류를 JSON으로 반환한다.
    return jsonify(result), status_code


# POST /<id>/attachments는 특정 신고에 여러 multipart 파일을 추가한다.
@bug_report_bp.post("/<int:bug_report_id>/attachments")
# 업로드 사용자와 대상 신고 접근 권한을 확인하기 위해 인증한다.
@require_auth
def create_bug_report_attachment_api(bug_report_id: int):
    """multipart files 항목을 첨부파일 저장 서비스로 전달한다."""
    # 디스크 저장이나 DB INSERT에서 발생한 예상 밖 오류를 JSON 500으로 바꾸는 경계다.
    try:
        # 같은 files 필드명으로 반복 전송된 항목을 list[FileStorage]로 가져온다.
        files = request.files.getlist("files")
        # 서비스가 확장자·크기·권한을 검사하고 파일 및 attachment 행을 저장한다.
        result, status_code = create_bug_report_attachments(
            # 첨부파일이 속할 bug_reports 부모 행의 기본 키다.
            bug_report_id,
            # 아직 저장되지 않은 업로드 스트림 객체 목록이다.
            files,
            # uploaded_by와 접근 권한 확인에 사용할 인증 사용자다.
            request.current_user,
        )
        # 성공 201 또는 서비스가 판단한 4xx 오류를 JSON으로 반환한다.
        return jsonify(result), status_code
    # 서비스 밖으로 예외가 새어 HTML 디버그 응답이 되는 것을 방지한다.
    except Exception:
        # 내부 파일 경로나 예외 문자열은 숨기고 안정적인 공개 오류만 반환한다.
        return jsonify({
            # 클라이언트가 성공 여부를 기계적으로 판별하는 값이다.
            "success": False,
            # 사용자에게 노출 가능한 일반화된 업로드 실패 메시지다.
            "error": "Failed to upload bug report attachments.",
            # 실패한 요청을 원래 신고와 연결할 수 있도록 ID를 되돌려준다.
            "bug_report_id": bug_report_id,
        # jsonify Response와 HTTP 500 상태 코드를 Flask 반환 튜플로 구성한다.
        }), 500


# GET /attachments/<id>/download는 첨부 메타데이터 ID로 실제 파일을 내려준다.
@bug_report_bp.get("/attachments/<int:attachment_id>/download")
# 비공개 파일의 접근 권한과 다운로드 사용자를 확인하기 위해 인증한다.
@require_auth
def download_bug_report_attachment_api(attachment_id: int):
    """권한 검사 후 바이너리 파일 또는 JSON 오류 응답을 반환한다."""
    # 성공 result는 send_file 기반 Response이고 실패 result는 오류 dict다.
    result, status_code = get_bug_report_attachment_file(
        # bug_report_attachments 테이블에서 조회할 정수형 기본 키다.
        attachment_id,
        # 신고 소유자 또는 관리자 접근 여부를 확인할 인증 사용자다.
        request.current_user,
    )
    # 파일 응답은 이미 헤더와 바이너리 본문이 완성되어 jsonify가 필요 없다.
    if status_code == 200:
        # Content-Type/Content-Disposition이 설정된 파일 Response를 그대로 전달한다.
        return result
    # 4xx 실패 dict만 JSON으로 직렬화해 일반 API 오류 형식으로 반환한다.
    return jsonify(result), status_code
