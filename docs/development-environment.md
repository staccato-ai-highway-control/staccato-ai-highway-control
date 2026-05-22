# Deprecated / Historical Notice

> This document contains earlier planning details that may not match the final STACCATO MVP scope.
> For the current final MVP scope, see `docs/mvp/final-mvp-scope.md`.
> LLM, chatbot, full Docker Compose deployment, map/GPS integration, reinforcement learning, and automatic retraining are excluded from the final MVP.

---

> Legacy Notice  
> 이 문서는 초기 로컬/통합 개발 환경 기준을 포함할 수 있습니다.  
> 현재 공식 실행 기준은 VM 분리 구조이며, 서버별 실행 기준은 `docs/infra/server-folder-map.md`와 `docs/infra/vm-server-status.md`를 우선 참고합니다.

# STACCATO Development Environment

## 1. Runtime Versions

| Area | Version |
|---|---|
| Python | 3.11.x |
| Node.js | 20.x |
| MySQL | 8.0.x |
| Docker Compose | v2 |

## 2. Docker Base Images

| Service | Base Image |
|---|---|
| flask-server | python:3.11-slim |
| ai-server | python:3.11-slim |
| llm-server | python:3.11-slim |
| its-server | python:3.11-slim |
| frontend-server | node:20-alpine |
| db-server | mysql:8.0 |

## 3. Verified Versions

| Area | Version |
|---|---|
| Python | 3.11.15 |
| Node.js | 20.20.2 |
| MySQL | 8.0.46 |

## 4. Version Check Commands

### Local

```powershell
python --version
node -v
npm -v
docker --version
docker compose version