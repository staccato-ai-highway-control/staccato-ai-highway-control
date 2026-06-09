# STACCATO System Architecture

> Current final MVP scope: [`docs/mvp/final-mvp-scope.md`](../mvp/final-mvp-scope.md)

## 1. Overview

STACCATO is an AI-based highway CCTV abnormal situation detection and real-time control system.

The final MVP focuses on:

- CCTV stream processing
- YOLOv11 based vehicle detection
- Bbox center-movement based stopped-vehicle estimation
- ROI / Rule Engine based abnormal event detection
- Flask based API Gateway and DB persistence
- Socket.IO based realtime notification
- Frontend monitoring and incident review
- Snapshot / MP4 Replay metadata integration

The following features are excluded from the final MVP:

- Map API
- GPS-based frontend display
- LLM / Chatbot features
- Docker Compose based deployment
- Reinforcement learning
- Automatic retraining

---

## 2. Final 4-VM Architecture

| VM | IP | Main Responsibility | Runtime |
|---|---|---|---|
| Frontend VM | 192.168.0.188 | Web UI, login, report upload, mypage, monitoring | Next.js / React / TypeScript |
| Flask VM | 192.168.0.187 | API Gateway, Auth, DB persistence, Report API, Socket.IO | Flask / SQLAlchemy |
| AI VM | 192.168.0.186 | CCTV ingest, YOLOv11 inference, bbox center-movement analysis, rule engine, event generation | FastAPI / OpenCV / YOLOv11 |
| DB VM | 192.168.0.190 | Application database | MySQL 8.0 |

---

## 3. Final Runtime Flow

    CCTV / RTSP / HLS
    → AI VM
    → YOLOv11 vehicle detection
    → Bbox center movement analysis
    → ROI / Rule Engine
    → abnormal event JSON
    → Flask VM event receiver
    → MySQL metadata storage
    → Socket.IO realtime notification
    → Frontend monitoring screen
    → Snapshot / MP4 Replay review

---

## 4. Server Boundary

### Frontend VM

- Displays monitoring UI
- Handles login and signup screens
- Handles report upload UI
- Displays incident list and detail
- Displays snapshot and replay metadata
- Does not directly access DB
- Does not directly call AI internal services

### Flask VM

- Owns DB access
- Provides REST APIs
- Handles authentication and authorization
- Stores incident, report, event, and replay metadata
- Relays realtime notifications through Socket.IO
- Receives event JSON from AI VM
- Does not run AI inference directly

### AI VM

- Receives CCTV stream
- Runs YOLOv11 inference
- Estimates stopped vehicles using bbox center movement over time
- Applies ROI / Rule Engine
- Creates abnormal event JSON
- Handles replay clip generation or metadata handoff
- Does not directly write to DB

### DB VM

- Stores relational service data
- Stores metadata only
- Does not store large MP4 binary files directly

---

## 5. AI Model Boundary

| Model | Role |
|---|---|
| YOLOv11 | Main real-time vehicle detection model |
| RT-DETR | Comparison object detection model |
| Keras | Optional future experiment or crop classification baseline |

---

## 6. Storage Boundary

- DB stores metadata.
- Uploaded files and replay clips are stored as files.
- DB stores file path, URL, duration, incident ID, CCTV ID, and related metadata.
- Large binary files are not stored directly in DB.

---

## 7. Excluded Architecture

The following architecture elements are excluded from the final MVP:

- Map API
- GPS-based frontend display
- LLM / Chatbot features
- Docker Compose based deployment
- Reinforcement learning
- Automatic retraining pipeline
