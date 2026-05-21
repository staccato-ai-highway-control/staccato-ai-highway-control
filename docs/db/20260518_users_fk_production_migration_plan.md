# users FK production migration plan

Date: 2026-05-18
Target DB: `staccato`
Purpose: 도메인 DB 분리를 위한 `users.id` FK constraint 제거 운영 반영 계획

---

## 1. 목적

이 문서는 향후 API 서버와 DB를 도메인별로 분리하기 위해, 운영 DB `staccato`에서 `users.id`를 직접 참조하는 FK constraint를 제거하는 운영 반영 계획입니다.

목표 구조는 아래와 같습니다.

| domain | API server | DB |
|---|---|---|
| 회원 | 회원 API 서버 | member DB |
| 게시판 | 게시판 API 서버 | board DB |
| Vision / AI | vision API 서버 | AI DB |
| 알림 / 채팅 / 기타 | 각 도메인 API 서버 | 각 도메인 DB |

현재 작업의 목적은 논리적 사용자 관계를 제거하는 것이 아닙니다.

`user_id`, `author_id`, `created_by`, `sender_user_id` 같은 식별자 컬럼은 유지합니다.

제거 대상은 DB 레벨 FK constraint입니다.

---

## 2. 핵심 원칙

- 운영 DB `staccato` 변경은 별도 승인 후에만 수행합니다.
- 이 문서는 운영 반영 승인서가 아닙니다.
- 운영 실행 전 DB 백업이 필요합니다.
- 운영 실행 전 점검 시간이 필요합니다.
- 운영 실행 전 rollback SQL이 준비되어 있어야 합니다.
- 테이블은 삭제하지 않습니다.
- 컬럼은 삭제하지 않습니다.
- 데이터는 삭제하지 않습니다.
- FK constraint만 제거합니다.
- 각 도메인 API는 FK 제거 후 애플리케이션 계층에서 사용자 유효성, 권한, orphan 정책을 책임져야 합니다.

---

## 3. 완료된 dry-run 근거

아래 dry-run은 모두 `staccato_test`에서 수행되었습니다.

| PR | domain | status |
|---|---|---|
| #106 | board -> users | 완료 |
| #108 | notifications -> users | 완료 |
| #109 | training -> users | 완료 |
| #110 | ai_models -> users | 완료 |
| #111 | auth/signup -> users | 완료 |
| #112 | chatbot -> users | 완료 |
| #113 | chat -> users | 완료 |

모든 dry-run은 아래 흐름으로 검증되었습니다.

1. 대상 FK 존재 확인
2. orphan count 확인
3. test DB에서 FK drop
4. drop 후 자동화 테스트
5. rollback SQL로 FK 복구
6. rollback 후 자동화 테스트

---

## 4. 운영 반영 대상 SQL

운영 반영 시 아래 SQL 파일들을 기준으로 사용합니다.

단, 운영 실행 전 반드시 `TABLE_SCHEMA = 'staccato'` 기준으로 재검토해야 합니다.

### 4.1 사전 확인 SQL

| order | file |
|---:|---|
| 1 | `docs/db/sql/01_check_board_users_fk.sql` |
| 2 | `docs/db/sql/04_check_notifications_users_fk.sql` |
| 3 | `docs/db/sql/07_check_training_users_fk.sql` |
| 4 | `docs/db/sql/10_check_ai_models_users_fk.sql` |
| 5 | `docs/db/sql/13_check_auth_users_fk.sql` |
| 6 | `docs/db/sql/16_check_chatbot_users_fk.sql` |
| 7 | `docs/db/sql/19_check_chat_users_fk.sql` |

### 4.2 FK 제거 SQL

| order | file |
|---:|---|
| 1 | `docs/db/sql/02_drop_board_users_fk.sql` |
| 2 | `docs/db/sql/05_drop_notifications_users_fk.sql` |
| 3 | `docs/db/sql/08_drop_training_users_fk.sql` |
| 4 | `docs/db/sql/11_drop_ai_models_users_fk.sql` |
| 5 | `docs/db/sql/14_drop_auth_users_fk.sql` |
| 6 | `docs/db/sql/17_drop_chatbot_users_fk.sql` |
| 7 | `docs/db/sql/20_drop_chat_users_fk.sql` |

### 4.3 rollback SQL

| order | file |
|---:|---|
| 1 | `docs/db/sql/03_rollback_board_users_fk.sql` |
| 2 | `docs/db/sql/06_rollback_notifications_users_fk.sql` |
| 3 | `docs/db/sql/09_rollback_training_users_fk.sql` |
| 4 | `docs/db/sql/12_rollback_ai_models_users_fk.sql` |
| 5 | `docs/db/sql/15_rollback_auth_users_fk.sql` |
| 6 | `docs/db/sql/18_rollback_chatbot_users_fk.sql` |
| 7 | `docs/db/sql/21_rollback_chat_users_fk.sql` |

---

## 5. 운영 실행 전 필수 조건

운영 반영 전 아래 조건을 모두 충족해야 합니다.

| 항목 | 필수 여부 | 설명 |
|---|---:|---|
| DB 백업 | 필수 | 운영 DB `staccato` 전체 백업 |
| rollback SQL 준비 | 필수 | FK 재생성 SQL 사전 준비 |
| 점검 시간 확보 | 필수 | ALTER TABLE 실행 중 lock 가능성 고려 |
| 승인 | 필수 | PM/리드/운영 담당 승인 |
| 현재 FK 상태 재확인 | 필수 | 운영 DB와 문서 간 schema drift 확인 |
| orphan count 확인 | 필수 | 모든 대상 FK의 orphan count가 0인지 확인 |
| 애플리케이션 테스트 | 필수 | 주요 API smoke test |
| 배포/롤백 담당 지정 | 필수 | 실행자와 승인자 분리 권장 |

---

## 6. 운영 실행 순서

운영 실행은 아래 순서로 진행합니다.

### 6.1 사전 점검

1. 운영 DB `staccato` 접속 계정을 확인합니다.
2. `SELECT DATABASE()` 결과가 `staccato`인지 확인합니다.
3. `CURRENT_USER()`를 기록합니다.
4. 전체 DB 백업을 수행합니다.
5. 백업 복구 가능성을 확인합니다.
6. 각 check SQL을 운영 DB에서 실행합니다.
7. 대상 FK가 모두 존재하는지 확인합니다.
8. orphan count가 모두 `0`인지 확인합니다.

### 6.2 FK 제거

아래 순서대로 drop SQL을 실행합니다.

1. board -> users FK 제거
2. notifications -> users FK 제거
3. training -> users FK 제거
4. ai_models -> users FK 제거
5. auth/signup -> users FK 제거
6. chatbot -> users FK 제거
7. chat -> users FK 제거

### 6.3 제거 후 검증

1. 대상 FK가 제거되었는지 확인합니다.
2. 테이블이 삭제되지 않았는지 확인합니다.
3. 컬럼이 삭제되지 않았는지 확인합니다.
4. 주요 API smoke test를 수행합니다.
5. 애플리케이션 로그를 확인합니다.
6. 사용자 생성, 로그인, 게시판, 알림, 학습, AI, 챗봇, 채팅 관련 핵심 흐름을 확인합니다.

---

## 7. rollback 계획

운영 반영 중 장애가 발생하거나 주요 API 검증에 실패하면 rollback을 수행합니다.

rollback은 각 도메인의 rollback SQL을 사용합니다.

주의 사항:

- rollback 전 orphan count를 다시 확인합니다.
- orphan 데이터가 있으면 FK 재생성이 실패할 수 있습니다.
- rollback SQL 실행 후 대상 FK가 모두 복구되었는지 확인합니다.
- rollback 후 주요 API smoke test를 다시 수행합니다.

권장 rollback 순서는 운영 변경 순서의 역순 또는 각 도메인 독립 검증 순서에 따릅니다.

---

## 8. 애플리케이션 계층 보완 책임

FK constraint 제거 후 DB는 더 이상 사용자 참조 무결성을 강제하지 않습니다.

따라서 각 API 서버는 아래 책임을 애플리케이션 계층에서 보장해야 합니다.

| 책임 | 설명 |
|---|---|
| 사용자 존재 검증 | 요청 시 인증/JWT/member API 기준으로 사용자 확인 |
| 권한 검증 | 작성자, 관리자, 담당자 권한 검증 |
| orphan 정책 | 탈퇴/삭제 사용자와 연결된 데이터 처리 정책 |
| 표시 정보 정책 | 사용자 이름/소속을 조회할지 스냅샷 저장할지 결정 |
| 이벤트 처리 | 사용자 삭제/비활성화 이벤트 발생 시 각 도메인 후처리 |
| 감사 로그 | 중요 데이터 변경 시 실행자 기록 |

---

## 9. 운영 smoke test 체크리스트

운영 반영 후 최소 아래 항목을 확인합니다.

| domain | smoke test |
|---|---|
| auth | 로그인, 회원 조회, 권한 확인 |
| board | 게시글 목록/상세/생성/수정/삭제 |
| notifications | 알림 생성/조회/읽음 처리 |
| training | 학습 데이터 조회/등록 |
| ai_models | AI 모델 조회/등록 |
| chatbot | 챗봇 세션 생성/메시지 조회 |
| chat | 채팅방 조회/메시지 송수신/읽음 처리 |

---

## 10. 제외 사항

이 문서는 아래 작업을 포함하지 않습니다.

- 운영 DB 즉시 변경 승인
- 테이블 삭제
- 컬럼 삭제
- 데이터 삭제
- API 서버 분리 배포
- DB 물리 분리
- member DB, board DB, AI DB 신규 생성
- 사용자 데이터 마이그레이션

---

## 11. 결론

`users.id` 직접 FK 제거 dry-run은 `staccato_test`에서 도메인별로 완료되었습니다.

운영 DB 반영은 가능성 검증 단계 이후의 별도 작업입니다.

운영 반영 전에는 반드시 백업, 승인, 점검 시간, rollback 준비, smoke test 계획이 필요합니다.
