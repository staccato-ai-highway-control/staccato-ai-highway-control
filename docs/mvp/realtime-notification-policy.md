# STACCATO MVP 실시간 알림 정책

## 1. 기본 원칙

MVP의 실시간 통신은 Socket.IO를 사용한다.

Socket.IO는 영상 프레임 전송 용도가 아니다.  
실시간으로 전송하는 것은 사건 이벤트, 상태 변경, 알림 메시지다.

## 2. 전송 대상

| 이벤트 | 설명 |
|---|---|
| AI_DETECTION | AI가 정차 차량 후보를 감지 |
| INCIDENT_CREATED | 사건 생성 |
| INCIDENT_STATUS_CHANGED | 사건 상태 변경 |
| REPORT_CREATED | 보고서 생성 |
| SYSTEM_NOTICE | 시스템 공지 |
| MLOPS_EVENT | 모델/학습 관련 이벤트, 고도화 단계 |

## 3. 이벤트 예시

{
  "event_type": "AI_DETECTION",
  "incident_id": 1,
  "cctv_id": 1,
  "incident_type": "LANE_STOP",
  "risk_level": "HIGH",
  "message": "주행차로 정차 차량 의심 이벤트가 감지되었습니다.",
  "created_at": "2026-04-30T14:00:00"
}

## 4. DB 저장 기준

실시간 알림은 notifications 테이블에 저장한다.

저장 필드:

- user_id
- incident_id
- notification_type
- title
- message
- priority
- is_read
- read_at
- created_at

## 5. 서버 책임

| 서버 | 책임 |
|---|---|
| Flask Server | Socket.IO 서버, 알림 생성, 알림 저장, 이벤트 송신 |
| Frontend Server | 알림 수신, Toast/목록 표시 |
| AI Server | 직접 Socket.IO 송신 금지 |
| ITS Server | 직접 Socket.IO 송신 금지 |

## 6. MVP 범위

MVP에서 구현할 것:

- Flask Socket.IO 기본 설정
- AI 탐지 사건 생성 시 알림 저장
- Frontend 알림 표시
- 알림 읽음 처리

MVP에서 제외할 것:

- Redis Pub/Sub
- Kafka 이벤트 스트림
- 다중 서버 Socket.IO Scale-out
- 모바일 Push
- SMS/카카오 알림
