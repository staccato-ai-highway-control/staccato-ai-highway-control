# Chat -> users FK dry-run 계획

Date: 2026-05-18
Target DB: `staccato_test`

대상 FK:

- `chat_rooms.created_by -> users.id`
- `chat_room_members.user_id -> users.id`
- `chat_messages.sender_user_id -> users.id`
- `chat_message_reads.user_id -> users.id`

---

## 1. 목적

일반 chat 영역 테이블이 `users.id`를 직접 참조하는 FK 제약조건을 제거해도 되는지 `staccato_test`에서 dry-run으로 검증합니다.

이 문서는 테스트 DB dry-run 계획입니다.

운영 DB `staccato` 변경은 승인하지 않습니다.

---

## 2. 배경

이전 DB 문서화 및 dry-run 작업은 완료되었습니다.

- PR #105: database FK inventory 추가
- PR #106: board -> users FK dry-run 완료
- PR #107: users FK 다음 후보 스캔 완료
- PR #108: notifications -> users FK dry-run 완료
- PR #109: training -> users FK dry-run 완료
- PR #110: ai_models -> users FK dry-run 완료
- PR #111: auth/signup -> users FK dry-run 완료
- PR #112: chatbot -> users FK dry-run 완료

이번 dry-run은 일반 chat 영역만 대상으로 합니다.

이 작업은 FK constraint만 검증하며, `user_id`, `created_by`, `sender_user_id` 컬럼은 삭제하지 않습니다.

---

## 3. 대상 FK

| table | column | constraint | reference |
|---|---|---|---|
| `chat_rooms` | `created_by` | `chat_rooms_ibfk_2` | `users.id` |
| `chat_room_members` | `user_id` | `chat_room_members_ibfk_2` | `users.id` |
| `chat_messages` | `sender_user_id` | `chat_messages_ibfk_3` | `users.id` |
| `chat_message_reads` | `user_id` | `chat_message_reads_ibfk_2` | `users.id` |

---

## 4. 안전 원칙

- 운영 DB `staccato`에서는 실행하지 않습니다.
- 테스트 DB `staccato_test`에서만 실행합니다.
- schema 변경 전 `SELECT DATABASE()`를 반드시 확인합니다.
- schema 변경 전 `CURRENT_USER()`를 반드시 확인합니다.
- 실행 계정은 `staccato_test_runner@...`인지 확인합니다.
- 테이블을 삭제하지 않습니다.
- 컬럼을 삭제하지 않습니다.
- 데이터를 삭제하지 않습니다.
- FK constraint만 제거/복구합니다.
- drop SQL 실행 전 rollback SQL이 준비되어 있어야 합니다.
- 운영 반영은 별도 migration 계획, 백업 계획, 승인, 점검 시간이 필요합니다.

---

## 5. 실행 순서

1. baseline 테스트를 실행합니다.
2. `19_check_chat_users_fk.sql`을 실행합니다.
3. 대상 FK 4개가 모두 존재하는지 확인합니다.
4. 모든 `orphan_count` 값이 `0`인지 확인합니다.
5. `20_drop_chat_users_fk.sql`을 `staccato_test`에서만 실행합니다.
6. 대상 FK 4개가 제거되었는지 확인합니다.
7. FK 제거 후 자동화 테스트를 실행합니다.
8. `21_rollback_chat_users_fk.sql`을 실행합니다.
9. 대상 FK 4개가 복구되었는지 확인합니다.
10. rollback 후 자동화 테스트를 다시 실행합니다.
11. dry-run 결과를 이 문서에 기록합니다.

---

## 6. 성공 기준

- `chat_rooms_ibfk_2`가 drop 전 존재합니다.
- `chat_room_members_ibfk_2`가 drop 전 존재합니다.
- `chat_messages_ibfk_3`가 drop 전 존재합니다.
- `chat_message_reads_ibfk_2`가 drop 전 존재합니다.
- 모든 orphan check 결과가 `0`입니다.
- FK drop SQL이 `staccato_test`에서 성공합니다.
- `chat_rooms.created_by` 컬럼은 유지됩니다.
- `chat_room_members.user_id` 컬럼은 유지됩니다.
- `chat_messages.sender_user_id` 컬럼은 유지됩니다.
- `chat_message_reads.user_id` 컬럼은 유지됩니다.
- drop 후 대상 FK 4개가 존재하지 않습니다.
- drop 후 자동화 테스트가 통과합니다.
- rollback SQL로 대상 FK 4개가 복구됩니다.
- rollback 후 자동화 테스트가 통과합니다.

---

## 7. 현재 상태

`staccato_test`에서 dry-run 검증을 완료했습니다.

운영 DB `staccato` 변경은 수행하지 않았습니다.

---

## 8. Dry-run 결과

### 8.1 baseline 테스트

FK 제거 전 baseline 테스트가 통과했습니다.

```text
64 passed, 374 warnings in 12.40s
```

### 8.2 사전 확인 결과

`19_check_chat_users_fk.sql`을 `staccato_test`에서 실행했습니다.

실행 DB와 계정은 아래와 같습니다.

```text
DATABASE: staccato_test
CURRENT_USER: staccato_test_runner@192.168.0.187
```

FK 제거 전 대상 FK 4개가 존재함을 확인했습니다.

| table | column | constraint | reference |
|---|---|---|---|
| `chat_message_reads` | `user_id` | `chat_message_reads_ibfk_2` | `users.id` |
| `chat_messages` | `sender_user_id` | `chat_messages_ibfk_3` | `users.id` |
| `chat_room_members` | `user_id` | `chat_room_members_ibfk_2` | `users.id` |
| `chat_rooms` | `created_by` | `chat_rooms_ibfk_2` | `users.id` |

orphan 데이터는 모두 없었습니다.

| target | orphan_count |
|---|---:|
| `chat_rooms.created_by` | `0` |
| `chat_room_members.user_id` | `0` |
| `chat_messages.sender_user_id` | `0` |
| `chat_message_reads.user_id` | `0` |

### 8.3 FK 제거 결과

`20_drop_chat_users_fk.sql`을 `staccato_test`에서만 실행했습니다.

실행 DB와 계정은 아래와 같습니다.

```text
DATABASE: staccato_test
CURRENT_USER: staccato_test_runner@192.168.0.187
```

아래 FK 4개 제거가 성공했습니다.

- `chat_message_reads_ibfk_2`
- `chat_messages_ibfk_3`
- `chat_room_members_ibfk_2`
- `chat_rooms_ibfk_2`

제거 후 FK 확인 결과는 아래와 같이 대상 FK가 없었습니다.

```text
(none)
```

### 8.4 FK 제거 후 테스트

FK 제거 후 자동화 테스트가 통과했습니다.

```text
64 passed, 374 warnings in 11.34s
```

### 8.5 rollback 결과

`21_rollback_chat_users_fk.sql`을 `staccato_test`에서만 실행했습니다.

실행 DB와 계정은 아래와 같습니다.

```text
DATABASE: staccato_test
CURRENT_USER: staccato_test_runner@192.168.0.187
```

rollback 전 orphan 데이터는 모두 없었습니다.

| target | orphan_count |
|---|---:|
| `chat_rooms.created_by` | `0` |
| `chat_room_members.user_id` | `0` |
| `chat_messages.sender_user_id` | `0` |
| `chat_message_reads.user_id` | `0` |

아래 FK 4개 복구가 성공했습니다.

- `chat_rooms_ibfk_2`
- `chat_room_members_ibfk_2`
- `chat_messages_ibfk_3`
- `chat_message_reads_ibfk_2`

복구 후 대상 FK 4개가 다시 존재함을 확인했습니다.

| table | column | constraint | reference |
|---|---|---|---|
| `chat_message_reads` | `user_id` | `chat_message_reads_ibfk_2` | `users.id` |
| `chat_messages` | `sender_user_id` | `chat_messages_ibfk_3` | `users.id` |
| `chat_room_members` | `user_id` | `chat_room_members_ibfk_2` | `users.id` |
| `chat_rooms` | `created_by` | `chat_rooms_ibfk_2` | `users.id` |

### 8.6 rollback 후 테스트

rollback 후 자동화 테스트가 통과했습니다.

```text
64 passed, 374 warnings in 11.50s
```

---

## 9. 결론

`chat -> users` FK dry-run은 `staccato_test`에서 성공적으로 완료되었습니다.

이번 dry-run에서는 아래 FK 제약조건을 제거하고 다시 복구해도 현재 자동화 테스트가 깨지지 않음을 확인했습니다.

- `chat_rooms.created_by -> users.id`
- `chat_room_members.user_id -> users.id`
- `chat_messages.sender_user_id -> users.id`
- `chat_message_reads.user_id -> users.id`

이 문서는 운영 반영 승인이 아닙니다.

운영 DB 반영 전에는 별도의 migration 계획, 백업 계획, 승인 절차, 점검 시간이 필요합니다.
