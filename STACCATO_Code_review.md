# STACCATO 핵심 코드 리뷰 문서

## 1. 문서 목적

본 문서는 STACCATO 프로젝트의 핵심 구현 코드를 기준으로 시스템 구조, 주요 처리 흐름, 코드 역할, 개선 필요 지점을 정리한 코드리뷰 문서이다.

검토 대상은 다음 영역이다.

| 영역 | 검토 범위 |
|---|---|
| AI VM | YOLO 탐지, CCTV 프레임 처리, ROI 판단, 정차 이벤트 생성, 이벤트 중복 방지 |
| Flask VM | 인증/권한, 파일 업로드, AI 분석 작업 큐, AI 이벤트 수신, 사고 저장, 실시간 이벤트 기록 |
| Frontend VM | CCTV 목록 조회, 스트림 프록시, BBOX metadata 검증, overlay 렌더링 |

---

## 2. 전체 코드 흐름

STACCATO의 핵심 실행 흐름은 다음과 같다.

```txt
사용자 브라우저
→ Frontend VM
→ Flask VM
→ AI VM
→ Flask VM
→ DB 저장
→ 실시간 이벤트 기록
→ Frontend 화면 표시
```

역할 분리는 다음과 같다.

| 서버 | 주요 책임 |
|---|---|
| Frontend VM | 관제 화면, CCTV 스트림 표시, BBOX overlay 표시 |
| Flask VM | API Gateway, 인증/권한, DB 저장, AI 이벤트 수신, 실시간 이벤트 기록 |
| AI VM | YOLO 탐지, ROI 기반 정차 판단, 이벤트 payload 생성 |
| DB VM | 사용자, 사고, 탐지 로그, 알림, 파일 metadata 저장 |

핵심 설계 원칙은 다음과 같다.

```txt
AI VM은 DB에 직접 접근하지 않는다.
AI VM은 분석 결과와 이벤트 payload만 Flask VM으로 전달한다.
Flask VM은 사고 저장, 탐지 근거 저장, 실시간 이벤트 기록을 담당한다.
Frontend VM은 사용자가 결과를 확인할 수 있는 UI를 제공한다.
```

---

## 3. AI VM 코드 리뷰

### 3-1. YOLO 탐지 결과 표준화

**파일:** `ai-vm/app/detector.py`

```python
@dataclass(frozen=True)
class Detection:
    # YOLO가 반환한 bbox 좌표
    # 프로젝트에서는 기본적으로 xyxy 형식을 사용한다.
    bbox: list[float]

    # YOLO class id
    class_id: int

    # car, truck, bus 등 탐지 클래스명
    class_name: str

    # 탐지 신뢰도
    confidence: float

    # 추적 ID
    # 모델 또는 추적 로직에서 ID를 제공하지 못하면 None이 될 수 있다.
    track_id: int | None = None

    # 탐지 출처
    # full_frame: 전체 프레임 탐지
    # far_crop: 원거리 crop 보완 탐지
    source: str = "full_frame"

    def to_dict(self) -> dict[str, Any]:
        # Flask 또는 Frontend로 전달 가능한 JSON 구조로 변환한다.
        return {
            "bbox": self.bbox,

            # bbox 좌표 형식을 명시한다.
            # 프론트엔드 overlay 계산에 필수 metadata이다.
            "bbox_format": "xyxy",

            "class_id": self.class_id,
            "class_name": self.class_name,
            "confidence": self.confidence,
            "track_id": self.track_id,
            "source": self.source,
        }
```

#### 리뷰 내용

YOLO 모델의 원본 결과를 그대로 사용하지 않고, `Detection` dataclass로 표준화한다.  
이 구조를 통해 AI 내부 로직, Flask relay, Frontend BBOX overlay가 동일한 데이터 형식을 사용할 수 있다.

특히 `bbox_format: "xyxy"`를 명시하는 점이 중요하다.  
프론트엔드는 bbox가 `xyxy`인지 `xywh`인지에 따라 좌표 변환 방식이 달라지므로, 응답 metadata에 좌표 형식이 반드시 포함되어야 한다.

---

### 3-2. YOLO 모델 lazy loading

**파일:** `ai-vm/app/detector.py`

```python
def _ensure_model_loaded(self) -> Any:
    # 이미 모델이 로드되어 있으면 재사용한다.
    if self._model is not None:
        return self._model

    # 여러 worker/thread에서 동시에 모델을 로드하지 않도록 lock을 사용한다.
    with self._lock:
        if self._model is not None:
            return self._model

        from ultralytics import YOLO

        errors: list[str] = []

        # 설정된 후보 모델 경로를 순서대로 시도한다.
        for model_path in self.model_paths:
            try:
                self._model = YOLO(model_path)
                self._model_name = model_path
                self._load_error = None
                return self._model
            except Exception as exc:
                # 모델 로드 실패 시 다음 후보 경로를 시도한다.
                errors.append(f"{model_path}: {exc}")

        # 모든 모델 경로 로드가 실패한 경우 명확한 오류를 남긴다.
        self._load_error = "Failed to load YOLO model. " + " | ".join(errors)
        raise RuntimeError(self._load_error)
```

#### 리뷰 내용

YOLO 모델은 서버 시작 시 무조건 로드하지 않고, 실제 탐지 요청이 들어왔을 때 로드한다.  
이 방식은 초기 구동 시간을 줄이고, 모델 로드 실패 원인을 명확히 기록할 수 있다.

lock을 사용하기 때문에 동시에 여러 요청이 들어오더라도 모델 중복 로드를 방지할 수 있다.

---

### 3-3. 원거리 차량 탐지 보완

**파일:** `ai-vm/app/detector.py`

```python
# 전체 프레임 탐지 후, 설정된 주기마다 원거리 crop 탐지를 추가 수행한다.
if self._should_run_far_crop(frame_id):
    detections.extend(
        self._detect_far_crop(
            model=model,
            frame=frame,
            imgsz=imgsz,
        )
    )
```

```python
def _detect_far_crop(self, *, model: Any, frame: np.ndarray, imgsz: int) -> list[Detection]:
    # CCTV 영상의 상단부는 원거리 차량이 위치하는 경우가 많다.
    height, width = frame.shape[:2]
    crop_bottom = int(height * YOLO_FAR_TOP_RATIO)

    # 프레임 상단 영역만 잘라 원거리 차량 탐지 보완에 사용한다.
    far_crop = frame[:crop_bottom, :width]

    if YOLO_FAR_RESIZE_SCALE != 1.0:
        import cv2

        # 작은 차량 객체를 확대하기 위해 crop 영역을 resize한다.
        far_resized = cv2.resize(
            far_crop,
            None,
            fx=YOLO_FAR_RESIZE_SCALE,
            fy=YOLO_FAR_RESIZE_SCALE,
            interpolation=cv2.INTER_CUBIC,
        )
    else:
        far_resized = far_crop

    # crop된 원거리 영역에 대해 별도 YOLO 탐지를 수행한다.
    results = model.predict(
        source=far_resized,
        conf=YOLO_FAR_CONFIDENCE,
        iou=YOLO_FAR_IOU,
        imgsz=imgsz,
        agnostic_nms=True,
        max_det=YOLO_FAR_MAX_DET,
        verbose=False,
        **self._device_kwargs(),
    )
```

#### 리뷰 내용

CCTV 영상은 원근감 때문에 멀리 있는 차량이 작게 보인다.  
전체 프레임만 탐지하면 작은 차량의 confidence가 낮아질 수 있으므로, 상단 원거리 영역을 crop 후 확대해 추가 탐지를 수행한다.

성능 부담을 줄이기 위해 매 프레임이 아니라 설정된 interval 기준으로 실행한다.

---

### 3-4. 실시간 추론 처리 흐름

**파일:** `ai-vm/app/inference_worker.py`

```python
# 1. YOLO 기반 원본 탐지 결과 생성
raw_detections = detector.detect(
    item.frame,
    confidence=self.confidence,
    imgsz=self.imgsz,
    frame_id=item.frame_id,
)

# 2. 프론트 화면 표시용 bbox 필터링
#    화면 노이즈, 고정 자막 영역, 불필요한 detection을 줄이는 목적이다.
display_detections = filter_realtime_display_detections(
    camera_id=item.camera_id,
    detections=raw_detections,
    frame_shape=item.frame.shape,
)

# 3. 사고 이벤트 판단
#    표시용 detection이 아니라 raw detection 기준으로 판단한다.
events = self.event_detector.update(
    frame_id=item.frame_id,
    timestamp=item.timestamp,
    detections=raw_detections,
    frame_shape=item.frame.shape,
)
```

```python
result = InferenceResult(
    camera_id=item.camera_id,
    frame_id=item.frame_id,
    timestamp=item.timestamp,

    # 프론트 overlay 좌표 변환에 필요한 원본 프레임 크기
    frame_width=int(frame_width),
    frame_height=int(frame_height),

    # bbox 좌표 형식 명시
    bbox_format="xyxy",

    model=detector.model_name,

    # 화면 표시용 detection
    detections=display_detections,

    # 정차 판단 결과 이벤트
    events=events,

    # 추론 소요 시간
    inference_ms=inference_ms,
)
```

#### 리뷰 내용

실시간 추론 흐름은 `raw_detections`, `display_detections`, `events`로 역할이 분리되어 있다.

| 변수 | 역할 |
|---|---|
| `raw_detections` | YOLO 원본 탐지 결과 |
| `display_detections` | 프론트 표시용 필터링 결과 |
| `events` | 사고 판단 결과 |

표시용 BBOX 필터링과 사고 판단 로직이 분리되어 있으므로, UI 표시 최적화가 사고 판단 근거를 훼손하지 않는다.

---

### 3-5. BBOX metadata 저장

**파일:** `ai-vm/app/inference_worker.py`

```python
set_latest_bbox_metadata(
    self.camera_id,
    build_bbox_metadata(
        camera_id=self.camera_id,
        frame_id=item.frame_id,
        timestamp=item.timestamp,
        frame_shape=item.frame.shape,

        # 프론트에서 바로 사용할 수 있는 dict 구조로 변환한다.
        detections=[item.to_dict() for item in display_detections],
    ),
)
```

#### 리뷰 내용

최신 bbox metadata는 camera id 기준으로 저장된다.  
Frontend는 이 metadata를 polling하여 CCTV 화면 위에 bbox overlay를 그린다.

metadata에는 다음 값이 포함되어야 한다.

```txt
camera_id
frame_id
timestamp
frame_width
frame_height
bbox_format
detections
```

`frame_width`, `frame_height`, `bbox_format`은 프론트에서 bbox 좌표를 화면 크기에 맞게 변환하는 데 필요하다.

---

### 3-6. ROI 판단 기준: bbox 하단 중심점

**파일:** `ai-vm/app/event_detector.py`

```python
@staticmethod
def _bottom_center(bbox: list[float]) -> tuple[float, float]:
    # bbox는 xyxy 형식이다.
    x1, _y1, x2, y2 = bbox

    # 차량이 도로에 닿는 지점에 가까운 하단 중심점을 사용한다.
    return ((x1 + x2) / 2.0, y2)
```

```python
def _roi_ids_for_point(
    self,
    center: tuple[float, float],
    frame_shape: tuple[int, ...],
) -> list[str]:
    height, width = frame_shape[:2]

    # ROI는 기준 해상도 기준으로 저장되어 있으므로
    # 실제 프레임 크기에 맞춰 scale을 적용한다.
    x_scale = width / ROI_BASE_WIDTH
    y_scale = height / ROI_BASE_HEIGHT

    point = (float(center[0]), float(center[1]))
    roi_ids: list[str] = []

    for roi_id, points in get_camera_rois(self.camera_id).items():
        scaled_points = np.array(
            [
                [int(x * x_scale), int(y * y_scale)]
                for x, y in points
            ],
            dtype=np.int32,
        )

        # pointPolygonTest 결과가 0 이상이면 polygon 내부 또는 경계에 있는 점이다.
        if cv2.pointPolygonTest(scaled_points, point, False) >= 0:
            roi_ids.append(roi_id)

    return roi_ids
```

#### 리뷰 내용

차량의 실제 위치 판단에는 bbox 중앙점보다 하단 중심점이 더 적합하다.  
bbox 중앙은 차량 몸체 중심이므로 차선 영역 밖으로 보일 수 있지만, 하단 중심점은 차량이 도로에 닿는 위치에 가깝다.

ROI polygon은 기준 해상도 기준으로 저장되어 있으므로, 실제 프레임 해상도에 맞춰 scale을 적용한 뒤 포함 여부를 판단한다.

---

### 3-7. 정차 이벤트 판단

**파일:** `ai-vm/app/event_detector.py`

```python
# track_id별 중심점 이동 이력을 저장한다.
history = self._track_history[item.track_id]
history.append(item.center)

# 최근 중심점 이동량 평균을 계산한다.
move = self._average_move(history)

# 현재 프레임 내 전체 차량 이동량의 median을 사용해 흐름 속도를 추정한다.
flow_speed = float(np.median(all_moves)) if all_moves else 0.0
```

```python
# 주변 차량 흐름 대비 매우 느린 경우
is_relative_slow = flow_speed > 0 and move < flow_speed * EVENT_DANGER_LOW_RATIO

# 절대 이동량 기준으로 거의 움직이지 않는 경우
is_absolute_stop = len(self._track_history[item.track_id]) >= 2 and move <= EVENT_STOPPED_MOVE_PX

# 둘 중 하나라도 만족하면 정차 후보로 본다.
is_slow = is_relative_slow or is_absolute_stop
```

```python
if is_slow:
    # 느린 상태가 시작된 시각을 최초 1회 기록한다.
    self._slow_started_at.setdefault(item.track_id, timestamp)
else:
    # 다시 움직이면 정차 후보 상태를 해제한다.
    self._slow_started_at.pop(item.track_id, None)

slow_started_at = self._slow_started_at.get(item.track_id)

danger_time = (
    (timestamp - slow_started_at).total_seconds()
    if slow_started_at is not None
    else 0.0
)

# 정차 후보 상태가 기준 시간보다 짧으면 이벤트를 만들지 않는다.
if danger_time < EVENT_DANGER_SECONDS:
    continue
```

#### 리뷰 내용

정차 판단은 단순히 차량 bbox가 존재하는지 여부로 결정하지 않는다.  
차량별 track history를 저장하고, 프레임 간 이동량과 주변 차량 흐름을 함께 본다.

정차 이벤트 생성 조건은 다음과 같다.

1. 차량이 ROI 내부에 있음
2. 차량 이동량이 절대 기준 이하이거나 주변 흐름 대비 낮음
3. 해당 상태가 기준 시간 이상 지속됨
4. cooldown 조건을 통과함

이 구조는 순간적인 detection 흔들림이나 일시적인 속도 저하로 인한 오탐을 줄이기 위한 방식이다.

---

### 3-8. 이벤트 중복 방지

**파일:** `ai-vm/app/event_detector.py`

```python
def _can_emit(
    self,
    track_id: int,
    event_type: str,
    roi_id: str | None,
    timestamp: datetime,
) -> bool:
    # 같은 카메라/이벤트/ROI 기준 중복 방지
    camera_key = ("camera", self.camera_id, event_type, roi_id)

    # 같은 차량 track 기준 중복 방지
    track_key = ("track", track_id, event_type, roi_id)

    for key in (camera_key, track_key):
        last_event_at = self._last_event_at.get(key)
        if last_event_at is not None:
            elapsed = (timestamp - last_event_at).total_seconds()

            # cooldown 시간 안에 같은 이벤트가 다시 발생하면 무시한다.
            if elapsed < EVENT_COOLDOWN_SECONDS:
                return False

    # 이벤트 발생 시점을 기록한다.
    self._last_event_at[camera_key] = timestamp
    self._last_event_at[track_key] = timestamp
    return True
```

#### 리뷰 내용

정차 차량이 계속 화면에 남아 있으면 동일 이벤트가 반복 발생할 수 있다.  
이를 막기 위해 track 단위와 camera 단위 cooldown을 함께 적용한다.

| key | 목적 |
|---|---|
| `track_key` | 같은 차량의 반복 이벤트 방지 |
| `camera_key` | track id가 바뀌더라도 같은 카메라/ROI에서 이벤트 폭주 방지 |

---

### 3-9. CCTV 스트림 처리와 분석 queue

**파일:** `ai-vm/app/camera_worker.py`

```python
self.ring_buffer = RingBuffer(
    # 이벤트 전후 clip 생성을 위해 최근 프레임을 보관한다.
    max_seconds=buffer_seconds,
    fps=target_fps,
    max_width=RING_BUFFER_MAX_WIDTH,
    max_height=RING_BUFFER_MAX_HEIGHT,
    max_frames=RING_BUFFER_MAX_FRAMES,
)

self.analysis_queue = AnalysisQueue(
    # AI 분석 대상 프레임을 저장하는 queue
    maxsize=analysis_queue_size,
)
```

```python
success, frame = capture.read()

if not success or frame is None:
    if session_frames_read > 0:
        # 스트림 segment가 끝난 경우 source_url을 갱신하기 위해 재연결 상태로 전환한다.
        self.error_message = "Stream segment ended; refreshing source_url."
        self._set_status(CameraStatus.RECONNECTING)
        break
```

```python
def _maybe_push_analysis_frame(self, frame: np.ndarray, timestamp: datetime) -> None:
    if self.analysis_interval <= 0:
        return

    now_monotonic = time.monotonic()

    # 모든 프레임을 AI 분석하지 않고 analysis_interval 기준으로 샘플링한다.
    if now_monotonic - self.last_analysis_push_monotonic < self.analysis_interval:
        return

    self.last_analysis_push_monotonic = now_monotonic

    self.analysis_queue.push(
        AnalysisFrame(
            camera_id=self.camera_id,
            frame_id=self.frames_read,
            timestamp=timestamp,

            # 원본 frame이 이후 변경될 수 있으므로 copy해서 queue에 넣는다.
            frame=frame.copy(),
        )
    )
```

#### 리뷰 내용

CCTV 스트림 처리와 AI 분석 FPS를 분리했다.  
모든 영상 프레임을 AI 모델에 넣으면 부하가 크기 때문에, `analysis_interval` 기준으로 일부 프레임만 분석 queue에 넣는다.

ring buffer는 이벤트 전후 clip 저장에 활용된다.

---

## 4. Flask VM 코드 리뷰

### 4-1. AI 이벤트 수신 API

**파일:** `flask-vm/app/modules/ai_relay/routes.py`

```python
@ai_relay_bp.post("/events")
def create_event():
    # AI VM에서 온 내부 요청인지 token으로 검증한다.
    auth_error = require_internal_api_token()
    if auth_error:
        return auth_error

    # JSON payload가 없으면 잘못된 요청으로 처리한다.
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"ok": False, "success": False, "error": "JSON body is required"}), 400

    try:
        # AI 원본 이벤트 저장
        # commit=False로 두어 사고 생성과 하나의 transaction으로 묶는다.
        event, status = store_event(payload, commit=False)

        # AI 이벤트 payload를 incident 생성 payload로 변환 후 사고 생성
        incident_result = IncidentEventService.create_from_its_event(
            build_incident_event_payload(payload),
            commit=False,
            emit_socket=False,
        )

        # 원본 이벤트 저장 + 사고 저장 + 탐지 로그 저장 + 실시간 이벤트 기록을 한 번에 commit한다.
        db.session.commit()
```

```python
if incident_result.get("status") == "created":
    # DB commit 이후 socket emit을 수행한다.
    # DB 저장 실패와 socket 발송 실패가 섞이지 않도록 분리한다.
    incident_result["socket_emitted"] = (
        IncidentEventService.emit_realtime_event_by_id(
            incident_result.get("realtime_event_id")
        )
    )
```

#### 리뷰 내용

AI VM 이벤트 수신 API는 다음 순서로 동작한다.

1. 내부 API token 검증
2. JSON payload 검증
3. 원본 AI 이벤트 저장
4. 사고 이벤트 생성
5. detection log 저장
6. realtime event 기록
7. DB commit
8. Socket.IO emit

DB commit 이후 socket emit을 수행하는 점이 중요하다.  
이벤트 발송 실패가 DB 저장 transaction에 영향을 주지 않도록 분리되어 있다.

---

### 4-2. 내부 API token 검증

**파일:** `flask-vm/app/modules/internal_auth.py`

```python
# 내부 서버 통신용 header 이름
INTERNAL_TOKEN_HEADER = "X-Internal-API-Token"


def require_internal_api_token():
    # 서버 환경변수 또는 Flask config에서 내부 token을 가져온다.
    expected_token = str(current_app.config.get("INTERNAL_API_TOKEN") or "").strip()

    if not expected_token:
        # token이 설정되지 않은 경우 서버 설정 오류로 처리한다.
        return (
            jsonify(
                {
                    "ok": False,
                    "success": False,
                    "error": "INTERNAL_API_TOKEN is not configured.",
                }
            ),
            503,
        )

    # 요청 header에서 내부 token을 가져온다.
    provided_token = str(request.headers.get(INTERNAL_TOKEN_HEADER) or "").strip()

    # hmac.compare_digest를 사용해 timing attack 가능성을 줄인다.
    if not provided_token or not hmac.compare_digest(provided_token, expected_token):
        return (
            jsonify(
                {
                    "ok": False,
                    "success": False,
                    "error": "Invalid internal API token.",
                }
            ),
            401,
        )

    # None이면 인증 통과
    return None
```

#### 리뷰 내용

내부 API는 사용자 JWT가 아니라 내부 서버 간 token으로 보호한다.  
AI VM이 Flask VM으로 이벤트를 보낼 때 `X-Internal-API-Token` header를 사용한다.

보완 시에는 token 검증과 함께 방화벽에서 AI VM 또는 Flask VM의 IP 접근만 허용하는 방식이 적합하다.

---

### 4-3. AI VM relay client

**파일:** `ai-vm/app/relay_client.py`

```python
def _headers(self) -> dict[str, str] | None:
    # 내부 token이 설정되어 있지 않으면 header를 만들지 않는다.
    if not INTERNAL_API_TOKEN:
        return None

    # Flask VM 내부 API 인증용 header
    return {"X-Internal-API-Token": INTERNAL_API_TOKEN}
```

#### 리뷰 내용

AI VM에서 Flask VM으로 이벤트를 보낼 때 내부 token header를 붙인다.  
Flask VM의 `require_internal_api_token()`과 짝을 이루는 구조이다.

---

### 4-4. 사고 저장 및 탐지 로그 저장

**파일:** `flask-vm/app/modules/incident_event/service.py`

```python
incident = Incident(
    # 사고 고유 코드
    incident_code=incident_code,

    # 실시간 AI 이벤트는 업로드 report와 직접 연결되지 않을 수 있으므로 None 허용
    report_id=None,

    # CCTV ID 변환 결과
    cctv_id=_safe_cctv_id(payload),

    # AI 이벤트 타입
    incident_type=event_type.upper(),

    # 최초 상태는 DETECTED
    incident_status="DETECTED",

    # 위험도와 confidence 저장
    risk_level=risk_level,
    confidence=confidence,

    # 정차 지속 시간
    stopped_duration_seconds=_optional_int(
        payload.get("stopped_duration_seconds"),
        "stopped_duration_seconds",
    ),

    location_name=_optional_text(payload, "location_name"),
    detected_at=occurred_at,
    created_at=now,
)

# incidents 테이블에 사고 이벤트 저장
db.session.add(incident)

# detection_logs에서 incident.id를 FK로 사용해야 하므로 flush로 id를 먼저 확보한다.
db.session.flush()
```

```python
detection_log = DetectionLog(
    # 어떤 사고의 탐지 근거인지 연결
    incident_id=incident.id,

    # 모델 정보
    model_name=payload.get("model_name") or "YOLOV11",
    model_version=payload.get("model_version"),

    # 탐지 클래스와 confidence
    detected_class=payload.get("vehicle_class"),
    confidence=confidence,

    # bbox와 ROI 판단 근거
    bbox_json=bbox,
    roi_type=str(payload.get("roi_type") or "UNKNOWN").strip().upper(),

    # 이동량과 정차 시간
    movement_delta_px=_optional_decimal(
        payload.get("movement_delta_px"),
        "movement_delta_px",
    ),
    stopped_duration_seconds=incident.stopped_duration_seconds,

    # 원본 AI 결과를 JSON으로 보존한다.
    raw_result_json=payload,

    detected_at=occurred_at,
    created_at=now,
)

db.session.add(detection_log)
db.session.flush()
```

#### 리뷰 내용

사고 결과와 탐지 근거를 분리 저장한다.

| 테이블 | 저장 목적 |
|---|---|
| `incidents` | 사고 업무 상태 관리 |
| `detection_logs` | AI 판단 근거 저장 |
| `incident_snapshots` | 사고 화면 이미지 저장 |
| `realtime_events` | 실시간 발송 기록 저장 |

`detection_logs.raw_result_json`에 원본 payload를 저장하기 때문에 추후 오탐 분석, 디버깅, 모델 개선에 활용할 수 있다.

---

### 4-5. 실시간 이벤트 기록

**파일:** `flask-vm/app/modules/incident_event/service.py`

```python
realtime_event = RealtimeEvent(
    # 이벤트 도메인
    event_type="INCIDENT",

    # Socket.IO 이벤트 이름
    event_name="incident.created",

    # 대상 역할 또는 room
    target_role="CONTROL_CENTER",

    # 어떤 리소스에 대한 이벤트인지 기록
    target_resource_type="incident",
    target_resource_id=incident.id,
    incident_id=incident.id,

    # 프론트로 보낼 payload
    payload=socket_payload,

    # 최초 생성 시에는 발송 대기 상태
    send_status="PENDING",
    created_at=now,
)

db.session.add(realtime_event)
```

#### 리뷰 내용

Socket.IO로 바로 발송만 하고 끝내지 않고, 발송할 이벤트를 DB에 기록한다.  
이 구조는 다음 장점이 있다.

- 이벤트 발송 이력 확인 가능
- 장애 발생 시 재처리 가능
- 프론트 알림과 DB 상태를 맞추기 쉬움

---

### 4-6. 파일 업로드 보안 처리

**파일:** `flask-vm/app/modules/report_upload/service.py`

```python
def _clean_original_filename(filename):
    # Windows 경로 구분자도 /로 통일한다.
    raw = str(filename or "").replace("\\", "/")

    # 경로가 포함되어 들어와도 마지막 파일명만 추출한다.
    name = PurePath(raw).name.strip()

    if not name:
        raise ValueError("유효하지 않은 파일명입니다.")

    return name
```

```python
def _stored_filename(original_filename):
    # 원본 확장자를 유지한다.
    ext = os.path.splitext(original_filename)[1].lower()

    if not ext:
        safe_name = secure_filename(original_filename)
        ext = os.path.splitext(safe_name)[1].lower()

    # 확장자가 없으면 기본 bin 확장자 사용
    if not ext:
        ext = ".bin"

    # 실제 저장명은 UUID로 생성한다.
    # 원본 파일명을 그대로 저장명으로 쓰지 않아 충돌과 경로 추측을 줄인다.
    return f"{uuid.uuid4().hex}{ext}"
```

```python
# 파일 저장
file.save(file_path)

# 저장된 파일의 SHA-256 해시 계산
hasher = hashlib.sha256()
with open(file_path, "rb") as saved_file:
    for chunk in iter(lambda: saved_file.read(1024 * 1024), b=""):
        hasher.update(chunk)

file_hash = hasher.hexdigest()
```

#### 리뷰 내용

파일 업로드 처리에서 다음 보안 기준이 적용되어 있다.

| 처리 | 목적 |
|---|---|
| `PurePath(...).name` | 경로 조작 방지 |
| UUID 저장명 | 파일명 충돌 및 추측 접근 방지 |
| SHA-256 해시 | 무결성 확인 및 중복 검사 기반 |
| metadata DB 저장 | 파일 원본 DB 저장 방지 |

---

### 4-7. AI 분석 작업 큐 생성

**파일:** `flask-vm/app/modules/report_upload/service.py`

```python
# 진행 중으로 간주할 분석 작업 상태
ACTIVE_JOB_STATUSES = {"QUEUED", "RUNNING", "PROCESSING", "STARTED"}
```

```python
existing_job = (
    ReportAnalysisJob.query
    .filter(
        # 같은 report와 attachment에 대해
        ReportAnalysisJob.report_id == report.id,
        ReportAnalysisJob.attachment_id == attachment.id,

        # 이미 진행 중인 작업이 있는지 확인한다.
        ReportAnalysisJob.job_status.in_(ReportUploadService.ACTIVE_JOB_STATUSES),
    )
    .order_by(ReportAnalysisJob.id.desc())
    .first()
)

if existing_job:
    # 중복 분석 작업을 만들지 않고 기존 작업을 반환한다.
    jobs.append(existing_job)
    continue
```

```python
job = ReportAnalysisJob(
    report_id=report.id,
    attachment_id=attachment.id,

    # 최초 상태는 QUEUED
    job_status="QUEUED",

    # 분석 유형과 AI 엔진 정보
    analysis_type="INCIDENT_DETECTION",
    ai_engine_type="YOLOV11",

    # 분석 기준값
    confidence_threshold=0.450,
    lane_stop_threshold=10,
    shoulder_stop_threshold=15,
    movement_threshold_px=5,

    retry_count=0,
    requested_by=user_id,
    requested_at=now,
    created_at=now,
)
```

#### 리뷰 내용

파일 업로드와 AI 분석 실행을 분리했다.  
분석 요청 시 즉시 AI 모델을 호출하지 않고 `ReportAnalysisJob`을 생성한다.

이 구조의 장점은 다음과 같다.

- 긴 분석 작업을 API 요청/응답과 분리 가능
- 작업 상태 추적 가능
- 실패/재시도 관리 가능
- 중복 분석 방지 가능

---

### 4-8. Flask에서 AI VM 분석 요청

**파일:** `flask-vm/app/modules/ai_gateway/service.py`

```python
ai_server_url = (
    current_app.config.get("AI_SERVER_URL")
    or os.getenv("AI_SERVER_URL")
    or "http://192.168.0.186:8001"
)

# AI VM의 파일 분석 endpoint
detect_url = f"{ai_server_url.rstrip('/')}/detect"
```

```python
if not file_path or not os.path.exists(file_path):
    # DB에는 파일 metadata가 있어도 실제 파일이 없을 수 있으므로 존재 여부를 확인한다.
    return False, {
        "status": "file_not_found",
        "message": f"File not found: {file_path}",
    }
```

```python
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

    if cctv_id is not None:
        data["cctv_id"] = str(cctv_id)

    if camera_id:
        data["camera_id"] = str(camera_id)

    # 파일을 multipart/form-data 형태로 AI VM에 전달한다.
    response = requests.post(
        detect_url,
        files=files,
        data=data,
        timeout=timeout_seconds,
    )
```

#### 리뷰 내용

Flask는 업로드된 파일 경로를 확인한 뒤, AI VM `/detect` endpoint로 파일을 전달한다.  
AI VM이 반환한 결과는 분석 작업 상태와 결과 요약 저장에 사용된다.

#### 개선 메모

실시간 AI 이벤트 relay에는 내부 token 검증이 있으나, legacy `/detect` 요청에는 내부 token header가 부족할 수 있다.  
다음과 같이 보완할 수 있다.

```python
headers = {}
internal_token = current_app.config.get("INTERNAL_API_TOKEN")
if internal_token:
    headers["X-Internal-API-Token"] = internal_token

response = requests.post(
    detect_url,
    files=files,
    data=data,
    headers=headers,
    timeout=timeout_seconds,
)
```

---

### 4-9. JWT 생성

**파일:** `flask-vm/app/utils/security.py`

```python
def create_access_token(user) -> str:
    # token 만료 시간을 config에서 가져온다.
    expires_hours = int(current_app.config.get("JWT_EXPIRES_HOURS", 12))
    now = datetime.utcnow()

    payload = {
        # JWT subject에는 사용자 id를 문자열로 저장한다.
        "sub": str(user.id),

        # 프론트 또는 서버에서 참고할 수 있는 사용자 기본 정보
        "email": user.email,
        "role": user.role,

        # 발급 시각과 만료 시각
        "iat": now,
        "exp": now + timedelta(hours=expires_hours),
    }

    # HS256 알고리즘으로 JWT 발급
    return jwt.encode(
        payload,
        current_app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )
```

#### 리뷰 내용

로그인 성공 시 JWT access token을 생성한다.  
token에는 사용자 id, email, role, 발급 시각, 만료 시각이 포함된다.

---

### 4-10. 인증 decorator

**파일:** `flask-vm/app/utils/security.py`

```python
def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        # Authorization: Bearer {token}에서 token을 추출한다.
        token = get_bearer_token()

        if not token:
            return jsonify({"message": "Authorization token is required."}), 401

        try:
            # JWT 검증 및 payload decode
            payload = decode_access_token(token)
            user_id = int(payload["sub"])

            # DB에서 실제 사용자를 조회한다.
            user = User.query.get(user_id)
        except Exception:
            return jsonify({"message": "Invalid or expired token."}), 401

        if not user:
            return jsonify({"message": "User not found."}), 404

        # ACTIVE 계정만 API 접근 허용
        if user.account_status != "ACTIVE":
            return jsonify({"message": "Account is not active."}), 403

        # view 함수에서 request.current_user로 접근할 수 있게 저장한다.
        request.current_user = user

        return fn(*args, **kwargs)

    return wrapper
```

#### 리뷰 내용

보호 API는 `require_auth` decorator를 통해 다음 조건을 확인한다.

1. Bearer token 존재 여부
2. JWT 유효성
3. 사용자 존재 여부
4. 사용자 계정 상태가 `ACTIVE`인지 여부

---

### 4-11. 역할 기반 권한 decorator

**파일:** `flask-vm/app/utils/security.py`

```python
def require_roles(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        @require_auth
        def wrapper(*args, **kwargs):
            # require_auth에서 설정한 현재 사용자
            user = request.current_user

            # 허용된 role이 아니면 접근 거부
            if user.role not in allowed_roles:
                return jsonify({"message": "Permission denied."}), 403

            return fn(*args, **kwargs)

        return wrapper

    return decorator
```

#### 리뷰 내용

인증과 권한을 분리했다.  
`require_auth`는 로그인 여부와 계정 상태를 확인하고, `require_roles`는 특정 관리자 기능에 필요한 role을 검사한다.

---

### 4-12. 회원가입과 승인 상태

**파일:** `flask-vm/app/modules/auth/service.py`

```python
user = User(
    login_id=login_id,
    email=email,

    # 비밀번호 원문이 아니라 hash를 저장한다.
    password_hash=hash_password(password),

    name=name,
    phone=phone,
    role=requested_role,

    # 회원가입 직후에는 바로 사용할 수 없도록 PENDING 상태로 생성한다.
    account_status="PENDING",

    # 이메일 인증 전 상태
    is_email_verified=False,
    created_at=now,
)
```

```python
signup_request = SignupRequest(
    user_id=user.id,

    # 관리자 승인 대기 상태
    request_status="REQUESTED",

    requested_role=requested_role,
    request_memo=data.get("request_memo"),
    created_at=now,
)
```

```python
# 로그인 시 ACTIVE 상태가 아니면 접근 차단
if user.account_status != "ACTIVE":
    raise AuthError(
        f"Account is not active. Current status: {user.account_status}",
        403,
    )
```

#### 리뷰 내용

회원가입 직후 계정은 `PENDING` 상태로 생성된다.  
관리자 승인과 이메일 인증이 완료되어 `ACTIVE` 상태가 되어야 로그인할 수 있다.

---

## 5. Frontend VM 코드 리뷰

### 5-1. CCTV 목록 조회 최적화

**파일:** `frontend-vm/app/api/cctvs/route.ts`

```ts
const MAX_VISIBLE_CAMERAS = parsePositiveInt(
  process.env.CCTV_LIST_MAX_VISIBLE,
  60,
);

function normalizeCctv(item: any, index: number) {
  const n = index + 1;

  // 화면 표시용 CCTV 코드
  const displayCode = `CCTV-${String(n).padStart(3, "0")}`;

  // AI VM camera worker와 연결되는 camera id
  const cameraId = `camera-${n}`;

  const sourceUrl = pickSourceUrl(item);
  const streamQuery = sourceUrl ? `?source_url=${encodeURIComponent(sourceUrl)}` : "";

  return {
    id: displayCode,
    cctvCode: displayCode,
    camera_id: cameraId,

    // metadata 기본값
    // 실제 운영에서는 worker 상태 기반으로 갱신하는 것이 더 적절하다.
    status: "ONLINE",

    // Next.js API Route를 통한 stream/snapshot/bbox 접근 경로
    streamUrl: `/api/cctvs/${encodeURIComponent(cameraId)}/stream${streamQuery}`,
    imageUrl: `/api/cctvs/${encodeURIComponent(cameraId)}/snapshot`,
    bboxWsUrl: `/api/cctvs/${encodeURIComponent(cameraId)}/bbox`,

    sourceUrl,
    isLive: true,
    isAiDetected: false,
  };
}
```

```ts
return NextResponse.json({
  success: true,
  count: cameras.length,
  rawCount: rawItems.length,
  selectedCount: cameras.length,

  // 목록 조회 단계에서 stream probing을 하지 않는다.
  // 모든 CCTV stream을 동시에 열면 응답 지연과 AI VM 부하가 커진다.
  streamProbeSkipped: true,

  message: "CCTV metadata list fetched without stream probing",
  data: cameras,
});
```

#### 리뷰 내용

CCTV 목록 조회에서는 실제 stream 연결 검사를 하지 않는다.  
목록 단계에서 모든 CCTV stream을 확인하면 네트워크 부하와 응답 지연이 커질 수 있기 때문이다.

실제 stream과 BBOX 조회는 사용자가 선택한 CCTV 기준으로 수행된다.

---

### 5-2. AI VM BBOX 프록시

**파일:** `frontend-vm/app/api/cctvs/[cctvId]/bbox/route.ts`

```ts
const AI_VM_BASE_URL =
  process.env.AI_VM_BASE_URL ||
  process.env.NEXT_PUBLIC_AI_VM_BASE_URL ||
  "http://192.168.0.186:5001";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cctvId: string }> },
) {
  const { cctvId } = await context.params;

  // AI VM의 camera detection endpoint로 요청을 전달한다.
  const upstreamUrl = new URL(
    `/internal/cameras/${encodeURIComponent(cctvId)}/detections`,
    AI_VM_BASE_URL.replace(/\/$/, ""),
  );

  const response = await fetch(upstreamUrl, {
    method: "GET",

    // 실시간 bbox는 캐시하면 안 된다.
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  return NextResponse.json(
    data ?? { success: false, error: "Invalid AI VM response" },
    { status: response.status },
  );
}
```

#### 리뷰 내용

브라우저가 AI VM을 직접 호출하지 않고, Next.js API Route가 서버 측에서 AI VM으로 요청을 전달한다.  
시연 구조에서는 빠르게 연결할 수 있는 장점이 있지만, 최종 운영 구조에서는 Flask Gateway로 통합하는 것이 더 일관적이다.

---

### 5-3. BBOX metadata 검증

**파일:** `frontend-vm/components/cctv/BboxDetectionOverlay.tsx`

```ts
function normalizeOverlayState(payload: unknown): OverlayState {
  // bbox 응답 metadata가 있는지 확인한다.
  if (!getBboxMetadata(payload)) {
    throw new Error("응답 형식 오류: bbox metadata가 없습니다.");
  }

  // 원본 프레임 크기 확인
  const frameSize = getDetectionFrameSize(payload);

  // bbox 좌표 형식 확인
  const bboxFormat = getBboxFormat(payload);

  if (!frameSize) {
    throw new Error("응답 형식 오류: frame_width와 frame_height가 없습니다.");
  }

  if (!bboxFormat) {
    throw new Error("응답 형식 오류: bbox_format이 없습니다.");
  }

  if (!hasDetectionArray(payload)) {
    throw new Error("응답 형식 오류: detections 배열이 없습니다.");
  }

  const detections = getRawDetections(payload)
    .map((detection) => normalizeBbox(detection, frameSize, bboxFormat))
    .filter((bbox): bbox is Bbox => Boolean(bbox));

  return {
    frameSize,
    detections,
  };
}
```

#### 리뷰 내용

프론트에서는 AI 응답을 그대로 신뢰하지 않고, 필요한 metadata가 모두 있는지 검증한다.

필수 metadata는 다음과 같다.

```txt
frame_width
frame_height
bbox_format
detections
```

metadata가 없으면 bbox 좌표를 화면 크기에 맞게 변환할 수 없으므로 오류로 처리한다.

---

### 5-4. bbox 좌표 형식 변환

**파일:** `frontend-vm/components/cctv/BboxDetectionOverlay.tsx`

```ts
if (bboxFormat === "xyxy") {
  // xyxy: [x1, y1, x2, y2]
  // width와 height를 x2-x1, y2-y1로 계산한다.
  width = (c ?? 0) - (a ?? 0);
  height = (d ?? 0) - (b ?? 0);
} else if (bboxFormat === "xywh") {
  // xywh: [x, y, width, height]
  // width와 height가 이미 포함되어 있다.
  width = c;
  height = d;
}
```

#### 리뷰 내용

bbox 형식에 따라 width/height 계산 방식이 다르다.  
AI VM은 기본적으로 `xyxy`를 사용하지만, 프론트에서는 `xywh`도 처리할 수 있게 방어적으로 구현되어 있다.

---

### 5-5. BBOX overlay percentage 변환

**파일:** `frontend-vm/components/cctv/BboxDetectionOverlay.tsx`

```tsx
// 원본 프레임 좌표를 화면 비율 좌표로 변환한다.
const left = (bbox.x / frameSize.width) * 100;
const top = (bbox.y / frameSize.height) * 100;
const width = (bbox.width / frameSize.width) * 100;
const height = (bbox.height / frameSize.height) * 100;

<div
  className="absolute"
  style={{
    // 화면 크기가 변해도 원본 프레임 비율 기준으로 위치가 유지된다.
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
  }}
>
```

#### 리뷰 내용

AI VM이 반환하는 bbox는 원본 프레임 픽셀 좌표이다.  
프론트 화면 크기는 브라우저 크기, CSS, 영상 비율에 따라 달라질 수 있으므로, 픽셀 좌표를 percentage로 변환해 overlay를 표시한다.

---

## 6. 개선 필요 지점

### 6-1. 이벤트 타입 정규화

**파일:** `ai-vm/app/event_detector.py`

현재 일부 코드에서는 일반 정차 이벤트를 `STOPPED_VEHICLE`로 반환한다.

```python
def _event_type_for_rois(roi_ids: list[str]) -> str:
    if "LEFT_SHOULDER" in roi_ids or "RIGHT_SHOULDER" in roi_ids:
        return "SHOULDER_STOP"

    # 현재 일반 정차 이벤트명
    return "STOPPED_VEHICLE"
```

DB/업무 기준에서 도로 위 정차와 갓길 정차를 명확히 구분하려면 다음처럼 정규화하는 것이 적절하다.

```python
def _event_type_for_rois(roi_ids: list[str]) -> str:
    if "LEFT_SHOULDER" in roi_ids or "RIGHT_SHOULDER" in roi_ids:
        return "SHOULDER_STOP"

    # 도로 위 정차 이벤트명으로 통일
    return "LANE_STOP"
```

---

### 6-2. empty bbox metadata 보완

탐지 결과가 0개일 때도 `bbox_format`을 포함하는 것이 좋다.

```python
return {
    "camera_id": self.camera_id,
    "frame_id": frame_id,
    "timestamp": timestamp.isoformat(),
    "frame_width": width,
    "frame_height": height,

    # detections가 비어 있어도 좌표 계약은 유지한다.
    "bbox_format": "xyxy",

    "detections": [],
}
```

#### 개선 이유

프론트는 `bbox_format`을 필수 metadata로 검증한다.  
탐지 결과가 없더라도 응답 계약이 유지되어야 빈 overlay 상태를 정상 처리할 수 있다.

---

### 6-3. legacy `/detect` 요청 내부 token 추가

`ai_relay` 이벤트 수신 API는 내부 token을 사용하지만, legacy `/detect` 분석 요청에도 동일한 보안 기준을 적용하는 것이 좋다.

```python
headers = {}
internal_token = current_app.config.get("INTERNAL_API_TOKEN")
if internal_token:
    headers["X-Internal-API-Token"] = internal_token

response = requests.post(
    detect_url,
    files=files,
    data=data,
    headers=headers,
    timeout=timeout_seconds,
)
```

---

### 6-4. Frontend AI proxy와 Flask Gateway 구조 정리

현재 일부 CCTV stream/BBOX API는 Next.js API Route에서 AI VM으로 직접 proxy한다.

```txt
Frontend API Route
→ AI VM
```

최종 운영 구조에서는 다음처럼 Flask Gateway 중심으로 통일하는 것이 더 적절하다.

```txt
Frontend
→ Flask Gateway
→ AI VM
```

#### 개선 이유

- 인증/권한 검사를 Flask에서 일관되게 처리 가능
- AI VM 주소 노출 범위 감소
- 내부 API token 처리 일관성 확보
- 설계 문서와 실제 구현 구조 일치

---

## 7. 코드리뷰 요약

| 영역 | 핵심 구현 | 검토 결과 |
|---|---|---|
| YOLO 탐지 | `Detection` dataclass로 결과 표준화 | bbox 형식 명시가 명확함 |
| 원거리 탐지 | 상단 crop 후 resize 탐지 | CCTV 작은 객체 보완 목적에 적합 |
| 실시간 추론 | raw/display/event 분리 | 표시 로직과 판단 로직 분리가 적절함 |
| ROI 판단 | bbox 하단 중심점 사용 | 도로 접지 위치 판단에 적합 |
| 정차 판단 | track history, 이동량, 지속 시간 사용 | 단순 탐지보다 오탐 방지에 유리 |
| 이벤트 중복 방지 | track/camera cooldown | 반복 이벤트 폭주 방지 가능 |
| 파일 업로드 | UUID 저장명, SHA-256 해시 | 기본 보안 처리 적용 |
| 분석 작업 | `ReportAnalysisJob` 큐 구조 | 비동기 처리와 중복 방지 가능 |
| 인증/권한 | JWT, `require_auth`, `require_roles` | 인증과 역할 검사가 분리됨 |
| 실시간 이벤트 | `realtime_events` 저장 후 emit | 이벤트 이력 관리 가능 |

---

## 8. 결론

STACCATO의 핵심 코드는 AI 탐지 결과를 단순히 화면에 표시하는 수준이 아니라, 관제 업무 흐름으로 연결하는 구조를 가진다.

주요 흐름은 다음과 같다.

```txt
YOLO 차량 탐지
→ bbox 표준화
→ ROI 포함 여부 판단
→ track history 기반 이동량 계산
→ 정차 지속 시간 확인
→ 이벤트 생성
→ Flask relay 수신
→ incidents / detection_logs / realtime_events 저장
→ Frontend 관제 화면 표시
```

구현상 강점은 다음과 같다.

1. AI 탐지 결과를 표준 구조로 변환한다.
2. bbox 하단 중심점을 기준으로 ROI 판단을 수행한다.
3. 정차 판단에 이동량과 지속 시간을 함께 사용한다.
4. 이벤트 중복 생성을 cooldown으로 제한한다.
5. AI VM과 Flask VM의 역할이 분리되어 있다.
6. 사고 결과와 AI 판단 근거를 DB에서 분리 저장한다.
7. 파일 업로드와 분석 작업을 분리해 비동기 처리가 가능하다.
8. JWT 인증과 역할 기반 권한 검사를 분리해 관리한다.

개선이 필요한 부분은 다음과 같다.

1. `STOPPED_VEHICLE`과 `LANE_STOP` 이벤트 타입 정규화
2. detection이 없는 bbox 응답에도 `bbox_format` 포함
3. legacy AI 분석 요청에 내부 token header 추가
4. Frontend의 AI VM 직접 proxy를 Flask Gateway 중심으로 통일

