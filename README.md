# STACCATO AI Highway Control

> Final MVP scope reference: [`docs/mvp/final-mvp-scope.md`](docs/mvp/final-mvp-scope.md)

## Final MVP Summary

STACCATO is an AI-based highway CCTV abnormal situation detection and real-time control system.

Final MVP focus:

- YOLOv11 based vehicle detection
- ByteTrack based tracking
- ROI / Rule Engine based abnormal event detection
- Flask API Gateway and MySQL metadata storage
- Socket.IO based realtime notification
- Frontend monitoring, report upload, signup/auth, and mypage
- Snapshot / MP4 Replay metadata integration

Excluded from final MVP:

- Map API
- GPS based location display
- VM-based deployment; Docker Compose deployment is deprecated
- Reinforcement learning / automatic retraining

---


# staccato-ai-highway-control
AI-based traffic incident control system for detecting stopped vehicles on driving lanes and shoulders. \ 스타카토 팀의 AI 기반 정차 차량 탐지 및 관제 대응 MVP 시스템입니다
```
개발 통합 브랜치
```
## Current Runtime Standard

현재 프로젝트 실행 기준은 VM 분리 구조입니다.

| Server | Runtime |
|---|---|
| DB-VM | MySQL direct install |
| FLASK-VM | Python venv |
| FRONTEND-VM | Node.js/npm |
| AI-VM | Docker |
| ITS-VM | Python/FastAPI |

자세한 서버 세팅 기준은 `docs/infra` 문서를 참고합니다.

- `docs/infra/vm-server-status.md`
- `docs/infra/db-vm-setup.md`
- `docs/infra/flask-vm-setup.md`
- `docs/infra/frontend-vm-setup.md`
- `docs/infra/env-guide.md`
- `docs/infra/repository-cleanup-policy.md`

주의사항:

- `.env`, `.env.local`, `.venv`, `node_modules`는 Git에 올리지 않습니다.
- Docker는 `AI-VM`에서만 사용합니다.
- `DB-VM`, `FLASK-VM`, `FRONTEND-VM`, `ITS-VM`에서는 Docker를 사용하지 않습니다.
- 루트 `docker-compose.yml`과 비-AI VM의 Dockerfile은 삭제되었습니다.
- 실제 서버 실행 상태, DB 데이터, 설치된 패키지는 Git pull만으로 복제되지 않습니다.
