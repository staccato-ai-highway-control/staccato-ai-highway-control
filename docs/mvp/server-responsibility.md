# Server Responsibility

> Current final MVP scope: [`final-mvp-scope.md`](./final-mvp-scope.md)

## 1. Responsibility Principle

STACCATO uses a final 4-VM architecture.

Each server has a clear boundary:

- Frontend VM handles UI.
- Flask VM owns service APIs and DB access.
- ITS VM owns AI inference and CCTV event generation.
- DB VM owns MySQL storage.

---

## 2. Frontend VM

| Item | Responsibility |
|---|---|
| Monitoring UI | Display realtime events |
| Incident UI | Display incident list and detail |
| Report UI | Upload user reports |
| Auth UI | Signup, login, mypage |
| Replay UI | Display snapshot and replay metadata |

Frontend must not:

- directly access DB
- directly call internal AI model code
- store service state outside API contract

---

## 3. Flask VM

| Item | Responsibility |
|---|---|
| Auth | Signup, email verification, login policy |
| MyPage | Profile, password, account status |
| Report Upload | Upload metadata and optional location handling |
| Event Receiver | Receive event JSON from ITS |
| DB Persistence | Store incident, report, replay, and event metadata |
| Realtime | Emit Socket.IO events |
| API Gateway | Provide REST API to frontend |

Flask VM owns SQLAlchemy ORM and DB transaction boundaries.

---

## 4. ITS VM

| Item | Responsibility |
|---|---|
| CCTV Ingest | RTSP / HLS / video source handling |
| Detection | YOLOv11 vehicle detection |
| Tracking | ByteTrack |
| Rule Engine | Stop, low-speed, shoulder-event judgment |
| Event Generation | Create event JSON |
| Replay Processing | Generate or hand off replay clip metadata |

ITS VM must not directly write to MySQL.

---

## 5. DB VM

| Item | Responsibility |
|---|---|
| Database | MySQL 8.0 |
| Data | Service metadata |
| Access | Accessed through Flask VM |

DB stores metadata, not large binary video files.

---

## 6. Excluded Server Responsibilities

The following are excluded from the final MVP:

- LLM server operation
- Chatbot server operation
- Map server integration
- Full Docker Compose deployment
- Automatic retraining server
