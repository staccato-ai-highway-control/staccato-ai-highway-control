from typing import Any


def generate_mock_chatbot_answer(payload: dict[str, Any]) -> dict:
    incident_context = payload.get("incident_context") or {}

    incident_type = incident_context.get("incident_type", "LANE_STOP")
    risk_level = incident_context.get("risk_level", "HIGH")
    location = incident_context.get("location", "위치 정보 없음")
    stopped_seconds = incident_context.get("stopped_seconds")

    if incident_type == "SHOULDER_STOP":
        answer = (
            f"이 사고는 갓길 정차로 판단됩니다. 위치는 {location}이며, "
            f"현재 위험도는 {risk_level}입니다. 갓길 위치, 정차 지속 시간, "
            "후속 차량 접근 여부를 함께 확인해야 합니다."
        )
    else:
        answer = (
            f"이 사고는 주행 차로 내 정차로 판단됩니다. 위치는 {location}이며, "
            f"현재 위험도는 {risk_level}입니다. "
            "정차 지속 시간, ROI 위치, 탐지 신뢰도, 후속 차량 흐름을 확인해야 합니다."
        )

    if stopped_seconds is not None:
        answer += f" 현재 정차 지속 시간은 약 {stopped_seconds}초입니다."

    return {
        "success": True,
        "message": "Mock chatbot answer generated",
        "data": {
            "answer": answer,
            "llm_model": "mock-llm",
            "llm_provider": "MOCK",
            "prompt_version": "v1",
        },
    }


def generate_mock_report(payload: dict[str, Any]) -> dict:
    incident_id = payload.get("incident_id")
    incident_type = payload.get("incident_type", "LANE_STOP")
    risk_level = payload.get("risk_level", "HIGH")
    location = payload.get("location", "위치 정보 없음")
    summary = payload.get("summary", "AI-X 기반 정차 의심 사고가 감지되었습니다.")

    report_title = f"사고 보고서 초안 - 사고 {incident_id}" if incident_id else "사고 보고서 초안"

    report_content = (
        f"사고 유형: {incident_type}\n"
        f"위험도: {risk_level}\n"
        f"위치: {location}\n\n"
        f"요약: {summary}\n\n"
        "조치 권고: 관제자는 CCTV 영상과 AI 탐지 근거를 확인하고, "
        "필요 시 담당자 배정 및 후속 조치를 진행해야 합니다."
    )

    return {
        "success": True,
        "message": "Mock report generated",
        "data": {
            "report_title": report_title,
            "summary": summary,
            "report_content": report_content,
            "llm_model": "mock-llm",
            "llm_provider": "MOCK",
            "prompt_version": "v1",
        },
    }


def generate_mock_risk_summary(payload: dict[str, Any]) -> dict:
    risk_level = payload.get("risk_level", "HIGH")
    incident_type = payload.get("incident_type", "LANE_STOP")
    stopped_seconds = payload.get("stopped_seconds")

    if stopped_seconds is not None:
        reason = f"정차 지속 시간이 {stopped_seconds}초로 확인되어 위험도 판단 근거에 포함되었습니다."
    else:
        reason = "정차 지속 시간, ROI 위치, 차량 흐름 정보를 기준으로 위험도를 판단해야 합니다."

    return {
        "success": True,
        "message": "Mock risk summary generated",
        "data": {
            "summary": f"{incident_type} 사고의 현재 위험도는 {risk_level}입니다.",
            "risk_reason": reason,
            "llm_model": "mock-llm",
            "llm_provider": "MOCK",
            "prompt_version": "v1",
        },
    }
