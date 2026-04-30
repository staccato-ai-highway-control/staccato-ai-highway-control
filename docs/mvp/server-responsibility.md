# STACCATO MVP 서버별 책임 정의

## 1. 전체 서버 흐름

Frontend Server
→ Flask Server
→ AI Server / ITS Server / External LLM API / DB Server

Frontend는 Flask Server만 직접 호출한다.  
Flask Server는 시스템의 중심 백엔드 서버이며 DB 접근, 인증, 권한, 사건 관리, 알림, 보고서 생성을 담당한다.

## 2. Frontend Server

### 기술

- Next.js
- TypeScript
- Tailwind CSS

### 책임

- 로그인/회원가입 화면
- 관제 대시보드 화면
- CCTV/ROI 관리 화면
- 사건 목록/상세 화면
- 실시간 알림 표시
- 보고서 조회 화면
- 관리자 승인 화면

### 금지 사항

- DB 직접 접근 금지
- AI Server 직접 호출 금지
- ITS Server 직접 호출 금지
- 비밀 API Key 저장 금지

## 3. Flask Server

### 기술

- Flask
- Flask-SQLAlchemy
- Flask-SocketIO
- PyMySQL
- PyJWT

### 책임

- 인증/회원가입/로그인
- 관리자 승인/거절
- 사용자 권한 확인
- DB 직접 접근
- CCTV/ROI 관리
- 사건 생성/조회/상태 변경
- AI Server 호출
- ITS Server 호출
- LLM API 호출
- Socket.IO 이벤트 송신
- 파일 메타데이터 관리
- 보안 로그 기록

### 중요 원칙

Flask Server만 DB에 직접 접근한다.

## 4. AI Server

### 기술

- FastAPI
- 향후 YOLO/OpenCV/PyTorch 확장

### 책임

- CCTV 영상 또는 업로드 영상 분석
- 정차 차량 후보 탐지
- ROI 영역 판별
- 정차 지속 시간 판단
- 탐지 결과 JSON 반환
- 스냅샷 후보 경로 반환

### 금지 사항

- DB 직접 접근 금지
- 사용자 인증 처리 금지
- 사건 상태 직접 변경 금지

## 5. ITS Server

### 기술

- FastAPI
- requests

### 책임

- 외부 ITS API 호출
- 날씨 데이터 정규화
- 교통량 데이터 정규화
- 도로 상태 데이터 정규화
- 경로/위치 기반 위험도 보조 데이터 제공

### ITS 제약 기준

- 1회 호출 최대 처리 시간: 3분 3초, 183초
- 1회 요청 기준 3,000건
- 최대 처리 가능 기준 30,000건

### 금지 사항

- DB 직접 접근 금지
- 사건 상태 직접 변경 금지
- AI 탐지 판단 직접 수행 금지

## 6. DB Server

### 기술

- MySQL 8.0

### 책임

- 사용자/권한 데이터 저장
- CCTV/ROI 데이터 저장
- 사건/탐지 로그 저장
- 알림 데이터 저장
- 보고서/업로드 메타데이터 저장
- MLOps 메타데이터 저장

### 금지 사항

- 이미지/영상/모델 파일 원본 저장 금지
- 대용량 바이너리 직접 저장 금지

## 7. 서버 간 호출 원칙

| 호출 주체 | 호출 대상 | 허용 여부 |
|---|---|---|
| Frontend | Flask | 허용 |
| Frontend | AI | 금지 |
| Frontend | ITS | 금지 |
| Flask | DB | 허용 |
| Flask | AI | 허용 |
| Flask | ITS | 허용 |
| AI | DB | 금지 |
| ITS | DB | 금지 |
