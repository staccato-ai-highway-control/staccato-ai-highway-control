from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import or_

from app.extensions import db
from app.models import BugReport, BugReportAttachment


BUG_REPORT_STATUSES = {
    "OPEN",
    "TRIAGED",
    "IN_PROGRESS",
    "RESOLVED",
    "CLOSED",
    "REJECTED",
    "DUPLICATE",
}

BUG_REPORT_SEVERITIES = {
    "BLOCKER",
    "CRITICAL",
    "MAJOR",
    "MINOR",
    "TRIVIAL",
}

BUG_REPORT_PRIORITIES = {
    "HIGH",
    "MEDIUM",
    "LOW",
}

DEFAULT_CATEGORY = "GENERAL"
DEFAULT_SEVERITY = "MINOR"
DEFAULT_PRIORITY = "MEDIUM"
DEFAULT_STATUS = "OPEN"
DEFAULT_PAGE = 1
DEFAULT_SIZE = 10
MAX_SIZE = 100

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


def create_bug_report(payload: dict | None) -> tuple[dict, int]:
    data = payload if isinstance(payload, dict) else {}

    title = _clean_text(data.get("title"))
    description = _clean_text(data.get("description"))

    if not title or not description:
        return {
            "success": False,
            "error": "title and description are required.",
        }, 400

    category = _clean_text(data.get("category")) or DEFAULT_CATEGORY
    severity = _normalize_choice(data.get("severity"), DEFAULT_SEVERITY)
    priority = _normalize_choice(data.get("priority"), DEFAULT_PRIORITY)

    if severity not in BUG_REPORT_SEVERITIES:
        return _invalid_choice("severity", BUG_REPORT_SEVERITIES), 400

    if priority not in BUG_REPORT_PRIORITIES:
        return _invalid_choice("priority", BUG_REPORT_PRIORITIES), 400

    now = _utc_now_naive()
    bug_report = BugReport(
        reporter_id=None,
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

    db.session.add(bug_report)
    db.session.commit()

    return {
        "success": True,
        "message": "Bug report created.",
        "data": bug_report.to_dict(),
    }, 201


def list_bug_reports(args) -> tuple[dict, int]:
    page = _positive_int(args.get("page"), DEFAULT_PAGE, maximum=100000)
    size = _positive_int(args.get("size"), DEFAULT_SIZE, maximum=MAX_SIZE)

    query = BugReport.query

    status = _normalize_choice(args.get("status"))
    if status:
        if status not in BUG_REPORT_STATUSES:
            return _invalid_choice("status", BUG_REPORT_STATUSES), 400
        query = query.filter(BugReport.status == status)

    severity = _normalize_choice(args.get("severity"))
    if severity:
        if severity not in BUG_REPORT_SEVERITIES:
            return _invalid_choice("severity", BUG_REPORT_SEVERITIES), 400
        query = query.filter(BugReport.severity == severity)

    category = _clean_text(args.get("category"))
    if category:
        query = query.filter(BugReport.category == category.upper())

    keyword = _clean_text(args.get("keyword"))
    if keyword:
        like_keyword = f"%{keyword}%"
        query = query.filter(or_(
            BugReport.title.ilike(like_keyword),
            BugReport.description.ilike(like_keyword),
            BugReport.page_url.ilike(like_keyword),
        ))

    pagination = query.order_by(BugReport.created_at.desc(), BugReport.id.desc()).paginate(
        page=page,
        per_page=size,
        error_out=False,
    )

    items = [item.to_dict(attachments=[]) for item in pagination.items]

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


def get_bug_report_detail(bug_report_id: int) -> tuple[dict, int]:
    bug_report = db.session.get(BugReport, bug_report_id)
    if bug_report is None:
        return {
            "success": False,
            "error": "Bug report not found.",
        }, 404

    attachments = (
        BugReportAttachment.query
        .filter_by(bug_report_id=bug_report.id)
        .order_by(BugReportAttachment.id.asc())
        .all()
    )

    return {
        "success": True,
        "data": bug_report.to_dict(
            attachments=[attachment.to_dict() for attachment in attachments]
        ),
    }, 200


def _clean_text(value) -> str | None:
    if value is None:
        return None

    text = str(value).strip()
    return text or None


def _normalize_choice(value, default: str | None = None) -> str | None:
    text = _clean_text(value)
    if not text:
        return default

    return text.upper()


def _invalid_choice(field_name: str, allowed_values: set[str]) -> dict:
    return {
        "success": False,
        "error": f"Invalid {field_name}.",
        "allowed_values": sorted(allowed_values),
    }


def _positive_int(value, default: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default

    if parsed <= 0:
        parsed = default

    return min(parsed, maximum)


def _utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)


def is_valid_status(status):
    return _normalize_choice(status) in BUG_REPORT_STATUSES


def is_valid_severity(severity):
    return _normalize_choice(severity) in BUG_REPORT_SEVERITIES


def is_valid_priority(priority):
    return _normalize_choice(priority) in BUG_REPORT_PRIORITIES
