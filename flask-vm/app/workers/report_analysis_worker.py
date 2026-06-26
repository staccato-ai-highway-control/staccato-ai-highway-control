from __future__ import annotations

import json
import os

from app import create_app
from app.modules.report_upload.service import ReportUploadService


def main():
    app = create_app()
    with app.app_context():
        limit = os.getenv("REPORT_ANALYSIS_WORKER_LIMIT", "10")
        result, _ = ReportUploadService.process_queued_report_analysis_jobs(limit=limit)
        print(json.dumps(result, ensure_ascii=False, default=str))


if __name__ == "__main__":
    main()
