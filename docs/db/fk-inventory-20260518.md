# STACCATO FK 인벤토리

작성일: 2026-05-18  
기준 DB: staccato  
목적: 물리 DB 분리 전 FK 영향도 확인

---

## 1. 요약

현재 staccato DB에는 45개 테이블과 83개 FK가 존재한다.

핵심 허브 테이블은 다음과 같다.

- users
- incidents
- incident_reports
- board_attachments

현재 상태에서 바로 member DB, board DB, AI DB로 물리 분리하면 FK 제약조건과 백엔드 모델 의존성 때문에 기능이 깨질 가능성이 높다.

따라서 물리 분리 전에는 cross-domain FK를 plain id 기반 구조로 전환하는 계획이 먼저 필요하다.

---

## 2. 권한 상태

| 계정 | 대상 DB | 권한 | 판단 |
|---|---|---|---|
| staccato_app@192.168.0.187 | staccato.* | SELECT, INSERT, UPDATE | 운영 앱 계정. DELETE/CREATE/ALTER 없음 |
| staccato_test_runner@192.168.0.187 | staccato_test.* | ALL PRIVILEGES | 테스트 DB 전용 계정 |

운영 앱 계정은 스키마 변경 권한이 없으므로 DB 구조 변경은 별도 관리자 계정 또는 migration 절차로만 수행해야 한다.

---

## 3. 도메인별 테이블 초안

| 도메인 | 테이블 후보 |
|---|---|
| member | users, signup_requests, email_verifications, identity_oauth_states, security_logs |
| board | board_posts, board_comments, board_attachments, board_reactions |
| incident/report | incident_reports, report_attachments, report_locations, report_analysis_jobs, report_memos, report_status_histories, incidents, incident_memos, incident_status_histories |
| chat/chatbot | chat_rooms, chat_room_members, chat_messages, chat_message_reads, chatbot_conversations, chatbot_messages |
| AI/MLOps | ai_models, ai_model_versions, training_datasets, training_jobs, detection_logs, incident_snapshots |
| ITS/Risk | its_weather_snapshots, its_traffic_snapshots, its_risk_scores, risk_context_snapshots, risk_calculation_logs |
| notification | notifications, notification_deliveries |
| CCTV | cctvs, cctv_rois, cctv_status_logs |

---

## 4. same-domain FK 예시

같은 도메인 내부 FK는 당장 제거 대상이 아니다.

| FK | 판단 |
|---|---|
| board_comments.post_id -> board_posts.id | 유지 가능 |
| board_comments.parent_comment_id -> board_comments.id | 유지 가능 |
| board_attachments.post_id -> board_posts.id | 유지 가능 |
| board_attachments.comment_id -> board_comments.id | 유지 가능 |
| chat_messages.room_id -> chat_rooms.id | 유지 가능 |
| chat_room_members.room_id -> chat_rooms.id | 유지 가능 |
| llm_report_versions.report_id -> llm_reports.id | 유지 가능 |
| notification_deliveries.notification_id -> notifications.id | 유지 가능 |
| cctv_rois.cctv_id -> cctvs.id | 유지 가능 |
| cctv_status_logs.cctv_id -> cctvs.id | 유지 가능 |

---

## 5. cross-domain FK 제거 후보: users

users.id를 참조하는 FK는 member DB 분리를 막는 핵심 의존성이다.

| 테이블 | 컬럼 | 현재 FK | 전환 방향 |
|---|---|---|---|
| board_posts | author_id | users.id | plain author_id |
| board_comments | author_id | users.id | plain author_id |
| board_attachments | uploaded_by | users.id | plain uploaded_by |
| board_reactions | user_id | users.id | plain user_id |
| chat_rooms | created_by | users.id | plain created_by |
| chat_room_members | user_id | users.id | plain user_id |
| chat_messages | sender_user_id | users.id | plain sender_user_id |
| incident_reports | reporter_id | users.id | plain reporter_id |
| incident_reports | reviewed_by | users.id | plain reviewed_by |
| incident_reports | closed_by | users.id | plain closed_by |
| incident_reports | deleted_by | users.id | plain deleted_by |
| llm_reports | generated_by | users.id | plain generated_by |
| ai_models | owner_user_id | users.id | plain owner_user_id |
| training_datasets | created_by | users.id | plain created_by |
| training_jobs | requested_by | users.id | plain requested_by |
| notifications | user_id | users.id | plain user_id |

처리 방향:

1. FK 제약조건 제거
2. 컬럼은 유지
3. 사용자 표시 정보는 member API 조회 또는 snapshot 컬럼으로 대체
4. 코드에서 User 직접 import/query 여부 확인

---

## 6. cross-domain FK 제거 후보: incidents

incidents.id를 참조하는 FK는 incident DB 분리를 막는 핵심 의존성이다.

| 테이블 | 컬럼 | 현재 FK | 전환 방향 |
|---|---|---|---|
| chat_rooms | incident_id | incidents.id | plain incident_id |
| chat_messages | incident_id | incidents.id | plain incident_id |
| chatbot_conversations | incident_id | incidents.id | plain incident_id |
| chatbot_messages | incident_id | incidents.id | plain incident_id |
| detection_logs | incident_id | incidents.id | plain incident_id |
| incident_snapshots | incident_id | incidents.id | plain incident_id |
| llm_reports | incident_id | incidents.id | plain incident_id |
| notifications | incident_id | incidents.id | plain incident_id |
| its_risk_scores | incident_id | incidents.id | plain incident_id |
| risk_context_snapshots | incident_id | incidents.id | plain incident_id |
| risk_calculation_logs | incident_id | incidents.id | plain incident_id |

처리 방향:

1. FK 제약조건 제거
2. incident_id 컬럼은 유지
3. 사건 상세 정보는 incident API 조회 또는 snapshot 저장
4. 코드에서 Incident 직접 import/query 여부 확인

---

## 7. 특별 주의 FK

| FK | 위험 |
|---|---|
| chat_messages.attachment_id -> board_attachments.id | chat DB와 board DB 분리 시 직접 충돌 |
| incidents.report_id -> incident_reports.id | incident/report 도메인 경계 결정 필요 |
| detection_logs.report_analysis_job_id -> report_analysis_jobs.id | AI/report 경계 결정 필요 |
| risk_calculation_logs.risk_score_id -> its_risk_scores.id | risk 내부 의존성 유지 가능성 높음 |

---

## 8. 실제 DB 수정 전 체크리스트

- [ ] FK 제거 대상 확정
- [ ] SQLAlchemy 모델의 ForeignKey 제거 여부 확인
- [ ] 서비스 코드에서 직접 join/query 확인
- [ ] 테스트 DB에서 ALTER dry-run
- [ ] pytest 통과
- [ ] rollback SQL 준비
- [ ] 운영 DB 직접 ALTER 금지
- [ ] migration 방식 확정

---

## 9. 현재 결론

현재 DB는 물리 분리 준비가 완료된 상태가 아니다.

첫 번째 실제 수정 후보는 users.id를 참조하는 cross-domain FK다.

단, 바로 FK를 제거하지 않고 테스트 DB에서 dry-run 후 pytest 통과를 확인해야 한다.
