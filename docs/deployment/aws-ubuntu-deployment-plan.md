> Legacy Notice  
> 이 문서는 초기 로컬/통합 개발 환경 기준을 포함할 수 있습니다.  
> 현재 공식 실행 기준은 VM 분리 구조이며, 서버별 실행 기준은 `docs/infra/server-folder-map.md`와 `docs/infra/vm-server-status.md`를 우선 참고합니다.

# AWS Ubuntu Deployment Plan



## 1. 목적



STACCATO MVP를 로컬 개발 환경이 아닌 외부 Ubuntu 서버에서 실행하여 파이널 프로젝트 발표 시 웹 서비스에 접속할 수 있도록 한다.



배포 목표는 다음과 같다.



\- 프론트엔드 웹 접속 가능

\- Flask API 외부 호출 가능

\- AI / ITS / LLM 서버 Docker 환경 실행

\- MySQL DB 유지

\- 발표 중 안정적인 시연 가능

\- `.env`, API Key, 모델 파일 보안 유지



\---



## 2. 1차 배포 전략



MVP 발표용 1차 배포는 아래 구조를 우선 적용한다.



```text

AWS EC2 Ubuntu

\+ Docker Compose

\+ MySQL Container

\+ Nginx



이 방식을 우선 선택하는 이유는 현재 프로젝트가 이미 Docker Compose 기반으로 구성되어 있고, 여러 서버를 한 번에 실행하기 쉽기 때문이다.



3\. 배포 대상 서버

frontend-server

flask-server

ai-server

its-server

llm-server

db-server

서버	역할

frontend-server	사용자/관리자 웹 화면

flask-server	메인 백엔드 API, 인증/권한, DB 저장, 내부 서버 호출

ai-server	영상/이미지 AI 분석

its-server	외부 고속도로 CCTV/교통/기상 API 연동

llm-server	LLM 보고서 문장 생성

db-server	MySQL 데이터 저장

4\. 1차 배포 구조

사용자

→ Nginx

→ frontend-server

→ flask-server

→ ai-server / its-server / llm-server

→ db-server



Nginx 예상 라우팅:



http://도메인/

→ frontend-server:3000



http://도메인/api/

→ flask-server:5000

5\. Ubuntu 서버 준비 작업



Ubuntu 서버에서는 아래 순서로 배포한다.



1\. EC2 Ubuntu 서버 생성

2\. SSH 접속 설정

3\. Git 설치

4\. Docker 설치

5\. Docker Compose 설치

6\. GitHub Repository clone

7\. .env 작성

8\. Docker Compose 실행

9\. Nginx reverse proxy 설정

10\. Health Check

6\. 기본 배포 명령어

서버 접속

ssh -i key.pem ubuntu@EC2\_PUBLIC\_IP

프로젝트 clone

git clone https://github.com/staccato-ai-highway-control/staccato-ai-highway-control.git

cd staccato-ai-highway-control

git switch develop

환경변수 파일 생성

vi .env  # docs/infra/env-guide.md 기준으로 직접 작성

nano .env

Docker Compose 실행

docker compose up -d --build

컨테이너 상태 확인

docker compose ps

로그 확인

docker compose logs -f flask-server

docker compose logs -f frontend-server

docker compose logs -f ai-server

docker compose logs -f its-server

docker compose logs -f llm-server

docker compose logs -f db-server

7\. 운영용 환경변수 관리



운영 환경의 .env는 GitHub에 올리지 않는다.



GitHub에는 실제 환경변수 파일과 예시 환경변수 파일을 올리지 않는다. 환경변수 항목은 `docs/infra/env-guide.md`에서 관리한다.



운영 서버에서 반드시 별도로 설정해야 하는 값:



TZ=Asia/Seoul



FRONTEND\_PORT=3000

FLASK\_PORT=5000

AI\_PORT=8001

ITS\_PORT=8002

LLM\_PORT=8000

MYSQL\_PORT=3307



MYSQL\_DATABASE=staccato

MYSQL\_USER=staccato\_user

MYSQL\_PASSWORD=운영용\_강한\_비밀번호

MYSQL\_ROOT\_PASSWORD=운영용\_강한\_ROOT\_비밀번호



DATABASE\_URL=mysql+pymysql://staccato\_user:운영용\_강한\_비밀번호@db-server:3306/staccato



SECRET\_KEY=운영용\_랜덤\_SECRET

JWT\_SECRET\_KEY=운영용\_랜덤\_JWT\_SECRET

JWT\_EXPIRES\_HOURS=12



AI\_SERVER\_URL=http://ai-server:8001

ITS\_SERVER\_URL=http://192.168.0.189:8002

LLM\_SERVER\_URL=http://llm-server:8000



LLM\_ENABLED=true

LLM\_PROVIDER=LLM\_SERVER

LLM\_SERVER\_TIMEOUT\_SECONDS=30



FRONTEND\_BASE\_URL=https://도메인

EMAIL\_VERIFICATION\_REQUIRED=false



NEXT\_PUBLIC\_API\_BASE\_URL=https://도메인/api

8\. 포트 관리

서비스	포트	외부 노출 여부

Nginx	80 / 443	외부 노출

frontend-server	3000	Nginx 뒤에 숨김 권장

flask-server	5000	Nginx 뒤에 숨김 권장

llm-server	8000	외부 직접 노출 금지

ai-server	8001	외부 직접 노출 금지

its-server	8002	외부 직접 노출 금지

db-server	3306 / 3307	외부 직접 노출 최소화

9\. Nginx Reverse Proxy 방향



Nginx 목표 구조:



/

→ frontend-server:3000



/api/

→ flask-server:5000



예상 설정:



server {

&#x20;   listen 80;

&#x20;   server\_name 도메인\_or\_EC2\_PUBLIC\_IP;



&#x20;   location / {

&#x20;       proxy\_pass http://localhost:3000;

&#x20;       proxy\_set\_header Host $host;

&#x20;       proxy\_set\_header X-Real-IP $remote\_addr;

&#x20;   }



&#x20;   location /api/ {

&#x20;       proxy\_pass http://localhost:5000/;

&#x20;       proxy\_set\_header Host $host;

&#x20;       proxy\_set\_header X-Real-IP $remote\_addr;

&#x20;   }

}



주의사항:



Nginx를 /api prefix로 붙이면 프론트의 NEXT\_PUBLIC\_API\_BASE\_URL도 그에 맞게 변경해야 한다.

10\. DB 배포 전략

1차: MySQL Container



MVP 발표용으로는 Docker Compose의 db-server를 사용한다.



db-server

→ MySQL 8.0

→ Docker Volume



장점:



설정이 단순함

로컬 환경과 유사함

빠르게 배포 가능



단점:



EC2 서버 장애 시 DB도 같이 위험함

백업을 별도로 관리해야 함

2차: AWS RDS MySQL



시간이 남으면 RDS로 분리한다.



장점:



DB 안정성 증가

백업/복구 편의성 증가

컨테이너 재시작과 DB 분리 가능

11\. DB 백업



발표 전 반드시 DB 백업을 확인한다.



docker exec staccato-db mysqldump -uroot -pROOT\_PASSWORD staccato > staccato\_backup.sql



체크리스트:



Docker volume 유지 여부 확인

발표 전 DB dump 파일 생성

초기 SQL 파일 확인

테스트 계정 준비

발표용 샘플 Incident 준비

발표용 LLM Report 준비

12\. 모델 파일 배포 원칙



AI/LLM 모델 파일은 GitHub에 올리지 않는다.



GitHub에 올리지 않는 파일:



.pt

.onnx

.bin

.safetensors

.weights

tokenizer

대용량 dataset

raw image/video

processed dataset



모델 파일은 EC2 서버에 직접 업로드한다.



예상 경로:



storage/models/ai/

storage/models/llm/



업로드 예시:



scp -i key.pem model.pt ubuntu@EC2\_PUBLIC\_IP:/home/ubuntu/staccato-ai-highway-control/storage/models/llm/

13\. 배포 후 Health Check

Flask

curl -i http://EC2\_PUBLIC\_IP/api/auth/health



Nginx 미적용 시:



curl -i http://EC2\_PUBLIC\_IP:5000/auth/health

Docker 상태

docker compose ps

14\. 발표 전 체크리스트

항목	상태

EC2 서버 생성	시작전

Docker 설치	시작전

Docker Compose 설치	시작전

GitHub clone	시작전

.env 작성	시작전

Docker Compose build 성공	시작전

frontend 접속 확인	시작전

Flask API 확인	시작전

MySQL 연결 확인	시작전

Auth 로그인 확인	시작전

Incident 조회 확인	시작전

LLM Report 생성 확인	시작전

AI 분석 Mock 흐름 확인	시작전

CCTV 화면 확인	시작전

테스트 계정 준비	시작전

발표용 샘플 데이터 준비	시작전

DB 백업	시작전

15\. 장애 대응 명령어

전체 상태 확인

docker compose ps

Flask 로그

docker compose logs -f flask-server

프론트 로그

docker compose logs -f frontend-server

LLM 로그

docker compose logs -f llm-server

DB 로그

docker compose logs -f db-server

특정 서버 재시작

docker compose restart flask-server

docker compose restart frontend-server

docker compose restart llm-server

전체 재빌드

docker compose up -d --build

전체 중지

docker compose down

16\. 보안 원칙

.env GitHub 업로드 금지

API Key 코드 하드코딩 금지

DB 포트 외부 노출 최소화

SECRET\_KEY, JWT\_SECRET\_KEY 운영용 값으로 변경

MySQL 기본 비밀번호 변경

모델 파일 GitHub 업로드 금지

EC2 보안그룹에서 필요한 포트만 오픈

발표 후 불필요한 서버 또는 Key 정리

17\. 현재 상태

배포는 아직 시작 전이다.



1차 목표:

AWS EC2 Ubuntu + Docker Compose + MySQL Container + Nginx



2차 개선:

AWS RDS MySQL 분리



현재 해야 할 일:

\- 배포 문서 작성

\- EC2 생성

\- Docker 설치

\- .env 정리

\- docker compose 실행 검증

\- 발표용 샘플 데이터 준비

