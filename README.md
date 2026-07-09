# STACCATO
<img width="2166" height="726" alt="STACCATO 프로젝트 배너" src="https://github.com/user-attachments/assets/ef215914-e5cc-488a-abaf-7aa5f5210fbf" />

STACCATO는 고속도로 CCTV 영상에서 차량을 탐지하고 추적하여, 갓길 정차와 급감속 등 위험 징후를 이벤트로 생성하고 관제 화면에서 확인할 수 있도록 지원하는 AI 기반 관제 시스템입니다.


## 서비스 및 시연

| 구분 | 링크 |
|---|---|
| 서비스 접속 | [STACCATO 서비스 바로가기](https://mbc-sw.iptime.org:3221/) |
| 시연 영상 | [YouTube에서 STACCATO 시연 영상 보기](https://youtu.be/l2xOOqAfufo) |
| 발표 자료 | [2조-STACCATO 최종.pptx](https://github.com/user-attachments/files/29840629/2.-STACCATO.pptx) |


> 🎬 [STACCATO 최종 시연 영상 바로가기](https://youtu.be/l2xOOqAfufo)

> 현재 시연·개발 환경은 자체서명 인증서를 사용하므로 브라우저에서 보안 경고가 표시될 수 있습니다.

> 최종 MVP 범위 상세 문서: [`docs/mvp/final-mvp-scope.md`](docs/mvp/final-mvp-scope.md)

## 최종 MVP 개요

STACCATO는 고속도로 CCTV 기반 차량 탐지, 위험 상황 판단, 이벤트 생성, 실시간 관제 연동을 지원하는 AI 기반 관제 시스템입니다.

최종 MVP 핵심 기능:

- YOLOv11 기반 차량 탐지
- Bbox 중심점 이동량 기반 정차 차량 추정
- ROI 및 Rule Engine 기반 이상 이벤트 탐지
- Flask API Gateway 및 MySQL 메타데이터 저장
- Socket.IO 기반 실시간 알림
- 관제 화면, 신고 등록·분석, 회원가입·로그인, 마이페이지
- Snapshot 및 MP4 Replay 메타데이터 연동

최종 MVP 제외 범위:

- 지도 API 연동
- GPS 기반 위치 표시
- LLM 및 챗봇 기능
- Docker Compose 기반 통합 배포
- 강화학습 및 자동 재학습

---


## 현재 운영 기준

현재 프로젝트 실행 기준은 VM 분리 구조입니다.

| 서버 | 실행 환경 |
|---|---|
| DB-VM | MySQL 직접 설치 |
| FLASK-VM | Python 가상환경 |
| FRONTEND-VM | Node.js / npm |
| AI VM | FastAPI 기반 AI 추론 서비스 |

자세한 서버 세팅 기준은 `docs/infra` 문서를 참고합니다.

- `docs/infra/vm-server-status.md`
- `docs/infra/db-vm-setup.md`
- `docs/infra/flask-vm-setup.md`
- `docs/infra/frontend-vm-setup.md`
- `docs/infra/env-guide.md`
- `docs/infra/repository-cleanup-policy.md`

주의사항:

- `.env`, `.env.local`, `.venv`, `node_modules`는 Git에 올리지 않습니다.
- 현재 실행 기준은 VM 분리 구조이며, Docker Compose 기반 통합 실행은 사용하지 않습니다.
- `DB VM`, `Flask VM`, `Frontend VM`, `AI VM`은 각각 분리된 VM 기준으로 운영합니다.
- 루트 `docker-compose.yml`과 비-AI VM의 Dockerfile은 삭제되었습니다.
- 실제 서버 실행 상태, DB 데이터, 설치된 패키지는 Git pull만으로 복제되지 않습니다.

---

## 사용자 및 운영 문서

STACCATO의 사용자 사용법, 관리자 운영 방법, 최종 릴리즈 검증 결과는 아래 문서를 참고합니다.

| 문서 | 설명 |
|---|---|
| [사용자 매뉴얼](docs/STACCATO_USER_MANUAL.md) | 서비스 접속, 로그인, 이벤트 조회, 영상 확인, 실시간 알림 확인 방법 |
| [관리자 매뉴얼](docs/STACCATO_ADMIN_MANUAL.md) | 이벤트 관리, 사용자 신고 확인, 운영 점검 항목 |
| [릴리즈 체크리스트](docs/STACCATO_RELEASE_CHECKLIST.md) | 최종 MVP 릴리즈 전 검증 결과 |
| [운영 문서](docs/operations/ai-vm-control.md) | AI VM 서비스 제어 및 운영 참고 문서 |
| [인프라 문서](docs/infra/vm-server-status.md) | VM 분리 구조와 서버 상태 기준 |

## 기본 사용 흐름

1. 브라우저에서 STACCATO 서비스에 접속합니다.
2. 계정으로 로그인합니다.
3. 대시보드 또는 관제 화면에서 이벤트 목록을 확인합니다.
4. 이벤트 상세 화면에서 스냅샷, 탐지 정보, 영상을 확인합니다.
5. 필요한 경우 이벤트 영상을 다운로드합니다.
6. 실시간 알림 영역에서 신규 이벤트 발생 여부를 확인합니다.


