# STACCATO MVP 기능 범위

## 1. MVP 목표

MVP는 AI 기반 도로 위험 탐지 시스템의 핵심 흐름을 동작 가능한 수준으로 구현한다.

핵심 흐름:

1. 사용자가 로그인한다.
2. 관리자가 CCTV와 ROI를 등록한다.
3. AI Server가 정차 차량 후보를 탐지한다.
4. Flask Server가 탐지 결과를 사건으로 저장한다.
5. 관제자는 사건 목록과 상세를 확인한다.
6. 사건 상태를 변경하고 조치한다.
7. 필요한 경우 보고서를 생성한다.
8. 알림을 통해 중요한 사건을 실시간으로 확인한다.

## 2. MVP 포함 기능

| 영역 | 기능 |
|---|---|
| Auth | 회원가입, 로그인, 내 정보 조회, 관리자 승인 |
| User | 사용자 목록, 권한 확인 |
| CCTV | CCTV 등록, 조회, 수정, 비활성화 |
| ROI | ROI 등록, 조회, 수정, 비활성화 |
| AI Detection | 정차 차량 후보 탐지 API |
| Incident | 사건 생성, 목록, 상세, 상태 변경 |
| Notification | 실시간 알림, 읽음 처리 |
| Upload | 이미지/영상 업로드, 분석 요청 |
| Report | 사건 보고서 생성/조회 |
| ITS | 날씨/교통량/도로정보 위험도 보조 |
| LLM | 사건 요약 및 보고서 초안 생성 |

## 3. MVP DB 1차 적용 완료

현재 적용된 Core DB 테이블:

- users
- signup_requests
- email_verifications
- security_logs
- cctvs
- cctv_rois
- incidents
- detection_logs
- incident_snapshots
- notifications

## 4. MVP DB 후속 확장 필요

추가 예정 테이블:

- incident_status_histories
- incident_memos
- report_uploads
- report_attachments
- analysis_jobs
- llm_reports
- its_weather_snapshots
- its_traffic_snapshots
- its_risk_scores
- notification_deliveries
- ai_models
- ai_model_versions
- training_datasets
- training_jobs
- external_api_logs

## 5. MVP 제외 기능

아래는 고도화 단계로 분리한다.

- AI 모델 자동 재학습
- 데이터셋 자동 버전관리
- 모델 Registry
- 운영 모델 롤백
- Redis/Celery 기반 비동기 작업 큐
- Kafka 이벤트 스트리밍
- 모바일 Push
- 대규모 CCTV 병렬 관제
- 운영 통계 대시보드 고도화

## 6. 우선 개발 순서

| 순서 | 브랜치 | 작업 |
|---:|---|---|
| 1 | db/core-schema | 핵심 DB 스키마, 완료 |
| 2 | feat/auth | 회원가입/로그인, 완료 |
| 3 | docs/mvp-technical-definition | MVP 공통 기준 문서화 |
| 4 | db/mvp-schema-extension | MVP 누락 DB 확장 |
| 5 | feat/auth-admin | 회원 승인/거절 |
| 6 | feat/cctv-roi | CCTV/ROI 관리 |
| 7 | feat/incident | 사건 관리 |
| 8 | feat/notification | 실시간 알림 |
| 9 | feat/ai-detection-api | AI 탐지 API 연동 |
| 10 | feat/report-upload | 업로드/분석 요청 |
| 11 | feat/llm-report | LLM 보고서 |
