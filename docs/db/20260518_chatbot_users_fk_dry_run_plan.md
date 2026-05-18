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

## 7. Current status

Prepared for dry-run.

Execution result will be recorded after validation.
