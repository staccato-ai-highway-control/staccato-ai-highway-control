# STACCATO 프레임워크 모듈 구조

## 1. 목적

본 문서는 STACCATO 프로젝트의 서버별 폴더 구조와 모듈 작성 기준을 정의한다.

모든 팀원은 기능 개발 시 본 문서의 구조를 기준으로 파일을 생성하고 코드를 작성한다.

---

## 2. Flask Server 구조

Flask Server는 STACCATO의 메인 백엔드 서버다.

역할:

- 인증/권한 처리
- DB 직접 접근
- CCTV/ROI 관리
- 사건 관리
- 알림 관리
- 업로드/보고서 관리
- AI Server 호출
- ITS Server 호출
- LLM API 호출

기준 구조:

```text
flask-server/
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── extensions.py
│   ├── models/
│   │   ├── auth_models.py
│   │   ├── cctv_models.py
│   │   ├── incident_models.py
│   │   ├── report_models.py
│   │   ├── notification_models.py
│   │   ├── its_models.py
│   │   └── mlops_models.py
│   ├── routes/
│   │   ├── health_routes.py
│   │   ├── auth_routes.py
│   │   ├── cctv_routes.py
│   │   ├── incident_routes.py
│   │   ├── report_routes.py
│   │   └── notification_routes.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── cctv_service.py
│   │   ├── incident_service.py
│   │   ├── report_service.py
│   │   └── notification_service.py
│   ├── clients/
│   │   ├── ai_client.py
│   │   ├── its_client.py
│   │   └── llm_client.py
│   └── utils/
│       ├── security.py
│       ├── response.py
│       ├── file_storage.py
│       └── validators.py
├── requirements.txt
├── Dockerfile
└── run.py
```

---

## 3. Flask 모듈별 책임

| 폴더 | 역할 |
|---|---|
| `models/` | DB 테이블과 연결되는 SQLAlchemy 모델 |
| `routes/` | HTTP 요청/응답 처리 |
| `services/` | 실제 비즈니스 로직 처리 |
| `clients/` | AI Server, ITS Server, LLM API 등 외부 호출 |
| `utils/` | 공통 유틸리티 |
| `config.py` | 환경변수 및 설정 |
| `extensions.py` | db, cors, socketio 등 Flask 확장 초기화 |

핵심 원칙:

```text
Route는 얇게, Service는 두껍게 작성한다.
```

---

## 4. models 작성 기준

`models/`는 DB 테이블과 연결되는 SQLAlchemy 모델을 작성하는 위치다.

| 모델 파일 | 담당 테이블 |
|---|---|
| `auth_models.py` | users, signup_requests, security_logs |
| `cctv_models.py` | cctvs, cctv_rois |
| `incident_models.py` | incidents, detection_logs, incident_snapshots, incident_status_histories, incident_memos |
| `report_models.py` | report_uploads, report_attachments, llm_reports |
| `notification_models.py` | notifications, notification_deliveries |
| `its_models.py` | its_weather_snapshots, its_traffic_snapshots, its_risk_scores, external_api_logs |
| `mlops_models.py` | ai_models, ai_model_versions, training_datasets, training_jobs |

작성 원칙:

- DB 컬럼명과 모델 필드명은 동일하게 유지한다.
- 모델에는 복잡한 비즈니스 로직을 넣지 않는다.
- 응답 변환이 필요한 경우 `to_dict()` 또는 `to_public_dict()`를 사용한다.
- 비밀번호, 토큰, 비밀값은 응답에 포함하지 않는다.
- DB 접근 로직은 `services/`에서 처리한다.

---

## 5. routes 작성 기준

`routes/`는 HTTP 요청과 응답만 담당한다.

Route에서 하는 일:

- request body 읽기
- query parameter 읽기
- Service 호출
- JSON 응답 반환
- HTTP Status Code 반환

Route에서 하지 말아야 할 일:

- 복잡한 DB 처리
- 긴 비즈니스 로직
- 외부 API 직접 호출
- 파일 저장 상세 처리

---

## 6. services 작성 기준

`services/`는 실제 비즈니스 로직을 담당한다.

예시:

- 회원가입 처리
- 로그인 처리
- CCTV 등록
- ROI 등록
- 사건 상태 변경
- 알림 생성
- 보고서 생성
- AI 분석 요청
- ITS 위험도 계산 요청

Service에서 DB 접근을 처리한다.

---

## 7. clients 작성 기준

`clients/`는 외부 서버 호출만 담당한다.

| 파일 | 역할 |
|---|---|
| `ai_client.py` | AI Server 호출 |
| `its_client.py` | ITS Server 호출 |
| `llm_client.py` | LLM API 호출 |

중요 원칙:

- Frontend는 AI/ITS/LLM을 직접 호출하지 않는다.
- Flask Server가 중간에서 호출한다.
- clients는 DB 저장을 하지 않는다.
- clients는 외부 응답을 받아 Service에 반환한다.

---

## 8. AI Server 구조

```text
ai-server/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── routers/
│   │   ├── health_router.py
│   │   └── detection_router.py
│   ├── services/
│   │   ├── detection_service.py
│   │   ├── roi_service.py
│   │   └── snapshot_service.py
│   ├── schemas/
│   │   └── detection_schema.py
│   └── utils/
│       ├── image_utils.py
│       └── video_utils.py
├── requirements.txt
└── Dockerfile
```

AI Server 원칙:

- 영상/이미지 분석만 담당한다.
- DB에 직접 접근하지 않는다.
- 사건 생성은 Flask Server가 담당한다.
- 알림 생성도 Flask Server가 담당한다.

---

## 9. ITS Server 구조

```text
its-server/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── routers/
│   │   ├── health_router.py
│   │   └── its_router.py
│   ├── services/
│   │   ├── weather_service.py
│   │   ├── traffic_service.py
│   │   ├── road_service.py
│   │   └── risk_score_service.py
│   ├── clients/
│   │   └── its_api_client.py
│   ├── schemas/
│   │   └── its_schema.py
│   └── utils/
│       └── normalize.py
├── requirements.txt
└── Dockerfile
```

ITS Server 원칙:

- 외부 ITS 데이터를 호출한다.
- 데이터를 정규화한다.
- 위험도 보조 데이터를 계산한다.
- DB 저장은 Flask Server가 담당한다.

---

## 10. Frontend 구조

```text
frontend-server/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── login/
│   ├── dashboard/
│   ├── cctvs/
│   ├── incidents/
│   └── reports/
├── components/
│   ├── common/
│   ├── layout/
│   ├── auth/
│   ├── cctv/
│   ├── incident/
│   └── report/
├── features/
│   ├── auth/
│   ├── cctv/
│   ├── incident/
│   ├── notification/
│   └── report/
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   └── socket.ts
├── types/
│   ├── auth.ts
│   ├── cctv.ts
│   ├── incident.ts
│   └── report.ts
├── public/
├── package.json
└── Dockerfile
```

Frontend 원칙:

- Flask API만 호출한다.
- AI Server, ITS Server 직접 호출 금지.
- API URL은 환경변수 기준으로 관리한다.
- 공통 API 호출은 `lib/api.ts`에 모은다.
- 타입은 `types/`에 분리한다.
