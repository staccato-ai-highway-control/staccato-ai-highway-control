import os
import uuid
from datetime import datetime

from app.extensions import db
from app.models import IncidentReport, ReportAnalysisJob, ReportAttachment
from app.modules.ai_gateway.service import AIGatewayService


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

            print(f"[*] Report {report.id} 저장 완료. AI 서버에 분석을 요청합니다...")

            try:
                success, res = AIGatewayService.request_analysis(report.id, file_path)

                if success:
                    print("✅ AI 분석 요청 성공 (Job Status: QUEUED)")
                else:
                    print(f"⚠️ AI 분석 요청 실패: {res}")

            except Exception as ai_error:
                print(f"⚠️ AI 분석 요청 중 예외 발생: {ai_error}")

            return {"report_id": report.id, "status": "success"}

        except Exception as e:
            db.session.rollback()

            saved_file_path = file_info.get("file_path") if file_info else None
            if not committed and saved_file_path and os.path.exists(saved_file_path):
                try:
                    os.remove(saved_file_path)
                except OSError as cleanup_error:
                    print(f"⚠️ 업로드 파일 정리 실패: {cleanup_error}")

            print(f"Error detail: {str(e)}")
            raise
