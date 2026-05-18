# STACCATO DB 분리 대응 계획

작성일: 2026-05-18  
기준 커밋: 25b3da3  
기준 태그: verified-20260518-remove-drop-all-safe-cleanup

---

## 1. 현재 판단

현재 STACCATO 프로젝트는 단일 `staccato` DB를 기준으로 여러 도메인이 ForeignKey로 연결되어 있다.

확인 결과 `users`, `incidents`, `incident_reports`, `board_attachments` 등을 중심으로 cross-domain FK가 다수 존재한다.

따라서 현재 상태에서 바로 `member DB`, `board DB`, `AI DB`로 물리 분리하면 기능이 깨질 가능성이 높다.

현재 전략은 다음과 같다.

1. 단일 DB 유지
2. 신규 cross-domain FK 추가 금지
3. 기존 cross-domain FK를 plain id 컬럼으로 전환 검토
4. 다른 도메인 상세 정보는 API 조회 또는 snapshot 방식으로 대체
5. 테스트 통과 후 단계적으로 물리 DB 분리

---

## 2. DB 분리 전 완료한 안전 조치

테스트 코드에 남아 있던 `db.drop_all()`을 제거했다.

대체 방식은 다음과 같다.

- `tests/db_cleanup.py` 추가
- `cleanup_database(db)` 사용
- `DATABASE()`가 `staccato_test`인지 확인
- `CURRENT_USER()`가 `staccato_test_runner@...`인지 확인
- 테이블 drop 없이 row delete 방식으로 cleanup

검증 결과는 다음과 같다.

- pytest: 64 passed, 374 warnings
- DATABASE: staccato_test
- CURRENT_USER: staccato_test_runner@192.168.0.187
- table_count: 45

---

## 3. 도메인별 테이블 소유권 초안

| 도메인 DB | 포함 후보 |
|---|---|
| member DB | users, signup_requests, email_verifications, identity_oauth_states, security_logs |
| board DB | board_posts, board_comments, board_attachments, board_reactions |
| incident DB | incident_reports, report_attachments, report_locations, report_analysis_jobs, report_memos, report_status_histories, incidents, incident_memos, incident_status_histories |
| chat DB | chat_rooms, chat_room_members, chat_messages, chat_message_reads, chatbot_conversations, chatbot_messages |
| AI DB | ai_models, ai_model_versions, training_datasets, training_jobs, detection_logs, incident_snapshots |
| ITS/Risk DB | its_weather_snapshots, its_traffic_snapshots, its_risk_scores, risk_context_snapshots, risk_calculation_logs |
| notification DB | notifications, notification_deliveries |
| CCTV DB | cctvs, cctv_rois, cctv_status_logs |

---

## 4. cross-domain FK 제거 우선순위

### 1순위: users FK

`users.id`를 참조하는 FK는 member DB 분리를 막는 핵심 의존성이다.

대표 제거 후보는 다음과 같다.

- board_posts.author_id
- board_comments.author_id
- board_attachments.uploaded_by
- board_reactions.user_id
- chat_rooms.created_by
- chat_room_members.user_id
- chat_messages.sender_user_id
- chat_message_reads.user_id
- incident_reports.reporter_id
- incident_reports.reviewed_by
- incident_reports.closed_by
- incident_reports.deleted_by
- report_attachments.uploaded_by
- report_attachments.deleted_by
- report_analysis_jobs.requested_by
- llm_reports.generated_by
- llm_report_versions.edited_by
- llm_report_status_histories.changed_by
- ai_models.owner_user_id
- training_datasets.created_by
- training_jobs.requested_by
- notifications.user_id
- notification_deliveries.user_id

처리 방향은 FK 제약조건을 제거하고, 컬럼은 plain id로 유지하는 것이다. 사용자 상세 정보는 member API 조회 또는 snapshot 저장 방식으로 대체한다.

---

### 2순위: incidents FK

`incidents.id`를 참조하는 FK는 incident DB 분리를 막는 핵심 의존성이다.

대표 제거 후보는 다음과 같다.

- chat_rooms.incident_id
- chat_messages.incident_id
- chatbot_conversations.incident_id
- chatbot_messages.incident_id
- llm_reports.incident_id
- detection_logs.incident_id
- incident_snapshots.incident_id
- notifications.incident_id
- its_risk_scores.incident_id
- risk_context_snapshots.incident_id
- risk_calculation_logs.incident_id

처리 방향은 FK 제약조건을 제거하고, `incident_id`는 plain id로 유지하는 것이다. 사건 상세 정보는 incident API 조회 또는 snapshot 저장 방식으로 대체한다.

---

### 3순위: board_attachments FK

특히 아래 FK는 chat DB와 board DB 분리를 어렵게 만든다.

- chat_messages.attachment_id -> board_attachments.id

대안은 다음과 같다.

| 안 | 내용 | 판단 |
|---|---|---|
| A안 | chat_attachments 별도 생성 | 장기적으로 좋음 |
| B안 | 공통 files/attachments 서비스 생성 | 구조적으로 좋지만 작업 큼 |
| C안 | attachment_id만 저장하고 FK 제거 | MVP 기준 현실적 |

MVP 기준 우선안은 C안이다.

---

## 5. 신규 개발 원칙

앞으로 신규 PR에서는 다음 원칙을 적용한다.

1. 다른 도메인 테이블로 향하는 FK 추가 금지
2. 같은 도메인 내부 FK는 일단 허용
3. 사용자, 사건, 첨부파일 등 외부 도메인 데이터는 참조 ID만 저장
4. 화면 표시용 이름, 상태, 제목 등은 snapshot 컬럼으로 저장 가능
5. 상세 정보는 해당 도메인 API로 조회
6. DB 구조 변경 전 pytest 통과 필수
7. 개발 DB 직접 ALTER/DROP 금지
8. migration 관리 방식 확정 전 운영성 변경 금지

---

## 6. 결론

현재 STACCATO는 물리 DB 분리 준비가 완료된 상태가 아니다.

다만 SQLAlchemy relationship 사용이 거의 없고, 복잡한 cross-domain join도 제한적으로 보이므로 단계적 분리는 가능하다.

따라서 지금은 물리 분리가 아니라, cross-domain FK를 plain id 기반 구조로 바꾸는 리팩터링 계획을 먼저 진행한다.
