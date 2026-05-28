"""
Bug Report service layer.

TODO:
- Create bug report
- List bug reports with filters
- Get bug report detail
- Update status, priority, severity, assigned user
- Save attachment metadata
- Validate attachment access permission

Models:
- app.models.bug_report_models.BugReport
- app.models.bug_report_models.BugReportAttachment
"""


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


def is_valid_status(status):
    return status in BUG_REPORT_STATUSES


def is_valid_severity(severity):
    return severity in BUG_REPORT_SEVERITIES


def is_valid_priority(priority):
    return priority in BUG_REPORT_PRIORITIES
