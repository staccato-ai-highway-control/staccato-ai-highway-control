# 역할: .env와 환경 변수에서 서버, 모델, 스트림, 이벤트 감지 설정을 읽어 전역 상수로 제공합니다.
from pathlib import Path
import os


REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_ROOT = Path(__file__).resolve().parents[1]
EVENT_MEDIA_DIR = Path(os.environ.get("EVENT_MEDIA_DIR", REPO_ROOT / "event_media"))
ROI_SETTINGS_PATH = Path(os.environ.get("ROI_SETTINGS_PATH", REPO_ROOT / "roi_settings.json"))


# load_env_file 기능을 수행하는 함수입니다.
def load_env_file(path: Path | str | None = None) -> None:
    env_path = Path(path) if path else ENV_ROOT / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        if key:
            os.environ.setdefault(key, value)


load_env_file()

ITS_API_KEY = os.environ.get("ITS_API_KEY", "").strip()
ITS_CCTV_API_URL = os.environ.get(
    "ITS_CCTV_API_URL",
    "https://openapi.its.go.kr:9443/cctvInfo",
).strip()
ITS_CCTV_DEFAULT_MIN_X = os.environ.get("ITS_CCTV_DEFAULT_MIN_X", "126.70").strip()
ITS_CCTV_DEFAULT_MAX_X = os.environ.get("ITS_CCTV_DEFAULT_MAX_X", "128.30").strip()
ITS_CCTV_DEFAULT_MIN_Y = os.environ.get("ITS_CCTV_DEFAULT_MIN_Y", "36.85").strip()
ITS_CCTV_DEFAULT_MAX_Y = os.environ.get("ITS_CCTV_DEFAULT_MAX_Y", "37.70").strip()
ITS_CCTV_DEFAULT_TYPE = os.environ.get("ITS_CCTV_DEFAULT_TYPE", "5").strip()
ITS_CCTV_DEFAULT_ROAD_TYPE = os.environ.get("ITS_CCTV_DEFAULT_ROAD_TYPE", "ex").strip()
ITS_CCTV_CACHE_PATH = Path(
    os.environ.get(
        "ITS_CCTV_CACHE_PATH",
        "/home/staccato/staccato/ai-vm/storage/cache/its_cctv_list.json",
    )
)
ITS_CCTV_CACHE_TTL_SECONDS = int(os.environ.get("ITS_CCTV_CACHE_TTL_SECONDS", "3600"))
ITS_CCTV_ALLOW_STALE_CACHE = (
    os.environ.get("ITS_CCTV_ALLOW_STALE_CACHE", "1").strip().lower()
    not in {"0", "false", "no", "off"}
)
ITS_CCTV_STALE_MAX_AGE_SECONDS = int(os.environ.get("ITS_CCTV_STALE_MAX_AGE_SECONDS", "86400"))
CCTV_SOURCE_REFRESH_ENABLED = (
    os.environ.get("CCTV_SOURCE_REFRESH_ENABLED", "1").strip().lower()
    not in {"0", "false", "no", "off"}
)
CCTV_SOURCE_REFRESH_INTERVAL_SECONDS = float(os.environ.get("CCTV_SOURCE_REFRESH_INTERVAL_SECONDS", "3.0"))

DEV_LOGIN_ID = os.environ.get("DEV_LOGIN_ID", "admin").strip()
DEV_PASSWORD = os.environ.get("DEV_PASSWORD", "").strip()
DEV_ACCESS_TOKEN = os.environ.get("DEV_ACCESS_TOKEN", "").strip()

CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3002,http://127.0.0.1:3002,http://localhost:3005,http://127.0.0.1:3005,http://192.168.0.52:3005",
    ).split(",")
    if origin.strip()
]

ANALYZED_CAMERA_IDS = {
    item.strip()
    for item in os.environ.get("ANALYZED_CAMERA_IDS", "camera-1,camera-2").split(",")
    if item.strip()
}

YOLO_MODEL_PATHS = [
    item.strip()
    for item in os.environ.get(
        "YOLO_MODEL_PATHS",
        "/home/staccato/staccato/ai-vm/models/yolo11s/best.pt,/home/staccato/staccato/ai-vm/models/yolo11n/best.pt,/home/staccato/staccato/ai-vm/models/yolo8n/best.pt",
    ).split(",")
    if item.strip()
]
YOLO_CONFIDENCE = float(os.environ.get("YOLO_CONFIDENCE", "0.10"))
YOLO_IOU = float(os.environ.get("YOLO_IOU", "0.45"))
YOLO_IMGSZ = int(os.environ.get("YOLO_IMGSZ", "1280"))
YOLO_DEVICE = os.environ.get("YOLO_DEVICE", "").strip() or None
YOLO_TARGET_CLASSES = {
    item.strip().lower()
    for item in os.environ.get(
        "YOLO_TARGET_CLASSES",
        "car,bus,truck",
    ).split(",")
    if item.strip()
}
YOLO_FAR_TOP_RATIO = float(os.environ.get("YOLO_FAR_TOP_RATIO", "0.45"))
YOLO_FAR_RESIZE_SCALE = float(os.environ.get("YOLO_FAR_RESIZE_SCALE", "1.5"))
YOLO_FAR_CONFIDENCE = float(os.environ.get("YOLO_FAR_CONFIDENCE", "0.07"))
YOLO_FAR_IOU = float(os.environ.get("YOLO_FAR_IOU", "0.35"))
YOLO_FAR_DETECT_INTERVAL = int(os.environ.get("YOLO_FAR_DETECT_INTERVAL", "2"))

# 신고/업로드 영상에서 가까운 전경 차량을 한 번 더 탐지하는 설정입니다.
# 전체 화면 탐지에서 놓치는 갓길의 큰 차량을 보강합니다.
YOLO_REPORT_FOREGROUND_TOP_RATIO = float(
    os.environ.get("YOLO_REPORT_FOREGROUND_TOP_RATIO", "0.28")
)
YOLO_REPORT_FOREGROUND_BOTTOM_RATIO = float(
    os.environ.get("YOLO_REPORT_FOREGROUND_BOTTOM_RATIO", "0.75")
)
YOLO_REPORT_FOREGROUND_CONFIDENCE = float(
    os.environ.get("YOLO_REPORT_FOREGROUND_CONFIDENCE", "0.25")
)
YOLO_REPORT_FOREGROUND_IOU = float(
    os.environ.get("YOLO_REPORT_FOREGROUND_IOU", "0.45")
)
YOLO_REPORT_FOREGROUND_MAX_DET = int(
    os.environ.get("YOLO_REPORT_FOREGROUND_MAX_DET", "40")
)
YOLO_REPORT_FOREGROUND_NMS_IOU = float(
    os.environ.get("YOLO_REPORT_FOREGROUND_NMS_IOU", "0.55")
)
YOLO_FAR_MAX_DET = int(os.environ.get("YOLO_FAR_MAX_DET", "300"))
YOLO_FAR_MIN_BOX_WIDTH = int(os.environ.get("YOLO_FAR_MIN_BOX_WIDTH", "3"))
YOLO_FAR_MIN_BOX_HEIGHT = int(os.environ.get("YOLO_FAR_MIN_BOX_HEIGHT", "3"))
YOLO_FAR_MAX_BOX_WIDTH = int(os.environ.get("YOLO_FAR_MAX_BOX_WIDTH", "300"))
YOLO_FAR_MAX_BOX_HEIGHT = int(os.environ.get("YOLO_FAR_MAX_BOX_HEIGHT", "220"))

AI_VM_PUBLIC_BASE_URL = os.environ.get("AI_VM_PUBLIC_BASE_URL", "http://127.0.0.1:5001").strip()
FLASK_RELAY_EVENTS_URL = os.environ.get(
    "FLASK_RELAY_EVENTS_URL",
    "http://192.168.0.187:5000/api/events",
).strip()
FLASK_RELAY_TIMEOUT_SECONDS = float(os.environ.get("FLASK_RELAY_TIMEOUT_SECONDS", "1.5"))
INTERNAL_API_TOKEN = os.environ.get("INTERNAL_API_TOKEN", "").strip()
REPORT_DETECT_MAX_UPLOAD_BYTES = int(os.environ.get("REPORT_DETECT_MAX_UPLOAD_BYTES", str(100 * 1024 * 1024)))

# require_non_empty_secret 기능을 수행하는 함수입니다.
def require_non_empty_secret(name: str, value: str) -> None:
    if not value:
        raise RuntimeError(f"{name} is required. Set it in ai-vm/.env or environment variables.")


require_non_empty_secret("DEV_PASSWORD", DEV_PASSWORD)
require_non_empty_secret("DEV_ACCESS_TOKEN", DEV_ACCESS_TOKEN)
require_non_empty_secret("INTERNAL_API_TOKEN", INTERNAL_API_TOKEN)

EVENT_CLIP_PRE_SECONDS = float(os.environ.get("EVENT_CLIP_PRE_SECONDS", "5.0"))
EVENT_CLIP_POST_SECONDS = float(os.environ.get("EVENT_CLIP_POST_SECONDS", "5.0"))
MANUAL_EVENT_CLIP_PRE_SECONDS = float(os.environ.get("MANUAL_EVENT_CLIP_PRE_SECONDS", "5.0"))
MANUAL_EVENT_CLIP_POST_SECONDS = float(os.environ.get("MANUAL_EVENT_CLIP_POST_SECONDS", "5.0"))
EVENT_CLIP_FPS = float(os.environ.get("EVENT_CLIP_FPS", "10.0"))
EVENT_CLIP_WRITE_QUEUE_SIZE = int(os.environ.get("EVENT_CLIP_WRITE_QUEUE_SIZE", "16"))
EVENT_SNAPSHOT_QUALITY = int(os.environ.get("EVENT_SNAPSHOT_QUALITY", "90"))
EVENT_CLIP_DETECTION_HOLD_SECONDS = float(
    os.environ.get("EVENT_CLIP_DETECTION_HOLD_SECONDS", "0.6")
)
EVENT_CLIP_INTERPOLATION_MAX_GAP_SECONDS = float(
    os.environ.get("EVENT_CLIP_INTERPOLATION_MAX_GAP_SECONDS", "0.6")
)

RING_BUFFER_MAX_WIDTH = int(os.environ.get("RING_BUFFER_MAX_WIDTH", "960"))
RING_BUFFER_MAX_HEIGHT = int(os.environ.get("RING_BUFFER_MAX_HEIGHT", "540"))
RING_BUFFER_MAX_FRAMES = int(os.environ.get("RING_BUFFER_MAX_FRAMES", "150"))

MJPEG_STREAM_FPS = float(os.environ.get("MJPEG_STREAM_FPS", "10.0"))
MJPEG_MAX_TOTAL_CLIENTS = int(os.environ.get("MJPEG_MAX_TOTAL_CLIENTS", "24"))
MJPEG_MAX_CLIENTS_PER_CAMERA = int(os.environ.get("MJPEG_MAX_CLIENTS_PER_CAMERA", "3"))

BBOX_STREAM_FPS = float(os.environ.get("BBOX_STREAM_FPS", "5.0"))
BBOX_WS_INTERVAL_SECONDS = 1.0 / max(BBOX_STREAM_FPS, 0.1)
BBOX_HISTORY_MAX_ITEMS = int(os.environ.get("BBOX_HISTORY_MAX_ITEMS", "150"))

EVENT_VEHICLE_CLASSES = {
    item.strip().lower()
    for item in os.environ.get(
        "EVENT_VEHICLE_CLASSES",
        "car,bus,truck",
    ).split(",")
    if item.strip()
}
EVENT_MIN_CONFIDENCE = float(os.environ.get("EVENT_MIN_CONFIDENCE", "0.45"))
EVENT_HISTORY_LENGTH = int(os.environ.get("EVENT_HISTORY_LENGTH", "10"))
EVENT_DANGER_LOW_RATIO = float(os.environ.get("EVENT_DANGER_LOW_RATIO", "0.3"))
EVENT_DANGER_SECONDS = float(os.environ.get("EVENT_DANGER_SECONDS", "2.0"))
EVENT_STOPPED_MOVE_PX = float(os.environ.get("EVENT_STOPPED_MOVE_PX", "2.5"))
EVENT_STOPPED_MIN_CONFIDENCE = float(os.environ.get("EVENT_STOPPED_MIN_CONFIDENCE", "0.60"))
EVENT_STOPPED_MIN_BBOX_WIDTH = float(os.environ.get("EVENT_STOPPED_MIN_BBOX_WIDTH", "20.0"))
EVENT_STOPPED_MIN_BBOX_HEIGHT = float(os.environ.get("EVENT_STOPPED_MIN_BBOX_HEIGHT", "20.0"))
EVENT_STOPPED_MIN_BBOX_AREA = float(os.environ.get("EVENT_STOPPED_MIN_BBOX_AREA", "500.0"))
EVENT_COOLDOWN_SECONDS = float(os.environ.get("EVENT_COOLDOWN_SECONDS", "60.0"))
EVENT_TRACK_MATCH_DISTANCE = float(os.environ.get("EVENT_TRACK_MATCH_DISTANCE", "90.0"))
EVENT_TRACK_STALE_FRAMES = int(os.environ.get("EVENT_TRACK_STALE_FRAMES", "30"))

# 신고/업로드 영상 정차 탐지 전용 설정
# 실시간 CCTV EVENT_* 정책과 분리한다.
REPORT_STOP_MIN_CONFIDENCE = float(
    os.environ.get("REPORT_STOP_MIN_CONFIDENCE", str(EVENT_MIN_CONFIDENCE))
)
REPORT_STOPPED_MIN_CONFIDENCE = float(
    os.environ.get(
        "REPORT_STOPPED_MIN_CONFIDENCE",
        str(EVENT_STOPPED_MIN_CONFIDENCE),
    )
)
REPORT_STOPPED_MOVE_PX = float(
    os.environ.get("REPORT_STOPPED_MOVE_PX", str(EVENT_STOPPED_MOVE_PX))
)
REPORT_STOP_DANGER_SECONDS = float(
    os.environ.get("REPORT_STOP_DANGER_SECONDS", "2.0")
)
ROI_BASE_WIDTH = int(os.environ.get("ROI_BASE_WIDTH", "1920"))
ROI_BASE_HEIGHT = int(os.environ.get("ROI_BASE_HEIGHT", "1080"))

DEFAULT_ROIS = {
    "LEFT_SHOULDER": [
        [35, 884],
        [1292, 292],
        [1299, 286],
        [40, 907],
    ],
    "MEDIAN": [
        [630, 985],
        [1347, 245],
        [1354, 225],
        [719, 1000],
    ],
    "RIGHT_SHOULDER": [
        [1558, 986],
        [1381, 223],
        [1398, 222],
        [1661, 996],
    ],
}
