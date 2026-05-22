# STACCATO Final MVP Scope

## 1. Final MVP Goal

STACCATO의 최종 MVP는 AI 기반 고속도로 CCTV 이상상황 감지 및 실시간 관제 시스템이다.

핵심 목표는 다음과 같다.

- CCTV 영상 기반 차량 객체 탐지
- 차량 추적 기반 정차 / 저속 / 갓길 이상상황 판단
- 이상상황 이벤트 저장
- WebSocket 기반 실시간 관제 알림
- Snapshot 및 MP4 Replay 기반 사고 확인
- 사용자 신고 / 업로드, 회원가입 / 인증, 마이페이지 기능 제공

---

## 2. Final System Flow

    CCTV / RTSP / HLS 영상
    → ITS VM 수신
    → YOLOv11 차량 탐지
    → ByteTrack Tracking
    → ROI / Rule Engine 판단
    → 정차 / 저속 / 갓길 이상상황 Event 생성
    → Flask VM Event 수신
    → MySQL DB 저장
    → Socket.IO 실시간 알림
    → Frontend 관제 화면 표시
    → Snapshot / MP4 Replay 확인

---

## 3. Final VM Architecture

| VM | IP | Main Role | Runtime |
|---|---|---|---|
| Frontend VM | 192.168.0.188 | 관제 화면, 로그인, 신고, 마이페이지 | Next.js / React / TypeScript |
| Flask VM | 192.168.0.187 | API Gateway, Auth, DB 저장, Report API, Socket.IO | Flask / SQLAlchemy |
| ITS VM | 192.168.0.186 | CCTV 수신, AI 탐지, Tracking, Event 생성, Replay 처리 | FastAPI / OpenCV / YOLOv11 |
| DB VM | 192.168.0.190 | 서비스 DB | MySQL 8.0 |

---

## 4. Included in Final MVP

| Area | Included |
|---|---|
| AI Detection | YOLOv11 vehicle detection |
| AI Comparison | RT-DETR comparison experiment |
| Tracking | ByteTrack based object tracking |
| Rule Engine | ROI, stop, low-speed, shoulder-event judgment |
| Backend | Flask API Gateway, Auth, Report Upload, Event Save |
| Realtime | Socket.IO notification |
| Database | MySQL metadata storage |
| Frontend | Monitoring, incident list/detail, login, report upload, mypage |
| Storage | Snapshot / uploaded file / replay metadata path storage |

---

## 5. Excluded from Final MVP

The following features are excluded from the final MVP scope.

| Excluded Feature | Reason |
|---|---|
| LLM report generation | Out of final MVP scope |
| LLM chatbot | Out of final MVP scope |
| LLM filter | Out of final MVP scope |
| Map API | Out of final MVP scope |
| GPS based location display | Not used in final MVP |
| Role-based frontend screen split | Not required for MVP demonstration |
| Reinforcement learning | Advanced research scope |
| Automatic retraining pipeline | MLOps advanced scope |
| Docker based full deployment | Current VM operation uses direct runtime execution |

---

## 6. AI Model Policy

### Main Detection Model

YOLOv11 is the main real-time vehicle detection model for the ITS VM.

### Comparison Model

RT-DETR is trained as a comparison model and evaluated using:

- mAP50
- mAP50-95
- Precision
- Recall
- Class-wise performance
- Inference speed

### Keras Model

Keras-based experiments are optional and may be used later as:

- vehicle crop classification baseline
- experimental object detection prototype

Keras is not the main real-time detection model for the final MVP.

---

## 7. Database / Storage Policy

- DB stores metadata, not large binary files.
- MP4 files are stored as files.
- DB stores file path, file URL, duration, incident ID, CCTV ID, and related metadata.
- Uploaded report files are stored in storage paths and referenced from DB.

---

## 8. User-Scope Backend Regression Tests

Current user-scope regression test command:

    cd flask-vm
    source .venv/bin/activate

    python3 -m compileall app tests

    PYTHONPATH=. pytest -q \
      tests/test_report_unit.py \
      tests/test_mypage_auth_unit.py \
      tests/test_auth_email_verification.py

Current expected result:

    24 passed

Covered areas:

- Report upload optional location handling
- Signup and email verification
- Login account status policy
- MyPage profile update policy
- Restricted profile field blocking

---

## 9. Document Status

This document is the final MVP scope reference.

Older documents that describe LLM report generation, LLM chatbot, full Docker Compose deployment, or advanced MLOps/retraining should be treated as archived or deprecated unless explicitly updated to match this final MVP scope.
