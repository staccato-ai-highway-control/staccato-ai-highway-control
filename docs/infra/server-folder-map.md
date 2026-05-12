# STACCATO Server Folder Map

## 현재 저장소 구조

STACCATO는 하나의 GitHub 저장소 안에서 VM별 폴더를 분리해 관리합니다.

저장소 기준 구조:

    staccato-ai-highway-control/
    ├── ai-vm/
    ├── db-vm/
    ├── flask-vm/
    ├── frontend-vm/
    ├── its-vm/
    ├── docs/
    ├── storage/
    ├── README.md
    └── LICENSE

## VM별 담당 폴더

| VM | IP | 담당 폴더 | Runtime |
|---|---|---|---|
| AI-VM | 192.168.0.186 | `ai-vm/` | Docker |
| FLASK-VM | 192.168.0.187 | `flask-vm/` | Python venv |
| FRONTEND-VM | 192.168.0.188 | `frontend-vm/` | Node.js/npm |
| ITS-VM | 192.168.0.189 | `its-vm/` | Python/FastAPI |
| DB-VM | 192.168.0.190 | `db-vm/` | MySQL direct install |

## Docker 사용 정책

Docker는 `AI-VM`에서만 사용합니다.

유지되는 Docker 파일:

| 경로 | 목적 |
|---|---|
| `ai-vm/docker-compose.yml` | AI-VM Docker Compose 실행 |
| `ai-vm/llm-server/Dockerfile` | LLM 서버 Docker 이미지 빌드 |

삭제된 Docker 파일:

| 경로 | 사유 |
|---|---|
| `docker-compose.yml` | 루트 통합 Docker Compose 미사용 |
| `.dockerignore` | 루트 Docker 빌드 미사용 |
| `flask-vm/Dockerfile` | FLASK-VM은 Python venv 기준 |
| `flask-vm/.dockerignore` | FLASK-VM Docker 빌드 미사용 |
| `frontend-vm/Dockerfile` | FRONTEND-VM은 Node.js/npm 기준 |
| `frontend-vm/.dockerignore` | FRONTEND-VM Docker 빌드 미사용 |
| `its-vm/Dockerfile` | ITS-VM은 Python/FastAPI 기준 |
| `its-vm/.dockerignore` | ITS-VM Docker 빌드 미사용 |

## 권장 작업 위치

| 작업 | 권장 위치 |
|---|---|
| Flask API 수정 | `FLASK-VM ~/staccato-flask/flask-vm` |
| Frontend 수정 | `FRONTEND-VM ~/staccato-frontend/frontend-vm` |
| AI Docker 수정 | `AI-VM ~/staccato-ai/ai-vm` |
| DB 설정 수정 | `DB-VM ~/staccato-db/db-vm` |
| ITS 수정 | `ITS-VM ~/staccato-its/its-vm` |
| 공통 문서, 루트 파일, 저장소 정리 | 전체 저장소 루트 |

## Sparse Checkout 권장 구조

추후 각 VM은 Sparse Checkout으로 자기 담당 폴더만 보이게 정리할 수 있습니다.

| VM | Sparse Checkout 대상 |
|---|---|
| FLASK-VM | `flask-vm docs` |
| FRONTEND-VM | `frontend-vm docs` |
| AI-VM | `ai-vm docs storage` |
| DB-VM | `db-vm docs` |
| ITS-VM | `its-vm docs` |

예시:

    git sparse-checkout init --cone
    git sparse-checkout set flask-vm docs

## 주의 사항

- `staccato-flask`, `staccato-frontend` 같은 상위 폴더명은 VM별 로컬 작업 폴더 이름입니다.
- 실제 GitHub 기준 폴더는 `flask-vm`, `frontend-vm`, `ai-vm`, `db-vm`, `its-vm`입니다.
- 프론트엔드는 DB에 직접 연결하지 않고 Flask API만 호출합니다.
- Secret, DB Password, JWT Secret, SMTP Password는 Git에 올리지 않습니다.
- 비-AI VM에는 Dockerfile을 다시 추가하지 않습니다.
