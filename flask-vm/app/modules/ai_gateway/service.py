"""ai gateway 도메인의 핵심 비즈니스 규칙과 데이터 처리를 구현한다.

권한 검증, 트랜잭션 경계, 외부 연동 및 응답 직렬화를 라우트와 분리해 관리한다."""

# app/modules/ai_gateway/service.py

import os
# 설명: requests 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import requests
# 설명: flask에서 current_app 이름을 가져와 아래 로직에서 재사용한다.
from flask import current_app


# 설명: `AIGatewayService` 클래스를 정의하고 기본 object의 동작 또는 계약을 확장한다.
class AIGatewayService:
    # 설명: `request_analysis` 함수는 외부 처리 또는 비동기 작업을 요청하는 함수다.
    @staticmethod
    def request_analysis(
        report_id,
        file_path,
        cctv_id=None,
        camera_id=None,
        model_id=None,
        comparison_run_id=None,
        timeout_seconds=None,
    ):
        """
        신고 첨부파일을 AI-vm /detect API로 multipart/form-data 전송합니다.

        ``file`` 파트에는 바이너리 스트림, 일반 form 필드에는 report_id/cctv_id/camera_id를
        문자열로 넣는다. AI 서버의 JSON 본문은 dict로 파싱해 서비스의 result_summary에
        저장할 수 있도록 반환하며, HTTP/JSON 오류도 예외 대신 구조화된 dict로 바꾼다.
        반환값:
            (True, result_json)  - AI 분석 요청 성공
            (False, error_json)  - 파일 없음 또는 AI 요청 실패
        """

        # 설명: `ai_server_url`에 current_app.config.get('AI_SERVER_URL') or os.getenv('AI_SERVER_URL')... 표현식의 계산 결과를 저장한다.
        ai_server_url = (
            current_app.config.get("AI_SERVER_URL")
            or os.getenv("AI_SERVER_URL")
            or "http://192.168.0.186:5001"
        )

        # 설명: `detect_url`에 f'{ai_server_url.rstrip('/')}/detect' 표현식의 계산 결과를 저장한다.
        detect_url = f"{ai_server_url.rstrip('/')}/detect"

        requested_timeout_seconds = timeout_seconds

        # AI-vm /detect는 내부 Bearer 인증을 요구한다.
        internal_api_token = str(
            current_app.config.get("INTERNAL_API_TOKEN")
            or os.getenv("INTERNAL_API_TOKEN", "")
        ).strip()

        if not internal_api_token:
            return False, {
                "status": "internal_api_token_missing",
                "message": "INTERNAL_API_TOKEN is required for AI report analysis.",
            }

        # 설명: `current_app.logger.info`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        current_app.logger.info(
            "[AI-Gateway] request_analysis report_id=%s file_path=%s detect_url=%s cctv_id=%s camera_id=%s",
            report_id,
            file_path,
            detect_url,
            cctv_id,
            camera_id,
        )

        # 설명: `not file_path or not os.path.exists(file_path)` 조건 결과에 따라 실행 경로를 분기한다.
        if not file_path or not os.path.exists(file_path):
            # 설명: `current_app.logger.error`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            current_app.logger.error(
                "[AI-Gateway] file not found. report_id=%s file_path=%s",
                report_id,
                file_path,
            )
            # 설명: 호출자에게 (False, {'status': 'file_not_found', 'message': f'File not found: {file_path}'}) 값을 함수 결과로 반환한다.
            return False, {
                "status": "file_not_found",
                "message": f"File not found: {file_path}",
            }

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `open(file_path, 'rb')` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
            with open(file_path, "rb") as f:
                # requests가 multipart boundary와 Content-Disposition을 생성한다.
                files = {
                    "file": (
                        os.path.basename(file_path),
                        f,
                        "application/octet-stream",
                    )
                }
                # 설명: `data`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
                data = {
                    "report_id": str(report_id),
                }

                # 설명: `cctv_id is not None` 조건 결과에 따라 실행 경로를 분기한다.
                if cctv_id is not None:
                    # 설명: `data['cctv_id']`에 `str` 호출 결과를 저장해 다음 처리에서 사용한다.
                    data["cctv_id"] = str(cctv_id)

                # 설명: `camera_id` 조건 결과에 따라 실행 경로를 분기한다.
                if camera_id:
                    # 설명: `data['camera_id']`에 `str` 호출 결과를 저장해 다음 처리에서 사용한다.
                    data["camera_id"] = str(camera_id)

                if model_id:
                    data["model_id"] = str(model_id)

                if comparison_run_id:
                    data["comparison_run_id"] = str(comparison_run_id)

                # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
                try:
                    # 설명: `timeout_seconds`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
                    timeout_seconds = int(
                        current_app.config.get("AI_DETECT_TIMEOUT_SECONDS")
                        or os.getenv("AI_DETECT_TIMEOUT_SECONDS", "30")
                    )
                except (TypeError, ValueError):
                    # 설명: `timeout_seconds`의 기준값 또는 기본값을 30로 설정한다.
                    timeout_seconds = 30

                # 설명: `timeout_seconds`에 `max` 호출 결과를 저장해 다음 처리에서 사용한다.
                timeout_seconds = max(1, timeout_seconds)

                if requested_timeout_seconds is not None:
                    try:
                        timeout_seconds = max(
                            1,
                            int(requested_timeout_seconds),
                        )
                    except (TypeError, ValueError):
                        return False, {
                            "status": "invalid_ai_detect_timeout",
                            "message": (
                                "comparison analysis timeout must be "
                                "a positive integer."
                            ),
                        }

                # 설명: `response`에 `requests.post` 호출 결과를 저장해 다음 처리에서 사용한다.
                headers = {
                    "Authorization": f"Bearer {internal_api_token}",
                }

                response = requests.post(
                    detect_url,
                    files=files,
                    data=data,
                    headers=headers,
                    timeout=timeout_seconds,
                )

            # 설명: `response.raise_for_status`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            response.raise_for_status()

            # 네트워크의 JSON 객체를 Python dict/list/scalar 구조로 역직렬화한다.
            result = response.json()

            # 설명: `current_app.logger.info`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            current_app.logger.info(
                "[AI-Gateway] AI detect success. report_id=%s count=%s",
                report_id,
                result.get("count"),
            )

            # 설명: 호출자에게 (True, result) 값을 함수 결과로 반환한다.
            return True, result

        except requests.RequestException as e:
            # 설명: `current_app.logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            current_app.logger.exception(
                "[AI-Gateway] AI detect request failed. report_id=%s",
                report_id,
            )
            # 설명: 호출자에게 (False, {'status': 'ai_request_failed', 'message': str(e)}) 값을 함수 결과로 반환한다.
            return False, {
                "status": "ai_request_failed",
                "message": str(e),
            }

        except ValueError as e:
            # 설명: `current_app.logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            current_app.logger.exception(
                "[AI-Gateway] AI response json parse failed. report_id=%s",
                report_id,
            )
            # 설명: 호출자에게 (False, {'status': 'ai_response_parse_failed', 'message': str(e)}) 값을 함수 결과로 반환한다.
            return False, {
                "status": "ai_response_parse_failed",
                "message": str(e),
            }
