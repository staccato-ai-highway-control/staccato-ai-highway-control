# 백엔드 VM 적대적 디버깅 점검 보고서

점검일: 2026-06-08  
점검 범위: `flask-vm` Flask/API 서버만 점검. Frontend 및 AI VM 코드는 수정하지 않음.

> 후속 조치(2026-06-08): 공통 401/403/404/500 응답 계약, 신고/Bug Report/자료실 `allowed_actions`와 소유자 ID, 정규화된 분석 상태, `bbox_metadata`를 백엔드에 적용했다. 아래 본문은 수정 전 위험을 기록한 점검 스냅샷이며, 미해결 항목은 worker 배포, AI URL 통일, migration 및 파일 정책 보강이다.

## 1. 전체 결론

현재 가장 위험한 문제는 인증 여부와 역할/소유권 검증이 서로 분리되어 있다는 점이다. 신고 API는 Bearer 토큰만 있으면 VIEWER도 다른 사용자의 신고를 승인, 반려, 상태 변경, 분석 요청할 수 있다. Bug Report API는 생성, 전체 목록, 상세, 수정, 닫기, 첨부 업로드와 다운로드가 익명으로 열려 있고 생성 시 `reporter_id=None`으로 저장되어 “내 버그리포트”가 구조적으로 비게 된다.

시연 장애 가능성이 가장 높은 흐름은 신고 분석이다. `POST /api/reports/{id}/analyze`는 DB에 `QUEUED` job만 만들며, 이를 처리하는 worker는 Python 파일만 있고 systemd/cron/상시 프로세스 배포 정의가 없다. API는 성공했지만 분석 상태가 영원히 `QUEUED`로 남을 수 있다.

Frontend 오류처럼 보일 수 있는 Backend 문제는 응답 envelope 불일치, 신고 생성 시 첨부파일 강제, 전체 신고 목록의 과도한 공개, 그리고 `/api/reports`와 `/api/reports/my`의 권한 의미 불일치다. 인증 오류도 `{message}`만 반환하여 일반 API의 `{success, error}` 형식과 다르다.

AI 모델 오류처럼 보일 수 있는 Flask relay 문제는 AI 주소 기본값이 `5001`과 `8001`로 분산된 점, CCTV relay의 15초 blocking timeout, 분석 worker 미기동, 그리고 AI 성공 응답이 예상 필드를 포함하지 않으면 job을 다시 `QUEUED`로 되돌리는 판정 로직이다.

## 2. 핵심 문제 목록

| 우선순위 | 문제 | 영향 범위 | 원인 추정 | 확인 파일/위치 | 수정 방향 |
| --- | --- | --- | --- | --- | --- |
| P0 | VIEWER가 신고 상태 변경·승인·반려 가능 | 신고 운영 데이터 전체 | 라우트는 `require_auth`만 사용하고 서비스에 role 검사 없음 | `app/modules/report_upload/routes.py:301-355`, `service.py:1300-1424` | 운영 액션에 `require_roles("SUPER_ADMIN", "CONTROL_ADMIN")` 적용 |
| P0 | 타인의 신고 분석 요청 및 분석 결과 조회 가능 | AI 비용, 개인정보, 분석 결과 | 분석 API가 소유권/관리자 검증 없이 ID만 사용 | `routes.py:373-474`, `service.py:1823-1891,2141-2219` | 모든 분석 API에 report 기반 `_can_manage_report` 검사 |
| P0 | 분석 job이 영구 QUEUED가 될 수 있음 | 신고 분석 시연 전체 | worker 파일은 있으나 배포/주기 실행 정의 없음 | `app/workers/report_analysis_worker.py:10-19`, `deploy/systemd/` | worker systemd timer/service 또는 queue consumer 배포 |
| P0 | Bug Report 수정·닫기·첨부가 익명 공개 | 전체 Bug Report 무결성 | 대부분 라우트에 인증/소유권/role 검사 없음 | `app/modules/bug_report/routes.py:26-88` | 생성 포함 인증 정책 결정, 수정/닫기는 본인 또는 관리자 |
| P0 | Bug Report 생성자가 항상 NULL | 내 버그리포트 기능 | 생성 서비스가 `reporter_id=None` 고정 | `app/modules/bug_report/service.py:66-117` | current_user를 전달하고 reporter_id 저장 |
| P1 | 신고 등록이 첨부파일 없는 요청을 거부 | 텍스트 신고 등록 | 라우트와 서비스가 최소 1개 파일 강제 | `report_upload/routes.py:253-264`, `service.py:983-984` | 요구사항에 맞게 파일 optional 처리 |
| P1 | 신고 목록/상세가 모든 인증 사용자에게 전체 공개 | 개인정보/운영 정보 | 일반 사용자용 scope 필터 없음 | `routes.py:19-53,241-250`, `service.py:787-898` | 일반 사용자는 본인 신고만, 관리자는 전체 |
| P1 | AI VM 기본 URL과 포트가 모듈별로 다름 | 분석/CCTV/미디어 relay | `5001`, `8001` 기본값 중복 | `config.py:44`, `ai_gateway/service.py:18-24`, `cctv/routes.py:182-190`, `ai_relay/service.py:18` | 단일 `AI_VM_BASE_URL`, endpoint path만 분리 |
| P1 | AI 성공 응답이 특정 키가 없으면 다시 QUEUED | 분석 상태 정체 | `status=OK`, `detections`, `count`만 완료로 인정 | `report_upload/service.py:2078-2100` | AI 계약 명시, async job ID/status 처리 분리 |
| P1 | Bug Report 첨부 제한과 경로 검증 없음 | 디스크 고갈/임의 파일 노출 | 확장자·크기 제한 미사용, DB path를 그대로 send_file | `bug_report/service.py:348-473` | 허용 확장자/크기, upload root containment 검증 |
| P1 | 핵심 테이블 migration이 저장소에 없음 | 신규 VM 배포 실패 | Flask-Migrate 초기화만 있고 versions 부재 | `app/extensions.py:109-110`, `docs/db/migrations/` | 신고/버그/AI event 전체 Alembic migration 추가 |
| P1 | 운영 실행도 debug/unsafe Werkzeug 고정 | 운영 안정성/정보 노출 | 환경 분기 없이 debug 활성화 | `run.py:32-41` | 개발 전용 실행과 gunicorn/socketio 운영 실행 분리 |
| P1 | CCTV CRUD와 replay/realtime 조회가 비인증 | 설정 변조/데이터 노출 | auth decorator 미적용 | `cctv/routes.py:328-648`, `replay/routes.py:11-49`, `realtime/routes.py:61-217` | 조회/쓰기 별 권한 정책 적용 |
| P2 | 응답 형식이 모듈마다 다름 | Frontend 예외 처리 | 공통 response/error schema 없음 | `security.py:60-74`, report/bug/relay/replay routes | `{success,data,message,error}` 규약 통일 |
| P2 | 신고 첨부 soft delete 후 실제 파일이 계속 남음 | 저장소 누적 | DB에 `deleted_at`만 기록 | `report_upload/service.py:1130-1170` | 보존 정책 명시 후 비동기 물리 삭제/정합성 작업 |
| P2 | 상태 이력 모델은 있으나 상태 변경 시 기록하지 않음 | 감사 추적 | `ReportStatusHistory` 미사용 | `report_support_models.py:67-87`, `service.py:1300-1424` | 상태 변경 transaction에 history insert |

## 3. API 라우트 점검 결과

| 기능 | 예상 경로 | 실제 경로 | 상태 | 문제 |
| --- | --- | --- | --- | --- |
| Health | `GET /health` | 동일 | 존재 | DB/AI/storage readiness는 확인하지 않는 liveness |
| 신고 모듈 Health | `GET /api/reports/health` | 동일 | 존재 | 무인증, 정적 문자열만 반환 |
| 신고 목록 | `GET /api/reports` | 동일 | 존재 | 인증만 요구, 모든 사용자의 신고 조회 |
| 신고 등록 | `POST /api/reports` | 동일 | 존재 | multipart 전용, 파일 없으면 400 |
| 신고 상세 | `GET /api/reports/{id}` | 동일 | 존재 | 소유권 검사 없음 |
| 신고 수정 | `PATCH /api/reports/{id}` | 동일 | 존재 | 본인/관리자 검사 있음, enum 검증 약함 |
| 신고 삭제 | `DELETE /api/reports/{id}` | 동일 | 존재 | `CANCELLED` soft delete |
| 상태 변경 | `PATCH /api/reports/{id}/status` | 동일 | 존재 | 관리자 role 검사 없음 |
| 승인 | `POST /api/reports/{id}/approve` | 동일 | 존재 | 관리자 role 검사 없음 |
| 반려 | `POST /api/reports/{id}/reject` | 동일 | 존재 | 관리자 role 검사 없음 |
| 첨부 추가 | `POST /api/reports/{id}/attachments` | 동일 | 존재 | 본인/관리자 검사 있음 |
| 첨부 삭제 | `DELETE /api/reports/{id}/attachments/{attachment_id}` | 동일 | 존재 | soft delete만 수행 |
| 첨부 미리보기 | 명시 없음 | `GET /api/reports/attachments/{id}/preview` | 존재 | 본인/관리자 검사 있음 |
| 첨부 다운로드 | 명시 없음 | `GET /api/reports/attachments/{id}/download` | 존재 | 본인/관리자 검사 있음 |
| 분석 요청 | `POST /api/reports/{id}/analyze` | 동일 | 존재 | 소유권/role 검사 없음, queue 등록만 수행 |
| 분석 상태 | `GET /api/reports/{id}/analysis-status` | 동일 | 존재 | 소유권 검사 없음 |
| 분석 목록 | `GET /api/reports/{id}/analysis-jobs` | 동일 | 존재 | 소유권 검사 없음 |
| 분석 상세 | `GET /api/reports/analysis-jobs/{job_id}` | 동일 | 존재 | 소유권 검사 없음 |
| 분석 재시도 | `POST /api/reports/analysis-jobs/{job_id}/retry` | 동일 | 존재 | 본인/관리자 검사 있음, HTTP 요청을 동기로 수행 |
| Bug 목록 | `GET /api/bug-reports` | 동일 | 존재 | 익명 전체 공개 |
| Bug 등록 | `POST /api/bug-reports` | 동일 | 존재 | 익명, reporter_id NULL |
| Bug 내 목록 | `GET /api/bug-reports/my` | 동일 | 존재 | 인증 필요하지만 익명 생성 건은 조회 불가 |
| Bug 상세 | `GET /api/bug-reports/{id}` | 동일 | 존재 | 익명 공개 |
| Bug 수정 | `PATCH /api/bug-reports/{id}` | 동일 | 존재 | 익명 상태 변경까지 가능 |
| Bug 삭제/닫기 | `DELETE /api/bug-reports/{id}` | 동일 | 존재 | 익명으로 CLOSED 가능 |
| Bug 첨부 추가 | `POST /api/bug-reports/{id}/attachments` | 동일 | 존재 | 익명, 크기/확장자 제한 없음 |
| Bug 첨부 다운로드 | 명시 없음 | `GET /api/bug-reports/attachments/{id}/download` | 존재 | 익명 |
| Dashboard | `GET /api/dashboard/summary` | 동일 | 존재 | 인증 필요, DB 오류는 공통 처리 없이 500 |

## 4. 문제별 상세 분석

### 문제 1. 일반 사용자의 신고 운영 권한 상승

* 증상: VIEWER도 임의 신고를 승인, 반려, CLOSED 또는 CONVERTED 상태로 변경할 수 있다.
* 재현 경로: VIEWER 토큰으로 `PATCH /api/reports/1/status`, `POST /api/reports/1/approve`.
* 실제 원인: 라우트가 `require_auth`만 사용하고 서비스 메서드도 `current_user.role`을 검사하지 않는다.
* 관련 파일: `app/modules/report_upload/routes.py`, `app/modules/report_upload/service.py`
* 관련 코드 위치: routes `301-355`, service `1300-1424`
* 왜 위험한가: 시연 데이터가 임의로 사라지거나 상태가 오염되고 감사 추적도 없다.
* 수정 방향: 관리자 전용 decorator와 서비스 방어 검사를 함께 적용하고 상태 transition matrix를 둔다.
* 검증 방법: VIEWER 403, 작성자 일반 사용자 403, CONTROL_ADMIN/SUPER_ADMIN 200 테스트.

### 문제 2. 분석 요청은 성공하지만 처리자가 없다

* 증상: 분석 요청은 201이지만 상태가 계속 `QUEUED`다.
* 재현 경로: `POST /api/reports/{id}/analyze` 후 status polling.
* 실제 원인: 요청 메서드는 job만 commit하며 worker는 수동 실행 파일뿐이다.
* 관련 파일: `app/modules/report_upload/service.py`, `app/workers/report_analysis_worker.py`, `deploy/systemd/`
* 관련 코드 위치: service `2141-2219`, worker `10-19`
* 왜 위험한가: Frontend는 요청 성공을 보고 AI가 느리다고 오판한다.
* 수정 방향: systemd timer 또는 상시 queue worker를 배포하고 stale QUEUED 탐지와 health metric을 추가한다.
* 검증 방법: job 생성 후 제한 시간 내 PROCESSING/COMPLETED/FAILED 전이 확인.

### 문제 3. Bug Report가 익명 공유 문서처럼 동작

* 증상: 인증 없이 모든 버그를 읽고 수정하고 닫고 파일을 추가/다운로드할 수 있다.
* 재현 경로: Authorization 없이 Bug Report 필수 API 호출.
* 실제 원인: `/my` 외 모든 라우트에 `require_auth`가 없다.
* 관련 파일: `app/modules/bug_report/routes.py`, `service.py`
* 관련 코드 위치: routes `26-88`, service `66-117,245-473`
* 왜 위험한가: 데이터 무결성, 개인정보, 디스크 사용량을 외부 요청이 통제한다.
* 수정 방향: 생성 정책을 명시하고 수정/닫기/첨부는 본인 또는 관리자만 허용한다.
* 검증 방법: 무토큰 401, 타 사용자 403, 소유자/관리자 성공.

### 문제 4. AI VM 주소 계약이 세 갈래

* 증상: CCTV는 동작하지만 분석은 실패하거나, 이벤트 미디어 URL만 다른 포트를 가리킨다.
* 재현 경로: 환경변수 없이 실행 후 각 모듈의 생성 URL 비교.
* 실제 원인: `AI_SERVER_URL`은 5001, gateway/cctv/client fallback은 8001, public media는 5001이다.
* 관련 파일: `app/config.py`, `app/modules/ai_gateway/service.py`, `app/modules/cctv/routes.py`, `app/modules/ai_relay/service.py`, `app/clients/ai_client.py`
* 관련 코드 위치: 각각 `44`, `18-24`, `182-190`, `18-22`, `5-6`
* 왜 위험한가: AI 장애처럼 보이지만 Flask가 서로 다른 목적지로 요청한 결과일 수 있다.
* 수정 방향: 필수 `AI_VM_BASE_URL` 하나와 detect/ITS/public media path 설정으로 통일하고 startup validation을 추가한다.
* 검증 방법: 앱 시작 시 최종 endpoint 로그, health/detect/ITS smoke test.

### 문제 5. 신고 및 분석 정보의 수평 권한 누락

* 증상: 로그인만 하면 다른 사용자의 신고 상세와 분석 결과를 ID 순회로 조회할 수 있다.
* 재현 경로: 사용자 A 토큰으로 사용자 B의 report/job ID 조회.
* 실제 원인: 조회 서비스가 current_user를 받지 않는다.
* 관련 파일: `app/modules/report_upload/routes.py`, `service.py`
* 관련 코드 위치: routes `241-250,373-443`, service `882-898,1823-1891`
* 왜 위험한가: 첨부 자체는 막혀도 파일명, 위치, 분석 결과, 위험도 등 민감 metadata가 노출된다.
* 수정 방향: current_user 전달 후 `_can_manage_report`; 목록은 일반 사용자에게 자동 mine scope.
* 검증 방법: 교차 사용자 report/job 조회 403.

### 문제 6. 첨부파일 정책과 저장 정합성 불일치

* 증상: 일반 신고는 파일이 없으면 생성 불가, Bug Report는 파일 종류와 크기 제한 없이 업로드 가능하다.
* 재현 경로: 빈 multipart 신고, 대용량 실행 파일 Bug 첨부.
* 실제 원인: 신고 route에서 files 강제, Bug 서비스는 Config 제한을 사용하지 않는다.
* 관련 파일: `report_upload/routes.py`, `report_upload/service.py`, `bug_report/service.py`, `config.py`
* 관련 코드 위치: `261-262`, `943-950`, `377-420`, `60-69`
* 왜 위험한가: 정상 텍스트 신고 실패와 디스크 고갈이 동시에 발생한다.
* 수정 방향: 용도별 명시 정책, content sniffing, 공통 파일 validator, 파일/DB 보상 transaction.
* 검증 방법: 무첨부 신고, 빈 파일, 이중 확장자, 초과 크기, 저장 실패 rollback 테스트.

## 5. 신고 API 점검 결과

* 첨부파일 없는 신고 등록: 불가. route와 service 양쪽에서 거부한다.
* multipart 안정성: `request.form`과 `files`를 사용하며 여러 파일은 처리한다. Flask 전체 요청 제한은 최대 영상 크기 한 건 기준이라 다중 파일 총량 정책은 불명확하다.
* 필드 검증: `report_type`, `priority`, `upload_purpose`는 임의 문자열을 저장할 수 있다. title도 없으면 자동 제목을 만들어 필수값 오류를 숨긴다.
* 위치 nullable: 빈 값과 누락은 처리한다. `address_raw` JSON 컬럼에 문자열을 저장하는 DB dialect 호환성은 실제 schema 검증이 필요하다.
* 작성자 권한: 수정/삭제/첨부는 본인 또는 관리자. 상세/분석 조회와 분석 요청은 누락.
* 관리자 상태 변경: 관리자만이어야 하지만 현재 모든 ACTIVE 사용자 가능.
* 상태 enum: DB는 문자열이며 create/draft/update/status/analysis에서 사용하는 값 집합이 중앙화되어 있지 않다.
* 분석 요청: job은 즉시 `QUEUED`, 실제 AI 호출은 하지 않는다.
* 실패/재시도: worker 실패는 `FAILED`; retry endpoint는 요청 thread에서 최대 30초 AI 호출을 동기로 수행한다.
* 삭제: `CANCELLED`와 `deleted_at`을 함께 설정하는 soft delete다. 첨부 실제 파일은 남긴다.

## 6. Bug Report API 점검 결과

MVP 익명 API와 인증 `/my`가 충돌한다. 익명 생성은 `reporter_id=None`이므로 로그인 사용자의 “내 버그리포트”에 나타나지 않는다. 수정과 닫기에 작성자 검증이 없고 `status`까지 익명 수정 가능하다. 첨부 nullable 자체는 허용되지만 업로드는 익명이며 `uploaded_by=None`이다. 다운로드 경로는 존재하나 인증과 upload root containment 검증이 없다. severity와 status는 allowlist가 있으나 category는 아무 문자열이나 uppercase 저장하며 길이 초과는 DB 오류가 될 수 있다.

## 7. AI VM Relay 점검 결과

* base URL: `AI_SERVER_URL`, `AI_VM_BASE_URL`, `AI_VM_PUBLIC_BASE_URL`로 분산.
* 연결 실패: detect는 `(False, ai_request_failed)`로 변환, CCTV relay는 502 반환.
* timeout: detect 30초, CCTV 15초. 요청 worker를 그 시간 동안 점유한다.
* CCTV 목록: `GET /api/cctvs?source=its`가 `/traffic/api/cctv`를 relay한다.
* bbox/detection: AI push `POST /api/events`에서 bbox와 첫 detection을 incident payload로 변환한다.
* replay/snapshot: AI 내부 localhost URL 일부만 public base로 치환한다. 그 외 사설 URL은 그대로 Frontend에 전달될 수 있다.
* AI 500/404: detect는 RequestException으로 흡수, CCTV는 502로 변환.
* 빈 JSON/invalid JSON: detect invalid JSON은 parse failure, CCTV invalid JSON은 502. detect가 `{}`를 반환하면 success로 받은 뒤 job이 다시 `QUEUED`가 된다.
* 응답 포맷: relay는 `ok`와 `success`, CCTV는 `success/source/items`, 분석은 `success/job/data`로 일관되지 않다.

## 8. 인증/권한 점검 결과

* Bearer 누락: 401이지만 `{message}`만 반환한다.
* 잘못된 token: 401이며 모든 decode/query 예외를 동일 메시지로 숨긴다.
* 권한 부족: `require_roles` 사용 경로는 403이나 핵심 신고/Bug/CCTV 경로에 적용되지 않았다.
* 작성자 검증: 신고 수정·삭제·첨부에는 존재, 조회·분석 요청에는 없다. Bug에는 없다.
* SUPER_ADMIN 우회: 신고 `_can_manage_report`에서 SUPER_ADMIN/CONTROL_ADMIN을 허용한다.
* VIEWER: 신고 생성뿐 아니라 상태 변경·승인·반려·분석 요청 가능하다. CCTV CRUD도 가능하다.
* 에러 포맷: auth `{message}`, 일반 API `{success,error}`, replay `{success,error_code,message,details}`로 Frontend 공통 처리가 어렵다.
* login_id: JWT subject는 user ID이고 매 요청 DB 조회한다. login_id는 token 발급/식별 핵심값으로 사용되지 않는다.

## 9. 첨부파일/스토리지 점검 결과

* 업로드 디렉토리: 신고와 Bug 모두 `os.makedirs(..., exist_ok=True)`로 생성한다.
* 파일명 충돌: UUID stored filename으로 회피한다.
* 위험 파일명: 신고는 원본 basename 정리 후 UUID 저장, Bug는 `secure_filename` 사용.
* 허용 확장자: 신고는 자체 IMAGE/VIDEO 목록 사용하지만 Config allowlist와 다르다. Bug는 검증 없음.
* 저장 실패 rollback: 두 서비스 모두 DB rollback 및 이미 저장한 파일 삭제를 시도한다.
* DB row만 있고 파일 없음: 신고/Bug 다운로드 모두 404 처리.
* 파일만 삭제되고 row 잔존: 404 처리하나 정합성 복구/청소 작업은 없다.
* 신고 삭제: DB soft delete만 하고 실제 파일은 유지한다.
* Bug download: DB의 `file_path`가 upload root 밖을 가리켜도 그대로 `send_file`한다.
* preview: 신고만 제공하며 확장자/MIME metadata 기반으로 허용한다. 실제 파일 내용 검증은 없다.

## 10. 최우선 수정 제안

1. P0: 신고 운영/분석 권한 고정
   * 파일: `app/modules/report_upload/routes.py`, `service.py`
   * 이유: VIEWER 권한 상승과 수평 접근 차단.
   * 방식: role decorator와 service ownership 이중 검사.
   * 영향: 기존 VIEWER의 관리자 화면 호출은 403으로 바뀜.
   * 검증: role matrix API 테스트.
2. P0: Bug Report 인증 모델 정리
   * 파일: `app/modules/bug_report/routes.py`, `service.py`
   * 이유: 익명 수정/닫기와 reporter_id NULL 제거.
   * 방식: current_user 전달, owner/admin 검사, 읽기 공개 여부 별도 결정.
   * 영향: 기존 익명 호출 계약 변경.
   * 검증: anonymous/owner/other/admin 조합 테스트.
3. P0: 분석 worker 배포
   * 파일: `deploy/systemd/staccato-report-analysis-worker.service`, timer 또는 상시 worker
   * 이유: QUEUED 정체 제거.
   * 방식: 중복 실행 lock과 stale job recovery 포함.
   * 영향: AI 요청 부하가 실제 발생.
   * 검증: queue 생성 후 상태 전이와 재부팅 후 자동 시작.
4. P1: AI 설정 통일
   * 파일: `app/config.py`, `ai_gateway/service.py`, `cctv/routes.py`, `ai_relay/service.py`
   * 이유: 포트/주소 drift 제거.
   * 방식: 필수 base URL과 endpoint config, startup validation.
   * 영향: `.env` 배포 값 확정 필요.
   * 검증: 각 최종 URL 로그와 smoke test.
5. P1: 파일 정책/응답 schema/migration 보강
   * 파일: 두 attachment service, 공통 error handler/schema, Alembic versions
   * 이유: 디스크·보안·Frontend 안정성·신규 배포 보장.
   * 방식: 공통 validator, containment, envelope, 실제 migration.
   * 영향: 잘못된 기존 요청이 명시적 4xx로 변경.
   * 검증: upload edge case와 clean DB upgrade 테스트.

## 11. 검증 체크리스트

현재 점검 환경에는 `python`과 `pytest` 실행 파일이 없어 아래 명령은 실행하지 못했다. 저장소 `requirements.txt`에는 pytest가 선언되어 있다.

### 서버 실행

```bash
cd flask-vm
source .venv/bin/activate
python run.py
```

### Health Check

```bash
curl -i http://127.0.0.1:5000/health
curl -i http://127.0.0.1:5000/api/reports/health
```

### 신고 API

```bash
curl -i http://127.0.0.1:5000/api/reports
curl -i -X POST http://127.0.0.1:5000/api/reports
```

### 인증 필요 API

```bash
curl -i -H "Authorization: Bearer {token}" http://127.0.0.1:5000/api/reports/my
curl -i -X POST -H "Authorization: Bearer {viewer_token}" http://127.0.0.1:5000/api/reports/1/approve
```

### AI VM Relay

```bash
curl -i -H "Authorization: Bearer {token}" http://127.0.0.1:5000/api/dashboard/summary
curl -i http://127.0.0.1:5000/api/realtime/events/preview?limit=5
curl -i "http://127.0.0.1:5000/api/cctvs?source=its&limit=5"
```

### 첨부파일

```bash
curl -i -X POST \
  -H "Authorization: Bearer {token}" \
  -F "files=@test.jpg" \
  http://127.0.0.1:5000/api/reports/1/attachments
```

### 권한 회귀 테스트

```bash
python -m pytest -q \
  tests/test_report_unit.py \
  tests/test_report_analysis_unit.py \
  tests/test_bug_report_routes.py \
  tests/test_cctv_routes.py \
  tests/test_replay_routes.py
```

## 12. 발표/시연 리스크 요약

* Frontend 오류처럼 보이는 경우: API 401/403 envelope 불일치, 무첨부 신고 400, 다른 사용자의 목록이 노출되거나 반대로 `/my` Bug 목록이 비어 있음.
* AI 모델 오류처럼 보이는 경우: worker 미기동으로 QUEUED 정체, Flask가 잘못된 AI 포트 호출, AI 성공 JSON을 Flask가 완료로 인정하지 않음.
* 시연 전 필수 API: `/health`, `/api/reports/health`, 신고 생성/상세/분석/status, `/api/cctvs?source=its`, `/api/realtime/events/preview`, `/api/dashboard/summary`.
* 고정할 환경변수: `DATABASE_URL`, `JWT_SECRET_KEY`, `INTERNAL_API_TOKEN`, 단일 AI VM base URL, `AI_VM_PUBLIC_BASE_URL`, `UPLOAD_BASE_PATH`, `STORAGE_ROOT`, `CORS_ORIGINS`, `SOCKETIO_CORS_ORIGINS`.
* fallback 필요 API: CCTV ITS relay와 dashboard preview는 AI/미디어 장애 시 마지막 정상 DB 데이터 또는 명시적 degraded 상태를 반환해야 한다.
* 솔직하게 설명 가능한 한계: 현재 분석은 요청 즉시 완료가 아니라 queue 기반이며 worker 배포가 필수다. 실시간/미디어 URL은 VM 네트워크 주소 설정에 의존한다.

## 점검 실행 결과

* 정적 파일/라인 기반 점검: 완료.
* 실제 Blueprint URL map 실행 검증: 실행 환경에 `python`이 없어 미수행.
* `pytest`: 실행 환경에 `python` 및 `pytest` 명령이 없어 미수행.
* 후속 코드 변경: API 오류·권한·분석 상태·bbox 응답 계약을 적용하고 회귀 테스트를 추가함.
