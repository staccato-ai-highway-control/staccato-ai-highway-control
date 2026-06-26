from __future__ import annotations

import os
import sys
import uuid
import socket
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from zoneinfo import ZoneInfo

# Ensure flask-vm package path
BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.models import ProjectResource  # noqa: E402


KST = ZoneInfo("Asia/Seoul")
AUTHOR_NAME = "STACCATO 자동 점검"
CATEGORY = "ACCESS_LOG"
VISIBILITY = "SUPER_ADMIN_ONLY"
FILE_TYPE = "txt"
KEEP_DAYS = 14

WEEKDAY_KO = {
    0: "월",
    1: "화",
    2: "수",
    3: "목",
    4: "금",
    5: "토",
    6: "일",
}


def now_kst() -> datetime:
    return datetime.now(KST).replace(microsecond=0)


def utc_naive_from_kst(value: datetime) -> datetime:
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def check_http(name: str, url: str, timeout: int = 10) -> str:
    started = datetime.now(timezone.utc)
    try:
        req = Request(url, headers={"User-Agent": "STACCATO-Auto-Resource-Report/1.0"})
        with urlopen(req, timeout=timeout) as response:
            elapsed = (datetime.now(timezone.utc) - started).total_seconds()
            return f"{name}: HTTP {response.status} / {elapsed:.3f}s / {url}"
    except HTTPError as exc:
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
        return f"{name}: HTTP {exc.code} / {elapsed:.3f}s / {url}"
    except URLError as exc:
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
        return f"{name}: ERROR {exc.reason} / {elapsed:.3f}s / {url}"
    except Exception as exc:
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
        return f"{name}: ERROR {type(exc).__name__}: {exc} / {elapsed:.3f}s / {url}"


def run_command(command: list[str], timeout: int = 10) -> str:
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        output = (result.stdout or result.stderr or "").strip()
        return output if output else "-"
    except Exception as exc:
        return f"ERROR {type(exc).__name__}: {exc}"


def read_meminfo() -> str:
    keys = {"MemTotal", "MemAvailable", "SwapTotal", "SwapFree"}
    values: dict[str, int] = {}

    try:
        with open("/proc/meminfo", "r", encoding="utf-8") as f:
            for line in f:
                key, raw_value = line.split(":", 1)
                if key in keys:
                    values[key] = int(raw_value.strip().split()[0])
    except Exception as exc:
        return f"meminfo read failed: {exc}"

    def mib(key: str) -> str:
        return f"{values.get(key, 0) // 1024} MiB"

    return (
        f"MemTotal={mib('MemTotal')}, "
        f"MemAvailable={mib('MemAvailable')}, "
        f"SwapTotal={mib('SwapTotal')}, "
        f"SwapFree={mib('SwapFree')}"
    )


def count_connections(port: int) -> str:
    output = run_command(["bash", "-lc", f"ss -ant | grep ':{port}' | wc -l"])
    return output.strip()


def build_report(title: str, generated_at: datetime) -> str:
    load1, load5, load15 = os.getloadavg()

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
        "[서비스 HTTP 점검]",
        check_http("Frontend root", "http://192.168.0.188:3001/"),
        check_http("Frontend dashboard", "http://192.168.0.188:3001/dashboard"),
        check_http("Frontend resources page", "http://192.168.0.188:3001/resources"),
        check_http("Frontend notifications", "http://192.168.0.188:3001/notifications"),
        check_http("Frontend reports", "http://192.168.0.188:3001/reports"),
        check_http("Flask events API", "http://127.0.0.1:5000/api/events"),
        check_http("Flask resources API, auth expected", "http://127.0.0.1:5000/api/resources"),
        "",
        "[보안 주의]",
        "- 본 리포트는 민감정보 보호를 위해 사용자 IP, 토큰, 원본 access log를 포함하지 않습니다.",
        "- 자료실은 관리자 전용 API로 제한된 상태에서만 운영하는 것을 전제로 합니다.",
        "",
    ]

    return "\n".join(lines)


def create_report_file(upload_base_path: str, generated_at: datetime, title: str) -> tuple[str, str, int]:
    year = generated_at.strftime("%Y")
    month = generated_at.strftime("%m")

    report_dir = Path(upload_base_path) / "resources" / "access-logs" / year / month
    report_dir.mkdir(parents=True, exist_ok=True)

    timestamp = generated_at.strftime("%Y%m%d_%H%M%S")
    stored_name = f"{timestamp}_{uuid.uuid4().hex[:8]}_access_log_report.txt"
    file_path = report_dir / stored_name

    content = build_report(title, generated_at)
    file_path.write_text(content, encoding="utf-8")
    os.chmod(file_path, 0o640)

    return stored_name, str(file_path), file_path.stat().st_size


def soft_delete_old_reports(now_value: datetime) -> int:
    cutoff_utc_naive = utc_naive_from_kst(now_value - timedelta(days=KEEP_DAYS))

    old_reports = (
        ProjectResource.query
        .filter(ProjectResource.category == CATEGORY)
        .filter(ProjectResource.author_name == AUTHOR_NAME)
        .filter(ProjectResource.deleted_at.is_(None))
        .filter(ProjectResource.created_at < cutoff_utc_naive)
        .all()
    )

    deleted_count = 0
    for report in old_reports:
        report.deleted_at = utc_naive_from_kst(now_value)
        report.updated_at = utc_naive_from_kst(now_value)
        deleted_count += 1

    return deleted_count


def main() -> None:
    app = create_app()

    with app.app_context():
        generated_at = now_kst()
        weekday = WEEKDAY_KO[generated_at.weekday()]

        title = (
            f"[접속 로그] "
            f"{generated_at.strftime('%Y년 %m월 %d일')}({weekday}) "
            f"{generated_at.strftime('%H시')} 자동 리포트"
        )

        upload_base_path = app.config.get("UPLOAD_BASE_PATH")
        if not upload_base_path:
            raise RuntimeError("UPLOAD_BASE_PATH is not configured.")

        file_name, file_path, file_size = create_report_file(
            upload_base_path=upload_base_path,
            generated_at=generated_at,
            title=title,
        )

        now_utc_naive = utc_naive_from_kst(generated_at)

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

        db.session.add(resource)
        deleted_count = soft_delete_old_reports(generated_at)
        db.session.commit()

        print(f"created resource_id={resource.id}")
        print(f"title={title}")
        print(f"file_path={file_path}")
        print(f"file_size={file_size}")
        print(f"soft_deleted_old_reports={deleted_count}")


if __name__ == "__main__":
    main()
