# Chatbot -> users FK dry-run plan

Date: 2026-05-18
Target DB: `staccato_test`
Target FKs:
- `chatbot_conversations.user_id -> users.id`
- `chatbot_messages.user_id -> users.id`

---

## 1. Purpose

Validate whether chatbot tables can remove direct foreign key dependencies on `users.id`.

This is a test DB dry-run only.

No production DB change is approved by this document.

---

## 2. Background

Previous DB documentation work has been completed:

- PR #105 added the database FK inventory.
- PR #106 validated board -> users FK removal dry-run.
- PR #107 scanned the next users FK candidates.
- The notifications -> users FK dry-run was completed and merged.
- The training -> users FK dry-run was completed and merged.
- The ai_models -> users FK dry-run was completed and merged.
- The auth/signup -> users FK dry-run was completed and merged.

The chat/chatbot candidate check confirmed that chatbot users FKs exist in both `staccato` and `staccato_test`.

This dry-run focuses only on FK constraints. It does not remove `user_id` columns.

---

## 3. Target FKs

| table | column | constraint | reference |
|---|---|---|---|
| `chatbot_conversations` | `user_id` | `chatbot_conversations_ibfk_1` | `users.id` |
| `chatbot_messages` | `user_id` | `chatbot_messages_ibfk_3` | `users.id` |

---

## 4. Safety rules

- Do not run this against production DB `staccato`.
- Run only against test DB `staccato_test`.
- Always confirm `SELECT DATABASE()` before schema changes.
- Always confirm `CURRENT_USER()` before schema changes.
- Do not drop any table.
- Do not drop any column.
- Only drop FK constraints.
- Rollback SQL must be ready before executing drop SQL.
- Production migration requires separate approval, backup plan, and maintenance window.

---

## 5. Execution order

1. Confirm baseline tests.
2. Run `16_check_chatbot_users_fk.sql`.
3. Confirm both target FKs exist.
4. Confirm all `orphan_count` values are `0`.
5. Run `17_drop_chatbot_users_fk.sql` on `staccato_test` only.
6. Confirm both target FKs are removed.
7. Run tests.
8. Run `18_rollback_chatbot_users_fk.sql`.
9. Confirm both target FKs are restored.
10. Run tests again.
11. Record dry-run result in this document.

---

## 6. Success criteria

- `chatbot_conversations_ibfk_1` exists before drop.
- `chatbot_messages_ibfk_3` exists before drop.
- All orphan checks return `0`.
- FK drop SQL succeeds on `staccato_test`.
- `chatbot_conversations.user_id` column remains.
- `chatbot_messages.user_id` column remains.
- Target FKs are absent after drop.
- Automated tests pass after drop.
- Rollback SQL restores both target FKs.
- Automated tests pass after rollback.

---

## 7. 현재 상태

`staccato_test`에서 dry-run 검증을 완료했습니다.

운영 DB `staccato` 변경은 수행하지 않았습니다.

---

## 8. Dry-run 결과

### 8.1 baseline 테스트

FK 제거 전 baseline 테스트가 통과했습니다.

```text
64 passed, 374 warnings in 12.19s

```

### 8.2 사전 확인 결과

`16_check_chatbot_users_fk.sql`을 `staccato_test`에서 실행했습니다.

실행 DB와 계정은 아래와 같습니다.

```text
DATABASE: staccato_test
CURRENT_USER: staccato_test_runner@192.168.0.187
```

FK 제거 전 대상 FK 2개가 존재함을 확인했습니다.

| table | column | constraint | reference |
|---|---|---|---|
| `chatbot_conversations` | `user_id` | `chatbot_conversations_ibfk_1` | `users.id` |
| `chatbot_messages` | `user_id` | `chatbot_messages_ibfk_3` | `users.id` |

orphan 데이터는 모두 없었습니다.

| target | orphan_count |
|---|---:|
| `chatbot_conversations.user_id` | `0` |
| `chatbot_messages.user_id` | `0` |

### 8.3 FK 제거 결과

`17_drop_chatbot_users_fk.sql`을 `staccato_test`에서만 실행했습니다.

실행 DB와 계정은 아래와 같습니다.

```text
DATABASE: staccato_test
CURRENT_USER: staccato_test_runner@192.168.0.187
```

아래 FK 2개 제거가 성공했습니다.

- `chatbot_messages_ibfk_3`
- `chatbot_conversations_ibfk_1`

제거 후 FK 확인 결과는 아래와 같이 대상 FK가 없었습니다.

```text
(none)
```

### 8.4 FK 제거 후 테스트

FK 제거 후 자동화 테스트가 통과했습니다.

```text
64 passed, 374 warnings in 11.03s
```

### 8.5 rollback 결과

`18_rollback_chatbot_users_fk.sql`을 `staccato_test`에서만 실행했습니다.

실행 DB와 계정은 아래와 같습니다.

```text
DATABASE: staccato_test
CURRENT_USER: staccato_test_runner@192.168.0.187
```

rollback 전 orphan 데이터는 모두 없었습니다.

| target | orphan_count |
|---|---:|
| `chatbot_conversations.user_id` | `0` |
| `chatbot_messages.user_id` | `0` |

아래 FK 2개 복구가 성공했습니다.

- `chatbot_conversations_ibfk_1`
- `chatbot_messages_ibfk_3`

복구 후 대상 FK 2개가 다시 존재함을 확인했습니다.

| table | column | constraint | reference |
|---|---|---|---|
| `chatbot_conversations` | `user_id` | `chatbot_conversations_ibfk_1` | `users.id` |
| `chatbot_messages` | `user_id` | `chatbot_messages_ibfk_3` | `users.id` |

### 8.6 rollback 후 테스트

rollback 후 자동화 테스트가 통과했습니다.

```text
64 passed, 374 warnings in 11.16s
```

---

## 9. 결론

`chatbot -> users` FK dry-run은 `staccato_test`에서 성공적으로 완료되었습니다.

이번 dry-run에서는 아래 FK 제약조건을 제거하고 다시 복구해도 현재 자동화 테스트가 깨지지 않음을 확인했습니다.

- `chatbot_conversations.user_id -> users.id`
- `chatbot_messages.user_id -> users.id`

이 문서는 운영 반영 승인이 아닙니다.

운영 DB 반영 전에는 별도의 migration 계획, 백업 계획, 승인 절차, 점검 시간이 필요합니다.
