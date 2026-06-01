# STACCATO Current Project State

## 1. 최종 VM 구조

| VM | 역할 | 주소 / 포트 |
|---|---|---|
| Frontend VM | Next.js 관리자 프론트엔드 | 192.168.0.188:3001 |
| Flask VM | Backend API / Worker | 192.168.0.187:5000 |
| AI VM | FastAPI AI 추론 서버 | 192.168.0.186:5001 |
| DB VM | MySQL Database | 192.168.0.190:3306 |

## 2. 현재 서비스 라우팅 기준

### Frontend

- 메인 UI는 `192.168.0.188:3001`에서 실행됩니다.
- Backend API 요청은 `/backend-api` 프록시를 통해 Flask VM으로 전달됩니다.
- Backend 기준 URL은 `http://192.168.0.187:5000`입니다.

### Flask Backend

- Flask API 서버는 `192.168.0.187:5000`에서 실행됩니다.
- Incident API는 `/api/incidents` 하위에 있습니다.
- Report API는 `/api/reports` 하위에 있습니다.
- Realtime/Event API는 Flask 라우트 기준으로 제공됩니다.

### AI Server

- AI FastAPI 서버는 `192.168.0.186:5001`에서 실행됩니다.
- Health endpoint는 `/health`입니다.
- 신고 분석 결과 미디어는 `/report-analysis/{filename}` 경로로 제공됩니다.
- 외부 접근용 AI 미디어 URL은 `AI_PUBLIC_BASE_URL` 기준입니다.

## 3. 점검 후 해결 완료한 항목

### 3.1 Incident API 미구현 문제 해결

프론트엔드는 다음 API를 사용합니다.

- `GET /api/incidents`
- `GET /api/incidents/{id}`
- `PATCH /api/incidents/{id}/status`

기존 Flask에는 `POST /api/incidents`만 있어 목록/상세/상태 변경에서 405 오류가 발생할 수 있었습니다.

현재 상태:

- `GET /api/incidents` 추가 완료
- `GET /api/incidents/{id}` 추가 완료
- `PATCH /api/incidents/{id}/status` 추가 완료
- `PUT /api/incidents/{id}/status` 호환 추가 완료

검증:

- 무토큰 curl 요청 시 401 반환 확인
- 로그인된 프론트 요청 시 200 반환 확인

### 3.2 Frontend build 문제 재검증

현재 develop 기준으로 아래 명령을 검증했습니다.

    npx tsc --noEmit
    npm run build

결과:

- TypeScript 검사 통과
- Next.js production build 성공
- 전체 페이지 build 완료

따라서 기존 점검에서 언급된 build 중단 문제는 현재 develop 기준으로 재현되지 않습니다.

### 3.3 AI / Flask / Frontend 포트 기준 확인

현재 운영 기준은 아래와 같습니다.

| 서비스 | 기준 포트 |
|---|---|
| AI VM | 5001 |
| Flask VM | 5000 |
| Frontend VM | 3001 |
| DB VM | 3306 |

현재 기준에서는 AI 포트를 8001로 변경하지 않습니다.

### 3.4 DB init schema 불일치 수정

기존 `db-vm/init` SQL은 최신 Flask SQLAlchemy 모델과 불일치했습니다.

정리 후 상태:

- Flask 모델 기준 테이블 수: 45
- 최종 init SQL 테이블 수: 45
- 모델 기준 누락 테이블 없음
- 모델 외 extra 테이블 없음
- 구버전 `report_uploads`, `analysis_jobs` 제거
- 기존 구버전 schema SQL은 `archive/*.disabled`로 이동

DB-vm에서 fresh init 검증 완료:

- 임시 DB 생성
- `00_schema_flask_models.sql` 적용
- `02_seed.sql` 적용
- `table_count = 45`
- `cctvs = 1`
- `cctv_rois = 2`
- 임시 DB 삭제 완료

### 3.5 AI 모델 기본값 및 차량 클래스 설정 정리

정리 내용:

- 존재하지 않는 `yolo26n.pt` 기본 fallback 제거
- 실제 존재하는 fallback 모델 경로로 정리
  - `ai-vm/models/yolo11s/best.pt`
  - `ai-vm/models/yolo11n/best.pt`
  - `ai-vm/models/yolo8n/best.pt`
- 기본 차량 클래스에서 `motorcycle` 제거
- MVP 기준 차량 클래스는 `car,bus,truck`으로 통일

운영 모델은 `.env`의 `YOLO_MODEL_PATHS`로 지정합니다.

## 4. 현재 AI 신고 분석 상태

현재 신고 분석 기능은 다음을 지원합니다.

- 신고 첨부 이미지/영상 분석
- annotated image 생성
- annotated video 생성
- 후처리 적용
- `raw_count`
- `filtered_count`
- `incident_candidate_count`
- 정상 차량 초록색 박스 표시
- 위험 후보 차량 빨간색 박스 표시

주의:

현재 후처리는 정차/사고 확정 판단이 아니라 위험 후보 표시입니다.

추가 고도화 방향:

- CCTV 또는 report ROI 기반 위험 영역 판단
- frame index별 bbox 이동량 비교
- 일정 시간 이상 이동량이 낮은 객체를 정차 후보로 판단

## 5. 아직 남은 작업

### 5.1 Frontend에서 AI VM 직접 호출 구조 정리

일부 Next.js API Route는 CCTV 관련 기능에서 AI VM을 직접 호출합니다.

결정 필요:

- 이 구조를 Next.js server-side proxy로 인정하고 문서화
- 또는 `Frontend → Flask → AI` 구조로 변경

### 5.2 CCTV 목록 API 성능 개선

CCTV 목록 조회 시 스트림 탐색을 함께 수행하면 응답이 느려질 수 있습니다.

권장 방향:

- CCTV 목록은 빠르게 반환
- 사용자가 특정 CCTV를 선택했을 때만 stream start/check 수행

### 5.3 `/incidents` 테스트 데이터 정리

현재 incident 목록에는 테스트성 데이터가 포함될 수 있습니다.

예시:

- `LLM-INC-*`
- `테스트 도로`
- `/snapshots/test.jpg`

권장 방향:

- 기본 목록에서 테스트 데이터를 숨김
- 또는 시연/운영 전 테스트 데이터 삭제 여부 결정

### 5.4 pytest 환경 정리

전체 Flask pytest는 MySQL 테스트 DB 환경변수가 필요합니다.

예시:

    export TEST_DATABASE_URL="mysql+pymysql://USER:PASSWORD@192.168.0.190:3306/staccato_test?charset=utf8mb4"

테스트 DB가 없으면 application logic 전에 테스트가 실패할 수 있습니다.

### 5.5 Tracking 표현 정리

실제 외부 tracking 라이브러리를 적용하지 않았다면 문서나 발표에서 특정 tracker를 적용했다고 표현하지 않습니다.

안전한 표현:

    객체 탐지 후 bbox 중심점 이동량을 기반으로 동일 객체의 정차 여부를 추정합니다.

## 6. 현재 기준에서 사용하지 않는 것으로 보는 표현

아래 항목은 현재 기준 사실로 사용하지 않습니다.

- AI server port 8001
- AI local endpoint 127.0.0.1:8000
- yolo26n.pt
- motorcycle MVP class
- report_uploads
- analysis_jobs
- LLM / Chatbot feature/server excluded from final MVP
- separate ITS VM
