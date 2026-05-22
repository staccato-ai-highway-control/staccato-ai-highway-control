# Deprecated / Historical Notice

> This document contains earlier planning details that may not match the final STACCATO MVP scope.
> For the current final MVP scope, see `docs/mvp/final-mvp-scope.md`.
> LLM, chatbot, full Docker Compose deployment, map/GPS integration, reinforcement learning, and automatic retraining are excluded from the final MVP.

---

# STACCATO Project Handoff

> 이 문서는 새 대화에서 프로젝트 맥락을 빠르게 복원하기 위한 인수인계 문서입니다.  
> 새 채팅 첫 메시지에 이 파일을 업로드하거나, `docs/development/project-handoff.md 기준으로 이어서 진행`이라고 말하면 됩니다.

\---

## 1\. 답변/작업 스타일

앞으로도 아래 방식으로 진행합니다.

* 한국어 존댓말 사용
* 한 번에 너무 많은 선택지를 주지 않고, 지금 해야 할 다음 단계부터 안내
* PowerShell 명령어는 복사해서 바로 실행 가능하게 제공
* 설명 문구와 실제 명령어를 명확히 분리
* 사용자가 터미널 결과를 붙여넣으면 그 결과 기준으로 다음 행동 판단
* Git 브랜치 / PR / merge / 삭제 순서를 안전하게 안내
* Docker, 가상환경, `.env`, Git 상태를 항상 먼저 확인
* 사용자가 실수로 설명 문구를 PowerShell에 붙여넣어도 혼내지 않고 오류 원인과 다음 명령어 안내
* 작업 흐름은 기본적으로 아래 순서 사용

```text
develop 최신화
→ 새 브랜치 생성
→ 코드/문서 작성
→ Docker 또는 로컬 검증
→ commit / push
→ PR 본문 작성
→ merge
→ develop 최신화
→ 작업 브랜치 삭제
```

\---

## 2\. 현재 Git 운영 규칙

* `main`, `develop` 직접 push 금지
* 새 작업은 항상 최신 `develop`에서 브랜치 생성
* PR base는 `develop`
* merge 후 작업 브랜치 삭제
* `.env`는 GitHub에 올리지 않음
* 예시 환경변수 파일은 GitHub에 올리지 않으며, 환경변수 항목은 `docs/infra/env-guide.md`에서 관리함
* 모델 파일 `.pt`, `.bin`, tokenizer, 대용량 데이터는 GitHub에 올리지 않음

기본 시작 명령어:

```powershell
git switch develop
git pull origin develop
git fetch --all --prune
git status
```

정상 상태:

```text
On branch develop
Your branch is up to date with 'origin/develop'.
nothing to commit, working tree clean
```

\---

## 3\. 현재 서버 구조

현재 STACCATO 구조는 아래와 같습니다.

```text
frontend-server
→ flask-server
→ ai-server / its-server / llm-server
→ db-server
```

역할:

|서버|역할|
|-|-|
|`frontend-vm`|사용자/관리자 화면|
|`flask-vm`|메인 백엔드 API, 인증/권한, DB 조회/저장, 내부 서버 호출|
|`ai-server`|YOLO/OpenCV 기반 영상 분석, 객체 탐지|
|`its-vm`|외부 고속도로 CCTV/교통/기상 API 연동|
|`llm-server`|LLM 보고서 텍스트 생성|
|`db-vm`|MySQL 데이터 저장|

핵심 원칙:

```text
프론트는 flask-server만 호출
flask-server가 ai-server / its-server / llm-server 호출
ai-server / its-server / llm-server는 DB 직접 접근하지 않음
DB 조회/저장은 flask-server가 담당
```

\---

## 4\. 현재까지 merge 완료된 주요 작업

아래 작업들은 develop에 merge 완료된 것으로 정리합니다.

### Backend / Infra

* DB Core Schema
* DB MVP Extension Schema
* MVP 공통 기술정의 문서
* 프레임워크 모듈 구조 문서
* Auth API
* Auth Admin API
* CCTV / ROI API
* Incident API
* Notification API
* Report Upload / Analysis Job API
* AI Detection API Integration
* LLM Report API Scaffold
* LLM Server Architecture 문서
* LLM Server Scaffold
* LLM Server Docker Compose Integration
* LLM Report 생성/저장 API
* LLM Report 목록/상세/상태/삭제 API

### 검증된 백엔드 흐름

AI Detection 흐름:

```text
업로드 생성
→ 분석 Job 생성
→ Flask가 AI Server 호출
→ AI Mock 분석 결과 수신
→ analysis\\\_jobs SUCCESS
→ upload\\\_status ANALYZED
→ incident 자동 생성
→ AI\\\_DETECTION 알림 자동 생성
```

LLM Report 흐름:

```text
POST /incidents/{incident\\\_id}/llm-reports
→ Incident 조회
→ DetectionLog 조회
→ IncidentMemo 조회
→ flask-server에서 llm-server 호출
→ llm\\\_reports 저장
→ 201 CREATED 응답
```

LLM Report 조회/상태 흐름:

```text
GET    /incidents/{incident\\\_id}/llm-reports
GET    /llm-reports/{report\\\_id}
PATCH  /llm-reports/{report\\\_id}/status
DELETE /llm-reports/{report\\\_id}
```

\---

## 5\. LLM 관련 결정 사항

### 구조 결정

LLM 모델이 무거워질 수 있으므로 `llm-server`를 별도 서버로 분리했습니다.

```text
frontend-server
→ flask-server
→ llm-server
→ flask-server가 llm\\\_reports 저장
```

### Provider 전략

`flask-vm/app/clients/llm\\\_client.py`는 Provider 분기 구조를 갖습니다.

```text
LLM\\\_PROVIDER=MOCK
→ Flask 내부 Mock 보고서 생성

LLM\\\_PROVIDER=LLM\\\_SERVER
→ 별도 llm-server 호출

LLM\\\_PROVIDER=OPENAI
→ 추후 OpenAI API 호출
```

현재 Docker Compose 환경에서는 보통 아래 값 사용:

```env
LLM\\\_ENABLED=true
LLM\\\_PROVIDER=LLM\\\_SERVER
LLM\\\_SERVER\\\_URL=http://llm-server:8000
LLM\\\_SERVER\\\_TIMEOUT\\\_SECONDS=30
```

로컬에서 Flask와 LLM 서버를 따로 실행할 때만:

```env
LLM\\\_SERVER\\\_URL=http://127.0.0.1:8000
```

Docker 내부에서 `127.0.0.1`을 쓰면 Flask 컨테이너 자기 자신을 의미하므로 `llm-server`를 찾지 못합니다.

### 모델 파일 관리

실제 `.pt` 모델 파일은 GitHub에 올리지 않습니다.

예상 경로:

```text
storage/models/llm/
├── sft\\\_staccato\\\_its\\\_event\\\_v41\\\_best.pt
└── tokenizer.json
```

`.env` 예시:

```env
LLM\\\_MODEL\\\_PATH=/app/storage/models/llm/sft\\\_staccato\\\_its\\\_event\\\_v41\\\_best.pt
LLM\\\_TOKENIZER\\\_PATH=/app/storage/models/llm/tokenizer.json
```

\---

## 6\. 프론트 브랜치 상태

프론트 조원이 작업 중인 브랜치:

```text
feat/frontend-integration
```

처리한 내용:

```text
feat/frontend-integration에 최신 develop merge 완료
develop 대비 변경사항이 frontend-vm/ 내부에만 있는지 확인 완료
원격 브랜치 push 완료
```

조원이 이어서 작업할 때:

```powershell
git fetch --all --prune
git switch feat/frontend-integration
git pull origin feat/frontend-integration
```

조원 작업이 끝나기 전에는 PR merge하지 않습니다.  
작업 완료 후 PR:

```text
base: develop
compare: feat/frontend-integration
```

\---

## 7\. Auth / 보안 현재 상태

확인된 보안 상태:

|항목|상태|
|-|-|
|비밀번호 평문 저장|안 함|
|회원가입 시 비밀번호 hash 저장|되어 있음|
|로그인 시 hash 검증|되어 있음|
|JWT 발급|되어 있음|
|JWT 만료 시간|설정되어 있음|
|`/auth/me` 인증 보호|되어 있음|
|비활성 계정 접근 차단|되어 있음|
|관리자 API 권한 제한|되어 있음|
|비밀번호 변경 API|아직 필요|
|회원탈퇴 API|아직 필요|
|이메일 인증 API|아직 필요|

현재 사용 중인 보안 유틸:

```python
generate\\\_password\\\_hash()
check\\\_password\\\_hash()
jwt.encode()
jwt.decode()
```

현재 로그인 조건:

```text
비밀번호 일치
+ account\\\_status = ACTIVE
```

앞으로 권장 로그인 조건:

```text
비밀번호 일치
+ account\\\_status = ACTIVE
+ is\\\_email\\\_verified = true
```

\---

## 8\. 마이페이지 / 계정 관리 결정 사항

마이페이지는 MVP에 포함합니다.

### MVP 포함

```text
GET    /auth/me
PATCH  /auth/me/password
DELETE /auth/me
```

### MVP 제외

```text
전화번호 수정
소속 수정
프로필 이미지
```

### 회원탈퇴 방식

회원탈퇴는 실제 row 삭제가 아니라 계정 비활성화 방식입니다.

```text
DELETE /auth/me
→ 현재 비밀번호 확인
→ account\\\_status = WITHDRAWN
→ SecurityLog 기록
→ 이후 로그인/인증 차단
```

기존 `require\\\_auth`에서 `account\\\_status != ACTIVE`인 계정은 차단하므로, `WITHDRAWN` 처리 시 자동으로 접근 차단됩니다.

추천 브랜치:

```powershell
git switch develop
git pull origin develop
git fetch --all --prune
git status
git switch -c feat/my-page-account-api
git push -u origin feat/my-page-account-api
```

구현 목표:

```text
PATCH /auth/me/password
DELETE /auth/me
SecurityLog: PASSWORD\\\_CHANGED, ACCOUNT\\\_WITHDRAWN
```

\---

## 9\. 이메일 인증 설계 결정 사항

현재 `users.is\\\_email\\\_verified` 필드는 존재합니다.  
현재 코드는 관리자 승인 시 `is\\\_email\\\_verified=True`로 처리하는 구조였으나, 보안을 더 꼼꼼히 하려면 이메일 인증과 관리자 승인을 분리합니다.

권장 흐름:

```text
회원가입 요청
→ 이메일 인증
→ 관리자 승인
→ 로그인 가능
```

로그인 가능 조건:

```text
account\\\_status = ACTIVE
is\\\_email\\\_verified = true
```

추천 API:

```text
POST /auth/verify-email
POST /auth/verify-email/resend
```

추천 DB 테이블:

```sql
CREATE TABLE IF NOT EXISTS email\\\_verification\\\_tokens (
    id BIGINT AUTO\\\_INCREMENT PRIMARY KEY,
    user\\\_id BIGINT NOT NULL,
    token\\\_hash VARCHAR(255) NOT NULL,
    expires\\\_at DATETIME NOT NULL,
    used\\\_at DATETIME NULL,
    created\\\_at DATETIME NOT NULL,
    CONSTRAINT fk\\\_email\\\_verification\\\_tokens\\\_user
        FOREIGN KEY (user\\\_id) REFERENCES users(id)
        ON DELETE CASCADE
);
```

중요 원칙:

```text
토큰 원문을 DB에 저장하지 않고 hash로 저장
개발 환경에서는 인증 링크를 콘솔/로그로 출력 가능
운영에서는 SMTP 또는 메일 발송 서비스 연결
```

메일 발송은 Gmail, Naver, Daum, 회사 메일 등 사용자가 입력한 이메일 주소로 전송 가능합니다.  
우리 서버가 SMTP 또는 SendGrid/Mailgun/AWS SES 같은 메일 서비스를 통해 발송하면 됩니다.

MVP 현실적 순서:

```text
1. 이메일 인증 DB/API 구조 구현
2. 개발 환경에서는 인증 링크를 서버 로그에 출력
3. 프론트에서 인증 링크 클릭 흐름 테스트
4. 실제 SMTP 또는 메일 발송 서비스 연결
```

\---

## 10\. 배포 전략

파이널 프로젝트 배포는 AWS EC2 + Docker Compose를 1차 추천합니다.

### 1차 발표용 구조

```text
AWS EC2 Ubuntu
├── Nginx
├── frontend-server
├── flask-server
├── ai-server
├── its-server
├── llm-server
└── db-server
```

### 2차 안정화 구조

```text
AWS EC2
├── Nginx
├── frontend-server
├── flask-server
├── ai-server
├── its-server
└── llm-server

AWS RDS MySQL
└── staccato DB
```

### Ubuntu에서 할 작업

```text
SSH 접속
Git 설치
Docker 설치
Docker Compose 설치
GitHub clone
.env 작성
docker compose up -d --build
Nginx reverse proxy 설정
DB volume / backup 확인
모델 파일 storage 업로드
API health check
```

자주 쓸 명령어:

```bash
git clone https://github.com/staccato-ai-highway-control/staccato-ai-highway-control.git
cd staccato-ai-highway-control
git switch develop
vi .env  # docs/infra/env-guide.md 기준으로 직접 작성
nano .env
docker compose up -d --build
docker compose ps
docker compose logs -f flask-server
```

Nginx 목표 구조:

```text
http://도메인/
→ frontend-server:3000

http://도메인/api/
→ flask-server:5000
```

\---

## 11\. 아직 남은 주요 작업

대표님 또는 조원들이 이어서 해야 할 작업입니다.

|작업|추천 담당/브랜치|
|-|-|
|마이페이지 계정 API|`feat/my-page-account-api`|
|이메일 인증 API|`feat/email-verification-api` 또는 `feat/account-security-api`|
|프론트 기본 화면 마무리|`feat/frontend-integration`|
|프론트 LLM Report API 연동|`feat/frontend-llm-report` 또는 기존 프론트 브랜치|
|실제 로컬 LLM 모델 연결|`feat/local-llm-model-integration`|
|LLM 모델 경로/README 준비|`feat/local-llm-model-runtime-prep`|
|배포 문서|`docs/deployment-plan`|
|Ubuntu 배포 체크리스트|`docs/deployment/ubuntu-deployment-checklist.md`|
|AWS EC2 Docker Compose 배포|배포 담당 브랜치 또는 문서 PR|

\---

## 12\. 새 대화 시작 프롬프트

새 채팅에서 아래를 그대로 붙여넣으면 됩니다.

```text
STACCATO 프로젝트 이어서 진행할게.

이전 대화에서는 개발 흐름을 매우 단계적으로 진행했어.
앞으로도 아래 스타일로 답변해줘.

답변 스타일:
- 한국어 존댓말
- 한 번에 너무 많은 선택지를 주지 말고 지금 해야 할 다음 단계부터 안내
- PowerShell 명령어는 복사해서 바로 실행 가능하게 제공
- 설명 문구와 실제 명령어를 명확히 구분
- 내가 터미널 결과를 붙여넣으면 그 결과 기준으로 다음 행동 판단
- Git 브랜치/PR/merge/삭제 순서를 안전하게 안내
- Docker, 가상환경, .env, Git 상태를 항상 먼저 확인
- 작업은 “브랜치 생성 → 코드 작성 → Docker 검증 → 커밋/푸시 → PR 본문 → merge 후 정리” 흐름으로 안내

현재 develop에는 아래 작업들이 merge 완료됨:
- DB Core Schema
- DB MVP Extension Schema
- Auth API / Auth Admin API
- CCTV / ROI API
- Incident API
- Notification API
- Report Upload / Analysis Job API
- AI Detection API Integration
- LLM Report API Scaffold
- LLM Server Architecture
- LLM Server Scaffold
- LLM Server Docker Compose Integration
- LLM Report 생성/저장 API
- LLM Report 목록/상세/상태/삭제 API

현재 서버 구조:
frontend-server
→ flask-server
→ ai-server / its-server / llm-server
→ db-server

프론트 브랜치:
feat/frontend-integration
- 최신 develop merge 완료
- develop 대비 frontend-server 변경만 남도록 확인
- 조원이 이어서 작업 중
- 아직 merge하지 않음

보안/Auth 상태:
- 비밀번호 해시 저장과 검증은 구현되어 있음
- JWT 인증 구현되어 있음
- account\\\_status != ACTIVE 계정은 차단됨
- 마이페이지 백엔드 API는 아직 필요
- 회원탈퇴는 account\\\_status=WITHDRAWN 비활성화 방식으로 구현 예정
- 이메일 인증은 관리자 승인과 분리 예정

다음 우선 작업 후보:
1. feat/my-page-account-api
   - PATCH /auth/me/password
   - DELETE /auth/me

2. feat/account-security-api 또는 feat/email-verification-api
   - POST /auth/verify-email
   - POST /auth/verify-email/resend
   - email\\\_verification\\\_tokens 테이블
   - 개발 환경에서는 인증 링크 로그 출력

3. docs/deployment-plan
   - AWS EC2 + Docker Compose 배포 문서
   - Ubuntu 배포 체크리스트
```

\---

## 13\. 다음 추천 작업

가장 먼저 이어갈 작업은 아래입니다.

```text
feat/my-page-account-api
```

이유:

```text
마이페이지는 MVP 필수
비밀번호 변경은 기본 보안 기능
회원탈퇴는 account\\\_status=WITHDRAWN으로 처리 가능
프론트가 나중에 바로 API를 붙일 수 있음
```

시작 명령어:

```powershell
git switch develop
git pull origin develop
git fetch --all --prune
git status
git switch -c feat/my-page-account-api
git push -u origin feat/my-page-account-api
```



