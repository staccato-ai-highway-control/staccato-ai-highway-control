"""대기 중인 신고 영상 다중 모델 비교 분석 Run을 처리하는 Worker 진입점."""

from __future__ import annotations

import json
import os

from app import create_app
from app.modules.report_model_comparison.service import (
    ReportModelComparisonService,
)


def main():
    """환경 변수의 처리 한도를 읽어 최대 3개 비교 Run을 순차 실행한다."""
    app = create_app()

    with app.app_context():
        limit = os.getenv("REPORT_MODEL_COMPARISON_WORKER_LIMIT", "3")

        result, _status_code = (
            ReportModelComparisonService.process_queued_comparison_runs(
                limit=limit
            )
        )

        print(json.dumps(result, ensure_ascii=False, default=str))


if __name__ == "__main__":
    main()
