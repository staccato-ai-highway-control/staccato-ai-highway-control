from typing import Any


def generate_mock_report(
    incident: dict[str, Any],
    detection_logs: list[dict[str, Any]],
    memos: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    실제 LLM 모델 연결 전까지 사용하는 Mock 보고서 생성 함수.

    TODO:
    - 조원 로컬 LLM 모델 연결 시 이 함수 내부 또는 별도 provider로 분리
    - tokenizer / .pt 모델 로드
    - fallback 응답 처리
    """

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
        "model": "mock-llm-server",
        "report_title": report_title,
        "summary": summary,
        "report_content": report_content,
        "risk_reason": "Mock 단계에서는 위험도 판단 근거를 템플릿 기반으로 생성합니다.",
        "recommended_action": "CCTV 확인 후 필요 시 순찰팀 또는 담당자에게 전달합니다.",
    }
