# app/modules/ai_gateway/service.py

import os
import requests
from flask import current_app


class AIGatewayService:
    @staticmethod
    def request_analysis(report_id, file_path):
        """
        신고 첨부파일을 AI-vm /detect API로 전달합니다.
        반환값:
            (True, result_json)  - AI 분석 요청 성공
            (False, error_json)  - 파일 없음 또는 AI 요청 실패
        """

        ai_server_url = (
            current_app.config.get("AI_SERVER_URL")
            or os.getenv("AI_SERVER_URL")
            or "http://192.168.0.186:8001"
        )

        detect_url = f"{ai_server_url.rstrip('/')}/detect"

        current_app.logger.info(
            "[AI-Gateway] request_analysis report_id=%s file_path=%s detect_url=%s",
            report_id,
            file_path,
            detect_url,
        )

        if not file_path or not os.path.exists(file_path):
            current_app.logger.error(
                "[AI-Gateway] file not found. report_id=%s file_path=%s",
                report_id,
                file_path,
            )
            return False, {
                "status": "file_not_found",
                "message": f"File not found: {file_path}",
            }

        try:
            with open(file_path, "rb") as f:
                files = {
                    "file": (
                        os.path.basename(file_path),
                        f,
                        "application/octet-stream",
                    )
                }
                data = {
                    "report_id": str(report_id),
                }

                response = requests.post(
                    detect_url,
                    files=files,
                    data=data,
                    timeout=30,
                )

            response.raise_for_status()

            result = response.json()

            current_app.logger.info(
                "[AI-Gateway] AI detect success. report_id=%s count=%s",
                report_id,
                result.get("count"),
            )

            return True, result

        except requests.RequestException as e:
            current_app.logger.exception(
                "[AI-Gateway] AI detect request failed. report_id=%s",
                report_id,
            )
            return False, {
                "status": "ai_request_failed",
                "message": str(e),
            }

        except ValueError as e:
            current_app.logger.exception(
                "[AI-Gateway] AI response json parse failed. report_id=%s",
                report_id,
            )
            return False, {
                "status": "ai_response_parse_failed",
                "message": str(e),
            }
