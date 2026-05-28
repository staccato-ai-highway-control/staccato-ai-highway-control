"""
Bug Report routes.

TODO:
- POST   /api/bug-reports
- GET    /api/bug-reports
- GET    /api/bug-reports/my
- GET    /api/bug-reports/<bug_report_id>
- PATCH  /api/bug-reports/<bug_report_id>
- POST   /api/bug-reports/<bug_report_id>/attachments
- GET    /api/bug-report-attachments/<attachment_id>/download

Note:
The blueprint is intentionally not registered yet.
Route handlers will be implemented in a follow-up task.
"""

from flask import Blueprint


bug_report_bp = Blueprint(
    "bug_report",
    __name__,
    url_prefix="/api/bug-reports",
)
