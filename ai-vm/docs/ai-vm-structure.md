# AI-VM Structure

AI-VM은 STACCATO 프로젝트에서 CCTV 기반 객체 탐지, 이벤트 감지, 영상 처리, ITS CCTV 연동, Flask relay 연동을 담당하는 서버입니다.

현재 AI-VM은 Docker를 사용하지 않고, Python 가상환경과 FastAPI 런타임으로 실행합니다.

## Current Runtime Structure

```text
ai-vm/
├── main.py              # uvicorn entrypoint, runs app.main:app
├── app/                 # FastAPI runtime application
│   ├── main.py
│   ├── config.py
│   ├── detector.py
│   ├── camera_worker.py
│   ├── cameras.py
│   ├── inference_worker.py
│   ├── event_detector.py
│   ├── event_clip_worker.py
│   ├── its_openapi.py
│   ├── roi_config.py
│   ├── stream_server.py
│   ├── overlay_renderer.py
│   ├── relay_client.py
│   ├── ring_buffer.py
│   ├── bbox_store.py
│   ├── dev_auth.py
│   └── schemas.py
└── docs/
    ├── ai-server-api.md
    ├── ai-vm-structure.md
    └── progress-log.md
