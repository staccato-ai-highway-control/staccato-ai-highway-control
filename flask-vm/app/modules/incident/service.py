from datetime import datetime
from app.extensions import db
from sqlalchemy import text
# AI 게이트웨이 추가
from app.modules.ai_gateway.service import AIGatewayService

class IncidentService:
    @staticmethod
    def create_incident(data, file_info, user_id):
        try:
            # 1. incident_reports 테이블 삽입
            report_sql = text("""
                INSERT INTO incident_reports (
                    report_code, report_type, upload_purpose, report_source_type,
                    title, description, reporter_id, status, priority,
                    is_demo_data, submitted_at, created_at
                ) VALUES (
                    :report_code, :report_type, :upload_purpose, :report_source_type,
                    :title, :description, :reporter_id, :status, :priority,
                    :is_demo_data, :submitted_at, :created_at
                )
            """)

            report_params = {
                "report_code": f"REP-{int(datetime.now().timestamp())}",
                "report_type": data.get("report_type", "ACCIDENT"),
                "upload_purpose": "ANALYSIS",
                "report_source_type": "MOBILE_UPLOAD",
                "title": data.get("title", "Mobile Upload Report"),
                "description": data.get("description", ""),
                "reporter_id": user_id,
                "status": "PENDING",
                "priority": "MEDIUM",
                "is_demo_data": 0,
                "submitted_at": datetime.now(),
                "created_at": datetime.now()
            }

            result = db.session.execute(report_sql, report_params)
            report_id = result.lastrowid

            # 2. report_attachments 테이블 삽입
            attachment_sql = text("""
                INSERT INTO report_attachments (
                    report_id, file_type, original_filename, stored_filename,
                    storage_type, file_path, file_hash, file_size, mime_type,
                    scan_status, is_private, download_count, access_count,
                    uploaded_by, uploaded_at, created_at
                ) VALUES (
                    :report_id, :file_type, :original_filename, :stored_filename,
                    :storage_type, :file_path, :file_hash, :file_size, :mime_type,
                    :scan_status, :is_private, :download_count, :access_count,
                    :uploaded_by, :uploaded_at, :created_at
                )
            """)

            attachment_params = {
                "report_id": report_id,
                "file_type": "VIDEO",
                "original_filename": file_info['original_filename'],
                "stored_filename": file_info['stored_filename'],
                "storage_type": "LOCAL",
                "file_path": file_info['file_path'],
                "file_hash": file_info.get('file_hash', 'unknown'),
                "file_size": file_info.get('file_size', 0),
                "mime_type": file_info.get('mime_type', 'video/mp4'),
                "scan_status": "CLEAN",
                "is_private": 0,
                "download_count": 0,
                "access_count": 0,
                "uploaded_by": user_id,
                "uploaded_at": datetime.now(),
                "created_at": datetime.now()
            }

            at_result = db.session.execute(attachment_sql, attachment_params)
            attachment_id = at_result.lastrowid

            # 3. report_analysis_jobs 테이블 삽입
            job_sql = text("""
                INSERT INTO report_analysis_jobs (
                    report_id, attachment_id, job_status, analysis_type,
                    ai_engine_type, confidence_threshold, lane_stop_threshold,
                    shoulder_stop_threshold, movement_threshold_px, retry_count,
                    requested_by, requested_at, created_at
                ) VALUES (
                    :report_id, :attachment_id, :job_status, :analysis_type,
                    :ai_engine_type, :confidence_threshold, :lane_stop_threshold,
                    :shoulder_stop_threshold, :movement_threshold_px, :retry_count,
                    :requested_by, :requested_at, :created_at
                )
            """)

            job_params = {
                "report_id": report_id,
                "attachment_id": attachment_id,
                "job_status": "QUEUED",
                "analysis_type": "INCIDENT_DETECTION",
                "ai_engine_type": "YOLOV8",
                "confidence_threshold": 0.450,
                "lane_stop_threshold": 10,
                "shoulder_stop_threshold": 15,
                "movement_threshold_px": 5,
                "retry_count": 0,
                "requested_by": user_id,
                "requested_at": datetime.now(),
                "created_at": datetime.now()
            }

            db.session.execute(job_sql, job_params)
            db.session.commit() # 여기서 DB에 영구 저장됩니다.

            # --- [AI 분석 요청 추가] ---
            # 190번 DB 저장이 끝났으니 이제 186번 AI 서버를 호출합니다.
            print(f"[*] Report {report_id} 저장 완료. AI 서버에 분석을 요청합니다...")
            success, res = AIGatewayService.request_analysis(report_id, file_info['file_path'])

            if success:
                print(f"✅ AI 분석 요청 성공 (Job Status: QUEUED)")
            else:
                print(f"⚠️ AI 분석 요청 실패: {res}")
            # --------------------------

            return {"report_id": report_id, "status": "success"}

        except Exception as e:
            db.session.rollback()
            print(f"Error detail: {str(e)}")
            raise e
