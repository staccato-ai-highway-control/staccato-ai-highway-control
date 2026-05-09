# STACCATO MVP API 규칙

## 1. 기본 원칙

- 모든 외부 API는 Flask Server를 통해 제공한다.
- Frontend는 Flask Server의 REST API와 Socket.IO 이벤트만 사용한다.
- API 응답은 JSON을 기본으로 한다.
- 인증이 필요한 API는 JWT Bearer Token을 사용한다.
- Frontend는 AI Server와 ITS Server를 직접 호출하지 않는다.

## 2. 기본 URL

로컬 개발 기준:

| 서버 | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Flask API | http://localhost:5000 |
| AI Server | http://localhost:8001 |
| ITS Server | http://localhost:8002 |
| MySQL | localhost:3307 |

Docker 내부 기준:

| 대상 | URL |
|---|---|
| DB | db-server:3306 |
| AI Server | http://192.168.0.186:8001 |
| ITS Server | http://its-server:8002 |

## 3. 응답 형식

성공 응답 기본 형태:

{
  "message": "Success message",
  "data": {}
}

실패 응답 기본 형태:

{
  "message": "Error message"
}

## 4. HTTP Status Code

| 코드 | 의미 |
|---|---|
| 200 | 조회/처리 성공 |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 |
| 401 | 인증 실패 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 409 | 중복 또는 상태 충돌 |
| 500 | 서버 오류 |

## 5. 인증 헤더

인증이 필요한 API는 다음 헤더를 사용한다.

Authorization: Bearer <access_token>

## 6. MVP API 그룹

| 그룹 | Prefix | 설명 |
|---|---|---|
| Health | /health | 서버 상태 확인 |
| Auth | /auth | 회원가입, 로그인, 내 정보 |
| Admin Auth | /auth/signup-requests | 회원가입 승인/거절 |
| User | /users | 사용자 관리 |
| CCTV | /cctvs | CCTV 관리 |
| ROI | /cctvs/{id}/rois | ROI 관리 |
| Incident | /incidents | 사건 관리 |
| Detection | /detections | AI 탐지 결과 |
| Notification | /notifications | 알림 |
| Report | /reports | 보고서 |
| Upload | /uploads | 파일 업로드 |
| LLM | /llm | 보고서 요약/생성 |
| MLOps | /mlops | 모델/학습 관리, 고도화 단계 |

## 7. 네이밍 규칙

- URL은 복수 명사를 사용한다.
- Python 변수는 snake_case를 사용한다.
- JSON 필드도 snake_case를 사용한다.
- DB 컬럼도 snake_case를 사용한다.

## 8. 금지 사항

- Frontend에서 AI Server 직접 호출 금지
- Frontend에서 ITS Server 직접 호출 금지
- API Key를 Frontend 코드에 직접 포함 금지
- DB 접속 정보는 Frontend에 노출 금지
