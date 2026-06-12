"""socketio 도메인의 Socket.IO 송신 payload와 전파 함수를 제공한다.

실시간 이벤트 형식을 중앙화하여 HTTP 처리와 백그라운드 작업이 같은 계약을 사용하게 한다."""

# 설명: __future__에서 annotations 이름을 가져와 아래 로직에서 재사용한다.
from __future__ import annotations

# 설명: datetime에서 datetime, timezone 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime, timezone

# 설명: flask에서 current_app 이름을 가져와 아래 로직에서 재사용한다.
from flask import current_app

# 설명: app.extensions에서 socketio 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import socketio


# 설명: `_utc_now_iso` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _utc_now_iso() -> str:
    # 설명: 호출자에게 datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00',... 값을 함수 결과로 반환한다.
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


# 설명: `_normalize_status` 함수는 입력 값을 일관된 형식으로 정규화하는 함수다.
def _normalize_status(job_status: str | None) -> str:
    # 설명: 호출자에게 str(job_status or '').strip().upper() 값을 함수 결과로 반환한다.
    return str(job_status or "").strip().upper()


# 설명: `_severity_for_status` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _severity_for_status(job_status: str | None) -> str:
    # 설명: `status`에 `_normalize_status` 호출 결과를 저장해 다음 처리에서 사용한다.
    status = _normalize_status(job_status)

    # 설명: `status == 'COMPLETED'` 조건 결과에 따라 실행 경로를 분기한다.
    if status == "COMPLETED":
        # 설명: 호출자에게 'success' 값을 함수 결과로 반환한다.
        return "success"

    # 설명: `status == 'FAILED'` 조건 결과에 따라 실행 경로를 분기한다.
    if status == "FAILED":
        # 설명: 호출자에게 'error' 값을 함수 결과로 반환한다.
        return "error"

    # 설명: 호출자에게 'info' 값을 함수 결과로 반환한다.
    return "info"


# 설명: `_message_for_status` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def _message_for_status(job_status: str | None) -> str:
    # 설명: `status`에 `_normalize_status` 호출 결과를 저장해 다음 처리에서 사용한다.
    status = _normalize_status(job_status)

    # 설명: `messages`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    messages = {
        "QUEUED": "분석 작업이 대기열에 등록되었습니다.",
        "STARTED": "AI 분석이 시작되었습니다.",
        "RUNNING": "AI 분석이 진행 중입니다.",
        "PROCESSING": "AI 분석이 진행 중입니다.",
        "COMPLETED": "AI 분석이 완료되었습니다.",
        "FAILED": "AI 분석에 실패했습니다.",
    }

    # 설명: 호출자에게 messages.get(status, '분석 작업 상태가 업데이트되었습니다.') 값을 함수 결과로 반환한다.
    return messages.get(status, "분석 작업 상태가 업데이트되었습니다.")


# 설명: `build_report_analysis_payload` 함수는 후속 처리에 사용할 구조를 조립하는 함수다.
def build_report_analysis_payload(job) -> dict:
    """ORM job에서 브라우저가 소비할 작은 실시간 이벤트 문서를 만든다.

    대용량 detections/result_summary는 이벤트에 싣지 않고 job_id만 전달해 REST 조회로 분리한다.
    """
    # 설명: `job_status`에 `getattr` 호출 결과를 저장해 다음 처리에서 사용한다.
    job_status = getattr(job, "job_status", None)

    # 설명: 호출자에게 {'type': 'REPORT_ANALYSIS_UPDATED', 'report_id': getattr(job, 'report_id', None... 값을 함수 결과로 반환한다.
    return {
        "type": "REPORT_ANALYSIS_UPDATED",
        "report_id": getattr(job, "report_id", None),
        "job_id": getattr(job, "id", None),
        "job_status": _normalize_status(job_status),
        "analysis_type": getattr(job, "analysis_type", None),
        "message": _message_for_status(job_status),
        "severity": _severity_for_status(job_status),
        "updated_at": _utc_now_iso(),
    }


# 설명: `emit_report_analysis_updated` 함수는 실시간 이벤트를 클라이언트에 전송하는 함수다.
def emit_report_analysis_updated(job) -> None:
    """
    Emit report analysis status update.

    This function is intentionally fail-safe:
    socket emit failure must not break the report analysis API.
    Call this only after DB commit.
    """
    # 설명: `payload`에 `build_report_analysis_payload` 호출 결과를 저장해 다음 처리에서 사용한다.
    payload = build_report_analysis_payload(job)
    # 설명: `report_id`에 `payload.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    report_id = payload.get("report_id")
    # 설명: `job_id`에 `payload.get` 호출 결과를 저장해 다음 처리에서 사용한다.
    job_id = payload.get("job_id")

    # 설명: `not report_id` 조건 결과에 따라 실행 경로를 분기한다.
    if not report_id:
        # 설명: `current_app.logger.warning`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        current_app.logger.warning(
            "Skip report_analysis_updated emit: missing report_id. job_id=%s",
            job_id,
        )
        # 설명: 현재 함수의 처리를 종료하고 호출자에게 별도 값을 반환하지 않는다.
        return

    # report:<id> 룸에 참가한 사용자에게만 해당 신고의 상태 변경을 보낸다.
    room = f"report:{report_id}"

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `socketio.emit`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        socketio.emit("report_analysis_updated", payload, room=room)
    except Exception:
        # 설명: `current_app.logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        current_app.logger.exception(
            "Failed to emit report_analysis_updated. report_id=%s job_id=%s",
            report_id,
            job_id,
        )


# 설명: `emit_incident_created` 함수는 실시간 이벤트를 클라이언트에 전송하는 함수다.
def emit_incident_created(payload: dict) -> bool:
    """
    Emit realtime incident creation event.

    This function is intentionally fail-safe:
    socket emit failure must not break incident DB persistence or API response.
    """
    # 설명: `incident_id`에 payload.get('incident_id') if isinstance(payload, dict) else None 표현식의 계산 결과를 저장한다.
    incident_id = payload.get("incident_id") if isinstance(payload, dict) else None

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `socketio.emit`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        socketio.emit("incident.created", payload)
        # 설명: 호출자에게 True 값을 함수 결과로 반환한다.
        return True
    except Exception:
        # 설명: `current_app.logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        current_app.logger.exception(
            "Failed to emit incident.created. incident_id=%s",
            incident_id,
        )
        # 설명: 호출자에게 False 값을 함수 결과로 반환한다.
        return False


# 설명: `emit_report_created` 함수는 실시간 이벤트를 클라이언트에 전송하는 함수다.
def emit_report_created(payload: dict) -> bool:
    """
    Emit realtime report creation notification.
    """
    # 설명: flask에서 current_app 이름을 가져와 아래 로직에서 재사용한다.
    from flask import current_app

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `socketio.emit`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        socketio.emit("report.created", payload)
        # 설명: `socketio.emit`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        socketio.emit("notification.created", payload)
        # 설명: 호출자에게 True 값을 함수 결과로 반환한다.
        return True
    except Exception:
        # 설명: `current_app.logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        current_app.logger.exception(
            "Failed to emit report.created. report_id=%s",
            payload.get("report_id"),
        )
        # 설명: 호출자에게 False 값을 함수 결과로 반환한다.
        return False
