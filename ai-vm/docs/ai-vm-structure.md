# AI-VM 구조 문서

## 1. 목적

AI-VM은 STACCATO 프로젝트에서 AI 분석 기능과 LLM 기능을 담당하는 서버이다.

AI-VM 내부는 Docker Compose를 사용하여 다음 두 개의 서버로 분리한다.

- ai-server
- llm-server

## 2. 서버 구성

```text
AI VM 192.168.0.186
├── ai-server
│   ├── FastAPI
│   ├── YOLO
│   ├── OpenCV
│   └── 정차 차량 탐지
│
└── llm-server
    ├── FastAPI
    ├── LLM 보고서 생성
    ├── 챗봇 응답
    └── 위험도 설명 생성
```

## 3. 컨테이너 역할

| 컨테이너 | 포트 | 역할 |
|---|---:|---|
| ai-server | 8001 | 영상/이미지 분석, 차량 탐지, 정차 판단 |
| llm-server | 8000 | 사고 보고서 생성, 챗봇 응답, 위험도 설명 |

## 4. 통신 구조

```text
Frontend VM
→ Flask VM
→ AI VM ai-server 또는 llm-server
```

Frontend는 AI-VM을 직접 호출하지 않는다.

Flask 서버가 AI/LLM 서버를 호출하고, 결과를 DB에 저장한다.

## 5. 현재 진행 상태

- AI-VM 전용 브랜치 생성 완료
- ai-vm sparse-checkout 완료
- llm-server 기본 구조 확인
- ai-server 구조 추가 예정
- Docker 설치 필요

## 6. 다음 작업

1. Docker 설치
2. ai-server 기본 구조 생성
3. ai-server health API 구현
4. llm-server health API 확인
5. docker compose 실행 테스트
6. Flask VM에서 AI-VM API 호출 테스트
