"""대기 중인 신고서 AI 분석 작업을 처리하는 워커 진입점.

Flask 애플리케이션 컨텍스트 안에서 제한된 수의 작업을 조회하고 처리한다."""

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations

# 설명: json 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import json
# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os

# 설명: app에서 create_app 이름을 가져와 아래 로직에서 재사용한다.
from app import create_app
# 설명: app.modules.report_upload.service에서 ReportUploadService 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.report_upload.service import ReportUploadService


# 설명: `main` 함수는 명령행 실행 흐름을 시작하는 함수다.
def main():
    """환경 변수의 처리 한도를 읽어 QUEUED DB 작업을 실행하고 결과를 stdout에 기록한다."""
    # 설명: `app`에 `create_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app = create_app()
    # 서비스가 current_app, 설정, SQLAlchemy 세션을 사용할 수 있도록 앱 컨텍스트를 연다.
    with app.app_context():
        # 설명: `limit`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
        limit = os.getenv("REPORT_ANALYSIS_WORKER_LIMIT", "10")
        # 설명: `(result, _)`에 `ReportUploadService.process_queued_report_analysis_jobs` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, _ = ReportUploadService.process_queued_report_analysis_jobs(limit=limit)
        # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        print(json.dumps(result, ensure_ascii=False, default=str))


# 설명: `__name__ == '__main__'` 조건 결과에 따라 실행 경로를 분기한다.
if __name__ == "__main__":
    # 설명: `main`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    main()
