# STACCATO MVP 기능 및 API 명세 문서

본 문서는 STACCATO 프로젝트의 MVP 기준 기능 범위와 서버별 API 역할을 정리한다.

STACCATO는 AI 기반 고속도로 정차 차량 탐지 및 교통 관제 시스템이며, MVP 단계에서는 관리자 웹 화면에서 이상상황을 확인하고, CCTV 및 AI 탐지 결과를 기반으로 보고서를 생성하는 흐름을 목표로 한다.

---

## 1. MVP 목표

MVP의 목표는 최종 시연에서 최소한의 핵심 기능이 하나의 흐름으로 동작하는 것이다.

MVP 핵심 흐름은 다음과 같다.

```text
사용자 로그인
    ↓
관리자 대시보드 접속
    ↓
CCTV / 이상상황 목록 확인
    ↓
정차 차량 또는 위험 상황 확인
    ↓
상세 정보 조회
    ↓
LLM 기반 보고서 생성
    ↓
관리자 확인 및 처리
```

---

## 2. MVP 포함 기능

| 구분      | 기능         | 설명                       |
| ------- | ---------- | ------------------------ |
| 인증      | 로그인        | 관리자 또는 사용자 로그인           |
| 인증      | 회원가입       | 사용자 계정 생성                |
| 인증      | JWT 인증     | 로그인 후 API 요청 인증          |
| 대시보드    | 현황 요약      | CCTV, 이상상황, 신고, 알림 요약    |
| CCTV    | CCTV 목록 조회 | 등록된 CCTV 목록 확인           |
| CCTV    | CCTV 상세 조회 | CCTV 위치 및 영상 정보 확인       |
| 이상상황    | 이상상황 목록 조회 | 정차 차량, 갓길 정차 등 이벤트 조회    |
| 이상상황    | 이상상황 상세 조회 | 특정 이벤트 상세 정보 확인          |
| 이상상황    | 상태 변경      | 접수, 처리중, 완료 등 상태 변경      |
| AI 탐지   | 탐지 결과 조회   | AI 서버의 정차 차량 탐지 결과 확인    |
| ITS 연동  | 교통 이벤트 조회  | ITS API 기반 교통 이벤트 데이터 확인 |
| LLM 보고서 | 보고서 생성     | 이상상황 데이터를 기반으로 보고서 생성    |
| 알림      | 알림 목록 조회   | 이상상황 발생 알림 확인            |
| 관리자     | 회원 승인      | 회원가입 요청 승인 또는 거절         |

---

## 3. MVP 제외 기능

MVP 단계에서는 아래 기능을 우선순위에서 제외하거나 고도화 단계로 분리한다.

| 기능                  | 처리 방향  |
| ------------------- | ------ |
| 실시간 WebSocket 전체 구현 | 고도화 단계 |
| 정교한 권한 그룹 관리        | 고도화 단계 |
| 대용량 영상 저장 및 스트리밍    | 고도화 단계 |
| AI 모델 자동 재학습        | 고도화 단계 |
| 통계 분석 고도화           | 고도화 단계 |
| 외부 기관용 API 공개       | 고도화 단계 |
| 모바일 앱               | 제외     |

---

## 4. 서버별 MVP 역할

| 서버          |              IP | MVP 역할                       |
| ----------- | --------------: | ---------------------------- |
| FRONTEND-VM | `192.168.0.188` | 관리자 웹 UI, 화면 구성, API 호출      |
| FLASK-VM    | `192.168.0.187` | 메인 API, 인증, DB 연동, AI/ITS 중계 |
| DB-VM       | `192.168.0.190` | 사용자, CCTV, 이상상황, 보고서 데이터 저장  |
| AI-VM       | `192.168.0.186` | 정차 차량 탐지 결과 생성               |
| ITS-VM      | `192.168.0.189` | ITS / CCTV / 교통 이벤트 데이터 연동   |

---

## 5. API 기본 구조

MVP API는 Flask 서버를 기준으로 구성한다.

```
Frontend
192.168.0.188:3001
    ↓
Flask API
192.168.0.187:5000
    ↓
DB / AI / ITS
```

프론트엔드는 DB, AI, ITS 서버에 직접 요청하지 않는다.<br>
모든 요청은 Flask API 서버를 통해 처리한다.

## 6. 인증 API

**6-1. 회원가입**

```POST /auth/signup```

요청 예시:

```
{
  "email": "user@example.com",
  "password": "password123",
  "name": "홍길동"
}
```

응답 예시:

```
{
  "message": "회원가입 요청이 완료되었습니다.",
  "status": "PENDING"
}
```
**6-2. 로그인**

```POST /auth/login```

요청 예시:

```
{
  "email": "user@example.com",
  "password": "password123"
}
```

응답 예시:

```
{
  "access_token": "jwt_token",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "홍길동",
    "role": "ADMIN"
  }
}
```

## 6-3. 내 정보 조회

```GET /auth/me```

Header:

```Authorization: Bearer {access_token}```

응답 예시:

```
{
  "id": 1,
  "email": "user@example.com",
  "name": "홍길동",
  "role": "ADMIN"
}
```
## 7. CCTV API
**7-1. CCTV 목록 조회**
```GET /cctvs```

응답 예시:

```
[
  {
    "id": 1,
    "name": "경부고속도로 CCTV-001",
    "location": "서울 방향",
    "road_name": "경부고속도로",
    "status": "ACTIVE",
    "stream_url": "http://example.com/cctv/001"
  }
]
```

**7-2. CCTV 상세 조회**
```GET /cctvs/{cctv_id}```

응답 예시:

```
{
  "id": 1,
  "name": "경부고속도로 CCTV-001",
  "location": "서울 방향",
  "latitude": 37.1234,
  "longitude": 127.1234,
  "status": "ACTIVE",
  "stream_url": "http://example.com/cctv/001"
}
```

## 8. 이상상황 API

**8-1. 이상상황 목록 조회**

```GET /incidents```

응답 예시:

```
[
  {
    "id": 1,
    "type": "STOPPED_VEHICLE",
    "title": "주행 차로 정차 차량 감지",
    "location": "경부고속도로 서울 방향",
    "status": "OPEN",
    "risk_level": "HIGH",
    "created_at": "2026-05-08T10:30:00"
  }
]
```
**8-2. 이상상황 상세 조회**
```GET /incidents/{incident_id}```

응답 예시:

```
{
  "id": 1,
  "type": "STOPPED_VEHICLE",
  "title": "주행 차로 정차 차량 감지",
  "description": "AI 탐지 결과 주행 차로에 정차 차량이 감지되었습니다.",
  "location": "경부고속도로 서울 방향",
  "status": "OPEN",
  "risk_level": "HIGH",
  "cctv_id": 1,
  "created_at": "2026-05-08T10:30:00"
}
```

**8-3. 이상상황 상태 변경**
```PATCH /incidents/{incident_id}/status```

요청 예시:

```
{
  "status": "IN_PROGRESS"
}
```

응답 예시:

```
{
  "message": "상태가 변경되었습니다.",
  "status": "IN_PROGRESS"
}
```

## 9. AI 탐지 API
**9-1. 탐지 결과 조회**

```GET /ai/detections```

응답 예시:

```
[
  {
    "id": 1,
    "cctv_id": 1,
    "detected_type": "STOPPED_VEHICLE",
    "confidence": 0.92,
    "image_url": "/uploads/detections/1.jpg",
    "created_at": "2026-05-08T10:30:00"
  }
]
```

**9-2. 특정 CCTV 탐지 결과 조회**
```GET /ai/detections?cctv_id=1```

응답 예시:

```
[
  {
    "id": 1,
    "cctv_id": 1,
    "detected_type": "STOPPED_VEHICLE",
    "confidence": 0.92,
    "risk_level": "HIGH"
  }
]
```

## 10. ITS API
**10-1. 교통 이벤트 목록 조회**
```GET /its/events```

응답 예시:

```
[
  {
    "id": 1,
    "event_type": "ACCIDENT",
    "road_name": "경부고속도로",
    "location": "서울 방향",
    "message": "교통 사고 발생",
    "created_at": "2026-05-08T10:20:00"
  }
]
```

## 11. LLM 보고서 API
**11-1. 보고서 생성**
```POST /llm-reports```

요청 예시:

```
{
  "incident_id": 1
}
```

응답 예시:

```
{
  "id": 1,
  "incident_id": 1,
  "title": "정차 차량 감지 보고서",
  "summary": "경부고속도로 서울 방향에서 주행 차로 정차 차량이 감지되었습니다.",
  "content": "AI 탐지 결과 및 CCTV 정보를 기반으로 생성된 보고서입니다.",
  "created_at": "2026-05-08T10:35:00"
}
```

**11-2. 보고서 목록 조회**
```GET /llm-reports```

응답 예시:

```
[
  {
    "id": 1,
    "incident_id": 1,
    "title": "정차 차량 감지 보고서",
    "created_at": "2026-05-08T10:35:00"
  }
]
```

**11-3. 보고서 상세 조회**
```GET /llm-reports/{report_id}```

응답 예시:

```
{
  "id": 1,
  "incident_id": 1,
  "title": "정차 차량 감지 보고서",
  "summary": "경부고속도로 서울 방향에서 주행 차로 정차 차량이 감지되었습니다.",
  "content": "관리자 확인이 필요한 위험 상황입니다.",
  "created_at": "2026-05-08T10:35:00"
}
```

## 12. 알림 API
**12-1. 알림 목록 조회**
```GET /notifications```

응답 예시:

```
[
  {
    "id": 1,
    "type": "INCIDENT",
    "message": "정차 차량이 감지되었습니다.",
    "is_read": false,
    "created_at": "2026-05-08T10:30:00"
  }
]
```

**12-2. 알림 읽음 처리**
```PATCH /notifications/{notification_id}/read```

응답 예시:

```
{
  "message": "알림을 읽음 처리했습니다."
}
```

## 13. 관리자 API
**13-1. 회원가입 요청 목록 조회**
```GET /admin/signup-requests```

응답 예시:

```
[
  {
    "id": 1,
    "email": "user@example.com",
    "name": "홍길동",
    "status": "PENDING",
    "created_at": "2026-05-08T09:00:00"
  }
]
```

## 13-2. 회원 승인
```PATCH /admin/users/{user_id}/approve```

응답 예시:

```
{
  "message": "회원이 승인되었습니다.",
  "status": "ACTIVE"
}
```

**13-3. 회원 거절**
```PATCH /admin/users/{user_id}/reject```


응답 예시:

```
{
  "message": "회원가입 요청이 거절되었습니다.",
  "status": "REJECTED"
}
```

## 14. MVP 화면 구성

| 화면      | 경로                       | 설명              |
| ------- | ------------------------ | --------------- |
| 메인      | `/`                      | 서비스 소개 또는 진입 화면 |
| 로그인     | `/login`                 | 사용자 로그인         |
| 회원가입    | `/signup`                | 사용자 회원가입        |
| 대시보드    | `/dashboard`             | 전체 현황 요약        |
| CCTV    | `/cctvs`                 | CCTV 목록 및 관제    |
| 이상상황    | `/incidents`             | 이상상황 목록         |
| 이상상황 상세 | `/incidents/{id}`        | 이상상황 상세 정보      |
| 보고서     | `/llm-reports`           | LLM 보고서 목록      |
| 보고서 상세  | `/llm-reports/{id}`      | LLM 보고서 상세      |
| 알림      | `/notifications`         | 알림 목록           |
| 관리자     | `/admin/signup-requests` | 회원가입 승인 관리      |

## 15. MVP 우선순위

| 우선순위 | 기능           | 이유            |
| ---: | ------------ | ------------- |
|    1 | 로그인 / 인증     | 모든 관리자 기능의 기준 |
|    2 | DB 테이블 설계    | API와 화면의 기반   |
|    3 | 대시보드         | 시연 첫 화면       |
|    4 | CCTV 목록      | 관제 시스템 핵심     |
|    5 | 이상상황 목록 / 상세 | MVP 핵심 기능     |
|    6 | AI 탐지 결과 조회  | 프로젝트 핵심 차별점   |
|    7 | LLM 보고서 생성   | 보고서 자동화 기능    |
|    8 | 알림           | 이상상황 인지 보조    |
|    9 | 관리자 회원 승인    | 운영 관리 기능      |
