"""bug report 도메인의 핵심 비즈니스 규칙과 데이터 처리를 구현한다.

권한 검증, 트랜잭션 경계, 외부 연동 및 응답 직렬화를 라우트와 분리해 관리한다."""

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations

# 설명: datetime에서 datetime, timezone 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime, timezone
# 설명: hashlib 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import hashlib
# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: uuid 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import uuid
# 설명: pathlib에서 Path 이름을 가져와 아래 로직에서 재사용한다.
from pathlib import Path

# 설명: flask에서 current_app, send_file 이름을 가져와 아래 로직에서 재사용한다.
from flask import current_app, send_file
# 설명: werkzeug.utils에서 secure_filename 이름을 가져와 아래 로직에서 재사용한다.
from werkzeug.utils import secure_filename
# 설명: sqlalchemy에서 or_ 이름을 가져와 아래 로직에서 재사용한다.
from sqlalchemy import or_

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.models에서 BugReport, BugReportAttachment 이름을 가져와 아래 로직에서 재사용한다.
from app.models import BugReport, BugReportAttachment


# 설명: `BUG_REPORT_STATUSES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
BUG_REPORT_STATUSES = {
    "OPEN",
    "TRIAGED",
    "IN_PROGRESS",
    "RESOLVED",
    "CLOSED",
    "REJECTED",
    "DUPLICATE",
}

# 설명: `BUG_REPORT_SEVERITIES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
BUG_REPORT_SEVERITIES = {
    "BLOCKER",
    "CRITICAL",
    "MAJOR",
    "MINOR",
    "TRIVIAL",
}

# 설명: `BUG_REPORT_PRIORITIES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
BUG_REPORT_PRIORITIES = {
    "HIGH",
    "MEDIUM",
    "LOW",
}

# 설명: `DEFAULT_CATEGORY`의 기준값 또는 기본값을 'GENERAL'로 설정한다.
DEFAULT_CATEGORY = "GENERAL"
# 설명: `DEFAULT_SEVERITY`의 기준값 또는 기본값을 'MINOR'로 설정한다.
DEFAULT_SEVERITY = "MINOR"
# 설명: `DEFAULT_PRIORITY`의 기준값 또는 기본값을 'MEDIUM'로 설정한다.
DEFAULT_PRIORITY = "MEDIUM"
# 설명: `DEFAULT_STATUS`의 기준값 또는 기본값을 'OPEN'로 설정한다.
DEFAULT_STATUS = "OPEN"
# 설명: `DEFAULT_PAGE`의 기준값 또는 기본값을 1로 설정한다.
DEFAULT_PAGE = 1
# 설명: `DEFAULT_SIZE`의 기준값 또는 기본값을 10로 설정한다.
DEFAULT_SIZE = 10
# 설명: `MAX_SIZE`의 기준값 또는 기본값을 100로 설정한다.
MAX_SIZE = 100
# 설명: `ADMIN_ROLES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
ADMIN_ROLES = {"SUPER_ADMIN", "CONTROL_ADMIN"}


# 설명: `_is_admin` 함수는 조건의 참/거짓을 판정하는 함수다.
def _is_admin(current_user) -> bool:
    # 설명: 호출자에게 bool(current_user and getattr(current_user, 'role', None) in ADMIN_ROLES) 값을 함수 결과로 반환한다.
    return bool(current_user and getattr(current_user, "role", None) in ADMIN_ROLES)


# 설명: `_can_manage_bug_report` 함수는 현재 주체가 작업 가능한지 판정하는 함수다.
def _can_manage_bug_report(bug_report, current_user) -> bool:
    # 설명: 호출자에게 bool(current_user and (bug_report.reporter_id == getattr(current_user, 'id', No... 값을 함수 결과로 반환한다.
    return bool(
        current_user
        and (
            bug_report.reporter_id == getattr(current_user, "id", None)
            or _is_admin(current_user)
        )
    )


# 설명: `_allowed_actions` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _allowed_actions(bug_report, current_user) -> dict:
    # 설명: `can_manage`에 `_can_manage_bug_report` 호출 결과를 저장해 다음 처리에서 사용한다.
    can_manage = _can_manage_bug_report(bug_report, current_user)
    # 설명: `is_closed`에 bug_report.status in {'CLOSED', 'REJECTED', 'DUPLICATE'} 표현식의 계산 결과를 저장한다.
    is_closed = bug_report.status in {"CLOSED", "REJECTED", "DUPLICATE"}
    # 설명: 호출자에게 {'view': can_manage, 'update': can_manage and (not is_closed), 'close': can_man... 값을 함수 결과로 반환한다.
    return {
        "view": can_manage,
        "update": can_manage and not is_closed,
        "close": can_manage and not is_closed,
        "add_attachment": can_manage and not is_closed,
        "download_attachment": can_manage,
    }


# 설명: `_serialize_bug_report` 함수는 내부 객체를 응답 가능한 구조로 직렬화하는 함수다.
def _serialize_bug_report(bug_report, current_user, attachments=None) -> dict:
    # 설명: `data`에 `bug_report.to_dict` 호출 결과를 저장해 다음 처리에서 사용한다.
    data = bug_report.to_dict(attachments=attachments)
    # 설명: `data['reporter_id']`에 bug_report.reporter_id 표현식의 계산 결과를 저장한다.
    data["reporter_id"] = bug_report.reporter_id
    # 설명: `data['author_id']`에 bug_report.reporter_id 표현식의 계산 결과를 저장한다.
    data["author_id"] = bug_report.reporter_id
    # 설명: `data['user_id']`에 bug_report.reporter_id 표현식의 계산 결과를 저장한다.
    data["user_id"] = bug_report.reporter_id
    # 설명: `data['allowed_actions']`에 `_allowed_actions` 호출 결과를 저장해 다음 처리에서 사용한다.
    data["allowed_actions"] = _allowed_actions(bug_report, current_user)
    # 설명: 호출자에게 data 값을 함수 결과로 반환한다.
    return data

# 설명: `WRITABLE_FIELDS`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
WRITABLE_FIELDS = (
    "title",
    "description",
    "category",
    "severity",
    "priority",
    "page_url",
    "steps_to_reproduce",
    "expected_result",
    "actual_result",
    "browser",
    "os",
    "device",
    "app_version",
)


# 설명: `create_bug_report` 함수는 새 데이터나 리소스를 생성하는 함수다.
def create_bug_report(payload: dict | None, current_user) -> tuple[dict, int]:
    # 설명: `data`에 payload if isinstance(payload, dict) else {} 표현식의 계산 결과를 저장한다.
    data = payload if isinstance(payload, dict) else {}

    # 설명: `title`에 `_clean_text` 호출 결과를 저장해 다음 처리에서 사용한다.
    title = _clean_text(data.get("title"))
    # 설명: `description`에 `_clean_text` 호출 결과를 저장해 다음 처리에서 사용한다.
    description = _clean_text(data.get("description"))

    # 설명: `not title or not description` 조건 결과에 따라 실행 경로를 분기한다.
    if not title or not description:
        # 설명: 호출자에게 ({'success': False, 'error': 'title and description are required.'}, 400) 값을 함수 결과로 반환한다.
        return {
            "success": False,
            "error": "title and description are required.",
        }, 400

    # 설명: `category`에 _clean_text(data.get('category')) or DEFAULT_CATEGORY 표현식의 계산 결과를 저장한다.
    category = _clean_text(data.get("category")) or DEFAULT_CATEGORY
    # 설명: `severity`에 `_normalize_choice` 호출 결과를 저장해 다음 처리에서 사용한다.
    severity = _normalize_choice(data.get("severity"), DEFAULT_SEVERITY)
    # 설명: `priority`에 `_normalize_choice` 호출 결과를 저장해 다음 처리에서 사용한다.
    priority = _normalize_choice(data.get("priority"), DEFAULT_PRIORITY)

    # 설명: `severity not in BUG_REPORT_SEVERITIES` 조건 결과에 따라 실행 경로를 분기한다.
    if severity not in BUG_REPORT_SEVERITIES:
        # 설명: 호출자에게 (_invalid_choice('severity', BUG_REPORT_SEVERITIES), 400) 값을 함수 결과로 반환한다.
        return _invalid_choice("severity", BUG_REPORT_SEVERITIES), 400

    # 설명: `priority not in BUG_REPORT_PRIORITIES` 조건 결과에 따라 실행 경로를 분기한다.
    if priority not in BUG_REPORT_PRIORITIES:
        # 설명: 호출자에게 (_invalid_choice('priority', BUG_REPORT_PRIORITIES), 400) 값을 함수 결과로 반환한다.
        return _invalid_choice("priority", BUG_REPORT_PRIORITIES), 400

    # 설명: `now`에 `_utc_now_naive` 호출 결과를 저장해 다음 처리에서 사용한다.
    now = _utc_now_naive()
    # 설명: `bug_report`에 `BugReport` 호출 결과를 저장해 다음 처리에서 사용한다.
    bug_report = BugReport(
        reporter_id=current_user.id,
        assigned_to=None,
        title=title,
        description=description,
        category=category.upper(),
        severity=severity,
        priority=priority,
        status=DEFAULT_STATUS,
        page_url=_clean_text(data.get("page_url")),
        steps_to_reproduce=_clean_text(data.get("steps_to_reproduce")),
        expected_result=_clean_text(data.get("expected_result")),
        actual_result=_clean_text(data.get("actual_result")),
        browser=_clean_text(data.get("browser")),
        os=_clean_text(data.get("os")),
        device=_clean_text(data.get("device")),
        app_version=_clean_text(data.get("app_version")),
        created_at=now,
        updated_at=now,
    )

    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(bug_report)
    # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
    db.session.commit()

    # 설명: 호출자에게 ({'success': True, 'message': 'Bug report created.', 'data': _serialize_bug_rep... 값을 함수 결과로 반환한다.
    return {
        "success": True,
        "message": "Bug report created.",
        "data": _serialize_bug_report(bug_report, current_user),
    }, 201


# 설명: `list_bug_reports` 함수는 조건에 맞는 목록을 조회하는 함수다.
def list_bug_reports(args, current_user) -> tuple[dict, int]:
    # 설명: `page`에 `_positive_int` 호출 결과를 저장해 다음 처리에서 사용한다.
    page = _positive_int(args.get("page"), DEFAULT_PAGE, maximum=100000)
    # 설명: `size`에 `_positive_int` 호출 결과를 저장해 다음 처리에서 사용한다.
    size = _positive_int(args.get("size"), DEFAULT_SIZE, maximum=MAX_SIZE)

    # 설명: `query`에 BugReport.query 표현식의 계산 결과를 저장한다.
    query = BugReport.query
    # 설명: `not _is_admin(current_user)` 조건 결과에 따라 실행 경로를 분기한다.
    if not _is_admin(current_user):
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(BugReport.reporter_id == current_user.id)

    # 설명: `status`에 `_normalize_choice` 호출 결과를 저장해 다음 처리에서 사용한다.
    status = _normalize_choice(args.get("status"))
    # 설명: `status` 조건 결과에 따라 실행 경로를 분기한다.
    if status:
        # 설명: `status not in BUG_REPORT_STATUSES` 조건 결과에 따라 실행 경로를 분기한다.
        if status not in BUG_REPORT_STATUSES:
            # 설명: 호출자에게 (_invalid_choice('status', BUG_REPORT_STATUSES), 400) 값을 함수 결과로 반환한다.
            return _invalid_choice("status", BUG_REPORT_STATUSES), 400
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(BugReport.status == status)

    # 설명: `severity`에 `_normalize_choice` 호출 결과를 저장해 다음 처리에서 사용한다.
    severity = _normalize_choice(args.get("severity"))
    # 설명: `severity` 조건 결과에 따라 실행 경로를 분기한다.
    if severity:
        # 설명: `severity not in BUG_REPORT_SEVERITIES` 조건 결과에 따라 실행 경로를 분기한다.
        if severity not in BUG_REPORT_SEVERITIES:
            # 설명: 호출자에게 (_invalid_choice('severity', BUG_REPORT_SEVERITIES), 400) 값을 함수 결과로 반환한다.
            return _invalid_choice("severity", BUG_REPORT_SEVERITIES), 400
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(BugReport.severity == severity)

    # 설명: `category`에 `_clean_text` 호출 결과를 저장해 다음 처리에서 사용한다.
    category = _clean_text(args.get("category"))
    # 설명: `category` 조건 결과에 따라 실행 경로를 분기한다.
    if category:
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(BugReport.category == category.upper())

    # 설명: `keyword`에 `_clean_text` 호출 결과를 저장해 다음 처리에서 사용한다.
    keyword = _clean_text(args.get("keyword"))
    # 설명: `keyword` 조건 결과에 따라 실행 경로를 분기한다.
    if keyword:
        # 설명: `like_keyword`에 f'%{keyword}%' 표현식의 계산 결과를 저장한다.
        like_keyword = f"%{keyword}%"
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(or_(
            BugReport.title.ilike(like_keyword),
            BugReport.description.ilike(like_keyword),
            BugReport.page_url.ilike(like_keyword),
        ))

    # 설명: `pagination`에 `query.order_by(BugReport.created_at.desc(), BugReport.id.desc()).pa...` 호출 결과를 저장해 다음 처리에서 사용한다.
    pagination = query.order_by(BugReport.created_at.desc(), BugReport.id.desc()).paginate(
        page=page,
        per_page=size,
        error_out=False,
    )

    # 설명: `items`에 [_serialize_bug_report(item, current_user, attachments=[]) for item i... 표현식의 계산 결과를 저장한다.
    items = [_serialize_bug_report(item, current_user, attachments=[]) for item in pagination.items]

    # 설명: 호출자에게 ({'success': True, 'data': {'items': items, 'page': page, 'size': size, 'total_... 값을 함수 결과로 반환한다.
    return {
        "success": True,
        "data": {
            "items": items,
            "page": page,
            "size": size,
            "total_count": pagination.total,
            "total_pages": pagination.pages,
        },
    }, 200


# 설명: `list_my_bug_reports` 함수는 조건에 맞는 목록을 조회하는 함수다.
def list_my_bug_reports(args, current_user) -> tuple[dict, int]:
    # 설명: `page`에 `_positive_int` 호출 결과를 저장해 다음 처리에서 사용한다.
    page = _positive_int(args.get("page"), DEFAULT_PAGE, maximum=100000)
    # 설명: `size`에 `_positive_int` 호출 결과를 저장해 다음 처리에서 사용한다.
    size = _positive_int(args.get("size"), DEFAULT_SIZE, maximum=MAX_SIZE)

    # 설명: `query`에 `BugReport.query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
    query = BugReport.query.filter(BugReport.reporter_id == current_user.id)

    # 설명: `status`에 `_normalize_choice` 호출 결과를 저장해 다음 처리에서 사용한다.
    status = _normalize_choice(args.get("status"))
    # 설명: `status` 조건 결과에 따라 실행 경로를 분기한다.
    if status:
        # 설명: `status not in BUG_REPORT_STATUSES` 조건 결과에 따라 실행 경로를 분기한다.
        if status not in BUG_REPORT_STATUSES:
            # 설명: 호출자에게 (_invalid_choice('status', BUG_REPORT_STATUSES), 400) 값을 함수 결과로 반환한다.
            return _invalid_choice("status", BUG_REPORT_STATUSES), 400
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(BugReport.status == status)

    # 설명: `severity`에 `_normalize_choice` 호출 결과를 저장해 다음 처리에서 사용한다.
    severity = _normalize_choice(args.get("severity"))
    # 설명: `severity` 조건 결과에 따라 실행 경로를 분기한다.
    if severity:
        # 설명: `severity not in BUG_REPORT_SEVERITIES` 조건 결과에 따라 실행 경로를 분기한다.
        if severity not in BUG_REPORT_SEVERITIES:
            # 설명: 호출자에게 (_invalid_choice('severity', BUG_REPORT_SEVERITIES), 400) 값을 함수 결과로 반환한다.
            return _invalid_choice("severity", BUG_REPORT_SEVERITIES), 400
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(BugReport.severity == severity)

    # 설명: `category`에 `_clean_text` 호출 결과를 저장해 다음 처리에서 사용한다.
    category = _clean_text(args.get("category"))
    # 설명: `category` 조건 결과에 따라 실행 경로를 분기한다.
    if category:
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(BugReport.category == category.upper())

    # 설명: `keyword`에 `_clean_text` 호출 결과를 저장해 다음 처리에서 사용한다.
    keyword = _clean_text(args.get("keyword"))
    # 설명: `keyword` 조건 결과에 따라 실행 경로를 분기한다.
    if keyword:
        # 설명: `like_keyword`에 f'%{keyword}%' 표현식의 계산 결과를 저장한다.
        like_keyword = f"%{keyword}%"
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(or_(
            BugReport.title.ilike(like_keyword),
            BugReport.description.ilike(like_keyword),
            BugReport.page_url.ilike(like_keyword),
        ))

    # 설명: `pagination`에 `query.order_by(BugReport.created_at.desc(), BugReport.id.desc()).pa...` 호출 결과를 저장해 다음 처리에서 사용한다.
    pagination = query.order_by(BugReport.created_at.desc(), BugReport.id.desc()).paginate(
        page=page,
        per_page=size,
        error_out=False,
    )

    # 설명: `items`에 [_serialize_bug_report(item, current_user, attachments=[]) for item i... 표현식의 계산 결과를 저장한다.
    items = [_serialize_bug_report(item, current_user, attachments=[]) for item in pagination.items]

    # 설명: 호출자에게 ({'success': True, 'data': {'items': items, 'page': page, 'size': size, 'total_... 값을 함수 결과로 반환한다.
    return {
        "success": True,
        "data": {
            "items": items,
            "page": page,
            "size": size,
            "total_count": pagination.total,
            "total_pages": pagination.pages,
        },
    }, 200


# 설명: `get_bug_report_detail` 함수는 단일 값이나 리소스를 조회하는 함수다.
def get_bug_report_detail(bug_report_id: int, current_user) -> tuple[dict, int]:
    # 설명: `bug_report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    bug_report = db.session.get(BugReport, bug_report_id)
    # 설명: `bug_report is None` 조건 결과에 따라 실행 경로를 분기한다.
    if bug_report is None:
        # 설명: 호출자에게 ({'success': False, 'error': 'Bug report not found.'}, 404) 값을 함수 결과로 반환한다.
        return {
            "success": False,
            "error": "Bug report not found.",
        }, 404
    # 설명: `not _can_manage_bug_report(bug_report, current_user)` 조건 결과에 따라 실행 경로를 분기한다.
    if not _can_manage_bug_report(bug_report, current_user):
        # 설명: 호출자에게 ({'success': False, 'error': 'Bug report access denied.'}, 403) 값을 함수 결과로 반환한다.
        return {"success": False, "error": "Bug report access denied."}, 403

    # 설명: `attachments`에 `BugReportAttachment.query.filter_by(bug_report_id=bug_report.id).or...` 호출 결과를 저장해 다음 처리에서 사용한다.
    attachments = (
        BugReportAttachment.query
        .filter_by(bug_report_id=bug_report.id)
        .order_by(BugReportAttachment.id.asc())
        .all()
    )

    # 설명: 호출자에게 ({'success': True, 'data': _serialize_bug_report(bug_report, current_user, atta... 값을 함수 결과로 반환한다.
    return {
        "success": True,
        "data": _serialize_bug_report(
            bug_report,
            current_user,
            attachments=[attachment.to_dict() for attachment in attachments],
        ),
    }, 200


# 설명: `update_bug_report` 함수는 기존 데이터의 허용된 값을 변경하는 함수다.
def update_bug_report(bug_report_id: int, payload: dict | None, current_user) -> tuple[dict, int]:
    # 설명: `bug_report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    bug_report = db.session.get(BugReport, bug_report_id)
    # 설명: `bug_report is None` 조건 결과에 따라 실행 경로를 분기한다.
    if bug_report is None:
        # 설명: 호출자에게 ({'success': False, 'error': 'Bug report not found.'}, 404) 값을 함수 결과로 반환한다.
        return {
            "success": False,
            "error": "Bug report not found.",
        }, 404
    # 설명: `not _can_manage_bug_report(bug_report, current_user)` 조건 결과에 따라 실행 경로를 분기한다.
    if not _can_manage_bug_report(bug_report, current_user):
        # 설명: 호출자에게 ({'success': False, 'error': 'Bug report update denied.'}, 403) 값을 함수 결과로 반환한다.
        return {"success": False, "error": "Bug report update denied."}, 403

    # 설명: `data`에 payload if isinstance(payload, dict) else {} 표현식의 계산 결과를 저장한다.
    data = payload if isinstance(payload, dict) else {}

    # 설명: `not data` 조건 결과에 따라 실행 경로를 분기한다.
    if not data:
        # 설명: 호출자에게 ({'success': False, 'error': 'Request body must be a JSON object.'}, 400) 값을 함수 결과로 반환한다.
        return {
            "success": False,
            "error": "Request body must be a JSON object.",
        }, 400

    # 설명: `'title' in data` 조건 결과에 따라 실행 경로를 분기한다.
    if "title" in data:
        # 설명: `title`에 `_clean_text` 호출 결과를 저장해 다음 처리에서 사용한다.
        title = _clean_text(data.get("title"))
        # 설명: `not title` 조건 결과에 따라 실행 경로를 분기한다.
        if not title:
            # 설명: 호출자에게 ({'success': False, 'error': 'title is required.'}, 400) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "title is required.",
            }, 400
        # 설명: `bug_report.title`에 title 표현식의 계산 결과를 저장한다.
        bug_report.title = title

    # 설명: `'description' in data` 조건 결과에 따라 실행 경로를 분기한다.
    if "description" in data:
        # 설명: `description`에 `_clean_text` 호출 결과를 저장해 다음 처리에서 사용한다.
        description = _clean_text(data.get("description"))
        # 설명: `not description` 조건 결과에 따라 실행 경로를 분기한다.
        if not description:
            # 설명: 호출자에게 ({'success': False, 'error': 'description is required.'}, 400) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "description is required.",
            }, 400
        # 설명: `bug_report.description`에 description 표현식의 계산 결과를 저장한다.
        bug_report.description = description

    # 설명: `'category' in data` 조건 결과에 따라 실행 경로를 분기한다.
    if "category" in data:
        # 설명: `category`에 `_clean_text` 호출 결과를 저장해 다음 처리에서 사용한다.
        category = _clean_text(data.get("category"))
        # 설명: `bug_report.category`에 category.upper() if category else DEFAULT_CATEGORY 표현식의 계산 결과를 저장한다.
        bug_report.category = category.upper() if category else DEFAULT_CATEGORY

    # 설명: `'severity' in data` 조건 결과에 따라 실행 경로를 분기한다.
    if "severity" in data:
        # 설명: `severity`에 `_normalize_choice` 호출 결과를 저장해 다음 처리에서 사용한다.
        severity = _normalize_choice(data.get("severity"), DEFAULT_SEVERITY)
        # 설명: `severity not in BUG_REPORT_SEVERITIES` 조건 결과에 따라 실행 경로를 분기한다.
        if severity not in BUG_REPORT_SEVERITIES:
            # 설명: 호출자에게 (_invalid_choice('severity', BUG_REPORT_SEVERITIES), 400) 값을 함수 결과로 반환한다.
            return _invalid_choice("severity", BUG_REPORT_SEVERITIES), 400
        # 설명: `bug_report.severity`에 severity 표현식의 계산 결과를 저장한다.
        bug_report.severity = severity

    # 설명: `'priority' in data` 조건 결과에 따라 실행 경로를 분기한다.
    if "priority" in data:
        # 설명: `priority`에 `_normalize_choice` 호출 결과를 저장해 다음 처리에서 사용한다.
        priority = _normalize_choice(data.get("priority"), DEFAULT_PRIORITY)
        # 설명: `priority not in BUG_REPORT_PRIORITIES` 조건 결과에 따라 실행 경로를 분기한다.
        if priority not in BUG_REPORT_PRIORITIES:
            # 설명: 호출자에게 (_invalid_choice('priority', BUG_REPORT_PRIORITIES), 400) 값을 함수 결과로 반환한다.
            return _invalid_choice("priority", BUG_REPORT_PRIORITIES), 400
        # 설명: `bug_report.priority`에 priority 표현식의 계산 결과를 저장한다.
        bug_report.priority = priority

    # 설명: `'status' in data` 조건 결과에 따라 실행 경로를 분기한다.
    if "status" in data:
        # 설명: `status`에 `_normalize_choice` 호출 결과를 저장해 다음 처리에서 사용한다.
        status = _normalize_choice(data.get("status"), DEFAULT_STATUS)
        # 설명: `status not in BUG_REPORT_STATUSES` 조건 결과에 따라 실행 경로를 분기한다.
        if status not in BUG_REPORT_STATUSES:
            # 설명: 호출자에게 (_invalid_choice('status', BUG_REPORT_STATUSES), 400) 값을 함수 결과로 반환한다.
            return _invalid_choice("status", BUG_REPORT_STATUSES), 400
        # 설명: `bug_report.status`에 status 표현식의 계산 결과를 저장한다.
        bug_report.status = status

    # 설명: `('page_url', 'steps_to_reproduce', 'expected_result', 'actu...`의 각 항목을 `field_name`로 받아 반복 처리한다.
    for field_name in (
        "page_url",
        "steps_to_reproduce",
        "expected_result",
        "actual_result",
        "browser",
        "os",
        "device",
        "app_version",
    ):
        # 설명: `field_name in data` 조건 결과에 따라 실행 경로를 분기한다.
        if field_name in data:
            # 설명: `setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            setattr(bug_report, field_name, _clean_text(data.get(field_name)))

    # 설명: `bug_report.updated_at`에 `_utc_now_naive` 호출 결과를 저장해 다음 처리에서 사용한다.
    bug_report.updated_at = _utc_now_naive()

    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(bug_report)
    # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
    db.session.commit()

    # 설명: 호출자에게 ({'success': True, 'message': 'Bug report updated.', 'data': _serialize_bug_rep... 값을 함수 결과로 반환한다.
    return {
        "success": True,
        "message": "Bug report updated.",
        "data": _serialize_bug_report(bug_report, current_user, attachments=[]),
    }, 200


# 설명: `close_bug_report` 함수는 대상을 종료 상태로 전환하는 함수다.
def close_bug_report(bug_report_id: int, current_user) -> tuple[dict, int]:
    # 설명: `bug_report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    bug_report = db.session.get(BugReport, bug_report_id)
    # 설명: `bug_report is None` 조건 결과에 따라 실행 경로를 분기한다.
    if bug_report is None:
        # 설명: 호출자에게 ({'success': False, 'error': 'Bug report not found.'}, 404) 값을 함수 결과로 반환한다.
        return {
            "success": False,
            "error": "Bug report not found.",
        }, 404
    # 설명: `not _can_manage_bug_report(bug_report, current_user)` 조건 결과에 따라 실행 경로를 분기한다.
    if not _can_manage_bug_report(bug_report, current_user):
        # 설명: 호출자에게 ({'success': False, 'error': 'Bug report close denied.'}, 403) 값을 함수 결과로 반환한다.
        return {"success": False, "error": "Bug report close denied."}, 403

    # 설명: `bug_report.status`의 기준값 또는 기본값을 'CLOSED'로 설정한다.
    bug_report.status = "CLOSED"
    # 설명: `bug_report.updated_at`에 `_utc_now_naive` 호출 결과를 저장해 다음 처리에서 사용한다.
    bug_report.updated_at = _utc_now_naive()

    # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
    db.session.add(bug_report)
    # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
    db.session.commit()

    # 설명: 호출자에게 ({'success': True, 'message': 'Bug report closed.', 'bug_report_id': bug_report... 값을 함수 결과로 반환한다.
    return {
        "success": True,
        "message": "Bug report closed.",
        "bug_report_id": bug_report.id,
        "data": _serialize_bug_report(bug_report, current_user, attachments=[]),
    }, 200


# 설명: `create_bug_report_attachments` 함수는 새 데이터나 리소스를 생성하는 함수다.
def create_bug_report_attachments(bug_report_id: int, files, current_user) -> tuple[dict, int]:
    # 설명: `bug_report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    bug_report = db.session.get(BugReport, bug_report_id)
    # 설명: `bug_report is None` 조건 결과에 따라 실행 경로를 분기한다.
    if bug_report is None:
        # 설명: 호출자에게 ({'success': False, 'error': 'Bug report not found.'}, 404) 값을 함수 결과로 반환한다.
        return {
            "success": False,
            "error": "Bug report not found.",
        }, 404
    # 설명: `not _can_manage_bug_report(bug_report, current_user)` 조건 결과에 따라 실행 경로를 분기한다.
    if not _can_manage_bug_report(bug_report, current_user):
        # 설명: 호출자에게 ({'success': False, 'error': 'Bug report attachment upload denied.'}, 403) 값을 함수 결과로 반환한다.
        return {"success": False, "error": "Bug report attachment upload denied."}, 403

    # 설명: `files`에 files or [] 표현식의 계산 결과를 저장한다.
    files = files or []
    # 설명: `not files` 조건 결과에 따라 실행 경로를 분기한다.
    if not files:
        # 설명: 호출자에게 ({'success': False, 'error': 'files are required.'}, 400) 값을 함수 결과로 반환한다.
        return {
            "success": False,
            "error": "files are required.",
        }, 400

    # 설명: `upload_root`에 `current_app.config.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    upload_root = current_app.config.get("UPLOAD_BASE_PATH")
    # 설명: `not upload_root` 조건 결과에 따라 실행 경로를 분기한다.
    if not upload_root:
        # 설명: 호출자에게 ({'success': False, 'error': 'UPLOAD_BASE_PATH is not configured.'}, 500) 값을 함수 결과로 반환한다.
        return {
            "success": False,
            "error": "UPLOAD_BASE_PATH is not configured.",
        }, 500

    # 설명: `upload_dir`에 `os.path.join` 호출 결과를 저장해 다음 처리에서 사용한다.
    upload_dir = os.path.join(upload_root, "bug_reports", str(bug_report.id))
    # 설명: `os.makedirs`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    os.makedirs(upload_dir, exist_ok=True)

    # 설명: `now`에 `_utc_now_naive` 호출 결과를 저장해 다음 처리에서 사용한다.
    now = _utc_now_naive()
    # 설명: `saved_paths`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    saved_paths: list[str] = []
    # 설명: `attachments`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    attachments: list[BugReportAttachment] = []

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `files`의 각 항목을 `file`로 받아 반복 처리한다.
        for file in files:
            # 설명: `not file or not file.filename` 조건 결과에 따라 실행 경로를 분기한다.
            if not file or not file.filename:
                # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
                continue

            # 설명: `original_filename`에 secure_filename(file.filename) or 'attachment' 표현식의 계산 결과를 저장한다.
            original_filename = secure_filename(file.filename) or "attachment"
            # 설명: `extension`에 Path(original_filename).suffix.lower().lstrip('.') or None 표현식의 계산 결과를 저장한다.
            extension = Path(original_filename).suffix.lower().lstrip(".") or None
            # 설명: `stored_filename`에 f'{uuid.uuid4().hex}_{original_filename}' 표현식의 계산 결과를 저장한다.
            stored_filename = f"{uuid.uuid4().hex}_{original_filename}"
            # 설명: `file_path`에 `os.path.join` 호출 결과를 저장해 다음 처리에서 사용한다.
            file_path = os.path.join(upload_dir, stored_filename)

            # 설명: `file.seek`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            file.seek(0, os.SEEK_END)
            # 설명: `file_size`에 `file.tell` 호출 결과를 저장해 다음 처리에서 사용한다.
            file_size = file.tell()
            # 설명: `file.seek`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            file.seek(0)

            # 설명: `checksum`에 `hashlib.sha256(file.read()).hexdigest` 호출 결과를 저장해 다음 처리에서 사용한다.
            checksum = hashlib.sha256(file.read()).hexdigest()
            # 설명: `file.seek`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            file.seek(0)

            # 설명: `file.save`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            file.save(file_path)
            # 설명: `saved_paths.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
            saved_paths.append(file_path)

            # 설명: `attachment`에 `BugReportAttachment` 호출 결과를 저장해 다음 처리에서 사용한다.
            attachment = BugReportAttachment(
                bug_report_id=bug_report.id,
                uploaded_by=current_user.id,
                original_filename=original_filename,
                stored_filename=stored_filename,
                file_path=file_path,
                file_size=file_size,
                mime_type=file.content_type or "application/octet-stream",
                file_ext=extension,
                checksum_sha256=checksum,
                created_at=now,
            )
            # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
            db.session.add(attachment)
            # 설명: `attachments.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
            attachments.append(attachment)

        # 설명: `not attachments` 조건 결과에 따라 실행 경로를 분기한다.
        if not attachments:
            # 설명: 호출자에게 ({'success': False, 'error': 'No valid files were uploaded.'}, 400) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "No valid files were uploaded.",
            }, 400

        # 설명: `bug_report.updated_at`에 now 표현식의 계산 결과를 저장한다.
        bug_report.updated_at = now
        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(bug_report)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: 호출자에게 ({'success': True, 'message': 'Bug report attachments uploaded.', 'bug_report_i... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "message": "Bug report attachments uploaded.",
            "bug_report_id": bug_report.id,
            "count": len(attachments),
            "items": [attachment.to_dict() for attachment in attachments],
        }, 201

    except Exception:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()

        # 설명: `saved_paths`의 각 항목을 `saved_path`로 받아 반복 처리한다.
        for saved_path in saved_paths:
            # 설명: `saved_path and os.path.exists(saved_path)` 조건 결과에 따라 실행 경로를 분기한다.
            if saved_path and os.path.exists(saved_path):
                # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
                try:
                    # 설명: `os.remove`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                    os.remove(saved_path)
                except OSError:
                    # 설명: `current_app.logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                    current_app.logger.exception(
                        "Failed to clean up bug report attachment after upload failure.",
                        extra={"file_path": saved_path},
                    )

        # 설명: 현재 처리를 중단하고 기존 예외를 호출자에게 전달한다.
        raise


# 설명: `get_bug_report_attachment_file` 함수는 단일 값이나 리소스를 조회하는 함수다.
def get_bug_report_attachment_file(attachment_id: int, current_user):
    # 설명: `attachment`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    attachment = db.session.get(BugReportAttachment, attachment_id)
    # 설명: `attachment is None` 조건 결과에 따라 실행 경로를 분기한다.
    if attachment is None:
        # 설명: 호출자에게 ({'success': False, 'error': 'Bug report attachment not found.'}, 404) 값을 함수 결과로 반환한다.
        return {
            "success": False,
            "error": "Bug report attachment not found.",
        }, 404

    # 설명: `bug_report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    bug_report = db.session.get(BugReport, attachment.bug_report_id)
    # 설명: `not bug_report or not _can_manage_bug_report(bug_report, current_user)` 조건 결과에 따라 실행 경로를 분기한다.
    if not bug_report or not _can_manage_bug_report(bug_report, current_user):
        # 설명: 호출자에게 ({'success': False, 'error': 'Bug report attachment access denied.'}, 403) 값을 함수 결과로 반환한다.
        return {"success": False, "error": "Bug report attachment access denied."}, 403

    # 설명: `not attachment.file_path or not os.path.exists(attachment.file_path)` 조건 결과에 따라 실행 경로를 분기한다.
    if not attachment.file_path or not os.path.exists(attachment.file_path):
        # 설명: 호출자에게 ({'success': False, 'error': 'Bug report attachment file not found.'}, 404) 값을 함수 결과로 반환한다.
        return {
            "success": False,
            "error": "Bug report attachment file not found.",
        }, 404

    # 설명: `download_name`에 secure_filename(attachment.original_filename or '') or attachment.sto... 표현식의 계산 결과를 저장한다.
    download_name = secure_filename(attachment.original_filename or "") or attachment.stored_filename

    # 설명: `response`에 `send_file` 호출 결과를 저장해 다음 처리에서 사용한다.
    response = send_file(
        attachment.file_path,
        mimetype=attachment.mime_type or "application/octet-stream",
        as_attachment=True,
        download_name=download_name,
        conditional=True,
        max_age=0,
    )
    # 설명: `response.headers['X-Content-Type-Options']`의 기준값 또는 기본값을 'nosniff'로 설정한다.
    response.headers["X-Content-Type-Options"] = "nosniff"
    # 설명: `response.headers['Cache-Control']`의 기준값 또는 기본값을 'private, no-store'로 설정한다.
    response.headers["Cache-Control"] = "private, no-store"

    # 설명: 호출자에게 (response, 200) 값을 함수 결과로 반환한다.
    return response, 200


# 설명: `_clean_text` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _clean_text(value) -> str | None:
    # 설명: `value is None` 조건 결과에 따라 실행 경로를 분기한다.
    if value is None:
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `text`에 `str(value).strip` 호출 결과를 저장해 다음 처리에서 사용한다.
    text = str(value).strip()
    # 설명: 호출자에게 text or None 값을 함수 결과로 반환한다.
    return text or None


# 설명: `_normalize_choice` 함수는 입력 값을 일관된 형식으로 정규화하는 함수다.
def _normalize_choice(value, default: str | None = None) -> str | None:
    # 설명: `text`에 `_clean_text` 호출 결과를 저장해 다음 처리에서 사용한다.
    text = _clean_text(value)
    # 설명: `not text` 조건 결과에 따라 실행 경로를 분기한다.
    if not text:
        # 설명: 호출자에게 default 값을 함수 결과로 반환한다.
        return default

    # 설명: 호출자에게 text.upper() 값을 함수 결과로 반환한다.
    return text.upper()


# 설명: `_invalid_choice` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _invalid_choice(field_name: str, allowed_values: set[str]) -> dict:
    # 설명: 호출자에게 {'success': False, 'error': f'Invalid {field_name}.', 'allowed_values': sorted(... 값을 함수 결과로 반환한다.
    return {
        "success": False,
        "error": f"Invalid {field_name}.",
        "allowed_values": sorted(allowed_values),
    }


# 설명: `_positive_int` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _positive_int(value, default: int, maximum: int) -> int:
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `parsed`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
        parsed = int(value)
    except (TypeError, ValueError):
        # 설명: `parsed`에 default 표현식의 계산 결과를 저장한다.
        parsed = default

    # 설명: `parsed <= 0` 조건 결과에 따라 실행 경로를 분기한다.
    if parsed <= 0:
        # 설명: `parsed`에 default 표현식의 계산 결과를 저장한다.
        parsed = default

    # 설명: 호출자에게 min(parsed, maximum) 값을 함수 결과로 반환한다.
    return min(parsed, maximum)


# 설명: `_utc_now_naive` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _utc_now_naive() -> datetime:
    # 설명: 호출자에게 datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0) 값을 함수 결과로 반환한다.
    return datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)


# 설명: `is_valid_status` 함수는 조건의 참/거짓을 판정하는 함수다.
def is_valid_status(status):
    # 설명: 호출자에게 _normalize_choice(status) in BUG_REPORT_STATUSES 값을 함수 결과로 반환한다.
    return _normalize_choice(status) in BUG_REPORT_STATUSES


# 설명: `is_valid_severity` 함수는 조건의 참/거짓을 판정하는 함수다.
def is_valid_severity(severity):
    # 설명: 호출자에게 _normalize_choice(severity) in BUG_REPORT_SEVERITIES 값을 함수 결과로 반환한다.
    return _normalize_choice(severity) in BUG_REPORT_SEVERITIES


# 설명: `is_valid_priority` 함수는 조건의 참/거짓을 판정하는 함수다.
def is_valid_priority(priority):
    # 설명: 호출자에게 _normalize_choice(priority) in BUG_REPORT_PRIORITIES 값을 함수 결과로 반환한다.
    return _normalize_choice(priority) in BUG_REPORT_PRIORITIES
