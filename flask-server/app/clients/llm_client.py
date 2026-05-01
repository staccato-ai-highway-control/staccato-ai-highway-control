import os
from typing import Any

import requests


def generate_incident_report(
    incident: dict[str, Any],
    detection_logs: list[dict[str, Any]],
    memos: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Incident 기반 LLM 보고서 생성 진입점.

    LLM_PROVIDER 값에 따라 생성 방식을 분기한다.

    - MOCK: Flask 내부 Mock 보고서 생성
    - LLM_SERVER: 별도 llm-server 호출
    - OPENAI: 추후 OpenAI API 연동용
    """
    provider = os.getenv("LLM_PROVIDER", "MOCK").upper()

    if provider == "LLM_SERVER":
        return _generate_with_llm_server(
            incident=incident,
            detection_logs=detection_logs,
            memos=memos,
        )

    if provider == "OPENAI":
        return _generate_with_openai_placeholder(
            incident=incident,
            detection_logs=detection_logs,
            memos=memos,
        )

    return _generate_with_mock(
        incident=incident,
        detection_logs=detection_logs,
        memos=memos,
    )


def generate_mock_incident_report(
    incident: dict[str, Any],
    detection_logs: list[dict[str, Any]],
    memos: list[dict[str, Any]],
) -> str:
    """
    기존 Scaffold와의 호환성을 위한 Mock 문자열 반환 함수.

    후속 구현에서는 generate_incident_report() 사용을 권장한다.
    """
    result = _generate_with_mock(
        incident=incident,
        detection_logs=detection_logs,
        memos=memos,
    )

    return result["report_content"]


def _generate_with_mock(
    incident: dict[str, Any],
    detection_logs: list[dict[str, Any]],
    memos: list[dict[str, Any]],
) -> dict[str, Any]:
    incident_type = incident.get("incident_type", "UNKNOWN")
    risk_level = incident.get("risk_level", "UNKNOWN")
    status = incident.get("status", "UNKNOWN")

    report_title = f"{incident_type} 사고 보고서 초안"

    summary = (
        f"AI 탐지 결과 {incident_type} 유형의 사건이 감지되었습니다. "
        f"현재 위험도는 {risk_level}, 처리 상태는 {status}입니다."
    )

    report_content = f"""
1. 사고 개요
- 사건 유형: {incident_type}
- 위험도: {risk_level}
- 현재 상태: {status}

2. AI 탐지 결과
- 탐지 로그 수: {len(detection_logs)}

3. 관제 메모
- 메모 수: {len(memos)}

4. 조치 필요 사항
- 관제자는 CCTV 화면을 확인하고 필요 시 담당자에게 전달해야 합니다.

※ 본 보고서는 실제 LLM 모델 연결 전 Mock 데이터로 생성된 초안입니다.
""".strip()

    return {
        "status": "success",
        "provider": "MOCK",
        "model": "mock-flask-client",
        "report_title": report_title,
        "summary": summary,
        "report_content": report_content,
        "risk_reason": "Mock 단계에서는 위험도 판단 근거를 템플릿 기반으로 생성합니다.",
        "recommended_action": "CCTV 확인 후 필요 시 순찰팀 또는 담당자에게 전달합니다.",
    }


def _generate_with_llm_server(
    incident: dict[str, Any],
    detection_logs: list[dict[str, Any]],
    memos: list[dict[str, Any]],
) -> dict[str, Any]:
    llm_server_url = os.getenv("LLM_SERVER_URL", "http://llm-server:8000").rstrip("/")
    timeout_seconds = int(os.getenv("LLM_SERVER_TIMEOUT_SECONDS", "30"))

    payload = {
        "incident": incident,
        "detection_logs": detection_logs,
        "memos": memos,
    }

    try:
        response = requests.post(
            f"{llm_server_url}/llm/reports/generate",
            json=payload,
            timeout=timeout_seconds,
        )
        response.raise_for_status()
        return response.json()

    except requests.RequestException as exc:
        fallback = _generate_with_mock(
            incident=incident,
            detection_logs=detection_logs,
            memos=memos,
        )
        fallback["provider"] = "MOCK_FALLBACK"
        fallback["error_message"] = str(exc)
        return fallback


def _generate_with_openai_placeholder(
    incident: dict[str, Any],
    detection_logs: list[dict[str, Any]],
    memos: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    추후 OpenAI API 연동을 위한 placeholder.

    현재 PR에서는 실제 OpenAI API를 호출하지 않는다.
    """
    fallback = _generate_with_mock(
        incident=incident,
        detection_logs=detection_logs,
        memos=memos,
    )
    fallback["provider"] = "OPENAI_PLACEHOLDER"
    fallback["model"] = os.getenv("OPENAI_MODEL", "not-configured")
    return fallback
