# STACCATO Repository Cleanup Policy

## 2026-05-11 기준 정리 정책

STACCATO 프로젝트는 VM 분리 구조를 기준으로 운영합니다.

Docker는 `AI-VM`에서만 사용합니다.

## 유지 대상

| 경로 | 이유 |
|---|---|
| `ai-vm/docker-compose.yml` | AI-VM Docker Compose 실행 기준 |
| `ai-vm/llm-server/Dockerfile` | LLM 서버 Docker 이미지 빌드 기준 |

## 삭제 완료 대상

| 경로 | 사유 |
|---|---|
| `docker-compose.yml` | 루트 통합 Docker Compose는 현재 VM 운영 기준과 맞지 않음 |
| `.dockerignore` | 루트 Docker 빌드를 사용하지 않음 |
| `flask-vm/Dockerfile` | FLASK-VM은 Python venv 기준 |
| `flask-vm/.dockerignore` | FLASK-VM Docker 빌드 미사용 |
| `frontend-vm/Dockerfile` | FRONTEND-VM은 Node.js/npm 직접 실행 기준 |
| `frontend-vm/.dockerignore` | FRONTEND-VM Docker 빌드 미사용 |
| `its-vm/Dockerfile` | ITS-VM은 Python/FastAPI 직접 실행 기준 |
| `its-vm/.dockerignore` | ITS-VM Docker 빌드 미사용 |

## VM별 실행 기준

| VM | Runtime |
|---|---|
| DB-VM | MySQL direct install |
| FLASK-VM | Python venv |
| FRONTEND-VM | Node.js/npm |
| AI-VM | Docker |
| ITS-VM | Python/FastAPI |

## 금지 사항

- 비-AI VM에 Dockerfile을 다시 추가하지 않습니다.
- 루트 `docker-compose.yml`을 다시 추가하지 않습니다.
- 프론트엔드에서 DB에 직접 접근하지 않습니다.
- `.env`, `.env.local`, Secret 파일을 Git에 커밋하지 않습니다.

## 예외

AI-VM 관련 Docker 파일은 유지합니다.
AI-VM 외 Docker 실행이 필요해질 경우, 팀 합의 후 별도 PR로 정책 문서를 먼저 수정해야 합니다.
