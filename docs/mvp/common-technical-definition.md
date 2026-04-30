# STACCATO MVP 공통 기술정의

## 1. 목적

STACCATO MVP는 AI-X 기반 고속도로 정차 차량 탐지 및 통합 관제 시스템의 1차 구현 범위를 정의한다.

MVP의 핵심 목표는 다음과 같다.

- CCTV 영상을 사람이 상시 감시하지 않고 AI 서버가 탐지 보조를 수행한다.
- AI가 감지한 정차 의심 이벤트를 Flask 서버가 사건으로 관리한다.
- 관제자는 모든 CCTV를 직접 보는 것이 아니라 AI가 생성한 이벤트 중심으로 확인한다.
- ITS 데이터는 위험도 판단을 보조하는 외부 데이터로 활용한다.
- LLM은 운영 보고서와 요약 생성을 위한 보조 기능으로 Flask 서버 내부 모듈에서 처리한다.
- 파일은 DB에 직접 저장하지 않고 Docker Volume 기반 storage 경로에 저장한다.

## 2. 서버 구성

STACCATO MVP는 5개 서버 구조를 기준으로 한다.

| 서버 | 기술 | 역할 |
|---|---|---|
| Frontend Server | Next.js | 관제 화면, 로그인 화면, 사건 목록, 보고서 화면 |
| Flask Server | Flask | 메인 백엔드, 인증, DB 접근, API Gateway, Socket.IO, LLM 연동 |
| AI Server | FastAPI | AI-X 영상 분석, 정차 판단, ROI 판별 |
| ITS Server | FastAPI | 날씨, 교통량, 도로정보, 경로 API 연동 |
| DB Server | MySQL 8.0 | 전체 업무 데이터 저장 |

## 3. 핵심 설계 원칙

- Frontend는 Flask Server만 직접 호출한다.
- Flask Server만 DB에 직접 접근한다.
- AI Server는 DB에 직접 접근하지 않는다.
- ITS Server는 DB에 직접 접근하지 않는다.
- AI Server와 ITS Server는 Flask Server에 결과만 반환한다.
- LLM 기능은 Flask Server 내부 모듈에서 처리한다.
- Socket.IO는 영상 프레임이 아니라 이벤트, 상태, 알림만 전송한다.
- 영상, 이미지, 모델, 데이터셋 파일은 DB에 저장하지 않는다.
- 파일은 Docker Volume 기반 storage 디렉터리에 저장하고, DB에는 file_path만 저장한다.
- MVP 단계에서는 Redis, Celery, Kafka를 사용하지 않는다.
- MLOps 고도화는 MVP 이후 단계로 분리한다.

## 4. 개발 환경 기준

| 항목 | 기준 |
|---|---|
| Python | 3.11 |
| Node.js | 20 계열 |
| DB | MySQL 8.0 |
| Container | Docker Compose |
| Backend Package 관리 | requirements.txt |
| Frontend Package 관리 | package.json |
| 환경변수 예시 | .env.example |
| 실제 환경변수 | .env, Git 제외 |

## 5. Git 운영 기준

| 브랜치 | 역할 |
|---|---|
| main | 최종 안정 버전 |
| develop | 개발 통합 브랜치 |
| feat/* | 기능 개발 브랜치 |
| fix/* | 버그 수정 브랜치 |
| docs/* | 문서 작업 브랜치 |
| db/* | DB 스키마 작업 브랜치 |

원칙:

- main, develop에 직접 push하지 않는다.
- 모든 작업은 기능 브랜치에서 진행한다.
- PR 대상은 develop으로 한다.
- 검증 후 Squash and merge를 기본으로 한다.
- merge 후 작업 브랜치는 삭제한다.

## 6. MVP 제외 항목

아래 항목은 MVP 이후 고도화 단계에서 적용한다.

- Redis 기반 비동기 큐
- Celery 기반 학습/분석 Job Worker
- Kafka 기반 이벤트 스트리밍
- AI 모델 자동 재학습 파이프라인
- 모델 Registry
- A/B 모델 배포
- 대규모 CCTV 스트림 병렬 처리
- 운영자 행동 분석
- 고도화된 권한 정책 엔진
