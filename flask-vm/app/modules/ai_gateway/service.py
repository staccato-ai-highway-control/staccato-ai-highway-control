from app.clients.ai_client import request_ai_analysis


class AIGatewayService:
    @staticmethod
    def request_analysis(report_id, file_path):
        payload = AIGatewayService._build_analysis_payload(report_id, file_path)
        response = request_ai_analysis(payload)
        return bool(response.get("success")), response

    @staticmethod
    def _build_analysis_payload(report_id, file_path):
        payload = {
            "analysis_job_id": 0,
            "report_id": int(report_id),
            "attachment_id": 0,
            "file_path": file_path,
        }

        try:
            from app.models import IncidentReport, ReportAnalysisJob, ReportAttachment

            report = IncidentReport.query.get(report_id)
            attachment = (
                ReportAttachment.query
                .filter_by(report_id=report_id, file_path=file_path)
                .order_by(ReportAttachment.id.desc())
                .first()
            )

            job_query = ReportAnalysisJob.query.filter_by(report_id=report_id)
            if attachment is not None:
                payload["attachment_id"] = int(attachment.id)
                job_query = job_query.filter_by(attachment_id=attachment.id)

            job = job_query.order_by(ReportAnalysisJob.id.desc()).first()
            if job is not None:
                payload["analysis_job_id"] = int(job.id)
                payload["thresholds"] = {
                    "confidence": float(job.confidence_threshold or 0.6),
                    "lane_stop_seconds": int(job.lane_stop_threshold or 5),
                    "shoulder_stop_seconds": int(job.shoulder_stop_threshold or 10),
                    "movement_threshold_px": int(job.movement_threshold_px or 15),
                }

            if report is not None and report.cctv_id is not None:
                payload["cctv_id"] = int(report.cctv_id)
        except Exception:
            pass

        return payload
