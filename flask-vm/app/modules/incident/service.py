"""incident 도메인의 핵심 비즈니스 규칙과 데이터 처리를 구현한다.

권한 검증, 트랜잭션 경계, 외부 연동 및 응답 직렬화를 라우트와 분리해 관리한다."""

# 설명: logging 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import logging
# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: uuid 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import uuid
# 설명: datetime에서 datetime 이름을 가져와 아래 로직에서 재사용한다.
from datetime import datetime

# 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
from app.extensions import db
# 설명: app.models에서 IncidentReport, ReportAnalysisJob, ReportAttachment 이름을 가져와 아래 로직에서 재사용한다.
from app.models import IncidentReport, ReportAnalysisJob, ReportAttachment
# 설명: app.modules.ai_gateway.service에서 AIGatewayService 이름을 가져와 아래 로직에서 재사용한다.
from app.modules.ai_gateway.service import AIGatewayService


# 설명: `logger`에 `logging.getLogger` 호출 결과를 저장해 다음 처리에서 사용한다.
logger = logging.getLogger(__name__)


# 설명: `IncidentService` 클래스를 정의하고 기본 object의 동작 또는 계약을 확장한다.
class IncidentService:
    # 설명: `_generate_report_code` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _generate_report_code(now):
        # 설명: `timestamp`에 `now.strftime` 호출 결과를 저장해 다음 처리에서 사용한다.
        timestamp = now.strftime("%Y%m%d%H%M%S")
        # 설명: `unique_suffix`에 `uuid.uuid4().hex[:8].upper` 호출 결과를 저장해 다음 처리에서 사용한다.
        unique_suffix = uuid.uuid4().hex[:8].upper()
        # 설명: 호출자에게 f'REP-{timestamp}-{unique_suffix}' 값을 함수 결과로 반환한다.
        return f"REP-{timestamp}-{unique_suffix}"

    # 설명: `create_incident` 함수는 새 데이터나 리소스를 생성하는 함수다.
    @staticmethod
    def create_incident(data, file_info, user_id):
        # 설명: `now`에 `datetime.now` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = datetime.now()
        # 설명: `committed`의 기준값 또는 기본값을 False로 설정한다.
        committed = False

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `report`에 `IncidentReport` 호출 결과를 저장해 다음 처리에서 사용한다.
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
            # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
            db.session.add(report)
            # 설명: `db.session.flush`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            db.session.flush()

            # 설명: `original_filename`에 file_info.get('original_filename') or file_info.get('filename') or 'u... 표현식의 계산 결과를 저장한다.
            original_filename = (
                file_info.get("original_filename")
                or file_info.get("filename")
                or "uploaded_file"
            )
            # 설명: `stored_filename`에 file_info.get('stored_filename') or file_info.get('filename') or orig... 표현식의 계산 결과를 저장한다.
            stored_filename = (
                file_info.get("stored_filename")
                or file_info.get("filename")
                or original_filename
            )
            # 설명: `file_path`에 file_info.get('file_path') or file_info.get('object_key') or stored_f... 표현식의 계산 결과를 저장한다.
            file_path = (
                file_info.get("file_path")
                or file_info.get("object_key")
                or stored_filename
            )

            # 설명: `attachment`에 `ReportAttachment` 호출 결과를 저장해 다음 처리에서 사용한다.
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
            # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
            db.session.add(attachment)
            # 설명: `db.session.flush`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            db.session.flush()

            # 설명: `job`에 `ReportAnalysisJob` 호출 결과를 저장해 다음 처리에서 사용한다.
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
            # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
            db.session.add(job)

            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()
            # 설명: `committed`의 기준값 또는 기본값을 True로 설정한다.
            committed = True

            # 설명: `logger.info`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            logger.info("Incident report saved; requesting AI analysis", extra={
                "report_id": report.id,
                "attachment_id": attachment.id,
                "job_id": job.id,
            })

            # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
            try:
                # 설명: `(success, res)`에 `AIGatewayService.request_analysis` 호출 결과를 저장해 다음 처리에서 사용한다.
                success, res = AIGatewayService.request_analysis(report.id, file_path)

                # 설명: `success` 조건 결과에 따라 실행 경로를 분기한다.
                if success:
                    # 설명: `logger.info`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                    logger.info("AI analysis request accepted", extra={
                        "report_id": report.id,
                        "job_status": "QUEUED",
                    })
                else:
                    # 설명: `logger.warning`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                    logger.warning("AI analysis request failed", extra={
                        "report_id": report.id,
                        "response": res,
                    })

            except Exception:
                # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                logger.exception("AI analysis request raised exception", extra={
                    "report_id": report.id,
                })

            # 설명: 호출자에게 {'report_id': report.id, 'status': 'success'} 값을 함수 결과로 반환한다.
            return {"report_id": report.id, "status": "success"}

        except Exception:
            # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
            db.session.rollback()

            # 설명: `saved_file_path`에 file_info.get('file_path') if file_info else None 표현식의 계산 결과를 저장한다.
            saved_file_path = file_info.get("file_path") if file_info else None
            # 설명: `not committed and saved_file_path and os.path.exists(saved_file_path)` 조건 결과에 따라 실행 경로를 분기한다.
            if not committed and saved_file_path and os.path.exists(saved_file_path):
                # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
                try:
                    # 설명: `os.remove`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                    os.remove(saved_file_path)
                except OSError:
                    # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                    logger.exception("Uploaded file cleanup failed", extra={
                        "file_path": saved_file_path
                    })

            # 설명: `logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            logger.exception("Incident creation failed")
            # 설명: 현재 처리를 중단하고 기존 예외를 호출자에게 전달한다.
            raise
