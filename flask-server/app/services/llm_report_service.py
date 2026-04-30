def create_mock_llm_report(incident_id: int, user_id: int | None = None):
    """
    TODO:
    - incident 조회
    - detection_logs 조회
    - incident_memos 조회
    - mock report content 생성
    - llm_reports 저장
    """
    raise NotImplementedError


def get_reports_by_incident(incident_id: int):
    """
    TODO:
    - incident_id 기준 llm_reports 목록 조회
    """
    raise NotImplementedError


def get_report_by_id(report_id: int):
    """
    TODO:
    - report_id 기준 llm_report 단건 조회
    """
    raise NotImplementedError


def update_report_status(report_id: int, status: str):
    """
    TODO:
    - report status 변경
    """
    raise NotImplementedError


def soft_delete_report(report_id: int):
    """
    TODO:
    - 실제 삭제가 아니라 deleted 상태 처리
    """
    raise NotImplementedError