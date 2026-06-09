# STACCATO 관리자 매뉴얼

## 1. 관리자 역할

관리자는 STACCATO 시스템에서 탐지된 이벤트, 사용자 신고, 실시간 알림, 서버 상태를 확인하고 서비스 운영 상태를 점검합니다.

## 2. 주요 관리 대상

| 관리 대상 | 설명 |
|---|---|
| AI 이벤트 | AI-vm에서 탐지된 도로 이상 상황 |
| 신고 업로드 | 사용자가 제출한 신고 파일 |
| 실시간 알림 | 신규 이벤트 발생 알림 |
| 이벤트 영상 | 스냅샷 및 MP4 replay 영상 |
| 서버 상태 | Flask, Frontend, AI-vm, DB-vm 상태 |

## 3. 운영 점검 항목

| 항목 | 확인 방법 |
|---|---|
| Frontend HTTPS | curl -k -I https://mbc-sw.iptime.org:3221/ |
| Flask health | curl -i http://127.0.0.1:5000/health |
| Socket.IO | curl -k -i "https://mbc-sw.iptime.org:3221/socket.io/?EIO=4&transport=polling" |
| AI media URL | /api/events 응답에서 https://.../ai-media/... 확인 |
| Flask 테스트 | .venv/bin/python -m pytest |

## 4. 서버별 역할

| VM | 역할 |
|---|---|
| DB-VM | MySQL 데이터 저장 |
| FLASK-VM | Flask API Gateway |
| FRONTEND-VM | Next.js 화면 및 Nginx HTTPS 프록시 |
| AI VM | FastAPI 기반 AI 추론 및 이벤트 생성 |

## 5. 장애 발생 시 기본 대응

| 증상 | 확인 대상 |
|---|---|
| 화면 접속 불가 | FRONTEND-VM Nginx, Next.js |
| API 응답 불가 | FLASK-VM Flask 서비스 |
| 영상 재생 불가 | AI-vm 실행 여부, /ai-media 프록시 |
| 알림 불가 | Socket.IO 프록시, Flask Socket.IO 설정 |
| DB 오류 | DB-VM MySQL 상태 |

## 6. 유지보수 브랜치 전략

| 브랜치 | 용도 |
|---|---|
| main | 최종 제출/운영 안정 브랜치 |
| develop | 다음 수정사항 통합 브랜치 |
| fix/* | 일반 버그 수정 |
| docs/* | 문서 수정 |
| hotfix/* | 운영 긴급 수정 |

일반 수정은 develop에서 브랜치를 생성한 뒤 PR로 병합합니다.
운영 긴급 수정은 main에서 hotfix/* 브랜치를 생성하고, 병합 후 반드시 develop에도 반영합니다.
