# Deprecated Notice

> This document describes an earlier LLM / chatbot / LLM report architecture.
> LLM, chatbot, and LLM report generation are excluded from the final STACCATO MVP scope.
> For the current final scope, see `docs/mvp/final-mvp-scope.md`.

---

\# LLM Server Architecture



\## 1. 목적



STACCATO 프로젝트에서 LLM 모델이 무거워질 가능성이 있으므로, LLM 추론 기능을 `flask-vm` 내부가 아닌 별도 `llm-server`로 분리하는 구조를 정의한다.



단, 프론트엔드는 `llm-server`를 직접 호출하지 않는다.



기본 호출 흐름은 아래와 같다.



```text

frontend-server

→ flask-server

→ llm-server

→ flask-server가 결과를 받아 llm\_reports 저장

```



\---



\## 2. 현재 서버 구조



현재 STACCATO 프로젝트는 아래 서버들로 구성되어 있다.



| Server | Responsibility |

|---|---|

| frontend-server | 사용자 화면, 관리자 화면, API 호출 |

| flask-server | 메인 백엔드 API, 인증/권한, Incident 관리, DB 조회/저장 |

| ai-server | YOLO/OpenCV 기반 영상 분석, 객체 탐지 |

| its-server | 외부 고속도로 CCTV/교통/기상 API 연동 |

| db-server | 데이터 저장 |



LLM 모델이 무거워질 경우 아래 서버를 추가한다.



| Server | Responsibility |

|---|---|

| llm-server | 로컬 LLM 모델 로드, tokenizer 로드, 보고서 텍스트 생성 |



\---



\## 3. 최종 목표 구조



```text

frontend-server

→ flask-server

→ ai-server / its-server / llm-server

→ db-server

```



중요한 점은 `frontend-vm`가 `llm-server`를 직접 호출하지 않는다는 것이다.



프론트는 항상 `flask-vm` API만 호출한다.



\---



\## 4. 서버 역할 분리



\### frontend-server



역할:



\- 보고서 생성 버튼 제공

\- LLM Report 목록/상세 화면 제공

\- Flask API 호출



호출 대상:



```text

flask-server

```



\---



\### flask-server



역할:



\- 인증/권한 처리

\- Incident 조회

\- DetectionLog 조회

\- IncidentMemo 조회

\- LLM 요청 payload 구성

\- llm-server 호출

\- llm\_reports DB 저장

\- 보고서 목록/상세/상태 변경 API 제공



LLM Report 생성 시 호출 흐름:



```text

POST /incidents/{incident\_id}/llm-reports

→ incident 조회

→ detection\_logs 조회

→ incident\_memos 조회

→ llm-server 호출

→ 응답 결과를 llm\_reports 테이블에 저장

```



\---



\### llm-server



역할:



\- tokenizer 로드

\- 조원이 만든 `.pt` 모델 로드

\- 입력 payload 기반 보고서 문장 생성

\- 결과 JSON 반환



하지 않는 일:



\- DB 직접 접근

\- 인증/권한 처리

\- Incident 직접 조회

\- llm\_reports 직접 저장

\- 프론트 요청 직접 수신



\---



\### ai-server



역할:



\- YOLO/OpenCV 기반 영상 분석

\- 차량 객체 탐지

\- 정차 여부 판단

\- ROI 판별

\- detection result 반환



주의:



\- LLM 기능을 `ai-server`에 넣지 않는다.

\- `ai-server`는 영상 분석 전용으로 유지한다.



\---



\### its-server



역할:



\- 외부 고속도로 CCTV API 연동

\- 교통/기상 API 연동 가능성 유지

\- 외부 API 응답 정규화

\- 외부 API Key 보호



현재 판단:



\- `llm-server`를 추가하더라도 `its-vm`는 당장 제거하지 않는다.

\- 추후 `its-vm`가 단순 CCTV URL 중계 역할만 한다고 판단되면 `flask-vm` 내부 client로 통합을 검토할 수 있다.



\---



\## 5. 핵심 원칙



\- 프론트는 `llm-server`를 직접 호출하지 않는다.

\- `llm-server`는 DB에 직접 접근하지 않는다.

\- DB 조회와 저장은 `flask-vm`가 담당한다.

\- `llm-server`는 문장 생성만 담당한다.

\- `ai-server`에는 LLM 기능을 넣지 않는다.

\- `its-vm`는 현재 유지한다.

\- 모델 파일 `.pt`는 GitHub에 업로드하지 않는다.

\- API Key, 모델 경로 등은 `.env`로 관리한다.

\- `.env`는 GitHub에 올리지 않는다.

\- 환경변수 항목은 `docs/infra/env-guide.md`에서 관리하며, `.env` 파일은 각 VM에서 직접 생성한다.



\---



\## 6. LLM Report 생성 흐름



```text

1\. frontend-server에서 보고서 생성 요청

2\. flask-server의 POST /incidents/{incident\_id}/llm-reports 호출

3\. flask-server가 Incident / DetectionLog / IncidentMemo 조회

4\. flask-server가 LLM 입력 payload 생성

5\. flask-server의 llm\_client.py가 llm-server 호출

6\. llm-server가 보고서 문장 생성

7\. llm-server가 결과 JSON 반환

8\. flask-server가 llm\_reports 테이블에 저장

9\. frontend-server에서 보고서 조회

```



\---



\## 7. llm-server 최소 API



초기 `llm-server`는 아래 API만 제공한다.



| Method | Endpoint | Description |

|---|---|---|

| GET | /health | LLM 서버 상태 확인 |

| POST | /llm/reports/generate | 보고서 텍스트 생성 |



\---



\## 8. POST /llm/reports/generate 요청 예시



```json

{

&#x20; "incident": {

&#x20;   "id": 1,

&#x20;   "incident\_type": "SHOULDER\_STOP",

&#x20;   "risk\_level": "HIGH",

&#x20;   "status": "DETECTED",

&#x20;   "description": "갓길 정차 차량 탐지"

&#x20; },

&#x20; "detection\_logs": \[

&#x20;   {

&#x20;     "object\_type": "vehicle",

&#x20;     "confidence": 0.92,

&#x20;     "stopped\_seconds": 15,

&#x20;     "movement\_delta": 0.03

&#x20;   }

&#x20; ],

&#x20; "memos": \[

&#x20;   {

&#x20;     "content": "실제 차량 정차 확인. 순찰팀 전달 필요."

&#x20;   }

&#x20; ]

}

```



\---



\## 9. POST /llm/reports/generate 응답 예시



```json

{

&#x20; "status": "success",

&#x20; "provider": "LLM\_SERVER",

&#x20; "model": "sft\_staccato\_its\_event\_v41\_best",

&#x20; "report\_title": "갓길 정차 사고 보고서 초안",

&#x20; "summary": "AI 탐지 결과 갓길에 정차 차량이 확인되었습니다.",

&#x20; "report\_content": "1. 사고 개요...\\n2. 발생 위치...\\n3. AI 탐지 결과...",

&#x20; "risk\_reason": "정차 시간이 길고 갓길 위치로 인해 2차 사고 가능성이 있습니다.",

&#x20; "recommended\_action": "관제자는 CCTV 화면을 확인하고 필요 시 순찰팀에 전달해야 합니다."

}

```



\---



\## 10. Provider 전략



`flask-vm/app/clients/llm\_client.py`는 Provider 분기 구조를 가진다.



```text

LLM\_PROVIDER=MOCK

→ Flask 내부 Mock 보고서 생성



LLM\_PROVIDER=LLM\_SERVER

→ 별도 llm-server 호출



LLM\_PROVIDER=OPENAI

→ 추후 OpenAI API 호출

```



초기 기본값은 `MOCK`으로 둔다.



`LLM\_SERVER`는 조원이 만든 로컬 LLM 모델을 별도 서버에서 실행할 때 사용한다.



`OPENAI`는 로컬 모델 성능이 부족하거나 운영 안정성이 필요할 경우를 대비한 후속 확장 옵션이다.



\---



\## 11. 환경변수 예시



```env

LLM\_ENABLED=true

LLM\_PROVIDER=MOCK



LLM\_SERVER\_URL=http://llm-server:8000

LLM\_SERVER\_TIMEOUT\_SECONDS=30



LLM\_MODEL\_NAME=sft\_staccato\_its\_event\_v41\_best

LLM\_MODEL\_PATH=/app/storage/models/llm/sft\_staccato\_its\_event\_v41\_best.pt

LLM\_TOKENIZER\_PATH=/app/storage/models/llm/tokenizer.json



OPENAI\_API\_KEY=

OPENAI\_MODEL=

```



\---



\## 12. 모델 파일 관리 기준



GitHub에 올리지 않는 파일:



```text

\*.pt

\*.bin

tokenized/

raw/

processed/

pretrain/

sft/

\_archive/

\*.jsonl

```



모델 파일은 각 개발자 로컬 또는 배포 서버의 지정된 storage 경로에 둔다.



예상 경로:



```text

llm-server/storage/models/llm/

```



예상 파일:



```text

sft\_staccato\_its\_event\_v41\_best.pt

tokenizer.json

```



\---



\## 13. 단계별 구현 순서



1\. LLM 서버 분리 설계 문서 작성

2\. `llm-server` 폴더 생성

3\. `GET /health` API 추가

4\. `POST /llm/reports/generate` Mock 응답 추가

5\. `docker-compose.yml`에 `llm-server` 추가

6\. `flask-vm/app/clients/llm\_client.py`에서 `LLM\_PROVIDER=LLM\_SERVER` 분기 추가

7\. Flask → llm-server 호출 테스트

8\. 이후 조원 로컬 LLM 모델 연결

9\. 모델 성능이 부족하면 `OPENAI` Provider 검토



\---



\## 14. 현재 범위에서 하지 않는 것



\- 프론트가 llm-server 직접 호출

\- llm-server의 DB 직접 접근

\- ai-server에 LLM 기능 추가

\- `.pt` 모델 파일 GitHub 업로드

\- OpenAI API 즉시 연결

\- Chatbot 기능 즉시 구현

\- Board Draft 기능 즉시 구현

\- its-server 제거



\---



\## 15. 결론



LLM 모델이 무거워질 가능성이 있으므로, LLM 추론은 별도 `llm-server`로 분리한다.



다만 STACCATO의 메인 API 진입점은 계속 `flask-vm`로 유지한다.



최종 구조는 아래와 같다.



```text

frontend-server

→ flask-server

→ ai-server / its-server / llm-server

→ db-server

```

