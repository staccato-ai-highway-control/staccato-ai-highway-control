# 역할: AI VM FastAPI 라우터를 정의하고 CCTV, 스트림, bbox, 이벤트, 리포트 분석 API를 제공합니다.
import asyncio
import os
import uuid
from pathlib import Path

import requests
from fastapi import Depends, FastAPI, Header, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse
from fastapi import File, Form, UploadFile

from .bbox_store import (
    STREAM_ONLY_BBOX_MESSAGE,
    get_latest_bbox_metadata,
    is_analyzed_camera,
)
from .cameras import camera_registry
from .config import (
    ANALYZED_CAMERA_IDS,
    BBOX_WS_INTERVAL_SECONDS,
    CORS_ORIGINS,
    EVENT_MEDIA_DIR,
    ITS_CCTV_DEFAULT_MAX_X,
    ITS_CCTV_DEFAULT_MAX_Y,
    ITS_CCTV_DEFAULT_MIN_X,
    ITS_CCTV_DEFAULT_MIN_Y,
    ITS_CCTV_DEFAULT_ROAD_TYPE,
    ITS_CCTV_DEFAULT_TYPE,
    MANUAL_EVENT_CLIP_POST_SECONDS,
    MANUAL_EVENT_CLIP_PRE_SECONDS,

    INTERNAL_API_TOKEN,
    REPORT_DETECT_MAX_UPLOAD_BYTES,
)
from .dev_auth import (
    expected_authorization_header,
    get_dev_auth_response,
    is_valid_dev_login,
)
from .detector import detector
from .realtime_detection_filter import filter_realtime_display_detections
from .its_openapi import get_its_cctv_list_response
from .roi_config import get_camera_rois, save_camera_rois
from .schemas import CameraStartPayload, LoginPayload, ManualEventPayload, RoiSettingsPayload
from .stream_server import BOUNDARY, active_stream_counts, claim_stream_slot, mjpeg_generator


app = FastAPI(title="AI VM", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 서비스 기본 정보와 사용 가능한 엔드포인트 목록을 반환합니다.
@app.get("/")
def index():
    return {
        "success": True,
        "service": "ai-vm",
        "runtime": "FastAPI",
        "message": "AI VM CCTV analysis server is running",
        "endpoints": [
            "/traffic/api/cctv",
            "/streams/{camera_id}.mjpeg",
            "/ws/cameras/{camera_id}/bbox",
            "/snapshots/{camera_id}/latest.jpg",
            "/internal/cameras",
            "/internal/cameras/{camera_id}/start",
            "/internal/cameras/{camera_id}/stop",
            "/internal/cameras/{camera_id}/manual-event",
            "/internal/cameras/{camera_id}/detections",
            "/internal/cameras/{camera_id}/rois",
            "/events/{event_id}.jpg",
            "/events/{event_id}.mp4",
            "/auth/login",
            "/auth/me",
            "/health",
        ],
    }


# 서버, 카메라, 스트림 상태를 확인하는 health check 응답을 반환합니다.
@app.get("/health")
def health():
    return {
        "success": True,
        "service": "ai-vm",
        "status": "ok",
        "analyzed_camera_ids": sorted(ANALYZED_CAMERA_IDS),
        "cameras": camera_registry.list_statuses(),
        "streams": active_stream_counts(),
    }


DEFAULT_CCTV_SOURCE_NAMES = [
    "[수도권제1순환선] 판교분기점",
    "[경부선] 신갈분기점",
    "[영동선] 동수원",
    "[수도권제1순환선] 하남분기점",
    "[수도권제1순환선] 조남분기점",
    "[수도권제1순환선] 서운분기점",
    "[수도권제1순환선] 퇴계원",
    "[수도권제1순환선] 성남",
]


# _parse_cctv_source_names 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _parse_cctv_source_names(value: str | None) -> list[str]:
    if not value:
        return []
    return [name.strip() for name in value.split(",") if name.strip()]


# _selected_cctv_source_names 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _selected_cctv_source_names(source_names: str | None = None) -> list[str]:
    configured_names = _parse_cctv_source_names(source_names)
    if configured_names:
        return configured_names

    env_names = _parse_cctv_source_names(os.getenv("CCTV_SOURCE_NAMES"))
    if env_names:
        return env_names

    return DEFAULT_CCTV_SOURCE_NAMES


# _filter_cctv_sources 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _filter_cctv_sources(
    cctv_list: list[dict],
    source_names: list[str],
    limit: int,
) -> list[dict]:
    selected: list[dict] = []
    used_indexes: set[int] = set()

    for source_name in source_names:
        matched_index = None

        for index, item in enumerate(cctv_list):
            if index in used_indexes:
                continue
            item_name = str(item.get("name") or item.get("cctvname") or "").strip()
            if item_name == source_name:
                matched_index = index
                break

        if matched_index is None:
            for index, item in enumerate(cctv_list):
                if index in used_indexes:
                    continue
                item_name = str(item.get("name") or item.get("cctvname") or "").strip()
                if item_name and (source_name in item_name or item_name in source_name):
                    matched_index = index
                    break

        if matched_index is None:
            continue

        selected.append(cctv_list[matched_index])
        used_indexes.add(matched_index)

        if len(selected) >= limit:
            break

    return selected[:limit]



# ITS CCTV 목록을 조회한 뒤 설정된 소스명 목록으로 필터링해 반환합니다.
@app.get("/traffic/api/cctv")
def traffic_cctv_api(
    min_x: str = Query(ITS_CCTV_DEFAULT_MIN_X, alias="minX"),
    max_x: str = Query(ITS_CCTV_DEFAULT_MAX_X, alias="maxX"),
    min_y: str = Query(ITS_CCTV_DEFAULT_MIN_Y, alias="minY"),
    max_y: str = Query(ITS_CCTV_DEFAULT_MAX_Y, alias="maxY"),
    cctv_type: str = Query(ITS_CCTV_DEFAULT_TYPE, alias="cctvType"),
    road_type: str = Query(ITS_CCTV_DEFAULT_ROAD_TYPE, alias="roadType"),
    limit: int = Query(8, ge=1, le=100),
    source_names: str | None = Query(default=None, alias="sourceNames"),
):
    try:
        cctv_response = get_its_cctv_list_response(
            min_x=min_x,
            max_x=max_x,
            min_y=min_y,
            max_y=max_y,
            cctv_type=cctv_type,
            road_type=road_type,
        )
        cctv_list = cctv_response["items"]

        selected_names = _selected_cctv_source_names(source_names)
        selected_cctvs = _filter_cctv_sources(
            cctv_list=cctv_list,
            source_names=selected_names,
            limit=limit,
        )

        from_cache = bool(cctv_response.get("fromCache"))
        return {
            "success": True,
            "message": "CCTV list fetched from cache" if from_cache else "CCTV list fetched",
            "fromCache": from_cache,
            "cacheUpdatedAt": cctv_response.get("cacheUpdatedAt"),
            "originalError": cctv_response.get("originalError"),
            "count": len(selected_cctvs),
            "raw_count": len(cctv_list),
            "selected_count": len(selected_cctvs),
            "limit": limit,
            "source_names": selected_names,
            "selection_mode": "allowlist",
            "data": selected_cctvs,
            "items": selected_cctvs,
            "cameras": selected_cctvs,
        }
    except ValueError as error:
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": str(error), "data": []},
        )
    except requests.RequestException as error:
        return JSONResponse(
            status_code=502,
            content={
                "success": False,
                "message": f"ITS API request failed: {error}",
                "data": [],
            },
        )
    except Exception as error:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"CCTV list fetch failed: {error}",
                "data": [],
            },
        )



# 내부 API 호출에 필요한 Bearer 토큰을 검증합니다.
def require_internal_token(authorization: str = Header(default="")) -> None:
    expected = f"Bearer {INTERNAL_API_TOKEN}"
    if authorization != expected:
        raise HTTPException(status_code=403, detail="Forbidden")


# 개발용 로그인 요청을 검증하고 액세스 토큰을 반환합니다.
@app.post("/auth/login")
def auth_login(payload: LoginPayload):
    login_id = payload.login_id.strip()
    password = payload.password.strip()

    if not is_valid_dev_login(login_id, password):
        return JSONResponse(
            status_code=401,
            content={"success": False, "message": "Invalid login_id or password"},
        )

    return get_dev_auth_response()


# 현재 Bearer 토큰이 유효한지 확인하고 사용자 정보를 반환합니다.
@app.get("/auth/me")
def auth_me(authorization: str = Header(default="")):
    if authorization != expected_authorization_header():
        return JSONResponse(
            status_code=401,
            content={"success": False, "message": "Unauthorized"},
        )

    return get_dev_auth_response()


# 실행 중인 카메라 워커 상태 목록을 반환합니다.
@app.get("/internal/cameras")
def internal_cameras(_auth: None = Depends(require_internal_token)):
    return {
        "success": True,
        "data": camera_registry.list_statuses(),
    }


# 내부 API로 카메라 워커를 시작하거나 재사용합니다.
@app.post("/internal/cameras/{camera_id}/start")
def internal_camera_start(
    camera_id: str,
    payload: CameraStartPayload,
    _auth: None = Depends(require_internal_token),
):
    source_url = payload.source_url.strip()
    if not source_url:
        raise HTTPException(status_code=400, detail="source_url is required.")

    worker = camera_registry.start_camera(
        camera_id=camera_id,
        source_url=source_url,
        name=payload.name,
        target_fps=payload.target_fps,
        analysis_fps=_effective_analysis_fps(camera_id, payload.analysis_fps),
        analysis_queue_size=payload.analysis_queue_size,
        buffer_seconds=payload.buffer_seconds,
        stale_timeout_seconds=payload.stale_timeout_seconds,
        reconnect_backoff_seconds=payload.reconnect_backoff_seconds,
    )

    return {
        "success": True,
        "data": worker.to_status_payload(),
    }


# 내부 API로 카메라 워커를 중지합니다.
@app.post("/internal/cameras/{camera_id}/stop")
def internal_camera_stop(
    camera_id: str,
    _auth: None = Depends(require_internal_token),
):
    worker = camera_registry.stop_camera(camera_id)
    if worker is None:
        raise HTTPException(status_code=404, detail="Camera worker not found.")

    return {
        "success": True,
        "data": worker.to_status_payload(),
    }


# 카메라별 현재 ROI 설정을 반환합니다.
@app.get("/internal/cameras/{camera_id}/rois")
def internal_camera_rois(
    camera_id: str,
    _auth: None = Depends(require_internal_token),
):
    return {
        "success": True,
        "data": {
            "camera_id": camera_id,
            "rois": get_camera_rois(camera_id),
        },
    }


# 카메라별 ROI 설정을 검증 후 저장합니다.
@app.put("/internal/cameras/{camera_id}/rois")
def internal_camera_rois_update(
    camera_id: str,
    payload: RoiSettingsPayload,
    _auth: None = Depends(require_internal_token),
):
    try:
        rois = save_camera_rois(camera_id, payload.rois)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return {
        "success": True,
        "data": {
            "camera_id": camera_id,
            "rois": rois,
        },
    }


# 현재 프레임 기준으로 수동 이벤트 클립 생성을 요청합니다.
@app.post("/internal/cameras/{camera_id}/manual-event")
def internal_camera_manual_event(
    camera_id: str,
    payload: ManualEventPayload,
    _auth: None = Depends(require_internal_token),
):
    worker = camera_registry.get_camera(camera_id)
    if worker is None:
        if not payload.source_url:
            raise HTTPException(
                status_code=404,
                detail="Camera worker not found. Pass source_url or open the ITS stream first.",
            )

        worker = camera_registry.start_camera(
            camera_id=camera_id,
            source_url=payload.source_url.strip(),
            name=payload.name,
            target_fps=payload.target_fps,
            analysis_fps=_effective_analysis_fps(camera_id, payload.analysis_fps),
            buffer_seconds=max(
                (payload.pre_seconds or MANUAL_EVENT_CLIP_PRE_SECONDS)
                + (payload.post_seconds or MANUAL_EVENT_CLIP_POST_SECONDS)
                + 2.0,
                12.0,
            ),
        )

    event = worker.trigger_manual_event(
        event_type=payload.event_type,
        severity=payload.severity,
        message=payload.message,
        pre_seconds=payload.pre_seconds or MANUAL_EVENT_CLIP_PRE_SECONDS,
        post_seconds=payload.post_seconds or MANUAL_EVENT_CLIP_POST_SECONDS,
    )

    return {
        "success": True,
        "message": "Manual event clip queued. The replay video is available after post frames are collected.",
        "data": event,
        "clip": worker.event_clip_worker.to_status_payload(),
    }


# 최신 프레임 또는 캐시된 결과로 탐지 결과를 반환합니다.
@app.get("/internal/cameras/{camera_id}/detections")
def internal_camera_detections(
    camera_id: str,
    refresh: bool = Query(default=False),
    confidence: float | None = Query(default=None, gt=0, le=1),
    imgsz: int | None = Query(default=None, ge=128, le=1920),
):
    if not is_analyzed_camera(camera_id):
        raise HTTPException(status_code=403, detail=STREAM_ONLY_BBOX_MESSAGE)

    worker = camera_registry.get_camera(camera_id)
    if worker is None:
        raise HTTPException(status_code=404, detail="Camera worker not found.")

    if not refresh:
        result = worker.get_latest_detection_result()
        if result is not None:
            return {
                "success": True,
                "data": result,
            }

    frame = worker.get_latest_frame()
    if frame is None:
        raise HTTPException(status_code=404, detail="No frame available yet.")

    try:
        detections = detector.detect(frame, confidence=confidence, imgsz=imgsz)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    detections = filter_realtime_display_detections(
        camera_id=camera_id,
        detections=detections,
        frame_shape=frame.shape,
    )

    return {
        "success": True,
        "data": {
            "camera_id": camera_id,
            "frame_width": frame.shape[1],
            "frame_height": frame.shape[0],
            "bbox_format": "xyxy",
            "model": detector.model_name,
            "detections": [item.to_dict() for item in detections],
            "count": len(detections),
            "source": "refresh",
        },
    }


# 프론트엔드에 최신 bbox 메타데이터를 주기적으로 전송합니다.
@app.websocket("/ws/cameras/{camera_id}/bbox")
async def camera_bbox_websocket(camera_id: str, websocket: WebSocket):
    if not is_analyzed_camera(camera_id):
        await websocket.accept()
        await websocket.send_json({"success": False, "message": STREAM_ONLY_BBOX_MESSAGE})
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION,
            reason=STREAM_ONLY_BBOX_MESSAGE,
        )
        return

    await websocket.accept()

    try:
        while True:
            metadata = get_latest_bbox_metadata(camera_id) or _latest_empty_bbox_metadata(camera_id)
            if metadata is not None:
                await websocket.send_json(metadata)

            await asyncio.sleep(BBOX_WS_INTERVAL_SECONDS)
    except (WebSocketDisconnect, RuntimeError):
        return


# 카메라를 필요 시 시작하고 MJPEG 스트림 응답을 반환합니다.
@app.get("/streams/{camera_id}.mjpeg")
def camera_mjpeg_stream(
    camera_id: str,
    source_url: str | None = Query(default=None),
    name: str | None = Query(default=None),
    target_fps: float = Query(default=10.0, gt=0, le=60),
    analysis_fps: float = Query(default=5.0, ge=0, le=30),
    quality: int = Query(default=80, ge=1, le=100),
):
    worker = camera_registry.get_camera(camera_id)
    clean_source_url = source_url.strip() if source_url else None
    clean_name = name.strip() if name else None
    source_changed = bool(
        clean_source_url
        and worker is not None
        and worker.source_url != clean_source_url
        and not worker.matches_source_identity(name=clean_name, source_url=clean_source_url)
    )

    if clean_source_url and (worker is None or not worker.is_running() or source_changed):
        if not clean_source_url:
            raise HTTPException(status_code=400, detail="source_url is required.")

        worker = camera_registry.start_camera(
            camera_id=camera_id,
            source_url=clean_source_url,
            name=clean_name,
            target_fps=target_fps,
            analysis_fps=_effective_analysis_fps(camera_id, analysis_fps),
        )

    if worker is None:
        raise HTTPException(
            status_code=404,
            detail="Camera worker not found. Start it first or pass source_url.",
        )

    slot = claim_stream_slot(camera_id)
    if slot is None:
        raise HTTPException(
            status_code=429,
            detail="Too many MJPEG stream clients. Close another viewer and retry.",
        )

    return StreamingResponse(
        mjpeg_generator(worker, quality=quality, slot=slot),
        media_type=f"multipart/x-mixed-replace; boundary={BOUNDARY}",
        headers={
            "Cache-Control": "no-store",
            "Cross-Origin-Resource-Policy": "cross-origin",
            "X-Content-Type-Options": "nosniff",
        },
    )


# 카메라의 최신 프레임을 JPEG 스냅샷으로 반환합니다.
@app.get("/snapshots/{camera_id}/latest.jpg")
def camera_latest_snapshot(
    camera_id: str,
    quality: int = Query(default=90, ge=1, le=100),
):
    worker = camera_registry.get_camera(camera_id)
    if worker is None:
        raise HTTPException(status_code=404, detail="Camera worker not found.")

    jpeg = worker.get_latest_jpeg(quality=quality)
    if jpeg is None:
        raise HTTPException(status_code=404, detail="No frame available yet.")

    return Response(
        content=jpeg,
        media_type="image/jpeg",
        headers={"Cache-Control": "no-store"},
    )


# 저장된 이벤트 스냅샷 이미지를 파일 응답으로 반환합니다.
@app.get("/events/{event_id}.jpg")
def event_snapshot(event_id: str):
    path = EVENT_MEDIA_DIR / "snapshots" / f"{_safe_event_id(event_id)}.jpg"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Event snapshot not found.")
    return FileResponse(
        path,
        media_type="image/jpeg",
        headers={"Cache-Control": "no-store"},
    )


# 저장된 이벤트 재생 영상을 파일 응답으로 반환합니다.
@app.get("/events/{event_id}.mp4")
def event_video(event_id: str):
    path = EVENT_MEDIA_DIR / "videos" / f"{_safe_event_id(event_id)}.mp4"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Event video not found.")
    return FileResponse(
        path,
        media_type="video/mp4",
        headers={"Cache-Control": "no-store"},
    )



REPORT_ANALYSIS_MEDIA_DIR = Path(
    os.getenv("REPORT_ANALYSIS_MEDIA_DIR", str(EVENT_MEDIA_DIR / "report_analysis"))
)
AI_PUBLIC_BASE_URL = os.getenv("AI_PUBLIC_BASE_URL", "http://192.168.0.186:5001").rstrip("/")


# _safe_report_analysis_filename 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _safe_report_analysis_filename(filename: str) -> str:
    safe_filename = "".join(
        char for char in filename if char.isalnum() or char in {"_", "-", "."}
    )
    if not safe_filename or safe_filename != filename:
        raise HTTPException(status_code=400, detail="Invalid report analysis media filename.")
    return safe_filename


# 리포트 분석용으로 생성된 이미지/영상을 파일 응답으로 제공합니다.
@app.get("/report-analysis/{filename}")
def report_analysis_media(filename: str):
    safe_filename = _safe_report_analysis_filename(filename)
    path = REPORT_ANALYSIS_MEDIA_DIR / safe_filename

    if not path.exists():
        raise HTTPException(status_code=404, detail="Report analysis media not found.")

    suffix = path.suffix.lower()
    media_type = "video/mp4" if suffix == ".mp4" else "image/jpeg"

    return FileResponse(
        path,
        media_type=media_type,
        headers={
            "Cache-Control": "no-store",
            "Cross-Origin-Resource-Policy": "cross-origin",
        },
    )


# _report_analysis_box_color 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _report_analysis_box_color(detection: dict) -> tuple[int, int, int]:
    box_color = str(detection.get("box_color") or "").lower()
    risk_level = str(detection.get("risk_level") or "").upper()
    incident_type = str(detection.get("incident_type") or "").upper()

    if box_color in {"red", "danger", "risk"}:
        return (0, 0, 255)  # OpenCV BGR red

    if risk_level in {"HIGH", "CRITICAL"} or incident_type:
        return (0, 0, 255)  # OpenCV BGR red

    return (0, 255, 0)  # OpenCV BGR green


# _save_report_analysis_annotated_image 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _save_report_analysis_annotated_image(
    report_id: str,
    frame,
    detections: list[dict],
) -> str | None:
    if frame is None or not detections:
        return None

    import cv2

    REPORT_ANALYSIS_MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    rendered = frame.copy()

    for detection in detections:
        bbox = detection.get("bbox")
        if not isinstance(bbox, list) or len(bbox) != 4:
            continue

        x1, y1, x2, y2 = [int(value) for value in bbox]
        label = (
            detection.get("display_label")
            or detection.get("label")
            or detection.get("class_name")
            or detection.get("raw_class_name")
            or detection.get("name")
            or str(detection.get("class_id", "object"))
        )
        confidence = detection.get("confidence")
        label_text = label
        if isinstance(confidence, (int, float)):
            label_text = f"{label} {confidence:.2f}"

        box_color = _report_analysis_box_color(detection)

        cv2.rectangle(rendered, (x1, y1), (x2, y2), box_color, 2)
        cv2.putText(
            rendered,
            label_text,
            (x1, max(20, y1 - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            box_color,
            2,
            cv2.LINE_AA,
        )

    safe_report_id = "".join(
        char for char in str(report_id or "unknown") if char.isalnum() or char in {"_", "-"}
    )
    filename = f"report_{safe_report_id}_{uuid.uuid4().hex[:12]}_annotated.jpg"
    output_path = REPORT_ANALYSIS_MEDIA_DIR / filename

    ok = cv2.imwrite(str(output_path), rendered)
    if not ok:
        return None

    return f"{AI_PUBLIC_BASE_URL}/report-analysis/{filename}"


# _draw_report_analysis_detections 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _draw_report_analysis_detections(frame, detections: list[dict]) -> None:
    import cv2

    for detection in detections:
        bbox = detection.get("bbox")
        if not isinstance(bbox, list) or len(bbox) != 4:
            continue

        x1, y1, x2, y2 = [int(value) for value in bbox]

        label = (
            detection.get("display_label")
            or detection.get("label")
            or detection.get("class_name")
            or detection.get("raw_class_name")
            or detection.get("name")
            or str(detection.get("class_id", "object"))
        )
        confidence = detection.get("confidence")
        label_text = label
        if isinstance(confidence, (int, float)):
            label_text = f"{label} {confidence:.2f}"

        box_color = _report_analysis_box_color(detection)

        cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
        cv2.putText(
            frame,
            label_text,
            (x1, max(20, y1 - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            box_color,
            2,
            cv2.LINE_AA,
        )


# _transcode_report_analysis_video_to_h264 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _transcode_report_analysis_video_to_h264(input_path: Path, output_path: Path) -> bool:
    import subprocess

    command = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(input_path),
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "28",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(output_path),
    ]

    try:
        subprocess.run(command, check=True, timeout=120)
        return output_path.exists() and output_path.stat().st_size > 0
    except Exception:
        return False


# _save_report_analysis_annotated_video 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _save_report_analysis_annotated_video(
    source_path: Path,
    report_id: str,
    detections: list[dict],
) -> str | None:
    if not source_path.exists():
        print(f"[report-analysis-video] source file missing: {source_path}", flush=True)
        return None
    if not detections:
        print("[report-analysis-video] no detections", flush=True)
        return None

    import cv2

    REPORT_ANALYSIS_MEDIA_DIR.mkdir(parents=True, exist_ok=True)

    detections_by_frame: dict[int, list[dict]] = {}
    for detection in detections:
        frame_index = detection.get("frame_index")
        if frame_index is None:
            continue
        try:
            key = int(frame_index)
        except (TypeError, ValueError):
            continue
        detections_by_frame.setdefault(key, []).append(detection)

    if not detections_by_frame:
        print("[report-analysis-video] no detections_by_frame", flush=True)
        return None

    cap = cv2.VideoCapture(str(source_path))
    if not cap.isOpened():
        print(f"[report-analysis-video] failed to open source video: {source_path}", flush=True)
        return None

    fps = cap.get(cv2.CAP_PROP_FPS) or 15.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

    if width <= 0 or height <= 0:
        print(f"[report-analysis-video] invalid video size: width={width}, height={height}, fps={fps}", flush=True)
        cap.release()
        return None

    safe_report_id = "".join(
        char for char in str(report_id or "unknown") if char.isalnum() or char in {"_", "-"}
    )
    token = uuid.uuid4().hex[:12]
    raw_filename = f"report_{safe_report_id}_{token}_annotated_raw.mp4"
    h264_filename = f"report_{safe_report_id}_{token}_annotated.mp4"

    raw_path = REPORT_ANALYSIS_MEDIA_DIR / raw_filename
    h264_path = REPORT_ANALYSIS_MEDIA_DIR / h264_filename

    writer = cv2.VideoWriter(
        str(raw_path),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height),
    )

    if not writer.isOpened():
        print(f"[report-analysis-video] failed to open VideoWriter: raw_path={raw_path}, fps={fps}, width={width}, height={height}", flush=True)
        cap.release()
        return None

    hold_frames = int(os.getenv("REPORT_ANALYSIS_ANNOTATION_HOLD_FRAMES", "3"))
    hold_frames = max(0, hold_frames)

    frame_index = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        active_detections: list[dict] = []
        for sampled_frame_index, frame_detections in detections_by_frame.items():
            frame_age = frame_index - sampled_frame_index
            if 0 <= frame_age <= hold_frames:
                active_detections.extend(frame_detections)

        if active_detections:
            _draw_report_analysis_detections(frame, active_detections)

        writer.write(frame)
        frame_index += 1

    cap.release()
    writer.release()

    if not raw_path.exists() or raw_path.stat().st_size <= 0:
        print(f"[report-analysis-video] raw video not created: {raw_path}", flush=True)
        return None

    if _transcode_report_analysis_video_to_h264(raw_path, h264_path):
        try:
            raw_path.unlink(missing_ok=True)
        except Exception:
            pass
        return f"{AI_PUBLIC_BASE_URL}/report-analysis/{h264_filename}"

    return f"{AI_PUBLIC_BASE_URL}/report-analysis/{raw_filename}"


# FastAPI 종료 시 모든 카메라 워커를 정리합니다.
@app.on_event("shutdown")
def shutdown_camera_workers():
    camera_registry.stop_all()


# _safe_event_id 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _safe_event_id(event_id: str) -> str:
    safe_id = "".join(char for char in event_id if char.isalnum() or char in {"_", "-"})
    if not safe_id:
        raise HTTPException(status_code=400, detail="Invalid event_id.")
    return safe_id


# _effective_analysis_fps 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _effective_analysis_fps(camera_id: str, requested_analysis_fps: float) -> float:
    if not is_analyzed_camera(camera_id):
        return 0.0
    return requested_analysis_fps


# _latest_empty_bbox_metadata 내부 보조 함수로 주요 처리 흐름을 분리합니다.
def _latest_empty_bbox_metadata(camera_id: str) -> dict | None:
    worker = camera_registry.get_camera(camera_id)
    if worker is None:
        return None

    return worker.get_latest_empty_bbox_metadata()


# Flask 리포트 분석 연동을 위해 업로드 이미지/영상에서 YOLO 탐지를 수행합니다.
@app.post("/detect")
async def detect_legacy_report_file(
    file: UploadFile = File(...),
    report_id: str = Form(default=""),
    cctv_id: str = Form(default=""),
    camera_id: str = Form(default=""),
    _auth: None = Depends(require_internal_token),
):
    """Legacy Flask report-analysis compatibility endpoint.

    Flask AIGatewayService sends multipart/form-data:
    - file
    - report_id
    - cctv_id
    - camera_id

    Flask marks a report analysis job as completed when this response includes
    either "detections" or "count".
    """
    import os
    import tempfile
    import uuid
    from pathlib import Path

    import cv2
    import numpy as np

    filename = file.filename or "upload"
    suffix = Path(filename).suffix.lower()
    content_type = file.content_type or ""

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Empty file.")

    if len(payload) > REPORT_DETECT_MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Uploaded file is too large.")

    video_extensions = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
    is_video = content_type.startswith("video/") or suffix in video_extensions

    max_frames = int(os.getenv("REPORT_DETECT_MAX_FRAMES", "30"))
    frame_stride = int(os.getenv("REPORT_DETECT_FRAME_STRIDE", "30"))
    max_frames = max(1, max_frames)
    frame_stride = max(1, frame_stride)

    detections_payload = []
    best_frame = None
    best_detections = []
    frames_processed = 0
    source_type = "video" if is_video else "image"

    if is_video:
        tmp_path = Path(tempfile.gettempdir()) / f"staccato-detect-{uuid.uuid4().hex}{suffix or '.mp4'}"
        tmp_path.write_bytes(payload)

        cap = None
        try:
            cap = cv2.VideoCapture(str(tmp_path))
            if not cap.isOpened():
                raise HTTPException(status_code=400, detail="Failed to open video file.")

            frame_index = 0
            while frames_processed < max_frames:
                ok, frame = cap.read()
                if not ok:
                    break

                if frame_index % frame_stride == 0:
                    frame_detections = detector.detect(frame)
                    frame_detection_dicts = []
                    for item in frame_detections:
                        detection = item.to_dict()
                        detection["frame_index"] = frame_index
                        frame_detection_dicts.append(detection)
                        detections_payload.append(detection)

                    if len(frame_detection_dicts) > len(best_detections):
                        best_frame = frame.copy()
                        best_detections = frame_detection_dicts

                    frames_processed += 1

                frame_index += 1

        finally:
            if cap is not None:
                cap.release()

    else:
        np_buffer = np.frombuffer(payload, dtype=np.uint8)
        frame = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(status_code=400, detail="Failed to decode image file.")

        frame_detections = detector.detect(frame)
        detections_payload = [item.to_dict() for item in frame_detections]
        best_frame = frame.copy()
        best_detections = detections_payload
        frames_processed = 1

    from .report_analysis_postprocess import postprocess_report_analysis_detections

    frame_height = 0
    frame_width = 0
    if best_frame is not None:
        frame_height, frame_width = best_frame.shape[:2]

    postprocess_result = postprocess_report_analysis_detections(
        detections=detections_payload,
        frame_width=frame_width,
        frame_height=frame_height,
        camera_id=camera_id or None,
        source_type=source_type,
    )

    best_postprocess_result = postprocess_report_analysis_detections(
        detections=best_detections,
        frame_width=frame_width,
        frame_height=frame_height,
        camera_id=camera_id or None,
        source_type=source_type,
    )

    raw_detections_payload = detections_payload
    raw_count = len(raw_detections_payload)

    detections_payload = postprocess_result["display_detections"]
    best_detections = best_postprocess_result["display_detections"]

    annotated_image_url = None
    annotated_video_url = None

    if is_video:
        annotated_video_url = _save_report_analysis_annotated_video(
            source_path=Path(tmp_path),
            report_id=report_id,
            detections=detections_payload,
        )

        if not annotated_video_url:
            annotated_image_url = _save_report_analysis_annotated_image(
                report_id=report_id,
                frame=best_frame,
                detections=best_detections,
            )
    else:
        annotated_image_url = _save_report_analysis_annotated_image(
            report_id=report_id,
            frame=best_frame,
            detections=best_detections,
        )

    annotated_media_type = "video" if annotated_video_url else "image" if annotated_image_url else None

    if is_video:
        try:
            Path(tmp_path).unlink(missing_ok=True)
        except Exception:
            pass

    return {
        "success": True,
        "status": "OK",
        "report_id": report_id,
        "cctv_id": cctv_id or None,
        "camera_id": camera_id or None,
        "filename": filename,
        "source_type": source_type,
        "model": detector.model_name,
        "count": len(detections_payload),
        "raw_count": raw_count,
        "filtered_count": postprocess_result.get("filtered_count"),
        "incident_candidate_count": postprocess_result.get("incident_candidate_count"),
        "detections": detections_payload,
        "raw_detections": raw_detections_payload,
        "incident_candidates": postprocess_result.get("incident_candidates", []),
        "postprocess": {
            "enabled": postprocess_result.get("enabled"),
            "config": postprocess_result.get("config"),
        },
        "frames_processed": frames_processed,
        "annotated_image_url": annotated_image_url,
        "annotated_video_url": annotated_video_url,
        "annotated_media_type": annotated_media_type,
        "annotated_media": {
            "image_url": annotated_image_url,
            "video_url": annotated_video_url,
            "media_type": annotated_media_type,
        },
    }

