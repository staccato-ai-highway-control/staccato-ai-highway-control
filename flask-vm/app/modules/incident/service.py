import logging
import os
import uuid
from datetime import datetime

from app.extensions import db
from app.models import IncidentReport, ReportAnalysisJob, ReportAttachment
from app.modules.ai_gateway.service import AIGatewayService


logger = logging.getLogger(__name__)


class IncidentService:
    @staticmethod
    def _generate_report_code(now):
        timestamp = now.strftime("%Y%m%d%H%M%S")
        unique_suffix = uuid.uuid4().hex[:8].upper()
        return f"REP-{timestamp}-{unique_suffix}"

    @staticmethod
    def create_incident(data, file_info, user_id):
        now = datetime.now()
        committed = False

        try:
            report = IncidentReport(
                report_code=IncidentService._generate_report_code(now),
                report_type=data.get("report_type", "ACCIDENT"),
                upload_purpose="ANALYSIS",
                report_source_type="MOBILE_UPLOAD",
                title=data.get("title") or data.get("subject") or "Mobile Upload Report",
                description=data.get("description", ""),
                reporter_id=user_id,
                status="PENDING",
                priority="MEDIUM",
                is_demo_data=0,
                submitted_at=now,
                created_at=now,
            )
            db.session.add(report)
            db.session.flush()

            original_filename = (
                file_info.get("original_filename")
                or file_info.get("filename")
                or "uploaded_file"
            )
            stored_filename = (
                file_info.get("stored_filename")
                or file_info.get("filename")
                or original_filename
            )
            file_path = (
                file_info.get("file_path")
                or file_info.get("object_key")
                or stored_filename
            )

            attachment = ReportAttachment(
                report_id=report.id,
                file_type=file_info.get("file_type", "ETC"),
                original_filename=original_filename,
                stored_filename=stored_filename,
                storage_type=file_info.get("storage_type", "LOCAL"),
                file_path=file_path,
                file_url=file_info.get("file_url"),
                thumbnail_url=file_info.get("thumbnail_url"),
                file_hash=file_info.get("file_hash", "unknown"),
                file_size=file_info.get("file_size", 0),
                mime_type=file_info.get("mime_type") or file_info.get("content_type") or "application/octet-stream",
                scan_status=file_info.get("scan_status", "PENDING"),
                is_private=file_info.get("is_private", 1),
                download_count=0,
                access_count=0,
                duration_seconds=file_info.get("duration_seconds"),
                fps=file_info.get("fps"),
                resolution_width=file_info.get("resolution_width"),
                resolution_height=file_info.get("resolution_height"),
                exif_latitude=file_info.get("exif_latitude"),
                exif_longitude=file_info.get("exif_longitude"),
                recorded_at=file_info.get("recorded_at"),
                uploaded_by=user_id,
                uploaded_at=now,
                created_at=now,
            )
            db.session.add(attachment)
            db.session.flush()

            job = ReportAnalysisJob(
                report_id=report.id,
                attachment_id=attachment.id,
                job_status="QUEUED",
                analysis_type="INCIDENT_DETECTION",
                ai_engine_type="YOLOV8",
                confidence_threshold=0.450,
                lane_stop_threshold=10,
                shoulder_stop_threshold=15,
                movement_threshold_px=5,
                retry_count=0,
                requested_by=user_id,
                requested_at=now,
                created_at=now,
            )
            db.session.add(job)

            db.session.commit()
            committed = True

            logger.info("Incident report saved; requesting AI analysis", extra={
                "report_id": report.id,
                "attachment_id": attachment.id,
                "job_id": job.id,
            })

            try:
                success, res = AIGatewayService.request_analysis(report.id, file_path)

                if success:
                    logger.info("AI analysis request accepted", extra={
                        "report_id": report.id,
                        "job_status": "QUEUED",
                    })
                else:
                    logger.warning("AI analysis request failed", extra={
                        "report_id": report.id,
                        "response": res,
                    })

            except Exception:
                logger.exception("AI analysis request raised exception", extra={
                    "report_id": report.id,
                })

            return {"report_id": report.id, "status": "success"}

        except Exception:
            db.session.rollback()

            saved_file_path = file_info.get("file_path") if file_info else None
            if not committed and saved_file_path and os.path.exists(saved_file_path):
                try:
                    os.remove(saved_file_path)
                except OSError:
                    logger.exception("Uploaded file cleanup failed", extra={
                        "file_path": saved_file_path
                    })

            logger.exception("Incident creation failed")
            raise
