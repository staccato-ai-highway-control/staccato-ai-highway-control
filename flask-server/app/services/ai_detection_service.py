from datetime import datetime
from uuid import uuid4

from app.clients.ai_client import AiClient, AiClientError
from app.extensions import db
from app.models.incident_models import DetectionLog, Incident, IncidentStatusHistory
from app.models.notification_models import Notification, NotificationDelivery
from app.models.report_models import AnalysisJob, ReportUpload


class AiDetectionError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class AiDetectionService:
    @staticmethod
    def _generate_incident_code():
        now = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        suffix = uuid4().hex[:8].upper()
        return f"INC-{now}-{suffix}"

    @staticmethod
    def get_analysis_job(job_id):
        job = AnalysisJob.query.get(job_id)

        if not job:
            raise AiDetectionError("Analysis job not found.", 404)

        return job

    @staticmethod
    def run_ai_analysis(job_id, actor_user=None):
        job = AiDetectionService.get_analysis_job(job_id)

        if not job.upload_id:
            raise AiDetectionError("Analysis job has no upload_id.", 400)

        upload = ReportUpload.query.get(job.upload_id)

        if not upload:
            raise AiDetectionError("Upload not found.", 404)

        if job.job_status not in {"QUEUED", "FAILED"}:
            raise AiDetectionError("Only QUEUED or FAILED jobs can be executed.", 409)

        now = datetime.utcnow()

        job.job_status = "RUNNING"
        job.started_at = now
        job.updated_at = now
        db.session.commit()

        payload = {
            "job_id": job.id,
            "upload_id": upload.id,
            "file_path": upload.file_path,
            "upload_type": upload.upload_type,
            "cctv_id": job.cctv_id,
            "incident_id": job.incident_id,
            "request_payload_json": job.request_payload_json,
        }

        try:
            ai_result = AiClient().analyze_upload(payload)

            detected = bool(ai_result.get("detected"))
            incident = None

            if detected:
                incident = AiDetectionService._create_incident_from_ai_result(
                    job=job,
                    upload=upload,
                    ai_result=ai_result,
                    actor_user=actor_user,
                )

            AiDetectionService._create_detection_logs(
                job=job,
                upload=upload,
                incident=incident,
                ai_result=ai_result,
            )

            job.job_status = "SUCCESS"
            job.result_json = ai_result
            job.finished_at = datetime.utcnow()
            job.updated_at = datetime.utcnow()

            upload.upload_status = "ANALYZED"

            db.session.commit()

            return {
                "analysis_job": job.to_dict(),
                "upload": upload.to_dict(),
                "ai_result": ai_result,
                "incident": incident.to_dict() if incident else None,
            }

        except AiClientError as error:
            job.job_status = "FAILED"
            job.error_message = error.message
            job.finished_at = datetime.utcnow()
            job.updated_at = datetime.utcnow()
            upload.upload_status = "FAILED"

            db.session.commit()

            raise AiDetectionError(error.message, error.status_code)

        except Exception as error:
            job.job_status = "FAILED"
            job.error_message = str(error)
            job.finished_at = datetime.utcnow()
            job.updated_at = datetime.utcnow()
            upload.upload_status = "FAILED"

            db.session.commit()

            raise AiDetectionError(f"AI analysis failed: {str(error)}", 500)

    @staticmethod
    def _create_incident_from_ai_result(job, upload, ai_result, actor_user=None):
        now = datetime.utcnow()

        incident = Incident(
            incident_code=AiDetectionService._generate_incident_code(),
            cctv_id=job.cctv_id,
            incident_type=ai_result.get("incident_type") or "LANE_STOP",
            incident_status="DETECTED",
            risk_level=ai_result.get("risk_level") or "MEDIUM",
            confidence=ai_result.get("confidence"),
            stopped_duration_seconds=ai_result.get("stopped_duration_seconds"),
            detected_at=now,
            location_name=None,
            created_at=now,
        )

        db.session.add(incident)
        db.session.flush()

        job.incident_id = incident.id
        upload.incident_id = incident.id

        history = IncidentStatusHistory(
            incident_id=incident.id,
            previous_status=None,
            new_status="DETECTED",
            changed_by=actor_user.id if actor_user else None,
            change_reason="Incident created from AI analysis result.",
            created_at=now,
        )

        db.session.add(history)

        notification = Notification(
            user_id=None,
            incident_id=incident.id,
            notification_type="AI_DETECTION",
            title="AI Detection Alert",
            message=f"AI detected a possible road risk incident. Incident code: {incident.incident_code}",
            priority=incident.risk_level,
            is_read=False,
            created_at=now,
        )

        db.session.add(notification)
        db.session.flush()

        delivery = NotificationDelivery(
            notification_id=notification.id,
            user_id=None,
            delivery_channel="WEB_SOCKET",
            delivery_status="PENDING",
            created_at=now,
        )

        db.session.add(delivery)

        return incident

    @staticmethod
    def _create_detection_logs(job, upload, incident, ai_result):
        now = datetime.utcnow()
        detections = ai_result.get("detections") or []

        if not detections:
            detection_log = DetectionLog(
                incident_id=incident.id if incident else None,
                cctv_id=job.cctv_id,
                model_name=ai_result.get("model_name"),
                model_version=ai_result.get("model_version"),
                detected_class=None,
                confidence=ai_result.get("confidence"),
                bbox_json=None,
                roi_type="UNKNOWN",
                raw_result_json=ai_result,
                detected_at=now,
                created_at=now,
            )
            db.session.add(detection_log)
            return

        for detection in detections:
            detection_log = DetectionLog(
                incident_id=incident.id if incident else None,
                cctv_id=job.cctv_id,
                model_name=ai_result.get("model_name"),
                model_version=ai_result.get("model_version"),
                detected_class=detection.get("detected_class"),
                confidence=detection.get("confidence"),
                bbox_json=detection.get("bbox_json"),
                roi_type=detection.get("roi_type") or "UNKNOWN",
                movement_delta_px=detection.get("movement_delta_px"),
                stopped_duration_seconds=detection.get("stopped_duration_seconds"),
                frame_timestamp_ms=detection.get("frame_timestamp_ms"),
                raw_result_json=ai_result,
                detected_at=now,
                created_at=now,
            )

            db.session.add(detection_log)
