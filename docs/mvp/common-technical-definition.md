# Common Technical Definition

> Current final MVP scope: [`final-mvp-scope.md`](./final-mvp-scope.md)

## 1. Final Technical Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js / React / TypeScript |
| Backend | Flask / SQLAlchemy |
| Realtime | Socket.IO |
| AI / ITS | FastAPI / OpenCV / YOLOv11 / ByteTrack |
| DB | MySQL 8.0 |
| Model Comparison | RT-DETR |
| Runtime | VM-based direct execution |

---

## 2. Final VM Definition

| VM | IP | Role |
|---|---|---|
| Frontend VM | 192.168.0.188 | Web client runtime |
| Flask VM | 192.168.0.187 | API Gateway and DB access |
| ITS VM | 192.168.0.186 | AI inference and CCTV processing |
| DB VM | 192.168.0.190 | MySQL database |

---

## 3. API Boundary

Frontend calls Flask APIs.

Flask may receive event payloads from ITS VM.

ITS VM does not directly access DB.

DB access is owned by Flask VM.

---

## 4. File Storage Definition

Files are not stored directly in DB.

DB stores:

- file path
- file URL
- duration
- incident ID
- CCTV ID
- upload metadata
- replay metadata

---

## 5. Realtime Definition

Realtime notification is delivered through Socket.IO.

Typical flow:

    ITS Event
    → Flask Event Receiver
    → DB Save
    → Socket.IO Emit
    → Frontend Monitoring UI

---

## 6. Excluded Technical Areas

The following are not part of the final MVP technical scope:

- LLM report generation
- LLM chatbot
- Map API
- GPS-based display
- Docker-based full deployment
- Reinforcement learning
- automatic retraining
