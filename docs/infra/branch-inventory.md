# STACCATO Branch Inventory

## 기준일

2026-05-11

## 목적

이 문서는 STACCATO GitHub 원격 브랜치의 현재 상태를 정리하기 위한 문서입니다.

브랜치를 임의로 삭제하지 않고, 각 브랜치가 어떤 용도인지, develop에 반영되었는지, 보존해야 하는지를 팀원이 쉽게 확인할 수 있도록 정리합니다.

## 기준 브랜치

| 브랜치 | 역할 | 비고 |
|---|---|---|
| main | GitHub 기본 브랜치 | 최신 작업 기준 아님 |
| develop | 실제 개발 기준 브랜치 | 모든 작업은 develop 기준으로 확인 |

## 현재 최신 develop

| 항목 | 값 |
|---|---|
| 최신 커밋 | fc0da57 |
| 커밋 메시지 | chore(repo): remove non-ai docker files (#58) |
| 기준 정책 | Docker는 AI-VM에서만 사용 |
| 유지 Docker 파일 | ai-vm/docker-compose.yml, ai-vm/llm-server/Dockerfile |

## 운영 원칙

- 원격 브랜치는 임의 삭제하지 않습니다.
- develop에 이미 반영된 브랜치라도, 팀에서 후속 작업명으로 사용할 수 있으므로 삭제 전 담당자 확인이 필요합니다.
- 오래된 브랜치를 다시 사용할 경우, 기존 브랜치에 바로 이어서 작업하기보다 최신 develop에서 새 브랜치를 생성하는 것을 권장합니다.
- develop에 없는 변경이 있는 브랜치는 삭제 금지입니다.
- 문서, 환경 예시 파일, VM 구조 관련 브랜치는 내용 확인 후 develop 반영 여부를 결정합니다.

## develop에 아직 없는 변경이 있는 브랜치

아래 브랜치는 git cherry 결과에서 + 로 확인된 브랜치입니다.  
즉, develop에 아직 없는 변경이 있으므로 삭제하면 안 됩니다.

| 브랜치 | 변경 내용 | 변경 파일 | 상태 | 권장 조치 |
|---|---|---|---|---|
| docs/mvp-api-spec | MVP API 명세 문서 추가 | docs/mvp-api-spec.md | develop 미반영 | 문서 내용 확인 후 반영 검토 |
| docs/vm-setup-guide | VM 서버 구축 및 배포 방향 문서 추가 | docs/vm-setup-guide.md | develop 미반영 | 현재 VM 기준과 충돌 여부 확인 후 반영 검토 |
| feat/flask-vm-setup | Flask VM 환경 예시 파일 추가 | flask-vm/.env.example | develop 미반영 | Secret 포함 여부 확인 후 반영 권장 |
| feat/frontend-integration | Frontend 환경 예시 파일 수정 | frontend-vm/.env.example | develop 미반영 | .env 기준과 맞는지 확인 후 반영 권장 |

## develop에 내용이 반영된 것으로 확인된 브랜치

아래 브랜치는 git cherry 결과에서 - 로 확인된 브랜치입니다.  
즉, 브랜치 자체는 원격에 남아 있지만 실제 변경 내용은 develop에 이미 반영된 것으로 판단됩니다.

다만 팀에서 브랜치명을 후속 작업용으로 사용할 수 있으므로 임의 삭제하지 않습니다.

| 브랜치 | 기존 목적 | 현재 상태 | 비고 |
|---|---|---|---|
| chore/pin-project-runtime-versions | 프로젝트 런타임 버전 문서화 | develop 반영됨 | .nvmrc, .python-version, development-environment 문서 관련 |
| fix/backend-sqlalchemy-get-refactor | SQLAlchemy legacy get 사용 방식 수정 | develop 반영됨 | 과거 flask-server 경로 기준 커밋 |
| fix/database-env-config | VM DB 환경변수 지원 | develop 반영됨 | #57 반영 내용과 동일 계열 |

## develop에 이미 merge된 기능 브랜치

아래 브랜치들은 git branch --merged origin/develop 결과에서 확인된 브랜치입니다.  
대부분 develop보다 앞선 커밋이 없으며, 기능별 이력 또는 후속 작업명을 위해 보존합니다.

| 브랜치 | 기능 영역 | 현재 상태 | 비고 |
|---|---|---|---|
| feat/admin-api | 관리자 API | develop에 포함됨 | 후속 관리자 기능 작업 시 최신 develop에서 새 브랜치 권장 |
| feat/ai-detection-api | AI 탐지 API | develop에 포함됨 | AI 탐지 API 이력 |
| feat/board-api | 게시판 API | develop에 포함됨 | 게시판 기능 이력 |
| feat/cctv-api | CCTV API | develop에 포함됨 | CCTV 관련 기능 이력 |
| feat/db-schema | DB 스키마 | develop에 포함됨 | DB 구조 이력 |
| feat/frontend-llm-report | LLM 리포트 프론트 | develop에 포함됨 | 프론트 리포트 기능 이력 |
| feat/incident-api | 사고 API | develop에 포함됨 | 사고/이벤트 기능 이력 |
| feat/its-integration | ITS 연동 | develop에 포함됨 | ITS 연동 기능 이력 |
| feat/llm-report-api | LLM 리포트 API | develop에 포함됨 | 리포트 API 이력 |
| feat/notification-api | 알림 API | develop에 포함됨 | 알림 기능 이력 |

## 브랜치 정리 정책

### 삭제 금지

아래 조건 중 하나라도 해당하면 삭제하지 않습니다.

| 조건 | 설명 |
|---|---|
| develop에 없는 변경이 있음 | git cherry 결과 + |
| 담당자가 후속 작업에 사용할 예정 | 기능별 예약 브랜치 가능성 |
| 문서 또는 환경 예시 파일 변경 포함 | 팀 운영 기준에 영향 가능 |
| Secret 또는 환경변수 예시 관련 | 검토 후 반영 필요 |

### 삭제 검토 가능

아래 조건을 모두 만족할 때만 삭제를 검토합니다.

| 조건 | 설명 |
|---|---|
| develop에 이미 반영됨 | ahead=0 또는 git cherry 결과 - |
| 담당자 확인 완료 | 팀원이 더 이상 사용하지 않음 |
| GitHub PR 또는 이슈 이력 확인 완료 | 추적 가능 |
| 최신 develop 기준 새 브랜치 생성으로 대체 가능 | 후속 작업에 지장 없음 |

## 향후 권장 브랜치 생성 규칙

새 작업은 기존 오래된 브랜치에서 이어서 하지 않고, 최신 develop에서 새 브랜치를 생성합니다.

| 작업 유형 | 브랜치 예시 |
|---|---|
| 기능 추가 | feat/signup-email-code-verification |
| 버그 수정 | fix/flask-auth-health-check |
| 문서 수정 | docs/update-vm-runtime-guide |
| 저장소 정리 | chore/repo-folder-structure-cleanup |
| 환경 설정 | chore/update-env-examples |

## 현재 우선 확인이 필요한 브랜치

아래 4개는 develop에 없는 변경이 있으므로, Sparse Checkout 적용 전 또는 이후 별도 PR로 반영 여부를 판단합니다.

| 우선순위 | 브랜치 | 확인 포인트 |
|---|---|---|
| 1 | feat/flask-vm-setup | flask-vm/.env.example에 실제 Secret이 없는지 확인 |
| 2 | feat/frontend-integration | frontend-vm/.env.example이 .env 기준과 맞는지 확인 |
| 3 | docs/vm-setup-guide | 현재 VM 구조와 Docker 정책이 최신 기준인지 확인 |
| 4 | docs/mvp-api-spec | 최신 API 구조와 충돌 없는지 확인 |

## 주의 사항

- main이 아니라 develop을 기준으로 판단합니다.
- Docker는 AI-VM에서만 사용합니다.
- 비-AI VM에는 Dockerfile을 다시 추가하지 않습니다.
- 프론트엔드는 DB에 직접 연결하지 않고 Flask API만 호출합니다.
- .env, .env.local, DB Password, JWT Secret, SMTP Password는 Git에 커밋하지 않습니다.
- 브랜치 삭제는 반드시 팀 합의 후 진행합니다.
