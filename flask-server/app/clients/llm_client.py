def generate_mock_incident_report(
    incident: dict,
    detection_logs: list[dict],
    memos: list[dict],
) -> str:
    """
    실제 LLM API 연결 전까지 사용하는 Mock 보고서 생성 함수.

    TODO:
    - 사건 기본 정보 요약
    - 탐지 로그 요약
    - 사건 메모 요약
    - 위험도 판단 근거 생성
    - 조치 권고사항 생성
    """
    return f"""
[Mock LLM Report]

사건 ID: {incident.get("id")}
사건 유형: {incident.get("incident_type")}
위험도: {incident.get("risk_level")}
상태: {incident.get("status")}

탐지 로그 수: {len(detection_logs)}
메모 수: {len(memos)}

요약:
해당 보고서는 실제 LLM API 연결 전 Mock 데이터로 생성된 보고서입니다.

TODO:
- 사건 발생 위치 요약
- 탐지 근거 요약
- 위험도 판단 근거 작성
- 조치 권고사항 작성
""".strip()