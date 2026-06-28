"""report upload 도메인의 핵심 비즈니스 규칙과 데이터 처리를 구현한다.

권한 검증, 트랜잭션 경계, 외부 연동 및 응답 직렬화를 라우트와 분리해 관리한다."""

# 설명: hashlib 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import hashlib
# 설명: copy에서 deepcopy 이름을 가져와 아래 로직에서 재사용한다.
from copy import deepcopy
# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: uuid 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import uuid
# 설명: datetime에서 UTC, datetime, time 이름을 가져와 아래 로직에서 재사용한다.
from datetime import UTC, datetime, time
# 설명: decimal에서 Decimal 이름을 가져와 아래 로직에서 재사용한다.
from decimal import Decimal
# 설명: pathlib에서 PurePath 이름을 가져와 아래 로직에서 재사용한다.
from pathlib import PurePath

# 설명: flask에서 current_app, send_file 이름을 가져와 아래 로직에서 재사용한다.
from flask import current_app, send_file
# 설명: werkzeug.utils에서 secure_filename 이름을 가져와 아래 로직에서 재사용한다.
from werkzeug.utils import secure_filename

# 설명: app.utils.bbox에서 build_bbox_metadata 이름을 가져와 아래 로직에서 재사용한다.
from app.utils.bbox import build_bbox_metadata


# 설명: `ReportUploadService` 클래스를 정의하고 기본 object의 동작 또는 계약을 확장한다.
class ReportUploadService:
    # 설명: `ACTIVE_JOB_STATUSES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    ACTIVE_JOB_STATUSES = {"QUEUED", "RUNNING", "PROCESSING", "STARTED"}
    # 설명: `ADMIN_ROLES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    ADMIN_ROLES = {"SUPER_ADMIN", "CONTROL_ADMIN"}
    # 설명: `TERMINAL_ANALYSIS_STATUSES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
    TERMINAL_ANALYSIS_STATUSES = {"COMPLETED", "FAILED", "CANCELLED"}

    # 설명: `_normalize_analysis_status` 함수는 입력 값을 일관된 형식으로 정규화하는 함수다.
    @staticmethod
    def _normalize_analysis_status(status):
        # 설명: `normalized`에 `str(status or '').strip().upper` 호출 결과를 저장해 다음 처리에서 사용한다.
        normalized = str(status or "").strip().upper()
        # 설명: `normalized in {'PROCESSING', 'STARTED'}` 조건 결과에 따라 실행 경로를 분기한다.
        if normalized in {"PROCESSING", "STARTED"}:
            # 설명: 호출자에게 'RUNNING' 값을 함수 결과로 반환한다.
            return "RUNNING"
        # 설명: `normalized in {'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'}` 조건 결과에 따라 실행 경로를 분기한다.
        if normalized in {"QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"}:
            # 설명: 호출자에게 normalized 값을 함수 결과로 반환한다.
            return normalized
        # 설명: 호출자에게 normalized or None 값을 함수 결과로 반환한다.
        return normalized or None

    # 설명: `_is_admin` 함수는 조건의 참/거짓을 판정하는 함수다.
    @staticmethod
    def _is_admin(current_user):
        # 설명: 호출자에게 bool(current_user and getattr(current_user, 'role', None) in ReportUploadServic... 값을 함수 결과로 반환한다.
        return bool(
            current_user
            and getattr(current_user, "role", None) in ReportUploadService.ADMIN_ROLES
        )

    # 설명: `_allowed_actions` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _allowed_actions(report, current_user):
        # 설명: `is_owner`에 `bool` 호출 결과를 저장해 다음 처리에서 사용한다.
        is_owner = bool(
            current_user
            and report.reporter_id == getattr(current_user, "id", None)
        )
        # 설명: `is_admin`에 `ReportUploadService._is_admin` 호출 결과를 저장해 다음 처리에서 사용한다.
        is_admin = ReportUploadService._is_admin(current_user)
        # 설명: `is_active`에 not (getattr(report, 'deleted_at', None) or report.status in {'DELETE... 표현식의 계산 결과를 저장한다.
        is_active = not (
            getattr(report, "deleted_at", None)
            or report.status in {"DELETED", "CANCELLED"}
        )
        # 설명: `can_manage`에 is_active and (is_owner or is_admin) 표현식의 계산 결과를 저장한다.
        can_manage = is_active and (is_owner or is_admin)
        # 설명: `editable`에 can_manage and ReportUploadService._is_report_editable(report) 표현식의 계산 결과를 저장한다.
        editable = can_manage and ReportUploadService._is_report_editable(report)

        # 설명: 호출자에게 {'view': can_manage, 'update': editable, 'delete': can_manage and (not bool(rep... 값을 함수 결과로 반환한다.
        return {
            "view": can_manage,
            "update": editable,
            "delete": can_manage and not bool(report.converted_incident_id),
            "add_attachment": editable,
            "delete_attachment": editable,
            "download_attachment": can_manage,
            "change_status": is_active and is_admin,
            "approve": is_active and is_admin,
            "reject": is_active and is_admin,
            "analyze": is_active and is_admin,
            "retry_analysis": is_active and is_admin,
        }

    # 설명: `_analysis_result_response` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _analysis_result_response(result_summary):
        # 설명: `not isinstance(result_summary, dict)` 조건 결과에 따라 실행 경로를 분기한다.
        if not isinstance(result_summary, dict):
            # 설명: 호출자에게 result_summary 값을 함수 결과로 반환한다.
            return result_summary

        # 설명: `result`에 `deepcopy` 호출 결과를 저장해 다음 처리에서 사용한다.
        result = deepcopy(result_summary)
        # 설명: `detections`에 `result.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        detections = result.get("detections")
        # 설명: `not isinstance(detections, list)` 조건 결과에 따라 실행 경로를 분기한다.
        if not isinstance(detections, list):
            # 설명: `detections`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
            detections = []

        # 설명: `normalized_detections`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        normalized_detections = []
        # 설명: `detections`의 각 항목을 `detection`로 받아 반복 처리한다.
        for detection in detections:
            # 설명: `not isinstance(detection, dict)` 조건 결과에 따라 실행 경로를 분기한다.
            if not isinstance(detection, dict):
                # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
                continue
            # 설명: `item`에 `dict` 호출 결과를 저장해 다음 처리에서 사용한다.
            item = dict(detection)
            # 설명: `bbox`에 `item.get` 호출 결과를 저장해 다음 처리에서 사용한다.
            bbox = item.get("bbox", item.get("bbox_json"))
            # 설명: `item['bbox_metadata']`에 `build_bbox_metadata` 호출 결과를 저장해 다음 처리에서 사용한다.
            item["bbox_metadata"] = build_bbox_metadata(
                bbox,
                coordinate_space=item.get("bbox_coordinate_space"),
                frame_width=item.get("frame_width") or result.get("frame_width"),
                frame_height=item.get("frame_height") or result.get("frame_height"),
            )
            # 설명: `normalized_detections.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
            normalized_detections.append(item)

        # 설명: `result['detections']`에 normalized_detections 표현식의 계산 결과를 저장한다.
        result["detections"] = normalized_detections
        # 설명: `raw_count`에 `result.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        raw_count = result.get("count")
        # 설명: `result['detection_count']`에 raw_count if isinstance(raw_count, int) else len(normalized_detections) 표현식의 계산 결과를 저장한다.
        result["detection_count"] = (
            raw_count if isinstance(raw_count, int) else len(normalized_detections)
        )
        # 설명: 호출자에게 result 값을 함수 결과로 반환한다.
        return result

    # 설명: `_analysis_job_response` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _analysis_job_response(job):
        # 설명: `job is None` 조건 결과에 따라 실행 경로를 분기한다.
        if job is None:
            # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
            return None

        # 설명: `data`에 `ReportUploadService._to_dict` 호출 결과를 저장해 다음 처리에서 사용한다.
        data = ReportUploadService._to_dict(job)
        # 설명: `data['result_summary']`에 `ReportUploadService._analysis_result_response` 호출 결과를 저장해 다음 처리에서 사용한다.
        data["result_summary"] = ReportUploadService._analysis_result_response(
            data.get("result_summary")
        )
        # 설명: `analysis_status`에 `ReportUploadService._normalize_analysis_status` 호출 결과를 저장해 다음 처리에서 사용한다.
        analysis_status = ReportUploadService._normalize_analysis_status(job.job_status)
        # 설명: `data['analysis_status']`에 analysis_status 표현식의 계산 결과를 저장한다.
        data["analysis_status"] = analysis_status
        # 설명: `data['is_active']`에 analysis_status in {'QUEUED', 'RUNNING'} 표현식의 계산 결과를 저장한다.
        data["is_active"] = analysis_status in {"QUEUED", "RUNNING"}
        # 설명: `data['is_terminal']`에 analysis_status in ReportUploadService.TERMINAL_ANALYSIS_STATUSES 표현식의 계산 결과를 저장한다.
        data["is_terminal"] = analysis_status in ReportUploadService.TERMINAL_ANALYSIS_STATUSES
        # 설명: `data['status_message']`에 `{'QUEUED': '분석 요청이 등록되어 처리 대기 중입니다.', 'RUNNING': 'AI 분석이 진행 중입니다.',...` 호출 결과를 저장해 다음 처리에서 사용한다.
        data["status_message"] = {
            "QUEUED": "분석 요청이 등록되어 처리 대기 중입니다.",
            "RUNNING": "AI 분석이 진행 중입니다.",
            "COMPLETED": "AI 분석이 완료되었습니다.",
            "FAILED": "AI 분석에 실패했습니다.",
            "CANCELLED": "AI 분석이 취소되었습니다.",
        }.get(analysis_status, "분석 상태를 확인할 수 없습니다.")
        # 설명: 호출자에게 data 값을 함수 결과로 반환한다.
        return data

    # 설명: `_now` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _now():
        # 설명: 호출자에게 datetime.now(UTC) 값을 함수 결과로 반환한다.
        return datetime.now(UTC)

    # 설명: `_generate_report_code` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _generate_report_code(now):
        # 설명: `timestamp`에 `now.strftime` 호출 결과를 저장해 다음 처리에서 사용한다.
        timestamp = now.strftime("%Y%m%d")
        # 설명: `unique_suffix`에 `uuid.uuid4().hex[:4].upper` 호출 결과를 저장해 다음 처리에서 사용한다.
        unique_suffix = uuid.uuid4().hex[:4].upper()
        # 설명: 호출자에게 f'REP-{timestamp}-{unique_suffix}' 값을 함수 결과로 반환한다.
        return f"REP-{timestamp}-{unique_suffix}"

    # 설명: `_clean_original_filename` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _clean_original_filename(filename):
        # 설명: `raw`에 `str(filename or '').replace` 호출 결과를 저장해 다음 처리에서 사용한다.
        raw = str(filename or "").replace("\\", "/")
        # 설명: `name`에 `PurePath(raw).name.strip` 호출 결과를 저장해 다음 처리에서 사용한다.
        name = PurePath(raw).name.strip()
        # 설명: `not name` 조건 결과에 따라 실행 경로를 분기한다.
        if not name:
            # 설명: 현재 처리를 중단하고 ValueError('유효하지 않은 파일명입니다.')를 호출자에게 전달한다.
            raise ValueError("유효하지 않은 파일명입니다.")
        # 설명: 호출자에게 name 값을 함수 결과로 반환한다.
        return name

    # 설명: `_stored_filename` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _stored_filename(original_filename):
        # 설명: `ext`에 `os.path.splitext(original_filename)[1].lower` 호출 결과를 저장해 다음 처리에서 사용한다.
        ext = os.path.splitext(original_filename)[1].lower()
        # 설명: `not ext` 조건 결과에 따라 실행 경로를 분기한다.
        if not ext:
            # 설명: `safe_name`에 `secure_filename` 호출 결과를 저장해 다음 처리에서 사용한다.
            safe_name = secure_filename(original_filename)
            # 설명: `ext`에 `os.path.splitext(safe_name)[1].lower` 호출 결과를 저장해 다음 처리에서 사용한다.
            ext = os.path.splitext(safe_name)[1].lower()

        # 설명: `not ext` 조건 결과에 따라 실행 경로를 분기한다.
        if not ext:
            # 설명: `ext`의 기준값 또는 기본값을 '.bin'로 설정한다.
            ext = ".bin"

        # 설명: 호출자에게 f'{uuid.uuid4().hex}{ext}' 값을 함수 결과로 반환한다.
        return f"{uuid.uuid4().hex}{ext}"

    # 설명: `_get_file_type` 함수는 단일 값이나 리소스를 조회하는 함수다.
    @staticmethod
    def _get_file_type(filename):
        # 설명: `ext`에 `os.path.splitext(str(filename).lower())[1].lstrip` 호출 결과를 저장해 다음 처리에서 사용한다.
        ext = os.path.splitext(str(filename).lower())[1].lstrip(".")
        # 설명: `not ext and '.' in str(filename)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ext and "." in str(filename):
            # 설명: `ext`에 str(filename).lower().rsplit('.', 1)[-1] 표현식의 계산 결과를 저장한다.
            ext = str(filename).lower().rsplit(".", 1)[-1]

        # 설명: `ext in ['jpg', 'jpeg', 'png', 'gif']` 조건 결과에 따라 실행 경로를 분기한다.
        if ext in ["jpg", "jpeg", "png", "gif"]:
            # 설명: 호출자에게 'IMAGE' 값을 함수 결과로 반환한다.
            return "IMAGE"

        # 설명: `ext in ['mp4', 'mov', 'avi', 'mkv']` 조건 결과에 따라 실행 경로를 분기한다.
        if ext in ["mp4", "mov", "avi", "mkv"]:
            # 설명: 호출자에게 'VIDEO' 값을 함수 결과로 반환한다.
            return "VIDEO"

        # 설명: 호출자에게 'UNKNOWN' 값을 함수 결과로 반환한다.
        return "UNKNOWN"

    # 설명: `_validate_file_size` 함수는 입력값과 비즈니스 조건을 검증하는 함수다.
    @staticmethod
    def _validate_file_size(file_type, file_length):
        # 설명: `file_type == 'IMAGE'` 조건 결과에 따라 실행 경로를 분기한다.
        if file_type == "IMAGE":
            # 설명: `max_mb`에 `current_app.config.get` 호출 결과를 저장해 다음 처리에서 사용한다.
            max_mb = current_app.config.get("UPLOAD_MAX_IMAGE_SIZE_MB", 20)
            # 설명: `file_length > max_mb * 1024 * 1024` 조건 결과에 따라 실행 경로를 분기한다.
            if file_length > max_mb * 1024 * 1024:
                # 설명: 현재 처리를 중단하고 ValueError(f'이미지 크기가 너무 큽니다. (최대 {max_mb}MB)')를 호출자에게 전달한다.
                raise ValueError(f"이미지 크기가 너무 큽니다. (최대 {max_mb}MB)")

        # 설명: `file_type == 'VIDEO'` 조건 결과에 따라 실행 경로를 분기한다.
        if file_type == "VIDEO":
            # 설명: `max_mb`에 `current_app.config.get` 호출 결과를 저장해 다음 처리에서 사용한다.
            max_mb = current_app.config.get("UPLOAD_MAX_VIDEO_SIZE_MB", 500)
            # 설명: `file_length > max_mb * 1024 * 1024` 조건 결과에 따라 실행 경로를 분기한다.
            if file_length > max_mb * 1024 * 1024:
                # 설명: 현재 처리를 중단하고 ValueError(f'영상 크기가 너무 큽니다. (최대 {max_mb}MB)')를 호출자에게 전달한다.
                raise ValueError(f"영상 크기가 너무 큽니다. (최대 {max_mb}MB)")

    # 설명: `_model_kwargs` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def process_file_upload(file):
        original_filename = ReportUploadService._clean_original_filename(file.filename)
        stored_filename = ReportUploadService._stored_filename(original_filename)
        file_type = ReportUploadService._get_file_type(original_filename)

        upload_base = current_app.config.get("UPLOAD_BASE_PATH")
        if not upload_base:
            upload_base = os.path.join(
                current_app.config.get("STORAGE_ROOT", "storage"),
                "uploads",
            )

        os.makedirs(upload_base, exist_ok=True)
        file_path = os.path.join(upload_base, stored_filename)

        stream = getattr(file, "stream", None)
        file_size = 0

        if stream is not None:
            try:
                current_position = stream.tell()
                stream.seek(0, os.SEEK_END)
                file_size = stream.tell()
                stream.seek(current_position)
            except Exception:
                file_size = 0

        ReportUploadService._validate_file_size(file_type, file_size)

        if stream is not None:
            try:
                stream.seek(0)
            except Exception:
                pass

        file.save(file_path)

        if file_size == 0 and os.path.exists(file_path):
            file_size = os.path.getsize(file_path)

        import hashlib

        file_hash = None
        if os.path.exists(file_path):
            hasher = hashlib.sha256()
            with open(file_path, "rb") as saved_file:
                for chunk in iter(lambda: saved_file.read(1024 * 1024), b""):
                    hasher.update(chunk)
            file_hash = hasher.hexdigest()

        return {
            "original_filename": original_filename,
            "stored_filename": stored_filename,
            "file_name": original_filename,
            "storage_type": "LOCAL",
            "file_path": file_path,
            "file_type": file_type,
            "file_size": file_size,
            "file_hash": file_hash,
            "mime_type": getattr(file, "mimetype", None) or "application/octet-stream",
            "scan_status": "PENDING",
        }

    @staticmethod
    def _model_kwargs(model_cls, values):
        # 설명: `columns`에 {column.name for column in model_cls.__table__.columns} 표현식의 계산 결과를 저장한다.
        columns = {column.name for column in model_cls.__table__.columns}
        # 설명: 호출자에게 {key: value for key, value in values.items() if key in columns} 값을 함수 결과로 반환한다.
        return {key: value for key, value in values.items() if key in columns}

    # 설명: `_to_dict` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _to_dict(model):
        # 설명: `data`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        data = {}
        # 설명: `model.__table__.columns`의 각 항목을 `column`로 받아 반복 처리한다.
        for column in model.__table__.columns:
            # 설명: `value`에 `getattr` 호출 결과를 저장해 다음 처리에서 사용한다.
            value = getattr(model, column.name)
            # 설명: `hasattr(value, 'isoformat')` 조건 결과에 따라 실행 경로를 분기한다.
            if hasattr(value, "isoformat"):
                # 설명: `value`에 `value.isoformat` 호출 결과를 저장해 다음 처리에서 사용한다.
                value = value.isoformat()
            # 설명: `isinstance(value, Decimal)` 조건 결과에 따라 실행 경로를 분기한다.
            elif isinstance(value, Decimal):
                # 설명: `value`에 `float` 호출 결과를 저장해 다음 처리에서 사용한다.
                value = float(value)
            # 설명: `data[column.name]`에 value 표현식의 계산 결과를 저장한다.
            data[column.name] = value
        # 설명: 호출자에게 data 값을 함수 결과로 반환한다.
        return data


    # 설명: `_is_previewable_attachment` 함수는 조건의 참/거짓을 판정하는 함수다.
    @staticmethod
    def _is_previewable_attachment(attachment):
        # 설명: `mime_type`에 `(getattr(attachment, 'mime_type', None) or '').lower` 호출 결과를 저장해 다음 처리에서 사용한다.
        mime_type = (getattr(attachment, "mime_type", None) or "").lower()
        # 설명: `file_type`에 `(getattr(attachment, 'file_type', None) or '').upper` 호출 결과를 저장해 다음 처리에서 사용한다.
        file_type = (getattr(attachment, "file_type", None) or "").upper()

        # 설명: 호출자에게 file_type in {'IMAGE', 'VIDEO'} or mime_type.startswith('image/') or mime_type.... 값을 함수 결과로 반환한다.
        return (
            file_type in {"IMAGE", "VIDEO", "PDF"}
            or mime_type.startswith("image/")
            or mime_type.startswith("video/")
            or mime_type == "application/pdf"
        )

    # 설명: `_attachment_response` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _attachment_response(attachment):
        # 설명: `data`에 `ReportUploadService._to_dict` 호출 결과를 저장해 다음 처리에서 사용한다.
        data = ReportUploadService._to_dict(attachment)

        # 설명: `is_previewable`에 `ReportUploadService._is_previewable_attachment` 호출 결과를 저장해 다음 처리에서 사용한다.
        is_previewable = ReportUploadService._is_previewable_attachment(attachment)
        # 설명: `preview_url`에 f'/api/reports/attachments/{attachment.id}/preview' if is_previewable... 표현식의 계산 결과를 저장한다.
        preview_url = (
            f"/api/reports/attachments/{attachment.id}/preview"
            if is_previewable
            else None
        )
        # 설명: `download_url`에 f'/api/reports/attachments/{attachment.id}/download' 표현식의 계산 결과를 저장한다.
        download_url = f"/api/reports/attachments/{attachment.id}/download"

        # 설명: `data['preview_url']`에 preview_url 표현식의 계산 결과를 저장한다.
        data["preview_url"] = preview_url
        # 설명: `data['download_url']`에 download_url 표현식의 계산 결과를 저장한다.
        data["download_url"] = download_url

        # 기존 DB 컬럼이 NULL이어도 프론트가 사용할 수 있는 URL을 보강합니다.
        if not data.get("thumbnail_url") and preview_url:
            # 설명: `data['thumbnail_url']`에 preview_url 표현식의 계산 결과를 저장한다.
            data["thumbnail_url"] = preview_url
        # 설명: `not data.get('file_url')` 조건 결과에 따라 실행 경로를 분기한다.
        if not data.get("file_url"):
            # 설명: `data['file_url']`에 download_url 표현식의 계산 결과를 저장한다.
            data["file_url"] = download_url

        # 설명: 호출자에게 data 값을 함수 결과로 반환한다.
        return data

    # 설명: `_first_preview_url` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _first_preview_url(attachments):
        # 설명: `attachments`의 각 항목을 `attachment`로 받아 반복 처리한다.
        for attachment in attachments:
            # 설명: `ReportUploadService._is_previewable_attachment(attachment)` 조건 결과에 따라 실행 경로를 분기한다.
            if ReportUploadService._is_previewable_attachment(attachment):
                # 설명: 호출자에게 f'/api/reports/attachments/{attachment.id}/preview' 값을 함수 결과로 반환한다.
                return f"/api/reports/attachments/{attachment.id}/preview"
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `_attach_list_attachment_summaries` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _attach_list_attachment_summaries(reports, items):
        # 설명: app.models에서 ReportAttachment 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import ReportAttachment

        # 설명: `report_ids`에 [report.id for report in reports] 표현식의 계산 결과를 저장한다.
        report_ids = [report.id for report in reports]
        # 설명: `not report_ids` 조건 결과에 따라 실행 경로를 분기한다.
        if not report_ids:
            # 설명: 호출자에게 items 값을 함수 결과로 반환한다.
            return items

        # 설명: `query`에 `ReportAttachment.query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = ReportAttachment.query.filter(ReportAttachment.report_id.in_(report_ids))

        # 설명: `hasattr(ReportAttachment, 'deleted_at')` 조건 결과에 따라 실행 경로를 분기한다.
        if hasattr(ReportAttachment, "deleted_at"):
            # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
            query = query.filter(ReportAttachment.deleted_at.is_(None))

        # 설명: `attachments`에 `query.order_by(ReportAttachment.report_id.asc(), ReportAttachment.i...` 호출 결과를 저장해 다음 처리에서 사용한다.
        attachments = (
            query
            .order_by(ReportAttachment.report_id.asc(), ReportAttachment.id.asc())
            .all()
        )

        # 설명: `grouped`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        grouped = {}
        # 설명: `attachments`의 각 항목을 `attachment`로 받아 반복 처리한다.
        for attachment in attachments:
            # 설명: `grouped.setdefault(attachment.report_id, []).append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
            grouped.setdefault(attachment.report_id, []).append(attachment)

        # 설명: `items`의 각 항목을 `item`로 받아 반복 처리한다.
        for item in items:
            # 설명: `report_attachments`에 `grouped.get` 호출 결과를 저장해 다음 처리에서 사용한다.
            report_attachments = grouped.get(item.get("id"), [])
            # 설명: `attachment_items`에 [ReportUploadService._attachment_response(attachment) for attachment ... 표현식의 계산 결과를 저장한다.
            attachment_items = [
                ReportUploadService._attachment_response(attachment)
                for attachment in report_attachments
            ]

            # 설명: `item['attachments']`에 attachment_items 표현식의 계산 결과를 저장한다.
            item["attachments"] = attachment_items
            # 설명: `item['attachment_count']`에 `len` 호출 결과를 저장해 다음 처리에서 사용한다.
            item["attachment_count"] = len(attachment_items)
            # 설명: `item['thumbnail_url']`에 `ReportUploadService._first_preview_url` 호출 결과를 저장해 다음 처리에서 사용한다.
            item["thumbnail_url"] = ReportUploadService._first_preview_url(report_attachments)

        # 설명: 호출자에게 items 값을 함수 결과로 반환한다.
        return items

    # 설명: `_resolve_attachment_path` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _resolve_attachment_path(attachment):
        # 설명: `raw_path`에 `getattr` 호출 결과를 저장해 다음 처리에서 사용한다.
        raw_path = getattr(attachment, "file_path", None)
        # 설명: `not raw_path` 조건 결과에 따라 실행 경로를 분기한다.
        if not raw_path:
            # 설명: 호출자에게 (None, {'success': False, 'error': '첨부파일 경로가 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return None, {
                "success": False,
                "error": "첨부파일 경로가 없습니다.",
            }, 404

        # 설명: `file_path`에 `os.path.abspath` 호출 결과를 저장해 다음 처리에서 사용한다.
        file_path = os.path.abspath(raw_path)
        # 설명: `upload_base`에 `current_app.config.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        upload_base = current_app.config.get("UPLOAD_BASE_PATH")

        # 설명: `not upload_base` 조건 결과에 따라 실행 경로를 분기한다.
        if not upload_base:
            # 설명: 호출자에게 (None, {'success': False, 'error': 'UPLOAD_BASE_PATH 설정이 없습니다.'}, 500) 값을 함수 결과로 반환한다.
            return None, {
                "success": False,
                "error": "UPLOAD_BASE_PATH 설정이 없습니다.",
            }, 500

        # 설명: `upload_base`에 `os.path.abspath` 호출 결과를 저장해 다음 처리에서 사용한다.
        upload_base = os.path.abspath(upload_base)

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `is_inside_upload_base`에 os.path.commonpath([upload_base, file_path]) == upload_base 표현식의 계산 결과를 저장한다.
            is_inside_upload_base = os.path.commonpath([upload_base, file_path]) == upload_base
        except ValueError:
            # 설명: `is_inside_upload_base`의 기준값 또는 기본값을 False로 설정한다.
            is_inside_upload_base = False

        # 설명: `not is_inside_upload_base` 조건 결과에 따라 실행 경로를 분기한다.
        if not is_inside_upload_base:
            # 설명: `current_app.logger.warning`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            current_app.logger.warning(
                "Unsafe report attachment path blocked",
                extra={
                    "attachment_id": getattr(attachment, "id", None),
                    "file_path": file_path,
                    "upload_base": upload_base,
                },
            )
            # 설명: 호출자에게 (None, {'success': False, 'error': '허용되지 않은 첨부파일 경로입니다.'}, 403) 값을 함수 결과로 반환한다.
            return None, {
                "success": False,
                "error": "허용되지 않은 첨부파일 경로입니다.",
            }, 403

        # 설명: `not os.path.isfile(file_path)` 조건 결과에 따라 실행 경로를 분기한다.
        if not os.path.isfile(file_path):
            # 설명: `current_app.logger.warning`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            current_app.logger.warning(
                "Report attachment file missing",
                extra={
                    "attachment_id": getattr(attachment, "id", None),
                    "file_path": file_path,
                },
            )
            # 설명: 호출자에게 (None, {'success': False, 'error': '첨부파일을 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return None, {
                "success": False,
                "error": "첨부파일을 찾을 수 없습니다.",
            }, 404

        # 설명: 호출자에게 (file_path, None, 200) 값을 함수 결과로 반환한다.
        return file_path, None, 200

    # 설명: `get_attachment_file` 함수는 단일 값이나 리소스를 조회하는 함수다.
    @staticmethod
    def get_attachment_file(attachment_id, current_user, as_download=False):
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport, ReportAttachment 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport, ReportAttachment

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `attachment_id`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
            attachment_id = int(attachment_id)
        except (TypeError, ValueError):
            # 설명: 호출자에게 ({'success': False, 'error': '첨부파일 ID가 올바르지 않습니다.'}, 400) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "첨부파일 ID가 올바르지 않습니다.",
            }, 400

        # 설명: `attachment_id <= 0` 조건 결과에 따라 실행 경로를 분기한다.
        if attachment_id <= 0:
            # 설명: 호출자에게 ({'success': False, 'error': '첨부파일 ID가 올바르지 않습니다.'}, 400) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "첨부파일 ID가 올바르지 않습니다.",
            }, 400

        # 설명: `attachment`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        attachment = db.session.get(ReportAttachment, attachment_id)
        # 설명: `not attachment or getattr(attachment, 'deleted_at', None)` 조건 결과에 따라 실행 경로를 분기한다.
        if not attachment or getattr(attachment, "deleted_at", None):
            # 설명: 호출자에게 ({'success': False, 'error': '첨부파일을 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "첨부파일을 찾을 수 없습니다.",
            }, 404

        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, attachment.report_id)
        # 설명: `not report or getattr(report, 'deleted_at', None)` 조건 결과에 따라 실행 경로를 분기한다.
        if not report or getattr(report, "deleted_at", None):
            # 설명: 호출자에게 ({'success': False, 'error': '신고를 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "신고를 찾을 수 없습니다.",
            }, 404

        # 설명: `not ReportUploadService._can_manage_report(report, current_user)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._can_manage_report(report, current_user):
            # 설명: 호출자에게 ({'success': False, 'error': '첨부파일 접근 권한이 없습니다.'}, 403) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "첨부파일 접근 권한이 없습니다.",
            }, 403

        # 설명: `not as_download and (not ReportUploadService._is_previewable_attachment(attachment))` 조건 결과에 따라 실행 경로를 분기한다.
        if not as_download and not ReportUploadService._is_previewable_attachment(attachment):
            # 설명: 호출자에게 ({'success': False, 'error': '미리보기를 지원하지 않는 파일 형식입니다.'}, 415) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "미리보기를 지원하지 않는 파일 형식입니다.",
            }, 415

        # 설명: `(file_path, error_response, status_code)`에 `ReportUploadService._resolve_attachment_path` 호출 결과를 저장해 다음 처리에서 사용한다.
        file_path, error_response, status_code = ReportUploadService._resolve_attachment_path(attachment)
        # 설명: `error_response` 조건 결과에 따라 실행 경로를 분기한다.
        if error_response:
            # 설명: 호출자에게 (error_response, status_code) 값을 함수 결과로 반환한다.
            return error_response, status_code

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `as_download` 조건 결과에 따라 실행 경로를 분기한다.
            if as_download:
                # 설명: `attachment.download_count`에 (attachment.download_count or 0) + 1 표현식의 계산 결과를 저장한다.
                attachment.download_count = (attachment.download_count or 0) + 1
            else:
                # 설명: `attachment.access_count`에 (attachment.access_count or 0) + 1 표현식의 계산 결과를 저장한다.
                attachment.access_count = (attachment.access_count or 0) + 1

            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()
        except Exception:
            # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
            db.session.rollback()
            # 설명: `current_app.logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            current_app.logger.exception(
                "Report attachment access counter update failed",
                extra={"attachment_id": attachment.id},
            )

        # 설명: `original_filename`에 `getattr` 호출 결과를 저장해 다음 처리에서 사용한다.
        original_filename = getattr(attachment, "original_filename", None)
        # 설명: `stored_filename`에 `getattr` 호출 결과를 저장해 다음 처리에서 사용한다.
        stored_filename = getattr(attachment, "stored_filename", None)
        # 설명: `download_name`에 secure_filename(original_filename or '') or stored_filename or f'atta... 표현식의 계산 결과를 저장한다.
        download_name = secure_filename(original_filename or "") or stored_filename or f"attachment-{attachment.id}"

        # 설명: `mimetype`에 getattr(attachment, 'mime_type', None) or 'application/octet-stream' 표현식의 계산 결과를 저장한다.
        mimetype = (
            getattr(attachment, "mime_type", None) or ""
        ).strip().lower()

        if not mimetype or mimetype == "application/octet-stream":
            import mimetypes

            guessed_mimetype, _ = mimetypes.guess_type(download_name)
            file_type = (
                getattr(attachment, "file_type", None) or ""
            ).upper()

            if guessed_mimetype:
                mimetype = guessed_mimetype
            elif file_type == "PDF":
                mimetype = "application/pdf"
            else:
                mimetype = "application/octet-stream"

        # 설명: `response`에 `send_file` 호출 결과를 저장해 다음 처리에서 사용한다.
        response = send_file(
            file_path,
            mimetype=mimetype,
            as_attachment=as_download,
            download_name=download_name,
            conditional=True,
            max_age=0,
        )
        # 설명: `response.headers['X-Content-Type-Options']`의 기준값 또는 기본값을 'nosniff'로 설정한다.
        response.headers["X-Content-Type-Options"] = "nosniff"
        # 설명: `response.headers['Cache-Control']`의 기준값 또는 기본값을 'private, no-store'로 설정한다.
        response.headers["Cache-Control"] = "private, no-store"

        if not as_download:
            response.headers["Content-Disposition"] = (
                f'inline; filename="{download_name}"'
            )

        # 설명: 호출자에게 (response, 200) 값을 함수 결과로 반환한다.
        return response, 200

    # 설명: `_to_optional_decimal` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _to_optional_decimal(value, field_name):
        """HTTP 문자열/숫자를 DB Numeric 컬럼에 넣을 Decimal로 변환한다.

        빈 문자열은 미입력(None)으로 취급하고, 잘못된 숫자는 DB까지 보내지 않고 400 오류용
        ValueError로 바꾼다. float를 직접 만들지 않아 좌표의 이진 부동소수점 오차를 피한다.
        """
        # 설명: `value is None` 조건 결과에 따라 실행 경로를 분기한다.
        if value is None:
            # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
            return None

        # 설명: `isinstance(value, str)` 조건 결과에 따라 실행 경로를 분기한다.
        if isinstance(value, str):
            # 설명: `value`에 `value.strip` 호출 결과를 저장해 다음 처리에서 사용한다.
            value = value.strip()
            # 설명: `not value` 조건 결과에 따라 실행 경로를 분기한다.
            if not value:
                # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
                return None

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: 호출자에게 Decimal(str(value)) 값을 함수 결과로 반환한다.
            return Decimal(str(value))
        except Exception as exc:
            # 설명: 현재 처리를 중단하고 ValueError(f'{field_name} 값이 올바르지 않습니다.')를 호출자에게 전달한다.
            raise ValueError(f"{field_name} 값이 올바르지 않습니다.") from exc

    # 설명: `_report_response` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _report_response(report, include_children=True, current_user=None):
        """부모 신고와 FK로 연결된 자식 행들을 하나의 API 응답 문서로 조립한다.

        ORM relationship에 의존하지 않고 attachment/location/job 테이블을 report_id로 각각
        조회한다. DB DateTime/Decimal은 _to_dict에서 ISO 문자열/float로 변환된다.
        """
        # 설명: app.models에서 ReportAnalysisJob, ReportAttachment, ReportLocation 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import ReportAnalysisJob, ReportAttachment, ReportLocation

        # 설명: `data`에 `ReportUploadService._to_dict` 호출 결과를 저장해 다음 처리에서 사용한다.
        data = ReportUploadService._to_dict(report)
        # 설명: `data['reporter_id']`에 report.reporter_id 표현식의 계산 결과를 저장한다.
        data["reporter_id"] = report.reporter_id
        # 설명: `data['author_id']`에 report.reporter_id 표현식의 계산 결과를 저장한다.
        data["author_id"] = report.reporter_id
        # 설명: `data['allowed_actions']`에 `ReportUploadService._allowed_actions` 호출 결과를 저장해 다음 처리에서 사용한다.
        data["allowed_actions"] = ReportUploadService._allowed_actions(
            report,
            current_user,
        )

        # 설명: `not include_children` 조건 결과에 따라 실행 경로를 분기한다.
        if not include_children:
            # 설명: 호출자에게 data 값을 함수 결과로 반환한다.
            return data

        # 설명: `attachments_query`에 `ReportAttachment.query.filter_by` 호출 결과를 저장해 다음 처리에서 사용한다.
        attachments_query = ReportAttachment.query.filter_by(report_id=report.id)
        # 설명: `hasattr(ReportAttachment, 'deleted_at')` 조건 결과에 따라 실행 경로를 분기한다.
        if hasattr(ReportAttachment, "deleted_at"):
            # 설명: `attachments_query`에 `attachments_query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
            attachments_query = attachments_query.filter(ReportAttachment.deleted_at.is_(None))
        # 설명: `attachments`에 `attachments_query.order_by(ReportAttachment.id.asc()).all` 호출 결과를 저장해 다음 처리에서 사용한다.
        attachments = attachments_query.order_by(ReportAttachment.id.asc()).all()
        # 설명: `locations`에 `ReportLocation.query.filter_by(report_id=report.id).order_by(Report...` 호출 결과를 저장해 다음 처리에서 사용한다.
        locations = (
            ReportLocation.query
            .filter_by(report_id=report.id)
            .order_by(ReportLocation.id.asc())
            .all()
        )
        # 설명: `jobs`에 `ReportAnalysisJob.query.filter_by(report_id=report.id).order_by(Rep...` 호출 결과를 저장해 다음 처리에서 사용한다.
        jobs = (
            ReportAnalysisJob.query
            .filter_by(report_id=report.id)
            .order_by(ReportAnalysisJob.id.asc())
            .all()
        )

        # 설명: `attachment_items`에 [ReportUploadService._attachment_response(item) for item in attachments] 표현식의 계산 결과를 저장한다.
        attachment_items = [ReportUploadService._attachment_response(item) for item in attachments]
        # 설명: `data['attachments']`에 attachment_items 표현식의 계산 결과를 저장한다.
        data["attachments"] = attachment_items
        # 설명: `data['attachment_count']`에 `len` 호출 결과를 저장해 다음 처리에서 사용한다.
        data["attachment_count"] = len(attachment_items)
        # 설명: `data['thumbnail_url']`에 `ReportUploadService._first_preview_url` 호출 결과를 저장해 다음 처리에서 사용한다.
        data["thumbnail_url"] = ReportUploadService._first_preview_url(attachments)

        # 설명: `first_attachment`에 attachment_items[0] if attachment_items else None 표현식의 계산 결과를 저장한다.
        first_attachment = attachment_items[0] if attachment_items else None
        # 설명: `data['attachment_id']`에 first_attachment.get('id') if first_attachment else None 표현식의 계산 결과를 저장한다.
        data["attachment_id"] = first_attachment.get("id") if first_attachment else None
        # 설명: `data['preview_url']`에 first_attachment.get('preview_url') if first_attachment else None 표현식의 계산 결과를 저장한다.
        data["preview_url"] = first_attachment.get("preview_url") if first_attachment else None
        # 설명: `data['download_url']`에 first_attachment.get('download_url') if first_attachment else None 표현식의 계산 결과를 저장한다.
        data["download_url"] = first_attachment.get("download_url") if first_attachment else None

        # 설명: `data['locations']`에 [ReportUploadService._to_dict(item) for item in locations] 표현식의 계산 결과를 저장한다.
        data["locations"] = [ReportUploadService._to_dict(item) for item in locations]
        # 설명: `analysis_jobs`에 [ReportUploadService._analysis_job_response(item) for item in jobs] 표현식의 계산 결과를 저장한다.
        analysis_jobs = [ReportUploadService._analysis_job_response(item) for item in jobs]
        # 설명: `data['analysis_jobs']`에 analysis_jobs 표현식의 계산 결과를 저장한다.
        data["analysis_jobs"] = analysis_jobs

        # 설명: `latest_job`에 analysis_jobs[-1] if analysis_jobs else None 표현식의 계산 결과를 저장한다.
        latest_job = analysis_jobs[-1] if analysis_jobs else None
        # 설명: `data['analysis_job_id']`에 latest_job.get('id') if latest_job else None 표현식의 계산 결과를 저장한다.
        data["analysis_job_id"] = latest_job.get("id") if latest_job else None
        # 설명: `data['analysis_status']`에 latest_job.get('analysis_status') if latest_job else None 표현식의 계산 결과를 저장한다.
        data["analysis_status"] = latest_job.get("analysis_status") if latest_job else None
        # 설명: `data['analysis_summary']`에 latest_job.get('result_summary') if latest_job else None 표현식의 계산 결과를 저장한다.
        data["analysis_summary"] = latest_job.get("result_summary") if latest_job else None

        # 설명: 호출자에게 data 값을 함수 결과로 반환한다.
        return data

    # 설명: `_to_positive_int` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _to_positive_int(value, default, minimum=1, maximum=200):
        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `parsed`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
            parsed = int(value)
        except (TypeError, ValueError):
            # 설명: `parsed`에 default 표현식의 계산 결과를 저장한다.
            parsed = default

        # 설명: 호출자에게 max(minimum, min(parsed, maximum)) 값을 함수 결과로 반환한다.
        return max(minimum, min(parsed, maximum))

    # 설명: `_to_bool` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _to_bool(value):
        # 설명: `isinstance(value, bool)` 조건 결과에 따라 실행 경로를 분기한다.
        if isinstance(value, bool):
            # 설명: 호출자에게 value 값을 함수 결과로 반환한다.
            return value

        # 설명: `value is None` 조건 결과에 따라 실행 경로를 분기한다.
        if value is None:
            # 설명: 호출자에게 False 값을 함수 결과로 반환한다.
            return False

        # 설명: 호출자에게 str(value).strip().lower() in {'1', 'true', 'yes', 'y', 'on'} 값을 함수 결과로 반환한다.
        return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}

    # 설명: `_parse_date` 함수는 외부 입력을 내부 타입으로 해석하는 함수다.
    @staticmethod
    def _parse_date(value, field_name, end_of_day=False):
        # 설명: `value is None` 조건 결과에 따라 실행 경로를 분기한다.
        if value is None:
            # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
            return None

        # 설명: `raw`에 `str(value).strip` 호출 결과를 저장해 다음 처리에서 사용한다.
        raw = str(value).strip()
        # 설명: `not raw` 조건 결과에 따라 실행 경로를 분기한다.
        if not raw:
            # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
            return None

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `len(raw) == 10` 조건 결과에 따라 실행 경로를 분기한다.
            if len(raw) == 10:
                # 설명: `parsed_date`에 `datetime.fromisoformat(raw).date` 호출 결과를 저장해 다음 처리에서 사용한다.
                parsed_date = datetime.fromisoformat(raw).date()
                # 설명: `parsed_time`에 time.max if end_of_day else time.min 표현식의 계산 결과를 저장한다.
                parsed_time = time.max if end_of_day else time.min
                # 설명: 호출자에게 datetime.combine(parsed_date, parsed_time) 값을 함수 결과로 반환한다.
                return datetime.combine(parsed_date, parsed_time)

            # 설명: 호출자에게 datetime.fromisoformat(raw.replace('Z', '+00:00')) 값을 함수 결과로 반환한다.
            return datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError as exc:
            # 설명: 현재 처리를 중단하고 ValueError(f'{field_name} 값이 올바르지 않습니다.')를 호출자에게 전달한다.
            raise ValueError(f"{field_name} 값이 올바르지 않습니다.") from exc

    # 설명: `_is_report_editable` 함수는 조건의 참/거짓을 판정하는 함수다.
    @staticmethod
    def _is_report_editable(report):
        # 설명: 호출자에게 report.status not in {'CLOSED', 'CANCELLED', 'DELETED'} 값을 함수 결과로 반환한다.
        return report.status not in {"CLOSED", "CANCELLED", "DELETED"}

    # 설명: `_can_manage_report` 함수는 현재 주체가 작업 가능한지 판정하는 함수다.
    @staticmethod
    def _can_manage_report(report, current_user):
        # 설명: 호출자에게 report.reporter_id == current_user.id or current_user.role in {'SUPER_ADMIN', '... 값을 함수 결과로 반환한다.
        return (
            report.reporter_id == current_user.id
            or current_user.role in {"SUPER_ADMIN", "CONTROL_ADMIN"}
        )

    # 설명: `_upsert_report_location` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _upsert_report_location(report_id, data, user_id=None):
        # 설명: app.models에서 ReportLocation 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import ReportLocation

        # 설명: `now`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = ReportUploadService._now()
        # 설명: `has_location_key`에 `any` 호출 결과를 저장해 다음 처리에서 사용한다.
        has_location_key = any(
            key in data
            for key in ("location", "address", "place_name", "latitude", "longitude")
        )

        # 설명: `not has_location_key` 조건 결과에 따라 실행 경로를 분기한다.
        if not has_location_key:
            # 설명: 현재 함수의 처리를 종료하고 호출자에게 별도 값을 반환하지 않는다.
            return

        # 설명: `location_text`에 `(data.get('location') or data.get('address') or data.get('place_nam...` 호출 결과를 저장해 다음 처리에서 사용한다.
        location_text = (
            data.get("location")
            or data.get("address")
            or data.get("place_name")
            or ""
        ).strip()
        # 설명: `latitude`에 `ReportUploadService._to_optional_decimal` 호출 결과를 저장해 다음 처리에서 사용한다.
        latitude = ReportUploadService._to_optional_decimal(data.get("latitude"), "위도")
        # 설명: `longitude`에 `ReportUploadService._to_optional_decimal` 호출 결과를 저장해 다음 처리에서 사용한다.
        longitude = ReportUploadService._to_optional_decimal(data.get("longitude"), "경도")

        # 설명: `not location_text and latitude is None and (longitude is None)` 조건 결과에 따라 실행 경로를 분기한다.
        if not location_text and latitude is None and longitude is None:
            # 설명: 현재 함수의 처리를 종료하고 호출자에게 별도 값을 반환하지 않는다.
            return

        # 설명: `location`에 `ReportLocation.query.filter_by(report_id=report_id).order_by(Report...` 호출 결과를 저장해 다음 처리에서 사용한다.
        location = (
            ReportLocation.query
            .filter_by(report_id=report_id)
            .order_by(ReportLocation.id.asc())
            .first()
        )

        # 설명: `location is None` 조건 결과에 따라 실행 경로를 분기한다.
        if location is None:
            # 설명: `location`에 `ReportLocation` 호출 결과를 저장해 다음 처리에서 사용한다.
            location = ReportLocation(**ReportUploadService._model_kwargs(
                ReportLocation,
                {
                    "report_id": report_id,
                    "location_source": "USER",
                    "is_location_confirmed": 0,
                    "created_at": now,
                },
            ))

        # 설명: `ReportUploadService._model_kwargs(ReportLocation, {'latitud...`의 각 항목을 `(key, value)`로 받아 반복 처리한다.
        for key, value in ReportUploadService._model_kwargs(
            ReportLocation,
            {
                "latitude": latitude,
                "longitude": longitude,
                "place_name": location_text or None,
                "address_raw": location_text or None,
                "updated_at": now,
            },
        ).items():
            # 설명: `setattr`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            setattr(location, key, value)

        # 설명: 호출자에게 location 값을 함수 결과로 반환한다.
        return location


    # 설명: `_draft_title` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _draft_title(data):
        # 설명: `title`에 data.get('title') or data.get('subject') 표현식의 계산 결과를 저장한다.
        title = data.get("title") or data.get("subject")
        # 설명: `title is not None` 조건 결과에 따라 실행 경로를 분기한다.
        if title is not None:
            # 설명: `title`에 `str(title).strip` 호출 결과를 저장해 다음 처리에서 사용한다.
            title = str(title).strip()
        # 설명: 호출자에게 title or f'임시저장 신고 {ReportUploadService._now().strftime('%Y%m%d')}' 값을 함수 결과로 반환한다.
        return title or f"임시저장 신고 {ReportUploadService._now().strftime('%Y%m%d')}"

    # 설명: `_to_optional_int` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _to_optional_int(value, field_name):
        # 설명: `value is None` 조건 결과에 따라 실행 경로를 분기한다.
        if value is None:
            # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
            return None
        # 설명: `isinstance(value, str)` 조건 결과에 따라 실행 경로를 분기한다.
        if isinstance(value, str):
            # 설명: `value`에 `value.strip` 호출 결과를 저장해 다음 처리에서 사용한다.
            value = value.strip()
            # 설명: `not value` 조건 결과에 따라 실행 경로를 분기한다.
            if not value:
                # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
                return None
        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: 호출자에게 int(value) 값을 함수 결과로 반환한다.
            return int(value)
        except (TypeError, ValueError) as exc:
            # 설명: 현재 처리를 중단하고 ValueError(f'{field_name} 값이 올바르지 않습니다.')를 호출자에게 전달한다.
            raise ValueError(f"{field_name} 값이 올바르지 않습니다.") from exc

    # 설명: `_is_draft` 함수는 조건의 참/거짓을 판정하는 함수다.
    @staticmethod
    def _is_draft(report):
        # 설명: 호출자에게 report.status == 'DRAFT' 값을 함수 결과로 반환한다.
        return report.status == "DRAFT"

    # 설명: `create_report_draft` 함수는 새 데이터나 리소스를 생성하는 함수다.
    @staticmethod
    def create_report_draft(current_user, data):
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport

        # 설명: `data`에 data or {} 표현식의 계산 결과를 저장한다.
        data = data or {}
        # 설명: `now`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = ReportUploadService._now()

        # 설명: `cctv_id`에 `ReportUploadService._to_optional_int` 호출 결과를 저장해 다음 처리에서 사용한다.
        cctv_id = ReportUploadService._to_optional_int(data.get("cctv_id"), "cctv_id")

        # 설명: `report`에 `IncidentReport` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = IncidentReport(
            report_code=ReportUploadService._generate_report_code(now),
            report_type=data.get("report_type") or "GENERAL",
            upload_purpose=data.get("upload_purpose") or "DRAFT",
            report_source_type=data.get("report_source_type") or "WEB",
            title=ReportUploadService._draft_title(data),
            description=data.get("description"),
            reporter_id=current_user.id,
            cctv_id=cctv_id,
            status="DRAFT",
            priority=data.get("priority") or "NORMAL",
            is_demo_data=0,
            submitted_at=now,
            created_at=now,
            updated_at=now,
        )

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
            db.session.add(report)
            # INSERT를 미리 flush해 commit 전에도 자동 생성된 report.id를 자식 FK에 사용한다.
            db.session.flush()

            # 설명: `location`에 `ReportUploadService._upsert_report_location` 호출 결과를 저장해 다음 처리에서 사용한다.
            location = ReportUploadService._upsert_report_location(
                report_id=report.id,
                data=data,
                user_id=current_user.id,
            )
            # 설명: `location is not None` 조건 결과에 따라 실행 경로를 분기한다.
            if location is not None:
                # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
                db.session.add(location)

            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()
        except ValueError:
            # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
            db.session.rollback()
            # 설명: 현재 처리를 중단하고 기존 예외를 호출자에게 전달한다.
            raise
        except Exception:
            # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
            db.session.rollback()
            # 설명: `current_app.logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            current_app.logger.exception("Report draft creation failed")
            # 설명: 현재 처리를 중단하고 기존 예외를 호출자에게 전달한다.
            raise

        # 설명: 호출자에게 ({'success': True, 'message': '신고가 임시저장되었습니다.', 'draft': ReportUploadService._r... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "message": "신고가 임시저장되었습니다.",
            "draft": ReportUploadService._report_response(report, current_user=current_user),
            "draft_id": report.id,
        }, 201

    # 설명: `list_report_drafts` 함수는 조건에 맞는 목록을 조회하는 함수다.
    @staticmethod
    def list_report_drafts(args, current_user):
        # 설명: app.models에서 IncidentReport 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport

        # 설명: `page`에 `ReportUploadService._to_positive_int` 호출 결과를 저장해 다음 처리에서 사용한다.
        page = ReportUploadService._to_positive_int(args.get("page"), 1, maximum=100000)
        # 설명: `size`에 `ReportUploadService._to_positive_int` 호출 결과를 저장해 다음 처리에서 사용한다.
        size = ReportUploadService._to_positive_int(
            args.get("size", args.get("limit", 10)),
            10,
            maximum=200,
        )

        # 설명: `query`에 `IncidentReport.query.filter(IncidentReport.status == 'DRAFT').filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = (
            IncidentReport.query
            .filter(IncidentReport.status == "DRAFT")
            .filter(IncidentReport.reporter_id == current_user.id)
        )

        # 설명: `hasattr(IncidentReport, 'deleted_at')` 조건 결과에 따라 실행 경로를 분기한다.
        if hasattr(IncidentReport, "deleted_at"):
            # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
            query = query.filter(IncidentReport.deleted_at.is_(None))

        # 설명: `pagination`에 `query.order_by(IncidentReport.id.desc()).paginate` 호출 결과를 저장해 다음 처리에서 사용한다.
        pagination = query.order_by(IncidentReport.id.desc()).paginate(
            page=page,
            per_page=size,
            error_out=False,
        )

        # 설명: `drafts`에 [ReportUploadService._report_response(report, include_children=False,... 표현식의 계산 결과를 저장한다.
        drafts = [
            ReportUploadService._report_response(
                report, include_children=False, current_user=current_user
            )
            for report in pagination.items
        ]

        # 설명: 호출자에게 ({'success': True, 'data': {'items': drafts, 'page': page, 'size': size, 'total... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "data": {
                "items": drafts,
                "page": page,
                "size": size,
                "total_count": pagination.total,
                "total_pages": pagination.pages,
            },
            "drafts": drafts,
            "page": page,
            "size": size,
            "total_count": pagination.total,
            "total_pages": pagination.pages,
        }, 200


    # 설명: `submit_report_draft` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def submit_report_draft(draft_id, current_user):
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport, ReportStatusHistory 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport, ReportStatusHistory

        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, draft_id)

        # 설명: `not report or report.status == 'DELETED'` 조건 결과에 따라 실행 경로를 분기한다.
        if not report or report.status == "DELETED":
            # 설명: 호출자에게 ({'success': False, 'error': '임시저장 신고를 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "임시저장 신고를 찾을 수 없습니다.",
            }, 404

        # 설명: `not ReportUploadService._is_draft(report)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._is_draft(report):
            # 설명: 호출자에게 ({'success': False, 'error': '임시저장 상태의 신고만 최종 제출할 수 있습니다.'}, 400) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "임시저장 상태의 신고만 최종 제출할 수 있습니다.",
            }, 400

        # 설명: `not ReportUploadService._can_manage_report(report, current_user)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._can_manage_report(report, current_user):
            # 설명: 호출자에게 ({'success': False, 'error': '임시저장 신고 제출 권한이 없습니다.'}, 403) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "임시저장 신고 제출 권한이 없습니다.",
            }, 403

        # 설명: `now`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = ReportUploadService._now()
        # 설명: `previous_status`에 report.status 표현식의 계산 결과를 저장한다.
        previous_status = report.status

        # 설명: `report.status`의 기준값 또는 기본값을 'SUBMITTED'로 설정한다.
        report.status = "SUBMITTED"
        # 설명: `report.upload_purpose`의 기준값 또는 기본값을 'REPORT'로 설정한다.
        report.upload_purpose = "REPORT"
        # 설명: `report.submitted_at`에 now 표현식의 계산 결과를 저장한다.
        report.submitted_at = now
        # 설명: `report.updated_at`에 now 표현식의 계산 결과를 저장한다.
        report.updated_at = now

        # 설명: `history`에 `ReportStatusHistory` 호출 결과를 저장해 다음 처리에서 사용한다.
        history = ReportStatusHistory(
            report_id=report.id,
            previous_status=previous_status,
            new_status="SUBMITTED",
            changed_by=current_user.id,
            change_reason="Draft submitted",
            created_at=now,
        )

        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(history)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: 호출자에게 ({'success': True, 'message': '임시저장 신고가 최종 제출되었습니다.', 'report': ReportUploadSer... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "message": "임시저장 신고가 최종 제출되었습니다.",
            "report": ReportUploadService._report_response(report, current_user=current_user),
            "report_id": report.id,
        }, 200


    # 설명: `get_report_draft` 함수는 단일 값이나 리소스를 조회하는 함수다.
    @staticmethod
    def get_report_draft(draft_id, current_user):
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport

        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, draft_id)
        # 설명: `not report or report.status == 'DELETED'` 조건 결과에 따라 실행 경로를 분기한다.
        if not report or report.status == "DELETED":
            # 설명: 호출자에게 ({'success': False, 'error': '임시저장 신고를 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "임시저장 신고를 찾을 수 없습니다.",
            }, 404

        # 설명: `not ReportUploadService._is_draft(report)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._is_draft(report):
            # 설명: 호출자에게 ({'success': False, 'error': '임시저장 신고가 아닙니다.'}, 400) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "임시저장 신고가 아닙니다.",
            }, 400

        # 설명: `not ReportUploadService._can_manage_report(report, current_user)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._can_manage_report(report, current_user):
            # 설명: 호출자에게 ({'success': False, 'error': '임시저장 신고 조회 권한이 없습니다.'}, 403) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "임시저장 신고 조회 권한이 없습니다.",
            }, 403

        # 설명: 호출자에게 ({'success': True, 'draft': ReportUploadService._report_response(report, curren... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "draft": ReportUploadService._report_response(report, current_user=current_user),
        }, 200

    # 설명: `update_report_draft` 함수는 기존 데이터의 허용된 값을 변경하는 함수다.
    @staticmethod
    def update_report_draft(draft_id, current_user, data):
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport

        # 설명: `data`에 data or {} 표현식의 계산 결과를 저장한다.
        data = data or {}
        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, draft_id)

        # 설명: `not report or report.status == 'DELETED'` 조건 결과에 따라 실행 경로를 분기한다.
        if not report or report.status == "DELETED":
            # 설명: 호출자에게 ({'success': False, 'error': '임시저장 신고를 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "임시저장 신고를 찾을 수 없습니다.",
            }, 404

        # 설명: `not ReportUploadService._is_draft(report)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._is_draft(report):
            # 설명: 호출자에게 ({'success': False, 'error': '임시저장 신고가 아닙니다.'}, 400) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "임시저장 신고가 아닙니다.",
            }, 400

        # 설명: `not ReportUploadService._can_manage_report(report, current_user)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._can_manage_report(report, current_user):
            # 설명: 호출자에게 ({'success': False, 'error': '임시저장 신고 수정 권한이 없습니다.'}, 403) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "임시저장 신고 수정 권한이 없습니다.",
            }, 403

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `'report_type' in data` 조건 결과에 따라 실행 경로를 분기한다.
            if "report_type" in data:
                # 설명: `report.report_type`에 data.get('report_type') or report.report_type 표현식의 계산 결과를 저장한다.
                report.report_type = data.get("report_type") or report.report_type
            # 설명: `'upload_purpose' in data` 조건 결과에 따라 실행 경로를 분기한다.
            if "upload_purpose" in data:
                # 설명: `report.upload_purpose`에 data.get('upload_purpose') or report.upload_purpose 표현식의 계산 결과를 저장한다.
                report.upload_purpose = data.get("upload_purpose") or report.upload_purpose
            # 설명: `'title' in data or 'subject' in data` 조건 결과에 따라 실행 경로를 분기한다.
            if "title" in data or "subject" in data:
                # 설명: `report.title`에 `ReportUploadService._draft_title` 호출 결과를 저장해 다음 처리에서 사용한다.
                report.title = ReportUploadService._draft_title(data)
            # 설명: `'description' in data` 조건 결과에 따라 실행 경로를 분기한다.
            if "description" in data:
                # 설명: `report.description`에 `data.get` 호출 결과를 저장해 다음 처리에서 사용한다.
                report.description = data.get("description")
            # 설명: `'priority' in data` 조건 결과에 따라 실행 경로를 분기한다.
            if "priority" in data:
                # 설명: `report.priority`에 data.get('priority') or report.priority 표현식의 계산 결과를 저장한다.
                report.priority = data.get("priority") or report.priority
            # 설명: `'cctv_id' in data` 조건 결과에 따라 실행 경로를 분기한다.
            if "cctv_id" in data:
                # 설명: `report.cctv_id`에 `ReportUploadService._to_optional_int` 호출 결과를 저장해 다음 처리에서 사용한다.
                report.cctv_id = ReportUploadService._to_optional_int(data.get("cctv_id"), "cctv_id")

            # 설명: `report.updated_at`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
            report.updated_at = ReportUploadService._now()

            # 설명: `location`에 `ReportUploadService._upsert_report_location` 호출 결과를 저장해 다음 처리에서 사용한다.
            location = ReportUploadService._upsert_report_location(
                report_id=report.id,
                data=data,
                user_id=current_user.id,
            )
            # 설명: `location is not None` 조건 결과에 따라 실행 경로를 분기한다.
            if location is not None:
                # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
                db.session.add(location)

            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()
        except ValueError:
            # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
            db.session.rollback()
            # 설명: 현재 처리를 중단하고 기존 예외를 호출자에게 전달한다.
            raise
        except Exception:
            # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
            db.session.rollback()
            # 설명: `current_app.logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            current_app.logger.exception("Report draft update failed", extra={"draft_id": draft_id})
            # 설명: 현재 처리를 중단하고 기존 예외를 호출자에게 전달한다.
            raise

        # 설명: 호출자에게 ({'success': True, 'message': '임시저장 신고가 수정되었습니다.', 'draft': ReportUploadService... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "message": "임시저장 신고가 수정되었습니다.",
            "draft": ReportUploadService._report_response(report, current_user=current_user),
        }, 200

    # 설명: `delete_report_draft` 함수는 대상을 삭제 또는 소프트 삭제 처리하는 함수다.
    @staticmethod
    def delete_report_draft(draft_id, current_user):
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport

        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, draft_id)

        # 설명: `not report or report.status == 'DELETED'` 조건 결과에 따라 실행 경로를 분기한다.
        if not report or report.status == "DELETED":
            # 설명: 호출자에게 ({'success': False, 'error': '임시저장 신고를 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "임시저장 신고를 찾을 수 없습니다.",
            }, 404

        # 설명: `not ReportUploadService._is_draft(report)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._is_draft(report):
            # 설명: 호출자에게 ({'success': False, 'error': '임시저장 신고가 아닙니다.'}, 400) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "임시저장 신고가 아닙니다.",
            }, 400

        # 설명: `not ReportUploadService._can_manage_report(report, current_user)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._can_manage_report(report, current_user):
            # 설명: 호출자에게 ({'success': False, 'error': '임시저장 신고 삭제 권한이 없습니다.'}, 403) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "임시저장 신고 삭제 권한이 없습니다.",
            }, 403

        # 설명: `now`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = ReportUploadService._now()
        # 설명: `report.status`의 기준값 또는 기본값을 'DELETED'로 설정한다.
        report.status = "DELETED"
        # 설명: `report.deleted_at`에 now 표현식의 계산 결과를 저장한다.
        report.deleted_at = now
        # 설명: `report.deleted_by`에 current_user.id 표현식의 계산 결과를 저장한다.
        report.deleted_by = current_user.id
        # 설명: `report.updated_at`에 now 표현식의 계산 결과를 저장한다.
        report.updated_at = now

        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: 호출자에게 ({'success': True, 'message': '임시저장 신고가 삭제되었습니다.'}, 200) 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "message": "임시저장 신고가 삭제되었습니다.",
        }, 200


    # 설명: `list_reports` 함수는 조건에 맞는 목록을 조회하는 함수다.
    @staticmethod
    def list_reports(args, current_user=None, mine_only=False):
        # 설명: app.models에서 IncidentReport 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport
        # 설명: sqlalchemy에서 or_ 이름을 가져와 아래 로직에서 재사용한다.
        from sqlalchemy import or_

        # 설명: `page`에 `ReportUploadService._to_positive_int` 호출 결과를 저장해 다음 처리에서 사용한다.
        page = ReportUploadService._to_positive_int(args.get("page"), 1, maximum=100000)
        # 설명: `size`에 `ReportUploadService._to_positive_int` 호출 결과를 저장해 다음 처리에서 사용한다.
        size = ReportUploadService._to_positive_int(
            args.get("size", args.get("limit", 10)),
            10,
            maximum=200,
        )

        # 설명: `query`에 IncidentReport.query 표현식의 계산 결과를 저장한다.
        query = IncidentReport.query

        # 설명: `status`에 `args.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        status = args.get("status")
        # 설명: `status` 조건 결과에 따라 실행 경로를 분기한다.
        if status:
            # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
            query = query.filter(IncidentReport.status == status)
        else:
            # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
            query = query.filter(IncidentReport.status.notin_(("CANCELLED", "DELETED")))
            # 설명: `hasattr(IncidentReport, 'deleted_at')` 조건 결과에 따라 실행 경로를 분기한다.
            if hasattr(IncidentReport, "deleted_at"):
                # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
                query = query.filter(IncidentReport.deleted_at.is_(None))

        # 설명: `keyword`에 `args.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        keyword = args.get("keyword")
        # 설명: `keyword` 조건 결과에 따라 실행 경로를 분기한다.
        if keyword:
            # 설명: `like_keyword`에 f'%{keyword}%' 표현식의 계산 결과를 저장한다.
            like_keyword = f"%{keyword}%"
            # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
            query = query.filter(or_(
                IncidentReport.title.ilike(like_keyword),
                IncidentReport.description.ilike(like_keyword),
                IncidentReport.report_code.ilike(like_keyword),
            ))

        # 설명: `filters`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        filters = {
            "report_type": IncidentReport.report_type,
            "priority": IncidentReport.priority,
            "risk_level": IncidentReport.risk_level,
        }

        # 설명: `filters.items()`의 각 항목을 `(param_name, column)`로 받아 반복 처리한다.
        for param_name, column in filters.items():
            # 설명: `value`에 `args.get` 호출 결과를 저장해 다음 처리에서 사용한다.
            value = args.get(param_name)
            # 설명: `value` 조건 결과에 따라 실행 경로를 분기한다.
            if value:
                # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
                query = query.filter(column == value)

        # 설명: `cctv_id`에 `args.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        cctv_id = args.get("cctv_id")
        # 설명: `cctv_id not in (None, '')` 조건 결과에 따라 실행 경로를 분기한다.
        if cctv_id not in (None, ""):
            # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
            try:
                # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
                query = query.filter(IncidentReport.cctv_id == int(cctv_id))
            except (TypeError, ValueError) as exc:
                # 설명: 현재 처리를 중단하고 ValueError('cctv_id 값이 올바르지 않습니다.')를 호출자에게 전달한다.
                raise ValueError("cctv_id 값이 올바르지 않습니다.") from exc

        # 설명: `start_date`에 `ReportUploadService._parse_date` 호출 결과를 저장해 다음 처리에서 사용한다.
        start_date = ReportUploadService._parse_date(args.get("start_date"), "start_date")
        # 설명: `end_date`에 `ReportUploadService._parse_date` 호출 결과를 저장해 다음 처리에서 사용한다.
        end_date = ReportUploadService._parse_date(args.get("end_date"), "end_date", end_of_day=True)

        # 설명: `start_date` 조건 결과에 따라 실행 경로를 분기한다.
        if start_date:
            # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
            query = query.filter(IncidentReport.submitted_at >= start_date)

        # 설명: `end_date` 조건 결과에 따라 실행 경로를 분기한다.
        if end_date:
            # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
            query = query.filter(IncidentReport.submitted_at <= end_date)

        # 설명: `mine`에 mine_only or ReportUploadService._to_bool(args.get('mine')) 표현식의 계산 결과를 저장한다.
        mine = mine_only or ReportUploadService._to_bool(args.get("mine"))
        # 설명: `current_user is None` 조건 결과에 따라 실행 경로를 분기한다.
        if current_user is None:
            # 설명: 현재 처리를 중단하고 ValueError('신고 목록은 로그인 사용자가 필요합니다.')를 호출자에게 전달한다.
            raise ValueError("신고 목록은 로그인 사용자가 필요합니다.")
        # 설명: `mine or not ReportUploadService._is_admin(current_user)` 조건 결과에 따라 실행 경로를 분기한다.
        if mine or not ReportUploadService._is_admin(current_user):
            # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
            query = query.filter(IncidentReport.reporter_id == current_user.id)

        # 설명: `pagination`에 `query.order_by(IncidentReport.id.desc()).paginate` 호출 결과를 저장해 다음 처리에서 사용한다.
        pagination = query.order_by(IncidentReport.id.desc()).paginate(
            page=page,
            per_page=size,
            error_out=False,
        )

        # 설명: `reports`에 `list` 호출 결과를 저장해 다음 처리에서 사용한다.
        reports = list(pagination.items)
        # 설명: `items`에 [ReportUploadService._report_response(report, include_children=False,... 표현식의 계산 결과를 저장한다.
        items = [
            ReportUploadService._report_response(
                report, include_children=False, current_user=current_user
            )
            for report in reports
        ]
        # 설명: `ReportUploadService._attach_list_attachment_summaries`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        ReportUploadService._attach_list_attachment_summaries(reports, items)

        # 설명: `data`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        data = {
            "items": items,
            "page": page,
            "size": size,
            "total_count": pagination.total,
            "total_pages": pagination.pages,
        }

        # 설명: 호출자에게 ({'success': True, 'data': data, 'reports': items, 'page': page, 'size': size, ... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "data": data,
            "reports": items,
            "page": page,
            "size": size,
            "total_count": pagination.total,
            "total_pages": pagination.pages,
        }, 200

    # 설명: `get_report` 함수는 단일 값이나 리소스를 조회하는 함수다.
    @staticmethod
    def get_report(report_id, current_user=None):
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport

        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, report_id)
        # 설명: `not report or getattr(report, 'deleted_at', None)` 조건 결과에 따라 실행 경로를 분기한다.
        if not report or getattr(report, "deleted_at", None):
            # 설명: 호출자에게 ({'success': False, 'error': '리포트를 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "리포트를 찾을 수 없습니다.",
            }, 404

        # 설명: `current_user is not None and (not ReportUploadService._can_manage_report(report, ...` 조건 결과에 따라 실행 경로를 분기한다.
        if (
            current_user is not None
            and not ReportUploadService._can_manage_report(report, current_user)
        ):
            # 설명: 호출자에게 ({'success': False, 'error': '신고 조회 권한이 없습니다.'}, 403) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "신고 조회 권한이 없습니다."}, 403

        # 설명: `report_data`에 `ReportUploadService._report_response` 호출 결과를 저장해 다음 처리에서 사용한다.
        report_data = ReportUploadService._report_response(
            report, current_user=current_user
        )
        # 설명: 호출자에게 ({'success': True, 'data': report_data, 'report': report_data}, 200) 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "data": report_data,
            "report": report_data,
        }, 200

    # 설명: `create_report` 함수는 새 데이터나 리소스를 생성하는 함수다.
    @staticmethod
    def create_report(user_id, data, files):
        """신고 부모 행, 디스크 파일, 첨부/위치 자식 행을 하나의 논리 작업으로 생성한다.

        DB 트랜잭션은 원자적이지만 파일시스템은 DB 트랜잭션에 참여하지 않으므로, 실패 시
        rollback과 함께 이미 저장된 파일 경로를 별도로 삭제해 두 저장소를 맞춘다.
        """
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport, ReportAttachment, ReportLocation 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport, ReportAttachment, ReportLocation

        # 설명: `saved_file_paths`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        saved_file_paths = []
        # 설명: `now`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = ReportUploadService._now()

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `report`에 `IncidentReport` 호출 결과를 저장해 다음 처리에서 사용한다.
            report = IncidentReport(
                report_code=ReportUploadService._generate_report_code(now),
                report_type=data.get("report_type", "GENERAL"),
                upload_purpose=data.get("upload_purpose", "ANALYSIS"),
                report_source_type="WEB",
                title=data.get("subject") or data.get("title") or f"New Report {now.strftime('%Y%m%d')}",
                description=data.get("description"),
                reporter_id=user_id,
                status="SUBMITTED",
                priority=data.get("priority", "NORMAL"),
                is_demo_data=str(data.get("is_demo_data", "false")).lower() == "true",
                submitted_at=now,
                created_at=now,
                updated_at=now,
            )

            # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
            db.session.add(report)
            # commit 전 INSERT를 실행해 첨부/위치 행에 넣을 자동 증가 report.id를 확보한다.
            db.session.flush()

            # 설명: `upload_path`에 `current_app.config.get` 호출 결과를 저장해 다음 처리에서 사용한다.
            upload_path = current_app.config.get("UPLOAD_BASE_PATH")
            # 설명: `not upload_path` 조건 결과에 따라 실행 경로를 분기한다.
            if not upload_path:
                # 설명: 현재 처리를 중단하고 RuntimeError('UPLOAD_BASE_PATH 설정이 없습니다.')를 호출자에게 전달한다.
                raise RuntimeError("UPLOAD_BASE_PATH 설정이 없습니다.")

            # 설명: `os.makedirs`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            os.makedirs(upload_path, exist_ok=True)

            # 설명: `saved_count`의 기준값 또는 기본값을 0로 설정한다.
            saved_count = 0

            # 설명: `files`의 각 항목을 `file`로 받아 반복 처리한다.
            for file in files:
                # 설명: `not file or file.filename == ''` 조건 결과에 따라 실행 경로를 분기한다.
                if not file or file.filename == "":
                    # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
                    continue

                # 설명: `original_filename`에 `ReportUploadService._clean_original_filename` 호출 결과를 저장해 다음 처리에서 사용한다.
                original_filename = ReportUploadService._clean_original_filename(file.filename)
                # 설명: `file_type`에 `ReportUploadService._get_file_type` 호출 결과를 저장해 다음 처리에서 사용한다.
                file_type = ReportUploadService._get_file_type(original_filename)

                # 설명: `file_type == 'UNKNOWN'` 조건 결과에 따라 실행 경로를 분기한다.
                if file_type == "UNKNOWN":
                    # 설명: 현재 처리를 중단하고 ValueError('지원하지 않는 파일 형식입니다.')를 호출자에게 전달한다.
                    raise ValueError("지원하지 않는 파일 형식입니다.")

                # 설명: `file.seek`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                file.seek(0, os.SEEK_END)
                # 설명: `file_length`에 `file.tell` 호출 결과를 저장해 다음 처리에서 사용한다.
                file_length = file.tell()
                # 설명: `file.seek`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                file.seek(0)

                # 설명: `ReportUploadService._validate_file_size`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                ReportUploadService._validate_file_size(file_type, file_length)

                # 설명: `file.seek`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                file.seek(0)
                # 설명: `file_hash`에 `hashlib.md5(file.read()).hexdigest` 호출 결과를 저장해 다음 처리에서 사용한다.
                file_hash = hashlib.md5(file.read()).hexdigest()
                # 설명: `file.seek`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                file.seek(0)

                # 설명: `stored_filename`에 `ReportUploadService._stored_filename` 호출 결과를 저장해 다음 처리에서 사용한다.
                stored_filename = ReportUploadService._stored_filename(original_filename)
                # 설명: `file_full_path`에 `os.path.join` 호출 결과를 저장해 다음 처리에서 사용한다.
                file_full_path = os.path.join(upload_path, stored_filename)

                # 설명: `file.save`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                file.save(file_full_path)
                # 설명: `saved_file_paths.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
                saved_file_paths.append(file_full_path)
                # 설명: `saved_count`의 기준값 또는 기본값을 1로 설정한다.
                saved_count += 1

                # 파일 바이트는 디스크에, 검색/권한/표시용 메타데이터는 DB에 분리 저장한다.
                attachment = ReportAttachment(
                    report_id=report.id,
                    file_type=file_type,
                    original_filename=original_filename,
                    stored_filename=stored_filename,
                    storage_type="LOCAL",
                    file_path=file_full_path,
                    file_size=file_length,
                    file_hash=file_hash,
                    mime_type=file.content_type or "application/octet-stream",
                    scan_status="PENDING",
                    is_private=False,
                    download_count=0,
                    access_count=0,
                    uploaded_by=user_id,
                    uploaded_at=now,
                    created_at=now,
                )
                # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
                db.session.add(attachment)

            # 설명: `saved_count == 0` 조건 결과에 따라 실행 경로를 분기한다.
            if saved_count == 0:
                # 설명: 현재 처리를 중단하고 ValueError('저장 가능한 파일이 없습니다.')를 호출자에게 전달한다.
                raise ValueError("저장 가능한 파일이 없습니다.")

            # 설명: `location_text`에 `(data.get('location') or data.get('address') or data.get('place_nam...` 호출 결과를 저장해 다음 처리에서 사용한다.
            location_text = (data.get("location") or data.get("address") or data.get("place_name") or "").strip()
            # 설명: `latitude`에 `ReportUploadService._to_optional_decimal` 호출 결과를 저장해 다음 처리에서 사용한다.
            latitude = ReportUploadService._to_optional_decimal(data.get("latitude"), "위도")
            # 설명: `longitude`에 `ReportUploadService._to_optional_decimal` 호출 결과를 저장해 다음 처리에서 사용한다.
            longitude = ReportUploadService._to_optional_decimal(data.get("longitude"), "경도")

            # 설명: `location_text or latitude is not None or longitude is not None` 조건 결과에 따라 실행 경로를 분기한다.
            if location_text or latitude is not None or longitude is not None:
                # 위치는 선택 자식 행이다. 좌표/주소가 모두 비어 있으면 빈 레코드를 만들지 않는다.
                location = ReportLocation(**ReportUploadService._model_kwargs(
                    ReportLocation,
                    {
                        "report_id": report.id,
                        "location_source": "USER",
                        "latitude": latitude,
                        "longitude": longitude,
                        "place_name": location_text or None,
                        "address_raw": location_text or None,
                        "is_location_confirmed": 0,
                        "created_at": now,
                        "updated_at": now,
                    },
                ))
                # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
                db.session.add(location)

            # 부모와 모든 자식 INSERT가 성공한 경우에만 한 번에 확정한다.
            db.session.commit()
            # 설명: 호출자에게 report 값을 함수 결과로 반환한다.
            return report

        except Exception:
            # DB 변경을 취소한 뒤 DB가 자동으로 되돌릴 수 없는 디스크 파일도 보상 삭제한다.
            db.session.rollback()

            # 설명: `saved_file_paths`의 각 항목을 `path`로 받아 반복 처리한다.
            for path in saved_file_paths:
                # 설명: `path and os.path.exists(path)` 조건 결과에 따라 실행 경로를 분기한다.
                if path and os.path.exists(path):
                    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
                    try:
                        # 설명: `os.remove`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                        os.remove(path)
                    except OSError:
                        # 설명: `current_app.logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                        current_app.logger.exception("업로드 파일 정리 실패", extra={"file_path": path})

            # 설명: `current_app.logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            current_app.logger.exception("Report creation failed")
            # 설명: 현재 처리를 중단하고 기존 예외를 호출자에게 전달한다.
            raise


    # 설명: `add_report_attachments` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def add_report_attachments(report_id, current_user, files):
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport, ReportAttachment 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport, ReportAttachment

        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, report_id)
        # 설명: `not report or getattr(report, 'deleted_at', None) or report.status in {'DELETED',...` 조건 결과에 따라 실행 경로를 분기한다.
        if not report or getattr(report, "deleted_at", None) or report.status in {"DELETED", "CANCELLED"}:
            # 설명: 호출자에게 ({'success': False, 'error': '리포트를 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "리포트를 찾을 수 없습니다."}, 404

        # 설명: `not ReportUploadService._can_manage_report(report, current_user)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._can_manage_report(report, current_user):
            # 설명: 호출자에게 ({'success': False, 'error': '첨부파일 추가 권한이 없습니다.'}, 403) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "첨부파일 추가 권한이 없습니다."}, 403

        # 설명: `files`에 files or [] 표현식의 계산 결과를 저장한다.
        files = files or []
        # 설명: `not files` 조건 결과에 따라 실행 경로를 분기한다.
        if not files:
            # 설명: 호출자에게 ({'success': False, 'error': '파일이 업로드되지 않았습니다.'}, 400) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "파일이 업로드되지 않았습니다."}, 400

        # 설명: `upload_path`에 `current_app.config.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        upload_path = current_app.config.get("UPLOAD_BASE_PATH")
        # 설명: `not upload_path` 조건 결과에 따라 실행 경로를 분기한다.
        if not upload_path:
            # 설명: 호출자에게 ({'success': False, 'error': 'UPLOAD_BASE_PATH 설정이 없습니다.'}, 500) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "UPLOAD_BASE_PATH 설정이 없습니다."}, 500

        # 설명: `os.makedirs`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        os.makedirs(upload_path, exist_ok=True)

        # 설명: `now`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = ReportUploadService._now()
        # 설명: `saved_file_paths`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        saved_file_paths = []
        # 설명: `attachments`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        attachments = []

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `files`의 각 항목을 `file`로 받아 반복 처리한다.
            for file in files:
                # 설명: `not file or file.filename == ''` 조건 결과에 따라 실행 경로를 분기한다.
                if not file or file.filename == "":
                    # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
                    continue

                # 설명: `original_filename`에 `ReportUploadService._clean_original_filename` 호출 결과를 저장해 다음 처리에서 사용한다.
                original_filename = ReportUploadService._clean_original_filename(file.filename)
                # 설명: `file_type`에 `ReportUploadService._get_file_type` 호출 결과를 저장해 다음 처리에서 사용한다.
                file_type = ReportUploadService._get_file_type(original_filename)

                # 설명: `file_type == 'UNKNOWN'` 조건 결과에 따라 실행 경로를 분기한다.
                if file_type == "UNKNOWN":
                    # 설명: 현재 처리를 중단하고 ValueError('지원하지 않는 파일 형식입니다.')를 호출자에게 전달한다.
                    raise ValueError("지원하지 않는 파일 형식입니다.")

                # 설명: `file.seek`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                file.seek(0, os.SEEK_END)
                # 설명: `file_length`에 `file.tell` 호출 결과를 저장해 다음 처리에서 사용한다.
                file_length = file.tell()
                # 설명: `file.seek`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                file.seek(0)

                # 설명: `ReportUploadService._validate_file_size`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                ReportUploadService._validate_file_size(file_type, file_length)

                # 설명: `file.seek`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                file.seek(0)
                # 설명: `file_hash`에 `hashlib.md5(file.read()).hexdigest` 호출 결과를 저장해 다음 처리에서 사용한다.
                file_hash = hashlib.md5(file.read()).hexdigest()
                # 설명: `file.seek`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                file.seek(0)

                # 설명: `stored_filename`에 `ReportUploadService._stored_filename` 호출 결과를 저장해 다음 처리에서 사용한다.
                stored_filename = ReportUploadService._stored_filename(original_filename)
                # 설명: `file_full_path`에 `os.path.join` 호출 결과를 저장해 다음 처리에서 사용한다.
                file_full_path = os.path.join(upload_path, stored_filename)

                # 설명: `file.save`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                file.save(file_full_path)
                # 설명: `saved_file_paths.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
                saved_file_paths.append(file_full_path)

                # 설명: `attachment`에 `ReportAttachment` 호출 결과를 저장해 다음 처리에서 사용한다.
                attachment = ReportAttachment(
                    report_id=report.id,
                    file_type=file_type,
                    original_filename=original_filename,
                    stored_filename=stored_filename,
                    storage_type="LOCAL",
                    file_path=file_full_path,
                    file_size=file_length,
                    file_hash=file_hash,
                    mime_type=file.content_type or "application/octet-stream",
                    scan_status="PENDING",
                    is_private=False,
                    download_count=0,
                    access_count=0,
                    uploaded_by=current_user.id,
                    uploaded_at=now,
                    created_at=now,
                )
                # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
                db.session.add(attachment)
                # 설명: `attachments.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
                attachments.append(attachment)

            # 설명: `not attachments` 조건 결과에 따라 실행 경로를 분기한다.
            if not attachments:
                # 설명: 현재 처리를 중단하고 ValueError('저장 가능한 파일이 없습니다.')를 호출자에게 전달한다.
                raise ValueError("저장 가능한 파일이 없습니다.")

            # 설명: `report.updated_at`에 now 표현식의 계산 결과를 저장한다.
            report.updated_at = now
            # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
            db.session.add(report)
            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()

            # 설명: `items`에 [ReportUploadService._attachment_response(item) for item in attachments] 표현식의 계산 결과를 저장한다.
            items = [ReportUploadService._attachment_response(item) for item in attachments]

            # 설명: 호출자에게 ({'success': True, 'message': '첨부파일이 추가되었습니다.', 'count': len(items), 'items': i... 값을 함수 결과로 반환한다.
            return {
                "success": True,
                "message": "첨부파일이 추가되었습니다.",
                "count": len(items),
                "items": items,
            }, 201

        except Exception:
            # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
            db.session.rollback()

            # 설명: `saved_file_paths`의 각 항목을 `saved_path`로 받아 반복 처리한다.
            for saved_path in saved_file_paths:
                # 설명: `saved_path and os.path.exists(saved_path)` 조건 결과에 따라 실행 경로를 분기한다.
                if saved_path and os.path.exists(saved_path):
                    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
                    try:
                        # 설명: `os.remove`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                        os.remove(saved_path)
                    except OSError:
                        # 설명: `current_app.logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                        current_app.logger.exception(
                            "첨부파일 추가 실패 후 파일 정리 실패",
                            extra={"file_path": saved_path},
                        )

            # 설명: 현재 처리를 중단하고 기존 예외를 호출자에게 전달한다.
            raise

    # 설명: `delete_report_attachment` 함수는 대상을 삭제 또는 소프트 삭제 처리하는 함수다.
    @staticmethod
    def delete_report_attachment(report_id, attachment_id, current_user, data=None):
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport, ReportAttachment 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport, ReportAttachment

        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, report_id)
        # 설명: `not report or getattr(report, 'deleted_at', None) or report.status in {'DELETED',...` 조건 결과에 따라 실행 경로를 분기한다.
        if not report or getattr(report, "deleted_at", None) or report.status in {"DELETED", "CANCELLED"}:
            # 설명: 호출자에게 ({'success': False, 'error': '리포트를 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "리포트를 찾을 수 없습니다."}, 404

        # 설명: `attachment`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        attachment = db.session.get(ReportAttachment, attachment_id)
        # 설명: `not attachment or attachment.report_id != report.id or getattr(attachment, 'delet...` 조건 결과에 따라 실행 경로를 분기한다.
        if (
            not attachment
            or attachment.report_id != report.id
            or getattr(attachment, "deleted_at", None)
        ):
            # 설명: 호출자에게 ({'success': False, 'error': '첨부파일을 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "첨부파일을 찾을 수 없습니다."}, 404

        # 설명: `not ReportUploadService._can_manage_report(report, current_user)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._can_manage_report(report, current_user):
            # 설명: 호출자에게 ({'success': False, 'error': '첨부파일 삭제 권한이 없습니다.'}, 403) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "첨부파일 삭제 권한이 없습니다."}, 403

        # 설명: `data`에 data or {} 표현식의 계산 결과를 저장한다.
        data = data or {}
        # 설명: `reason`의 기준값 또는 기본값을 ''로 설정한다.
        reason = ""
        # 설명: `isinstance(data, dict)` 조건 결과에 따라 실행 경로를 분기한다.
        if isinstance(data, dict):
            # 설명: `reason`에 `str(data.get('reason') or data.get('delete_reason') or '').strip` 호출 결과를 저장해 다음 처리에서 사용한다.
            reason = str(data.get("reason") or data.get("delete_reason") or "").strip()

        # 설명: `now`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = ReportUploadService._now()

        # 설명: `attachment.deleted_by`에 current_user.id 표현식의 계산 결과를 저장한다.
        attachment.deleted_by = current_user.id
        # 설명: `attachment.delete_reason`에 reason or None 표현식의 계산 결과를 저장한다.
        attachment.delete_reason = reason or None
        # 설명: `attachment.deleted_at`에 now 표현식의 계산 결과를 저장한다.
        attachment.deleted_at = now
        # 설명: `report.updated_at`에 now 표현식의 계산 결과를 저장한다.
        report.updated_at = now

        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(attachment)
        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(report)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: 호출자에게 ({'success': True, 'message': '첨부파일이 삭제되었습니다.', 'attachment_id': attachment.id,... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "message": "첨부파일이 삭제되었습니다.",
            "attachment_id": attachment.id,
            "report_id": report.id,
        }, 200

    # 설명: `update_report` 함수는 기존 데이터의 허용된 값을 변경하는 함수다.
    @staticmethod
    def update_report(report_id, current_user, data):
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport

        # 설명: `data`에 data or {} 표현식의 계산 결과를 저장한다.
        data = data or {}
        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, report_id)

        # 설명: `not report` 조건 결과에 따라 실행 경로를 분기한다.
        if not report:
            # 설명: 호출자에게 ({'success': False, 'error': '리포트를 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "리포트를 찾을 수 없습니다.",
            }, 404

        # 설명: `not ReportUploadService._can_manage_report(report, current_user)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._can_manage_report(report, current_user):
            # 설명: 호출자에게 ({'success': False, 'error': '신고 수정 권한이 없습니다.'}, 403) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "신고 수정 권한이 없습니다.",
            }, 403

        # 설명: `not ReportUploadService._is_report_editable(report)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._is_report_editable(report):
            # 설명: 호출자에게 ({'success': False, 'error': '수정할 수 없는 신고 상태입니다.'}, 400) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "수정할 수 없는 신고 상태입니다.",
            }, 400

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `'report_type' in data` 조건 결과에 따라 실행 경로를 분기한다.
            if "report_type" in data:
                # 설명: `report.report_type`에 data.get('report_type') or report.report_type 표현식의 계산 결과를 저장한다.
                report.report_type = data.get("report_type") or report.report_type
            # 설명: `'upload_purpose' in data` 조건 결과에 따라 실행 경로를 분기한다.
            if "upload_purpose" in data:
                # 설명: `report.upload_purpose`에 data.get('upload_purpose') or report.upload_purpose 표현식의 계산 결과를 저장한다.
                report.upload_purpose = data.get("upload_purpose") or report.upload_purpose
            # 설명: `'title' in data or 'subject' in data` 조건 결과에 따라 실행 경로를 분기한다.
            if "title" in data or "subject" in data:
                # 설명: `report.title`에 data.get('title') or data.get('subject') or report.title 표현식의 계산 결과를 저장한다.
                report.title = data.get("title") or data.get("subject") or report.title
            # 설명: `'description' in data` 조건 결과에 따라 실행 경로를 분기한다.
            if "description" in data:
                # 설명: `report.description`에 `data.get` 호출 결과를 저장해 다음 처리에서 사용한다.
                report.description = data.get("description")
            # 설명: `'priority' in data` 조건 결과에 따라 실행 경로를 분기한다.
            if "priority" in data:
                # 설명: `report.priority`에 data.get('priority') or report.priority 표현식의 계산 결과를 저장한다.
                report.priority = data.get("priority") or report.priority

            # 설명: `report.updated_at`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
            report.updated_at = ReportUploadService._now()

            # 설명: `location`에 `ReportUploadService._upsert_report_location` 호출 결과를 저장해 다음 처리에서 사용한다.
            location = ReportUploadService._upsert_report_location(
                report_id=report.id,
                data=data,
                user_id=current_user.id,
            )
            # 설명: `location is not None` 조건 결과에 따라 실행 경로를 분기한다.
            if location is not None:
                # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
                db.session.add(location)

            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()

        except ValueError as exc:
            # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
            db.session.rollback()
            # 설명: 호출자에게 ({'success': False, 'error': str(exc)}, 400) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": str(exc),
            }, 400
        except Exception:
            # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
            db.session.rollback()
            # 설명: `current_app.logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            current_app.logger.exception("Report update failed", extra={"report_id": report_id})
            # 설명: 현재 처리를 중단하고 기존 예외를 호출자에게 전달한다.
            raise

        # 설명: 호출자에게 ({'success': True, 'message': '신고가 수정되었습니다.', 'data': ReportUploadService._repo... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "message": "신고가 수정되었습니다.",
            "data": ReportUploadService._report_response(
                report, current_user=current_user
            ),
        }, 200

    # 설명: `delete_report` 함수는 대상을 삭제 또는 소프트 삭제 처리하는 함수다.
    @staticmethod
    def delete_report(report_id, current_user):
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport, ReportAnalysisJob 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport, ReportAnalysisJob

        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, report_id)

        # 설명: `not report` 조건 결과에 따라 실행 경로를 분기한다.
        if not report:
            # 설명: 호출자에게 ({'success': False, 'error': '리포트를 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "리포트를 찾을 수 없습니다.",
            }, 404

        # 설명: `not ReportUploadService._can_manage_report(report, current_user)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._can_manage_report(report, current_user):
            # 설명: 호출자에게 ({'success': False, 'error': '신고 삭제 권한이 없습니다.'}, 403) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "신고 삭제 권한이 없습니다.",
            }, 403

        # 설명: `report.converted_incident_id` 조건 결과에 따라 실행 경로를 분기한다.
        if report.converted_incident_id:
            # 설명: 호출자에게 ({'success': False, 'error': '이상상황으로 전환된 신고는 삭제할 수 없습니다.'}, 409) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "이상상황으로 전환된 신고는 삭제할 수 없습니다.",
            }, 409

        # 설명: `active_job`에 `ReportAnalysisJob.query.filter(ReportAnalysisJob.report_id == repor...` 호출 결과를 저장해 다음 처리에서 사용한다.
        active_job = (
            ReportAnalysisJob.query
            .filter(
                ReportAnalysisJob.report_id == report.id,
                ReportAnalysisJob.job_status.in_(ReportUploadService.ACTIVE_JOB_STATUSES),
            )
            .first()
        )
        # 설명: `active_job` 조건 결과에 따라 실행 경로를 분기한다.
        if active_job:
            # 설명: 호출자에게 ({'success': False, 'error': '분석 중인 신고는 삭제할 수 없습니다.'}, 409) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "분석 중인 신고는 삭제할 수 없습니다.",
            }, 409

        # 설명: `report.status in {'CANCELLED', 'DELETED'}` 조건 결과에 따라 실행 경로를 분기한다.
        if report.status in {"CANCELLED", "DELETED"}:
            # 설명: 호출자에게 ({'success': False, 'error': '이미 삭제 또는 취소 처리된 신고입니다.'}, 400) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "이미 삭제 또는 취소 처리된 신고입니다.",
            }, 400

        # 설명: `now`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = ReportUploadService._now()
        # 설명: `report.status`의 기준값 또는 기본값을 'CANCELLED'로 설정한다.
        report.status = "CANCELLED"
        # 설명: `report.deleted_at`에 now 표현식의 계산 결과를 저장한다.
        report.deleted_at = now
        # 설명: `report.deleted_by`에 current_user.id 표현식의 계산 결과를 저장한다.
        report.deleted_by = current_user.id
        # 설명: `report.updated_at`에 now 표현식의 계산 결과를 저장한다.
        report.updated_at = now

        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: 호출자에게 ({'success': True, 'message': '신고가 삭제 또는 취소 처리되었습니다.'}, 200) 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "message": "신고가 삭제 또는 취소 처리되었습니다.",
        }, 200



    # 설명: `update_report_status` 함수는 기존 데이터의 허용된 값을 변경하는 함수다.
    @staticmethod
    def update_report_status(report_id, current_user, data):
        # 설명: `not ReportUploadService._is_admin(current_user)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._is_admin(current_user):
            # 설명: 호출자에게 ({'success': False, 'error': '관리자 권한이 필요합니다.'}, 403) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "관리자 권한이 필요합니다."}, 403

        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport

        # 설명: `not isinstance(data, dict)` 조건 결과에 따라 실행 경로를 분기한다.
        if not isinstance(data, dict):
            # 설명: 호출자에게 ({'success': False, 'error': 'Request body must be a JSON object.'}, 400) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "Request body must be a JSON object."}, 400

        # 설명: `allowed_statuses`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        allowed_statuses = {
            "SUBMITTED",
            "REVIEWING",
            "ANALYZING",
            "CONVERTED_TO_INCIDENT",
            "REJECTED",
            "CLOSED",
        }

        # 설명: `raw_status`에 `data.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        raw_status = data.get("status")
        # 설명: `status`에 `str(raw_status or '').strip().upper` 호출 결과를 저장해 다음 처리에서 사용한다.
        status = str(raw_status or "").strip().upper()

        # 설명: `not status` 조건 결과에 따라 실행 경로를 분기한다.
        if not status:
            # 설명: 호출자에게 ({'success': False, 'error': 'status 값이 필요합니다.'}, 400) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "status 값이 필요합니다."}, 400

        # 설명: `status not in allowed_statuses` 조건 결과에 따라 실행 경로를 분기한다.
        if status not in allowed_statuses:
            # 설명: 호출자에게 ({'success': False, 'error': f'허용되지 않는 status입니다: {status}', 'allowed_statuses'... 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": f"허용되지 않는 status입니다: {status}",
                "allowed_statuses": sorted(allowed_statuses),
            }, 400

        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, report_id)
        # 설명: `not report or report.deleted_at is not None or report.status in {'DELETED', 'CANC...` 조건 결과에 따라 실행 경로를 분기한다.
        if not report or report.deleted_at is not None or report.status in {"DELETED", "CANCELLED"}:
            # 설명: 호출자에게 ({'success': False, 'error': '리포트를 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "리포트를 찾을 수 없습니다."}, 404

        # 설명: `now`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = ReportUploadService._now()
        # 설명: `reason`에 `str(data.get('reason') or data.get('reject_reason') or '').strip` 호출 결과를 저장해 다음 처리에서 사용한다.
        reason = str(data.get("reason") or data.get("reject_reason") or "").strip()

        # 설명: `report.status`에 status 표현식의 계산 결과를 저장한다.
        report.status = status
        # 설명: `report.updated_at`에 now 표현식의 계산 결과를 저장한다.
        report.updated_at = now

        # 설명: `status in {'REVIEWING', 'ANALYZING', 'CONVERTED_TO_INCIDENT', 'REJECTED'}` 조건 결과에 따라 실행 경로를 분기한다.
        if status in {"REVIEWING", "ANALYZING", "CONVERTED_TO_INCIDENT", "REJECTED"}:
            # 설명: `report.reviewed_by`에 current_user.id 표현식의 계산 결과를 저장한다.
            report.reviewed_by = current_user.id
            # 설명: `report.reviewed_at`에 report.reviewed_at or now 표현식의 계산 결과를 저장한다.
            report.reviewed_at = report.reviewed_at or now

        # 설명: `status == 'REJECTED'` 조건 결과에 따라 실행 경로를 분기한다.
        if status == "REJECTED":
            # 설명: `not reason` 조건 결과에 따라 실행 경로를 분기한다.
            if not reason:
                # 설명: 호출자에게 ({'success': False, 'error': '반려 사유가 필요합니다.'}, 400) 값을 함수 결과로 반환한다.
                return {"success": False, "error": "반려 사유가 필요합니다."}, 400
            # 설명: `report.reject_reason`에 reason 표현식의 계산 결과를 저장한다.
            report.reject_reason = reason

        # 설명: `status == 'CLOSED'` 조건 결과에 따라 실행 경로를 분기한다.
        if status == "CLOSED":
            # 설명: `report.closed_by`에 current_user.id 표현식의 계산 결과를 저장한다.
            report.closed_by = current_user.id
            # 설명: `report.closed_at`에 now 표현식의 계산 결과를 저장한다.
            report.closed_at = now

        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: `report_data`에 `ReportUploadService._report_response` 호출 결과를 저장해 다음 처리에서 사용한다.
        report_data = ReportUploadService._report_response(
            report, current_user=current_user
        )

        # 설명: 호출자에게 ({'success': True, 'message': '신고 상태가 변경되었습니다.', 'report': report_data, 'data':... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "message": "신고 상태가 변경되었습니다.",
            "report": report_data,
            "data": report_data,
        }, 200

    # 설명: `approve_report` 함수는 대상을 승인 상태로 전환하는 함수다.
    @staticmethod
    def approve_report(report_id, current_user, data=None):
        # 설명: `not ReportUploadService._is_admin(current_user)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._is_admin(current_user):
            # 설명: 호출자에게 ({'success': False, 'error': '관리자 권한이 필요합니다.'}, 403) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "관리자 권한이 필요합니다."}, 403

        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport

        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, report_id)
        # 설명: `not report or report.deleted_at is not None or report.status in {'DELETED', 'CANC...` 조건 결과에 따라 실행 경로를 분기한다.
        if not report or report.deleted_at is not None or report.status in {"DELETED", "CANCELLED"}:
            # 설명: 호출자에게 ({'success': False, 'error': '리포트를 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "리포트를 찾을 수 없습니다."}, 404

        # 설명: `now`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = ReportUploadService._now()

        # MVP 기준 승인 상태는 운영자 검토 진입 상태로 정의합니다.
        report.status = "REVIEWING"
        # 설명: `report.reviewed_by`에 current_user.id 표현식의 계산 결과를 저장한다.
        report.reviewed_by = current_user.id
        # 설명: `report.reviewed_at`에 report.reviewed_at or now 표현식의 계산 결과를 저장한다.
        report.reviewed_at = report.reviewed_at or now
        # 설명: `report.updated_at`에 now 표현식의 계산 결과를 저장한다.
        report.updated_at = now

        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: `report_data`에 `ReportUploadService._report_response` 호출 결과를 저장해 다음 처리에서 사용한다.
        report_data = ReportUploadService._report_response(
            report, current_user=current_user
        )

        # 설명: 호출자에게 ({'success': True, 'message': '신고가 승인되었습니다.', 'report': report_data, 'data': re... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "message": "신고가 승인되었습니다.",
            "report": report_data,
            "data": report_data,
        }, 200

    # 설명: `reject_report` 함수는 대상을 반려 상태로 전환하는 함수다.
    @staticmethod
    def reject_report(report_id, current_user, data):
        # 설명: `not ReportUploadService._is_admin(current_user)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._is_admin(current_user):
            # 설명: 호출자에게 ({'success': False, 'error': '관리자 권한이 필요합니다.'}, 403) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "관리자 권한이 필요합니다."}, 403

        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport

        # 설명: `not isinstance(data, dict)` 조건 결과에 따라 실행 경로를 분기한다.
        if not isinstance(data, dict):
            # 설명: 호출자에게 ({'success': False, 'error': 'Request body must be a JSON object.'}, 400) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "Request body must be a JSON object."}, 400

        # 설명: `reason`에 `str(data.get('reason') or data.get('reject_reason') or '').strip` 호출 결과를 저장해 다음 처리에서 사용한다.
        reason = str(data.get("reason") or data.get("reject_reason") or "").strip()
        # 설명: `not reason` 조건 결과에 따라 실행 경로를 분기한다.
        if not reason:
            # 설명: 호출자에게 ({'success': False, 'error': '반려 사유가 필요합니다.'}, 400) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "반려 사유가 필요합니다."}, 400

        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, report_id)
        # 설명: `not report or report.deleted_at is not None or report.status in {'DELETED', 'CANC...` 조건 결과에 따라 실행 경로를 분기한다.
        if not report or report.deleted_at is not None or report.status in {"DELETED", "CANCELLED"}:
            # 설명: 호출자에게 ({'success': False, 'error': '리포트를 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "리포트를 찾을 수 없습니다."}, 404

        # 설명: `now`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = ReportUploadService._now()

        # 설명: `report.status`의 기준값 또는 기본값을 'REJECTED'로 설정한다.
        report.status = "REJECTED"
        # 설명: `report.reject_reason`에 reason 표현식의 계산 결과를 저장한다.
        report.reject_reason = reason
        # 설명: `report.reviewed_by`에 current_user.id 표현식의 계산 결과를 저장한다.
        report.reviewed_by = current_user.id
        # 설명: `report.reviewed_at`에 report.reviewed_at or now 표현식의 계산 결과를 저장한다.
        report.reviewed_at = report.reviewed_at or now
        # 설명: `report.updated_at`에 now 표현식의 계산 결과를 저장한다.
        report.updated_at = now

        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: `report_data`에 `ReportUploadService._report_response` 호출 결과를 저장해 다음 처리에서 사용한다.
        report_data = ReportUploadService._report_response(
            report, current_user=current_user
        )

        # 설명: 호출자에게 ({'success': True, 'message': '신고가 반려되었습니다.', 'report': report_data, 'data': re... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "message": "신고가 반려되었습니다.",
            "report": report_data,
            "data": report_data,
        }, 200


    # 설명: `_extract_analysis_metrics` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _extract_analysis_metrics(result_summary):
        # 설명: collections에서 Counter 이름을 가져와 아래 로직에서 재사용한다.
        from collections import Counter

        # 설명: `not isinstance(result_summary, dict)` 조건 결과에 따라 실행 경로를 분기한다.
        if not isinstance(result_summary, dict):
            # 설명: 호출자에게 {'detection_count': 0, 'avg_confidence': None, 'max_confidence': None, 'label_c... 값을 함수 결과로 반환한다.
            return {
                "detection_count": 0,
                "avg_confidence": None,
                "max_confidence": None,
                "label_counts": {},
            }

        # 설명: `detections`에 `result_summary.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        detections = result_summary.get("detections")
        # 설명: `detections is None` 조건 결과에 따라 실행 경로를 분기한다.
        if detections is None:
            # 설명: `detections`에 `result_summary.get` 호출 결과를 저장해 다음 처리에서 사용한다.
            detections = result_summary.get("objects")
        # 설명: `detections is None` 조건 결과에 따라 실행 경로를 분기한다.
        if detections is None:
            # 설명: `detections`에 `result_summary.get` 호출 결과를 저장해 다음 처리에서 사용한다.
            detections = result_summary.get("items")
        # 설명: `not isinstance(detections, list)` 조건 결과에 따라 실행 경로를 분기한다.
        if not isinstance(detections, list):
            # 설명: `detections`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
            detections = []

        # 설명: `confidence_values`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        confidence_values = []
        # 설명: `labels`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        labels = []

        # 설명: `detections`의 각 항목을 `item`로 받아 반복 처리한다.
        for item in detections:
            # 설명: `not isinstance(item, dict)` 조건 결과에 따라 실행 경로를 분기한다.
            if not isinstance(item, dict):
                # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
                continue

            # 설명: `raw_confidence`에 item.get('confidence') if item.get('confidence') is not None else ite... 표현식의 계산 결과를 저장한다.
            raw_confidence = (
                item.get("confidence")
                if item.get("confidence") is not None
                else item.get("score")
                if item.get("score") is not None
                else item.get("conf")
                if item.get("conf") is not None
                else item.get("probability")
            )

            # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
            try:
                # 설명: `raw_confidence is not None` 조건 결과에 따라 실행 경로를 분기한다.
                if raw_confidence is not None:
                    # 설명: `confidence_values.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
                    confidence_values.append(float(raw_confidence))
            except (TypeError, ValueError):
                # 설명: 이 분기에서는 별도 동작 없이 제어 흐름만 유지한다.
                pass

            # 설명: `label`에 item.get('label') or item.get('class_name') or item.get('class') or i... 표현식의 계산 결과를 저장한다.
            label = (
                item.get("label")
                or item.get("class_name")
                or item.get("class")
                or item.get("name")
                or item.get("type")
            )
            # 설명: `label` 조건 결과에 따라 실행 경로를 분기한다.
            if label:
                # 설명: `labels.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
                labels.append(str(label))

        # 설명: `raw_count`에 result_summary.get('count') if result_summary.get('count') is not Non... 표현식의 계산 결과를 저장한다.
        raw_count = (
            result_summary.get("count")
            if result_summary.get("count") is not None
            else result_summary.get("detection_count")
            if result_summary.get("detection_count") is not None
            else result_summary.get("total_count")
        )

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `detection_count`에 int(raw_count) if raw_count is not None else len(detections) 표현식의 계산 결과를 저장한다.
            detection_count = int(raw_count) if raw_count is not None else len(detections)
        except (TypeError, ValueError):
            # 설명: `detection_count`에 `len` 호출 결과를 저장해 다음 처리에서 사용한다.
            detection_count = len(detections)

        # 설명: `avg_confidence`에 round(sum(confidence_values) / len(confidence_values), 4) if confiden... 표현식의 계산 결과를 저장한다.
        avg_confidence = (
            round(sum(confidence_values) / len(confidence_values), 4)
            if confidence_values
            else None
        )
        # 설명: `max_confidence`에 round(max(confidence_values), 4) if confidence_values else None 표현식의 계산 결과를 저장한다.
        max_confidence = round(max(confidence_values), 4) if confidence_values else None

        # 설명: 호출자에게 {'detection_count': detection_count, 'avg_confidence': avg_confidence, 'max_con... 값을 함수 결과로 반환한다.
        return {
            "detection_count": detection_count,
            "avg_confidence": avg_confidence,
            "max_confidence": max_confidence,
            "label_counts": dict(Counter(labels)),
            "raw_status": result_summary.get("status"),
        }

    # 설명: `_analysis_comparison_item` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _analysis_comparison_item(job, report=None, attachment=None):
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport, ReportAttachment 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport, ReportAttachment

        # 설명: `report is None` 조건 결과에 따라 실행 경로를 분기한다.
        if report is None:
            # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
            report = db.session.get(IncidentReport, job.report_id)
        # 설명: `attachment is None` 조건 결과에 따라 실행 경로를 분기한다.
        if attachment is None:
            # 설명: `attachment`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
            attachment = db.session.get(ReportAttachment, job.attachment_id)

        # 설명: `result_summary`에 job.result_summary if isinstance(job.result_summary, dict) else {} 표현식의 계산 결과를 저장한다.
        result_summary = job.result_summary if isinstance(job.result_summary, dict) else {}
        # 설명: `metrics`에 `ReportUploadService._extract_analysis_metrics` 호출 결과를 저장해 다음 처리에서 사용한다.
        metrics = ReportUploadService._extract_analysis_metrics(result_summary)

        # 설명: 호출자에게 {'job_id': job.id, 'analysis_job_id': job.id, 'job_status': job.job_status, 'an... 값을 함수 결과로 반환한다.
        return {
            "job_id": job.id,
            "analysis_job_id": job.id,
            "job_status": job.job_status,
            "analysis_type": job.analysis_type,
            "ai_engine_type": job.ai_engine_type,
            "primary_model_name": job.primary_model_name,
            "primary_model_version": job.primary_model_version,
            "progress_percent": float(job.progress_percent) if job.progress_percent is not None else None,
            "latency_ms": job.latency_ms,
            "requested_at": job.requested_at.isoformat() if job.requested_at else None,
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "report": {
                "id": report.id if report else None,
                "report_id": report.id if report else None,
                "report_code": report.report_code if report else None,
                "title": report.title if report else None,
                "report_type": report.report_type if report else None,
                "status": report.status if report else None,
                "priority": report.priority if report else None,
                "risk_level": report.risk_level if report else None,
                "risk_score": report.risk_score if report else None,
                "submitted_at": report.submitted_at.isoformat() if report and report.submitted_at else None,
            },
            "attachment": {
                "id": attachment.id if attachment else None,
                "attachment_id": attachment.id if attachment else None,
                "file_type": attachment.file_type if attachment else None,
                "original_filename": attachment.original_filename if attachment else None,
                "mime_type": attachment.mime_type if attachment else None,
                "file_size": attachment.file_size if attachment else None,
                "preview_url": (
                    f"/api/reports/attachments/{attachment.id}/preview"
                    if attachment and ReportUploadService._is_previewable_attachment(attachment)
                    else None
                ),
                "download_url": (
                    f"/api/reports/attachments/{attachment.id}/download"
                    if attachment
                    else None
                ),
            },
            "metrics": metrics,
            "result_summary": result_summary,
        }

    # 설명: `_build_comparison_metrics` 함수는 후속 처리에 사용할 구조를 조립하는 함수다.
    @staticmethod
    def _build_comparison_metrics(items):
        # 설명: `metric_keys`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        metric_keys = [
            "detection_count",
            "avg_confidence",
            "max_confidence",
        ]

        # 설명: `metrics`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        metrics = {}
        # 설명: `metric_keys`의 각 항목을 `key`로 받아 반복 처리한다.
        for key in metric_keys:
            # 설명: `values`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
            values = []
            # 설명: `items`의 각 항목을 `item`로 받아 반복 처리한다.
            for item in items:
                # 설명: `value`에 `item.get('metrics', {}).get` 호출 결과를 저장해 다음 처리에서 사용한다.
                value = item.get("metrics", {}).get(key)
                # 설명: `value is None` 조건 결과에 따라 실행 경로를 분기한다.
                if value is None:
                    # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
                    continue
                # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
                try:
                    # 설명: `values.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
                    values.append({
                        "job_id": item["job_id"],
                        "value": float(value),
                    })
                except (TypeError, ValueError):
                    # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
                    continue

            # 설명: `not values` 조건 결과에 따라 실행 경로를 분기한다.
            if not values:
                # 설명: `metrics[key]`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
                metrics[key] = {
                    "values": [],
                    "min": None,
                    "max": None,
                    "delta": None,
                    "highest_job_id": None,
                    "lowest_job_id": None,
                }
                # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
                continue

            # 설명: `sorted_values`에 `sorted` 호출 결과를 저장해 다음 처리에서 사용한다.
            sorted_values = sorted(values, key=lambda item: item["value"])
            # 설명: `min_value`에 sorted_values[0]['value'] 표현식의 계산 결과를 저장한다.
            min_value = sorted_values[0]["value"]
            # 설명: `max_value`에 sorted_values[-1]['value'] 표현식의 계산 결과를 저장한다.
            max_value = sorted_values[-1]["value"]

            # 설명: `metrics[key]`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
            metrics[key] = {
                "values": values,
                "min": min_value,
                "max": max_value,
                "delta": max_value - min_value,
                "highest_job_id": sorted_values[-1]["job_id"],
                "lowest_job_id": sorted_values[0]["job_id"],
            }

        # 설명: 호출자에게 metrics 값을 함수 결과로 반환한다.
        return metrics

    # 설명: `list_analysis_comparison_candidates` 함수는 조건에 맞는 목록을 조회하는 함수다.
    @staticmethod
    def list_analysis_comparison_candidates(args, current_user):
        # 설명: app.models에서 IncidentReport, ReportAnalysisJob, ReportAttachment 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport, ReportAnalysisJob, ReportAttachment
        # 설명: sqlalchemy에서 or_ 이름을 가져와 아래 로직에서 재사용한다.
        from sqlalchemy import or_

        # 설명: `page`에 `ReportUploadService._to_positive_int` 호출 결과를 저장해 다음 처리에서 사용한다.
        page = ReportUploadService._to_positive_int(args.get("page"), 1, maximum=100000)
        # 설명: `size`에 `ReportUploadService._to_positive_int` 호출 결과를 저장해 다음 처리에서 사용한다.
        size = ReportUploadService._to_positive_int(
            args.get("size", args.get("limit", 20)),
            20,
            maximum=100,
        )

        # 설명: `status`에 `str(args.get('status') or args.get('job_status') or 'COMPLETED').st...` 호출 결과를 저장해 다음 처리에서 사용한다.
        status = str(args.get("status") or args.get("job_status") or "COMPLETED").strip().upper()
        # 설명: `keyword`에 `str(args.get('keyword') or '').strip` 호출 결과를 저장해 다음 처리에서 사용한다.
        keyword = str(args.get("keyword") or "").strip()
        # 설명: `report_id`에 `args.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report_id = args.get("report_id")

        # 설명: `query`에 `ReportAnalysisJob.query.join(IncidentReport, ReportAnalysisJob.repo...` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = (
            ReportAnalysisJob.query
            .join(IncidentReport, ReportAnalysisJob.report_id == IncidentReport.id)
            .outerjoin(ReportAttachment, ReportAnalysisJob.attachment_id == ReportAttachment.id)
        )

        # 설명: `status and status != 'ALL'` 조건 결과에 따라 실행 경로를 분기한다.
        if status and status != "ALL":
            # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
            query = query.filter(ReportAnalysisJob.job_status == status)

        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(IncidentReport.deleted_at.is_(None))
        # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
        query = query.filter(IncidentReport.status.notin_(("DELETED", "CANCELLED", "DRAFT")))

        # 설명: `current_user.role not in {'SUPER_ADMIN', 'CONTROL_ADMIN'}` 조건 결과에 따라 실행 경로를 분기한다.
        if current_user.role not in {"SUPER_ADMIN", "CONTROL_ADMIN"}:
            # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
            query = query.filter(IncidentReport.reporter_id == current_user.id)

        # 설명: `report_id not in (None, '')` 조건 결과에 따라 실행 경로를 분기한다.
        if report_id not in (None, ""):
            # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
            try:
                # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
                query = query.filter(ReportAnalysisJob.report_id == int(report_id))
            except (TypeError, ValueError) as exc:
                # 설명: 현재 처리를 중단하고 ValueError('report_id 값이 올바르지 않습니다.')를 호출자에게 전달한다.
                raise ValueError("report_id 값이 올바르지 않습니다.") from exc

        # 설명: `keyword` 조건 결과에 따라 실행 경로를 분기한다.
        if keyword:
            # 설명: `like_keyword`에 f'%{keyword}%' 표현식의 계산 결과를 저장한다.
            like_keyword = f"%{keyword}%"
            # 설명: `query`에 `query.filter` 호출 결과를 저장해 다음 처리에서 사용한다.
            query = query.filter(or_(
                IncidentReport.title.ilike(like_keyword),
                IncidentReport.report_code.ilike(like_keyword),
                ReportAttachment.original_filename.ilike(like_keyword),
            ))

        # 설명: `pagination`에 `query.order_by(ReportAnalysisJob.id.desc()).paginate` 호출 결과를 저장해 다음 처리에서 사용한다.
        pagination = query.order_by(ReportAnalysisJob.id.desc()).paginate(
            page=page,
            per_page=size,
            error_out=False,
        )

        # 설명: `jobs`에 `list` 호출 결과를 저장해 다음 처리에서 사용한다.
        jobs = list(pagination.items)
        # 설명: `report_ids`에 {job.report_id for job in jobs} 표현식의 계산 결과를 저장한다.
        report_ids = {job.report_id for job in jobs}
        # 설명: `attachment_ids`에 {job.attachment_id for job in jobs} 표현식의 계산 결과를 저장한다.
        attachment_ids = {job.attachment_id for job in jobs}

        # 설명: `reports`에 {report.id: report for report in IncidentReport.query.filter(Incident... 표현식의 계산 결과를 저장한다.
        reports = {
            report.id: report
            for report in IncidentReport.query.filter(IncidentReport.id.in_(report_ids)).all()
        } if report_ids else {}

        # 설명: `attachments`에 {attachment.id: attachment for attachment in ReportAttachment.query.f... 표현식의 계산 결과를 저장한다.
        attachments = {
            attachment.id: attachment
            for attachment in ReportAttachment.query.filter(ReportAttachment.id.in_(attachment_ids)).all()
        } if attachment_ids else {}

        # 설명: `items`에 [ReportUploadService._analysis_comparison_item(job, report=reports.ge... 표현식의 계산 결과를 저장한다.
        items = [
            ReportUploadService._analysis_comparison_item(
                job,
                report=reports.get(job.report_id),
                attachment=attachments.get(job.attachment_id),
            )
            for job in jobs
        ]

        # 설명: `data`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        data = {
            "items": items,
            "page": page,
            "size": size,
            "total_count": pagination.total,
            "total_pages": pagination.pages,
        }

        # 설명: 호출자에게 ({'success': True, 'data': data, 'items': items, 'page': page, 'size': size, 't... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "data": data,
            "items": items,
            "page": page,
            "size": size,
            "total_count": pagination.total,
            "total_pages": pagination.pages,
        }, 200

    # 설명: `compare_analysis_jobs` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def compare_analysis_jobs(data, current_user):
        # 설명: app.models에서 IncidentReport, ReportAnalysisJob, ReportAttachment 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport, ReportAnalysisJob, ReportAttachment

        # 설명: `raw_job_ids`에 data.get('job_ids') or data.get('analysis_job_ids') 표현식의 계산 결과를 저장한다.
        raw_job_ids = data.get("job_ids") or data.get("analysis_job_ids")
        # 설명: `isinstance(raw_job_ids, str)` 조건 결과에 따라 실행 경로를 분기한다.
        if isinstance(raw_job_ids, str):
            # 설명: `raw_job_ids`에 [item.strip() for item in raw_job_ids.split(',') if item.strip()] 표현식의 계산 결과를 저장한다.
            raw_job_ids = [item.strip() for item in raw_job_ids.split(",") if item.strip()]

        # 설명: `not isinstance(raw_job_ids, list)` 조건 결과에 따라 실행 경로를 분기한다.
        if not isinstance(raw_job_ids, list):
            # 설명: 현재 처리를 중단하고 ValueError('job_ids 배열이 필요합니다.')를 호출자에게 전달한다.
            raise ValueError("job_ids 배열이 필요합니다.")

        # 설명: `job_ids`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        job_ids = []
        # 설명: `raw_job_ids`의 각 항목을 `raw_id`로 받아 반복 처리한다.
        for raw_id in raw_job_ids:
            # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
            try:
                # 설명: `job_id`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
                job_id = int(raw_id)
            except (TypeError, ValueError) as exc:
                # 설명: 현재 처리를 중단하고 ValueError('job_ids에는 숫자 ID만 포함할 수 있습니다.')를 호출자에게 전달한다.
                raise ValueError("job_ids에는 숫자 ID만 포함할 수 있습니다.") from exc

            # 설명: `job_id <= 0` 조건 결과에 따라 실행 경로를 분기한다.
            if job_id <= 0:
                # 설명: 현재 처리를 중단하고 ValueError('job_ids에는 양수 ID만 포함할 수 있습니다.')를 호출자에게 전달한다.
                raise ValueError("job_ids에는 양수 ID만 포함할 수 있습니다.")

            # 설명: `job_id not in job_ids` 조건 결과에 따라 실행 경로를 분기한다.
            if job_id not in job_ids:
                # 설명: `job_ids.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
                job_ids.append(job_id)

        # 설명: `len(job_ids) < 2` 조건 결과에 따라 실행 경로를 분기한다.
        if len(job_ids) < 2:
            # 설명: 현재 처리를 중단하고 ValueError('비교하려면 최소 2개의 분석 job이 필요합니다.')를 호출자에게 전달한다.
            raise ValueError("비교하려면 최소 2개의 분석 job이 필요합니다.")
        # 설명: `len(job_ids) > 5` 조건 결과에 따라 실행 경로를 분기한다.
        if len(job_ids) > 5:
            # 설명: 현재 처리를 중단하고 ValueError('한 번에 최대 5개의 분석 job만 비교할 수 있습니다.')를 호출자에게 전달한다.
            raise ValueError("한 번에 최대 5개의 분석 job만 비교할 수 있습니다.")

        # 설명: `jobs`에 `ReportAnalysisJob.query.filter(ReportAnalysisJob.id.in_(job_ids)).all` 호출 결과를 저장해 다음 처리에서 사용한다.
        jobs = ReportAnalysisJob.query.filter(ReportAnalysisJob.id.in_(job_ids)).all()
        # 설명: `job_map`에 {job.id: job for job in jobs} 표현식의 계산 결과를 저장한다.
        job_map = {job.id: job for job in jobs}

        # 설명: `missing_ids`에 [job_id for job_id in job_ids if job_id not in job_map] 표현식의 계산 결과를 저장한다.
        missing_ids = [job_id for job_id in job_ids if job_id not in job_map]
        # 설명: `missing_ids` 조건 결과에 따라 실행 경로를 분기한다.
        if missing_ids:
            # 설명: 호출자에게 ({'success': False, 'error': '분석 작업을 찾을 수 없습니다.', 'missing_job_ids': missing_id... 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "분석 작업을 찾을 수 없습니다.",
                "missing_job_ids": missing_ids,
            }, 404

        # 설명: `ordered_jobs`에 [job_map[job_id] for job_id in job_ids] 표현식의 계산 결과를 저장한다.
        ordered_jobs = [job_map[job_id] for job_id in job_ids]
        # 설명: `not_completed_ids`에 [job.id for job in ordered_jobs if job.job_status != 'COMPLETED'] 표현식의 계산 결과를 저장한다.
        not_completed_ids = [
            job.id for job in ordered_jobs
            if job.job_status != "COMPLETED"
        ]

        # 설명: `not_completed_ids` 조건 결과에 따라 실행 경로를 분기한다.
        if not_completed_ids:
            # 설명: 호출자에게 ({'success': False, 'error': 'COMPLETED 상태의 분석 job만 비교할 수 있습니다.', 'not_complete... 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "COMPLETED 상태의 분석 job만 비교할 수 있습니다.",
                "not_completed_job_ids": not_completed_ids,
            }, 400

        # 설명: `report_ids`에 {job.report_id for job in ordered_jobs} 표현식의 계산 결과를 저장한다.
        report_ids = {job.report_id for job in ordered_jobs}
        # 설명: `attachment_ids`에 {job.attachment_id for job in ordered_jobs} 표현식의 계산 결과를 저장한다.
        attachment_ids = {job.attachment_id for job in ordered_jobs}

        # 설명: `reports`에 {report.id: report for report in IncidentReport.query.filter(Incident... 표현식의 계산 결과를 저장한다.
        reports = {
            report.id: report
            for report in IncidentReport.query.filter(IncidentReport.id.in_(report_ids)).all()
        }

        # 설명: `attachments`에 {attachment.id: attachment for attachment in ReportAttachment.query.f... 표현식의 계산 결과를 저장한다.
        attachments = {
            attachment.id: attachment
            for attachment in ReportAttachment.query.filter(ReportAttachment.id.in_(attachment_ids)).all()
        } if attachment_ids else {}

        # 설명: `unauthorized_job_ids`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        unauthorized_job_ids = []
        # 설명: `ordered_jobs`의 각 항목을 `job`로 받아 반복 처리한다.
        for job in ordered_jobs:
            # 설명: `report`에 `reports.get` 호출 결과를 저장해 다음 처리에서 사용한다.
            report = reports.get(job.report_id)
            # 설명: `not report or report.deleted_at is not None` 조건 결과에 따라 실행 경로를 분기한다.
            if not report or report.deleted_at is not None:
                # 설명: 호출자에게 ({'success': False, 'error': '분석 job에 연결된 신고를 찾을 수 없습니다.', 'job_id': job.id}, 404) 값을 함수 결과로 반환한다.
                return {
                    "success": False,
                    "error": "분석 job에 연결된 신고를 찾을 수 없습니다.",
                    "job_id": job.id,
                }, 404

            # 설명: `not ReportUploadService._can_manage_report(report, current_user)` 조건 결과에 따라 실행 경로를 분기한다.
            if not ReportUploadService._can_manage_report(report, current_user):
                # 설명: `unauthorized_job_ids.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
                unauthorized_job_ids.append(job.id)

        # 설명: `unauthorized_job_ids` 조건 결과에 따라 실행 경로를 분기한다.
        if unauthorized_job_ids:
            # 설명: 호출자에게 ({'success': False, 'error': '비교분석 조회 권한이 없는 분석 job이 포함되어 있습니다.', 'unauthorized... 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "비교분석 조회 권한이 없는 분석 job이 포함되어 있습니다.",
                "unauthorized_job_ids": unauthorized_job_ids,
            }, 403

        # 설명: `items`에 [ReportUploadService._analysis_comparison_item(job, report=reports.ge... 표현식의 계산 결과를 저장한다.
        items = [
            ReportUploadService._analysis_comparison_item(
                job,
                report=reports.get(job.report_id),
                attachment=attachments.get(job.attachment_id),
            )
            for job in ordered_jobs
        ]

        # 설명: `comparison_metrics`에 `ReportUploadService._build_comparison_metrics` 호출 결과를 저장해 다음 처리에서 사용한다.
        comparison_metrics = ReportUploadService._build_comparison_metrics(items)

        # 설명: 호출자에게 ({'success': True, 'count': len(items), 'job_ids': job_ids, 'items': items, 'co... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "count": len(items),
            "job_ids": job_ids,
            "items": items,
            "comparison": {
                "metrics": comparison_metrics,
                "report_ids": [item["report"]["id"] for item in items],
            },
            "data": {
                "items": items,
                "metrics": comparison_metrics,
            },
        }, 200


    # 설명: `get_analysis_status` 함수는 단일 값이나 리소스를 조회하는 함수다.
    @staticmethod
    def get_analysis_status(report_id, current_user=None):
        """최신 job을 대표 상태로 선택하고 DB JSON 결과를 API 응답에 포함한다."""
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport, ReportAnalysisJob 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport, ReportAnalysisJob

        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, report_id)
        # 설명: `not report or report.deleted_at is not None` 조건 결과에 따라 실행 경로를 분기한다.
        if not report or report.deleted_at is not None:
            # 설명: 호출자에게 ({'success': False, 'error': '리포트를 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "리포트를 찾을 수 없습니다."}, 404
        # 설명: `current_user is not None and (not ReportUploadService._can_manage_report(report, ...` 조건 결과에 따라 실행 경로를 분기한다.
        if (
            current_user is not None
            and not ReportUploadService._can_manage_report(report, current_user)
        ):
            # 설명: 호출자에게 ({'success': False, 'error': '분석 결과 조회 권한이 없습니다.'}, 403) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "분석 결과 조회 권한이 없습니다."}, 403

        # 설명: `jobs`에 `ReportAnalysisJob.query.filter_by(report_id=report.id).order_by(Rep...` 호출 결과를 저장해 다음 처리에서 사용한다.
        jobs = (
            ReportAnalysisJob.query
            .filter_by(report_id=report.id)
            .order_by(ReportAnalysisJob.id.desc())
            .all()
        )

        # 설명: `latest_job`에 jobs[0] if jobs else None 표현식의 계산 결과를 저장한다.
        latest_job = jobs[0] if jobs else None
        # 설명: `latest_job_data`에 `ReportUploadService._analysis_job_response` 호출 결과를 저장해 다음 처리에서 사용한다.
        latest_job_data = ReportUploadService._analysis_job_response(latest_job)

        # 설명: 호출자에게 ({'success': True, 'report_id': report.id, 'report_code': report.report_code, '... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "report_id": report.id,
            "report_code": report.report_code,
            "analysis_status": ReportUploadService._normalize_analysis_status(
                latest_job.job_status if latest_job else None
            ),
            "analysis_job_id": latest_job.id if latest_job else None,
            "analysis_summary": (
                latest_job_data.get("result_summary") if latest_job_data else None
            ),
            "risk_level": report.risk_level,
            "risk_score": report.risk_score,
            "converted_incident_id": report.converted_incident_id,
            "job_count": len(jobs),
            "latest_job": latest_job_data,
            "allowed_actions": ReportUploadService._allowed_actions(
                report, current_user
            ),
        }, 200

    # 설명: `list_analysis_jobs` 함수는 조건에 맞는 목록을 조회하는 함수다.
    @staticmethod
    def list_analysis_jobs(report_id, current_user=None):
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport, ReportAnalysisJob 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport, ReportAnalysisJob

        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, report_id)
        # 설명: `not report or report.deleted_at is not None` 조건 결과에 따라 실행 경로를 분기한다.
        if not report or report.deleted_at is not None:
            # 설명: 호출자에게 ({'success': False, 'error': '리포트를 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "리포트를 찾을 수 없습니다."}, 404
        # 설명: `current_user is not None and (not ReportUploadService._can_manage_report(report, ...` 조건 결과에 따라 실행 경로를 분기한다.
        if (
            current_user is not None
            and not ReportUploadService._can_manage_report(report, current_user)
        ):
            # 설명: 호출자에게 ({'success': False, 'error': '분석 결과 조회 권한이 없습니다.'}, 403) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "분석 결과 조회 권한이 없습니다."}, 403

        # 설명: `jobs`에 `ReportAnalysisJob.query.filter_by(report_id=report.id).order_by(Rep...` 호출 결과를 저장해 다음 처리에서 사용한다.
        jobs = (
            ReportAnalysisJob.query
            .filter_by(report_id=report.id)
            .order_by(ReportAnalysisJob.id.desc())
            .all()
        )

        # 설명: 호출자에게 ({'success': True, 'report_id': report.id, 'report_code': report.report_code, '... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "report_id": report.id,
            "report_code": report.report_code,
            "count": len(jobs),
            "items": [ReportUploadService._analysis_job_response(job) for job in jobs],
            "allowed_actions": ReportUploadService._allowed_actions(
                report, current_user
            ),
        }, 200

    # 설명: `get_analysis_job` 함수는 단일 값이나 리소스를 조회하는 함수다.
    @staticmethod
    def get_analysis_job(job_id, current_user=None):
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 ReportAnalysisJob 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import ReportAnalysisJob

        # 설명: `job`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        job = db.session.get(ReportAnalysisJob, job_id)
        # 설명: `not job` 조건 결과에 따라 실행 경로를 분기한다.
        if not job:
            # 설명: 호출자에게 ({'success': False, 'error': '분석 작업을 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "분석 작업을 찾을 수 없습니다."}, 404

        # 설명: app.models에서 IncidentReport 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport
        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, job.report_id)
        # 설명: `current_user is not None and (not report or not ReportUploadService._can_manage_r...` 조건 결과에 따라 실행 경로를 분기한다.
        if current_user is not None and (
            not report or not ReportUploadService._can_manage_report(report, current_user)
        ):
            # 설명: 호출자에게 ({'success': False, 'error': '분석 결과 조회 권한이 없습니다.'}, 403) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "분석 결과 조회 권한이 없습니다."}, 403

        # 설명: `item`에 `ReportUploadService._analysis_job_response` 호출 결과를 저장해 다음 처리에서 사용한다.
        item = ReportUploadService._analysis_job_response(job)
        # 설명: `item['allowed_actions']`에 `ReportUploadService._allowed_actions` 호출 결과를 저장해 다음 처리에서 사용한다.
        item["allowed_actions"] = ReportUploadService._allowed_actions(
            report, current_user
        )
        # 설명: 호출자에게 ({'success': True, 'item': item, 'allowed_actions': item['allowed_actions']}, 200) 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "item": item,
            "allowed_actions": item["allowed_actions"],
        }, 200


    # 설명: `retry_analysis_job` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def retry_analysis_job(job_id, current_user):
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport, ReportAnalysisJob, ReportAttachment 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport, ReportAnalysisJob, ReportAttachment
        # 설명: app.modules.ai_gateway.service에서 AIGatewayService 이름을 가져와 아래 로직에서 재사용한다.
        from app.modules.ai_gateway.service import AIGatewayService
        # 설명: app.modules.socketio.emitters에서 emit_report_analysis_updated 이름을 가져와 아래 로직에서 재사용한다.
        from app.modules.socketio.emitters import emit_report_analysis_updated

        # 설명: `job`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        job = db.session.get(ReportAnalysisJob, job_id)
        # 설명: `not job` 조건 결과에 따라 실행 경로를 분기한다.
        if not job:
            # 설명: 호출자에게 ({'success': False, 'error': '분석 작업을 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "분석 작업을 찾을 수 없습니다."}, 404

        # 설명: `job.job_status in ReportUploadService.ACTIVE_JOB_STATUSES` 조건 결과에 따라 실행 경로를 분기한다.
        if job.job_status in ReportUploadService.ACTIVE_JOB_STATUSES:
            # 설명: 호출자에게 ({'success': False, 'error': '이미 진행 중인 분석 작업은 재시도할 수 없습니다.', 'job': ReportUploa... 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "이미 진행 중인 분석 작업은 재시도할 수 없습니다.",
                "job": ReportUploadService._analysis_job_response(job),
            }, 409

        # 설명: `job.job_status != 'FAILED'` 조건 결과에 따라 실행 경로를 분기한다.
        if job.job_status != "FAILED":
            # 설명: 호출자에게 ({'success': False, 'error': 'FAILED 상태의 분석 작업만 재시도할 수 있습니다.', 'job': ReportUpl... 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "FAILED 상태의 분석 작업만 재시도할 수 있습니다.",
                "job": ReportUploadService._analysis_job_response(job),
            }, 400

        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, job.report_id)
        # 설명: `not report or report.deleted_at is not None or report.status in {'DELETED', 'CANC...` 조건 결과에 따라 실행 경로를 분기한다.
        if not report or report.deleted_at is not None or report.status in {"DELETED", "CANCELLED"}:
            # 설명: 호출자에게 ({'success': False, 'error': '리포트를 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "리포트를 찾을 수 없습니다."}, 404

        # 설명: `not ReportUploadService._is_admin(current_user)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._is_admin(current_user):
            # 설명: 호출자에게 ({'success': False, 'error': '분석 작업 재시도 권한이 없습니다.'}, 403) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "분석 작업 재시도 권한이 없습니다."}, 403

        # 설명: `attachment`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        attachment = db.session.get(ReportAttachment, job.attachment_id)
        # 설명: `not attachment or getattr(attachment, 'deleted_at', None)` 조건 결과에 따라 실행 경로를 분기한다.
        if not attachment or getattr(attachment, "deleted_at", None):
            # 설명: 호출자에게 ({'success': False, 'error': '분석 대상 첨부파일을 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "분석 대상 첨부파일을 찾을 수 없습니다."}, 404

        # 설명: `retry_started_at`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
        retry_started_at = ReportUploadService._now()

        # 설명: `job.job_status`의 기준값 또는 기본값을 'QUEUED'로 설정한다.
        job.job_status = "QUEUED"
        # 설명: `job.retry_count`에 (job.retry_count or 0) + 1 표현식의 계산 결과를 저장한다.
        job.retry_count = (job.retry_count or 0) + 1
        # 설명: `job.progress_percent`의 기준값 또는 기본값을 0로 설정한다.
        job.progress_percent = 0
        # 설명: `job.error_message`의 기준값 또는 기본값을 None로 설정한다.
        job.error_message = None
        # 설명: `job.failed_reason_code`의 기준값 또는 기본값을 None로 설정한다.
        job.failed_reason_code = None
        # 설명: `job.completed_at`의 기준값 또는 기본값을 None로 설정한다.
        job.completed_at = None
        # 설명: `job.started_at`의 기준값 또는 기본값을 None로 설정한다.
        job.started_at = None
        # 설명: `job.updated_at`에 retry_started_at 표현식의 계산 결과를 저장한다.
        job.updated_at = retry_started_at

        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(job)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
        # 설명: `emit_report_analysis_updated`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        emit_report_analysis_updated(job)

        # 설명: `processing_started_at`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
        processing_started_at = ReportUploadService._now()
        # 외부 HTTP 호출 전에 중간 상태를 확정해 중복 워커 실행과 UI 상태 지연을 줄인다.
        job.job_status = "PROCESSING"
        # 설명: `job.started_at`에 processing_started_at 표현식의 계산 결과를 저장한다.
        job.started_at = processing_started_at
        # 설명: `job.updated_at`에 processing_started_at 표현식의 계산 결과를 저장한다.
        job.updated_at = processing_started_at
        # 설명: `job.progress_percent`의 기준값 또는 기본값을 10로 설정한다.
        job.progress_percent = 10

        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(job)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
        # 설명: `emit_report_analysis_updated`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        emit_report_analysis_updated(job)

        # 설명: `camera_id`에 f'camera-{report.cctv_id}' if getattr(report, 'cctv_id', None) else None 표현식의 계산 결과를 저장한다.
        camera_id = f"camera-{report.cctv_id}" if getattr(report, "cctv_id", None) else None
        # 설명: `(success, response)`에 `AIGatewayService.request_analysis` 호출 결과를 저장해 다음 처리에서 사용한다.
        success, response = AIGatewayService.request_analysis(
            report.id,
            attachment.file_path,
            cctv_id=getattr(report, "cctv_id", None),
            camera_id=camera_id,
        )
        # 설명: `completed_at`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
        completed_at = ReportUploadService._now()

        # 설명: `success` 조건 결과에 따라 실행 경로를 분기한다.
        if success:
            # 설명: `result_summary`에 response if isinstance(response, dict) else {'raw_response': str(resp... 표현식의 계산 결과를 저장한다.
            result_summary = response if isinstance(response, dict) else {
                "raw_response": str(response)
            }

            # 설명: `response_status`에 `str(result_summary.get('status', '')).upper` 호출 결과를 저장해 다음 처리에서 사용한다.
            response_status = str(result_summary.get("status", "")).upper()
            # 설명: `response_job_status`에 `str(result_summary.get('job_status', '')).upper` 호출 결과를 저장해 다음 처리에서 사용한다.
            response_job_status = str(result_summary.get("job_status", "")).upper()

            # 설명: `is_completed_result`에 response_status == 'OK' or 'detections' in result_summary or 'count' ... 표현식의 계산 결과를 저장한다.
            is_completed_result = (
                response_status == "OK"
                or "detections" in result_summary
                or "count" in result_summary
            )

            # 설명: `is_completed_result` 조건 결과에 따라 실행 경로를 분기한다.
            if is_completed_result:
                # 설명: `job.job_status`의 기준값 또는 기본값을 'COMPLETED'로 설정한다.
                job.job_status = "COMPLETED"
                # 설명: `job.completed_at`에 completed_at 표현식의 계산 결과를 저장한다.
                job.completed_at = completed_at
                # 설명: `job.updated_at`에 completed_at 표현식의 계산 결과를 저장한다.
                job.updated_at = completed_at
                # 설명: `job.progress_percent`의 기준값 또는 기본값을 100로 설정한다.
                job.progress_percent = 100
                # 설명: `job.total_frames`에 job.total_frames or 1 표현식의 계산 결과를 저장한다.
                job.total_frames = job.total_frames or 1
                # 설명: `job.processed_frames`에 job.processed_frames or 1 표현식의 계산 결과를 저장한다.
                job.processed_frames = job.processed_frames or 1
                # 설명: `job.result_summary`에 result_summary 표현식의 계산 결과를 저장한다.
                job.result_summary = result_summary
                # 설명: `job.raw_result_path`의 기준값 또는 기본값을 None로 설정한다.
                job.raw_result_path = None
                # 설명: `job.error_message`의 기준값 또는 기본값을 None로 설정한다.
                job.error_message = None
                # 설명: `job.failed_reason_code`의 기준값 또는 기본값을 None로 설정한다.
                job.failed_reason_code = None
                # 설명: `job.primary_model_name`에 job.primary_model_name or 'YOLO11' 표현식의 계산 결과를 저장한다.
                job.primary_model_name = job.primary_model_name or "YOLO11"
                # 설명: `job.primary_model_version`에 job.primary_model_version or 'current.pt' 표현식의 계산 결과를 저장한다.
                job.primary_model_version = job.primary_model_version or "current.pt"
            else:
                # 설명: `job.job_status`에 response_job_status if response_job_status in ReportUploadService.ACT... 표현식의 계산 결과를 저장한다.
                job.job_status = (
                    response_job_status
                    if response_job_status in ReportUploadService.ACTIVE_JOB_STATUSES
                    else "QUEUED"
                )
                # 설명: `job.updated_at`에 completed_at 표현식의 계산 결과를 저장한다.
                job.updated_at = completed_at
                # 설명: `job.progress_percent`에 job.progress_percent or 10 표현식의 계산 결과를 저장한다.
                job.progress_percent = job.progress_percent or 10
                # 설명: `job.result_summary`에 result_summary 표현식의 계산 결과를 저장한다.
                job.result_summary = result_summary
                # 설명: `job.error_message`의 기준값 또는 기본값을 None로 설정한다.
                job.error_message = None
                # 설명: `job.failed_reason_code`의 기준값 또는 기본값을 None로 설정한다.
                job.failed_reason_code = None
        else:
            # 설명: `job.job_status`의 기준값 또는 기본값을 'FAILED'로 설정한다.
            job.job_status = "FAILED"
            # 설명: `job.completed_at`에 completed_at 표현식의 계산 결과를 저장한다.
            job.completed_at = completed_at
            # 설명: `job.updated_at`에 completed_at 표현식의 계산 결과를 저장한다.
            job.updated_at = completed_at
            # 설명: `job.progress_percent`의 기준값 또는 기본값을 100로 설정한다.
            job.progress_percent = 100
            # 설명: `job.failed_reason_code`에 response.get('status') if isinstance(response, dict) else 'AI_REQUEST... 표현식의 계산 결과를 저장한다.
            job.failed_reason_code = (
                response.get("status")
                if isinstance(response, dict)
                else "AI_REQUEST_FAILED"
            )
            # 설명: `job.error_message`에 str(response)[:2000] 표현식의 계산 결과를 저장한다.
            job.error_message = str(response)[:2000]

        # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
        db.session.add(job)
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
        # 설명: `emit_report_analysis_updated`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        emit_report_analysis_updated(job)

        # 설명: `job_data`에 `ReportUploadService._analysis_job_response` 호출 결과를 저장해 다음 처리에서 사용한다.
        job_data = ReportUploadService._analysis_job_response(job)

        # 설명: 호출자에게 ({'success': success, 'message': '분석 작업을 재시도했습니다.' if success else '분석 작업 재시도에 ... 값을 함수 결과로 반환한다.
        return {
            "success": success,
            "message": "분석 작업을 재시도했습니다." if success else "분석 작업 재시도에 실패했습니다.",
            "job": job_data,
            "data": job_data,
        }, 200 if success else 502



    # 설명: `_is_report_admin` 함수는 조건의 참/거짓을 판정하는 함수다.
    @staticmethod
    def _is_report_admin(current_user):
        # 설명: 호출자에게 current_user.role in {'SUPER_ADMIN', 'CONTROL_ADMIN'} 값을 함수 결과로 반환한다.
        return current_user.role in {"SUPER_ADMIN", "CONTROL_ADMIN"}

    # 설명: `_require_report_admin` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _require_report_admin(current_user):
        # 설명: `not ReportUploadService._is_report_admin(current_user)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._is_report_admin(current_user):
            # 설명: 호출자에게 ({'success': False, 'error': '신고 운영 권한이 없습니다.'}, 403) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "신고 운영 권한이 없습니다.",
            }, 403
        # 설명: 호출자에게 None 값을 함수 결과로 반환한다.
        return None

    # 설명: `_add_status_history` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _add_status_history(report, previous_status, new_status, changed_by, reason=None):
        """현재 상태 변경과 같은 트랜잭션에 넣을 감사 이력 ORM 객체를 만든다."""
        # 설명: app.models에서 ReportStatusHistory 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import ReportStatusHistory

        # 설명: `history`에 `ReportStatusHistory` 호출 결과를 저장해 다음 처리에서 사용한다.
        history = ReportStatusHistory(
            report_id=report.id,
            previous_status=previous_status,
            new_status=new_status,
            changed_by=changed_by,
            change_reason=reason,
            created_at=ReportUploadService._now(),
        )
        # 설명: 호출자에게 history 값을 함수 결과로 반환한다.
        return history

    # 설명: `_apply_report_status` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def _apply_report_status(report, new_status, current_user, reason=None):
        """부모 신고의 상태/담당 시각을 변경하고 대응하는 이력 행을 반환한다."""
        # 설명: `previous_status`에 report.status 표현식의 계산 결과를 저장한다.
        previous_status = report.status
        # 설명: `now`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = ReportUploadService._now()

        # 설명: `report.status`에 new_status 표현식의 계산 결과를 저장한다.
        report.status = new_status
        # 설명: `report.updated_at`에 now 표현식의 계산 결과를 저장한다.
        report.updated_at = now

        # 설명: `new_status in {'REVIEWING', 'APPROVED', 'REJECTED'}` 조건 결과에 따라 실행 경로를 분기한다.
        if new_status in {"REVIEWING", "APPROVED", "REJECTED"}:
            # 설명: `report.reviewed_by`에 current_user.id 표현식의 계산 결과를 저장한다.
            report.reviewed_by = current_user.id
            # 설명: `report.reviewed_at`에 now 표현식의 계산 결과를 저장한다.
            report.reviewed_at = now

        # 설명: `new_status in {'CLOSED', 'RESOLVED'}` 조건 결과에 따라 실행 경로를 분기한다.
        if new_status in {"CLOSED", "RESOLVED"}:
            # 설명: `report.closed_by`에 current_user.id 표현식의 계산 결과를 저장한다.
            report.closed_by = current_user.id
            # 설명: `report.closed_at`에 now 표현식의 계산 결과를 저장한다.
            report.closed_at = now

        # 설명: `new_status == 'REJECTED'` 조건 결과에 따라 실행 경로를 분기한다.
        if new_status == "REJECTED":
            # 설명: `report.reject_reason`에 reason 표현식의 계산 결과를 저장한다.
            report.reject_reason = reason

        # 설명: 호출자에게 ReportUploadService._add_status_history(report=report, previous_status=previous... 값을 함수 결과로 반환한다.
        return ReportUploadService._add_status_history(
            report=report,
            previous_status=previous_status,
            new_status=new_status,
            changed_by=current_user.id,
            reason=reason,
        )

    # 설명: `update_report_status` 함수는 기존 데이터의 허용된 값을 변경하는 함수다.
    @staticmethod
    def update_report_status(report_id, current_user, data):
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport

        # 설명: `permission_error`에 `ReportUploadService._require_report_admin` 호출 결과를 저장해 다음 처리에서 사용한다.
        permission_error = ReportUploadService._require_report_admin(current_user)
        # 설명: `permission_error` 조건 결과에 따라 실행 경로를 분기한다.
        if permission_error:
            # 설명: 호출자에게 permission_error 값을 함수 결과로 반환한다.
            return permission_error

        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, report_id)
        # 설명: `not report or getattr(report, 'deleted_at', None)` 조건 결과에 따라 실행 경로를 분기한다.
        if not report or getattr(report, "deleted_at", None):
            # 설명: 호출자에게 ({'success': False, 'error': '리포트를 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "리포트를 찾을 수 없습니다.",
            }, 404

        # 설명: `new_status`에 `str(data.get('status') or '').strip().upper` 호출 결과를 저장해 다음 처리에서 사용한다.
        new_status = str(data.get("status") or "").strip().upper()
        # 설명: `allowed_statuses`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        allowed_statuses = {
            "SUBMITTED",
            "REVIEWING",
            "APPROVED",
            "REJECTED",
            "CLOSED",
            "RESOLVED",
            "CANCELLED",
            "DELETED",
        }
        # 설명: `new_status not in allowed_statuses` 조건 결과에 따라 실행 경로를 분기한다.
        if new_status not in allowed_statuses:
            # 설명: 호출자에게 ({'success': False, 'error': '변경할 상태값이 올바르지 않습니다.'}, 400) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "변경할 상태값이 올바르지 않습니다.",
            }, 400

        # 설명: `report.status == new_status` 조건 결과에 따라 실행 경로를 분기한다.
        if report.status == new_status:
            # 설명: 호출자에게 ({'success': True, 'message': '이미 동일한 상태입니다.', 'data': ReportUploadService._rep... 값을 함수 결과로 반환한다.
            return {
                "success": True,
                "message": "이미 동일한 상태입니다.",
                "data": ReportUploadService._report_response(report),
            }, 200

        # 설명: `report.status in {'DELETED', 'CANCELLED'}` 조건 결과에 따라 실행 경로를 분기한다.
        if report.status in {"DELETED", "CANCELLED"}:
            # 설명: 호출자에게 ({'success': False, 'error': '삭제 또는 취소된 신고는 상태를 변경할 수 없습니다.'}, 400) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "삭제 또는 취소된 신고는 상태를 변경할 수 없습니다.",
            }, 400

        # 설명: `reason`에 data.get('memo') or data.get('reason') or data.get('change_reason') 표현식의 계산 결과를 저장한다.
        reason = data.get("memo") or data.get("reason") or data.get("change_reason")

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `history`에 `ReportUploadService._apply_report_status` 호출 결과를 저장해 다음 처리에서 사용한다.
            history = ReportUploadService._apply_report_status(
                report=report,
                new_status=new_status,
                current_user=current_user,
                reason=reason,
            )
            # 신고의 현재 상태 UPDATE와 이력 INSERT를 같은 commit으로 묶어 불일치를 막는다.
            db.session.add(history)
            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()
        except Exception:
            # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
            db.session.rollback()
            # 설명: `current_app.logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            current_app.logger.exception("Report status update failed", extra={"report_id": report_id})
            # 설명: 현재 처리를 중단하고 기존 예외를 호출자에게 전달한다.
            raise

        # 설명: 호출자에게 ({'success': True, 'message': '신고 상태가 변경되었습니다.', 'data': ReportUploadService._r... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "message": "신고 상태가 변경되었습니다.",
            "data": ReportUploadService._report_response(report),
        }, 200

    # 설명: `approve_report` 함수는 대상을 승인 상태로 전환하는 함수다.
    @staticmethod
    def approve_report(report_id, current_user, data):
        # 설명: `data`에 `dict` 호출 결과를 저장해 다음 처리에서 사용한다.
        data = dict(data or {})
        # 설명: `data['status']`의 기준값 또는 기본값을 'APPROVED'로 설정한다.
        data["status"] = "APPROVED"
        # 설명: `'memo' not in data and 'reason' not in data` 조건 결과에 따라 실행 경로를 분기한다.
        if "memo" not in data and "reason" not in data:
            # 설명: `data['memo']`의 기준값 또는 기본값을 '신고 승인'로 설정한다.
            data["memo"] = "신고 승인"

        # 설명: `(result, status_code)`에 `ReportUploadService.update_report_status` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.update_report_status(
            report_id=report_id,
            current_user=current_user,
            data=data,
        )
        # 설명: `result.get('success')` 조건 결과에 따라 실행 경로를 분기한다.
        if result.get("success"):
            # 설명: `result['message']`의 기준값 또는 기본값을 '신고가 승인되었습니다.'로 설정한다.
            result["message"] = "신고가 승인되었습니다."
        # 설명: 호출자에게 (result, status_code) 값을 함수 결과로 반환한다.
        return result, status_code

    # 설명: `reject_report` 함수는 대상을 반려 상태로 전환하는 함수다.
    @staticmethod
    def reject_report(report_id, current_user, data):
        # 설명: `data`에 `dict` 호출 결과를 저장해 다음 처리에서 사용한다.
        data = dict(data or {})
        # 설명: `reject_reason`에 data.get('reject_reason') or data.get('reason') or data.get('memo') 표현식의 계산 결과를 저장한다.
        reject_reason = data.get("reject_reason") or data.get("reason") or data.get("memo")
        # 설명: `not reject_reason` 조건 결과에 따라 실행 경로를 분기한다.
        if not reject_reason:
            # 설명: 호출자에게 ({'success': False, 'error': '반려 사유가 필요합니다.'}, 400) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "반려 사유가 필요합니다.",
            }, 400

        # 설명: `data['status']`의 기준값 또는 기본값을 'REJECTED'로 설정한다.
        data["status"] = "REJECTED"
        # 설명: `data['reason']`에 reject_reason 표현식의 계산 결과를 저장한다.
        data["reason"] = reject_reason

        # 설명: `(result, status_code)`에 `ReportUploadService.update_report_status` 호출 결과를 저장해 다음 처리에서 사용한다.
        result, status_code = ReportUploadService.update_report_status(
            report_id=report_id,
            current_user=current_user,
            data=data,
        )
        # 설명: `result.get('success')` 조건 결과에 따라 실행 경로를 분기한다.
        if result.get("success"):
            # 설명: `result['message']`의 기준값 또는 기본값을 '신고가 반려되었습니다.'로 설정한다.
            result["message"] = "신고가 반려되었습니다."
        # 설명: 호출자에게 (result, status_code) 값을 함수 결과로 반환한다.
        return result, status_code

    # 설명: `add_report_attachments` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def add_report_attachments(report_id, current_user, files):
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport, ReportAttachment 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport, ReportAttachment

        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, report_id)
        # 설명: `not report or getattr(report, 'deleted_at', None)` 조건 결과에 따라 실행 경로를 분기한다.
        if not report or getattr(report, "deleted_at", None):
            # 설명: 호출자에게 ({'success': False, 'error': '리포트를 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "리포트를 찾을 수 없습니다.",
            }, 404

        # 설명: `not ReportUploadService._can_manage_report(report, current_user)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._can_manage_report(report, current_user):
            # 설명: 호출자에게 ({'success': False, 'error': '첨부파일 추가 권한이 없습니다.'}, 403) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "첨부파일 추가 권한이 없습니다.",
            }, 403

        # 설명: `not ReportUploadService._is_report_editable(report)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._is_report_editable(report):
            # 설명: 호출자에게 ({'success': False, 'error': '첨부파일을 추가할 수 없는 신고 상태입니다.'}, 400) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "첨부파일을 추가할 수 없는 신고 상태입니다.",
            }, 400

        # 설명: `files`에 [file for file in files or [] if file and getattr(file, 'filename', '')] 표현식의 계산 결과를 저장한다.
        files = [file for file in (files or []) if file and getattr(file, "filename", "")]
        # 설명: `not files` 조건 결과에 따라 실행 경로를 분기한다.
        if not files:
            # 설명: 호출자에게 ({'success': False, 'error': '파일이 업로드되지 않았습니다.'}, 400) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "파일이 업로드되지 않았습니다.",
            }, 400

        # 설명: `saved_file_paths`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        saved_file_paths = []
        # 설명: `attachments`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        attachments = []
        # 설명: `now`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = ReportUploadService._now()

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `files`의 각 항목을 `file`로 받아 반복 처리한다.
            for file in files:
                # 설명: `file_info`에 `ReportUploadService.process_file_upload` 호출 결과를 저장해 다음 처리에서 사용한다.
                file_info = ReportUploadService.process_file_upload(file)
                # 설명: `saved_file_paths.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
                saved_file_paths.append(file_info["file_path"])
                # 설명: `attachment`에 `ReportAttachment` 호출 결과를 저장해 다음 처리에서 사용한다.
                attachment = ReportAttachment(
                    report_id=report.id,
                    file_type=file_info["file_type"],
                    original_filename=file_info["original_filename"],
                    stored_filename=file_info["stored_filename"],
                    storage_type=file_info["storage_type"],
                    file_path=file_info["file_path"],
                    file_size=file_info["file_size"],
                    file_hash=file_info["file_hash"],
                    mime_type=file_info["mime_type"],
                    scan_status=file_info["scan_status"],
                    is_private=False,
                    download_count=0,
                    access_count=0,
                    uploaded_by=current_user.id,
                    uploaded_at=now,
                    created_at=now,
                )
                # 설명: SQLAlchemy 세션에 ORM 객체를 등록해 다음 commit 대상에 포함한다.
                db.session.add(attachment)
                # 설명: `attachments.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
                attachments.append(attachment)

            # 설명: `report.updated_at`에 now 표현식의 계산 결과를 저장한다.
            report.updated_at = now
            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()

        except Exception:
            # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
            db.session.rollback()
            # 설명: `saved_file_paths`의 각 항목을 `path`로 받아 반복 처리한다.
            for path in saved_file_paths:
                # 설명: `path and os.path.exists(path)` 조건 결과에 따라 실행 경로를 분기한다.
                if path and os.path.exists(path):
                    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
                    try:
                        # 설명: `os.remove`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                        os.remove(path)
                    except OSError:
                        # 설명: `current_app.logger.exception`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                        current_app.logger.exception("첨부파일 추가 실패 후 파일 정리 실패", extra={"file_path": path})
            # 설명: 현재 처리를 중단하고 기존 예외를 호출자에게 전달한다.
            raise

        # 설명: `attachment_items`에 [ReportUploadService._attachment_response(item) for item in attachments] 표현식의 계산 결과를 저장한다.
        attachment_items = [ReportUploadService._attachment_response(item) for item in attachments]
        # 설명: 호출자에게 ({'success': True, 'message': '첨부파일이 추가되었습니다.', 'data': {'report_id': report.id... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "message": "첨부파일이 추가되었습니다.",
            "data": {
                "report_id": report.id,
                "attachments": attachment_items,
                "attachment_count": len(attachment_items),
            },
        }, 201

    # 설명: `delete_report_attachment` 함수는 대상을 삭제 또는 소프트 삭제 처리하는 함수다.
    @staticmethod
    def delete_report_attachment(report_id, attachment_id, current_user, data):
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport, ReportAnalysisJob, ReportAttachment 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport, ReportAnalysisJob, ReportAttachment

        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, report_id)
        # 설명: `not report or getattr(report, 'deleted_at', None)` 조건 결과에 따라 실행 경로를 분기한다.
        if not report or getattr(report, "deleted_at", None):
            # 설명: 호출자에게 ({'success': False, 'error': '리포트를 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "리포트를 찾을 수 없습니다.",
            }, 404

        # 설명: `not ReportUploadService._can_manage_report(report, current_user)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._can_manage_report(report, current_user):
            # 설명: 호출자에게 ({'success': False, 'error': '첨부파일 삭제 권한이 없습니다.'}, 403) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "첨부파일 삭제 권한이 없습니다.",
            }, 403

        # 설명: `not ReportUploadService._is_report_editable(report)` 조건 결과에 따라 실행 경로를 분기한다.
        if not ReportUploadService._is_report_editable(report):
            # 설명: 호출자에게 ({'success': False, 'error': '첨부파일을 삭제할 수 없는 신고 상태입니다.'}, 400) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "첨부파일을 삭제할 수 없는 신고 상태입니다.",
            }, 400

        # 설명: `attachment`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        attachment = db.session.get(ReportAttachment, attachment_id)
        # 설명: `not attachment or attachment.report_id != report.id or getattr(attachment, 'delet...` 조건 결과에 따라 실행 경로를 분기한다.
        if (
            not attachment
            or attachment.report_id != report.id
            or getattr(attachment, "deleted_at", None)
        ):
            # 설명: 호출자에게 ({'success': False, 'error': '첨부파일을 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "첨부파일을 찾을 수 없습니다.",
            }, 404

        # 설명: `active_job`에 `ReportAnalysisJob.query.filter(ReportAnalysisJob.report_id == repor...` 호출 결과를 저장해 다음 처리에서 사용한다.
        active_job = (
            ReportAnalysisJob.query
            .filter(
                ReportAnalysisJob.report_id == report.id,
                ReportAnalysisJob.attachment_id == attachment.id,
                ReportAnalysisJob.job_status.in_(ReportUploadService.ACTIVE_JOB_STATUSES),
            )
            .first()
        )
        # 설명: `active_job` 조건 결과에 따라 실행 경로를 분기한다.
        if active_job:
            # 설명: 호출자에게 ({'success': False, 'error': '분석 중인 첨부파일은 삭제할 수 없습니다.'}, 409) 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "분석 중인 첨부파일은 삭제할 수 없습니다.",
            }, 409

        # 설명: `now`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = ReportUploadService._now()
        # 설명: `attachment.deleted_at`에 now 표현식의 계산 결과를 저장한다.
        attachment.deleted_at = now
        # 설명: `attachment.deleted_by`에 current_user.id 표현식의 계산 결과를 저장한다.
        attachment.deleted_by = current_user.id
        # 설명: `attachment.delete_reason`에 data.get('reason') or data.get('delete_reason') 표현식의 계산 결과를 저장한다.
        attachment.delete_reason = data.get("reason") or data.get("delete_reason")
        # 설명: `report.updated_at`에 now 표현식의 계산 결과를 저장한다.
        report.updated_at = now

        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

        # 설명: 호출자에게 ({'success': True, 'message': '첨부파일이 삭제 처리되었습니다.'}, 200) 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "message": "첨부파일이 삭제 처리되었습니다.",
        }, 200

    # 설명: `process_report_analysis_job` 함수는 입력이나 대기 작업을 실제로 처리하는 함수다.
    @staticmethod
    def process_report_analysis_job(job_id):
        """QUEUED job 하나를 AI 서버에 전달하고 결과를 DB와 실시간 채널에 반영한다.

        상태를 PROCESSING으로 먼저 commit해 다른 요청이 진행 중임을 볼 수 있게 한 뒤,
        파일 multipart 요청을 수행한다. 최종 결과도 commit한 후 Socket.IO를 발행하므로
        클라이언트가 이벤트를 받은 시점에는 DB 조회에서도 같은 상태를 읽을 수 있다.
        """
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport, ReportAnalysisJob, ReportAttachment 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport, ReportAnalysisJob, ReportAttachment
        # 설명: app.modules.ai_gateway.service에서 AIGatewayService 이름을 가져와 아래 로직에서 재사용한다.
        from app.modules.ai_gateway.service import AIGatewayService
        # 설명: app.modules.socketio.emitters에서 emit_report_analysis_updated 이름을 가져와 아래 로직에서 재사용한다.
        from app.modules.socketio.emitters import emit_report_analysis_updated

        # 설명: `job`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        job = db.session.get(ReportAnalysisJob, job_id)
        # 설명: `not job` 조건 결과에 따라 실행 경로를 분기한다.
        if not job:
            # 설명: 호출자에게 ({'success': False, 'error': '분석 작업을 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "분석 작업을 찾을 수 없습니다."}, 404

        # 설명: `job.job_status != 'QUEUED'` 조건 결과에 따라 실행 경로를 분기한다.
        if job.job_status != "QUEUED":
            # 설명: 호출자에게 ({'success': False, 'error': 'QUEUED 상태의 분석 작업만 처리할 수 있습니다.', 'job_status': job... 값을 함수 결과로 반환한다.
            return {
                "success": False,
                "error": "QUEUED 상태의 분석 작업만 처리할 수 있습니다.",
                "job_status": job.job_status,
            }, 409

        # job의 두 FK를 따라 부모 신고와 실제 분석 대상 첨부 메타데이터를 읽는다.
        report = db.session.get(IncidentReport, job.report_id)
        # 설명: `attachment`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        attachment = db.session.get(ReportAttachment, job.attachment_id)

        # 설명: `not report or not attachment` 조건 결과에 따라 실행 경로를 분기한다.
        if not report or not attachment:
            # 설명: `job.job_status`의 기준값 또는 기본값을 'FAILED'로 설정한다.
            job.job_status = "FAILED"
            # 설명: `job.failed_reason_code`의 기준값 또는 기본값을 'MISSING_REPORT_OR_ATTACHMENT'로 설정한다.
            job.failed_reason_code = "MISSING_REPORT_OR_ATTACHMENT"
            # 설명: `job.error_message`의 기준값 또는 기본값을 'Report or attachment not found.'로 설정한다.
            job.error_message = "Report or attachment not found."
            # 설명: `job.completed_at`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
            job.completed_at = ReportUploadService._now()
            # 설명: `job.updated_at`에 job.completed_at 표현식의 계산 결과를 저장한다.
            job.updated_at = job.completed_at
            # 설명: `job.progress_percent`의 기준값 또는 기본값을 100로 설정한다.
            job.progress_percent = 100
            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()
            # 설명: `emit_report_analysis_updated`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            emit_report_analysis_updated(job)
            # 설명: 호출자에게 ({'success': False, 'error': '신고 또는 첨부파일을 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "신고 또는 첨부파일을 찾을 수 없습니다."}, 404

        # 설명: `started_at`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
        started_at = ReportUploadService._now()
        # AI 호출 전에 PROCESSING을 commit해 REST 조회와 실시간 UI에 진행 시작을 노출한다.
        job.job_status = "PROCESSING"
        # 설명: `job.started_at`에 job.started_at or started_at 표현식의 계산 결과를 저장한다.
        job.started_at = job.started_at or started_at
        # 설명: `job.updated_at`에 started_at 표현식의 계산 결과를 저장한다.
        job.updated_at = started_at
        # 설명: `job.progress_percent`의 기준값 또는 기본값을 10로 설정한다.
        job.progress_percent = 10
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
        # 설명: `emit_report_analysis_updated`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        emit_report_analysis_updated(job)

        # 설명: `camera_id`에 f'camera-{report.cctv_id}' if getattr(report, 'cctv_id', None) else None 표현식의 계산 결과를 저장한다.
        camera_id = f"camera-{report.cctv_id}" if getattr(report, "cctv_id", None) else None
        # 설명: `(success, response)`에 `AIGatewayService.request_analysis` 호출 결과를 저장해 다음 처리에서 사용한다.
        success, response = AIGatewayService.request_analysis(
            report.id,
            attachment.file_path,
            cctv_id=getattr(report, "cctv_id", None),
            camera_id=camera_id,
        )
        # 설명: `completed_at`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
        completed_at = ReportUploadService._now()

        # 설명: `success` 조건 결과에 따라 실행 경로를 분기한다.
        if success:
            # AI JSON은 스키마 확장에 유연하도록 result_summary JSON 컬럼에 원형에 가깝게 저장한다.
            result_summary = response if isinstance(response, dict) else {"raw_response": str(response)}
            # 설명: `is_completed`에 str(result_summary.get('status', '')).upper() == 'OK' or 'detections'... 표현식의 계산 결과를 저장한다.
            is_completed = (
                str(result_summary.get("status", "")).upper() == "OK"
                or "detections" in result_summary
                or "count" in result_summary
            )

            # 설명: `is_completed` 조건 결과에 따라 실행 경로를 분기한다.
            if is_completed:
                # 설명: `job.job_status`의 기준값 또는 기본값을 'COMPLETED'로 설정한다.
                job.job_status = "COMPLETED"
                # 설명: `job.completed_at`에 completed_at 표현식의 계산 결과를 저장한다.
                job.completed_at = completed_at
                # 설명: `job.progress_percent`의 기준값 또는 기본값을 100로 설정한다.
                job.progress_percent = 100
                # 설명: `job.total_frames`의 기준값 또는 기본값을 1로 설정한다.
                job.total_frames = 1
                # 설명: `job.processed_frames`의 기준값 또는 기본값을 1로 설정한다.
                job.processed_frames = 1
                # 설명: `job.result_summary`에 result_summary 표현식의 계산 결과를 저장한다.
                job.result_summary = result_summary
                # 설명: `job.primary_model_name`의 기준값 또는 기본값을 'YOLO11'로 설정한다.
                job.primary_model_name = "YOLO11"
                # 설명: `job.primary_model_version`의 기준값 또는 기본값을 'current.pt'로 설정한다.
                job.primary_model_version = "current.pt"
                # 설명: `job.error_message`의 기준값 또는 기본값을 None로 설정한다.
                job.error_message = None
                # 설명: `job.failed_reason_code`의 기준값 또는 기본값을 None로 설정한다.
                job.failed_reason_code = None
            else:
                # 설명: `job.job_status`의 기준값 또는 기본값을 'QUEUED'로 설정한다.
                job.job_status = "QUEUED"
                # 설명: `job.result_summary`에 result_summary 표현식의 계산 결과를 저장한다.
                job.result_summary = result_summary
                # 설명: `job.progress_percent`에 job.progress_percent or 10 표현식의 계산 결과를 저장한다.
                job.progress_percent = job.progress_percent or 10
        else:
            # 설명: `job.job_status`의 기준값 또는 기본값을 'FAILED'로 설정한다.
            job.job_status = "FAILED"
            # 설명: `job.completed_at`에 completed_at 표현식의 계산 결과를 저장한다.
            job.completed_at = completed_at
            # 설명: `job.progress_percent`의 기준값 또는 기본값을 100로 설정한다.
            job.progress_percent = 100
            # 설명: `job.failed_reason_code`에 response.get('status') if isinstance(response, dict) else 'AI_REQUEST... 표현식의 계산 결과를 저장한다.
            job.failed_reason_code = response.get("status") if isinstance(response, dict) else "AI_REQUEST_FAILED"
            # 설명: `job.error_message`에 str(response)[:2000] 표현식의 계산 결과를 저장한다.
            job.error_message = str(response)[:2000]

        # 설명: `job.updated_at`에 completed_at 표현식의 계산 결과를 저장한다.
        job.updated_at = completed_at
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()
        # 설명: `emit_report_analysis_updated`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        emit_report_analysis_updated(job)

        # 설명: 호출자에게 ({'success': job.job_status != 'FAILED', 'job_id': job.id, 'job_status': job.jo... 값을 함수 결과로 반환한다.
        return {
            "success": job.job_status != "FAILED",
            "job_id": job.id,
            "job_status": job.job_status,
            "analysis_status": ReportUploadService._normalize_analysis_status(
                        job.job_status
                    ),
            "report_id": report.id,
            "attachment_id": attachment.id,
        }, 200

    # 설명: `process_queued_report_analysis_jobs` 함수는 입력이나 대기 작업을 실제로 처리하는 함수다.
    @staticmethod
    def process_queued_report_analysis_jobs(limit=10):
        """오래된 QUEUED 작업부터 최대 100개를 선택해 순차 처리한다."""
        # 설명: app.models에서 ReportAnalysisJob 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import ReportAnalysisJob

        # 설명: `limit`에 `max` 호출 결과를 저장해 다음 처리에서 사용한다.
        limit = max(1, min(int(limit), 100))
        # 설명: `jobs`에 `ReportAnalysisJob.query.filter(ReportAnalysisJob.job_status == 'QUE...` 호출 결과를 저장해 다음 처리에서 사용한다.
        jobs = (
            ReportAnalysisJob.query
            .filter(ReportAnalysisJob.job_status == "QUEUED")
            .order_by(ReportAnalysisJob.id.asc())
            .limit(limit)
            .all()
        )

        # 설명: `items`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        items = []
        # 설명: `jobs`의 각 항목을 `job`로 받아 반복 처리한다.
        for job in jobs:
            # 설명: `(result, status_code)`에 `ReportUploadService.process_report_analysis_job` 호출 결과를 저장해 다음 처리에서 사용한다.
            result, status_code = ReportUploadService.process_report_analysis_job(job.id)
            # 설명: `items.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
            items.append({"job_id": job.id, "status_code": status_code, "result": result})

        # 설명: 호출자에게 ({'success': True, 'processed_count': len(items), 'items': items}, 200) 값을 함수 결과로 반환한다.
        return {"success": True, "processed_count": len(items), "items": items}, 200

    # 설명: `request_report_analysis` 함수는 외부 처리 또는 비동기 작업을 요청하는 함수다.
    @staticmethod
    def request_report_analysis(report_id, user_id=None, current_user=None):
        """신고의 활성 첨부마다 분석 job을 생성하거나 기존 활성 job을 재사용한다.

        이 함수는 AI HTTP 요청을 하지 않는다. DB에 QUEUED 행을 commit한 뒤 워커가
        ``process_queued_report_analysis_jobs``에서 읽도록 하며, 같은 첨부/활성 상태 조합은
        조회 후 재사용해 API 재호출의 멱등성을 제공한다.
        """
        # 설명: app.extensions에서 db 이름을 가져와 아래 로직에서 재사용한다.
        from app.extensions import db
        # 설명: app.models에서 IncidentReport, ReportAnalysisJob, ReportAttachment 이름을 가져와 아래 로직에서 재사용한다.
        from app.models import IncidentReport, ReportAnalysisJob, ReportAttachment
        # 설명: app.modules.socketio.emitters에서 emit_report_analysis_updated 이름을 가져와 아래 로직에서 재사용한다.
        from app.modules.socketio.emitters import emit_report_analysis_updated

        # 설명: `now`에 `ReportUploadService._now` 호출 결과를 저장해 다음 처리에서 사용한다.
        now = ReportUploadService._now()
        # 설명: `report`에 `db.session.get` 호출 결과를 저장해 다음 처리에서 사용한다.
        report = db.session.get(IncidentReport, report_id)

        # 설명: `not report` 조건 결과에 따라 실행 경로를 분기한다.
        if not report:
            # 설명: 호출자에게 ({'success': False, 'error': '리포트를 찾을 수 없습니다.'}, 404) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "리포트를 찾을 수 없습니다."}, 404
        # 설명: `current_user is not None` 조건 결과에 따라 실행 경로를 분기한다.
        if current_user is not None:
            # 설명: `not ReportUploadService._is_admin(current_user)` 조건 결과에 따라 실행 경로를 분기한다.
            if not ReportUploadService._is_admin(current_user):
                # 설명: 호출자에게 ({'success': False, 'error': '분석 요청은 관리자 권한이 필요합니다.'}, 403) 값을 함수 결과로 반환한다.
                return {"success": False, "error": "분석 요청은 관리자 권한이 필요합니다."}, 403
            # 설명: `user_id`에 current_user.id 표현식의 계산 결과를 저장한다.
            user_id = current_user.id
        # 설명: `user_id is None` 조건 결과에 따라 실행 경로를 분기한다.
        if user_id is None:
            # 설명: 호출자에게 ({'success': False, 'error': '분석 요청 사용자가 필요합니다.'}, 400) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "분석 요청 사용자가 필요합니다."}, 400

        # report_id FK로 연결되고 소프트 삭제되지 않은 파일만 분석 입력 후보가 된다.
        attachments = (
            ReportAttachment.query
            .filter(
                ReportAttachment.report_id == report.id,
                ReportAttachment.deleted_at.is_(None),
            )
            .order_by(ReportAttachment.id.asc())
            .all()
        )

        # 설명: `not attachments` 조건 결과에 따라 실행 경로를 분기한다.
        if not attachments:
            # 설명: 호출자에게 ({'success': False, 'error': '분석할 첨부파일이 없습니다.'}, 400) 값을 함수 결과로 반환한다.
            return {"success": False, "error": "분석할 첨부파일이 없습니다."}, 400

        # 설명: `jobs`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
        jobs = []
        # 설명: `created`의 기준값 또는 기본값을 False로 설정한다.
        created = False

        # 설명: `attachments`의 각 항목을 `attachment`로 받아 반복 처리한다.
        for attachment in attachments:
            # 첨부별 활성 job이 있으면 새 INSERT 대신 그 PK를 그대로 응답한다.
            existing_job = (
                ReportAnalysisJob.query
                .filter(
                    ReportAnalysisJob.report_id == report.id,
                    ReportAnalysisJob.attachment_id == attachment.id,
                    ReportAnalysisJob.job_status.in_(ReportUploadService.ACTIVE_JOB_STATUSES),
                )
                .order_by(ReportAnalysisJob.id.desc())
                .first()
            )

            # 설명: `existing_job` 조건 결과에 따라 실행 경로를 분기한다.
            if existing_job:
                # 설명: `jobs.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
                jobs.append(existing_job)
                # 설명: 현재 반복의 남은 구문을 건너뛰고 다음 항목 처리를 시작한다.
                continue

            # Python float 리터럴 0.450은 SQLAlchemy가 Numeric(4,3)에 맞춰 DECIMAL로 저장한다.
            job = ReportAnalysisJob(
                report_id=report.id,
                attachment_id=attachment.id,
                job_status="QUEUED",
                analysis_type="INCIDENT_DETECTION",
                ai_engine_type="YOLOV11",
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
            # 설명: `jobs.append` 호출로 처리 결과를 기존 컬렉션에 누적한다.
            jobs.append(job)
            # 설명: `created`의 기준값 또는 기본값을 True로 설정한다.
            created = True

        # flush/commit 후에야 자동 증가 job.id가 확정된다.
        db.session.commit()

        # DB 확정 뒤 이벤트를 보내 이벤트 수신자가 즉시 같은 job을 조회할 수 있게 한다.
        for job in jobs:
            # 설명: `emit_report_analysis_updated`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            emit_report_analysis_updated(job)

        # 설명: 호출자에게 ({'success': True, 'message': '분석 작업이 대기열에 등록되었습니다.', 'report_id': report.id, '... 값을 함수 결과로 반환한다.
        return {
            "success": True,
            "message": "분석 작업이 대기열에 등록되었습니다.",
            "report_id": report.id,
            "job_id": jobs[0].id if jobs else None,
            "analysis_status": ReportUploadService._normalize_analysis_status(
                jobs[0].job_status if jobs else None
            ),
            "allowed_actions": ReportUploadService._allowed_actions(
                report, current_user
            ),
            "jobs": [
                {
                    "job_id": job.id,
                    "report_id": job.report_id,
                    "attachment_id": job.attachment_id,
                    "job_status": job.job_status,
                    "analysis_status": ReportUploadService._normalize_analysis_status(job.job_status),
                }
                for job in jobs
            ],
        }, 201 if created else 200
