# AI-VM 작업 로그

## 2026-05-12

### 완료한 작업

- AI-VM 작업 브랜치 생성
  - feat/ai-vm-integration
- develop 브랜치 기준 ai-vm 폴더만 sparse-checkout
- AI-VM 내부를 ai-server / llm-server로 분리하는 구조 확정
- llm-server 기본 폴더 구조 확인
- AI-VM 구조 문서 작성

### 현재 상태

```text
ai-vm/
├── docker-compose.yml
├── docs/
│   └── ai-vm-structure.md
└── llm-server/
```

### 미완료 작업
- Docker 설치
- ai-server 폴더 생성
- ai-server FastAPI health API 구현
- llm-server health API 실행 확인
- docker compose 실행 테스트
- Flask VM에서 AI-VM API 호출 테스트

### 다음 작업
- Docker 설치
- ai-server 기본 구조 생성
- ai-server Mock 분석 API 구현
- docker compose로 ai-server / llm-server 실행
- health check 테스트

## 2026-05-12 추가 작업

### 완료한 작업

- Docker 설치 완료
- ai-server 폴더 구조 생성
- ai-server FastAPI health API 구현
- ai-server Mock 분석 API 구현
- docker compose로 ai-server / llm-server 실행 확인
- ai-server health check 성공
- llm-server health check 성공
- ai-server Mock 분석 API 응답 확인

### 확인된 API

```bash
curl http://localhost:8001/internal/ai/health
curl http://localhost:8000/internal/llm/health
curl -X POST http://localhost:8001/internal/ai/analyze
```

### 현재 완료 상태
```
AI-VM Docker 기반 서버 분리 실행 가능
ai-server  : 8001
llm-server : 8000
Mock 분석 API 정상 동작
```

### 다음 작업

1. Flask VM에서 AI-VM API 호출 테스트
2. Flask 서버에 AI_SERVER_URL, LLM_SERVER_URL 환경변수 연결
3. Flask → ai-server 분석 요청 API 연동
4. Flask → llm-server 보고서 생성 API 연동
5. Mock 분석 결과를 DB 저장 구조와 연결