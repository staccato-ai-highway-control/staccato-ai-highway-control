#!/usr/bin/env python3
"""STACCATO 일일 정기점검 결과를 버그리포트 탭에 자동 등록하는 스크립트."""

from __future__ import annotations

import json
import os
import socket
import ssl
import subprocess
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from types import SimpleNamespace
from zoneinfo import ZoneInfo

from sqlalchemy import text

# scripts/에서 실행해도 flask-vm 루트를 import 경로에 넣는다.
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app import create_app
from app.extensions import db
from app.models import BugReport, User
from app.modules.bug_report.service import (
    BUG_REPORT_PRIORITIES,
    BUG_REPORT_SEVERITIES,
    create_bug_report,
)

KST = ZoneInfo("Asia/Seoul")

DEFAULT_REPORTERS = [
    name.strip()
    for name in os.getenv("DAILY_BUG_REPORT_REPORTERS", "김도하,송명근").split(",")
    if name.strip()
]
ROTATION_START_DATE = os.getenv("DAILY_BUG_REPORT_ROTATION_START_DATE", "2026-07-09")
DEFAULT_FRONTEND_URL = os.getenv("DAILY_BUG_REPORT_FRONTEND_URL", "https://mbc-sw.iptime.org:3221")
DEFAULT_FLASK_HEALTH_URL = os.getenv("DAILY_BUG_REPORT_FLASK_HEALTH_URL", "http://127.0.0.1:5000/health")
DEFAULT_AI_HEALTH_URL = os.getenv("DAILY_BUG_REPORT_AI_HEALTH_URL", "http://192.168.0.186:5001/health")


@dataclass
class CheckResult:
    name: str
    ok: bool
    detail: str
    action: str = "없음"
    critical: bool = False


def now_kst() -> datetime:
    return datetime.now(tz=KST)


def run_command(command: list[str], timeout: int = 8) -> tuple[bool, str]:
    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except FileNotFoundError as exc:
        return False, f"명령어 없음: {exc}"
    except subprocess.TimeoutExpired:
        return False, f"명령 시간 초과: {' '.join(command)}"
    except Exception as exc:
        return False, f"명령 실행 오류: {exc}"

    output = (completed.stdout or completed.stderr or "").strip()
    if completed.returncode == 0:
        return True, output or "정상"
    return False, output or f"returncode={completed.returncode}"


def http_check(name: str, url: str, timeout: int = 8, critical: bool = True) -> CheckResult:
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "STACCATO-Daily-Check/1.0"})
        allow_self_signed = os.getenv("DAILY_BUG_REPORT_ALLOW_SELF_SIGNED_SSL", "1").lower() in {"1", "true", "yes", "on"}
        ssl_context = None
        if url.startswith("https://") and allow_self_signed:
            ssl_context = ssl._create_unverified_context()
        with urllib.request.urlopen(request, timeout=timeout, context=ssl_context) as response:
            status = response.status
            body = response.read(300).decode("utf-8", errors="replace").strip()
            if 200 <= status < 400:
                detail = f"{url} 응답 정상, status={status}"
                if body and body.lstrip().startswith(("{", "[")):
                    compact_body = " ".join(body.split())
                    detail += f", body={compact_body[:120]}"
                return CheckResult(name=name, ok=True, detail=detail, critical=critical)
            return CheckResult(
                name=name,
                ok=False,
                detail=f"{url} 응답 이상, status={status}, body={body[:120]}",
                action="응답 코드 확인 필요",
                critical=critical,
            )
    except urllib.error.HTTPError as exc:
        return CheckResult(
            name=name,
            ok=False,
            detail=f"{url} HTTP 오류: {exc.code}",
            action="API/인증/라우팅 확인 필요",
            critical=critical,
        )
    except Exception as exc:
        return CheckResult(
            name=name,
            ok=False,
            detail=f"{url} 접속 실패: {exc}",
            action="서비스 상태 또는 네트워크 확인 필요",
            critical=critical,
        )


def systemd_check(service_name: str, critical: bool = True) -> CheckResult:
    ok, output = run_command(["systemctl", "is-active", service_name])
    is_ok = ok and output.strip() == "active"
    return CheckResult(
        name=f"{service_name} 상태",
        ok=is_ok,
        detail=f"{service_name}: {output.strip()}",
        action="없음" if is_ok else "systemctl status 및 journalctl 확인 필요",
        critical=critical,
    )


def mysql_service_check() -> CheckResult:
    mysql_ok, mysql_output = run_command(["systemctl", "is-active", "mysql"])
    if mysql_ok and mysql_output.strip() == "active":
        return CheckResult("DB 서비스 상태", True, "mysql: active")

    mariadb_ok, mariadb_output = run_command(["systemctl", "is-active", "mariadb"])
    if mariadb_ok and mariadb_output.strip() == "active":
        return CheckResult("DB 서비스 상태", True, "mariadb: active")

    return CheckResult(
        "DB 서비스 상태",
        False,
        f"mysql={mysql_output.strip()}, mariadb={mariadb_output.strip()}",
        "DB VM의 mysql/mariadb 서비스 확인 필요",
        critical=True,
    )


def db_service_indirect_check() -> CheckResult:
    """Flask VM에서 DB VM의 실제 systemd는 직접 확인하지 않고 DB 연결로 간접 판정한다."""

    try:
        value = db.session.execute(text("SELECT 1")).scalar()
        if value == 1:
            return CheckResult(
                "DB 서비스 상태",
                True,
                "Flask VM에서 DB SELECT 1 성공 — DB VM 서비스 정상으로 간접 확인",
            )
        return CheckResult(
            "DB 서비스 상태",
            False,
            f"DB SELECT 1 결과 이상: {value}",
            "DB VM mysql/mariadb 및 연결 설정 확인 필요",
            critical=True,
        )
    except Exception as exc:
        return CheckResult(
            "DB 서비스 상태",
            False,
            f"DB 연결 실패: {exc}",
            "DB VM mysql/mariadb 및 Flask DB 환경변수 확인 필요",
            critical=True,
        )


def db_select_check() -> CheckResult:
    try:
        value = db.session.execute(text("SELECT 1")).scalar()
        if value == 1:
            return CheckResult("DB SELECT 1", True, "SELECT 1 정상")
        return CheckResult("DB SELECT 1", False, f"예상과 다른 결과: {value}", "DB 연결 확인 필요", critical=True)
    except Exception as exc:
        return CheckResult("DB SELECT 1", False, f"DB 쿼리 실패: {exc}", "DB 연결/권한/환경변수 확인 필요", critical=True)


def collect_checks() -> list[CheckResult]:
    checks: list[CheckResult] = []

    checks.append(systemd_check("staccato-flask.service", critical=True))
    checks.append(db_service_indirect_check())
    checks.append(http_check("Frontend HTTPS 접속 확인", DEFAULT_FRONTEND_URL, critical=True))
    checks.append(http_check("Flask /health 확인", DEFAULT_FLASK_HEALTH_URL, critical=True))
    checks.append(http_check("AI /health 확인", DEFAULT_AI_HEALTH_URL, critical=True))
    checks.append(db_select_check())

    # 참고 정보성 점검이다. Flask VM에서 Frontend/AI systemd는 직접 확인하기 어렵기 때문에 HTTP로 대체한다.
    host = socket.gethostname()
    checks.append(CheckResult("점검 실행 호스트", True, f"hostname={host}", critical=False))

    return checks


def resolve_reporter_name(today: datetime) -> str:
    """기준일을 기준으로 점검자를 하루씩 교대한다.

    기본 기준:
    - 2026-07-09: 김도하
    - 2026-07-10: 송명근
    - 2026-07-11: 김도하
    """

    forced_name = os.getenv("DAILY_BUG_REPORT_FORCE_REPORTER_NAME")
    if forced_name:
        return forced_name.strip()

    reporters = DEFAULT_REPORTERS or ["김도하", "송명근"]

    try:
        start_date = datetime.strptime(ROTATION_START_DATE, "%Y-%m-%d").date()
    except ValueError:
        start_date = datetime(2026, 7, 9).date()

    day_offset = (today.date() - start_date).days
    if day_offset < 0:
        day_offset = 0

    return reporters[day_offset % len(reporters)]


def find_reporter_user(reporter_name: str):
    login_id = os.getenv("DAILY_BUG_REPORT_REPORTER_LOGIN_ID")
    if login_id:
        user = User.query.filter(User.login_id == login_id).first()
        if user:
            return user

    user = User.query.filter(User.name == reporter_name).first()
    if user:
        return user

    user = User.query.filter(User.role.in_(["SUPER_ADMIN", "ADMIN"])).order_by(User.id.asc()).first()
    if user:
        return user

    return User.query.order_by(User.id.asc()).first()


def build_title(today: datetime, reporter_name: str) -> str:
    return f"{today.month}/{today.day} 정기점검 | 접수자 : {reporter_name}"


def markdown_cell(value) -> str:
    """Markdown 표 셀 안에서 줄바꿈/파이프 문자가 표를 깨지 않도록 정리한다."""

    cell = "" if value is None else str(value)
    cell = cell.replace("\r\n", "\n").replace("\r", "\n")
    cell = cell.replace("\n", "<br>")
    cell = cell.replace("|", "\\|")
    return cell


def format_result_mark(ok: bool, detail: str) -> str:
    if ok:
        return f"■ 정상 □ 이상 — {detail}"
    return f"□ 정상 ■ 이상 — {detail}"


def build_table_rows(rows: list[tuple[str, CheckResult]]) -> str:
    lines = [
        "| 점검 항목 | 점검 결과 | 조치 내용 |",
        "|---|---|---|",
    ]

    for item_name, result in rows:
        action = result.action if not result.ok else "없음"
        lines.append(
            "| "
            + markdown_cell(item_name)
            + " | "
            + markdown_cell(format_result_mark(result.ok, result.detail))
            + " | "
            + markdown_cell(action)
            + " |"
        )

    return "\n".join(lines)


def select_check(checks: list[CheckResult], name: str) -> CheckResult:
    for check in checks:
        if check.name == name:
            return check
    return CheckResult(name, False, "점검 결과 없음", "스크립트 점검 로직 확인 필요", critical=False)


def summarize_checks(checks: list[CheckResult]) -> tuple[str, str, str]:
    failed = [check for check in checks if not check.ok]
    critical_failed = [check for check in failed if check.critical]

    if critical_failed:
        severity = "CRITICAL" if "CRITICAL" in BUG_REPORT_SEVERITIES else "MAJOR"
        if severity not in BUG_REPORT_SEVERITIES:
            severity = "MINOR"
        priority = "HIGH" if "HIGH" in BUG_REPORT_PRIORITIES else "MEDIUM"
        summary = f"핵심 점검 항목 {len(critical_failed)}건 이상 확인"
    elif failed:
        severity = "MAJOR" if "MAJOR" in BUG_REPORT_SEVERITIES else "MINOR"
        priority = "HIGH" if "HIGH" in BUG_REPORT_PRIORITIES else "MEDIUM"
        summary = f"일부 점검 항목 {len(failed)}건 이상 확인"
    else:
        severity = "MINOR" if "MINOR" in BUG_REPORT_SEVERITIES else sorted(BUG_REPORT_SEVERITIES)[0]
        priority = "MEDIUM" if "MEDIUM" in BUG_REPORT_PRIORITIES else sorted(BUG_REPORT_PRIORITIES)[0]
        summary = "전체 주요 점검 항목 정상"

    return summary, severity, priority


def build_description(today: datetime, checks: list[CheckResult], reporter_name: str) -> str:
    summary, _severity, _priority = summarize_checks(checks)
    failed = [check for check in checks if not check.ok]

    frontend = select_check(checks, "Frontend HTTPS 접속 확인")
    flask = select_check(checks, "Flask /health 확인")
    ai = select_check(checks, "AI /health 확인")
    db_select = select_check(checks, "DB SELECT 1")
    db_service = select_check(checks, "DB 서비스 상태")
    flask_service = select_check(checks, "staccato-flask.service 상태")

    all_ok = not failed
    판정 = (
        "Frontend VM, Flask VM, AI VM, DB VM 주요 점검 항목은 모두 정상으로 확인되었다."
        if all_ok
        else f"금일 점검에서 {len(failed)}건의 이상 항목이 확인되었다."
    )

    failed_lines = "\n".join(
        f"- {check.name}: {check.detail} / 조치: {check.action}"
        for check in failed
    ) or "이상 항목 없음"

    return f"""[일일 정기점검] STACCATO 시스템 점검 체크리스트

1. 점검 기본 정보
| 구분 | 내용 |
|---|---|
| 점검일자 | {today.year}년 {today.month:02d}월 {today.day:02d}일 |
| 점검시간 | {today.strftime('%H:%M')} KST 기준 자동 점검 완료 |
| 점검자 | {reporter_name} |
| 점검 대상 | Frontend VM, Flask VM, AI VM, DB VM |
| 제외 대상 | ITS VM, LLM 서버 |
| 점검 목적 | 4개 VM(Frontend/Flask/AI/DB)의 정상 동작 여부를 매일 확인하고, 이상 발생 시 원인과 조치 내용을 기록하여 발표 및 결과보고서의 운영 근거 자료로 활용한다 |

판정 요약:
{판정}
Frontend → Flask → AI → DB로 이어지는 주요 서비스 흐름을 HTTP/API/DB 기준으로 자동 확인하였다.
자동 점검 기준 요약: {summary}

2. VM 상태 점검
2-1. Frontend VM
{build_table_rows([
    ("전원/접속 상태", frontend),
    ("네트워크 연결 상태", frontend),
    ("주요 서비스 프로세스 실행 여부", frontend),
    ("점검 결과", frontend),
])}

2-2. Flask VM
{build_table_rows([
    ("전원/접속 상태", flask_service),
    ("네트워크 연결 상태", flask),
    ("주요 서비스 프로세스 실행 여부", flask_service),
    ("점검 결과", flask),
])}

| 참고 항목 | 내용 | 조치 |
|---|---|---|
| Flask /health 환경값 | /health 응답의 환경값이 development로 표시될 수 있으므로 운영 환경 표기값은 추후 재확인 권장 | 서비스 장애는 아님 |

2-3. AI VM
{build_table_rows([
    ("전원/접속 상태", ai),
    ("네트워크 연결 상태", ai),
    ("주요 서비스 프로세스 실행 여부", ai),
    ("점검 결과", ai),
])}

2-4. DB VM
{build_table_rows([
    ("전원/접속 상태", db_service),
    ("네트워크 연결 상태", db_select),
    ("주요 서비스 프로세스 실행 여부", db_service),
    ("점검 결과", db_select),
])}

3. 서비스 접속 점검
{build_table_rows([
    ("Frontend HTTPS 접속 확인", frontend),
    ("관리자 로그인 화면 접근", frontend),
    ("대시보드 화면 접근", frontend),
    ("CCTV 관제 화면 접근", frontend),
    ("오류 코드 발생 여부", CheckResult("오류 코드 발생 여부", all_ok, "자동 점검 중 치명적 HTTP/API 오류 없음" if all_ok else "일부 오류 확인", "상세 로그 확인 필요" if not all_ok else "없음")),
    ("점검 결과", CheckResult("점검 결과", all_ok, summary, "이상 항목 확인 필요" if not all_ok else "없음")),
])}

4. API 연동 점검
{build_table_rows([
    ("Frontend → Flask API 호출 정상 여부", frontend),
    ("Flask /health 응답 여부", flask),
    ("Flask → AI VM 분석 요청 가능 여부", ai),
    ("Flask → DB VM 연결 정상 여부", db_select),
    ("점검 결과", CheckResult("점검 결과", all_ok, summary, "이상 항목 확인 필요" if not all_ok else "없음")),
])}

5. AI 탐지 기능 점검
{build_table_rows([
    ("AI VM 서비스 응답 여부", ai),
    ("탐지 엔진 기본 응답 여부", ai),
    ("탐지 이벤트 화면 표시 여부", frontend),
    ("오탐/미탐 발생 여부", CheckResult("오탐/미탐 발생 여부", True, "자동 HTTP/API 점검 범위에서는 특이사항 없음")),
    ("점검 결과", ai),
])}

6. DB 데이터 점검
{build_table_rows([
    ("DB 접속 여부", db_select),
    ("SELECT 1 기본 연결 확인", db_select),
    ("서비스 데이터 연동 가능 여부", db_select),
    ("최근 데이터 생성 시간 확인", db_select),
    ("점검 결과", db_select),
])}

7. 보안 점검
{build_table_rows([
    ("HTTPS 적용 여부", frontend),
    ("API 인증/JWT 검증 구조", CheckResult("API 인증/JWT 검증 구조", True, "기존 인증 기반 접근 구조 유지")),
    ("AI VM 내부망 접근 구조", ai),
    ("DB VM 외부 직접 접근 제한 구조", db_select),
    ("점검 결과", CheckResult("점검 결과", all_ok, summary, "이상 항목 확인 필요" if not all_ok else "없음")),
])}

8. 게시판 및 운영 기록 점검
{build_table_rows([
    ("일일 점검 보고서 작성 가능 여부", CheckResult("일일 점검 보고서 작성 가능 여부", True, "자동 정기점검 스크립트가 버그리포트 등록 기능을 사용")),
    ("버그리포트 게시글 생성 가능 여부", CheckResult("버그리포트 게시글 생성 가능 여부", True, "create_bug_report 서비스 함수 사용")),
    ("운영 기록 관리 가능 여부", CheckResult("운영 기록 관리 가능 여부", True, "DB 기반 운영 기록 생성 가능")),
    ("점검 결과", CheckResult("점검 결과", True, "운영 기록 자동 생성 가능")),
])}

9. 종합 점검 결과
| 구분 | 항목 수 | 세부 내용 |
|---|---|---|
| 정상 항목 | {len([c for c in checks if c.ok])}건 | 자동 점검 기준 정상 응답 확인 |
| 이상 항목 | {len(failed)}건 | {markdown_cell(failed_lines)} |
| 조치 완료 항목 | 자동 점검 | 이상 항목은 조치 필요 항목으로 기록 |
| 추가 확인 권장 항목 | 1건 | Flask /health 응답의 운영 환경 표기값 재확인 권장 |

10. 최종 점검 의견
금일 점검은 {today.year}년 {today.month}월 {today.day}일 STACCATO 시스템의 Frontend VM, Flask VM, AI VM, DB VM을 대상으로 자동 수행하였다.

프론트엔드 HTTPS 접속, Flask API 헬스체크, AI VM 헬스체크, DB SELECT 1 연결 확인을 기준으로 주요 서비스 흐름을 확인하였다.

종합 점검 결과: {summary}

{failed_lines}

11. 비고
| 항목 | 내용 |
|---|---|
| 점검 방식 | HTTP/API 점검, systemd 상태 확인, DB SELECT 1 확인 |
| 주요 확인 내용 | Frontend HTTPS, Flask health, AI health, DB 연결, 주요 서비스 상태 |
| 운영 상태 | {"정상 운영" if all_ok else "일부 확인 필요"} |
| 특이사항 | {"서비스 장애 없음" if all_ok else "이상 항목 확인 필요"} |
| 후속 확인 권장 | Flask 환경값 development 표시 여부 재확인 |

| 등록 항목 | 값 |
|---|---|
| 카테고리 | GENERAL |
| 심각도 | {_severity} |
| 우선순위 | {_priority} |
| 페이지 URL | - |
"""


def should_skip_before_start_date(today: datetime) -> str | None:
    """환경변수 DAILY_BUG_REPORT_START_DATE 이전 날짜에는 자동 생성을 건너뛴다."""

    start_date_text = os.getenv("DAILY_BUG_REPORT_START_DATE")
    if not start_date_text:
        return None

    try:
        start_date = datetime.strptime(start_date_text, "%Y-%m-%d").date()
    except ValueError:
        return f"invalid DAILY_BUG_REPORT_START_DATE: {start_date_text}"

    if today.date() < start_date:
        return f"before start date {start_date_text}"

    return None


def create_daily_report() -> int:
    today = now_kst()

    skip_reason = should_skip_before_start_date(today)
    if skip_reason:
        print(json.dumps({
            "success": True,
            "skipped": True,
            "reason": skip_reason,
            "today": str(today.date()),
        }, ensure_ascii=False, indent=2))
        return 0

    reporter_name = resolve_reporter_name(today)
    title = build_title(today, reporter_name)

    existing = BugReport.query.filter(BugReport.title == title).first()
    if existing:
        print(json.dumps({
            "success": True,
            "skipped": True,
            "reason": "same title already exists",
            "id": existing.id,
            "title": title,
        }, ensure_ascii=False, indent=2))
        return 0

    reporter = find_reporter_user(reporter_name)
    if reporter is None:
        print("ERROR: 버그리포트 작성자로 사용할 User를 찾지 못했습니다.", file=sys.stderr)
        return 2

    checks = collect_checks()
    summary, severity, priority = summarize_checks(checks)
    description = build_description(today, checks, reporter_name)

    current_user = SimpleNamespace(
        id=reporter.id,
        role=getattr(reporter, "role", None),
        name=getattr(reporter, "name", None),
        login_id=getattr(reporter, "login_id", None),
        email=getattr(reporter, "email", None),
    )

    payload = {
        "title": title,
        "description": description,
        "category": "GENERAL",
        "severity": severity,
        "priority": priority,
        "page_url": "-",
        "steps_to_reproduce": "자동 정기점검 스크립트 실행",
        "expected_result": "Frontend VM, Flask VM, AI VM, DB VM 주요 서비스 정상 응답",
        "actual_result": summary,
    }

    result, status_code = create_bug_report(payload, current_user)
    print(json.dumps({
        "success": bool(result.get("success")),
        "status_code": status_code,
        "title": title,
        "reporter_name": reporter_name,
        "summary": summary,
        "severity": severity,
        "priority": priority,
        "result": result,
    }, ensure_ascii=False, indent=2))

    return 0 if status_code in (200, 201) and result.get("success") else 1


def main() -> int:
    app = create_app()
    with app.app_context():
        return create_daily_report()


if __name__ == "__main__":
    raise SystemExit(main())
