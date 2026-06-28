"""서버 자원 및 의존 서비스 상태를 수집해 운영 보고서를 생성한다.

시스템 명령과 HTTP 점검 결과를 파일과 데이터베이스 레코드로 기록한다."""

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations

# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: sys 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import sys
# 설명: uuid 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import uuid
# 설명: socket 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import socket
# 설명: subprocess 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import subprocess
# 설명: datetime에서 datetime, timedelta, timezone 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime, timedelta, timezone
# 설명: pathlib에서 Path 이름을 가져와 아래 로직에서 재사용한다.
from pathlib import Path
# 설명: urllib.request에서 Request, urlopen 이름을 가져와 아래 로직에서 재사용한다.
from urllib.request import Request, urlopen
# 설명: urllib.error에서 URLError, HTTPError 이름을 가져와 아래 로직에서 재사용한다.
from urllib.error import URLError, HTTPError
# 설명: zoneinfo에서 ZoneInfo 이름을 가져와 아래 로직에서 재사용한다.
from zoneinfo import ZoneInfo

# Ensure flask-vm package path
BASE_DIR = Path(__file__).resolve().parents[1]
# 설명: `sys.path.insert`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
sys.path.insert(0, str(BASE_DIR))

# 설명: app에서 create_app 이름을 가져와 아래 로직에서 재사용한다.
from app import create_app  # noqa: E402
# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db  # noqa: E402
# 설명: app.models에서 ProjectResource 이름을 가져와 아래 로직에서 재사용한다.
from app.models import ProjectResource  # noqa: E402


# 설명: `KST`에 `ZoneInfo` 호출 결과를 저장해 다음 처리에서 사용한다.
KST = ZoneInfo("Asia/Seoul")
# 설명: `AUTHOR_NAME`의 기준값 또는 기본값을 'STACCATO 자동 점검'로 설정한다.
AUTHOR_NAME = "STACCATO 자동 점검"
# 설명: `CATEGORY`의 기준값 또는 기본값을 'ACCESS_LOG'로 설정한다.
CATEGORY = "ACCESS_LOG"
# 설명: `VISIBILITY`의 기준값 또는 기본값을 'SUPER_ADMIN_ONLY'로 설정한다.
VISIBILITY = "SUPER_ADMIN_ONLY"
# 설명: `FILE_TYPE`의 기준값 또는 기본값을 'txt'로 설정한다.
FILE_TYPE = "txt"
# 설명: `KEEP_DAYS`의 기준값 또는 기본값을 14로 설정한다.
KEEP_DAYS = 14

# 운영 서비스 상태 점검 설정
FRONTEND_HEALTH_URL = os.getenv(
    "FRONTEND_HEALTH_URL",
    "https://mbc-sw.iptime.org:3001/api/health",
).strip()
FRONTEND_HEALTH_HOST = os.getenv(
    "FRONTEND_HEALTH_HOST",
    "mbc-sw.iptime.org",
).strip()
FRONTEND_HEALTH_PORT = os.getenv(
    "FRONTEND_HEALTH_PORT",
    "3001",
).strip()
FRONTEND_RESOLVE_IP = os.getenv(
    "FRONTEND_RESOLVE_IP",
    "192.168.0.188",
).strip()
FRONTEND_CA_CERT_PATH = Path(
    os.getenv(
        "FRONTEND_CA_CERT_PATH",
        str(BASE_DIR / "deploy" / "certs" / "mbc-sw.iptime.org.pem"),
    )
)
FLASK_HEALTH_URL = os.getenv(
    "FLASK_HEALTH_URL",
    "http://127.0.0.1:5000/health",
).strip()
AI_HEALTH_URL = os.getenv(
    "AI_HEALTH_URL",
    "http://192.168.0.186:5001/health",
).strip()

# 설명: `WEEKDAY_KO`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
WEEKDAY_KO = {
    0: "월",
    1: "화",
    2: "수",
    3: "목",
    4: "금",
    5: "토",
    6: "일",
}


# 설명: `now_kst` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def now_kst() -> datetime:
    # 설명: 호출자에게 datetime.now(KST).replace(microsecond=0) 값을 함수 결과로 반환한다.
    return datetime.now(KST).replace(microsecond=0)


# 설명: `utc_naive_from_kst` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def utc_naive_from_kst(value: datetime) -> datetime:
    # 설명: 호출자에게 value.astimezone(timezone.utc).replace(tzinfo=None) 값을 함수 결과로 반환한다.
    return value.astimezone(timezone.utc).replace(tzinfo=None)


# 설명: `check_http` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def check_http(name: str, url: str, timeout: int = 10) -> str:
    # 설명: `started`에 `datetime.now` 호출 결과를 저장해 다음 처리에서 사용한다.
    started = datetime.now(timezone.utc)
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `req`에 `Request` 호출 결과를 저장해 다음 처리에서 사용한다.
        req = Request(url, headers={"User-Agent": "STACCATO-Auto-Resource-Report/1.0"})
        # 설명: `urlopen(req, timeout=timeout)` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
        with urlopen(req, timeout=timeout) as response:
            # 설명: `elapsed`에 `(datetime.now(timezone.utc) - started).total_seconds` 호출 결과를 저장해 다음 처리에서 사용한다.
            elapsed = (datetime.now(timezone.utc) - started).total_seconds()
            # 설명: 호출자에게 f'{name}: HTTP {response.status} / {elapsed:.3f}s / {url}' 값을 함수 결과로 반환한다.
            return f"{name}: HTTP {response.status} / {elapsed:.3f}s / {url}"
    except HTTPError as exc:
        # 설명: `elapsed`에 `(datetime.now(timezone.utc) - started).total_seconds` 호출 결과를 저장해 다음 처리에서 사용한다.
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
        # 설명: 호출자에게 f'{name}: HTTP {exc.code} / {elapsed:.3f}s / {url}' 값을 함수 결과로 반환한다.
        return f"{name}: HTTP {exc.code} / {elapsed:.3f}s / {url}"
    except URLError as exc:
        # 설명: `elapsed`에 `(datetime.now(timezone.utc) - started).total_seconds` 호출 결과를 저장해 다음 처리에서 사용한다.
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
        # 설명: 호출자에게 f'{name}: ERROR {exc.reason} / {elapsed:.3f}s / {url}' 값을 함수 결과로 반환한다.
        return f"{name}: ERROR {exc.reason} / {elapsed:.3f}s / {url}"
    except Exception as exc:
        # 설명: `elapsed`에 `(datetime.now(timezone.utc) - started).total_seconds` 호출 결과를 저장해 다음 처리에서 사용한다.
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
        # 설명: 호출자에게 f'{name}: ERROR {type(exc).__name__}: {exc} / {elapsed:.3f}s / {url}' 값을 함수 결과로 반환한다.
        return f"{name}: ERROR {type(exc).__name__}: {exc} / {elapsed:.3f}s / {url}"


# 설명: `run_command` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def run_command(command: list[str], timeout: int = 10) -> str:
    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `result`에 `subprocess.run` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        # 설명: `output`에 `(result.stdout or result.stderr or '').strip` 호출 결과를 저장해 다음 처리에서 사용한다.
        output = (result.stdout or result.stderr or "").strip()
        # 설명: 호출자에게 output if output else '-' 값을 함수 결과로 반환한다.
        return output if output else "-"
    except Exception as exc:
        # 설명: 호출자에게 f'ERROR {type(exc).__name__}: {exc}' 값을 함수 결과로 반환한다.
        return f"ERROR {type(exc).__name__}: {exc}"


# 설명: `read_meminfo` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def read_meminfo() -> str:
    # 설명: `keys`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    keys = {"MemTotal", "MemAvailable", "SwapTotal", "SwapFree"}
    # 설명: `values`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    values: dict[str, int] = {}

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `open('/proc/meminfo', 'r', encoding='utf-8')` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
        with open("/proc/meminfo", "r", encoding="utf-8") as f:
            # 설명: `f`의 각 항목을 `line`로 받아 반복 처리한다.
            for line in f:
                # 설명: `(key, raw_value)`에 `line.split` 호출 결과를 저장해 다음 처리에서 사용한다.
                key, raw_value = line.split(":", 1)
                # 설명: `key in keys` 조건 결과에 따라 실행 경로를 분기한다.
                if key in keys:
                    # 설명: `values[key]`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
                    values[key] = int(raw_value.strip().split()[0])
    except Exception as exc:
        # 설명: 호출자에게 f'meminfo read failed: {exc}' 값을 함수 결과로 반환한다.
        return f"meminfo read failed: {exc}"

    # 설명: `mib` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    def mib(key: str) -> str:
        # 설명: 호출자에게 f'{values.get(key, 0) // 1024} MiB' 값을 함수 결과로 반환한다.
        return f"{values.get(key, 0) // 1024} MiB"

    # 설명: 호출자에게 f'MemTotal={mib('MemTotal')}, MemAvailable={mib('MemAvailable')}, SwapTotal={mi... 값을 함수 결과로 반환한다.
    return (
        f"MemTotal={mib('MemTotal')}, "
        f"MemAvailable={mib('MemAvailable')}, "
        f"SwapTotal={mib('SwapTotal')}, "
        f"SwapFree={mib('SwapFree')}"
    )


# 설명: `count_connections` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def count_connections(port: int) -> str:
    # 설명: `output`에 `run_command` 호출 결과를 저장해 다음 처리에서 사용한다.
    output = run_command(["bash", "-lc", f"ss -ant | grep ':{port}' | wc -l"])
    # 설명: 호출자에게 output.strip() 값을 함수 결과로 반환한다.
    return output.strip()


# 설명: `build_report` 함수는 후속 처리에 사용할 구조를 조립하는 함수다.

def check_frontend_https(timeout: int = 10) -> str:
    started = datetime.now(timezone.utc)

    if not FRONTEND_CA_CERT_PATH.is_file():
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
        return (
            "Frontend HTTPS Health: ERROR trusted certificate file missing "
            f"/ {elapsed:.3f}s / {FRONTEND_CA_CERT_PATH}"
        )

    try:
        result = subprocess.run(
            [
                "curl",
                "--silent",
                "--show-error",
                "--output",
                "/dev/null",
                "--write-out",
                "%{http_code}",
                "--max-time",
                str(timeout),
                "--cacert",
                str(FRONTEND_CA_CERT_PATH),
                "--resolve",
                (
                    f"{FRONTEND_HEALTH_HOST}:"
                    f"{FRONTEND_HEALTH_PORT}:"
                    f"{FRONTEND_RESOLVE_IP}"
                ),
                FRONTEND_HEALTH_URL,
            ],
            capture_output=True,
            text=True,
            timeout=timeout + 2,
            check=False,
        )
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
        status = (result.stdout or "").strip() or "-"

        if result.returncode == 0 and status == "200":
            return (
                "Frontend HTTPS Health: OK / HTTP 200 "
                f"/ {elapsed:.3f}s / {FRONTEND_HEALTH_URL} "
                f"/ resolved={FRONTEND_RESOLVE_IP} / TLS=verified"
            )

        detail = (result.stderr or result.stdout or "curl failed").strip()
        detail = detail.replace("\n", " ")
        return (
            f"Frontend HTTPS Health: ERROR curl exit {result.returncode} "
            f"/ HTTP {status} / {detail} / {elapsed:.3f}s "
            f"/ {FRONTEND_HEALTH_URL}"
        )
    except Exception as exc:
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
        return (
            f"Frontend HTTPS Health: ERROR {type(exc).__name__}: {exc} "
            f"/ {elapsed:.3f}s / {FRONTEND_HEALTH_URL}"
        )


def check_database_connection() -> str:
    started = datetime.now(timezone.utc)

    try:
        value = db.session.connection().exec_driver_sql("SELECT 1").scalar_one()
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()

        if value == 1:
            return f"Database Connection: OK / SELECT 1 / {elapsed:.3f}s"

        return (
            "Database Connection: ERROR unexpected SELECT 1 result="
            f"{value!r} / {elapsed:.3f}s"
        )
    except Exception as exc:
        db.session.rollback()
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
        return (
            f"Database Connection: ERROR {type(exc).__name__} "
            f"/ {elapsed:.3f}s"
        )


def check_its_configuration() -> str:
    from flask import current_app

    its_server_url = str(
        current_app.config.get("ITS_SERVER_URL") or ""
    ).strip()

    if not its_server_url:
        return (
            "ITS Server Health: NOT_CONFIGURED "
            "/ ITS_SERVER_URL is empty"
        )

    return (
        "ITS Server Health: CONFIGURED "
        f"/ {its_server_url} "
        "/ health endpoint is not configured"
    )


def check_attachment_file_api() -> list[str]:
    """최신 미리보기 가능 첨부파일의 preview/download 응답 헤더를 점검한다."""
    from flask import current_app

    from app.models import IncidentReport, ReportAttachment, User
    from app.modules.report_upload.service import ReportUploadService

    try:
        attachment = None

        candidates = (
            ReportAttachment.query
            .order_by(ReportAttachment.id.desc())
            .limit(100)
            .all()
        )

        for candidate in candidates:
            if getattr(candidate, "deleted_at", None):
                continue

            if ReportUploadService._is_previewable_attachment(candidate):
                attachment = candidate
                break

        if attachment is None:
            return [
                "첨부파일 미리보기: NOT_AVAILABLE / image, video, PDF 첨부파일 없음",
                "첨부파일 다운로드: NOT_AVAILABLE / 점검 대상 첨부파일 없음",
            ]

        report = db.session.get(IncidentReport, attachment.report_id)
        if report is None:
            return [
                "첨부파일 미리보기: ERROR / 연결된 신고서를 찾지 못했습니다.",
                "첨부파일 다운로드: ERROR / 연결된 신고서를 찾지 못했습니다.",
            ]

        current_user = db.session.get(User, report.reporter_id)
        if current_user is None:
            return [
                "첨부파일 미리보기: ERROR / 첨부파일 소유 사용자를 찾지 못했습니다.",
                "첨부파일 다운로드: ERROR / 첨부파일 소유 사용자를 찾지 못했습니다.",
            ]

        with current_app.test_request_context("/internal/resource-status-report"):
            preview_response, preview_status = (
                ReportUploadService.get_attachment_file(
                    attachment_id=attachment.id,
                    current_user=current_user,
                    as_download=False,
                )
            )

            download_response, download_status = (
                ReportUploadService.get_attachment_file(
                    attachment_id=attachment.id,
                    current_user=current_user,
                    as_download=True,
                )
            )

        if preview_status != 200 or download_status != 200:
            return [
                f"첨부파일 미리보기: ERROR / HTTP {preview_status}",
                f"첨부파일 다운로드: ERROR / HTTP {download_status}",
            ]

        preview_type = (
            preview_response.headers.get("Content-Type") or "-"
        ).split(";", 1)[0].lower()

        preview_disposition = (
            preview_response.headers.get("Content-Disposition") or "-"
        ).split(";", 1)[0].lower()

        download_disposition = (
            download_response.headers.get("Content-Disposition") or "-"
        ).split(";", 1)[0].lower()

        preview_ok = (
            preview_type != "application/octet-stream"
            and preview_disposition == "inline"
        )

        download_ok = download_disposition == "attachment"

        return [
            (
                "첨부파일 미리보기: "
                f"{'OK' if preview_ok else 'ERROR'} / HTTP {preview_status}"
            ),
            (
                "Content-Type: "
                f"{'OK' if preview_type != 'application/octet-stream' else 'ERROR'} "
                f"/ {preview_type}"
            ),
            (
                "Content-Disposition: "
                f"{'inline' if preview_disposition == 'inline' else preview_disposition}"
            ),
            (
                "첨부파일 다운로드: "
                f"{'OK' if download_ok else 'ERROR'} / HTTP {download_status} "
                f"/ Content-Disposition: {download_disposition}"
            ),
        ]

    except Exception as exc:
        db.session.rollback()
        return [
            f"첨부파일 미리보기: ERROR / {type(exc).__name__}",
            f"첨부파일 다운로드: ERROR / {type(exc).__name__}",
        ]


def build_report(title: str, generated_at: datetime) -> str:
    # 설명: `(load1, load5, load15)`에 `os.getloadavg` 호출 결과를 저장해 다음 처리에서 사용한다.
    load1, load5, load15 = os.getloadavg()

    # 설명: `lines`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    lines = [
        title,
        "=" * len(title),
        "",
        "[생성 정보]",
        f"- 생성 시각(KST): {generated_at.strftime('%Y-%m-%d %H:%M:%S')} ({WEEKDAY_KO[generated_at.weekday()]})",
        f"- Hostname: {socket.gethostname()}",
        f"- Category: {CATEGORY}",
        f"- Visibility: {VISIBILITY}",
        "",
        "[시스템 상태]",
        f"- Load Average: {load1:.2f}, {load5:.2f}, {load15:.2f}",
        f"- Memory: {read_meminfo()}",
        f"- Flask 5000 connection count: {count_connections(5000)}",
        "",
        "[서비스 연결 상태]",
        check_frontend_https(),
        check_http("Flask Health", FLASK_HEALTH_URL),
        check_http("AI Server Health", AI_HEALTH_URL),
        check_database_connection(),
        check_its_configuration(),
        "",
        "[파일 API 점검]",
        *check_attachment_file_api(),
        "",
        "[보안 주의]",
        "- 본 리포트는 민감정보 보호를 위해 사용자 IP, 토큰, 원본 access log를 포함하지 않습니다.",
        "- 자료실은 관리자 전용 API로 제한된 상태에서만 운영하는 것을 전제로 합니다.",
        "",
    ]

    # 설명: 호출자에게 '\n'.join(lines) 값을 함수 결과로 반환한다.
    return "\n".join(lines)


# 설명: `create_report_file` 함수는 새 데이터나 리소스를 생성하는 함수다.
def create_report_file(upload_base_path: str, generated_at: datetime, title: str) -> tuple[str, str, int]:
    # 설명: `year`에 `generated_at.strftime` 호출 결과를 저장해 다음 처리에서 사용한다.
    year = generated_at.strftime("%Y")
    # 설명: `month`에 `generated_at.strftime` 호출 결과를 저장해 다음 처리에서 사용한다.
    month = generated_at.strftime("%m")

    # 설명: `report_dir`에 Path(upload_base_path) / 'resources' / 'access-logs' / year / month 표현식의 계산 결과를 저장한다.
    report_dir = Path(upload_base_path) / "resources" / "access-logs" / year / month
    # 설명: `report_dir.mkdir`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    report_dir.mkdir(parents=True, exist_ok=True)

    # 설명: `timestamp`에 `generated_at.strftime` 호출 결과를 저장해 다음 처리에서 사용한다.
    timestamp = generated_at.strftime("%Y%m%d_%H%M%S")
    # 설명: `stored_name`에 f'{timestamp}_{uuid.uuid4().hex[:8]}_access_log_report.txt' 표현식의 계산 결과를 저장한다.
    stored_name = f"{timestamp}_{uuid.uuid4().hex[:8]}_access_log_report.txt"
    # 설명: `file_path`에 report_dir / stored_name 표현식의 계산 결과를 저장한다.
    file_path = report_dir / stored_name

    # 설명: `content`에 `build_report` 호출 결과를 저장해 다음 처리에서 사용한다.
    content = build_report(title, generated_at)
    # 설명: `file_path.write_text`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    file_path.write_text(content, encoding="utf-8")
    # 설명: `os.chmod`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    os.chmod(file_path, 0o640)

    # 설명: 호출자에게 (stored_name, str(file_path), file_path.stat().st_size) 값을 함수 결과로 반환한다.
    return stored_name, str(file_path), file_path.stat().st_size


# 설명: `soft_delete_old_reports` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def soft_delete_old_reports(now_value: datetime) -> int:
    # 설명: `cutoff_utc_naive`에 `utc_naive_from_kst` 호출 결과를 저장해 다음 처리에서 사용한다.
    cutoff_utc_naive = utc_naive_from_kst(now_value - timedelta(days=KEEP_DAYS))

    # 설명: `old_reports`에 `ProjectResource.query.filter(ProjectResource.category == CATEGORY)....` 호출 결과를 저장해 다음 처리에서 사용한다.
    old_reports = (
        ProjectResource.query
        .filter(ProjectResource.category == CATEGORY)
        .filter(ProjectResource.author_name == AUTHOR_NAME)
        .filter(ProjectResource.deleted_at.is_(None))
        .filter(ProjectResource.created_at < cutoff_utc_naive)
        .all()
    )

    # 설명: `deleted_count`의 기준값 또는 기본값을 0로 설정한다.
    deleted_count = 0
    # 설명: `old_reports`의 각 항목을 `report`로 받아 반복 처리한다.
    for report in old_reports:
        # 설명: `report.deleted_at`에 `utc_naive_from_kst` 호출 결과를 저장해 다음 처리에서 사용한다.
        report.deleted_at = utc_naive_from_kst(now_value)
        # 설명: `report.updated_at`에 `utc_naive_from_kst` 호출 결과를 저장해 다음 처리에서 사용한다.
        report.updated_at = utc_naive_from_kst(now_value)
        # 설명: `deleted_count`의 기준값 또는 기본값을 1로 설정한다.
        deleted_count += 1

    # 설명: 호출자에게 deleted_count 값을 함수 결과로 반환한다.
    return deleted_count


# 설명: `main` 함수는 명령행 실행 흐름을 시작하는 함수다.
def main() -> None:
    # 설명: `app`에 `create_app` 호출 결과를 저장해 다음 처리에서 사용한다.
    app = create_app()

    # 설명: `app.app_context()` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
    with app.app_context():
        # 설명: `generated_at`에 `now_kst` 호출 결과를 저장해 다음 처리에서 사용한다.
        generated_at = now_kst()
        # 설명: `weekday`에 WEEKDAY_KO[generated_at.weekday()] 표현식의 계산 결과를 저장한다.
        weekday = WEEKDAY_KO[generated_at.weekday()]

        # 설명: `title`에 f'[접속 로그] {generated_at.strftime('%Y년 %m월 %d일')}({weekday}) {generate... 표현식의 계산 결과를 저장한다.
        title = (
            f"[접속 로그] "
            f"{generated_at.strftime('%Y년 %m월 %d일')}({weekday}) "
            f"{generated_at.strftime('%H시')} 자동 리포트"
        )

        # 설명: `upload_base_path`에 `app.config.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        upload_base_path = app.config.get("UPLOAD_BASE_PATH")
        # 설명: `not upload_base_path` 조건 결과에 따라 실행 경로를 분기한다.
        if not upload_base_path:
            # 설명: 현재 처리를 중단하고 RuntimeError('UPLOAD_BASE_PATH is not configured.')를 호출자에게 전달한다.
            raise RuntimeError("UPLOAD_BASE_PATH is not configured.")

        # 설명: `(file_name, file_path, file_size)`에 `create_report_file` 호출 결과를 저장해 다음 처리에서 사용한다.
        file_name, file_path, file_size = create_report_file(
            upload_base_path=upload_base_path,
            generated_at=generated_at,
            title=title,
        )

        # 설명: `now_utc_naive`에 `utc_naive_from_kst` 호출 결과를 저장해 다음 처리에서 사용한다.
        now_utc_naive = utc_naive_from_kst(generated_at)

        # 설명: `resource`에 `ProjectResource` 호출 결과를 저장해 다음 처리에서 사용한다.
        resource = ProjectResource(
            title=title,
            description=(
                "3시간 간격으로 자동 생성된 접속/서비스 상태 리포트입니다. "
                "한국시간 기준으로 생성되며, 민감정보는 포함하지 않습니다."
            ),
            category=CATEGORY,
            author_id=None,
            author_name=AUTHOR_NAME,
            file_name=file_name,
            file_path=file_path,
            file_type=FILE_TYPE,
            file_size=file_size,
            visibility=VISIBILITY,
            created_at=now_utc_naive,
            updated_at=now_utc_naive,
        )

        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(resource)
        # 설명: `deleted_count`에 `soft_delete_old_reports` 호출 결과를 저장해 다음 처리에서 사용한다.
        deleted_count = soft_delete_old_reports(generated_at)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        print(f"created resource_id={resource.id}")
        # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        print(f"title={title}")
        # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        print(f"file_path={file_path}")
        # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        print(f"file_size={file_size}")
        # 설명: `print`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        print(f"soft_deleted_old_reports={deleted_count}")


# 설명: `__name__ == '__main__'` 조건 결과에 따라 실행 경로를 분기한다.
if __name__ == "__main__":
    # 설명: `main`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    main()
